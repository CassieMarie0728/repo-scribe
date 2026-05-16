import { eq, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, generations, InsertGeneration } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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
    // Get the last inserted ID
    const saved = await db
      .select()
      .from(generations)
      .where(eq(generations.userId, generation.userId))
      .orderBy(desc(generations.createdAt))
      .limit(1);
    
    return saved.length > 0 ? { id: saved[0].id } : null;
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
    const result = await db
      .select()
      .from(generations)
      .where(eq(generations.userId, userId))
      .limit(100);
    
    return result.filter(g => generationIds.includes(g.id));
  } catch (error) {
    console.error("[Database] Failed to get generations by ids:", error);
    return [];
  }
}
