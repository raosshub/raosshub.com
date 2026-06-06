import { createRouter, publicQuery } from "./middleware";

export const wechatRouter = createRouter({
  config: publicQuery.query(() => ({ enabled: false, appId: "" })),
});
