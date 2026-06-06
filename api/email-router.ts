import { z } from "zod";
import { createRouter, superadminQuery } from "./middleware";

export const emailRouter = createRouter({
  sendWelcome: superadminQuery
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input }) => {
      // Placeholder — actual email sending would go here
      return { success: true, message: `Welcome email queued for user ${input.userId}` };
    }),
});
