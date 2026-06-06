import { Hono } from "hono";
import { db } from "./queries/connection";
import { users, refreshTokens } from "@db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, comparePassword, generateTokens } from "./lib/auth";
import crypto from "crypto";

const app = new Hono();

app.post("/rest/login", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;

    const rows = await db.select().from(users).where(eq(users.username, username?.toLowerCase()));
    if (rows.length === 0) return c.json({ error: "User not found" }, 401);

    const user = rows[0];
    if (!user.passwordHash) return c.json({ error: "No password" }, 401);

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) return c.json({ error: "Invalid password" }, 401);

    const tokens = generateTokens({ id: user.id, username: user.username, role: user.role });

    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(tokens.refreshToken).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return c.json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

export default app;
