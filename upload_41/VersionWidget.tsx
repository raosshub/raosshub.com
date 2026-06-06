import { trpc } from "@/providers/trpc";
import { useI18n } from "@/hooks/useI18n";
import { showToast } from "@/stores/toastStore";
import { GitBranch, Check, Clock, AlertCircle, ThumbsUp } from "lucide-react";

const STATUS_CONFIG: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: "var(--orange)", label: "Pending" },
  approved: { icon: Check, color: "var(--accent)", label: "Approved" },
  rejected: { icon: AlertCircle, color: "var(--red)", label: "Rejected" },
};

export default function VersionWidget() {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const { data: versions, isLoading } = trpc.version.list.useQuery(
    { projectId: 1 },
    { staleTime: 60000 }
  );

  const approveMutation = trpc.version.approve.useMutation({
    onSuccess: () => {
      utils.version.list.invalidate();
      showToast("Version approved", "success");
    },
    onError: () => showToast("Approval failed", "error"),
  });

  return (
    <div className="hub-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <GitBranch size={15} /> {t("version.title", "Version History")}
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--blue-dim, rgba(88,166,255,0.15))", color: "var(--blue)" }}>
          QR114i v1.0
        </span>
      </div>

      {isLoading && (
        <div className="text-center py-6 text-xs" style={{ color: "var(--text-muted)" }}>Loading...</div>
      )}

      {!isLoading && (!versions || versions.length === 0) && (
        <div className="text-center py-8">
          <GitBranch size={28} className="mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("version.empty", "No version history yet")}
          </div>
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            {t("version.hint", "Create versions from the Admin panel")}
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-[320px] overflow-y-auto">
        {versions?.slice(0, 10).map((v: any) => {
          const status = STATUS_CONFIG[v.status] || STATUS_CONFIG.pending;
          const StatusIcon = status.icon;
          return (
            <div
              key={v.id}
              className="flex items-start gap-3 p-3 rounded-lg"
              style={{ background: "var(--bg-base)" }}
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: status.color + "18" }}
              >
                <StatusIcon size={13} style={{ color: status.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                    v{v.version}
                  </span>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase"
                    style={{ background: status.color + "18", color: status.color }}
                  >
                    {status.label}
                  </span>
                </div>
                <div className="text-[11px] mt-1" style={{ color: "var(--text-primary)" }}>
                  {v.description}
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                    {v.changeType}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    by {v.authorName || "System"}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {new Date(v.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {v.affectedTeams && v.affectedTeams.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {v.affectedTeams.map((team: string, i: number) => (
                      <span
                        key={i}
                        className="text-[9px] px-1.5 py-0.5 rounded"
                        style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                )}
                {v.status === "pending" && (
                  <button
                    onClick={() => approveMutation.mutate({ versionId: v.id })}
                    disabled={approveMutation.isPending}
                    className="mt-2 text-[10px] px-2.5 py-1 rounded flex items-center gap-1 disabled:opacity-50"
                    style={{
                      background: "var(--accent-dim)",
                      color: "var(--accent-text)",
                      border: "1px solid var(--accent-dim)",
                      cursor: "pointer",
                    }}
                  >
                    <ThumbsUp size={10} /> Approve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
