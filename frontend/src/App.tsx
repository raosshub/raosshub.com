import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import './styles/global.css';
import { useAuthStore }   from '@/stores/useAuthStore';
import { useI18nStore }   from '@/stores/useI18nStore';
import { useThemeStore }  from '@/stores/useThemeStore';
import { useConfigStore } from '@/stores/useConfigStore';
import { healthApi, setApiToken, teamApi, authApi } from '@/utils/api';
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

type InitStage = 'loading' | 'login' | 'nda' | 'app';

// ─── System state detection ───────────────────────────────────────────────────
async function detectInitialSetup(): Promise<boolean> {
  try {
    const identity = useConfigStore.getState().identity;
    if (identity.projectName?.trim().length > 0) return false;

    const teamsRes = await teamApi.getAll();
    if ((teamsRes.data?.data ?? []).length > 0) return false;

    const hasNonEnDefault = useI18nStore.getState().languages
      .some(l => l.isDefault && l.code !== 'en');
    if (hasNonEnDefault) return false;

    return true;
  } catch {
    return false;
  }
}

// ─── NDA showMode check ───────────────────────────────────────────────────────
async function applyNdaShowMode(): Promise<void> {
  try {
    const nda = useConfigStore.getState().nda as Record<string, unknown>;
    if (nda.showMode !== 'once') return;
    const res = await authApi.checkNdaAccepted();
    if (res.data?.data === true) {
      useAuthStore.setState({ ndaAccepted: true });
    }
  } catch {
    // Safe default: show the agreement modal
  }
}

// ─── Resolve post-auth stage ──────────────────────────────────────────────────
// Skip nda when: no agreement text configured, or already accepted (once mode).
function resolvePostAuthStage(): InitStage {
  const nda             = useConfigStore.getState().nda as Record<string, unknown>;
  const ndaText         = ((nda.text_en as string) || (nda.text as string) || '').trim();
  const alreadyAccepted = useAuthStore.getState().ndaAccepted;
  return (!ndaText || alreadyAccepted) ? 'app' : 'nda';
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  const { isAuthenticated, fetchMe, ndaAccepted, logout } = useAuthStore();
  const { loadLanguages, loadUiStrings, loadLocale, t }   = useI18nStore();
  const { applyTheme }                                    = useThemeStore();
  const { load: loadConfig }                              = useConfigStore();

  const [initStage,         setInitStage]        = useState<InitStage>('loading');
  const [loadingText,       setLoadingText]       = useState('Initialising...');
  const [, setBackendOnline]                      = useState(false);
  const [needsInitialSetup, setNeedsInitialSetup] = useState(false);

  // Prevents React StrictMode from running the one-time init twice in dev.
  const initRan = useRef(false);

  // ─── One-time init ────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRan.current) return;
    initRan.current = true;

    const init = async () => {
      applyTheme();

      try { await healthApi.check(); setBackendOnline(true); }
      catch { setBackendOnline(false); }

      await loadLanguages();
      await loadUiStrings();
      setLoadingText(t('loading_auth', 'Checking credentials...'));

      const storedToken = localStorage.getItem('hub_token');
      if (storedToken) {
        setApiToken(storedToken);
        try {
          await fetchMe();
          await loadLocale();
          await loadConfig();
          await applyNdaShowMode();
          const needs = await detectInitialSetup();
          setNeedsInitialSetup(needs);
        } catch {
          logout();
        }
      }

      setLoadingText(t('loading_done', 'Ready'));
      setTimeout(() => {
        if (useAuthStore.getState().isAuthenticated) {
          setInitStage(resolvePostAuthStage());
        } else {
          setInitStage('login');
        }
      }, 400);
    };

    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Login → nda/app  |  app/nda → login ─────────────────────────────────
  // `cancelled` cleanup flag prevents React StrictMode's second effect run
  // from completing its async sequence and calling setInitStage a second time,
  // which was causing the login card to appear twice.
  useEffect(() => {
    let cancelled = false;

    if (isAuthenticated && initStage === 'login') {
      (async () => {
        await loadLocale();
        await loadConfig();
        if (cancelled || !useAuthStore.getState().isAuthenticated) return;

        await applyNdaShowMode();
        if (cancelled) return;

        const needs = await detectInitialSetup();
        if (cancelled) return;

        setNeedsInitialSetup(needs);
        setInitStage(resolvePostAuthStage());
      })();
    }

    if (!isAuthenticated && (initStage === 'app' || initStage === 'nda')) {
      setInitStage('login');
      setNeedsInitialSetup(false);
    }

    return () => { cancelled = true; };
  }, [isAuthenticated, initStage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── NDA accepted → app ───────────────────────────────────────────────────
  useEffect(() => {
    if (initStage === 'nda' && ndaAccepted) setInitStage('app');
  }, [ndaAccepted, initStage]);

  // ─── Global logout ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      logout();
      setInitStage('login');
      setNeedsInitialSetup(false);
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Render ───────────────────────────────────────────────────────────────
  if (initStage === 'loading') return <LoadingScreen text={loadingText} />;
  if (initStage === 'login')   return <><LoginScreen /><ToastContainer /></>;

  if (initStage === 'nda') return (
    <>
      <LoginScreen backdropOnly />
      <NDAModal />
      <ToastContainer />
    </>
  );

  if (needsInitialSetup) return (
    <>
      <ToastContainer />
      <InitialSetupPage onComplete={() => setNeedsInitialSetup(false)} />
    </>
  );

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
          <Route path="/admin/initial-setup"           element={<Navigate to="/" replace />}   />
          <Route path="*"                              element={<Navigate to="/" replace />}   />
        </Routes>
      </AppLayout>
    </>
  );
}

export default App;
