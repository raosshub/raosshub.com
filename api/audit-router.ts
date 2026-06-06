import { z } from "zod";
import { createRouter, authedQuery, superadminQuery } from "./middleware";
import { db } from "./queries/connection";
import { auditLog } from "./db/schema";
import { desc } from "drizzle-orm";

export const auditRouter = createRouter({
  create: authedQuery
    .input(z.object({
      action: z.string(),
      resource: z.string(),
      recordId: z.string().optional(),
      oldValue: z.any().optional(),
      newValue: z.any().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(auditLog).values({
        userId: ctx.user?.id,
        username: ctx.user?.username || ctx.user?.screenName || "unknown",
        action: input.action,
        resource: input.resource,
        recordId: input.recordId,
        oldValue: input.oldValue,
        newValue: input.newValue,
      });
      return { success: true };
    }),

  list: superadminQuery
    .input(z.object({ limit: z.number().default(100), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(input.limit).offset(input.offset);
    }),
});
