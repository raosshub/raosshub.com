import { useState } from "react";
import { useParams } from "react-router";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import TeamOverviewTab from "@/components/TeamOverviewTab";
import TeamDeliverablesTab from "@/components/TeamDeliverablesTab";
import ChatPanel from "@/components/ChatPanel";
import FileManager from "@/components/FileManager";
import PdfViewer from "@/components/PdfViewer";
import GalleryManager from "@/components/GalleryManager";
import {
  FileText, MessageSquare, Image, FileCode, Package, Check, ChevronRight
} from "lucide-react";
import { IconSvg } from "@/lib/icons";

const TAB_ICONS: Record<string, any> = {
  overview: Package,
  deliverables: Check,
  collaboration: MessageSquare,
  files: FileText,
  pdf: FileCode,
  gallery: Image,
};

const TAB_LABELS: Record<string, string> = {
  overview: "Overview",
  deliverables: "Deliverables",
  collaboration: "HUB Chat",
  files: "Files",
  pdf: "PDF Review",
  gallery: "Gallery",
};

export default function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { lang, t } = useI18n();
  const { isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: team } = trpc.team.get.useQuery({ teamId: teamId! }, { enabled: !!teamId });
  const { data: locales } = trpc.locale.getLocales.useQuery(
    { projectId: 1, lang },
    { staleTime: 60000 }
  );

  const teamData = locales?.[`sections.team_${teamId}`] || {};
  const tabs = (team?.tabs as string[]) || ["overview", "deliverables", "collaboration", "files", "pdf", "gallery"];

  const teamName = lang === "zh" && team?.nameZh ? team.nameZh : team?.nameEn || teamId;

  return (
    <div className="w-full space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{t("nav.overview", "Overview")}</span>
        <ChevronRight size={12} />
        <span style={{ color: "var(--accent)" }}>{teamName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: (team?.color || "#1e3a5f") + "30" }}
        >
          <IconSvg name={team?.icon || "box"} size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{teamName}</h1>
          {team?.description && <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{team.description}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {tabs.map((tab) => {
          const TabIc = TAB_ICONS[tab] || Package;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap"
              style={{
                borderColor: activeTab === tab ? "var(--accent)" : "transparent",
                color: activeTab === tab ? "var(--accent)" : "var(--text-secondary)",
                background: activeTab === tab ? "var(--accent-dim)" : "transparent",
              }}
            >
              <TabIc size={13} />
              {TAB_LABELS[tab] || tab}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="hub-card min-h-[400px]">
        {activeTab === "overview" && <TeamOverviewTab teamId={teamId!} teamData={teamData} />}
        {activeTab === "deliverables" && <TeamDeliverablesTab teamData={teamData} isSuperAdmin={isSuperAdmin} />}
        {activeTab === "collaboration" && <ChatPanel teamId={teamId!} />}
        {activeTab === "files" && <FileManager teamId={teamId!} />}
        {activeTab === "pdf" && <PdfViewer teamId={teamId!} />}
        {activeTab === "gallery" && <GalleryManager teamId={teamId!} />}
      </div>
    </div>
  );
}
