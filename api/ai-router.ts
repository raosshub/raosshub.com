import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { db } from "./queries/connection";
import { aiConversations } from "./db/schema";
import { eq, desc } from "drizzle-orm";

export const aiRouter = createRouter({
  getHistory: authedQuery
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      return db.select().from(aiConversations)
        .where(eq(aiConversations.userId, ctx.user.id))
        .orderBy(desc(aiConversations.createdAt))
        .limit(input.limit);
    }),

  saveMessage: authedQuery
    .input(z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
      context: z.record(z.string()).optional(),
      tokensUsed: z.number().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await db.insert(aiConversations).values({
        userId: ctx.user.id,
        role: input.role,
        content: input.content,
        context: input.context || {},
        tokensUsed: input.tokensUsed || 0,
      });
      return { success: true };
    }),

  clearHistory: authedQuery
    .mutation(async ({ ctx }) => {
      await db.delete(aiConversations).where(eq(aiConversations.userId, ctx.user.id));
      return { success: true };
    }),
});
