import { create } from 'zustand';
import { persist }  from 'zustand/middleware';
import type { User } from '@/types';
import { authApi, setApiToken } from '@/utils/api';

interface AuthState {
  user:            User | null;
  token:           string | null;
  isAuthenticated: boolean;
  isLoading:       boolean;
  ndaAccepted:     boolean;
  login:           (username: string, password: string) => Promise<boolean>;
  logout:          () => void;
  fetchMe:         () => Promise<void>;
  acceptNda:       () => Promise<void>;
  checkNda:        () => Promise<void>;
  setNdaAccepted:  (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      isLoading:       false,
      ndaAccepted:     false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(username, password);
          const { accessToken, user } = res.data.data;
          localStorage.setItem('hub_token', accessToken);
          // Keep _accessToken in api.ts in sync — prevents every subsequent
          // request from getting 401 and needing the refresh dance first.
          setApiToken(accessToken);
          set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        localStorage.removeItem('hub_token');
        localStorage.removeItem('hub_user');
        // Clear in-memory token so future API calls don't send a stale token
        setApiToken(null);
        set({ user: null, token: null, isAuthenticated: false, ndaAccepted: false });
        try { authApi.logout(); } catch { /* best effort */ }
      },

      fetchMe: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data.data, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },

      // ── NDA accept ──────────────────────────────────────────────────────────
      // ROOT CAUSE FIX: the previous implementation awaited the API call before
      // setting ndaAccepted:true. If the JWT was expired at the moment of clicking
      // "I Agree", the POST /auth/nda returned 401, the catch ran, ndaAccepted
      // stayed false, and the NDA modal was stuck permanently.
      //
      // v2 reference: APP._ndaAgreedThisSession = true is set BEFORE the API call.
      // The server call is best-effort audit trail only — it must never block
      // the user from proceeding.
      //
      // Fix: set ndaAccepted:true immediately (optimistic update), then attempt
      // the server call. A network or auth failure is logged but does NOT revert
      // the acceptance — the session acceptance stands.
      acceptNda: async () => {
        // Accept immediately — NDA modal dismisses at once regardless of network
        set({ ndaAccepted: true });
        try {
          await authApi.acceptNda();
        } catch (e) {
          // Server record failed (JWT expired, network error, etc.)
          // The client-side acceptance stands for this session.
          // On next login the NDA will re-appear (login service clears the record),
          // at which point a fresh token will persist it correctly.
          console.warn('[NDA] Server record failed — accepted client-side only:', e);
        }
      },

      // ── NDA status check ────────────────────────────────────────────────────
      // Called during init and after login. Sets ndaAccepted from the server.
      // Catch swallows errors silently — App.tsx auth guard handles auth failures.
      checkNda: async () => {
        try {
          const res = await authApi.ndaStatus();
          set({ ndaAccepted: res.data.data });
        } catch {
          // Auth failure (401): App.tsx guard checks isAuthenticated after this
          // and will route to login rather than showing NDA.
          // Network failure: leave ndaAccepted as false — NDA will show, which is
          // the safe fallback.
          set({ ndaAccepted: false });
        }
      },

      setNdaAccepted: (v: boolean) => set({ ndaAccepted: v }),
    }),
    {
      name: 'hub_auth',
      // ndaAccepted intentionally NOT persisted — must be re-validated from
      // server on every page load. Login service clears the DB record on
      // every login so the NDA appears fresh each session.
      partialize: (state) => ({
        user:            state.user,
        token:           state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
