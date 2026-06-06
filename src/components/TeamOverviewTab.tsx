import { useI18n } from "@/hooks/useI18n";
import { trpc } from "@/providers/trpc";
import RichTextView from "./RichTextView";
import { Package, Zap } from "lucide-react";

interface TeamOverviewTabProps {
  teamId: string;
  teamData?: Record<string, any>;
}

export default function TeamOverviewTab({ teamId, teamData }: TeamOverviewTabProps) {
  const { lang, t } = useI18n();

  // Fetch scope and actions from locales
  const { data: scopeData } = trpc.locale.getByKey.useQuery(
    { sectionKey: `team_${teamId}_scope`, lang },
    { staleTime: 60000 }
  );
  const { data: actionsData } = trpc.locale.getByKey.useQuery(
    { sectionKey: `team_${teamId}_actions`, lang },
    { staleTime: 60000 }
  );

  // The locale data might come back as a string or parsed JSON
  const scopeContent = extractContent(scopeData);
  const actionsContent = extractContent(actionsData);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Left: Scope of Work */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--bg-elevated, #161b22)",
          border: "1px solid var(--border, #30363d)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent-dim, rgba(63,185,80,0.15))" }}
          >
            <Package size={14} style={{ color: "var(--accent, #58a6ff)" }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("team.scope_title", "Scope of Work")}
          </h3>
        </div>
        <RichTextView content={scopeContent} />
      </div>

      {/* Right: Action Items */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--bg-elevated, #161b22)",
          border: "1px solid var(--border, #30363d)",
        }}
      >
        <div className="flex items-center gap-2 mb-3 pb-2" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "var(--orange-dim, rgba(210,153,34,0.15))" }}
          >
            <Zap size={14} style={{ color: "var(--orange, #d29922)" }} />
          </div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("team.actions_title", "Action Items")}
          </h3>
        </div>
        <RichTextView content={actionsContent} />
      </div>
    </div>
  );
}

/**
 * Extract string content from locale data.
 * The locale API might return the raw string content or a parsed object.
 */
function extractContent(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    // If it's an object with a content property
    if ("content" in data && typeof (data as any).content === "string") {
      return (data as any).content;
    }
    // Try to get the first string value
    const values = Object.values(data);
    for (const v of values) {
      if (typeof v === "string") return v;
    }
  }
  return String(data);
}
