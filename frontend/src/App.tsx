import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './styles/global.css';
import { useAuthStore }   from '@/stores/useAuthStore';
import { useI18nStore }   from '@/stores/useI18nStore';
import { useThemeStore }  from '@/stores/useThemeStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { healthApi, setApiToken, teamApi } from '@/utils/api';
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
import AdminSetupPage               from '@/pages/admin/AdminSetupPage';
import InitialSetupPage             from '@/pages/admin/InitialSetupPage';
import ChangeDefaultLanguagePage    from '@/pages/admin/ChangeDefaultLanguagePage';

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

// ─── System state detection ───────────────────────────────────────────────────
//
// Runs once per login after loadConfig() + loadLanguages() have both settled.
// Returns true only when ALL THREE conditions are met:
//   A. config.identity.projectName is blank (system never configured)
//   B. No teams exist
//   C. No non-EN language is set as the default
//
// Detection is session-only — not persisted across page loads.
//
async function detectInitialSetup(): Promise<boolean> {
  try {
    // Condition A — no project name in identity
    const identity = useConfigStore.getState().identity;
    const hasProjectName = identity.projectName?.trim().length > 0;
    if (hasProjectName) return false;

    // Condition B — no teams
    const teamsRes = await teamApi.getAll();
    const teams = teamsRes.data?.data ?? [];
    if (teams.length > 0) return false;

    // Condition C — no non-EN default language
    const languages = useI18nStore.getState().languages;
    const hasNonEnDefault = languages.some(l => l.isDefault && l.code !== 'en');
    if (hasNonEnDefault) return false;

    return true;
  } catch {
    // If detection fails for any reason, do not trigger initial setup
    return false;
  }
}

function App() {
  const { isAuthenticated, fetchMe, ndaAccepted, logout } = useAuthStore();
  const { loadLanguages, loadUiStrings, loadLocale, t }   = useI18nStore();
  const { applyTheme }                                    = useThemeStore();
  const { load: loadConfig }                              = useConfigStore();

  const [initStage,        setInitStage]        = useState<InitStage>('loading');
  const [loadingText,      setLoadingText]      = useState('Initialising...');
  const [, setBackendOnline]                    = useState(false);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);

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
          // ── Initial setup detection (page refresh with stored token) ────
          const needs = await detectInitialSetup();
          setNeedsInitialSetup(needs);
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
        // ── Initial setup detection (fresh login) ────────────────────────
        const needs = await detectInitialSetup();
        setNeedsInitialSetup(needs);
        setInitStage('nda');
      })();
    }
    if (!isAuthenticated && (initStage === 'app' || initStage === 'nda')) {
      setInitStage('login');
      setNeedsInitialSetup(false); // reset on logout
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
    const handler = () => { logout(); setInitStage('login'); setNeedsInitialSetup(false); };
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

  // ── Initial setup: system is fresh — show full-page wizard ────────────────
  // Renders outside AppLayout (no sidebar, no topbar).
  // onComplete() clears the flag and the normal app renders.
  if (needsInitialSetup) {
    return (
      <>
        <ToastContainer />
        <InitialSetupPage onComplete={() => setNeedsInitialSetup(false)} />
      </>
    );
  }

  // App stage: NDA accepted this session (guaranteed by stage machine above).
  return (
    <>
      <ToastContainer />
      <AppLayout>
        <Routes>
          <Route path="/"                              element={<OverviewPage />}               />
          <Route path="/team/:teamId"                  element={<TeamPage />}                   />
          <Route path="/settings"                      element={<SettingsPage />}               />
          <Route path="/assistant"                     element={<HubAssistPage />}              />
          <Route path="/activity-log"                  element={<ActivityLogPage />}            />
          <Route path="/config"                        element={<ProjectConfigPage />}          />
          <Route path="/admin/setup"                   element={<AdminSetupPage />}             />
          <Route path="/admin/change-default-language" element={<ChangeDefaultLanguagePage />} />
          {/* /admin/initial-setup is only reachable via detection — redirect direct access */}
          <Route path="/admin/initial-setup"           element={<Navigate to="/" replace />}   />
          <Route path="*"                              element={<Navigate to="/" replace />}   />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
