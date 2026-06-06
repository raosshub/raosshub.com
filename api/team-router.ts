import { z } from "zod";
import { createRouter, authedQuery, teamLeadQuery, superadminQuery } from "./middleware";
import { db } from "@db/connection";
import { teams, userTeams, languages, locales } from "@db/schema";
import { eq, and, asc } from "drizzle-orm";

const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";
const KIMI_API_KEY = process.env.KIMI_API_KEY;

async function translateText(text: string, targetLang: string): Promise<string> {
  if (!KIMI_API_KEY) return text;
  try {
    const res = await fetch(KIMI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KIMI_API_KEY}` },
      body: JSON.stringify({
        model: "moonshot-v1-8k",
        messages: [
          { role: "system", content: `You are a professional translator. Translate to ${targetLang}. Return ONLY the translated text, no explanations.` },
          { role: "user", content: text },
        ],
      }),
    });
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content?.trim() || text;
  } catch { return text; }
}

export const teamRouter = createRouter({
  list: authedQuery
    .input(z.object({ projectId: z.number() }).optional())
    .query(async ({ input }) => {
      const projectId = input?.projectId || 1;
      return db.select().from(teams)
        .where(and(eq(teams.projectId, projectId), eq(teams.isActive, true)))
        .orderBy(asc(teams.sortOrder));
    }),

  get: authedQuery
    .input(z.object({ teamId: z.string() }))
    .query(async ({ input }) => {
      const rows = await db.select().from(teams).where(eq(teams.teamId, input.teamId));
      return rows[0] || null;
    }),

  create: teamLeadQuery
    .input(z.object({
      teamId: z.string().min(1).max(100),
      projectId: z.number(),
      nameEn: z.string().min(1),
      nameZh: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      textColor: z.string().optional(),
      tabs: z.array(z.string()).optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const rows = await db.insert(teams).values({
        teamId: input.teamId,
        projectId: input.projectId,
        nameEn: input.nameEn,
        nameZh: input.nameZh,
        description: input.description,
        icon: input.icon,
        color: input.color,
        textColor: input.textColor,
        tabs: input.tabs || ["overview", "deliverables", "collaboration", "files", "pdf", "gallery"],
        sortOrder: input.sortOrder,
      }).returning();
      const team = rows[0];

      // Auto-translate team name to all active languages (fire-and-forget, don't block)
      try {
        const activeLangs = await db.select().from(languages).where(eq(languages.isActive, true));
        for (const lang of activeLangs) {
          if (lang.code === "en") continue;
          const translated = await translateText(input.nameEn, lang.nativeName || lang.name);
          const sectionKey = `team_${input.teamId}_name`;
          const existing = await db.select().from(locales).where(
            and(eq(locales.projectId, input.projectId), eq(locales.lang, lang.code), eq(locales.sectionKey, sectionKey))
          );
          if (existing.length > 0) {
            await db.update(locales).set({ content: JSON.stringify({ text: translated }) }).where(eq(locales.id, existing[0].id));
          } else {
            await db.insert(locales).values({
              projectId: input.projectId,
              lang: lang.code,
              sectionKey,
              content: JSON.stringify({ text: translated }),
            });
          }
          if (lang.code === "zh" && team) {
            await db.update(teams).set({ nameZh: translated }).where(eq(teams.id, team.id));
          }
        }
      } catch { /* translation is best-effort, don't fail team creation */ }

      return team;
    }),

  update: teamLeadQuery
    .input(z.object({
      teamId: z.string(),
      nameEn: z.string().optional(),
      nameZh: z.string().optional(),
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      textColor: z.string().optional(),
      tabs: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const { teamId, ...data } = input;
      const rows = await db.update(teams).set(data).where(eq(teams.teamId, teamId)).returning();
      return rows[0];
    }),

  // Soft-delete (archive)
  delete: superadminQuery
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(teams).set({ isActive: false }).where(eq(teams.teamId, input.teamId));
      return { success: true };
    }),

  // List archived teams
  listArchived: authedQuery
    .input(z.object({ projectId: z.number() }).optional())
    .query(async ({ input }) => {
      const projectId = input?.projectId || 1;
      return db.select().from(teams)
        .where(and(eq(teams.projectId, projectId), eq(teams.isActive, false)))
        .orderBy(asc(teams.sortOrder));
    }),

  // Restore archived team
  restore: superadminQuery
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ input }) => {
      await db.update(teams).set({ isActive: true }).where(eq(teams.teamId, input.teamId));
      return { success: true };
    }),

  getMembers: authedQuery
    .input(z.object({ teamId: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(userTeams).where(eq(userTeams.teamId, input.teamId));
    }),
});
