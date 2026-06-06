import { trpc } from "@/providers/trpc";
import { Clock, User, ArrowRight } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  login: "var(--accent)",
  logout: "var(--text-muted)",
  create: "var(--blue)",
  update: "var(--orange)",
  delete: "var(--red)",
  upload: "var(--cyan)",
};

export default function AuditWidget() {
  const { data: logs } = trpc.audit.list.useQuery(
    { limit: 5, offset: 0 },
    { staleTime: 30000 }
  );

  return (
    <div className="hub-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Recent Activity
        </h3>
        <Clock size={13} style={{ color: "var(--text-muted)" }} />
      </div>

      {(!logs || logs.length === 0) ? (
        <div
          className="text-center py-6 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          No recent activity
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => (
            <div
              key={log.id}
              className="flex items-center gap-2.5 p-2 rounded-lg"
              style={{ background: "var(--bg-base)" }}
            >
              <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: ACTION_COLORS[log.action] || "var(--text-muted)",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-[10px] font-medium truncate"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {log.username || "System"}
                  </span>
                  <span
                    className="text-[9px] px-1 py-0.5 rounded"
                    style={{
                      background:
                        (ACTION_COLORS[log.action] || "var(--text-muted)") + "18",
                      color: ACTION_COLORS[log.action] || "var(--text-muted)",
                    }}
                  >
                    {log.action}
                  </span>
                </div>
                <div
                  className="text-[10px] truncate"
                  style={{ color: "var(--text-muted)" }}
                >
                  {log.resource}
                  {log.recordId ? ` #${log.recordId}` : ""}
                </div>
              </div>
              <div
                className="text-[9px] flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
              >
                {new Date(log.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
