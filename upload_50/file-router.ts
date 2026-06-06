import { z } from "zod";
import { createRouter, authedQuery, superadminQuery } from "./middleware";
import { db } from "@db/connection";
import { teamFiles, galleryImages, pdfDocuments } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const fileRouter = createRouter({
  listTeamFiles: authedQuery
    .input(z.object({ teamId: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(teamFiles).where(eq(teamFiles.teamId, input.teamId)).orderBy(desc(teamFiles.createdAt));
    }),

  createTeamFile: authedQuery
    .input(z.object({ teamId: z.string(), fileName: z.string(), filePath: z.string(), fileSize: z.number().optional(), mimeType: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const rows = await db.insert(teamFiles).values({ ...input, uploadedBy: ctx.user.id }).returning();
      return rows[0];
    }),

  deleteTeamFile: superadminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(teamFiles).where(eq(teamFiles.id, input.id));
      return { success: true };
    }),

  listGallery: authedQuery
    .input(z.object({ teamId: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(galleryImages).where(eq(galleryImages.teamId, input.teamId)).orderBy(desc(galleryImages.createdAt));
    }),

  createGalleryImage: authedQuery
    .input(z.object({ teamId: z.string(), fileName: z.string(), filePath: z.string(), fileSize: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const rows = await db.insert(galleryImages).values({ ...input, uploadedBy: ctx.user.id }).returning();
      return rows[0];
    }),

  deleteGalleryImage: superadminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(galleryImages).where(eq(galleryImages.id, input.id));
      return { success: true };
    }),

  listPDFs: authedQuery
    .input(z.object({ teamId: z.string() }))
    .query(async ({ input }) => {
      return db.select().from(pdfDocuments).where(eq(pdfDocuments.teamId, input.teamId)).orderBy(desc(pdfDocuments.createdAt));
    }),

  createPDF: authedQuery
    .input(z.object({ teamId: z.string(), title: z.string(), version: z.number().optional(), filePath: z.string().optional(), fileName: z.string().optional(), fileSize: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const rows = await db.insert(pdfDocuments).values({ ...input, uploadedBy: ctx.user.id }).returning();
      return rows[0];
    }),

  deletePDF: superadminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(pdfDocuments).where(eq(pdfDocuments.id, input.id));
      return { success: true };
    }),
});
