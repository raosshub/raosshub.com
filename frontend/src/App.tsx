import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './styles/global.css';
import { useAuthStore } from '@/stores/useAuthStore';
import { useI18nStore } from '@/stores/useI18nStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { healthApi } from '@/utils/api';
import LoadingScreen from '@/components/LoadingScreen';
import LoginScreen from '@/components/LoginScreen';
import NDAModal from '@/components/NDAModal';
import AppLayout from '@/components/AppLayout';
import ToastContainer from '@/components/ToastContainer';
import OverviewPage from '@/pages/OverviewPage';
import TeamPage from '@/pages/TeamPage';
import SettingsPage from '@/pages/SettingsPage';
import HubAssistPage from '@/pages/HubAssistPage';
import ActivityLogPage from '@/pages/ActivityLogPage';
import ProjectConfigPage from '@/pages/ProjectConfigPage';
import AdminSetupPage from '@/pages/admin/AdminSetupPage';

function App() {
  const {
    isAuthenticated,
    silentRefresh,
    fetchMe,
    ndaAccepted,
    checkNda,
    logout,
  } = useAuthStore();

  const { loadLanguages, loadUiStrings, loadLocale, currentLang } = useI18nStore();
  const { applyTheme } = useThemeStore();

  const [initStage, setInitStage] = useState<'loading' | 'login' | 'app'>('loading');
  const [loadingText, setLoadingText] = useState('Initialising...');

  // ─── Listen for forced logout from the Axios 401 interceptor ─────────────
  // Fires when the refresh cookie is expired or invalid and the interceptor
  // cannot recover. Transitions to login without a hard page reload.
  useEffect(() => {
    const handleForceLogout = () => {
      logout();
      setInitStage('login');
    };
    window.addEventListener('auth:logout', handleForceLogout);
    return () => window.removeEventListener('auth:logout', handleForceLogout);
  }, [logout]);

  // ─── Initialisation ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      applyTheme();

      // 1. Backend health check (non-blocking — app still works without it)
      setLoadingText('Checking backend...');
      try { await healthApi.check(); } catch { /* continue */ }

      // 2. Load languages and UI strings — these are public endpoints.
      //    UI strings are needed by the login screen to render translated labels.
      //    Locale content (/api/locales/**) is authenticated — loaded after auth below.
      setLoadingText('Loading languages...');
      await loadLanguages();
      await loadUiStrings('en');

      // 3. Attempt silent re-authentication via the httpOnly refresh cookie.
      //    If the user has a valid session from a previous login, this restores
      //    the access token in memory without showing the login screen.
      setLoadingText('Checking credentials...');
      const refreshed = await silentRefresh();

      if (refreshed) {
        // 4a. Cookie was valid — fetch the current user profile.
        await fetchMe();

        // 4b. Load locale content now that we are authenticated.
        //     This is safe to call here because the access token is in memory.
        await loadLocale(currentLang || 'en');

        setLoadingText('Ready');
        setTimeout(() => {
          setInitStage('app');
          checkNda();
        }, 400);
      } else {
        // 4b. No valid cookie — show login.
        setLoadingText('Ready');
        setTimeout(() => setInitStage('login'), 400);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── React to auth state changes after init ───────────────────────────────
  // Handles the case where the user logs in via the LoginScreen (setInitStage
  // moves from 'login' → 'app') or gets logged out (any stage → 'login').
  useEffect(() => {
    if (isAuthenticated && initStage === 'login') {
      // User just logged in — load locale content now
      loadLocale(currentLang || 'en').then(() => {
        checkNda().then(() => setInitStage('app'));
      });
    }
    if (!isAuthenticated && initStage === 'app') {
      setInitStage('login');
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render stages ───────────────────────────────────────────────────────

  if (initStage === 'loading') {
    return <LoadingScreen text={loadingText} />;
  }

  if (initStage === 'login') {
    return <LoginScreen />;
  }

  return (
    <>
      <ToastContainer />
      {!ndaAccepted && isAuthenticated && <NDAModal />}
      <AppLayout>
        <Routes>
          <Route path="/"              element={<OverviewPage />} />
          <Route path="/team/:teamId"  element={<TeamPage />} />
          <Route path="/settings"      element={<SettingsPage />} />
          <Route path="/assistant"     element={<HubAssistPage />} />
          <Route path="/activity-log"  element={<ActivityLogPage />} />
          <Route path="/project-config" element={<ProjectConfigPage />} />
          <Route path="/admin/setup"   element={<AdminSetupPage />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
