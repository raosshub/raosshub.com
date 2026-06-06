import { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { useI18nStore } from "@/hooks/useI18n";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import ToastContainer from "@/components/Toast";
import TaskTray from "@/components/TaskTray";
import LoadingScreen from "@/components/LoadingScreen";
import NdaModal from "@/components/NdaModal";
import AiSidebar from "@/components/AiSidebar";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import TeamPage from "@/pages/TeamPage";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import { showToast } from "@/stores/toastStore";

export default function App() {
  const { isAuthenticated, isLoading, user, canUseAi } = useAuth();
  const { setLang } = useI18nStore();
  const [showLoading, setShowLoading] = useState(true);

  // ── NDA ──
  const needsNda = isAuthenticated && user && !user.ndaAccepted;

  // ── Welcome Toast ──
  const toastShownRef = useRef(false);
  const auditMutation = trpc.audit.create.useMutation();

  useEffect(() => {
    const savedLang = localStorage.getItem("hub_lang") || "en";
    setLang(savedLang);
    const savedTheme = localStorage.getItem("hub_theme");
    if (savedTheme === "light") document.documentElement.classList.add("light");
    else document.documentElement.classList.remove("light");
  }, [setLang]);

  useEffect(() => {
    if (user && !toastShownRef.current) {
      toastShownRef.current = true;
      // Fire-and-forget audit log — don't block login if audit fails
      try {
        auditMutation.mutate({
          action: "login",
          resource: "auth",
          recordId: String(user.id),
          newValue: { username: user.username },
        });
      } catch { /* ignore audit failures */ }
      const displayName = user.firstName || user.screenName || user.name || user.username;
      showToast(`Welcome back, ${displayName}!`, "success");
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShowLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (showLoading && isLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      {/* NDA Gate */}
      {needsNda && (
        <NdaGate />
      )}

      {/* Three-column flex: Sidebar | Content | AI Sidebar */}
      <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--bg-base, #0d1117)" }}>
        {/* Left: Navigation + Content */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/team/:teamId/*" element={<TeamPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </div>

        {/* Right: AI Sidebar */}
        {canUseAi && <AiSidebar />}
      </div>

      <ToastContainer />
      <TaskTray />
    </>
  );
}

// ─── NDA Gate ───
// Separate component so it can call the acceptNda mutation
// and properly invalidate the user query before reloading.

function NdaGate() {
  const utils = trpc.useUtils();
  const [isAccepting, setIsAccepting] = useState(false);

  const acceptNda = trpc.auth.acceptNda.useMutation({
    onSuccess: () => {
      // Invalidate user cache so needsNda becomes false
      utils.auth.me.invalidate();
      showToast("NDA accepted — welcome!", "success");
      // Short delay to let the invalidation propagate
      setTimeout(() => window.location.reload(), 300);
    },
    onError: (err) => {
      setIsAccepting(false);
      showToast(err.message || "Failed to accept NDA", "error");
    },
  });

  const handleAccepted = useCallback(() => {
    setIsAccepting(true);
    acceptNda.mutate();
  }, [acceptNda]);

  const handleDeclined = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.reload();
  }, []);

  return (
    <NdaModal
      isAccepting={isAccepting}
      onAccepted={handleAccepted}
      onDeclined={handleDeclined}
    />
  );
}
