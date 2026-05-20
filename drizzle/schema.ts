import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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
export const generations = mysqlTable("generations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  repoUrl: varchar("repoUrl", { length: 500 }).notNull(),
  repoName: varchar("repoName", { length: 255 }),
  docType: varchar("docType", { length: 64 }).notNull(),
  tone: varchar("tone", { length: 64 }).notNull(),
  length: varchar("length", { length: 64 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Generation = typeof generations.$inferSelect;
export type InsertGeneration = typeof generations.$inferInsert;

/**
 * Export templates table for storing user-defined export formatting templates.
 * Allows users to save and reuse export configurations.
 */
export const exportTemplates = mysqlTable("exportTemplates", {
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
});

export type ExportTemplate = typeof exportTemplates.$inferSelect;
export type InsertExportTemplate = typeof exportTemplates.$inferInsert;
