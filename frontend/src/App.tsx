import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './styles/global.css';
import { useAuthStore }   from '@/stores/useAuthStore';
import { useI18nStore }   from '@/stores/useI18nStore';
import { useThemeStore }  from '@/stores/useThemeStore';
import { healthApi }      from '@/utils/api';
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

// initStage has three states only — there is NO separate 'nda' stage.
// NDAModal renders as a modal overlay on top of AppLayout.
// When acceptNda() sets ndaAccepted = true, the overlay condition becomes
// false and the modal disappears. AppLayout is already mounted underneath.
// A separate 'nda' stage causes the stuck bug: nothing ever transitions out.
type InitStage = 'loading' | 'login' | 'app';

function App() {
  const { isAuthenticated, fetchMe, ndaAccepted, checkNda, logout } = useAuthStore();
  const { loadLanguages, loadUiStrings, loadLocale }                 = useI18nStore();
  const { applyTheme }                                               = useThemeStore();

  const [initStage,   setInitStage]   = useState<InitStage>('loading');
  const [loadingText, setLoadingText] = useState('Initialising...');
  const [, setBackendOnline]          = useState(false);

  useEffect(() => {
    const init = async () => {
      applyTheme();

      setLoadingText('Checking backend...');
      try { await healthApi.check(); setBackendOnline(true); }
      catch { setBackendOnline(false); }

      setLoadingText('Loading languages...');
      await loadLanguages();
      await loadUiStrings();

      setLoadingText('Checking credentials...');
      const token = localStorage.getItem('hub_token');
      if (token) {
        try {
          await fetchMe();
          await loadLocale();
        } catch { logout(); }
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

  useEffect(() => {
    if (isAuthenticated && initStage === 'login') {
      loadLocale().then(() => { checkNda(); setInitStage('app'); });
    }
    if (!isAuthenticated && initStage === 'app') {
      setInitStage('login');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handler = () => { logout(); setInitStage('login'); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  if (initStage === 'loading') return <LoadingScreen text={loadingText} />;
  if (initStage === 'login')   return <><LoginScreen /><ToastContainer /></>;

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
