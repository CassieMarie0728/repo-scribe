import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Generations table for storing document generation history.
 * Scoped per user to maintain privacy and enable history retrieval.
 */
export const generations = mysqlTable(
  "generations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    repoUrl: varchar("repoUrl", { length: 500 }).notNull(),
    repoName: varchar("repoName", { length: 255 }),
    docType: varchar("docType", { length: 64 }).notNull(),
    tone: varchar("tone", { length: 64 }).notNull(),
    length: varchar("length", { length: 64 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [index("generations_user_created_idx").on(table.userId, table.createdAt)]
);

export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;

/**
 * Export templates table for storing user-defined export formatting templates.
 * Allows users to save and reuse export configurations.
 */
export const exportTemplates = mysqlTable(
  "exportTemplates",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isDefault: int("isDefault").default(0).notNull(),
    headerText: text("headerText"),
    footerText: text("footerText"),
    includeMetadata: int("includeMetadata").default(1).notNull(),
    includeTableOfContents: int("includeTableOfContents").default(0).notNull(),
    fontSize: varchar("fontSize", { length: 32 }).default("normal"),
    fontFamily: varchar("fontFamily", { length: 64 }).default("sans-serif"),
    lineSpacing: varchar("lineSpacing", { length: 32 }).default("1.5"),
    pageMargins: varchar("pageMargins", { length: 64 }).default("1in"),
    colorScheme: varchar("colorScheme", { length: 64 }).default("default"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [index("export_templates_user_default_idx").on(table.userId, table.isDefault)]
);

export type ExportTemplate = typeof exportTemplates.$inferSelect;
export type InsertExportTemplate = typeof exportTemplates.$inferInsert;


/**
 * Scheduled batch regeneration jobs table.
 * Stores recurring regeneration schedules with cron expressions and execution history.
 */
export const scheduledJobs = mysqlTable(
  "scheduledJobs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    // Comma-separated generation IDs to regenerate
    generationIds: text("generationIds").notNull(),
    // New parameters for regeneration
    docType: varchar("docType", { length: 64 }).notNull(),
    tone: varchar("tone", { length: 64 }).notNull(),
    length: varchar("length", { length: 64 }).notNull(),
    // Six-field UTC cron expression used by the platform scheduler.
    cronExpression: varchar("cronExpression", { length: 64 }).notNull(),
    // Durable platform scheduler identity. Never trust a request body for this value.
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    // Job status: active, paused, completed, failed
    status: mysqlEnum("status", ["active", "paused", "completed", "failed"]).default("active").notNull(),
    // Timestamps for scheduling
    nextRun: timestamp("nextRun"),
    lastRun: timestamp("lastRun"),
    lastError: text("lastError"),
    // Execution count
    executionCount: int("executionCount").default(0).notNull(),
    // Completion-notification preferences for the app owner.
    notifyOnSuccess: int("notifyOnSuccess").default(1).notNull(),
    notifyOnFailure: int("notifyOnFailure").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("scheduled_jobs_user_status_idx").on(table.userId, table.status),
    index("scheduled_jobs_task_uid_idx").on(table.scheduleCronTaskUid),
  ]
);

export type ScheduledJob = typeof scheduledJobs.$inferSelect;
export type InsertScheduledJob = typeof scheduledJobs.$inferInsert;

/**
 * Job execution history table for tracking job runs and debugging.
 */
export const jobExecutionHistory = mysqlTable(
  "jobExecutionHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    jobId: int("jobId").notNull(),
    userId: int("userId").notNull(),
    status: mysqlEnum("status", ["success", "failed", "partial"]).notNull(),
    successCount: int("successCount").default(0).notNull(),
    failureCount: int("failureCount").default(0).notNull(),
    totalCount: int("totalCount").notNull(),
    errorMessage: text("errorMessage"),
    executedAt: timestamp("executedAt").defaultNow().notNull(),
    completedAt: timestamp("completedAt"),
  },
  (table) => [index("job_execution_history_job_executed_idx").on(table.jobId, table.executedAt)]
);

export type JobExecutionHistory = typeof jobExecutionHistory.$inferSelect;
export type InsertJobExecutionHistory = typeof jobExecutionHistory.$inferInsert;
