import { z } from "zod";
import { createRouter, teamLeadQuery, superadminQuery, publicQuery } from "./middleware";
import { db } from "@db/connection";
import { projects } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const projectRouter = createRouter({
  list: publicQuery.query(async () => {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.select().from(projects).where(eq(projects.slug, input.slug));
      return rows[0] || null;
    }),

  getDefault: publicQuery.query(async () => {
    const rows = await db.select().from(projects).where(eq(projects.isDefault, true));
    if (rows.length > 0) return rows[0];
    const all = await db.select().from(projects).orderBy(desc(projects.createdAt)).limit(1);
    return all[0] || null;
  }),

  create: teamLeadQuery
    .input(z.object({
      slug: z.string().min(1).max(100),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      version: z.string().optional(),
      logoPath: z.string().optional(),
      faviconPath: z.string().optional(),
      config: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const rows = await db.insert(projects).values({
        slug: input.slug,
        name: input.name,
        description: input.description,
        version: input.version || "1.0",
        logoPath: input.logoPath,
        faviconPath: input.faviconPath,
        config: input.config as any,
      } as any).returning();
      return rows[0];
    }),

  update: teamLeadQuery
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      version: z.string().optional(),
      status: z.enum(["active", "archived", "draft"]).optional(),
      isDefault: z.boolean().optional(),
      logoPath: z.string().optional(),
      faviconPath: z.string().optional(),
      threeDPath: z.string().optional(),
      config: z.record(z.string(), z.any()).optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const rows = await db.update(projects).set(data as any).where(eq(projects.id, id)).returning();
      return rows[0];
    }),

  delete: superadminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(projects).where(eq(projects.id, input.id));
      return { success: true };
    }),
});
