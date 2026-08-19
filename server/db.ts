import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { inArray, isNull, lt, or } from "drizzle-orm";
import { InsertUser, users, generations, InsertGeneration, exportTemplates, InsertExportTemplate, scheduledJobs, InsertScheduledJob, jobExecutionHistory, InsertJobExecutionHistory } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

/**
 * Accept only unique, positive, safe integer primary keys before constructing an IN query.
 */
export function normalizeGenerationIds(generationIds: number[]): number[] {
  return Array.from(
    new Set(generationIds.filter((id) => Number.isSafeInteger(id) && id > 0))
  );
}

/**
 * MySQL returns the generated auto-increment value with the insert result.
 * Fail loudly rather than guessing which recently-created row belongs to this request.
 */
export function getRequiredInsertId(result: unknown, entityName: string): number {
  const insertResult = Array.isArray(result) ? result[0] : result;
  const insertId = Number((insertResult as { insertId?: number | bigint } | null)?.insertId ?? 0);
  if (!Number.isSafeInteger(insertId) || insertId <= 0) {
    throw new Error(`Database did not return a valid ${entityName} ID`);
  }
  return insertId;
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function saveGeneration(generation: InsertGeneration): Promise<{ id: number } | null> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot save generation: database not available");
    return null;
  }

  try {
    const result = await db.insert(generations).values(generation);
    return { id: getRequiredInsertId(result, "generation") };
  } catch (error) {
    console.error("[Database] Failed to save generation:", error);
    throw error;
  }
}

export async function getUserGenerations(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get generations: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.userId, userId))
      .orderBy(desc(generations.createdAt))
      .limit(100);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get generations:", error);
    return [];
  }
}

export async function updateGeneration(generationId: number, userId: number, content: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update generation: database not available");
    return;
  }

  try {
    // Verify user owns this generation before updating
    const generation = await db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!generation || generation.length === 0) {
      throw new Error("Generation not found");
    }

    if (generation[0].userId !== userId) {
      throw new Error("Unauthorized: you do not own this generation");
    }

    await db
      .update(generations)
      .set({ content })
      .where(eq(generations.id, generationId));
  } catch (error) {
    console.error("[Database] Failed to update generation:", error);
    throw error;
  }
}

export async function getGenerationsByIds(generationIds: number[], userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get generations: database not available");
    return [];
  }

  try {
    const ids = normalizeGenerationIds(generationIds);
    if (ids.length === 0) return [];

    const result = await db
      .select()
      .from(generations)
      .where(
        and(
          eq(generations.userId, userId),
          inArray(generations.id, ids)
        )
      );

    return result;
  } catch (error) {
    console.error("[Database] Failed to get generations by ids:", error);
    return [];
  }
}


export async function getTemplatesByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get templates: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(exportTemplates)
      .where(eq(exportTemplates.userId, userId));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get templates:", error);
    return [];
  }
}

export async function getTemplateById(templateId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get template: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(exportTemplates)
      .where(
        and(
          eq(exportTemplates.id, templateId),
          eq(exportTemplates.userId, userId)
        )
      )
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get template:", error);
    return undefined;
  }
}

export async function createTemplate(template: InsertExportTemplate) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create template: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(exportTemplates).values(template);
    const insertId = getRequiredInsertId(result, "export template");
    return await getTemplateById(insertId, template.userId);
  } catch (error) {
    console.error("[Database] Failed to create template:", error);
    throw error;
  }
}

export async function updateTemplate(
  templateId: number,
  userId: number,
  updates: Partial<InsertExportTemplate>
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update template: database not available");
    return undefined;
  }

  try {
    await db
      .update(exportTemplates)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(exportTemplates.id, templateId),
          eq(exportTemplates.userId, userId)
        )
      );
    return await getTemplateById(templateId, userId);
  } catch (error) {
    console.error("[Database] Failed to update template:", error);
    throw error;
  }
}

export async function deleteTemplate(templateId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete template: database not available");
    return undefined;
  }

  try {
    const result = await db
      .delete(exportTemplates)
      .where(
        and(
          eq(exportTemplates.id, templateId),
          eq(exportTemplates.userId, userId)
        )
      );
    return result;
  } catch (error) {
    console.error("[Database] Failed to delete template:", error);
    throw error;
  }
}

export async function setDefaultTemplate(
  templateId: number,
  userId: number
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot set default template: database not available");
    return undefined;
  }

  try {
    await db
      .update(exportTemplates)
      .set({ isDefault: 0 })
      .where(eq(exportTemplates.userId, userId));

    await db
      .update(exportTemplates)
      .set({ isDefault: 1 })
      .where(
        and(
          eq(exportTemplates.id, templateId),
          eq(exportTemplates.userId, userId)
        )
      );
    return await getTemplateById(templateId, userId);
  } catch (error) {
    console.error("[Database] Failed to set default template:", error);
    throw error;
  }
}

export async function getDefaultTemplate(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get default template: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(exportTemplates)
      .where(
        and(
          eq(exportTemplates.userId, userId),
          eq(exportTemplates.isDefault, 1)
        )
      )
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get default template:", error);
    return undefined;
  }
}


/**
 * Scheduled jobs helpers
 */
export async function createScheduledJob(job: InsertScheduledJob) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create job: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(scheduledJobs).values(job);
    const insertId = getRequiredInsertId(result, "scheduled job");
    return await getScheduledJobById(insertId, job.userId);
  } catch (error) {
    console.error("[Database] Failed to create job:", error);
    throw error;
  }
}

export async function getScheduledJobsByUserId(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get jobs: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.userId, userId))
      .orderBy(desc(scheduledJobs.createdAt));
    return result;
  } catch (error) {
    console.error("[Database] Failed to get jobs:", error);
    return [];
  }
}

export async function getScheduledJobById(jobId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get job: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(scheduledJobs)
      .where(and(eq(scheduledJobs.id, jobId), eq(scheduledJobs.userId, userId)))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get job:", error);
    return undefined;
  }
}

/** Resolve a scheduled job from the scheduler-owned task UID, never request-body data. */
export async function getScheduledJobByCronTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get scheduled job: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(scheduledJobs)
      .where(eq(scheduledJobs.scheduleCronTaskUid, taskUid))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get scheduled job by task UID:", error);
    throw error;
  }
}

/**
 * Atomically reserve one scheduled execution slot. A retry or concurrent delivery
 * sees zero affected rows once a run has already claimed the same cron slot.
 */
export async function claimScheduledJobExecution(
  taskUid: string,
  currentSlot: Date,
  claimedAt: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database is unavailable");
  }

  const result = await db
    .update(scheduledJobs)
    .set({ lastRun: claimedAt, updatedAt: claimedAt })
    .where(
      and(
        eq(scheduledJobs.scheduleCronTaskUid, taskUid),
        eq(scheduledJobs.status, "active"),
        or(isNull(scheduledJobs.lastRun), lt(scheduledJobs.lastRun, currentSlot))
      )
    );

  return Number((result as { affectedRows?: number } | null)?.affectedRows ?? 0) === 1;
}

export async function updateScheduledJob(
  jobId: number,
  userId: number,
  updates: Partial<InsertScheduledJob>
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update job: database not available");
    return undefined;
  }

  try {
    await db
      .update(scheduledJobs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(scheduledJobs.id, jobId), eq(scheduledJobs.userId, userId)));
    return await getScheduledJobById(jobId, userId);
  } catch (error) {
    console.error("[Database] Failed to update job:", error);
    throw error;
  }
}

export async function deleteScheduledJob(jobId: number, userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete job: database not available");
    return undefined;
  }

  try {
    const result = await db
      .delete(scheduledJobs)
      .where(and(eq(scheduledJobs.id, jobId), eq(scheduledJobs.userId, userId)));
    return result;
  } catch (error) {
    console.error("[Database] Failed to delete job:", error);
    throw error;
  }
}

export async function recordJobExecution(
  execution: InsertJobExecutionHistory
) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot record execution: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(jobExecutionHistory).values(execution);
    return result;
  } catch (error) {
    console.error("[Database] Failed to record execution:", error);
    throw error;
  }
}

export async function getJobExecutionHistory(jobId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get execution history: database not available");
    return [];
  }

  try {
    const result = await db
      .select()
      .from(jobExecutionHistory)
      .where(eq(jobExecutionHistory.jobId, jobId))
      .orderBy(desc(jobExecutionHistory.executedAt))
      .limit(limit);
    return result;
  } catch (error) {
    console.error("[Database] Failed to get execution history:", error);
    return [];
  }
}


/**
 * Seed built-in templates for a new user
 */
export async function seedBuiltInTemplates(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot seed templates: database not available");
    return;
  }

  try {
    // Check if user already has templates
    const existing = await db
      .select()
      .from(exportTemplates)
      .where(eq(exportTemplates.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      // User already has templates, skip seeding
      return;
    }

    // Import built-in templates
    const { BUILT_IN_TEMPLATES } = await import("./lib/builtInTemplates");

    // Create templates for the user
    for (const template of Object.values(BUILT_IN_TEMPLATES)) {
      await db.insert(exportTemplates).values({
        userId,
        name: template.name,
        description: template.description,
        headerText: template.headerText,
        footerText: template.footerText,
        includeMetadata: template.includeMetadata ? 1 : 0,
        includeTableOfContents: template.includeTableOfContents ? 1 : 0,
        fontSize: template.fontSize,
        fontFamily: template.fontFamily,
        lineSpacing: template.lineSpacing,
        pageMargins: template.pageMargins,
        colorScheme: template.colorScheme,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.log(`[Database] Seeded ${Object.keys(BUILT_IN_TEMPLATES).length} built-in templates for user ${userId}`);
  } catch (error) {
    console.error("[Database] Failed to seed templates:", error);
    // Don't throw - seeding failure shouldn't block user creation
  }
}
