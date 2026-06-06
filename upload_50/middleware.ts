import { initTRPC, TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create();

export const createRouter = t.router;
export const publicQuery = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

function requireRole(roles: string[]) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || !roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: ctx.user ? "FORBIDDEN" : "UNAUTHORIZED",
        message: ctx.user ? `Role "${ctx.user.role}" not in [${roles.join(", ")}]` : "Authentication required",
      });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const teamLeadQuery = authedQuery.use(requireRole(["team_lead", "superadmin"]));
export const superadminQuery = authedQuery.use(requireRole(["superadmin"]));
