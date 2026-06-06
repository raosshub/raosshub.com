import { z } from "zod";
import { createRouter, publicQuery, superadminQuery } from "./middleware";
import { db } from "./queries/connection";
import { systemConfig, locales } from "./db/schema";
import { eq } from "drizzle-orm";

export const configRouter = createRouter({
  // Get all system config as key-value
  getSystemConfig: publicQuery.query(async () => {
    const rows = await db.select().from(systemConfig);
    const result: Record<string, string> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }),

  // Set a config value
  setSystemConfig: superadminQuery
    .input(z.object({ key: z.string(), value: z.string(), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, input.key)).limit(1);
      if (existing.length > 0) {
        await db.update(systemConfig).set({ value: input.value, description: input.description }).where(eq(systemConfig.id, existing[0].id));
      } else {
        await db.insert(systemConfig).values({ key: input.key, value: input.value, description: input.description || "" });
      }
      return { success: true };
    }),

  // Delete an asset (logo/model/favicon)
  deleteAsset: superadminQuery
    .input(z.object({ key: z.string() }))
    .mutation(async ({ input }) => {
      await db.delete(systemConfig).where(eq(systemConfig.key, input.key));
      return { success: true };
    }),

  // Get product identity
  getProductIdentity: publicQuery.query(async () => {
    const rows = await db.select().from(systemConfig);
    const config: Record<string, string> = {};
    for (const row of rows) config[row.key] = row.value;
    return {
      logoPath: config["product_logo_path"] || "",
      faviconPath: config["favicon_path"] || "",
      modelPath: config["product_model_path"] || "",
      welcomeEmail: config["welcome_email"] || "",
      footerText: config["footer_text"] || "",
    };
  }),

  // Get custom icons from locales (stored as SVG)
  getIcons: publicQuery.query(async () => {
    // Returns empty for now — icons can be added later
    return {};
  }),
});
