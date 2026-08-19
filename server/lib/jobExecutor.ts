import {
  getGenerationsByIds,
  getScheduledJobById,
  normalizeGenerationIds,
  recordJobExecution,
  updateScheduledJob,
} from "../db";
import { generateDocument, fetchRepoMetadata } from "./generate.functions";
import { deriveScheduledExecutionStatus, getNextHeartbeatRun } from "./schedule";

/**
 * Execute one platform-triggered regeneration job. The callback handler claims
 * the cron slot atomically before calling this function, so this code only
 * performs the requested work and records its outcome.
 */
export async function executeScheduledJob(jobId: number, userId: number) {
  const job = await getScheduledJobById(jobId, userId);
  if (!job) {
    return { success: false, status: "failed" as const, error: "Job not found" };
  }
  if (job.status !== "active") {
    return { success: true, status: "skipped" as const, reason: "Job is not active" };
  }

  const generationIds = normalizeGenerationIds(
    job.generationIds
      .split(",")
      .map((id) => Number.parseInt(id.trim(), 10))
  );
  if (generationIds.length === 0) {
    const message = "No valid source generations are configured for this schedule";
    await updateScheduledJob(job.id, userId, { lastError: message });
    return { success: false, status: "failed" as const, error: message };
  }

  const generations = await getGenerationsByIds(generationIds, userId);
  const foundIds = new Set(generations.map((generation) => generation.id));
  const errors = generationIds
    .filter((id) => !foundIds.has(id))
    .map((id) => `Source generation ${id} no longer exists or is not accessible.`);

  let successCount = 0;
  let failureCount = errors.length;

  for (const generation of generations) {
    try {
      const metadata = await fetchRepoMetadata(generation.repoUrl);
      await generateDocument(
        {
          repoUrl: generation.repoUrl,
          docType: job.docType as any,
          tone: job.tone as any,
          length: job.length as any,
          repoMetadata: metadata,
        },
        userId
      );
      successCount += 1;
    } catch (error) {
      failureCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`${generation.repoUrl}: ${message}`);
      console.error(`[Scheduled regeneration] Failed for ${generation.repoUrl}:`, error);
    }
  }

  const totalCount = generationIds.length;
  const status = deriveScheduledExecutionStatus(successCount, failureCount);
  const now = new Date();

  await recordJobExecution({
    jobId,
    userId,
    status,
    successCount,
    failureCount,
    totalCount,
    errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
    executedAt: now,
    completedAt: now,
  });

  await updateScheduledJob(job.id, userId, {
    nextRun: getNextHeartbeatRun(job.cronExpression, now),
    executionCount: (job.executionCount || 0) + 1,
    lastError: errors.length > 0 ? errors[0] : undefined,
    status: "active",
  });

  return {
    success: status !== "failed",
    status,
    successCount,
    failureCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}
