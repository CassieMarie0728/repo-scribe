import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createScheduledJob,
  getScheduledJobsByUserId,
  getScheduledJobById,
  updateScheduledJob,
  deleteScheduledJob,
  recordJobExecution,
  getJobExecutionHistory,
} from "../db";

const CRON_REGEX =
  /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;

export const scheduledJobsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getScheduledJobsByUserId(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .query(async ({ ctx, input }) => {
      return await getScheduledJobById(input.jobId, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        generationIds: z.array(z.number()).min(1).max(50),
        docType: z.string(),
        tone: z.string(),
        length: z.string(),
        cronExpression: z.string().regex(CRON_REGEX, "Invalid cron expression"),
        notifyOnSuccess: z.boolean().default(true),
        notifyOnFailure: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createScheduledJob({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        generationIds: input.generationIds.join(","),
        docType: input.docType,
        tone: input.tone,
        length: input.length,
        cronExpression: input.cronExpression,
        status: "active",
        notifyOnSuccess: input.notifyOnSuccess ? 1 : 0,
        notifyOnFailure: input.notifyOnFailure ? 1 : 0,
        nextRun: new Date(),
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        cronExpression: z.string().regex(CRON_REGEX).optional(),
        notifyOnSuccess: z.boolean().optional(),
        notifyOnFailure: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.cronExpression !== undefined) updates.cronExpression = input.cronExpression;
      if (input.notifyOnSuccess !== undefined) updates.notifyOnSuccess = input.notifyOnSuccess ? 1 : 0;
      if (input.notifyOnFailure !== undefined) updates.notifyOnFailure = input.notifyOnFailure ? 1 : 0;

      return await updateScheduledJob(input.jobId, ctx.user.id, updates as any);
    }),

  pause: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await updateScheduledJob(input.jobId, ctx.user.id, {
        status: "paused",
      });
    }),

  resume: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await updateScheduledJob(input.jobId, ctx.user.id, {
        status: "active",
        nextRun: new Date(),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await deleteScheduledJob(input.jobId, ctx.user.id);
    }),

  getExecutionHistory: protectedProcedure
    .input(z.object({ jobId: z.number(), limit: z.number().default(20) }))
    .query(async ({ ctx, input }) => {
      // Verify user owns this job
      const job = await getScheduledJobById(input.jobId, ctx.user.id);
      if (!job) {
        throw new Error("Job not found");
      }
      return await getJobExecutionHistory(input.jobId, input.limit);
    }),

  recordExecution: protectedProcedure
    .input(
      z.object({
        jobId: z.number(),
        status: z.enum(["success", "failed", "partial"]),
        successCount: z.number(),
        failureCount: z.number(),
        totalCount: z.number(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user owns this job
      const job = await getScheduledJobById(input.jobId, ctx.user.id);
      if (!job) {
        throw new Error("Job not found");
      }

      // Record execution
      await recordJobExecution({
        jobId: input.jobId,
        userId: ctx.user.id,
        status: input.status,
        successCount: input.successCount,
        failureCount: input.failureCount,
        totalCount: input.totalCount,
        errorMessage: input.errorMessage,
        completedAt: new Date(),
      });

      // Update job's last run and execution count
      const newExecutionCount = (job.executionCount || 0) + 1;
      await updateScheduledJob(input.jobId, ctx.user.id, {
        lastRun: new Date(),
        executionCount: newExecutionCount,
        lastError: input.errorMessage,
        status: input.status === "failed" ? "failed" : "active",
      });

      return { success: true };
    }),
});
