import { z } from "zod";
import { createRouter, publicQuery, authedQuery, superadminQuery } from "./middleware";
import { db } from "./queries/connection";
import { locales, languages } from "./db/schema";
import { eq, and } from "drizzle-orm";

export const localeRouter = createRouter({
  // Get all locales for a project+lang as a flat key-value object
  getLocales: publicQuery
    .input(z.object({ projectId: z.number(), lang: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(locales)
        .where(
          and(
            eq(locales.projectId, input.projectId),
            eq(locales.lang, input.lang)
          )
        );
      const result: Record<string, any> = {};
      for (const row of rows) {
        // Try to parse as JSON, fallback to string
        if (row.content) {
          try {
            result[row.sectionKey] = JSON.parse(row.content);
          } catch {
            result[row.sectionKey] = row.content;
          }
        }
      }
      return result;
    }),

  // Get a single locale by key
  getByKey: publicQuery
    .input(z.object({ sectionKey: z.string(), lang: z.string() }))
    .query(async ({ input }) => {
      const rows = await db
        .select()
        .from(locales)
        .where(
          and(
            eq(locales.sectionKey, input.sectionKey),
            eq(locales.lang, input.lang)
          )
        )
        .limit(1);
      if (rows.length === 0) return null;
      const row = rows[0];
      if (!row.content) return null;
      // Try to parse as JSON, fallback to string
      try {
        return JSON.parse(row.content);
      } catch {
        return row.content;
      }
    }),

  // Save a locale section (admin only)
  saveSection: superadminQuery
    .input(
      z.object({
        projectId: z.number().optional(),
        sectionKey: z.string(),
        content: z.string(),
        lang: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const existing = await db
        .select()
        .from(locales)
        .where(
          and(
            eq(locales.sectionKey, input.sectionKey),
            eq(locales.lang, input.lang)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(locales)
          .set({ content: input.content, projectId: input.projectId || 1 })
          .where(eq(locales.id, existing[0].id));
      } else {
        await db.insert(locales).values({
          projectId: input.projectId || 1,
          sectionKey: input.sectionKey,
          lang: input.lang,
          content: input.content,
        });
      }
      return { success: true };
    }),

  // Language management
  getLanguages: publicQuery.query(async () => {
    return db.select().from(languages).orderBy(languages.name);
  }),

  createLanguage: superadminQuery
    .input(
      z.object({
        code: z.string(),
        name: z.string(),
        nativeName: z.string(),
        isRtl: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      await db.insert(languages).values({
        code: input.code,
        name: input.name,
        nativeName: input.nativeName,
        isActive: true,
        isRtl: input.isRtl,
      });
      return { success: true };
    }),

  toggleLanguage: superadminQuery
    .input(z.object({ code: z.string(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(languages)
        .set({ isActive: input.isActive })
        .where(eq(languages.code, input.code));
      return { success: true };
    }),
});
