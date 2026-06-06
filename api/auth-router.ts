import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { db } from "@db/connection";
import { users, refreshTokens, resetTokens } from "@db/schema";
import { eq, and, gt } from "drizzle-orm";
import { hashPassword, comparePassword, generateTokens, verifyRefreshToken } from "./lib/auth";
import crypto from "crypto";

export const authRouter = createRouter({
  register: publicQuery
    .input(z.object({
      username: z.string().email().min(1),
      password: z.string().min(8),
      name: z.string().optional(),
      role: z.enum(["superadmin", "admin", "user", "viewer"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const existing = await db.select().from(users).where(eq(users.username, input.username.toLowerCase()));
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "User already exists" });
      const passwordHash = await hashPassword(input.password);
      const rows = await db.insert(users).values({
        username: input.username.toLowerCase(),
        name: input.name || input.username.split("@")[0],
        passwordHash,
        role: input.role || "user",
      }).returning();
      const user = rows[0];
      const tokens = generateTokens({ id: user.id, username: user.username, role: user.role });
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: crypto.createHash("sha256").update(tokens.refreshToken).digest("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: user.id, username: user.username, name: user.name, role: user.role } };
    }),

  login: publicQuery
    .input(z.object({
      username: z.string().min(1),
      password: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const rows = await db.select().from(users).where(eq(users.username, input.username.toLowerCase()));
      if (rows.length === 0) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      const user = rows[0];
      if (!user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      const valid = await comparePassword(input.password, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials" });
      await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, user.id));
      const tokens = generateTokens({ id: user.id, username: user.username, role: user.role });
      await db.insert(refreshTokens).values({
        userId: user.id,
        tokenHash: crypto.createHash("sha256").update(tokens.refreshToken).digest("hex"),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });
      return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: user.id, username: user.username, name: user.name, role: user.role, ndaAccepted: user.ndaAccepted, avatar: user.avatar } };
    }),

  refresh: publicQuery
    .input(z.object({ refreshToken: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const decoded = verifyRefreshToken(input.refreshToken);
        const tokenHash = crypto.createHash("sha256").update(input.refreshToken).digest("hex");
        const rows = await db.select().from(refreshTokens).where(
          and(eq(refreshTokens.tokenHash, tokenHash), gt(refreshTokens.expiresAt, new Date()))
        );
        if (rows.length === 0) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid refresh token" });
        const userRows = await db.select().from(users).where(eq(users.id, decoded.id));
        if (userRows.length === 0) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
        const user = userRows[0];
        const tokens = generateTokens({ id: user.id, username: user.username, role: user.role });
        return { accessToken: tokens.accessToken };
      } catch {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid refresh token" });
      }
    }),

  me: authedQuery.query(async ({ ctx }) => {
    const rows = await db.select().from(users).where(eq(users.id, ctx.user.id));
    if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    const u = rows[0];
    return { id: u.id, username: u.username, firstName: u.firstName, lastName: u.lastName, screenName: u.screenName, name: u.name, email: u.email, role: u.role, avatar: u.avatar, ndaAccepted: u.ndaAccepted, company: u.company, position: u.position, division: u.division, mobile: u.mobile, countryCode: u.countryCode, canViewActivity: u.canViewActivity, canUseAi: u.canUseAi, createdAt: u.createdAt };
  }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  changePassword: authedQuery
    .input(z.object({ currentPassword: z.string(), newPassword: z.string().min(8) }))
    .mutation(async ({ ctx, input }) => {
      const rows = await db.select().from(users).where(eq(users.id, ctx.user.id));
      if (rows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const user = rows[0];
      if (!user.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "No password set" });
      const valid = await comparePassword(input.currentPassword, user.passwordHash);
      if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      const newHash = await hashPassword(input.newPassword);
      await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  forgotPassword: publicQuery
    .input(z.object({ username: z.string().email() }))
    .mutation(async ({ input }) => {
      const rows = await db.select().from(users).where(eq(users.username, input.username.toLowerCase()));
      if (rows.length === 0) return { message: "If that email exists, a reset link has been sent" };
      const user = rows[0];
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await db.insert(resetTokens).values({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      return { message: "If that email exists, a reset link has been sent", token };
    }),

  resetPassword: publicQuery
    .input(z.object({ token: z.string(), password: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const tokenHash = crypto.createHash("sha256").update(input.token).digest("hex");
      const rows = await db.select().from(resetTokens).where(
        and(eq(resetTokens.tokenHash, tokenHash), gt(resetTokens.expiresAt, new Date()), eq(resetTokens.used, false))
      );
      if (rows.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired token" });
      const rt = rows[0];
      const passwordHash = await hashPassword(input.password);
      await db.update(users).set({ passwordHash }).where(eq(users.id, rt.userId));
      await db.update(resetTokens).set({ used: true }).where(eq(resetTokens.id, rt.id));
      return { success: true };
    }),

  acceptNda: authedQuery.mutation(async ({ ctx }) => {
    await db.update(users).set({ ndaAccepted: true, ndaDate: new Date() }).where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  // ─── Admin User Management ───
  list: authedQuery.query(async () => {
    return db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      screenName: users.screenName,
      name: users.name,
      email: users.email,
      role: users.role,
      ndaAccepted: users.ndaAccepted,
      canUseAi: users.canUseAi,
      canViewActivity: users.canViewActivity,
      company: users.company,
      position: users.position,
      division: users.division,
      mobile: users.mobile,
      countryCode: users.countryCode,
      lastActive: users.lastActive,
      createdAt: users.createdAt,
    }).from(users).orderBy(users.createdAt);
  }),

  update: authedQuery
    .input(z.object({
      id: z.number(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      screenName: z.string().optional(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["superadmin", "team_lead", "user", "viewer"]).optional(),
      company: z.string().optional(),
      position: z.string().optional(),
      division: z.string().optional(),
      mobile: z.string().optional(),
      countryCode: z.string().optional(),
      canUseAi: z.boolean().optional(),
      canViewActivity: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.update(users).set(data).where(eq(users.id, id));
      return { success: true };
    }),

  updateProfile: authedQuery
    .input(z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      screenName: z.string().optional(),
      name: z.string().optional(),
      company: z.string().optional(),
      position: z.string().optional(),
      division: z.string().optional(),
      mobile: z.string().optional(),
      countryCode: z.string().optional(),
      avatar: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id;
      await db.update(users).set(input).where(eq(users.id, userId));
      return { success: true };
    }),

  uploadAvatar: authedQuery
    .input(z.object({ imageBase64: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user!.id;
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      
      const fs = await import("fs");
      const path = await import("path");
      const uploadDir = process.env.UPLOAD_DIR || "./uploads";
      const avatarDir = path.resolve(uploadDir, "avatars");
      if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
      
      const fileName = `avatar_${userId}_${Date.now()}.png`;
      const filePath = path.resolve(avatarDir, fileName);
      fs.writeFileSync(filePath, buffer);
      
      const avatarUrl = `/uploads/avatars/${fileName}`;
      await db.update(users).set({ avatar: avatarUrl }).where(eq(users.id, userId));
      return { avatarUrl };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),

  adminResetPassword: authedQuery
    .input(z.object({ userId: z.number(), newPassword: z.string().min(8) }))
    .mutation(async ({ input }) => {
      const passwordHash = await hashPassword(input.newPassword);
      await db.update(users).set({ passwordHash }).where(eq(users.id, input.userId));
      return { success: true };
    }),
});
