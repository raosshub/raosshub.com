import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { trpc } from "@/providers/trpc";
import { IconSvg } from "@/lib/icons";
import { useSessionMonitor } from "@/hooks/useSession";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FileCheck } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, isSuperAdmin, logout } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isLight, setIsLight] = useState(() => document.documentElement.classList.contains("light"));
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useSessionMonitor(() => { logout(); });

  const { data: languages } = trpc.locale.getLanguages.useQuery();
  const teamQuery = trpc.team.list.useQuery({ projectId: 1 });
  const { data: customIcons } = trpc.config.getIcons.useQuery();
  const teamList = Array.isArray(teamQuery.data) ? teamQuery.data : [];

  /* ─── Product Identity (public endpoint, any authed user) ─── */
  const { data: identity } = trpc.config.getProductIdentity.useQuery();
  const productName   = identity?.productName   || "RAOSS Hub";
  const productStatus = identity?.productStatus || "In Development";
  const companyName   = identity?.companyName   || "RAOSS HK";
  const currentVer    = identity?.currentVer    || "3.0";
  const logoPath      = identity?.logoPath      || "";
  const faviconPath   = identity?.faviconPath   || "";
  const tlUpdated     = identity?.tlUpdated     || "";

  // Update browser favicon when faviconPath changes
  useEffect(() => {
    if (faviconPath) {
      const link = document.getElementById("app-favicon") as HTMLLinkElement;
      if (link) link.href = faviconPath;
    }
  }, [faviconPath]);
  const icpEn         = identity?.icpEn         || "";
  const icpZh         = identity?.icpZh         || "";

  const toggleTheme = () => {
    const next = !isLight;
    setIsLight(next);
    localStorage.setItem("hub_theme", next ? "light" : "dark");
    if (next) document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  };

  const sidebarW = collapsed ? 60 : 260;
  const currentTeamId = location.pathname.startsWith("/team/") ? location.pathname.split("/")[2] : "";

  const navLink = (active: boolean, onClick: () => void, icon: string, label: string, color?: string, svg?: string) => (
    <button
      key={label + icon}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: collapsed ? "8px 0" : "8px 10px",
        borderRadius: 7, fontSize: 13, fontWeight: 500,
        cursor: "pointer", width: "100%",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? "var(--accent-dim, rgba(63,185,80,0.15))" : "transparent",
        color: active ? "var(--accent-text, #3fb950)" : "var(--text-secondary, #8b949e)",
        border: "none", transition: "all 0.15s",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--bg-hover, #262c33)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ color: color || (active ? "var(--accent-text, #3fb950)" : "inherit") }}>
        <IconSvg name={icon as any} size={16} svg={svg || undefined} />
      </span>
      {!collapsed && <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>}
    </button>
  );

  return (
    <div className="flex h-full w-full min-w-0 overflow-hidden" style={{ background: "var(--bg-base, #0d1117)" }}>
      {/* Sidebar */}
      <aside style={{ width: sidebarW, minWidth: sidebarW, background: "var(--bg-elevated, #161b22)", borderRight: "1px solid var(--border, #30363d)", display: "flex", flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden" }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px", height: 56, borderBottom: "1px solid var(--border, #30363d)", flexShrink: 0 }}>
          {logoPath ? (
            <img src={logoPath} alt="" style={{ width: 22, height: 22, borderRadius: 4, objectFit: "contain" }} />
          ) : (
            <IconSvg name="shield" size={22} />
          )}
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary, #e6edf3)", letterSpacing: -0.5, whiteSpace: "nowrap" }}>{productName}</span>}
          <button onClick={() => setCollapsed(!collapsed)} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--text-muted, #484f58)", cursor: "pointer", padding: 2 }}>
            <IconSvg name={collapsed ? "plus" : "close"} size={14} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "8px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {navLink(location.pathname === "/", () => navigate("/"), "overview", t("nav.overview", "Overview"))}

          {!collapsed && <div style={{ padding: "16px 8px 4px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted, #484f58)" }}>{t("nav.teams", "Teams")}</div>}
          {collapsed && <div style={{ height: 1, background: "var(--border, #30363d)", margin: "8px 4px" }} />}

          {teamList.map((team: any) => navLink(
            currentTeamId === team.teamId,
            () => navigate(`/team/${team.teamId}`),
            team.icon || "box",
            lang === "zh" && team.nameZh ? team.nameZh : team.nameEn,
            team.textColor,
            (customIcons as any)?.[team.icon] || undefined
          ))}

          {!collapsed && <div style={{ padding: "16px 8px 4px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted, #484f58)" }}>{t("nav.tools", "Tools")}</div>}
          {collapsed && <div style={{ height: 1, background: "var(--border, #30363d)", margin: "8px 4px" }} />}

          {navLink(location.pathname === "/settings", () => navigate("/settings"), "settings", t("nav.settings", "Settings"))}
          {isSuperAdmin && navLink(location.pathname === "/admin", () => navigate("/admin"), "shield", t("nav.admin", "Admin"))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "8px", borderTop: "1px solid var(--border, #30363d)", display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
          {navLink(false, toggleTheme, isLight ? "moon" : "sun", isLight ? t("theme.dark", "Dark Mode") : t("theme.light", "Light Mode"))}

          {navLink(false, () => {
            if (!languages || languages.length === 0) return;
            const codes = languages.filter((l: any) => l.isActive).map((l: any) => l.code);
            const idx = codes.indexOf(lang);
            const next = codes[(idx + 1) % codes.length] || "en";
            setLang(next);
          }, "globe", languages?.find((l: any) => l.code === lang)?.nativeName || lang.toUpperCase())}

          {navLink(false, () => setShowLogoutConfirm(true), "logout", t("nav.logout", "Logout"), "#f85149")}

          {!collapsed && (
            <div style={{ padding: "8px 8px 0", fontSize: 10, color: "var(--text-muted, #484f58)" }}>
              <div>Document Version V{currentVer}</div>
              {tlUpdated && (
                <div style={{ marginTop: 2 }}>Last Updated {new Date(tlUpdated).toLocaleDateString()}</div>
              )}
              <div style={{ marginTop: 2 }}>&copy; {new Date().getFullYear()} {companyName}</div>
              {(icpEn || icpZh) && (
                <div style={{ fontSize: 9, marginTop: 2 }}>{icpEn}{icpEn && icpZh && " / "}{icpZh}</div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Topbar */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 56, background: "var(--bg-elevated, #161b22)", borderBottom: "1px solid var(--border, #30363d)", flexShrink: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary, #e6edf3)" }}>{productName} Dashboard</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: "var(--accent-dim, rgba(63,185,80,0.15))", color: "var(--accent-text, #3fb950)" }}>{productStatus}</span>

            {/* NDA Badge */}
            {!user?.ndaAccepted && (
              <span
                title="NDA pending"
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 600,
                  background: "var(--orange-dim, rgba(210,153,34,0.15))",
                  color: "var(--orange, #d29922)",
                  cursor: "pointer",
                }}
                onClick={() => navigate("/settings")}
              >
                <FileCheck size={10} /> NDA
              </span>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {user?.avatar ? (
                <img src={user.avatar} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, background: "var(--accent-dim, rgba(63,185,80,0.15))", color: "var(--accent-text, #3fb950)" }}>
                  {(user?.screenName || user?.firstName || user?.name || user?.username || "A")[0].toUpperCase()}
                </div>
              )}
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary, #e6edf3)" }}>{user?.screenName || user?.firstName || user?.name || user?.username}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="min-w-0" style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--bg-base, #0d1117)", width: "100%" }}>
          {children}
        </div>
      </main>

      {/* Logout Confirmation */}
      <ConfirmDialog
        open={showLogoutConfirm}
        title="Confirm Logout"
        message={`Are you sure you want to log out of ${productName}?`}
        confirmLabel="Log Out"
        cancelLabel="Stay"
        variant="danger"
        onConfirm={() => { setShowLogoutConfirm(false); logout(); }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
    </div>
  );
}
