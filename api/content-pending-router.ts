import { z } from "zod";
import { createRouter, superadminQuery } from "./middleware";
import { db } from "./queries/connection";
import { teamContentPending } from "./db/schema";
import { eq, desc } from "drizzle-orm";

export const contentPendingRouter = createRouter({
  list: superadminQuery
    .input(z.object({ status: z.string().default("pending") }))
    .query(async ({ input }) => {
      return db.select().from(teamContentPending)
        .where(eq(teamContentPending.status, input.status))
        .orderBy(desc(teamContentPending.createdAt));
    }),

  review: superadminQuery
    .input(z.object({ id: z.number(), status: z.enum(["approved", "rejected"]), reviewNote: z.string().optional() }))
    .mutation(async ({ input }) => {
      await db.update(teamContentPending)
        .set({ status: input.status, reviewNote: input.reviewNote })
        .where(eq(teamContentPending.id, input.id));
      return { success: true };
    }),
});
