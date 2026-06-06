import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { db } from "@db/connection";
import { chatMessages } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const chatRouter = createRouter({
  list: authedQuery
    .input(z.object({ teamId: z.string(), limit: z.number().min(1).max(200).optional() }))
    .query(async ({ input }) => {
      const limit = input.limit || 100;
      return db.select().from(chatMessages)
        .where(eq(chatMessages.teamId, input.teamId))
        .orderBy(desc(chatMessages.createdAt))
        .limit(limit);
    }),

  send: authedQuery
    .input(z.object({
      teamId: z.string(),
      content: z.string().min(1),
      messageType: z.string().default("text"),
      filePath: z.string().optional(),
      parentId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const rows = await db.insert(chatMessages).values({
        teamId: input.teamId,
        content: input.content,
        messageType: input.messageType,
        filePath: input.filePath,
        parentId: input.parentId,
        sentBy: ctx.user.id,
        senderName: ctx.user.name || ctx.user.username,
      }).returning();
      return rows[0];
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Only sender or superadmin can delete
      const msg = await db.select().from(chatMessages).where(eq(chatMessages.id, input.id));
      if (msg.length === 0) throw new Error("Message not found");
      if (msg[0].sentBy !== ctx.user.id && ctx.user.role !== "superadmin") {
        throw new Error("Cannot delete others' messages");
      }
      await db.delete(chatMessages).where(eq(chatMessages.id, input.id));
      return { success: true };
    }),
});
