import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { trpc } from "@/providers/trpc";
import { showToast } from "@/stores/toastStore";
import { IconSvg } from "@/lib/icons";
import { COUNTRIES, getDialCode } from "@/lib/countries";
import {
  Users, Cpu, Globe, Shield, Clock, Sparkles, Settings as SettingsIcon, Mail, Server, Link, Layers,
  Plus, Trash2, Check, X, Edit2, Save, RotateCcw, Search,
  UserCheck, MapPin, Box,
} from "lucide-react";

const TABS = [
  { id: "users", label: "Users", icon: Users },
  { id: "teams", label: "Teams", icon: Cpu },
  { id: "languages", label: "Languages", icon: Globe },
  { id: "approvals", label: "Approvals", icon: Shield },
  { id: "audit", label: "Audit Log", icon: Clock },
  { id: "ai", label: "AI Assist", icon: Sparkles },
  { id: "overview", label: "Dashboard Overview", icon: Globe },
  { id: "hubassist", label: "HUB Assist", icon: Sparkles },
  { id: "identity", label: "Project Identity", icon: SettingsIcon },
  { id: "nda", label: "NDA", icon: Shield },
  { id: "system", label: "System", icon: SettingsIcon },
];

const ROLE_COLORS: Record<string, string> = {
  superadmin: "var(--red)",
  team_lead: "var(--orange)",
  user: "var(--accent)",
  viewer: "var(--text-muted)",
};

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  team_lead: "Team Lead",
  user: "User",
  viewer: "Viewer",
};

export default function Admin() {
  const { isSuperAdmin } = useAuth();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("users");

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t("admin.no_access", "Superadmin access required")}</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{t("nav.admin", "Admin Panel")}</h1>
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap" style={{ borderColor: activeTab === tab.id ? "var(--accent)" : "transparent", color: activeTab === tab.id ? "var(--accent)" : "var(--text-secondary)" }}>
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "users" && <UsersTab />}
      {activeTab === "teams" && <TeamsTab />}
      {activeTab === "languages" && <LanguagesTab />}
      {activeTab === "approvals" && <ApprovalsTab />}
      {activeTab === "audit" && <AuditTab />}
      {activeTab === "ai" && <AIAssistTab />}
      {activeTab === "overview" && <DashboardOverviewTab />}
      {activeTab === "hubassist" && <HubAssistTab />}
      {activeTab === "identity" && <ProductIdentityTab />}
      {activeTab === "nda" && <NDAManagerTab />}
      {activeTab === "system" && <SystemConfigTab />}
    </div>
  );
}

// ═══════════════════════════════════════════
// USERS TAB — Complete User Management
// ═══════════════════════════════════════════

function UsersTab() {
  const { data: userList, refetch } = trpc.auth.list.useQuery();
  const { data: teams } = trpc.team.list.useQuery({ projectId: 1 });
  const deleteUser = trpc.auth.delete.useMutation({ onSuccess: () => { refetch(); showToast("User deleted", "success"); } });
  const resetPassword = trpc.auth.adminResetPassword.useMutation({ onSuccess: () => showToast("Password reset", "success") });
  const sendWelcomeEmail = trpc.email.sendWelcome.useMutation({
    onSuccess: (data) => showToast(data.message, data.success ? "success" : "error"),
  });

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [resetPwId, setResetPwId] = useState<number | null>(null);
  const [resetPwValue, setResetPwValue] = useState("");

  // Create form state
  const [form, setForm] = useState({
    firstName: "", lastName: "", screenName: "",
    username: "", password: "", role: "user" as string,
    country: "", countryCode: "", mobile: "",
    company: "", division: "", position: "",
    canUseAi: false, canViewActivity: false,
    teamIds: [] as string[],
  });

  const filtered = (userList || []).filter((u: any) =>
    !search || [u.firstName, u.lastName, u.screenName, u.name, u.username, u.email, u.company]
      .some((f) => f?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCountryChange = (code: string) => {
    setForm({ ...form, country: code, countryCode: getDialCode(code) });
  };

  const toggleTeam = (teamId: string) => {
    setForm((prev) => ({
      ...prev,
      teamIds: prev.teamIds.includes(teamId)
        ? prev.teamIds.filter((t) => t !== teamId)
        : [...prev.teamIds, teamId],
    }));
  };

  const handleCreate = async () => {
    if (!form.username || !form.password) {
      showToast("Email and password are required", "error");
      return;
    }
    if (form.password.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    try {
      const res = await fetch("/api/rest/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          role: form.role,
          firstName: form.firstName,
          lastName: form.lastName,
          screenName: form.screenName,
          email: form.username,
          company: form.company,
          division: form.division,
          position: form.position,
          countryCode: form.countryCode,
          mobile: form.mobile,
          canUseAi: form.canUseAi,
          canViewActivity: form.canViewActivity,
          teamIds: form.teamIds,
        }),
      });
      if (res.ok) {
        setForm({
          firstName: "", lastName: "", screenName: "",
          username: "", password: "", role: "user",
          country: "", countryCode: "", mobile: "",
          company: "", division: "", position: "",
          canUseAi: false, canViewActivity: false, teamIds: [],
        });
        setShowCreate(false);
        refetch();
        showToast("User created successfully", "success");
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to create user", "error");
      }
    } catch { showToast("Network error", "error"); }
  };

  return (
    <div className="space-y-4">
      {/* Search + Add Button */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="hub-input text-xs pl-8 w-full" />
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="hub-btn text-xs flex items-center gap-1.5">
          {showCreate ? <X size={12} /> : <Plus size={12} />} {showCreate ? "Cancel" : "Add User"}
        </button>
      </div>

      {/* Create User Form */}
      {showCreate && (
        <div className="hub-card space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--accent)" }}>
            <UserCheck size={15} /> Add New User
          </h3>

          {/* Names */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>First Name *</label>
              <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" className="hub-input text-xs w-full" />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Last Name</label>
              <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" className="hub-input text-xs w-full" />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Screen Name *</label>
              <input value={form.screenName} onChange={(e) => setForm({ ...form, screenName: e.target.value })} placeholder="Display name" className="hub-input text-xs w-full" />
            </div>
          </div>

          {/* Login */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Email / Username *</label>
              <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="email@company.com" className="hub-input text-xs w-full" />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Password * (min 8 chars)</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" className="hub-input text-xs w-full" />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="hub-input text-xs w-full sm:w-1/3" style={{ color: "var(--text-primary)" }}>
              <option value="user">User</option>
              <option value="team_lead">Team Lead</option>
              <option value="superadmin">Super Admin</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>

          {/* Country + Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Country</label>
              <div className="relative">
                <MapPin size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
                <select value={form.country} onChange={(e) => handleCountryChange(e.target.value)} className="hub-input text-xs w-full pl-7" style={{ color: "var(--text-primary)" }}>
                  <option value="">Select country...</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Country Code</label>
              <input value={form.countryCode} readOnly placeholder="Auto-filled" className="hub-input text-xs w-full" style={{ color: "var(--text-muted)" }} />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Mobile Number</label>
              <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="Mobile" className="hub-input text-xs w-full" />
            </div>
          </div>

          {/* Company */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Company</label>
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company" className="hub-input text-xs w-full" />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Division</label>
              <input value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} placeholder="Division" className="hub-input text-xs w-full" />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Position</label>
              <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="Position" className="hub-input text-xs w-full" />
            </div>
          </div>

          {/* Team Access */}
          <div>
            <label className="text-[10px] font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Team Access</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {teams?.map((team) => (
                <label key={team.teamId} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs" style={{ background: form.teamIds.includes(team.teamId) ? "var(--accent-dim)" : "var(--bg-base)", border: `1px solid ${form.teamIds.includes(team.teamId) ? "var(--accent-dim)" : "var(--border-subtle)"}` }}>
                  <input type="checkbox" checked={form.teamIds.includes(team.teamId)} onChange={() => toggleTeam(team.teamId)} className="rounded" />
                  <span style={{ color: form.teamIds.includes(team.teamId) ? "var(--accent-text)" : "var(--text-primary)" }}>{team.nameEn}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={form.canViewActivity} onChange={(e) => setForm({ ...form, canViewActivity: e.target.checked })} className="rounded" />
              Can View Activity Log
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
              <input type="checkbox" checked={form.canUseAi} onChange={(e) => setForm({ ...form, canUseAi: e.target.checked })} className="rounded" />
              AI Hub Assist Access
            </label>
          </div>

          {/* Submit */}
          <button onClick={handleCreate} className="hub-btn text-sm px-6 py-2.5">
            <Plus size={14} className="inline mr-1.5" /> Create User
          </button>
        </div>
      )}

      {/* User List */}
      <div className="hub-card">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Users ({filtered.length})</h3>
        <div className="space-y-2">
          {filtered.map((u: any) => (
            <div key={u.id} className="p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
              {editing === u.id ? (
                <UserEditForm user={u} onSave={() => { utils.auth.list.invalidate(); setEditing(null); }} onCancel={() => setEditing(null)} />
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>
                      {(u.screenName || u.firstName || u.name || u.username)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                          {u.screenName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || u.username}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase" style={{ background: (ROLE_COLORS[u.role] || "var(--text-muted)") + "15", color: ROLE_COLORS[u.role] || "var(--text-muted)" }}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                        {u.ndaAccepted && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>NDA</span>}
                      </div>
                      <div className="text-[10px] mt-0.5 flex gap-3 flex-wrap" style={{ color: "var(--text-muted)" }}>
                        <span>{u.username}</span>
                        {u.company && <span>{u.company}</span>}
                        {u.position && <span>{u.position}</span>}
                        {u.countryCode && u.mobile && <span>{u.countryCode} {u.mobile}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { if (confirm("Generate new password and send welcome email?")) sendWelcomeEmail.mutate({ userId: u.id }); }} className="p-1.5 rounded hover:opacity-70" style={{ color: "var(--blue)" }} title="Send Welcome Email" disabled={sendWelcomeEmail.isPending}><Mail size={13} /></button>
                    <button onClick={() => setEditing(u.id)} className="p-1.5 rounded hover:opacity-70" style={{ color: "var(--text-secondary)" }} title="Edit"><Edit2 size={13} /></button>
                    <button onClick={() => { setResetPwId(u.id); setResetPwValue(""); }} className="p-1.5 rounded hover:opacity-70" style={{ color: "var(--orange)" }} title="Reset Password"><RotateCcw size={13} /></button>
                    <button onClick={() => { if (confirm("Delete this user?")) deleteUser.mutate({ id: u.id }); }} className="p-1.5 rounded hover:opacity-70" style={{ color: "var(--red)" }} title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
              )}
              {/* Reset Password Inline */}
              {resetPwId === u.id && (
                <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
                  <input type="password" value={resetPwValue} onChange={(e) => setResetPwValue(e.target.value)} placeholder="New password (min 8)" className="hub-input text-xs flex-1" />
                  <button onClick={() => { if (resetPwValue.length >= 8) { resetPassword.mutate({ userId: u.id, newPassword: resetPwValue }); setResetPwId(null); } }} className="hub-btn text-xs">Reset</button>
                  <button onClick={() => setResetPwId(null)} className="px-3 py-1.5 rounded text-xs" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ User Edit Form ═══
function UserEditForm({ user, onSave, onCancel }: { user: any; onSave: () => void; onCancel: () => void }) {
  const updateUser = trpc.auth.update.useMutation({
    onSuccess: () => { showToast("User updated", "success"); onSave(); },
    onError: (e) => showToast(e.message || "Update failed", "error"),
  });
  const [form, setForm] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    screenName: user.screenName || "",
    name: user.name || "",
    email: user.email || "",
    role: user.role,
    company: user.company || "",
    division: user.division || "",
    position: user.position || "",
    countryCode: user.countryCode || "",
    mobile: user.mobile || "",
    canUseAi: user.canUseAi,
    canViewActivity: user.canViewActivity,
  });

  const handleSave = () => {
    updateUser.mutate({ id: user.id, ...form });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>First Name</label>
          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="hub-input text-xs w-full" />
        </div>
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Last Name</label>
          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="hub-input text-xs w-full" />
        </div>
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Screen Name</label>
          <input value={form.screenName} onChange={(e) => setForm({ ...form, screenName: e.target.value })} className="hub-input text-xs w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Role</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="hub-input text-xs w-full" style={{ color: "var(--text-primary)" }}>
            <option value="user">User</option>
            <option value="team_lead">Team Lead</option>
            <option value="superadmin">Super Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Email</label>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="hub-input text-xs w-full" />
        </div>
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Mobile</label>
          <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="hub-input text-xs w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Company</label>
          <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="hub-input text-xs w-full" />
        </div>
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Division</label>
          <input value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} className="hub-input text-xs w-full" />
        </div>
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Position</label>
          <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="hub-input text-xs w-full" />
        </div>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={form.canViewActivity} onChange={(e) => setForm({ ...form, canViewActivity: e.target.checked })} className="rounded" />
          Can View Activity Log
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={form.canUseAi} onChange={(e) => setForm({ ...form, canUseAi: e.target.checked })} className="rounded" />
          AI Hub Assist Access
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="hub-btn text-xs"><Save size={12} className="inline mr-1" /> Save</button>
        <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>Cancel</button>
      </div>
    </div>
  );
}

// Available icons for teams — IDs must match BUILT_IN_ICONS in lib/icons.tsx
// Full list from v2 — 48 icons
const TEAM_ICONS = [
  { id: "overview", label: "Grid" }, { id: "react", label: "Phone" }, { id: "pcba", label: "PCBA" },
  { id: "firmware", label: "Gear" }, { id: "tft", label: "Display" }, { id: "router", label: "WiFi" },
  { id: "charger", label: "Battery" }, { id: "shell", label: "Shell" }, { id: "settings", label: "Settings" },
  { id: "robot", label: "Robot" }, { id: "sparkles", label: "Sparkles" }, { id: "globe", label: "Globe" },
  { id: "check", label: "Check" }, { id: "upload", label: "Upload" }, { id: "download", label: "Download" },
  { id: "document", label: "Document" }, { id: "folder", label: "Folder" }, { id: "bell", label: "Bell" },
  { id: "calendar", label: "Calendar" }, { id: "users", label: "Users" }, { id: "clock", label: "Clock" },
  { id: "sun", label: "Sun" }, { id: "moon", label: "Moon" }, { id: "chat", label: "Chat" },
  { id: "music", label: "Music" }, { id: "zap", label: "Zap" }, { id: "battery", label: "Battery" },
  { id: "hand", label: "Hand" }, { id: "image", label: "Image" }, { id: "warning", label: "Warning" },
  { id: "cube", label: "Cube" }, { id: "send", label: "Send" }, { id: "mail", label: "Mail" },
  { id: "box", label: "Box" }, { id: "cpu", label: "CPU" }, { id: "database", label: "Database" },
  { id: "camera", label: "Camera" }, { id: "code", label: "Code" }, { id: "layers", label: "Layers" },
  { id: "shield", label: "Shield" }, { id: "package", label: "Package" }, { id: "power", label: "Power" },
  { id: "usb", label: "USB" }, { id: "monitor", label: "Monitor" }, { id: "file", label: "File" },
  { id: "lock", label: "Lock" }, { id: "unlock", label: "Unlock" }, { id: "search", label: "Search" },
  { id: "trash", label: "Trash" }, { id: "edit", label: "Edit" },
];

// Available tabs with display labels
const AVAILABLE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "deliverables", label: "Deliverables" },
  { id: "pdf", label: "PDF Review" },
  { id: "files", label: "Files" },
  { id: "gallery", label: "Gallery" },
  { id: "collaboration", label: "HUB Chat" },
];

// ═══ TEAMS TAB ═══
function TeamsTab() {
  const { data: teams, refetch } = trpc.team.list.useQuery({ projectId: 1 });
  const utils = trpc.useUtils();
  const createTeam = trpc.team.create.useMutation({
    onSuccess: () => {
      utils.invalidate(); // global invalidation — refreshes sidebar, dashboard, everything
      showToast("Team created", "success");
      setCreating(false);
      resetForm();
    },
    onError: (e) => showToast(e.message || "Create failed", "error"),
  });
  const updateTeam = trpc.team.update.useMutation({
    onSuccess: () => {
      utils.invalidate();
      showToast("Team updated", "success");
      setEditingId(null);
      resetForm();
    },
    onError: (e) => showToast(e.message || "Update failed", "error"),
  });
  const deleteTeam = trpc.team.delete.useMutation({
    onSuccess: () => {
      utils.invalidate();
      showToast("Team archived", "success");
    },
    onError: (e) => showToast(e.message || "Archive failed", "error"),
  });
  const restoreTeam = trpc.team.restore.useMutation({
    onSuccess: () => {
      utils.invalidate();
      showToast("Team restored", "success");
    },
    onError: (e) => showToast(e.message || "Restore failed", "error"),
  });
  const { data: archivedTeams } = trpc.team.listArchived.useQuery();
  const { data: customIcons } = trpc.config.getIcons.useQuery();

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    teamId: "", nameEn: "", description: "", icon: "box",
    tabs: ["overview", "deliverables", "pdf", "files", "gallery", "collaboration"],
  });

  const resetForm = () => setForm({
    teamId: "", nameEn: "", description: "", icon: "box",
    tabs: ["overview", "deliverables", "pdf", "files", "gallery", "collaboration"],
  });

  const loadForEdit = (team: any) => {
    setEditingId(team.teamId);
    setForm({
      teamId: team.teamId,
      nameEn: team.nameEn || "",
      description: team.description || "",
      icon: team.icon || "box",
      tabs: (team.tabs as string[]) || ["overview", "deliverables", "pdf", "files", "gallery", "collaboration"],
    });
    setCreating(true);
  };

  const toggleTab = (tabId: string) => {
    setForm((p) => ({
      ...p,
      tabs: p.tabs.includes(tabId) ? p.tabs.filter((t) => t !== tabId) : [...p.tabs, tabId],
    }));
  };

  const handleSubmit = () => {
    if (!form.teamId || !form.nameEn) return;
    if (editingId) {
      updateTeam.mutate({
        teamId: editingId,
        nameEn: form.nameEn,
        description: form.description,
        icon: form.icon,
        tabs: form.tabs,
      });
    } else {
      createTeam.mutate({
        teamId: form.teamId,
        projectId: 1,
        nameEn: form.nameEn,
        description: form.description,
        icon: form.icon,
        tabs: form.tabs,
      });
    }
  };

  const isSubmitting = createTeam.isPending || updateTeam.isPending;

  return (
    <div className="space-y-4">
      {/* Create / Edit Form */}
      {(creating || editingId) && (
        <div className="hub-card space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            {editingId ? "Edit Team" : "Create Team"}
          </h3>

          {/* Row 1: Team ID + Name (EN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Team ID</label>
              <input placeholder="e.g. firmware" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, "") })} className="hub-input text-xs w-full" disabled={!!editingId} />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Team Name (EN only — auto-translates)</label>
              <input placeholder="e.g. Firmware Engineering" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className="hub-input text-xs w-full" />
            </div>
          </div>

          {/* Row 2: Description */}
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input placeholder="Short description of the team's responsibilities" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="hub-input text-xs w-full" />
          </div>

          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Icon</label>
            <div className="flex flex-wrap gap-1 p-1.5 rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              {/* Built-in icons */}
              {TEAM_ICONS.map((ic) => (
                <button
                  key={ic.id}
                  onClick={() => setForm({ ...form, icon: ic.id })}
                  title={ic.label}
                  className="w-6 h-6 rounded flex items-center justify-center transition-all"
                  style={{
                    background: form.icon === ic.id ? "var(--accent-dim)" : "transparent",
                    border: form.icon === ic.id ? "1px solid var(--accent)" : "1px solid transparent",
                    color: form.icon === ic.id ? "var(--accent-text)" : "var(--text-muted)",
                  }}
                >
                  <IconSvg name={ic.id} size={14} />
                </button>
              ))}
              {/* Custom icons from DB */}
              {customIcons && Object.keys(customIcons).filter((name) => !TEAM_ICONS.find((ic) => ic.id === name)).map((name) => (
                <button
                  key={name}
                  onClick={() => setForm({ ...form, icon: name })}
                  title={name}
                  className="w-6 h-6 rounded flex items-center justify-center transition-all"
                  style={{
                    background: form.icon === name ? "var(--accent-dim)" : "transparent",
                    border: form.icon === name ? "1px solid var(--accent)" : "1px solid var(--border)",
                    color: form.icon === name ? "var(--accent-text)" : "var(--text-muted)",
                  }}
                >
                  <IconSvg name={name} size={14} svg={(customIcons as any)[name]} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Visible Tabs</label>
            <div className="flex flex-wrap gap-3">
              {AVAILABLE_TABS.map((tab) => (
                <label key={tab.id} className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: form.tabs.includes(tab.id) ? "var(--accent-text)" : "var(--text-muted)" }}>
                  <input type="checkbox" checked={form.tabs.includes(tab.id)} onChange={() => toggleTab(tab.id)} className="rounded" />
                  {tab.label}
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button onClick={handleSubmit} disabled={isSubmitting || !form.teamId || !form.nameEn} className="hub-btn text-xs disabled:opacity-50">
              {isSubmitting ? "Saving..." : editingId ? <><Save size={12} className="inline mr-1" /> Update</> : <><Plus size={12} className="inline mr-1" /> Create</>}
            </button>
            <button onClick={() => { setCreating(false); setEditingId(null); resetForm(); }} className="hub-btn-outline text-xs" style={{ background: "var(--bg-base)" }}>
              <X size={12} className="inline mr-1" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Team List */}
      <div className="hub-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Teams ({teams?.length || 0})</h3>
          {!creating && !editingId && (
            <button onClick={() => setCreating(true)} className="hub-btn text-xs px-3 py-1.5 flex items-center gap-1.5">
              <Plus size={12} /> Add Team
            </button>
          )}
        </div>
        <div className="space-y-2">
          {teams?.map((team: any) => (
            <div key={team.teamId} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs" style={{ background: "var(--accent-dim, rgba(63,185,80,0.15))", color: "var(--accent-text)" }}>
                  <IconSvg name={team.icon || "box"} size={16} svg={(customIcons as any)?.[team.icon] || undefined} />
                </div>
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{team.nameEn} {team.nameZh && <span style={{ color: "var(--text-muted)" }}>({team.nameZh})</span>}</div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{team.teamId} {team.description && `| ${team.description}`}</div>
                  <div className="text-[10px]" style={{ color: "var(--accent)" }}>{((team.tabs as string[]) || []).join(" | ")}</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => loadForEdit(team)} className="p-1.5 rounded" style={{ color: "var(--blue)" }} title="Edit"><Edit2 size={13} /></button>
                <button onClick={() => { if (confirm("Archive this team? It will be hidden but all data preserved.")) deleteTeam.mutate({ teamId: team.teamId }); }} className="p-1.5 rounded" style={{ color: "var(--orange)" }} title="Archive"><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </div>

        {/* Archived Teams */}
        {archivedTeams && archivedTeams.length > 0 && (
          <div className="mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <h4 className="text-[11px] font-semibold mb-2 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
              <Trash2 size={12} /> Archived Teams ({archivedTeams.length})
            </h4>
            <div className="space-y-1">
              {archivedTeams.map((team: any) => (
                <div key={team.teamId} className="flex items-center justify-between p-2 rounded" style={{ background: "var(--bg-base)", opacity: 0.7 }}>
                  <div className="flex items-center gap-2">
                    <IconSvg name={team.icon || "box"} size={14} svg={(customIcons as any)?.[team.icon] || undefined} />
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{team.nameEn}</span>
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>({team.teamId})</span>
                  </div>
                  <button onClick={() => restoreTeam.mutate({ teamId: team.teamId })} className="text-[10px] px-2 py-1 rounded" style={{ color: "var(--accent)", background: "var(--accent-dim)" }}>
                    Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ LANGUAGES TAB ═══
function LanguagesTab() {
  const { data: languages } = trpc.locale.getLanguages.useQuery();
  const utils = trpc.useUtils();
  const [newLang, setNewLang] = useState({ code: "", name: "", nativeName: "", isRtl: false });
  const createLang = trpc.locale.createLanguage.useMutation({ onSuccess: () => { setNewLang({ code: "", name: "", nativeName: "", isRtl: false }); utils.locale.getLanguages.invalidate(); } });
  const toggleLang = trpc.locale.toggleLanguage.useMutation({ onSuccess: () => utils.locale.getLanguages.invalidate() });

  return (
    <div className="space-y-4">
      <div className="hub-card">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Add Language</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input placeholder="Code (e.g. ar, fr)" value={newLang.code} onChange={(e) => setNewLang({ ...newLang, code: e.target.value.toLowerCase() })} className="hub-input text-xs" />
          <input placeholder="Name (e.g. Arabic)" value={newLang.name} onChange={(e) => setNewLang({ ...newLang, name: e.target.value })} className="hub-input text-xs" />
          <input placeholder="Native Name" value={newLang.nativeName} onChange={(e) => setNewLang({ ...newLang, nativeName: e.target.value })} className="hub-input text-xs" />
        </div>
        <label className="flex items-center gap-2 mt-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          <input type="checkbox" checked={newLang.isRtl} onChange={(e) => setNewLang({ ...newLang, isRtl: e.target.checked })} className="rounded" />
          RTL (Right-to-Left)
        </label>
        <button onClick={() => newLang.code && newLang.name && createLang.mutate(newLang)} disabled={createLang.isPending} className="hub-btn mt-3 text-xs disabled:opacity-50">{createLang.isPending ? "Adding..." : "Add Language"}</button>
      </div>
      <div className="hub-card">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Languages</h3>
        <div className="space-y-2">
          {languages?.map((l: any) => (
            <div key={l.code} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
              <div className="flex items-center gap-3">
                <Globe size={16} style={{ color: l.isActive ? "var(--accent)" : "var(--text-muted)" }} />
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                    {l.nativeName} ({l.code}) {l.isDefault && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>Default</span>}
                    {l.isRtl && <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] rtl-badge">RTL</span>}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{l.name}</div>
                </div>
              </div>
              <button onClick={() => toggleLang.mutate({ code: l.code, isActive: !l.isActive })} className="px-3 py-1 rounded text-[10px] font-medium border transition-all" style={{ borderColor: l.isActive ? "var(--accent)" : "var(--border)", color: l.isActive ? "var(--accent)" : "var(--text-muted)" }}>{l.isActive ? "Active" : "Inactive"}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══ APPROVALS TAB ═══
function ApprovalsTab() {
  const { data: pending } = trpc.contentPending.list.useQuery({ status: "pending" });
  const utils = trpc.useUtils();
  const reviewMutation = trpc.contentPending.review.useMutation({ onSuccess: () => utils.contentPending.invalidate() });

  return (
    <div className="space-y-4">
      <div className="hub-card">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}><Shield size={15} /> Pending Content Approvals ({pending?.length || 0})</h3>
        {pending && pending.length > 0 ? (
          <div className="space-y-2">
            {pending.map((item: any) => (
              <div key={item.id} className="p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: "var(--accent)" }}>{item.teamId}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--orange-dim)", color: "var(--orange)" }}>{item.sectionKey}</span>
                  </div>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
                <pre className="text-[11px] p-2 rounded mb-3 overflow-auto max-h-[120px]" style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}>{item.content}</pre>
                <div className="flex gap-2">
                  <button onClick={() => reviewMutation.mutate({ id: item.id, status: "approved" })} className="text-[10px] px-3 py-1 rounded flex items-center gap-1" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}><Check size={10} /> Approve</button>
                  <button onClick={() => reviewMutation.mutate({ id: item.id, status: "rejected" })} className="text-[10px] px-3 py-1 rounded flex items-center gap-1" style={{ background: "var(--red-dim, rgba(248,81,73,0.1))", color: "var(--red)" }}><X size={10} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-sm" style={{ color: "var(--text-muted)" }}>No pending approvals</div>
        )}
      </div>
    </div>
  );
}

// ═══ AUDIT TAB ═══
function AuditTab() {
  const { data: logs } = trpc.audit.list.useQuery({ limit: 100, offset: 0 });
  const [filter, setFilter] = useState("");
  const filtered = (logs || []).filter((l: any) =>
    !filter || l.action?.toLowerCase().includes(filter.toLowerCase()) || l.username?.toLowerCase().includes(filter.toLowerCase()) || l.resource?.toLowerCase().includes(filter.toLowerCase())
  );
  const ACTION_COLORS: Record<string, string> = {
    login: "var(--accent)", logout: "var(--text-muted)", create: "var(--blue)", update: "var(--orange)", delete: "var(--red)", upload: "var(--cyan)", nda_accept: "var(--purple)",
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by action, user, or resource..." className="hub-input text-xs pl-8 w-full" />
      </div>
      <div className="hub-card">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Audit Log ({filtered.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-2 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>Action</th>
                <th className="text-left px-2 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>User</th>
                <th className="text-left px-2 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>Resource</th>
                <th className="text-left px-2 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any) => (
                <tr key={log.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="px-2 py-2"><span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: (ACTION_COLORS[log.action] || "var(--text-muted)") + "18", color: ACTION_COLORS[log.action] || "var(--text-muted)" }}>{log.action}</span></td>
                  <td className="px-2 py-2" style={{ color: "var(--text-primary)" }}>{log.username || "System"}</td>
                  <td className="px-2 py-2" style={{ color: "var(--text-secondary)" }}>{log.resource}{log.recordId ? ` #${log.recordId}` : ""}</td>
                  <td className="px-2 py-2" style={{ color: "var(--text-muted)" }}>{new Date(log.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══ PRODUCT IDENTITY TAB ═══
const STATUS_OPTIONS = ["In Development", "In Testing", "Beta", "Released", "On Hold", "Archived"];

function ProductIdentityTab() {
  const { data: config, refetch } = trpc.config.getSystemConfig.useQuery(undefined);
  const setConfig = trpc.config.setSystemConfig.useMutation({ onSuccess: () => { refetch(); showToast("Saved", "success"); } });
  const deleteAsset = trpc.config.deleteAsset.useMutation({
    onSuccess: () => { refetch(); showToast("Deleted", "success"); },
    onError: () => showToast("Delete failed", "error"),
  });
  const createVersion = trpc.version.create.useMutation({
    onSuccess: () => showToast("Version submitted for approval", "success"),
    onError: () => showToast("Failed to submit version", "error"),
  });
  const { data: teams } = trpc.team.list.useQuery({ projectId: 1 });

  const [form, setForm] = useState<Record<string, string>>({});
  const [versionForm, setVersionForm] = useState({
    version: "", changeType: "minor" as string, description: "", affectedTeams: [] as string[],
  });

  useEffect(() => {
    if (config && typeof config === "object") setForm(config as Record<string, string>);
  }, [config]);

  const handleSave = (key: string, description?: string) => {
    if (form[key] !== undefined) setConfig.mutate({ key, value: form[key], description });
  };

  const c = (key: string) => form[key] || (typeof config === "object" ? (config as any)?.[key] || "" : "");

  const handleLogoUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "logo");
    try {
      const res = await fetch("/api/upload/asset", { method: "POST", body: formData, headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` } });
      if (res.ok) {
        const data = await res.json();
        // Save to DB FIRST using the returned path, then update local form state
        setConfig.mutate({ key: "product_logo_path", value: data.path, description: "Product logo image" });
        setForm((p) => ({ ...p, product_logo_path: data.path }));
      } else showToast("Upload failed", "error");
    } catch { showToast("Upload error", "error"); }
  };

  const handleModelUpload = async (file: File) => {
    if (!file.name.endsWith(".glb")) { showToast("Only .glb files allowed", "error"); return; }
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "model");
    try {
      const res = await fetch("/api/upload/asset", { method: "POST", body: formData, headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` } });
      if (res.ok) {
        const data = await res.json();
        // Save to DB FIRST using the returned path, then update local form state
        setConfig.mutate({ key: "product_model_path", value: data.path, description: "3D product model" });
        setForm((p) => ({ ...p, product_model_path: data.path }));
      } else showToast("Upload failed", "error");
    } catch { showToast("Upload error", "error"); }
  };

  const handleFaviconUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "logo");
    try {
      const res = await fetch("/api/upload/asset", { method: "POST", body: formData, headers: { Authorization: `Bearer ${localStorage.getItem("access_token") || ""}` } });
      if (res.ok) {
        const data = await res.json();
        setConfig.mutate({ key: "favicon_path", value: data.path, description: "Browser favicon" });
        setForm((p) => ({ ...p, favicon_path: data.path }));
      } else showToast("Upload failed", "error");
    } catch { showToast("Upload error", "error"); }
  };

  const handleDeleteAsset = (key: "product_logo_path" | "product_model_path" | "favicon_path") => {
    if (!confirm("Delete this asset?")) return;
    deleteAsset.mutate({ key });
    setForm((p) => ({ ...p, [key]: "" }));
  };

  const toggleVersionTeam = (teamId: string) => {
    setVersionForm((p) => ({ ...p, affectedTeams: p.affectedTeams.includes(teamId) ? p.affectedTeams.filter((t) => t !== teamId) : [...p.affectedTeams, teamId] }));
  };

  const handlePublishVersion = () => {
    if (!versionForm.version || !versionForm.description) { showToast("Version and description required", "error"); return; }
    createVersion.mutate({ projectId: 1, version: versionForm.version, changeType: versionForm.changeType, description: versionForm.description, affectedTeams: versionForm.affectedTeams });
    setVersionForm({ version: "", changeType: "minor", description: "", affectedTeams: [] });
  };

  return (
    <div className="space-y-4">
      {/* Product Info */}
      <div className="hub-card space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--accent)" }}><SettingsIcon size={15} /> Project Identity</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Product / Project Name</label>
            <input value={c("product_name")} onChange={(e) => setForm((p) => ({ ...p, product_name: e.target.value }))} placeholder="QR114i Salaam Stream" className="hub-input text-xs w-full" />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Status Badge</label>
            <select value={c("product_status")} onChange={(e) => setForm((p) => ({ ...p, product_status: e.target.value }))} className="hub-input text-xs w-full" style={{ color: "var(--text-primary)" }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description</label>
          <textarea value={c("product_description")} onChange={(e) => setForm((p) => ({ ...p, product_description: e.target.value }))} placeholder="Multi-language description..." className="hub-input text-xs w-full min-h-[60px] resize-none" />
        </div>

        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Company Name</label>
          <input value={c("company_name")} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} placeholder="RAOSS HK COMPANY LIMITED" className="hub-input text-xs w-full sm:w-1/2" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Start Date</label>
            <input type="date" value={c("timeline_start")} onChange={(e) => setForm((p) => ({ ...p, timeline_start: e.target.value }))} className="hub-input text-xs w-full" style={{ color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Target Date</label>
            <input type="date" value={c("timeline_target")} onChange={(e) => setForm((p) => ({ ...p, timeline_target: e.target.value }))} className="hub-input text-xs w-full" style={{ color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Last Updated</label>
            <input type="date" value={c("timeline_updated")} onChange={(e) => setForm((p) => ({ ...p, timeline_updated: e.target.value }))} className="hub-input text-xs w-full" style={{ color: "var(--text-primary)" }} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>ICP (EN)</label>
            <input value={c("icp_en")} onChange={(e) => setForm((p) => ({ ...p, icp_en: e.target.value }))} placeholder="ICP number (English)" className="hub-input text-xs w-full" />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>ICP (ZH)</label>
            <input value={c("icp_zh")} onChange={(e) => setForm((p) => ({ ...p, icp_zh: e.target.value }))} placeholder="ICP number (Chinese)" className="hub-input text-xs w-full" />
          </div>
        </div>

        <button onClick={() => { handleSave("product_name", "Product name"); handleSave("product_status", "Product status"); handleSave("product_description", "Product description"); handleSave("company_name", "Company name"); handleSave("timeline_start", "Timeline start"); handleSave("timeline_target", "Timeline target"); handleSave("timeline_updated", "Timeline last updated"); handleSave("icp_en", "ICP English"); handleSave("icp_zh", "ICP Chinese"); }} className="hub-btn text-xs">
          <Save size={12} className="inline mr-1" /> Save All Product Info
        </button>
      </div>

      {/* Uploads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Product Logo */}
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Product Logo</h3>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} className="hub-input text-xs mb-2" />
          {c("product_logo_path") ? (
            <div className="mt-2 p-2 rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              <img src={c("product_logo_path")} alt="Product Logo" className="max-h-[80px] object-contain mb-2" />
              <div className="flex items-center gap-2">
                <a href={c("product_logo_path")} download className="text-[10px]" style={{ color: "var(--blue)" }}>Download</a>
                <button
                  onClick={() => handleDeleteAsset("product_logo_path")}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--red-dim, rgba(248,81,73,0.15))", color: "var(--red)" }}
                  title="Delete logo"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-4 rounded text-center text-[11px]" style={{ background: "var(--bg-base)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
              No logo uploaded
            </div>
          )}
        </div>

        {/* Favicon */}
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Favicon</h3>
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFaviconUpload(f); }} className="hub-input text-xs mb-2" />
          {c("favicon_path") ? (
            <div className="mt-2 p-2 rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              <img src={c("favicon_path")} alt="Favicon" className="w-8 h-8 object-contain mb-2" />
              <div className="flex items-center gap-2">
                <a href={c("favicon_path")} download className="text-[10px]" style={{ color: "var(--blue)" }}>Download</a>
                <button
                  onClick={() => handleDeleteAsset("favicon_path")}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--red-dim, rgba(248,81,73,0.15))", color: "var(--red)" }}
                  title="Delete favicon"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-4 rounded text-center text-[11px]" style={{ background: "var(--bg-base)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
              No favicon uploaded
            </div>
          )}
        </div>

        {/* 3D Product Model */}
        <div className="hub-card">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>3D Product Model (.glb)</h3>
          <input type="file" accept=".glb" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleModelUpload(f); }} className="hub-input text-xs mb-2" />
          {c("product_model_path") ? (
            <div className="mt-2 p-3 rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Box size={16} style={{ color: "var(--accent)" }} />
                <span className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>GLB Model Uploaded</span>
              </div>
              <div className="flex items-center gap-2">
                <a href={c("product_model_path")} download className="text-[10px]" style={{ color: "var(--blue)" }}>Download .glb</a>
                <button
                  onClick={() => handleDeleteAsset("product_model_path")}
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: "var(--red-dim, rgba(248,81,73,0.15))", color: "var(--red)" }}
                  title="Delete 3D model"
                >
                  Delete
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-2 p-4 rounded text-center text-[11px]" style={{ background: "var(--bg-base)", border: "1px dashed var(--border)", color: "var(--text-muted)" }}>
              No 3D model uploaded
            </div>
          )}
        </div>
      </div>

      {/* Publish Version */}
      <div className="hub-card space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--accent)" }}>
          <Layers size={15} /> Publish New Version
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Current Version</label>
            <input value={c("current_version")} onChange={(e) => setForm((p) => ({ ...p, current_version: e.target.value }))} placeholder="1.0" className="hub-input text-xs w-full" />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Change Type</label>
            <select value={versionForm.changeType} onChange={(e) => setVersionForm((p) => ({ ...p, changeType: e.target.value }))} className="hub-input text-xs w-full" style={{ color: "var(--text-primary)" }}>
              <option value="major">Major (1.0 → 2.0)</option>
              <option value="medium">Medium (1.0 → 1.1)</option>
              <option value="minor">Minor (1.0 → 1.0.1)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>New Version</label>
            <input value={versionForm.version} onChange={(e) => setVersionForm((p) => ({ ...p, version: e.target.value }))} placeholder="Enter new version" className="hub-input text-xs w-full" />
          </div>
        </div>

        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Description of Changes</label>
          <textarea value={versionForm.description} onChange={(e) => setVersionForm((p) => ({ ...p, description: e.target.value }))} placeholder="What's changed in this version..." className="hub-input text-xs w-full min-h-[60px] resize-none" />
        </div>

        <div>
          <label className="text-[10px] font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>Affected Teams</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {teams?.map((t) => (
              <label key={t.teamId} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs" style={{ background: versionForm.affectedTeams.includes(t.teamId) ? "var(--accent-dim)" : "var(--bg-base)", border: `1px solid ${versionForm.affectedTeams.includes(t.teamId) ? "var(--accent-dim)" : "var(--border-subtle)"}` }}>
                <input type="checkbox" checked={versionForm.affectedTeams.includes(t.teamId)} onChange={() => toggleVersionTeam(t.teamId)} className="rounded" />
                <span style={{ color: versionForm.affectedTeams.includes(t.teamId) ? "var(--accent-text)" : "var(--text-primary)" }}>{t.nameEn}</span>
              </label>
            ))}
          </div>
        </div>

        <button onClick={handlePublishVersion} disabled={createVersion.isPending} className="hub-btn text-xs disabled:opacity-50">
          <Layers size={12} className="inline mr-1" /> {createVersion.isPending ? "Submitting..." : "Submit for Approval"}
        </button>
      </div>
    </div>
  );
}

// ═══ SYSTEM CONFIG TAB ═══
// ═══ NDA MANAGER TAB ═══
function NDAManagerTab() {
  const { data: nda, refetch: refetchNda } = trpc.config.getNDA.useQuery();
  const saveNda = trpc.config.saveNDA.useMutation({
    onSuccess: () => { refetchNda(); showToast("NDA saved", "success"); },
    onError: (e) => showToast(e.message || "Failed", "error"),
  });
  const { data: langsData } = trpc.locale.getLanguages.useQuery();
  const ndaLangs = (langsData && langsData.length > 0) ? langsData : [{ code: "en", name: "English", nativeName: "English", isDefault: true }];

  const [ndaForm, setNdaForm] = useState<Record<string, { title: string; content: string }>>({});

  useEffect(() => {
    if (nda && typeof nda === "object") setNdaForm(nda as Record<string, { title: string; content: string }>);
  }, [nda]);

  const handleSaveNDA = () => {
    const payload: Record<string, { title: string; content: string }> = {};
    for (const lang of ndaLangs) {
      payload[lang.code] = {
        title: ndaForm[lang.code]?.title || "",
        content: ndaForm[lang.code]?.content || "",
      };
    }
    saveNda.mutate(payload);
  };

  return (
    <div className="space-y-4 max-w-[600px]">
      <div className="hub-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Shield size={15} /> Non-Disclosure Agreement
        </h3>
        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          This NDA is shown to all users on first login. Configure the title and content for each active language.
        </div>
        {ndaLangs.map((lang) => (
          <div key={lang.code} className="space-y-2">
            <div className="text-[11px] font-medium px-2 py-1 rounded flex items-center gap-2" style={{ background: "var(--bg-base)" }}>
              <Globe size={12} style={{ color: "var(--accent)" }} />
              {lang.nativeName} ({lang.code})
              {lang.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>Default</span>}
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>NDA Title</label>
              <input value={ndaForm[lang.code]?.title || ""} onChange={(e) => setNdaForm((p) => ({ ...p, [lang.code]: { ...p[lang.code], title: e.target.value } }))} className="hub-input text-xs w-full" placeholder={lang.code === "en" ? "Non-Disclosure Agreement" : `NDA Title (${lang.nativeName})`} />
            </div>
            <div>
              <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>NDA Content</label>
              <textarea value={ndaForm[lang.code]?.content || ""} onChange={(e) => setNdaForm((p) => ({ ...p, [lang.code]: { ...p[lang.code], content: e.target.value } }))} rows={6} className="hub-input text-xs w-full" style={{ resize: "vertical", lineHeight: 1.6 }} placeholder={lang.code === "en" ? "Enter NDA content..." : `NDA Content (${lang.nativeName})`} />
            </div>
          </div>
        ))}
        <button onClick={handleSaveNDA} disabled={saveNda.isPending} className="hub-btn text-xs w-full disabled:opacity-50">
          <Save size={12} className="inline mr-1" /> {saveNda.isPending ? "Saving..." : "Save NDA"}
        </button>
      </div>
    </div>
  );
}

function SystemConfigTab() {
  const utils = trpc.useUtils();
  const { data: config, refetch } = trpc.config.getSystemConfig.useQuery(undefined);
  const setConfig = trpc.config.setSystemConfig.useMutation({ onSuccess: () => { refetch(); showToast("Saved", "success"); } });
  const { data: emailStatus, refetch: refetchEmail } = trpc.email.status.useQuery();
  const testEmail = trpc.email.test.useMutation({ onSuccess: () => { refetchEmail(); showToast("SMTP connection OK", "success"); }, onError: () => showToast("SMTP connection failed", "error") });

  // Kimi API Key
  const { data: kimiKeyData } = trpc.config.getKimiKey.useQuery();
  const setKimiKey = trpc.config.setKimiKey.useMutation({ onSuccess: () => { showToast("Kimi key saved", "success"); utils.config.getKimiKey.invalidate(); }, onError: () => showToast("Failed", "error") });

  // Custom Icons
  const { data: customIcons } = trpc.config.getIcons.useQuery();
  const saveIcon = trpc.config.saveIcon.useMutation({ onSuccess: () => { utils.config.getIcons.invalidate(); showToast("Icon added", "success"); }, onError: () => showToast("Failed", "error") });
  const deleteIcon = trpc.config.deleteIcon.useMutation({ onSuccess: () => { utils.config.getIcons.invalidate(); showToast("Icon deleted", "success"); }, onError: () => showToast("Failed", "error") });

  // Factory Reset
  const factoryReset = trpc.config.factoryReset.useMutation({ onSuccess: (d) => { showToast(`${d.scope} reset done`, "success"); }, onError: () => showToast("Reset failed", "error") });

  const [form, setForm] = useState<Record<string, string>>({});
  const [iconName, setIconName] = useState("");
  const [iconSvg, setIconSvg] = useState("");
  const [kimiInput, setKimiInput] = useState("");

  // Sync form with loaded config
  useEffect(() => {
    if (config && typeof config === "object") {
      setForm(config as Record<string, string>);
    }
  }, [config]);

  // Sync Kimi key
  useEffect(() => {
    if (kimiKeyData?.key) setKimiInput(kimiKeyData.key);
  }, [kimiKeyData]);

  const handleSave = (key: string, description?: string) => {
    if (form[key] !== undefined) {
      setConfig.mutate({ key, value: form[key], description });
    }
  };

  const handleAddIcon = () => {
    const name = iconName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    const svg = iconSvg.trim();
    if (!name) { showToast("Icon name required", "error"); return; }
    if (!svg || !svg.includes("<svg")) { showToast("Valid SVG required", "error"); return; }
    if (TEAM_ICONS.find((ic) => ic.id === name)) { showToast(`"${name}" is built-in, cannot override`, "error"); return; }
    saveIcon.mutate({ name, svg });
    setIconName("");
    setIconSvg("");
  };

  const fields = [
    { key: "site_url", label: "Site URL", placeholder: "https://raosshub.qr114.com.cn", description: "Main site URL used in emails", icon: Link },
    { key: "smtp_host", label: "SMTP Host", placeholder: "smtp.gmail.com or mail.raosshub.com", description: "SMTP server hostname", icon: Server },
    { key: "smtp_port", label: "SMTP Port", placeholder: "587 (TLS) or 465 (SSL)", description: "SMTP server port", icon: Server },
    { key: "smtp_user", label: "SMTP Username", placeholder: "postmaster@raosshub.com", description: "SMTP authentication username", icon: Mail },
    { key: "smtp_pass", label: "SMTP Password", placeholder: "••••••••", description: "SMTP authentication password", icon: Mail, type: "password" },
  ];

  const allIcons = { ...Object.fromEntries(TEAM_ICONS.map((ic) => [ic.id, ""])), ...(customIcons || {}) };

  return (
    <div className="space-y-4">
      {/* Email Status */}
      <div className="hub-card">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Mail size={15} /> Email Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>SMTP</div>
            <div className="text-xs font-medium mt-1" style={{ color: emailStatus?.hasSmtp ? "var(--accent)" : "var(--orange)" }}>{emailStatus?.hasSmtp ? "Configured" : "Not Configured"}</div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Host</div>
            <div className="text-xs font-medium mt-1" style={{ color: "var(--text-primary)" }}>{emailStatus?.host || "—"}</div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Port</div>
            <div className="text-xs font-medium mt-1" style={{ color: "var(--text-primary)" }}>{emailStatus?.port || "—"}</div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Site URL</div>
            <div className="text-xs font-medium mt-1 truncate" style={{ color: "var(--text-primary)" }}>{emailStatus?.siteUrl || "—"}</div>
          </div>
        </div>
        <button onClick={() => testEmail.mutate()} disabled={testEmail.isPending} className="hub-btn text-xs mt-3 disabled:opacity-50">
          {testEmail.isPending ? "Testing..." : "Test SMTP Connection"}
        </button>
      </div>

      {/* Config Fields */}
      <div className="hub-card space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <SettingsIcon size={15} /> System Configuration
        </h3>
        {fields.map((f) => {
          const Icon = f.icon;
          const currentValue = form[f.key] || (typeof config === "object" && config ? (config as any)[f.key] : "");
          return (
            <div key={f.key} className="p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={12} style={{ color: "var(--accent)" }} />
                <label className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{f.label}</label>
              </div>
              <div className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>{f.description}</div>
              <div className="flex gap-2">
                <input
                  type={f.type || "text"}
                  value={form[f.key] || currentValue || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="hub-input text-xs flex-1"
                />
                <button onClick={() => handleSave(f.key, f.description)} disabled={setConfig.isPending} className="hub-btn text-xs disabled:opacity-50">
                  <Save size={12} className="inline mr-1" /> Save
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Kimi API Key */}
      <div className="hub-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Sparkles size={15} /> Kimi AI Configuration
        </h3>
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>Kimi API Key</label>
          <div className="flex gap-2">
            <input type="password" value={kimiInput} onChange={(e) => setKimiInput(e.target.value)} className="hub-input text-xs flex-1" placeholder="sk-..." />
          </div>
          <div className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
            Get your key at <a href="https://platform.moonshot.cn" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>platform.moonshot.cn</a>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setKimiKey.mutate({ key: kimiInput.trim() })} disabled={setKimiKey.isPending} className="hub-btn text-xs disabled:opacity-50">
            <Save size={12} className="inline mr-1" /> Save Key
          </button>
          <span className="text-[10px] self-center" style={{ color: kimiKeyData?.hasKey ? "var(--accent)" : "var(--text-muted)" }}>
            {kimiKeyData?.hasKey ? "● Key configured" : "○ No key set"}
          </span>
        </div>
      </div>

      {/* Icon Library */}
      <div className="hub-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <Cpu size={15} /> Icon Library
        </h3>
        <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Add custom icons for the team icon picker. Copy SVG from lucide.dev.</div>
        <div className="flex flex-wrap gap-2">
          {Object.keys(allIcons).map((name) => (
            <div key={name} title={name} className="relative w-8 h-8 flex items-center justify-center rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              <IconSvg name={name} size={14} svg={customIcons?.[name] || undefined} />
              {customIcons?.[name] && (
                <button onClick={() => deleteIcon.mutate({ name })} className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px]" style={{ background: "var(--red)", color: "white" }}>✕</button>
              )}
            </div>
          ))}
        </div>
        <div className="border-t" style={{ borderColor: "var(--border)" }}>
          <div className="text-[10px] font-medium mt-3 mb-2" style={{ color: "var(--text-secondary)" }}>Add New Icon</div>
          <div className="flex gap-2 mb-2">
            <input value={iconName} onChange={(e) => setIconName(e.target.value)} className="hub-input text-xs flex-1" placeholder="Icon name (e.g. cpu)" />
            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
              {iconSvg && iconSvg.includes("<svg") ? <span dangerouslySetInnerHTML={{ __html: iconSvg.replace('<svg ', '<svg width="16" height="16" ') }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }} /> : <span style={{ color: "var(--text-muted)", fontSize: 10 }}>?</span>}
            </div>
          </div>
          <textarea value={iconSvg} onChange={(e) => setIconSvg(e.target.value)} rows={4} className="hub-input text-xs w-full mb-2" style={{ resize: "vertical", fontFamily: "monospace" }} placeholder="Paste SVG code from lucide.dev" />
          <button onClick={handleAddIcon} disabled={saveIcon.isPending} className="hub-btn text-xs w-full disabled:opacity-50">
            + Add Icon
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="hub-card space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--red)" }}>
          <Shield size={15} /> Danger Zone
        </h3>
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
          <div>
            <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Reset Content</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Clear all team content. Keeps teams, users and API settings.</div>
          </div>
          <button onClick={() => { if (confirm("Reset all team content? Teams, users and API settings are kept. This cannot be undone.")) factoryReset.mutate({ scope: "content" }); }} className="px-3 py-1.5 rounded text-xs" style={{ color: "var(--red)", border: "1px solid var(--red)", background: "transparent" }}>Reset</button>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
          <div>
            <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>Full Factory Reset</div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>Clear everything. Returns to blank template. Cannot be undone.</div>
          </div>
          <button onClick={() => { if (confirm("FULL FACTORY RESET? This clears ALL data. This CANNOT be undone.") && confirm("Are you absolutely sure?")) factoryReset.mutate({ scope: "full" }); }} className="px-3 py-1.5 rounded text-xs" style={{ color: "var(--red)", border: "1px solid var(--red)", background: "transparent" }}>Factory Reset</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// DASHBOARD OVERVIEW TAB
// ═══════════════════════════════════════════

// Overview section IDs — labels come from t() inside the component
const OVERVIEW_SECTION_IDS = ["executive_summary", "timeline", "matrix"];

function DashboardOverviewTab() {
  const { t, lang } = useI18n();
  const [activeSection, setActiveSection] = useState("executive_summary");

  const sectionLabel = (id: string) => {
    const map: Record<string, string> = {
      executive_summary: t("ov_tab.summary", "Executive Summary"),
      timeline: t("ov_tab.timeline", "Timeline & Milestones"),
      matrix: t("ov_tab.matrix", "Responsibility Matrix"),
    };
    return map[id] || id;
  };

  return (
    <div className="space-y-4">
      {/* Section Tabs */}
      <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
        {OVERVIEW_SECTION_IDS.map((id) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap"
            style={{
              borderColor: activeSection === id ? "var(--accent)" : "transparent",
              color: activeSection === id ? "var(--accent)" : "var(--text-secondary)",
            }}
          >
            {sectionLabel(id)}
          </button>
        ))}
      </div>

      {activeSection === "executive_summary" && <ExecutiveSummaryEditor lang={lang} />}
      {activeSection === "timeline" && <TimelineEditor lang={lang} />}
      {activeSection === "matrix" && <ResponsibilityMatrixEditor />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EXECUTIVE SUMMARY EDITOR — matches v2 structure exactly
// Data model: { title, intro, specs: string[], features: string[] }
// ═══════════════════════════════════════════════════════════════

interface ExecSummaryData {
  title: string;
  intro: string;
  specs: string[];
  features: string[];
}

function ExecutiveSummaryEditor({ lang }: { lang: string }) {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const { data: sectionData } = trpc.overview.getSection.useQuery({ section: "executive_summary", lang });
  const saveSection = trpc.overview.saveSection.useMutation({
    onSuccess: () => { showToast(t("exec.save_ok", "Saved"), "success"); utils.overview.getSection.invalidate(); },
    onError: () => showToast(t("exec.save_err", "Save failed"), "error"),
  });

  const [data, setData] = useState<ExecSummaryData>({
    title: "", intro: "", specs: [], features: [],
  });

  // Sync from server
  useEffect(() => {
    if (sectionData && typeof sectionData === "object") {
      const d = sectionData as ExecSummaryData;
      setData({
        title: d.title || "",
        intro: d.intro || "",
        specs: Array.isArray(d.specs) ? d.specs : [],
        features: Array.isArray(d.features) ? d.features : [],
      });
    }
  }, [sectionData]);

  const setTitle = (title: string) => setData((p) => ({ ...p, title }));
  const setIntro = (intro: string) => setData((p) => ({ ...p, intro }));

  // Spec badges
  const addSpec = () => setData((p) => ({ ...p, specs: [...p.specs, ""] }));
  const updateSpec = (i: number, v: string) => setData((p) => ({ ...p, specs: p.specs.map((s, idx) => idx === i ? v : s) }));
  const removeSpec = (i: number) => setData((p) => ({ ...p, specs: p.specs.filter((_, idx) => idx !== i) }));

  // Features
  const addFeature = () => setData((p) => ({ ...p, features: [...p.features, ""] }));
  const updateFeature = (i: number, v: string) => setData((p) => ({ ...p, features: p.features.map((f, idx) => idx === i ? v : f) }));
  const removeFeature = (i: number) => setData((p) => ({ ...p, features: p.features.filter((_, idx) => idx !== i) }));

  const handleSave = () => {
    saveSection.mutate({ section: "executive_summary", lang, content: data });
  };

  return (
    <div className="space-y-4" style={{ maxWidth: 800 }}>
      {/* Executive Summary Card */}
      <div className="hub-card space-y-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--accent)" }}>Executive Summary</h3>

        {/* Title */}
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>{t("exec.title", "Title")}</label>
          <input
            value={data.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("exec.title_ph", "Project title...")}
            className="hub-input text-xs w-full"
          />
        </div>

        {/* Introduction Paragraph */}
        <div>
          <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>{t("exec.intro", "Introduction Paragraph")}</label>
          <textarea
            value={data.intro}
            onChange={(e) => setIntro(e.target.value)}
            rows={6}
            className="hub-input text-xs w-full"
            style={{ resize: "vertical", lineHeight: 1.7, fontSize: 13 }}
            placeholder={t("exec.intro_ph", "Describe the project overview, current status, and key goals...")}
          />
        </div>

        {/* Product Spec Badges */}
        <div>
          <label className="text-[10px] font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>{t("exec.specs", "Product Spec Badges")}</label>
          <div className="space-y-1">
            {data.specs.map((spec, i) => (
              <div key={i} className="flex gap-1.5" style={{ display: "grid", gridTemplateColumns: "1fr 36px", gap: 6 }}>
                <input
                  value={spec}
                  onChange={(e) => updateSpec(i, e.target.value)}
                  placeholder={i === 0 ? t("exec.spec_ph", "e.g. Habolink AF007") : t("exec.spec_n", "Spec {{n}}", { n: i + 1 })}
                  className="hub-input text-xs w-full"
                />
                <button
                  onClick={() => removeSpec(i)}
                  className="rounded flex items-center justify-center text-[11px]"
                  style={{ color: "var(--red)", border: "1px solid var(--red)", background: "transparent", padding: 0 }}
                  title={t("btn.remove", "Remove")}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addSpec} className="mt-2 text-[11px] px-3 py-1.5 rounded transition-all" style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "transparent" }}>
            + {t("btn.add_spec", "Add Spec")}
          </button>
        </div>

        {/* Feature Highlights */}
        <div>
          <label className="text-[10px] font-medium mb-2 block" style={{ color: "var(--text-secondary)" }}>{t("exec.features", "Feature Highlights / Bullets")}</label>
          <div className="space-y-1">
            {data.features.map((feat, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 36px", gap: 6 }}>
                <input
                  value={feat}
                  onChange={(e) => updateFeature(i, e.target.value)}
                  placeholder={i === 0 ? t("exec.feat_ph", "e.g. Bluetooth 5.0 (Mobile App BLE)") : t("exec.feat_n", "Feature {{n}}", { n: i + 1 })}
                  className="hub-input text-xs w-full"
                />
                <button
                  onClick={() => removeFeature(i)}
                  className="rounded flex items-center justify-center text-[11px]"
                  style={{ color: "var(--red)", border: "1px solid var(--red)", background: "transparent", padding: 0 }}
                  title={t("btn.remove", "Remove")}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
          <button onClick={addFeature} className="mt-2 text-[11px] px-3 py-1.5 rounded transition-all" style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "transparent" }}>
            + {t("btn.add_feature", "Add Feature")}
          </button>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saveSection.isPending}
        className="hub-btn text-sm w-full py-2.5 disabled:opacity-50"
      >
        {saveSection.isPending ? t("btn.saving", "Saving...") : <><Save size={14} className="inline mr-1.5" /> {t("exec.save", "Save Overview Content")}</>}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIMELINE & MILESTONES EDITOR — matches v2 structure exactly
// Data model: { phases: [{ quarter: "Q1 2026", items: [{ title, desc, status }] }] }
// ═══════════════════════════════════════════════════════════════

interface TimelineItem {
  title: string;
  desc: string;
  status: "planned" | "current" | "done" | "delayed" | "on-hold";
}

interface TimelinePhase {
  quarter: string;
  items: TimelineItem[];
}

interface TimelineData {
  phases: TimelinePhase[];
}

const TL_STATUS_COLORS: Record<string, string> = {
  current: "var(--accent)",
  planned: "#4b8cf7",
  done: "#6b7280",
  delayed: "var(--red)",
  "on-hold": "#9ca3af",
};

// (status labels are now provided via t() i18n inside TimelineEditor)

function TimelineEditor({ lang }: { lang: string }) {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const { data: sectionData } = trpc.overview.getSection.useQuery({ section: "timeline", lang });
  const saveSection = trpc.overview.saveSection.useMutation({
    onSuccess: () => { showToast(t("timeline.save_ok", "Timeline saved"), "success"); utils.overview.getSection.invalidate(); },
    onError: () => showToast(t("timeline.save_err", "Save failed"), "error"),
  });

  const [data, setData] = useState<TimelineData>({ phases: [] });
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [editingItem, setEditingItem] = useState<{ qi: number; ii: number } | null>(null);

  // Translated status labels
  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      planned: t("status.planned", "Planned"),
      current: t("status.current", "Current"),
      done: t("status.done", "Done"),
      delayed: t("status.delayed", "Delayed"),
      "on-hold": t("status.on_hold", "On Hold"),
    };
    return map[s] || s;
  };

  // Sync from server
  useEffect(() => {
    if (sectionData && typeof sectionData === "object") {
      const d = sectionData as TimelineData;
      setData({ phases: Array.isArray(d.phases) ? d.phases : [] });
    }
  }, [sectionData]);

  const setPhases = (phases: TimelinePhase[]) => setData({ phases });

  // Phase operations
  const addPhase = () => {
    const newPhase: TimelinePhase = { quarter: `Q${data.phases.length + 1} 2026`, items: [] };
    const phases = [...data.phases, newPhase];
    setPhases(phases);
    setExpandedPhases((p) => new Set([...p, phases.length - 1]));
  };

  const removePhase = (qi: number) => {
    if (!confirm(t("timeline.remove_phase_confirm", "Remove this phase?"))) return;
    const phases = data.phases.filter((_, i) => i !== qi);
    setPhases(phases);
    setExpandedPhases((p) => {
      const n = new Set<number>();
      p.forEach((idx) => { if (idx < qi) n.add(idx); else if (idx > qi) n.add(idx - 1); });
      return n;
    });
    if (editingItem?.qi === qi) setEditingItem(null);
  };

  const movePhase = (qi: number, dir: number) => {
    const ni = qi + dir;
    if (ni < 0 || ni >= data.phases.length) return;
    const phases = [...data.phases];
    [phases[qi], phases[ni]] = [phases[ni], phases[qi]];
    setPhases(phases);
    setExpandedPhases((p) => {
      const n = new Set<number>();
      p.forEach((idx) => {
        if (idx === qi) n.add(ni);
        else if (idx === ni) n.add(qi);
        else n.add(idx);
      });
      return n;
    });
  };

  const updatePhaseLabel = (qi: number, label: string) => {
    const phases = data.phases.map((p, i) => i === qi ? { ...p, quarter: label } : p);
    setPhases(phases);
  };

  // Item operations
  const addItem = (qi: number) => {
    const phases = data.phases.map((p, i) =>
      i === qi ? { ...p, items: [...p.items, { title: "New Milestone", desc: "", status: "planned" as const }] } : p
    );
    setPhases(phases);
    setExpandedPhases((p) => new Set([...p, qi]));
    setEditingItem({ qi, ii: phases[qi].items.length - 1 });
  };

  const removeItem = (qi: number, ii: number) => {
    const phases = data.phases.map((p, i) =>
      i === qi ? { ...p, items: p.items.filter((_, idx) => idx !== ii) } : p
    );
    setPhases(phases);
    if (editingItem?.qi === qi && editingItem?.ii === ii) setEditingItem(null);
  };

  const moveItem = (qi: number, ii: number, dir: number) => {
    const items = [...data.phases[qi].items];
    const ni = ii + dir;
    if (ni < 0 || ni >= items.length) return;
    [items[ii], items[ni]] = [items[ni], items[ii]];
    const phases = data.phases.map((p, i) => i === qi ? { ...p, items } : p);
    setPhases(phases);
    if (editingItem?.qi === qi && editingItem?.ii === ii) setEditingItem({ qi, ii: ni });
  };

  const updateItemField = (qi: number, ii: number, field: keyof TimelineItem, value: string) => {
    const phases = data.phases.map((p, i) =>
      i === qi ? { ...p, items: p.items.map((it, idx) => idx === ii ? { ...it, [field]: value } : it) } : p
    );
    setPhases(phases);
  };

  const saveItemEdit = (qi: number, ii: number, editData: { title: string; desc: string; status: string }) => {
    const phases = data.phases.map((p, i) =>
      i === qi ? { ...p, items: p.items.map((it, idx) => idx === ii ? { ...it, ...editData } : it) } : p
    );
    setPhases(phases);
    setEditingItem(null);
  };

  const handleSaveAll = () => {
    saveSection.mutate({ section: "timeline", lang, content: data });
  };

  // Helpers
  const getBorderColor = (phase: TimelinePhase) => {
    const items = phase.items || [];
    if (items.some((it) => it.status === "current")) return TL_STATUS_COLORS.current;
    if (items.some((it) => it.status === "delayed")) return TL_STATUS_COLORS.delayed;
    if (items.some((it) => it.status === "planned")) return TL_STATUS_COLORS.planned;
    if (items.some((it) => it.status === "done")) return TL_STATUS_COLORS.done;
    return "var(--border)";
  };

  return (
    <div className="space-y-4" style={{ maxWidth: 800 }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("timeline.title", "Timeline & Milestones")}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>{lang.toUpperCase()}</span>
          <button onClick={handleSaveAll} disabled={saveSection.isPending} className="hub-btn text-xs disabled:opacity-50">
            {saveSection.isPending ? t("btn.saving", "Saving...") : <><Save size={12} className="inline mr-1" /> {t("btn.save_all", "Save All")}</>}
          </button>
        </div>
      </div>

      {/* Phase Cards */}
      {data.phases.length === 0 && (
        <div className="text-center py-8 text-[13px]" style={{ color: "var(--text-muted)" }}>{t("timeline.no_phases", "No phases yet — click below to add")}</div>
      )}

      {data.phases.map((phase, qi) => {
        const isExpanded = expandedPhases.has(qi);
        const items = phase.items || [];
        const borderColor = getBorderColor(phase);

        // Status counts
        const countMap: Record<string, number> = {};
        items.forEach((it) => { const s = it.status || "planned"; countMap[s] = (countMap[s] || 0) + 1; });
        const countStr = Object.entries(countMap).map(([s, n]) => `${n} ${statusLabel(s)}`).join(" · ");

        return (
          <div
            key={qi}
            className="rounded-lg overflow-hidden"
            style={{
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${borderColor}`,
              background: "var(--bg-elevated)",
            }}
          >
            {/* Phase Header */}
            <div
              className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer select-none"
              onClick={() => {
                setExpandedPhases((p) => {
                  const n = new Set(p);
                  if (n.has(qi)) n.delete(qi); else n.add(qi);
                  return n;
                });
              }}
            >
              {/* Move arrows */}
              <div className="flex flex-col gap-0.5">
                {qi > 0 ? (
                  <button onClick={(e) => { e.stopPropagation(); movePhase(qi, -1); }} className="text-[9px] px-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-muted)", background: "transparent", lineHeight: "14px" }} title={t("btn.move_up", "Move up")}>↑</button>
                ) : <span className="h-4" />}
                {qi < data.phases.length - 1 ? (
                  <button onClick={(e) => { e.stopPropagation(); movePhase(qi, 1); }} className="text-[9px] px-1 rounded" style={{ border: "1px solid var(--border)", color: "var(--text-muted)", background: "transparent", lineHeight: "14px" }} title={t("btn.move_down", "Move down")}>↓</button>
                ) : <span className="h-4" />}
              </div>

              <span className="font-semibold text-sm" style={{ color: borderColor, minWidth: 60 }}>{phase.quarter || ""}</span>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {items.length} {items.length === 1 ? t("timeline.milestone", "milestone") : t("timeline.milestones", "milestones")} {countStr ? "· " + countStr : ""}
              </span>
              <div className="flex-1" />
              <span className="text-[10px] transition-transform duration-200 inline-block" style={{ color: "var(--text-muted)", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
            </div>

            {/* Expanded Body */}
            {isExpanded && (
              <div className="border-t px-3.5 py-3.5" style={{ borderColor: "var(--border)" }}>
                {/* Free-form Phase Label */}
                <div className="flex items-center gap-2 mb-3.5 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{t("timeline.phase_label", "Phase")}</span>
                  <input
                    value={phase.quarter || ""}
                    onChange={(e) => updatePhaseLabel(qi, e.target.value)}
                    placeholder={t("timeline.phase_placeholder", "Q3 2026, July 2026, Sprint 5...")}
                    className="hub-input text-xs flex-1"
                  />
                  <div className="flex-1" />
                  <button
                    onClick={() => removePhase(qi)}
                    className="text-[11px] px-2.5 py-1 rounded"
                    style={{ color: "var(--red)", border: "1px solid var(--red)", background: "transparent" }}
                  >
                    {t("btn.remove_phase", "Remove Phase")}
                  </button>
                </div>

                {/* Items */}
                <div className="mb-2">
                  {items.map((item, ii) => {
                    const isEditing = editingItem?.qi === qi && editingItem?.ii === ii;
                    const sc = TL_STATUS_COLORS[item.status || "planned"] || "var(--text-muted)";

                    if (isEditing) {
                      return (
                        <div key={ii} className="p-3 rounded-lg mb-1.5 space-y-2" style={{ background: "var(--bg-base)", border: "1px solid var(--border)" }}>
                          <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>{t("timeline.milestone_title", "Title")}</label>
                            <input
                              id={`tl-title-${qi}-${ii}`}
                              defaultValue={item.title || ""}
                              placeholder={t("timeline.title_ph", "Milestone title")}
                              className="hub-input text-xs w-full"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>{t("timeline.milestone_desc", "Description")}</label>
                            <textarea
                              id={`tl-desc-${qi}-${ii}`}
                              defaultValue={item.desc || ""}
                              rows={3}
                              className="hub-input text-xs w-full"
                              style={{ resize: "vertical", lineHeight: 1.6 }}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>{t("timeline.status", "Status")}</label>
                            <div className="flex gap-1.5 flex-wrap">
                              {["planned", "current", "done", "delayed"].map((s) => {
                                const active = (item.status || "planned") === s;
                                const c = TL_STATUS_COLORS[s];
                                return (
                                  <button
                                    key={s}
                                    onClick={() => updateItemField(qi, ii, "status", s)}
                                    className="text-[11px] px-3 py-1 rounded-full transition-all"
                                    style={{
                                      border: `1px solid ${c}`,
                                      background: active ? c : "transparent",
                                      color: active ? "#fff" : c,
                                    }}
                                  >
                                    {statusLabel(s)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 rounded text-[12px]" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent" }}>{t("btn.cancel", "Cancel")}</button>
                            <button
                              onClick={() => {
                                const titleEl = document.getElementById(`tl-title-${qi}-${ii}`) as HTMLInputElement;
                                const descEl = document.getElementById(`tl-desc-${qi}-${ii}`) as HTMLTextAreaElement;
                                saveItemEdit(qi, ii, {
                                  title: titleEl?.value?.trim() || "",
                                  desc: descEl?.value?.trim() || "",
                                  status: item.status,
                                });
                              }}
                              className="hub-btn text-[12px]"
                            >
                              {t("btn.save_milestone", "Save Milestone")}
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // Compact row
                    return (
                      <div
                        key={ii}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded mb-1"
                        style={{ background: "var(--bg-base)", borderLeft: `2px solid ${sc}` }}
                      >
                        <span className="flex-1 text-xs truncate" style={{ color: "var(--text-primary)" }}>{item.title || t("timeline.untitled", "(untitled)")}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: sc, border: `1px solid ${sc}` }}
                        >
                          {statusLabel(item.status || "planned")}
                        </span>
                        {ii > 0 && (
                          <button onClick={() => moveItem(qi, ii, -1)} className="text-[10px] px-1 py-0.5" style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }} title={t("btn.move_up", "Move up")}>↑</button>
                        )}
                        {ii < items.length - 1 && (
                          <button onClick={() => moveItem(qi, ii, 1)} className="text-[10px] px-1 py-0.5" style={{ color: "var(--text-muted)", background: "transparent", border: "none", cursor: "pointer" }} title={t("btn.move_down", "Move down")}>↓</button>
                        )}
                        <button
                          onClick={() => setEditingItem({ qi, ii })}
                          className="text-[10px] px-2 py-0.5 rounded"
                          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "transparent", cursor: "pointer" }}
                        >
                          {t("btn.edit", "Edit")}
                        </button>
                        <button
                          onClick={() => removeItem(qi, ii)}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ border: "1px solid var(--red)", color: "var(--red)", background: "transparent", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Add Milestone */}
                <button
                  onClick={() => addItem(qi)}
                  className="w-full text-center text-[12px] py-1.5 rounded transition-all"
                  style={{ color: "var(--text-secondary)", border: "1px dashed var(--border)", background: "transparent", cursor: "pointer" }}
                >
                  + {t("btn.add_milestone", "Add Milestone")}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Phase */}
      <button
        onClick={addPhase}
        className="text-[12px] px-4 py-2 rounded transition-all"
        style={{ color: "var(--accent)", border: "1px dashed var(--accent)", background: "transparent", cursor: "pointer" }}
      >
        + {t("btn.add_phase", "Add Phase")}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RESPONSIBILITY MATRIX EDITOR — v2 inline grid style
// Each row is directly editable inline: Team | Name | Responsibility | ✕
// ═══════════════════════════════════════════════════════════════

interface MatrixRow {
  id?: number;
  teamId: string;
  userId: number;
  responsibility: string;
}

function ResponsibilityMatrixEditor() {
  const { t } = useI18n();
  const utils = trpc.useUtils();
  const { data: dbMatrix } = trpc.overview.listMatrix.useQuery();
  const { data: teams } = trpc.team.list.useQuery({ projectId: 1 });
  const { data: userList } = trpc.auth.list.useQuery();

  const saveMatrix = trpc.overview.saveMatrix.useMutation({
    onSuccess: () => { showToast(t("matrix.save_ok", "Saved"), "success"); utils.overview.listMatrix.invalidate(); },
    onError: () => showToast(t("matrix.save_err", "Save failed"), "error"),
  });
  const deleteMatrix = trpc.overview.deleteMatrix.useMutation({
    onSuccess: () => { showToast(t("matrix.del_ok", "Deleted"), "success"); utils.overview.listMatrix.invalidate(); },
    onError: () => showToast(t("matrix.del_err", "Delete failed"), "error"),
  });

  const activeUsers = (userList || []).filter((u: any) => u.role !== "viewer");
  const activeTeams = (teams || []).filter((t: any) => t.isActive !== false);

  // Build working rows from DB data — synced on load, edited locally
  const buildRows = (): MatrixRow[] => {
    if (!dbMatrix || dbMatrix.length === 0) return [];
    return (dbMatrix as any[]).map((r) => ({
      id: r.id,
      teamId: r.teamId || "",
      userId: r.userId || 0,
      responsibility: r.responsibility || "",
    }));
  };

  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [dirty, setDirty] = useState(false);

  // Sync from DB
  useEffect(() => {
    setRows(buildRows());
    setDirty(false);
  }, [dbMatrix]);

  const addRow = () => {
    setRows((p) => [
      ...p,
      {
        teamId: activeTeams[0]?.teamId || "",
        userId: activeUsers[0]?.id || 0,
        responsibility: "",
      },
    ]);
    setDirty(true);
  };

  const updateRow = (i: number, field: keyof MatrixRow, value: string | number) => {
    setRows((p) => p.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
    setDirty(true);
  };

  const removeRow = (i: number) => {
    const row = rows[i];
    if (row.id) {
      // Existing DB row — confirm then delete via API
      if (confirm(t("matrix.delete_confirm", "Delete this row?"))) {
        deleteMatrix.mutate({ id: row.id });
      }
    } else {
      // New unsaved row — just remove locally
      setRows((p) => p.filter((_, idx) => idx !== i));
    }
  };

  const handleSaveAll = () => {
    // Validate
    const empty = rows.filter((r) => !r.teamId || !r.userId || !r.responsibility.trim());
    if (empty.length > 0) {
      showToast(t("matrix.err_empty", "All rows must have Team, Name, and Responsibility"), "error");
      return;
    }
    // Save each row
    let pending = rows.length;
    rows.forEach((row) => {
      saveMatrix.mutate(
        {
          id: row.id && row.id > 0 ? row.id : undefined,
          teamId: row.teamId,
          userId: row.userId,
          responsibility: row.responsibility.trim(),
        },
        {
          onSettled: () => {
            pending--;
            if (pending === 0) {
              setDirty(false);
              utils.overview.listMatrix.invalidate();
            }
          },
        }
      );
    });
  };

  return (
    <div className="space-y-4" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{t("matrix.title", "Responsibility Matrix")}</h3>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--orange-dim, rgba(210,153,34,0.15))", color: "var(--orange)" }}>
              {t("matrix.unsaved", "Unsaved changes")}
            </span>
          )}
          <button onClick={addRow} className="text-[11px] px-3 py-1.5 rounded transition-all" style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "transparent" }}>
            + {t("btn.add_row", "Add Row")}
          </button>
        </div>
      </div>

      {/* Inline Grid */}
      <div className="hub-card space-y-1.5">
        {/* Column Headers */}
        <div
          className="grid gap-2 px-2 pb-1.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ gridTemplateColumns: "160px 160px 1fr 36px", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <span>{t("matrix.team", "Team")}</span>
          <span>{t("matrix.name", "Name")}</span>
          <span>{t("matrix.responsibility", "Responsibility")}</span>
          <span></span>
        </div>

        {/* Rows */}
        {rows.length === 0 && (
          <div className="text-center py-8 text-[13px]" style={{ color: "var(--text-muted)" }}>
            {t("matrix.empty", "No responsibility assignments yet. Click \"+ Add Row\" to start.")}
          </div>
        )}

        {rows.map((row, i) => (
          <div
            key={i}
            className="grid gap-2 items-center py-1"
            style={{ gridTemplateColumns: "160px 160px 1fr 36px", borderBottom: i < rows.length - 1 ? "1px solid var(--border-subtle)" : "none" }}
          >
            {/* Team Dropdown */}
            <select
              value={row.teamId}
              onChange={(e) => updateRow(i, "teamId", e.target.value)}
              className="hub-input text-xs w-full"
              style={{ color: "var(--text-primary)" }}
            >
              {activeTeams.map((t: any) => (
                <option key={t.teamId} value={t.teamId}>{t.nameEn}</option>
              ))}
            </select>

            {/* Name Dropdown */}
            <select
              value={row.userId}
              onChange={(e) => updateRow(i, "userId", Number(e.target.value))}
              className="hub-input text-xs w-full"
              style={{ color: "var(--text-primary)" }}
            >
              {activeUsers.map((u: any) => (
                <option key={u.id} value={u.id}>{u.name || u.screenName || u.username}</option>
              ))}
            </select>

            {/* Responsibility Input */}
            <input
              value={row.responsibility}
              onChange={(e) => updateRow(i, "responsibility", e.target.value)}
              placeholder={t("matrix.resp_ph", "e.g. Lead firmware development")}
              className="hub-input text-xs w-full"
            />

            {/* Remove Button */}
            <button
              onClick={() => removeRow(i)}
              className="rounded flex items-center justify-center text-[11px] h-7"
              style={{ color: "var(--red)", border: "1px solid var(--red)", background: "transparent", padding: 0 }}
              title={t("btn.remove", "Remove")}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Save All Button */}
      {rows.length > 0 && (
        <button
          onClick={handleSaveAll}
          disabled={saveMatrix.isPending || !dirty}
          className="hub-btn text-sm w-full py-2.5 disabled:opacity-40"
        >
          {saveMatrix.isPending ? t("btn.saving", "Saving...") : <><Save size={14} className="inline mr-1.5" /> {t("matrix.save_all", "Save Responsibility Matrix")}</>}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// HUB ASSIST TAB
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// HUB ASSIST TAB — v2 matching: 3-column layout
// Left: Selectors | Centre: Editor + Prompt | Right: Actions + Status
// Workflow: Team → Section → Load → Prompt → Transform → Apply
// ═══════════════════════════════════════════════════════════════

const ASSIST_SECTION_IDS = ["scope", "deliverables", "actions", "timeline", "risks"];

function HubAssistTab() {
  const { t, lang } = useI18n();
  const utils = trpc.useUtils();
  const { data: teams } = trpc.team.list.useQuery({ projectId: 1 });
  const assist = trpc.kimi.assist.useMutation();
  const apply = trpc.kimi.applyAssist.useMutation();
  const localeQuery = trpc.locale.getLocales.useQuery({ projectId: 1, lang });

  // ─── State ───
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState("scope");
  const [prompt, setPrompt] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [step, setStep] = useState<"idle" | "transforming" | "applying">("idle");

  // ─── i18n helpers ───
  const sectionLabel = (id: string) => {
    const map: Record<string, string> = {
      scope: t("assist.scope", "Scope of Work"),
      deliverables: t("assist.deliverables", "Deliverables"),
      actions: t("assist.actions", "Action Items"),
      timeline: t("assist.timeline", "Timeline"),
      risks: t("assist.risks", "Risks"),
    };
    return map[id] || id;
  };

  const activeTeams = (teams || []).filter((t: any) => t.isActive !== false);

  // ─── Breadcrumb text ───
  const breadcrumb = () => {
    const parts: string[] = [];
    if (!selectedTeam) parts.push(t("assist.bc_overview", "Overview"));
    else {
      const team = activeTeams.find((t: any) => t.teamId === selectedTeam);
      parts.push(team?.nameEn || selectedTeam);
    }
    parts.push(sectionLabel(selectedSection));
    return parts.join(" → ");
  };

  // ─── Smart prefix for prompt ───
  const smartPrefix = () => {
    const sec = sectionLabel(selectedSection);
    if (!selectedTeam) return t("assist.prefix_overview", "Update {{section}}:", { section: sec });
    const team = activeTeams.find((t: any) => t.teamId === selectedTeam);
    return t("assist.prefix_team", "Update {{team}} {{section}}:", { team: team?.nameEn || selectedTeam, section: sec });
  };

  // ─── JSON validation ───
  const jsonValid = useMemo(() => {
    if (!editorContent.trim()) return null;
    try { JSON.parse(editorContent); return true; } catch { return false; }
  }, [editorContent]);

  // ─── Load current content from locales ───
  const handleLoad = () => {
    setStatusMsg(t("assist.status_loading", "Loading..."));
    try {
      const sectionKey = selectedTeam
        ? `team_${selectedTeam}_${selectedSection}`
        : `dashboard_${selectedSection}`;
      const data = localeQuery.data || {};
      const content = data[sectionKey];
      if (content !== undefined && content !== null) {
        const formatted = typeof content === "string" ? content : JSON.stringify(content, null, 2);
        setEditorContent(formatted);
        setStatusMsg(t("assist.status_loaded", "Loaded — edit or Transform"));
        setIsLoaded(true);
      } else {
        setEditorContent("");
        setStatusMsg(t("assist.status_not_found", "Section empty — start typing or Transform"));
        setIsLoaded(true);
      }
    } catch {
      setStatusMsg(t("assist.status_load_err", "Load failed"));
    }
  };

  // ─── Transform with Kimi AI ───
  const handleTransform = async () => {
    if (!editorContent.trim()) { showToast(t("assist.err_load_first", "Load a section first"), "error"); return; }
    if (!prompt.trim()) { showToast(t("assist.err_prompt", "Describe what to change"), "info"); return; }
    setStep("transforming");
    setStatusMsg(t("assist.status_transforming", "Sending to Kimi AI..."));
    try {
      const res = await assist.mutateAsync({
        teamId: selectedTeam || undefined,
        section: selectedSection,
        prompt: `${smartPrefix()} ${prompt}`,
        currentContent: editorContent,
      });
      if (res.content) {
        const cleaned = res.content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        try {
          const parsed = JSON.parse(cleaned);
          setEditorContent(JSON.stringify(parsed, null, 2));
          setStatusMsg(t("assist.status_done", "Done — click Apply to save"));
          showToast(t("assist.ok_generated", "Content generated"), "success");
        } catch {
          setEditorContent(cleaned);
          setStatusMsg(t("assist.status_warn_json", "Warning: non-JSON response"));
          showToast(t("assist.warn_json", "Non-JSON response — review before applying"), "warning");
        }
      } else {
        showToast(t("assist.err_no_content", "No content generated"), "error");
        setStatusMsg(t("assist.status_no_content", "No response from AI"));
      }
    } catch (e: any) {
      setStatusMsg(`${t("assist.status_error", "Error")}: ${e.message || "Transform failed"}`);
      showToast(t("assist.err_transform", "Transform failed"), "error");
    }
    setStep("idle");
  };

  // ─── Apply to locales ───
  const handleApply = async () => {
    if (!editorContent.trim()) { showToast(t("assist.err_empty_editor", "Editor is empty"), "error"); return; }
    try { JSON.parse(editorContent); } catch {
      showToast(t("assist.err_invalid_json", "Invalid JSON — fix before applying"), "error");
      return;
    }
    setStep("applying");
    setStatusMsg(t("assist.status_applying", "Applying..."));
    try {
      await apply.mutateAsync({
        teamId: selectedTeam || undefined,
        section: selectedSection,
        content: editorContent,
        lang,
        autoTranslate,
      });
      utils.locale.getLocales.invalidate();
      setStatusMsg(t("assist.status_applied", "Applied successfully"));
      showToast(t("assist.ok_applied", "Content applied"), "success");
      setPrompt("");
    } catch {
      setStatusMsg(t("assist.status_apply_err", "Apply failed"));
      showToast(t("assist.err_apply", "Apply failed"), "error");
    }
    setStep("idle");
  };

  // ─── Action item form (for "actions" section) ───
  const [actionForm, setActionForm] = useState({ title: "", priority: "medium", due: "", tag: "", tagClass: "feature" });
  const addActionItem = () => {
    if (!actionForm.title.trim()) { showToast(t("assist.err_action_title", "Title is required"), "error"); return; }
    let current: any[] = [];
    try { current = JSON.parse(editorContent); } catch { /* ignore */ }
    if (!Array.isArray(current)) current = [];
    const owner = selectedTeam
      ? (activeTeams.find((t: any) => t.teamId === selectedTeam)?.nameEn || selectedTeam)
      : t("assist.owner_general", "General");
    current.push({
      priority: actionForm.priority,
      title: actionForm.title,
      owner,
      due: actionForm.due,
      tag: actionForm.tag,
      tag_class: actionForm.tagClass,
    });
    setEditorContent(JSON.stringify(current, null, 2));
    setActionForm({ title: "", priority: "medium", due: "", tag: "", tagClass: "feature" });
    showToast(t("assist.action_added", "Action added — Apply or add more"), "success");
  };

  const isActionSection = selectedSection === "actions";
  const isBusy = step === "transforming" || step === "applying";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="hub-card space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--accent)" }}>
          <Sparkles size={15} /> {t("assist.title", "HUB Assist")}
        </h3>
        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          {t("assist.hint_flow", "Team → Section → Load → describe change → Transform → Apply")}
        </p>
      </div>

      {/* ═══════ 3-COLUMN LAYOUT ═══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">

        {/* ─── LEFT: Selectors ─── */}
        <div className="lg:col-span-3 space-y-2.5">

          {/* Team */}
          <div className="hub-card space-y-1.5">
            <label className="text-[10px] font-medium block" style={{ color: "var(--text-secondary)" }}>{t("assist.lbl_team", "Team")}</label>
            <select value={selectedTeam} onChange={(e) => { setSelectedTeam(e.target.value); setIsLoaded(false); }} className="hub-input text-xs w-full" style={{ color: "var(--text-primary)" }}>
              <option value="">{t("assist.opt_overview", "Overview")}</option>
              {activeTeams.map((t: any) => (<option key={t.teamId} value={t.teamId}>{t.nameEn}</option>))}
            </select>
          </div>

          {/* Section */}
          <div className="hub-card space-y-1.5">
            <label className="text-[10px] font-medium block" style={{ color: "var(--text-secondary)" }}>{t("assist.lbl_section", "Section")}</label>
            <div className="grid grid-cols-1 gap-1">
              {ASSIST_SECTION_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => { setSelectedSection(id); setIsLoaded(false); }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded text-xs transition-all"
                  style={{
                    background: selectedSection === id ? "var(--accent-dim)" : "var(--bg-base)",
                    border: `1px solid ${selectedSection === id ? "var(--accent)" : "var(--border-subtle)"}`,
                    color: selectedSection === id ? "var(--accent-text)" : "var(--text-primary)",
                  }}
                >
                  {selectedSection === id ? <Check size={12} /> : <span className="w-3" />}
                  {sectionLabel(id)}
                </button>
              ))}
            </div>
          </div>

          {/* Auto-translate toggle */}
          <label className="flex items-center gap-2 text-xs cursor-pointer p-2 rounded" style={{ color: autoTranslate ? "var(--accent-text)" : "var(--text-muted)", background: autoTranslate ? "var(--accent-dim)" : "transparent", border: `1px solid ${autoTranslate ? "var(--accent-dim)" : "var(--border-subtle)"}` }}>
            <input type="checkbox" checked={autoTranslate} onChange={(e) => setAutoTranslate(e.target.checked)} className="rounded" />
            {t("assist.lbl_auto_tr", "Auto-translate on apply")}
          </label>
        </div>

        {/* ─── CENTRE: Editor + Prompt ─── */}
        <div className="lg:col-span-6 space-y-2.5">

          {/* Breadcrumb */}
          <div className="text-[11px] px-2 py-1 rounded" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            {breadcrumb()}
          </div>

          {/* JSON Editor */}
          <div className="hub-card space-y-2 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{t("assist.lbl_editor", "Editor")}</span>
              {jsonValid !== null && (
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                  background: jsonValid ? "var(--accent-dim)" : "var(--red-dim, rgba(248,81,73,0.15))",
                  color: jsonValid ? "var(--accent-text)" : "var(--red)",
                }}>
                  {jsonValid ? "✓ Valid JSON" : "✗ Invalid JSON"}
                </span>
              )}
            </div>
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              rows={isActionSection ? 10 : 18}
              className="hub-input text-xs w-full font-mono"
              style={{ resize: "vertical", lineHeight: 1.5 }}
              placeholder={t("assist.ph_editor", "Select team and section, then click Load...")}
            />
          </div>

          {/* Action Item Form (only for actions section) */}
          {isActionSection && (
            <div className="hub-card space-y-2">
              <div className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{t("assist.lbl_action_form", "Add Action Item")}</div>
              <div className="grid grid-cols-1 gap-2">
                <input value={actionForm.title} onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })} placeholder={t("assist.ph_action_title", "e.g. Review layout before EVT")} className="hub-input text-xs w-full" />
                <div className="grid grid-cols-4 gap-2">
                  <select value={actionForm.priority} onChange={(e) => setActionForm({ ...actionForm, priority: e.target.value })} className="hub-input text-xs" style={{ color: "var(--text-primary)" }}>
                    <option value="high">{t("priority.high", "High")}</option>
                    <option value="medium">{t("priority.medium", "Medium")}</option>
                    <option value="low">{t("priority.low", "Low")}</option>
                  </select>
                  <input value={actionForm.due} onChange={(e) => setActionForm({ ...actionForm, due: e.target.value })} placeholder={t("assist.ph_due", "Due")} className="hub-input text-xs" />
                  <input value={actionForm.tag} onChange={(e) => setActionForm({ ...actionForm, tag: e.target.value })} placeholder={t("assist.ph_tag", "Tag")} className="hub-input text-xs" />
                  <select value={actionForm.tagClass} onChange={(e) => setActionForm({ ...actionForm, tagClass: e.target.value })} className="hub-input text-xs" style={{ color: "var(--text-primary)" }}>
                    <option value="feature">{t("tag.default", "Default")}</option>
                    <option value="review">{t("tag.review", "Review")}</option>
                    <option value="p0">{t("tag.blocked", "Blocked")}</option>
                    <option value="pending">{t("tag.pending", "Pending")}</option>
                    <option value="p3">{t("tag.done", "Done")}</option>
                  </select>
                </div>
              </div>
              <button onClick={addActionItem} className="hub-btn text-xs w-full">
                + {t("assist.btn_add_action", "Add to List")}
              </button>
            </div>
          )}

          {/* Prompt (hidden for actions section) */}
          {!isActionSection && (
            <div className="hub-card space-y-2 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{t("assist.lbl_prompt", "Prompt")}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "var(--accent-dim)", color: "var(--accent-text)" }}>{lang.toUpperCase()}</span>
              </div>
              <div className="text-[10px] px-2 py-1 rounded" style={{ background: "var(--bg-base)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }}>
                {smartPrefix()}
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="hub-input text-xs w-full"
                style={{ resize: "vertical" }}
                placeholder={t("assist.ph_prompt", "Describe what you want to change...")}
              />
            </div>
          )}
        </div>

        {/* ─── RIGHT: Actions + Status ─── */}
        <div className="lg:col-span-3 space-y-2.5">

          {/* Actions Card */}
          <div className="hub-card space-y-2">
            <div className="text-[10px] font-medium" style={{ color: "var(--text-secondary)" }}>{t("assist.lbl_actions", "Actions")}</div>
            <div className="flex flex-col gap-1.5">
              <button onClick={handleLoad} disabled={isBusy} className="text-xs px-3 py-1.5 rounded disabled:opacity-40" style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "transparent", cursor: isBusy ? "not-allowed" : "pointer" }}>
                ↓ {t("btn.load", "Load")}
              </button>
              <button onClick={handleTransform} disabled={isBusy || (!isActionSection && !prompt.trim())} className="text-xs px-3 py-1.5 rounded disabled:opacity-40" style={{ color: "var(--accent)", border: "1px solid var(--accent)", background: "transparent", cursor: isBusy ? "not-allowed" : "pointer" }}>
                {isBusy && step === "transforming" ? `⏳ ${t("btn.transforming", "...")}` : `⚡ ${t("btn.transform", "Transform")}`}
              </button>
              <button onClick={handleApply} disabled={isBusy || !editorContent.trim()} className="hub-btn text-xs py-1.5 disabled:opacity-40">
                {step === "applying" ? t("btn.applying", "Applying...") : `✓ ${t("btn.apply", "Apply")}`}
              </button>
            </div>
          </div>

          {/* Status Box */}
          {statusMsg && (
            <div className="text-[11px] px-3 py-2 rounded" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {statusMsg}
            </div>
          )}

          {/* Clear button */}
          {isLoaded && (
            <button
              onClick={() => setEditorContent("")}
              className="text-[10px] px-2 py-1 rounded w-full"
              style={{ color: "var(--text-muted)", border: "1px dashed var(--border-subtle)", background: "transparent", cursor: "pointer" }}
            >
              {t("assist.clear", "Clear editor")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══ AI ASSIST TAB ═══
function AIAssistTab() {
  const utils = trpc.useUtils();
  const { data: usage } = trpc.ai.getAllUsage.useQuery();
  const { data: aiUsers } = trpc.ai.getAiUsers.useQuery();
  const toggleAi = trpc.ai.toggleAiAccess.useMutation({ onSuccess: () => utils.ai.getAiUsers.invalidate() });
  const totalCost = (usage || []).reduce((sum: number, u: any) => sum + (u.costCents || 0), 0);
  const totalRequests = (usage || []).reduce((sum: number, u: any) => sum + (u.requestCount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="hub-card text-center"><div className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Total Cost</div><div className="text-xl font-bold" style={{ color: "var(--accent)" }}>¥{(totalCost / 100).toFixed(2)}</div></div>
        <div className="hub-card text-center"><div className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Requests</div><div className="text-xl font-bold" style={{ color: "var(--blue)" }}>{totalRequests}</div></div>
        <div className="hub-card text-center"><div className="text-[10px] font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Users</div><div className="text-xl font-bold" style={{ color: "var(--purple)" }}>{aiUsers?.length || 0}</div></div>
      </div>
      <div className="hub-card">
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>User AI Access</h3>
        <div className="space-y-2">
          {aiUsers?.map((u: any) => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--bg-base)" }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: u.canUseAi ? "var(--accent-dim)" : "var(--bg-hover)", color: u.canUseAi ? "var(--accent-text)" : "var(--text-muted)" }}>{(u.name || u.username)[0].toUpperCase()}</div>
                <div><div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{u.name || u.username}</div><div className="text-[10px]" style={{ color: "var(--text-muted)" }}>{u.role}</div></div>
              </div>
              <button onClick={() => toggleAi.mutate({ userId: u.id, canUseAi: !u.canUseAi })} className="px-3 py-1 rounded text-[10px] font-medium border transition-all" style={{ borderColor: u.canUseAi ? "var(--accent)" : "var(--border)", background: u.canUseAi ? "var(--accent-dim)" : "transparent", color: u.canUseAi ? "var(--accent-text)" : "var(--text-muted)" }}>{u.canUseAi ? "Enabled" : "Disabled"}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
