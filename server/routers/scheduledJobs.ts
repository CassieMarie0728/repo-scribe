import { parse as parseCookie } from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createHeartbeatJob,
  deleteHeartbeatJob,
  updateHeartbeatJob,
} from "../_core/heartbeat";
import {
  createScheduledJob,
  deleteScheduledJob,
  getGenerationsByIds,
  getJobExecutionHistory,
  getScheduledJobById,
  getScheduledJobsByUserId,
  normalizeGenerationIds,
  updateScheduledJob,
} from "../db";
import { getNextHeartbeatRun, isValidHeartbeatCron } from "../lib/schedule";

const DOC_TYPES = [
  "README",
  "LICENSE",
  "CODE_OF_CONDUCT",
  "CONTRIBUTING",
  "SECURITY",
  "PRIVACY",
  "TERMS_OF_SERVICE",
] as const;
const TONES = ["Formal", "Professional", "Friendly", "Casual", "Laid-back", "Deadpool-cool"] as const;
const LENGTHS = ["short", "medium", "long"] as const;

const heartbeatCron = z
  .string()
  .trim()
  .max(64)
  .refine(isValidHeartbeatCron, {
    message: "Use a valid six-field UTC cron expression with seconds set to 0.",
  });

const scheduleFields = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2_000).optional(),
  generationIds: z.array(z.number().int().positive()).min(1).max(50),
  docType: z.enum(DOC_TYPES),
  tone: z.enum(TONES),
  length: z.enum(LENGTHS),
  cronExpression: heartbeatCron,
  // Stored for future user-facing delivery channels. Results are always saved in job history.
  notifyOnSuccess: z.boolean().default(true),
  notifyOnFailure: z.boolean().default(true),
});

function getSessionToken(cookieHeader: string | undefined): string {
  const sessionToken = parseCookie(cookieHeader ?? "")[COOKIE_NAME];
  if (!sessionToken) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "A valid session is required to manage schedules." });
  }
  return sessionToken;
}

async function assertGenerationOwnership(generationIds: number[], userId: number) {
  const ids = normalizeGenerationIds(generationIds);
  if (ids.length !== generationIds.length) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Generation IDs must be unique positive integers." });
  }
  const generations = await getGenerationsByIds(ids, userId);
  if (generations.length !== ids.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "One or more selected history items are unavailable." });
  }
}

export const scheduledJobsRouter = router({
  list: protectedProcedure.query(({ ctx }) => getScheduledJobsByUserId(ctx.user.id)),

  getById: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .query(({ ctx, input }) => getScheduledJobById(input.jobId, ctx.user.id)),

  create: protectedProcedure.input(scheduleFields).mutation(async ({ ctx, input }) => {
    if (process.env.NODE_ENV !== "production") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Publish the app before creating schedules; the scheduler can only call a live deployed URL.",
      });
    }
    await assertGenerationOwnership(input.generationIds, ctx.user.id);
    const sessionToken = getSessionToken(ctx.req.headers.cookie);
    const normalizedIds = normalizeGenerationIds(input.generationIds);

    // Persist first to obtain an immutable application ID for the platform job name.
    const pendingJob = await createScheduledJob({
      userId: ctx.user.id,
      name: input.name,
      description: input.description || undefined,
      generationIds: normalizedIds.join(","),
      docType: input.docType,
      tone: input.tone,
      length: input.length,
      cronExpression: input.cronExpression,
      status: "paused",
      notifyOnSuccess: input.notifyOnSuccess ? 1 : 0,
      notifyOnFailure: input.notifyOnFailure ? 1 : 0,
    });
    if (!pendingJob) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not create the schedule record." });
    }

    let taskUid: string | undefined;
    try {
      const heartbeat = await createHeartbeatJob(
        {
          name: `repo-scribe-regeneration-${pendingJob.id}`,
          cron: input.cronExpression,
          path: "/api/scheduled/regenerate",
          payload: { version: 1 },
          description: `Repo Scribe: ${input.name}`,
        },
        sessionToken
      );
      taskUid = heartbeat.taskUid;

      const nextRun = heartbeat.nextExecutionAt
        ? new Date(heartbeat.nextExecutionAt)
        : getNextHeartbeatRun(input.cronExpression);
      const created = await updateScheduledJob(pendingJob.id, ctx.user.id, {
        scheduleCronTaskUid: heartbeat.taskUid,
        status: "active",
        nextRun,
      });
      if (!created) {
        throw new Error("Could not activate the schedule record.");
      }
      return created;
    } catch (error) {
      if (taskUid) {
        await deleteHeartbeatJob(taskUid, sessionToken).catch((cleanupError) => {
          console.error("[Scheduled regeneration] Failed to remove orphaned platform job:", cleanupError);
        });
      }
      await deleteScheduledJob(pendingJob.id, ctx.user.id).catch((cleanupError) => {
        console.error("[Scheduled regeneration] Failed to remove incomplete schedule record:", cleanupError);
      });
      throw error;
    }
  }),

  update: protectedProcedure
    .input(
      z.object({
        jobId: z.number().int().positive(),
        name: z.string().trim().min(1).max(255).optional(),
        description: z.string().trim().max(2_000).optional(),
        cronExpression: heartbeatCron.optional(),
        notifyOnSuccess: z.boolean().optional(),
        notifyOnFailure: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const job = await getScheduledJobById(input.jobId, ctx.user.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      if (!job.scheduleCronTaskUid) {
        throw new TRPCError({ code: "CONFLICT", message: "This schedule has no platform task. Delete and recreate it." });
      }

      const sessionToken = getSessionToken(ctx.req.headers.cookie);
      const heartbeatUpdate = await updateHeartbeatJob(
        job.scheduleCronTaskUid,
        {
          cron: input.cronExpression,
          description: input.name !== undefined || input.description !== undefined
            ? `Repo Scribe: ${input.name ?? job.name}`
            : undefined,
        },
        sessionToken
      );
      const updates = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.cronExpression !== undefined
          ? {
              cronExpression: input.cronExpression,
              nextRun: heartbeatUpdate.nextExecutionAt
                ? new Date(heartbeatUpdate.nextExecutionAt)
                : getNextHeartbeatRun(input.cronExpression),
            }
          : {}),
        ...(input.notifyOnSuccess !== undefined ? { notifyOnSuccess: input.notifyOnSuccess ? 1 : 0 } : {}),
        ...(input.notifyOnFailure !== undefined ? { notifyOnFailure: input.notifyOnFailure ? 1 : 0 } : {}),
      };
      return updateScheduledJob(job.id, ctx.user.id, updates);
    }),

  pause: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const job = await getScheduledJobById(input.jobId, ctx.user.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      if (!job.scheduleCronTaskUid) throw new TRPCError({ code: "CONFLICT", message: "Schedule has no platform task." });
      await updateHeartbeatJob(job.scheduleCronTaskUid, { enable: false }, getSessionToken(ctx.req.headers.cookie));
      return updateScheduledJob(job.id, ctx.user.id, { status: "paused", nextRun: null });
    }),

  resume: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const job = await getScheduledJobById(input.jobId, ctx.user.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      if (!job.scheduleCronTaskUid) throw new TRPCError({ code: "CONFLICT", message: "Schedule has no platform task." });
      const heartbeat = await updateHeartbeatJob(
        job.scheduleCronTaskUid,
        { enable: true },
        getSessionToken(ctx.req.headers.cookie)
      );
      return updateScheduledJob(job.id, ctx.user.id, {
        status: "active",
        nextRun: heartbeat.nextExecutionAt
          ? new Date(heartbeat.nextExecutionAt)
          : getNextHeartbeatRun(job.cronExpression),
      });
    }),

  delete: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const job = await getScheduledJobById(input.jobId, ctx.user.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      if (job.scheduleCronTaskUid) {
        await deleteHeartbeatJob(job.scheduleCronTaskUid, getSessionToken(ctx.req.headers.cookie));
      }
      await deleteScheduledJob(job.id, ctx.user.id);
      return { success: true };
    }),

  getExecutionHistory: protectedProcedure
    .input(z.object({ jobId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      const job = await getScheduledJobById(input.jobId, ctx.user.id);
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Schedule not found." });
      return getJobExecutionHistory(input.jobId, input.limit);
    }),
});
