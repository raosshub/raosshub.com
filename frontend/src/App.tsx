import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './styles/global.css';
import { useAuthStore }   from '@/stores/useAuthStore';
import { useI18nStore }   from '@/stores/useI18nStore';
import { useThemeStore }  from '@/stores/useThemeStore';
import { useConfigStore } from '@/stores/useConfigStore';
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

// ─── Init stage machine ───────────────────────────────────────────────────────
//
//   loading → login   no stored token, or token + refresh both invalid
//   loading → nda     valid session (token or refreshed via cookie)
//   login   → nda     user just logged in
//   nda     → app     user accepted NDA this session
//   nda     → login   user declined NDA (logout fires)
//   app     → login   user logs out or session fully expires
//
// NDA is shown on EVERY page load and EVERY login — matching v2 session
// behaviour where APP._ndaAgreedThisSession reset on each full page load.
// ndaAccepted is not persisted in Zustand; it starts false on every load.
// checkNda() (server DB read) is NOT called here — acceptance is in-memory
// only. POST /auth/nda fires as an audit trail after acceptance.
//
type InitStage = 'loading' | 'login' | 'nda' | 'app';

function App() {
  const { isAuthenticated, fetchMe, ndaAccepted, logout } = useAuthStore();
  const { loadLanguages, loadUiStrings, loadLocale, t }   = useI18nStore();
  const { applyTheme }                                    = useThemeStore();
  const { load: loadConfig }                              = useConfigStore();

  const [initStage,   setInitStage]   = useState<InitStage>('loading');
  const [loadingText, setLoadingText] = useState('Initialising...');
  const [, setBackendOnline]          = useState(false);

  // ─── One-time initialisation ───────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // applyTheme() is the first thing — keeps body.light-mode in sync with
      // the Zustand store for the rare case where the inline index.html script
      // and the store drift (e.g. localStorage was set outside of this app).
      applyTheme();

      try { await healthApi.check(); setBackendOnline(true); }
      catch { setBackendOnline(false); }

      // Load UI strings first — t() is ready after this point.
      await loadLanguages();
      await loadUiStrings();

      setLoadingText(t('loading_auth', 'Checking credentials...'));

      // ── Hard-refresh: prime in-memory token ─────────────────────────────
      // api.ts keeps _accessToken in a module-level variable that resets to
      // null on every page load. Setting it here prevents an unnecessary
      // 401→refresh roundtrip on the very first authenticated API call.
      const storedToken = localStorage.getItem('hub_token');
      if (storedToken) {
        setApiToken(storedToken);
        try {
          await fetchMe();
          await loadLocale();
          await loadConfig(); // NDA text + identity ready before NDA modal shows
        } catch {
          logout();
        }
      }

      setLoadingText(t('loading_done', 'Ready'));

      // ── Route to nda or login ────────────────────────────────────────────
      // NDA is never checked against the server here.
      // ndaAccepted starts false on every page load (not persisted) so the
      // nda stage is always entered for authenticated sessions — matching v2.
      setTimeout(() => {
        if (useAuthStore.getState().isAuthenticated) {
          setInitStage('nda');
        } else {
          setInitStage('login');
        }
      }, 400);
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Login → nda / app → login transitions ────────────────────────────────
  useEffect(() => {
    if (isAuthenticated && initStage === 'login') {
      (async () => {
        await loadLocale();
        await loadConfig(); // config (NDA text) ready before NDA modal shows
        // Auth guard: loadLocale/loadConfig make API calls; if the token
        // expired between login() and here, auth:logout fired and logout()
        // set isAuthenticated=false. Don't advance to nda in that case.
        if (!useAuthStore.getState().isAuthenticated) return;
        setInitStage('nda');
      })();
    }
    if (!isAuthenticated && (initStage === 'app' || initStage === 'nda')) {
      setInitStage('login');
    }
  }, [isAuthenticated, initStage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── NDA accepted → app ───────────────────────────────────────────────────
  // acceptNda() in useAuthStore sets ndaAccepted:true optimistically (before
  // the API responds). This effect catches that flip and advances the stage.
  useEffect(() => {
    if (initStage === 'nda' && ndaAccepted) {
      setInitStage('app');
    }
  }, [ndaAccepted, initStage]);

  // ─── Global logout (fired by Axios interceptor on 401 after refresh fails) ─
  useEffect(() => {
    const handler = () => { logout(); setInitStage('login'); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ───────────────────────────────────────────────────────────────
  if (initStage === 'loading') return <LoadingScreen text={loadingText} />;
  if (initStage === 'login')   return <><LoginScreen /><ToastContainer /></>;

  // NDA stage: NDAModal overlaid on a visual backdrop.
  // AppLayout does NOT mount — no dashboard API calls until NDA is accepted.
  // Decline → logout() → isAuthenticated flips false → effect above → login.
  //
  // LoginScreen receives backdropOnly={true} — renders only the dark background
  // + mesh grid, no card, no form, no inputs. Chrome autofill detects <input>
  // elements in the DOM regardless of z-index or inert; the only reliable fix
  // is to not have inputs in the DOM at all.
  if (initStage === 'nda') return (
    <>
      <LoginScreen backdropOnly />
      <NDAModal />
      <ToastContainer />
    </>
  );

  // App stage: NDA accepted this session (guaranteed by stage machine above).
  return (
    <>
      <ToastContainer />
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
