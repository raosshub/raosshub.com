import { authRouter } from "./auth-router";
import { projectRouter } from "./project-router";
import { teamRouter } from "./team-router";
import { localeRouter } from "./locale-router";
import { fileRouter } from "./file-router";
import { auditRouter } from "./audit-router";
import { configRouter } from "./config-router";
import { kimiRouter } from "./kimi-router";
import { versionRouter } from "./version-router";
import { publicRouter } from "./public-router";
import { contentPendingRouter } from "./content-pending-router";
import { chatRouter } from "./chat-router";
import { wechatRouter } from "./wechat-router";
import { aiRouter } from "./ai-router";
import { emailRouter } from "./email-router";
import { overviewRouter } from "./overview-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  project: projectRouter,
  team: teamRouter,
  locale: localeRouter,
  file: fileRouter,
  audit: auditRouter,
  config: configRouter,
  kimi: kimiRouter,
  version: versionRouter,
  public: publicRouter,
  contentPending: contentPendingRouter,
  chat: chatRouter,
  wechat: wechatRouter,
  ai: aiRouter,
  email: emailRouter,
  overview: overviewRouter,
});

export type AppRouter = typeof appRouter;
