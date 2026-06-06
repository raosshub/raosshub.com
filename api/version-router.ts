import { z } from "zod";
import { createRouter, publicQuery, superadminQuery } from "./middleware";
import { db } from "./queries/connection";
import { versionHistory } from "./db/schema";
import { desc } from "drizzle-orm";

export const versionRouter = createRouter({
  list: publicQuery
    .input(z.object({ projectId: z.number() }).optional())
    .query(async ({ input }) => {
      return db.select().from(versionHistory)
        .orderBy(desc(versionHistory.createdAt))
        .limit(input?.projectId ? 50 : 20);
    }),

  create: superadminQuery
    .input(z.object({
      projectId: z.number(),
      version: z.string(),
      changeType: z.string(),
      description: z.string(),
      affectedTeams: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      await db.insert(versionHistory).values({
        projectId: input.projectId,
        version: input.version,
        changeType: input.changeType,
        description: input.description,
        affectedTeams: input.affectedTeams || [],
      });
      return { success: true };
    }),
});
