import { useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import { trpc } from "@/providers/trpc";
import { CheckSquare, Square, ClipboardList } from "lucide-react";

interface TeamDeliverablesTabProps {
  teamId: string;
  teamData?: Record<string, any>;
  isSuperAdmin?: boolean;
}

export default function TeamDeliverablesTab({ teamId, isSuperAdmin }: TeamDeliverablesTabProps) {
  const { lang, t } = useI18n();
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const { data: deliverablesData } = trpc.locale.getByKey.useQuery(
    { sectionKey: `team_${teamId}_deliverables`, lang },
    { staleTime: 60000 }
  );

  const content = extractContent(deliverablesData);

  // Parse deliverables from content
  const items = parseDeliverables(content);

  const toggleItem = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const allChecked = items.length > 0 && items.every((_, i) => checkedItems.has(i));
  const progress = items.length > 0
    ? Math.round((Array.from(checkedItems).filter((i) => i < items.length).length / items.length) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {t("team.deliverables_title", "Deliverables")}
          </h3>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "var(--accent-dim)",
              color: "var(--accent-text)",
            }}
          >
            {items.length}
          </span>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              {progress}%
            </span>
            <div
              className="w-24 h-1.5 rounded-full overflow-hidden"
              style={{ background: "var(--bg-base)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: allChecked
                    ? "var(--accent, #3fb950)"
                    : "var(--accent, #58a6ff)",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Checklist */}
      {items.length === 0 ? (
        <div
          className="text-center py-12 text-sm rounded-lg"
          style={{
            color: "var(--text-muted)",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
          }}
        >
          {t("team.no_deliverables", "No deliverables configured yet.")}
        </div>
      ) : (
        <div
          className="rounded-lg overflow-hidden"
          style={{
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}
        >
          {items.map((item, index) => {
            const isChecked = checkedItems.has(index);
            return (
              <div
                key={index}
                onClick={() => toggleItem(index)}
                className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-all hover:opacity-90"
                style={{
                  borderBottom:
                    index < items.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                  background: isChecked
                    ? "var(--accent-dim, rgba(63,185,80,0.08))"
                    : "transparent",
                }}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {isChecked ? (
                    <CheckSquare
                      size={16}
                      style={{ color: "var(--accent, #3fb950)" }}
                    />
                  ) : (
                    <Square
                      size={16}
                      style={{ color: "var(--text-muted)" }}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className="text-xs leading-relaxed transition-all"
                    style={{
                      color: isChecked
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {item}
                  </span>
                </div>
                <div className="flex-shrink-0">
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium"
                    style={{
                      background: isChecked
                        ? "var(--accent-dim)"
                        : "var(--bg-base)",
                      color: isChecked
                        ? "var(--accent)"
                        : "var(--text-muted)",
                    }}
                  >
                    {isChecked
                      ? t("status.done", "Done")
                      : t("status.pending", "Pending")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Extract string content from locale data.
 */
function extractContent(data: unknown): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  if (typeof data === "object" && data !== null) {
    if ("content" in data && typeof (data as any).content === "string") {
      return (data as any).content;
    }
    const values = Object.values(data);
    for (const v of values) {
      if (typeof v === "string") return v;
    }
  }
  return String(data);
}

/**
 * Parse deliverables content into individual items.
 * Splits by newlines and strips leading "- " or "* " if present.
 */
function parseDeliverables(content: string): string[] {
  if (!content) return [];
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.replace(/^[-*]\s+/, ""));
}
