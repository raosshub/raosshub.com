import { trpc } from "@/providers/trpc";
import { useCallback, useMemo } from "react";

export function useAuth() {
  const utils = trpc.useUtils();

  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      utils.invalidate();
      window.location.reload();
    },
  });

  const logout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  return useMemo(() => ({
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading: isLoading || logoutMutation.isPending,
    isSuperAdmin: user?.role === "superadmin",
    isTeamLead: user?.role === "team_lead" || user?.role === "superadmin",
    canUseAi: user?.canUseAi || user?.role === "superadmin",
    logout,
  }), [user, isLoading, logoutMutation.isPending, logout]);
}
