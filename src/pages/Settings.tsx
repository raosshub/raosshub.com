import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { trpc } from "@/providers/trpc";
import { showToast } from "@/stores/toastStore";
import { Settings as SettingsIcon, Save, User, Globe, Bell, Shield } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();
  const { lang, setLang, t } = useI18n();
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    screenName: user?.screenName || "",
    email: user?.email || "",
    company: user?.company || "",
    position: user?.position || "",
    mobile: user?.mobile || "",
  });

  const updateUser = trpc.auth.update.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      showToast("Profile updated", "success");
    },
    onError: (err) => showToast(err.message || "Update failed", "error"),
  });

  const handleSave = () => {
    if (!user?.id) return;
    updateUser.mutate({ id: user.id, ...form });
  };

  const handleThemeToggle = () => {
    const html = document.documentElement;
    if (html.classList.contains("light")) {
      html.classList.remove("light");
      localStorage.setItem("hub_theme", "dark");
    } else {
      html.classList.add("light");
      localStorage.setItem("hub_theme", "light");
    }
  };

  return (
    <div className="w-full space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {t("nav.settings", "Settings")}
      </h1>

      {/* Profile */}
      <div className="hub-card space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Profile
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              First Name
            </label>
            <input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="hub-input text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Last Name
            </label>
            <input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="hub-input text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Screen Name
            </label>
            <input
              value={form.screenName}
              onChange={(e) => setForm({ ...form, screenName: e.target.value })}
              className="hub-input text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="hub-input text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Company
            </label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="hub-input text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Position
            </label>
            <input
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
              className="hub-input text-xs w-full"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Mobile
            </label>
            <input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
              className="hub-input text-xs w-full"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateUser.isPending}
          className="hub-btn text-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <Save size={12} />
          {updateUser.isPending ? "Saving…" : "Save Profile"}
        </button>
      </div>

      {/* Preferences */}
      <div className="hub-card space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Preferences
          </h3>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              Language
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Choose your preferred language
            </div>
          </div>
          <div className="flex gap-1">
            {(["en", "zh"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className="px-3 py-1.5 text-[11px] rounded-md font-medium transition-all"
                style={{
                  background: lang === l ? "var(--accent-dim)" : "transparent",
                  color: lang === l ? "var(--accent-text)" : "var(--text-muted)",
                  border: `1px solid ${lang === l ? "var(--accent)" : "var(--border-subtle)"}`,
                }}
              >
                {l === "en" ? "English" : "中文"}
              </button>
            ))}
          </div>
        </div>

        <div
          className="h-px"
          style={{ background: "var(--border-subtle)" }}
        />

        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
              Theme
            </div>
            <div className="text-[10px]" style={{ color: "var(--text-muted)" }}>
              Toggle between dark and light mode
            </div>
          </div>
          <button
            onClick={handleThemeToggle}
            className="px-3 py-1.5 text-[11px] rounded-md font-medium"
            style={{
              background: "var(--bg-base)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            Toggle
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="hub-card space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Security
          </h3>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const { user } = useAuth();

  const changePw = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      showToast("Password changed", "success");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    },
    onError: (err) => showToast(err.message || "Failed", "error"),
  });

  const handleSubmit = () => {
    if (!user?.id) return;
    if (newPw !== confirmPw) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (newPw.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    changePw.mutate({ id: user.id, currentPassword: currentPw, newPassword: newPw });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
          Current Password
        </label>
        <input
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          className="hub-input text-xs w-full sm:w-1/2"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
          New Password
        </label>
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          className="hub-input text-xs w-full sm:w-1/2"
          placeholder="Min 8 characters"
        />
      </div>
      <div>
        <label className="text-[10px] font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
          Confirm New Password
        </label>
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          className="hub-input text-xs w-full sm:w-1/2"
          placeholder="Repeat password"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={changePw.isPending}
        className="hub-btn text-xs disabled:opacity-50"
      >
        {changePw.isPending ? "Changing…" : "Change Password"}
      </button>
    </div>
  );
}
