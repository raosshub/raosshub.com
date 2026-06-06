import { z } from "zod";
import { createRouter, publicQuery, superadminQuery } from "./middleware";
import { db } from "./queries/connection";
import { locales, responsibilityMatrix, users, teams } from "./db/schema";
import { eq, and } from "drizzle-orm";

export const overviewRouter = createRouter({
  // Get a dashboard overview section (executive_summary, timeline, actions, risks)
  getSection: publicQuery
    .input(z.object({ section: z.string(), lang: z.string() }))
    .query(async ({ input }) => {
      const key = `dashboard_overview_${input.section}`;
      const rows = await db
        .select()
        .from(locales)
        .where(and(eq(locales.sectionKey, key), eq(locales.lang, input.lang)))
        .limit(1);
      if (rows.length === 0 || !rows[0].content) return null;
      try {
        return JSON.parse(rows[0].content);
      } catch {
        return rows[0].content;
      }
    }),

  // Save a dashboard overview section
  saveSection: superadminQuery
    .input(
      z.object({
        section: z.string(),
        content: z.string(),
        lang: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const key = `dashboard_overview_${input.section}`;
      const existing = await db
        .select()
        .from(locales)
        .where(and(eq(locales.sectionKey, key), eq(locales.lang, input.lang)))
        .limit(1);
      if (existing.length > 0) {
        await db
          .update(locales)
          .set({ content: input.content })
          .where(eq(locales.id, existing[0].id));
      } else {
        await db.insert(locales).values({
          projectId: 1,
          sectionKey: key,
          lang: input.lang,
          content: input.content,
        });
      }
      return { success: true };
    }),

  // List responsibility matrix with team/user names
  listMatrix: publicQuery.query(async () => {
    const rows = await db
      .select()
      .from(responsibilityMatrix)
      .orderBy(responsibilityMatrix.sortOrder);

    // Fetch team and user names
    const teamList = await db.select().from(teams);
    const userList = await db.select().from(users);

    const teamMap = new Map(teamList.map((t) => [t.teamId, t.nameEn]));
    const userMap = new Map(userList.map((u) => [u.id, u.screenName || u.firstName || u.name || u.username]));

    return rows.map((row) => ({
      ...row,
      teamName: teamMap.get(row.teamId) || row.teamId,
      userName: userMap.get(row.userId) || "Unknown",
    }));
  }),
});
