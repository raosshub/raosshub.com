import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@db/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "raosshub-secret-key-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "raosshub-refresh-secret";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateTokens(user: { id: number; username: string; role: string }) {
  const accessToken = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

export async function verifyToken(token: string) {
  const decoded = jwt.verify(token, JWT_SECRET, { clockTolerance: 60 }) as {
    id: number; username: string; role: string;
  };
  const rows = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
  return rows[0] || undefined;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET, { clockTolerance: 60 }) as { id: number };
}
