import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { db } from "./queries/connection";
import { teamFiles, galleryImages, pdfDocuments } from "./db/schema";
import { eq, desc } from "drizzle-orm";

export const fileRouter = createRouter({
  listByTeam: authedQuery
    .input(z.object({ teamId: z.string() }))
    .query(async ({ input }) => {
      const files = await db.select().from(teamFiles)
        .where(eq(teamFiles.teamId, input.teamId))
        .orderBy(desc(teamFiles.createdAt));
      return files;
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(teamFiles).where(eq(teamFiles.id, input.id));
      return { success: true };
    }),
});
