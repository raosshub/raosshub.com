import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './styles/global.css';
import { useAuthStore }   from '@/stores/useAuthStore';
import { useI18nStore }   from '@/stores/useI18nStore';
import { useThemeStore }  from '@/stores/useThemeStore';
import { healthApi, setApiToken } from '@/utils/api';
import LoadingScreen      from '@/components/LoadingScreen';
import LoginScreen        from '@/components/LoginScreen';
import NDAModal           from '@/components/NDAModal';
import AppLayout          from '@/components/AppLayout';
import ToastContainer     from '@/components/ToastContainer';
import OverviewPage       from '@/pages/OverviewPage';
import TeamPage           from '@/pages/TeamPage';
import SettingsPage       from '@/pages/SettingsPage';
import HubAssistPage      from '@/pages/HubAssistPage';
import ActivityLogPage    from '@/pages/ActivityLogPage';
import ProjectConfigPage  from '@/pages/ProjectConfigPage';
import AdminSetupPage     from '@/pages/admin/AdminSetupPage';

// Three init stages only — NDAModal renders as overlay on the app stage.
type InitStage = 'loading' | 'login' | 'app';

function App() {
  const { isAuthenticated, fetchMe, ndaAccepted, checkNda, logout } = useAuthStore();
  const { loadLanguages, loadUiStrings, loadLocale }                 = useI18nStore();
  const { applyTheme }                                               = useThemeStore();

  const [initStage,   setInitStage]   = useState<InitStage>('loading');
  const [loadingText, setLoadingText] = useState('Initialising...');
  const [, setBackendOnline]          = useState(false);

  // ─── Initialisation ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      applyTheme();

      setLoadingText('Checking backend...');
      try { await healthApi.check(); setBackendOnline(true); }
      catch { setBackendOnline(false); }

      // Resolve language from localStorage or DB default, then load UI strings
      setLoadingText('Loading languages...');
      await loadLanguages();
      await loadUiStrings();

      // ── Hard-refresh fix ────────────────────────────────────────────────
      // api.ts uses module-level _accessToken which resets to null on every
      // page load. Without this line, every API call would get 401 and wait
      // for the Axios refresh dance before succeeding. Setting it here
      // immediately means fetchMe() and loadLocale() work on the first try.
      // If the token is expired the backend returns 401 anyway, the Axios
      // interceptor fires, refreshes, and updates _accessToken with a new one.
      setLoadingText('Checking credentials...');
      const storedToken = localStorage.getItem('hub_token');
      if (storedToken) {
        setApiToken(storedToken); // set in memory immediately — no 401 dance needed
        try {
          await fetchMe();
          // Locale content requires auth — load only after successful fetchMe.
          // loadLocale falls back to EN if the selected language has no content.
          await loadLocale();
        } catch {
          logout();
        }
      }

      setLoadingText('Ready');
      setTimeout(() => {
        if (useAuthStore.getState().isAuthenticated) {
          checkNda();
          setInitStage('app');
        } else {
          setInitStage('login');
        }
      }, 400);
    };

    init();
  }, []);

  // ─── Login → app transition ────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && initStage === 'login') {
      loadLocale().then(() => { checkNda(); setInitStage('app'); });
    }
    if (!isAuthenticated && initStage === 'app') {
      setInitStage('login');
    }
  }, [isAuthenticated]);

  // ─── Global logout event ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => { logout(); setInitStage('login'); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────
  if (initStage === 'loading') return <LoadingScreen text={loadingText} />;
  if (initStage === 'login')   return <><LoginScreen /><ToastContainer /></>;

  // NDAModal is an overlay on the app — when ndaAccepted flips to true the
  // overlay disappears; AppLayout is always mounted in the app stage.
  return (
    <>
      <ToastContainer />
      {isAuthenticated && !ndaAccepted && <NDAModal />}
      <AppLayout>
        <Routes>
          <Route path="/"             element={<OverviewPage />}      />
          <Route path="/team/:teamId" element={<TeamPage />}          />
          <Route path="/settings"     element={<SettingsPage />}      />
          <Route path="/assistant"    element={<HubAssistPage />}     />
          <Route path="/activity-log" element={<ActivityLogPage />}   />
          <Route path="/config"       element={<ProjectConfigPage />} />
          <Route path="/admin/setup"  element={<AdminSetupPage />}    />
          <Route path="*"             element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
