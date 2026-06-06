import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { db } from "./queries/connection";
import { users, refreshTokens, locales, languages, teamFiles, pdfDocuments, galleryImages } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { comparePassword, generateTokens } from "./lib/auth";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { Readable } from "stream";

const app = new Hono();

app.use(logger());
app.use(cors({ origin: "*", allowHeaders: ["Content-Type", "Authorization"], allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));

// ═══ PUBLIC REST ENDPOINTS (no auth needed) ═══

// Health check
app.get("/api/health", (c) => c.json({ status: "ok" }));

// Get login strings for any language
app.get("/api/public/strings", async (c) => {
  const lang = c.req.query("lang") || "en";
  const section = c.req.query("section") || "ui.login";
  try {
    const rows = await db.select().from(locales).where(
      and(eq(locales.projectId, 1), eq(locales.lang, lang), eq(locales.sectionKey, section))
    );
    if (rows.length > 0 && rows[0].content) {
      try { return c.json(JSON.parse(rows[0].content)); } catch { /* fallback */ }
    }
    return c.json({}); // empty = use fallback
  } catch {
    return c.json({}); 
  }
});

// Get active languages
app.get("/api/public/languages", async (c) => {
  try {
    const rows = await db.select().from(languages).where(eq(languages.isActive, true)).orderBy(languages.name);
    return c.json(rows);
  } catch {
    return c.json([]);
  }
});

// ═══ AUTH ENDPOINTS (REST — bypasses tRPC body issue) ═══

app.post("/api/rest/login", async (c) => {
  try {
    const body = await c.req.json();
    const { username, password } = body;
    const rows = await db.select().from(users).where(eq(users.username, username?.toLowerCase()));
    if (rows.length === 0) return c.json({ error: "Invalid credentials" }, 401);
    const user = rows[0];
    if (!user.passwordHash) return c.json({ error: "No password" }, 401);
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) return c.json({ error: "Invalid credentials" }, 401);
    const tokens = generateTokens({ id: user.id, username: user.username, role: user.role });
    await db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash: crypto.createHash("sha256").update(tokens.refreshToken).digest("hex"),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: user.id, username: user.username, name: user.name, role: user.role } });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.post("/api/rest/register", async (c) => {
  try {
    const body = await c.req.json();
    const {
      username, password, role,
      firstName, lastName, screenName,
      email, company, division, position,
      countryCode, mobile,
      canUseAi, canViewActivity, teamIds,
    } = body;
    const existing = await db.select().from(users).where(eq(users.username, username?.toLowerCase()));
    if (existing.length > 0) return c.json({ error: "User already exists" }, 409);
    const { hashPassword } = await import("./lib/auth");
    const passwordHash = await hashPassword(password);
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || screenName || username.split("@")[0];
    const rows = await db.insert(users).values({
      username: username.toLowerCase(),
      firstName: firstName || null,
      lastName: lastName || null,
      screenName: screenName || null,
      name: fullName,
      email: email || username.toLowerCase(),
      passwordHash,
      role: role || "user",
      company: company || null,
      division: division || null,
      position: position || null,
      countryCode: countryCode || null,
      mobile: mobile || null,
      canUseAi: canUseAi === true,
      canViewActivity: canViewActivity === true,
    }).returning();
    const user = rows[0];
    // Assign teams if provided
    if (teamIds && Array.isArray(teamIds) && teamIds.length > 0) {
      const { userTeams } = await import("@db/schema");
      for (const teamId of teamIds) {
        await db.insert(userTeams).values({ userId: user.id, teamId }).onConflictDoNothing();
      }
    }
    const tokens = generateTokens({ id: user.id, username: user.username, role: user.role });
    return c.json({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: { id: user.id, username: user.username, name: user.name, screenName: user.screenName, role: user.role } });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ═══ FILE UPLOAD (REST — multipart form) ═══

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getUploadPath(teamId: string, type: string, fileName: string) {
  const dir = path.join(UPLOAD_DIR, teamId, type);
  ensureDir(dir);
  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  return { dir, safeName, fullPath: path.join(dir, safeName), urlPath: `/uploads/${teamId}/${type}/${safeName}` };
}

async function writeFileToDisk(blob: Blob, filePath: string) {
  const buffer = Buffer.from(await blob.arrayBuffer());
  fs.writeFileSync(filePath, buffer);
}

async function getUserFromToken(c: any) {
  const auth = c.req.header("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return null;
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "default-secret");
    const { payload } = await jwtVerify(token, secret, { clockTolerance: 60 });
    return payload as any;
  } catch { return null; }
}

// Upload: Team Files
app.post("/api/upload/file", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.parseBody({ all: false });
    const file = body.file as File;
    const teamId = body.teamId as string;
    const notes = body.notes as string;
    if (!file || !teamId) return c.json({ error: "Missing file or teamId" }, 400);
    const { safeName, fullPath, urlPath } = getUploadPath(teamId, "files", file.name);
    await writeFileToDisk(file, fullPath);
    await db.insert(teamFiles).values({
      teamId, fileName: file.name, filePath: urlPath, fileSize: file.size,
      mimeType: file.type, notes, uploadedBy: user.id,
    });
    return c.json({ success: true, path: urlPath });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Upload: PDF Documents
app.post("/api/upload/pdf", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.parseBody({ all: false });
    const file = body.file as File;
    const teamId = body.teamId as string;
    if (!file || !teamId) return c.json({ error: "Missing file or teamId" }, 400);
    const { safeName, fullPath, urlPath } = getUploadPath(teamId, "pdfs", file.name);
    await writeFileToDisk(file, fullPath);
    const existing = await db.select().from(pdfDocuments).where(eq(pdfDocuments.teamId, teamId));
    const nextVersion = existing.length > 0 ? Math.max(...existing.map((d: any) => d.version || 1)) + 1 : 1;
    await db.insert(pdfDocuments).values({
      teamId, title: file.name, version: nextVersion, fileName: file.name,
      filePath: urlPath, fileSize: file.size, uploadedBy: user.id,
    } as any);
    return c.json({ success: true, path: urlPath });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// Upload: Gallery Images
app.post("/api/upload/gallery", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.parseBody({ all: false });
    const file = body.file as File;
    const teamId = body.teamId as string;
    const title = body.title as string;
    const notes = body.notes as string;
    if (!file || !teamId) return c.json({ error: "Missing file or teamId" }, 400);
    const { safeName, fullPath, urlPath } = getUploadPath(teamId, "gallery", file.name);
    await writeFileToDisk(file, fullPath);
    await db.insert(galleryImages).values({
      teamId, title, fileName: file.name, filePath: urlPath, fileSize: file.size, notes, uploadedBy: user.id,
    });
    return c.json({ success: true, path: urlPath });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ═══ ASSET UPLOAD (logo, 3D model) ═══

app.post("/api/upload/asset", async (c) => {
  try {
    const user = await getUserFromToken(c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    const body = await c.req.parseBody({ all: false });
    const file = body.file as File;
    const assetType = body.type as string; // "logo" or "model"
    if (!file) return c.json({ error: "Missing file" }, 400);

    const dir = path.join(UPLOAD_DIR, "assets");
    ensureDir(dir);
    const safeName = `${assetType}-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const fullPath = path.join(dir, safeName);
    await writeFileToDisk(file, fullPath);
    const urlPath = `/uploads/assets/${safeName}`;

    return c.json({ success: true, path: urlPath });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// ═══ tRPC (for authenticated queries) ═══

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// Catch-all
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

// Serve uploaded files (both dev and production)
app.use("/uploads/*", async (c) => {
  const filePath = path.join(UPLOAD_DIR, c.req.path.replace("/uploads/", ""));
  if (!fs.existsSync(filePath)) return c.json({ error: "Not found" }, 404);
  const mimeType = filePath.endsWith(".pdf") ? "application/pdf" : filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image/" + (filePath.split(".").pop() || "png") : "application/octet-stream";
  const file = fs.readFileSync(filePath);
  return c.newResponse(file, 200, { "Content-Type": mimeType });
});

// Static files in production
if (process.env.NODE_ENV === "production") {
  try {
    const { serveStatic } = await import("@hono/node-server/serve-static");
    app.use("/*", serveStatic({ root: "./dist/public" }));
    app.get("*", serveStatic({ path: "./dist/public/index.html" }));
  } catch { /* */ }
}

export default app;
