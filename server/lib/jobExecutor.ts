import { getDb, getScheduledJobById, updateScheduledJob, recordJobExecution, getGenerationsByIds, getJobExecutionHistory } from "../db";
import { generateDocument, fetchRepoMetadata } from "./generate.functions";
import { notifyOwner } from "../_core/notification";

/**
 * Execute a scheduled job and regenerate all associated documents
 */
export async function executeScheduledJob(jobId: number, userId: number) {

  try {
    // Get the job
    const job = await getScheduledJobById(jobId, userId);
    if (!job) {
      console.error(`[Job Executor] Job ${jobId} not found for user ${userId}`);
      return { success: false, error: "Job not found" };
    }

    // Parse generation IDs
    const generationIds = job.generationIds
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (generationIds.length === 0) {
      console.error(`[Job Executor] No valid generation IDs for job ${jobId}`);
      return { success: false, error: "No generations to regenerate" };
    }

    // Fetch original generations
    const generations = await getGenerationsByIds(generationIds, userId);
    if (generations.length === 0) {
      console.error(`[Job Executor] No generations found for job ${jobId}`);
      return { success: false, error: "Generations not found" };
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Regenerate each document
    for (const generation of generations) {
      try {
        // Fetch fresh metadata for the repo
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
        successCount++;
      } catch (error) {
        failureCount++;
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${generation.repoUrl}: ${errorMsg}`);
        console.error(`[Job Executor] Failed to regenerate ${generation.repoUrl}:`, error);
      }
    }

    // Determine overall status
    const status = failureCount === 0 ? "success" : failureCount === successCount ? "failed" : "partial";

    // Record execution
    await recordJobExecution({
      jobId,
      userId,
      status,
      successCount,
      failureCount,
      totalCount: generations.length,
      errorMessage: errors.length > 0 ? errors.join("; ") : undefined,
      executedAt: new Date(),
    });

    // Update job
    const nextRun = calculateNextRun(job.cronExpression);
    await updateScheduledJob(jobId, userId, {
      lastRun: new Date(),
      nextRun,
      executionCount: (job.executionCount || 0) + 1,
      lastError: errors.length > 0 ? errors[0] : undefined,
      status: status === "failed" ? "failed" : "active",
    });

    // Send notifications
    if (job.notifyOnSuccess && status === "success") {
      await notifyOwner({
        title: `Scheduled Job Completed: ${job.name}`,
        content: `Successfully regenerated ${successCount} document(s).`,
      }).catch((err) => console.error("[Job Executor] Notification failed:", err));
    }

    if (job.notifyOnFailure && (status === "failed" || status === "partial")) {
      await notifyOwner({
        title: `Scheduled Job Failed: ${job.name}`,
        content: `Success: ${successCount}, Failed: ${failureCount}. ${errors.length > 0 ? "Errors: " + errors[0] : ""}`,
      }).catch((err) => console.error("[Job Executor] Notification failed:", err));
    }

    return {
      success: status !== "failed",
      successCount,
      failureCount,
      status,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error(`[Job Executor] Unexpected error executing job ${jobId}:`, error);
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Record failed execution
    try {
      await recordJobExecution({
        jobId,
        userId,
        status: "failed",
        successCount: 0,
        failureCount: 1,
        totalCount: 1,
        errorMessage: errorMsg,
        executedAt: new Date(),
      });
    } catch (recordError) {
      console.error("[Job Executor] Failed to record execution:", recordError);
    }

    return { success: false, error: errorMsg };
  }
}

/**
 * Calculate next run time based on cron expression
 * Simple implementation - in production, use a library like cron-parser
 */
function calculateNextRun(cronExpression: string): Date {
  const now = new Date();
  const next = new Date(now);

  // Parse cron: "minute hour day month dayOfWeek"
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) {
    // Invalid cron, default to 24 hours
    next.setHours(next.getHours() + 24);
    return next;
  }

  const [minute, hour, day, month, dayOfWeek] = parts;

  // Simple logic: if hour is *, add 1 hour; if day is *, add 1 day; etc.
  if (hour !== "*") {
    const targetHour = parseInt(hour);
    next.setHours(targetHour, 0, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (day !== "*") {
    const targetDay = parseInt(day);
    next.setDate(targetDay);
    next.setHours(0, 0, 0, 0);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
    }
  } else {
    // Default: add 24 hours
    next.setHours(next.getHours() + 24);
  }

  return next;
}
