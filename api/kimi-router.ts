import { z } from "zod";
import { createRouter, publicQuery, authedQuery, superadminQuery } from "./middleware";
import { db } from "@db/connection";
import { locales } from "@db/schema";
import { eq, and } from "drizzle-orm";

const KIMI_API_URL = "https://api.moonshot.cn/v1/chat/completions";
const KIMI_API_KEY = process.env.KIMI_API_KEY;

export const kimiRouter = createRouter({
  chat: authedQuery
    .input(z.object({
      model: z.string().default("moonshot-v1-8k"),
      messages: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })),
      temperature: z.number().min(0).max(2).default(0.7),
    }))
    .mutation(async ({ input }) => {
      if (!KIMI_API_KEY) return { content: "Kimi API key not configured. Set KIMI_API_KEY in .env" };
      try {
        const res = await fetch(KIMI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${KIMI_API_KEY}`,
          },
          body: JSON.stringify({
            model: input.model,
            messages: input.messages,
            temperature: input.temperature,
          }),
        });
        const data = await res.json() as any;
        if (data.error) return { content: `Error: ${data.error.message}` };
        return { content: data.choices?.[0]?.message?.content || "No response" };
      } catch (e: any) {
        return { content: `Error: ${e.message}` };
      }
    }),

  translate: authedQuery
    .input(z.object({
      text: z.string(),
      targetLang: z.string(),
      sourceLang: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!KIMI_API_KEY) return { content: "Kimi API key not configured" };
      try {
        const res = await fetch(KIMI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${KIMI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "moonshot-v1-8k",
            messages: [
              { role: "system", content: `You are a professional translator. Translate the following text to ${input.targetLang}. Preserve all formatting, JSON structure, and technical terms. Return ONLY the translated text, no explanations.` },
              { role: "user", content: input.text },
            ],
          }),
        });
        const data = await res.json() as any;
        return { content: data.choices?.[0]?.message?.content || "" };
      } catch (e: any) {
        return { content: `Error: ${e.message}` };
      }
    }),

  health: publicQuery.query(async () => {
    return { status: KIMI_API_KEY ? "ok" : "not_configured", model: "moonshot" };
  }),

  // ─── HUB Assist: Generate content ───
  assist: superadminQuery
    .input(z.object({
      teamId: z.string().optional(),
      section: z.string(), // scope, deliverables, actions, timeline, risks
      subsection: z.string().optional(),
      prompt: z.string(),
      currentContent: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (!KIMI_API_KEY) return { content: "Kimi API key not configured" };
      try {
        const sectionContext = {
          scope: "Product scope of work. Generate structured JSON with scope items. Each item has title, description, status.",
          deliverables: "Team deliverables. Generate structured JSON with phases, each phase has items with title, status, dueDate.",
          actions: "Action items. Generate structured JSON with actions, each has task, priority (high/medium/low), owner, due, tag.",
          timeline: "Project timeline. Generate structured JSON with quarters (Q1-Q4), each has milestones with title, date, status.",
          risks: "Risk register. Generate structured JSON with risks, each has title, impact (high/medium/low), mitigation, status.",
        }[input.section] || "Generate structured JSON content.";

        const systemPrompt = `You are a project management AI assistant. ${sectionContext}
Respond ONLY with valid JSON. Do not include markdown code blocks, explanations, or any text outside the JSON.
If the user provides current content, improve/extend it based on their prompt.
Team context: ${input.teamId || "general"}`;

        const userContent = input.currentContent
          ? `Current content: ${input.currentContent}\n\nUser request: ${input.prompt}`
          : input.prompt;

        const res = await fetch(KIMI_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KIMI_API_KEY}` },
          body: JSON.stringify({
            model: "moonshot-v1-8k",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            temperature: 0.5,
          }),
        });
        const data = await res.json() as any;
        return { content: data.choices?.[0]?.message?.content || "No response" };
      } catch (e: any) {
        return { content: `Error: ${e.message}` };
      }
    }),

  // ─── HUB Assist: Apply content to locales ───
  applyAssist: superadminQuery
    .input(z.object({
      teamId: z.string().optional(),
      section: z.string(),
      subsection: z.string().optional(),
      content: z.string(),
      lang: z.string(),
      autoTranslate: z.boolean().default(false),
    }))
    .mutation(async ({ input }) => {
      const sectionKey = input.teamId
        ? `team_${input.teamId}_${input.section}${input.subsection ? `_${input.subsection}` : ""}`
        : `dashboard_${input.section}${input.subsection ? `_${input.subsection}` : ""}`;

      // Save to locales
      const existing = await db.select().from(locales)
        .where(and(eq(locales.sectionKey, sectionKey), eq(locales.lang, input.lang)));
      if (existing.length) {
        await db.update(locales).set({ content: input.content }).where(eq(locales.id, existing[0].id));
      } else {
        await db.insert(locales).values({ sectionKey, lang: input.lang, content: input.content });
      }

      // Auto-translate if enabled
      if (input.autoTranslate && KIMI_API_KEY) {
        const otherLang = input.lang === "en" ? "zh" : "en";
        try {
          const res = await fetch(KIMI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${KIMI_API_KEY}` },
            body: JSON.stringify({
              model: "moonshot-v1-8k",
              messages: [
                { role: "system", content: `Translate the following text to ${otherLang === "zh" ? "Chinese" : "English"}. Preserve all JSON structure. Return ONLY the translated text.` },
                { role: "user", content: input.content },
              ],
            }),
          });
          const data = await res.json() as any;
          const translated = data.choices?.[0]?.message?.content || "";
          const existingTr = await db.select().from(locales)
            .where(and(eq(locales.sectionKey, sectionKey), eq(locales.lang, otherLang)));
          if (existingTr.length) {
            await db.update(locales).set({ content: translated }).where(eq(locales.id, existingTr[0].id));
          } else {
            await db.insert(locales).values({ sectionKey, lang: otherLang, content: translated });
          }
        } catch { /* ignore translation errors */ }
      }

      return { success: true };
    }),
});

