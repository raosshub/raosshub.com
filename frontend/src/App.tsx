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
  const { isAuthenticated, fetchMe, ndaAccepted, checkNda, logout } = useAuthStore();
  const { loadLanguages, loadUiStrings, loadLocale } = useI18nStore();
  const { applyTheme } = useThemeStore();
  const [initStage, setInitStage] = useState<'loading' | 'login' | 'nda' | 'app'>('loading');
  const [loadingText, setLoadingText] = useState('Initialising...');
  const [, setBackendOnline] = useState(false);

  // ─── Initialisation ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      applyTheme();

      // Check backend
      setLoadingText('Checking backend...');
      try {
        await healthApi.check();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }

      // Load languages
      setLoadingText('Loading languages...');
      await loadLanguages();
      await loadUiStrings('en');
      await loadLocale('en');

      // Check auth
      setLoadingText('Checking credentials...');
      const token = localStorage.getItem('hub_token');
      if (token) {
        try {
          await fetchMe();
        } catch {
          logout();
        }
      }

      setLoadingText('Ready');
      setTimeout(() => {
        if (useAuthStore.getState().isAuthenticated) {
          setInitStage('app');
          checkNda();
        } else {
          setInitStage('login');
        }
      }, 400);
    };

    init();
  }, []);

  // ─── Watch auth state changes ────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && initStage === 'login') {
      checkNda().then(() => {
        setInitStage('app');
      });
    }
    if (!isAuthenticated && initStage === 'app') {
      setInitStage('login');
    }
  }, [isAuthenticated]);

  // ─── Loading screen ──────────────────────────────────────────
  if (initStage === 'loading') {
    return <LoadingScreen text={loadingText} />;
  }

  // ─── Login screen ────────────────────────────────────────────
  if (initStage === 'login') {
    return <LoginScreen />;
  }

  // ─── App with NDA check ──────────────────────────────────────
  return (
    <>
      <ToastContainer />
      {!ndaAccepted && isAuthenticated && <NDAModal />}
      <AppLayout>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/team/:teamId" element={<TeamPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/assistant" element={<HubAssistPage />} />
          <Route path="/activity-log" element={<ActivityLogPage />} />
          <Route path="/project-config" element={<ProjectConfigPage />} />
          <Route path="/admin/setup" element={<AdminSetupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
