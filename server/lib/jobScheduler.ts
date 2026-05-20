import { getDb, getScheduledJobsByUserId, updateScheduledJob } from "../db";
import { executeScheduledJob } from "./jobExecutor";
import { eq } from "drizzle-orm";
import { scheduledJobs } from "../../drizzle/schema";
import cronParser from "cron-parser";

/**
 * Job scheduler that runs periodically to check and execute due scheduled jobs
 */
let schedulerInterval: NodeJS.Timeout | null = null;

export async function startJobScheduler() {
  if (schedulerInterval) {
    console.log("[Job Scheduler] Already running");
    return;
  }

  console.log("[Job Scheduler] Starting job scheduler...");

  // Run every 1 minute to check for due jobs
  schedulerInterval = setInterval(async () => {
    try {
      await checkAndExecuteDueJobs();
    } catch (error) {
      console.error("[Job Scheduler] Error checking jobs:", error);
    }
  }, 60000); // 1 minute

  // Also run immediately on startup
  await checkAndExecuteDueJobs();
}

export async function stopJobScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[Job Scheduler] Stopped");
  }
}

async function checkAndExecuteDueJobs() {
  const db = await getDb();
  if (!db) return;

  try {
    // Get all active scheduled jobs
    const jobs = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.status, "active"));

    const now = new Date();

    for (const job of jobs) {
      // Check if job is due to run
      if (!job.nextRun) continue;
      const nextRun = new Date(job.nextRun);
      if (nextRun <= now) {
        console.log(`[Job Scheduler] Executing job ${job.id} for user ${job.userId}`);

        try {
          // Execute the job
          await executeScheduledJob(job.id, job.userId);

          // Calculate next run time based on cron expression
          const nextRunTime = calculateNextRun(job.cronExpression);

          // Update job with next run time
          await updateScheduledJob(job.id, job.userId, {
            nextRun: nextRunTime,
            executionCount: (job.executionCount || 0) + 1,
          });

          console.log(
            `[Job Scheduler] Job ${job.id} completed, next run: ${nextRunTime.toISOString()}`
          );
        } catch (error) {
          console.error(`[Job Scheduler] Job ${job.id} failed:`, error);

          // Update job with error status
          const errorMsg = error instanceof Error ? error.message : String(error);
          await updateScheduledJob(job.id, job.userId, {
            lastError: errorMsg,
            status: "failed",
          });
        }
      }
    }
  } catch (error) {
    console.error("[Job Scheduler] Failed to check jobs:", error);
  }
}

export function calculateNextRun(cronExpression: string): Date {
  try {
    // @ts-ignore - cron-parser types are complex
    const interval = cronParser.parseExpression(cronExpression);
    return interval.next().toDate();
  } catch (error) {
    console.error("[Job Scheduler] Invalid cron expression:", cronExpression);
    // Default to 1 hour from now if cron parsing fails
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 1);
    return nextRun;
  }
}
