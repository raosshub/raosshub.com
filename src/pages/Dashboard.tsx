import { useNavigate } from "react-router";
import { useI18n } from "@/hooks/useI18n";
import { trpc } from "@/providers/trpc";
import TechSpecsWidget from "@/components/TechSpecsWidget";
import Model3D from "@/components/Model3D";
import AuditWidget from "@/components/AuditWidget";
import VersionWidget from "@/components/VersionWidget";
import {
  AlertTriangle, Check
} from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  high: "var(--red)", medium: "var(--orange)", low: "var(--accent)",
};

export default function Dashboard() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const { data: teams } = trpc.team.list.useQuery({ projectId: 1 });
  const { data: locales } = trpc.locale.getLocales.useQuery({ projectId: 1, lang }, { staleTime: 60000 });
  const { data: project } = trpc.project.getDefault.useQuery();
  const { data: identity } = trpc.config.getProductIdentity.useQuery();

  // ─── Executive Summary from new overview API ───
  const { data: execData } = trpc.overview.getSection.useQuery(
    { section: "executive_summary", lang },
    { staleTime: 60000 }
  );
  const execSummary = execData && typeof execData === "object"
    ? (execData as { title?: string; intro?: string; specs?: string[]; features?: string[] })
    : null;
  const execTitle = execSummary?.title || "Executive Summary";
  const execIntro = execSummary?.intro || "";
  const execSpecs = Array.isArray(execSummary?.specs) ? execSummary.specs : [];
  const execFeatures = Array.isArray(execSummary?.features) ? execSummary.features : [];

  // ─── Timeline from new overview API ───
  const { data: tlData } = trpc.overview.getSection.useQuery(
    { section: "timeline", lang },
    { staleTime: 60000 }
  );
  const tlPhases = (tlData && typeof tlData === "object" && Array.isArray((tlData as any).phases))
    ? (tlData as any).phases : [];

  const overview = locales?.["sections.overview"] || {};
  const config = locales?.["config"] || {};
  const productModelPath = identity?.modelPath || config?.threeDPath || "";
  const actions = overview?.actions || { items: [] };
  const risks = overview?.risks || { rows: [] };
  const interfaces_data = overview?.interfaces || { rows: [] };
  // ─── Responsibility Matrix from DB ───
  const { data: matrixData } = trpc.overview.listMatrix.useQuery();
  const matrixRows = matrixData || [];

  const pendingCount = tlPhases.reduce((sum: number, p: any) => sum + (p.items?.length || 0), 0);
  const teamCount = teams?.length || 0;
  const actionCount = actions.items?.length || 0;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {t("nav.overview", "Overview")}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          {project?.name || "Project Dashboard"}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="hub-card">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{t("ov_kpi_actions", "Open Actions")}</div>
          <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>{actionCount}</div>
        </div>
        <div className="hub-card">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{t("ov_kpi_milestones", "Milestones")}</div>
          <div className="text-2xl font-bold" style={{ color: "var(--blue)" }}>{pendingCount}</div>
        </div>
        <div className="hub-card">
          <div className="text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>{t("ov_kpi_teams", "Teams")}</div>
          <div className="text-2xl font-bold" style={{ color: "var(--purple)" }}>{teamCount}</div>
        </div>
      </div>

      {/* Executive Summary + 3D Viewer — matching v2 layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Executive Summary Card */}
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{execTitle}</h3>
          <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {execIntro || "No executive summary configured yet."}
          </p>
          {/* Spec Badges */}
          {execSpecs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {execSpecs.map((spec, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2 py-1 rounded-full"
                  style={{ background: "var(--accent-dim)", color: "var(--accent-text)", border: "1px solid var(--accent)" }}
                >
                  {spec}
                </span>
              ))}
            </div>
          )}
          {/* Feature Highlights */}
          {execFeatures.length > 0 && (
            <div className="space-y-1">
              {execFeatures.map((feat, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <Check size={14} style={{ color: "var(--accent)" }} />
                  <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{feat}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3D Product Viewer */}
        <Model3D modelPath={productModelPath} />
      </div>

      {/* 3-Column Widgets: TechSpecs | Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TechSpecsWidget
          chip={config?.chip}
          display={config?.display}
          battery={config?.battery}
          router={config?.router}
        />
        <AuditWidget />
      </div>

      {/* Timeline Kanban + Actions + Version */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline — Kanban Board matching v2 */}
        <div className="hub-card" style={{ gridColumn: tlPhases.length > 0 ? "1 / -1" : undefined }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            {t("timeline.title", "Timeline & Milestones")}
          </h3>
          {tlPhases.length === 0 ? (
            <div className="text-center py-8 text-[13px]" style={{ color: "var(--text-muted)" }}>
              {t("timeline.empty", "No milestones configured")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-3 min-w-max">
                {tlPhases.map((phase: any, qi: number) => {
                  const items = phase.items || [];
                  const hasCurrent = items.some((it: any) => it.status === "current");
                  const hasDelayed = items.some((it: any) => it.status === "delayed");
                  const headerColor = hasCurrent ? "var(--accent)" : hasDelayed ? "var(--red)" : "#4b8cf7";
                  const statusColors: Record<string, string> = { current: "var(--accent)", planned: "#4b8cf7", done: "#6b7280", delayed: "var(--red)", "on-hold": "#9ca3af" };
                  const statusLabels: Record<string, string> = {
                    planned: t("status.planned", "Planned"),
                    current: t("status.current", "Current"),
                    done: t("status.done", "Done"),
                    delayed: t("status.delayed", "Delayed"),
                    "on-hold": t("status.on_hold", "On Hold"),
                  };

                  return (
                    <div
                      key={qi}
                      className="rounded-lg flex-1 min-w-[220px] max-w-[320px]"
                      style={{ borderTop: `3px solid ${headerColor}`, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderTopWidth: 3 }}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <span className="text-xs font-bold" style={{ color: headerColor }}>{phase.quarter || ""}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--bg-base)", color: "var(--text-muted)" }}>
                          {items.length}
                        </span>
                      </div>
                      {/* Items */}
                      <div className="p-2.5 space-y-2">
                        {items.length === 0 && (
                          <div className="text-center py-4 text-[11px]" style={{ color: "var(--text-muted)" }}>{t("kanban.no_milestones", "No items")}</div>
                        )}
                        {items.map((item: any, ii: number) => {
                          const sc = statusColors[item.status || "planned"] || "var(--text-muted)";
                          const sl = statusLabels[item.status || "planned"] || item.status;
                          return (
                            <div key={ii} className="p-2.5 rounded-lg" style={{ background: "var(--bg-base)", border: "1px solid var(--border-subtle)" }}>
                              <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.title || ""}</div>
                              {item.desc && <div className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>{item.desc}</div>}
                              <div className="mt-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ border: `1px solid ${sc}`, color: sc }}>{sl}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Open Actions */}
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            {actions.title || t("actions.title", "Open Action Items")}
          </h3>
          <div className="space-y-2">
            {actions.items?.slice(0, 6).map((item: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg" style={{ background: "var(--bg-base)" }}>
                <div
                  className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                  style={{ background: PRIORITY_COLORS[item.priority] || "var(--text-muted)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{item.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{item.owner}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}>{item.due}</span>
                  </div>
                </div>
              </div>
            ))}
            {(!actions.items || actions.items.length === 0) && (
              <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>
                {t("actions.empty", "No open actions")}
              </div>
            )}
          </div>
        </div>

        {/* Version History */}
        <VersionWidget />
      </div>

      {/* Communication Interfaces */}
      {interfaces_data.rows && interfaces_data.rows.length > 0 && (
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            {interfaces_data.title || t("interfaces.title", "Communication Interfaces")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {interfaces_data.headers?.map((h: string, i: number) => (
                    <th key={i} className="text-left px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {interfaces_data.rows?.map((row: string[], i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2" style={{ color: j === 0 ? "var(--accent)" : "var(--text-primary)" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Risks */}
      {risks.rows && risks.rows.length > 0 && (
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            {risks.title || t("risks.title", "Risks & Mitigation")}
          </h3>
          <div className="space-y-3">
            {risks.rows?.map((row: string[], i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: "var(--orange)" }} />
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{row[0]}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{row[1]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team Responsibility Matrix */}
      {matrixRows.length > 0 && (
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            {t("responsibility.title", "Team Responsibility")}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{t("matrix.team", "Team")}</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{t("matrix.name", "Name")}</th>
                  <th className="text-left px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{t("matrix.responsibility", "Responsibility")}</th>
                </tr>
              </thead>
              <tbody>
                {matrixRows.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td className="px-3 py-2 font-medium" style={{ color: "var(--accent-text)" }}>{row.teamName}</td>
                    <td className="px-3 py-2" style={{ color: "var(--text-primary)" }}>{row.userName}</td>
                    <td className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{row.responsibility}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
