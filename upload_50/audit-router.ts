import { z } from "zod";
import { createRouter, authedQuery, teamLeadQuery } from "./middleware";
import { db } from "@db/connection";
import { auditLog } from "@db/schema";
import { desc } from "drizzle-orm";

export const auditRouter = createRouter({
  list: teamLeadQuery
    .input(z.object({
      limit: z.number().min(1).max(500).optional(),
      offset: z.number().min(0).optional(),
      action: z.string().optional(),
      resource: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit || 100;
      const offset = input?.offset || 0;
      return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset);
    }),

  create: authedQuery
    .input(z.object({
      action: z.string(),
      resource: z.string(),
      recordId: z.string().optional(),
      oldValue: z.any().optional(),
      newValue: z.any().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await db.insert(auditLog).values({
        userId: ctx.user.id,
        username: ctx.user.username || ctx.user.name,
        action: input.action,
        resource: input.resource,
        recordId: input.recordId,
        oldValue: input.oldValue,
        newValue: input.newValue,
      });
      return { success: true };
    }),
});
