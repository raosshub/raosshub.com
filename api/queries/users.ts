import { eq } from "drizzle-orm";
import { db } from "./connection";
import * as schema from "@db/schema";

export async function findUserByUsername(username: string) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
  return rows.at(0);
}

export async function findUserById(id: number) {
  const rows = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
  return rows.at(0);
}

// Stubs for Kimi OAuth compatibility (not used in custom auth mode)
export async function findUserByUnionId(_unionId: string) {
  return null;
}

export async function upsertUser(_data: { unionId: string; name?: string; avatar?: string; lastSignInAt?: Date }) {
  return null;
}
