import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { useI18n } from "@/hooks/useI18n";
import { showToast } from "@/stores/toastStore";
import RichTextEditor from "./RichTextEditor";
import {
  Save,
  Download,
  Globe,
  Sparkles,
  ChevronDown,
  FileText,
  Target,
  CheckSquare,
  Loader2,
} from "lucide-react";

type SectionType = "scope" | "actions" | "deliverables";

const SECTIONS: { id: SectionType; label: string; icon: typeof FileText }[] = [
  { id: "scope", label: "Scope of Work", icon: Target },
  { id: "actions", label: "Action Items", icon: FileText },
  { id: "deliverables", label: "Deliverables", icon: CheckSquare },
];

export default function HubAssistTab() {
  const { lang } = useI18n();
  const utils = trpc.useUtils();

  // State
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<SectionType>("scope");
  const [content, setContent] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [isApplying, setIsApplying] = useState(false);

  // Fetch teams
  const { data: teams } = trpc.team.list.useQuery({ projectId: 1 });

  // Fetch existing content when team/section changes
  const sectionKey = selectedTeamId
    ? `team_${selectedTeamId}_${selectedSection}`
    : "";

  const { data: existingData, isLoading: isLoadingContent } =
    trpc.locale.getByKey.useQuery(
      { sectionKey, lang },
      { enabled: !!sectionKey && !!selectedTeamId, staleTime: 1000 }
    );

  // Load content into editor when data arrives
  useEffect(() => {
    if (existingData) {
      const extracted = extractContent(existingData);
      setContent(extracted);
    } else {
      setContent("");
    }
  }, [existingData, selectedTeamId, selectedSection, lang]);

  // Apply mutation
  const applyMutation = trpc.kimi.applyAssist.useMutation({
    onSuccess: () => {
      utils.locale.getByKey.invalidate({ sectionKey, lang });
      showToast("Content saved successfully", "success");
    },
    onError: (err) => {
      showToast(err.message || "Failed to save", "error");
    },
  });

  const handleLoad = () => {
    if (!selectedTeamId) {
      showToast("Please select a team first", "error");
      return;
    }
    utils.locale.getByKey.invalidate({ sectionKey, lang });
    showToast("Content refreshed", "success");
  };

  const handleApply = async () => {
    if (!selectedTeamId) {
      showToast("Please select a team first", "error");
      return;
    }
    if (!content.trim()) {
      showToast("Content cannot be empty", "error");
      return;
    }
    setIsApplying(true);
    try {
      await applyMutation.mutateAsync({
        teamId: selectedTeamId,
        section: selectedSection,
        content,
        lang,
        autoTranslate,
      });
    } catch {
      // Error handled by onError
    } finally {
      setIsApplying(false);
    }
  };

  // Select first team on load
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(teams[0].teamId);
    }
  }, [teams, selectedTeamId]);

  return (
    <div className="space-y-4">
      {/* Controls Row */}
      <div
        className="hub-card space-y-4"
        style={{
          background: "var(--bg-elevated, #161b22)",
          border: "1px solid var(--border, #30363d)",
          borderRadius: "0.75rem",
          padding: "1rem",
        }}
      >
        {/* Team Dropdown + Section Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Team Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>
              Team
            </span>
            <div className="relative">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="hub-input text-xs pr-8 appearance-none cursor-pointer"
                style={{
                  color: "var(--text-primary)",
                  background: "var(--bg-base)",
                  minWidth: "160px",
                }}
              >
                <option value="">Select team…</option>
                {teams?.map((team: any) => (
                  <option key={team.teamId} value={team.teamId}>
                    {team.nameEn}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: "var(--text-muted)" }}
              />
            </div>
          </div>

          <div
            className="w-px h-5"
            style={{ background: "var(--border-subtle)" }}
          />

          {/* Section Buttons */}
          <div className="flex gap-1">
            {SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = selectedSection === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setSelectedSection(sec.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-md transition-all"
                  style={{
                    background: isActive
                      ? "var(--accent-dim, rgba(63,185,80,0.15))"
                      : "transparent",
                    color: isActive
                      ? "var(--accent-text, #3fb950)"
                      : "var(--text-secondary)",
                    border: isActive
                      ? "1px solid var(--accent, #30363d)"
                      : "1px solid transparent",
                  }}
                >
                  <Icon size={12} />
                  {sec.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <RichTextEditor
          value={content}
          onChange={setContent}
          placeholder={`Enter ${selectedSection} content...\nUse ## for headings, - for bullets, **bold** for emphasis`}
          rows={18}
          disabled={!selectedTeamId || isApplying}
        />

        {/* Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {/* Auto-translate */}
            <label
              className="flex items-center gap-2 text-[11px] cursor-pointer"
              style={{ color: "var(--text-secondary)" }}
            >
              <input
                type="checkbox"
                checked={autoTranslate}
                onChange={(e) => setAutoTranslate(e.target.checked)}
                className="rounded"
              />
              <Globe size={12} />
              Auto-translate to {lang === "en" ? "Chinese" : "English"}
            </label>
          </div>

          <div className="flex items-center gap-2">
            {/* Load Button */}
            <button
              onClick={handleLoad}
              disabled={!selectedTeamId || isLoadingContent}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-md transition-all disabled:opacity-40"
              style={{
                background: "var(--bg-base)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.background = "var(--bg-hover)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--bg-base)";
              }}
            >
              <Download size={12} />
              Load
            </button>

            {/* Apply Button */}
            <button
              onClick={handleApply}
              disabled={isApplying || !selectedTeamId || !content.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-[11px] font-medium rounded-md transition-all disabled:opacity-40"
              style={{
                background: "var(--accent, #238636)",
                color: "#fff",
              }}
              onMouseEnter={(e) => {
                if (!e.currentTarget.disabled) {
                  e.currentTarget.style.opacity = "0.9";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
            >
              {isApplying ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save size={12} />
                  Apply
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Section Info Card */}
      <div
        className="rounded-lg p-4"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        <h4
          className="text-[11px] font-semibold mb-2 flex items-center gap-1.5"
          style={{ color: "var(--accent)" }}
        >
          <Sparkles size={12} />
          HUB Assist Editor
        </h4>
        <ul
          className="text-[11px] space-y-1"
          style={{ color: "var(--text-muted)" }}
        >
          <li>
            • Select a team and section (Scope / Actions / Deliverables) to edit
          </li>
          <li>
            • Use the toolbar for <strong>Bold</strong>, Bullets, and Numbered lists
          </li>
          <li>• Type ## for section headings</li>
          <li>
            • Click <strong>Load</strong> to fetch existing content from the database
          </li>
          <li>
            • Click <strong>Apply</strong> to save — auto-translate will sync both
            languages
          </li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Extract string content from locale response.
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
  return "";
}
