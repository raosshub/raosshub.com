import { createRouter, publicQuery } from "./middleware";

export const publicRouter = createRouter({
  status: publicQuery.query(() => ({ status: "ok", version: "3.0.0" })),
});
