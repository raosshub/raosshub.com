import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { authApi, setApiToken } from '@/utils/api';

interface AuthState {
  user: User | null;
  // token is intentionally NOT persisted — it lives in memory only.
  // On page reload, silentRefresh() re-issues a token via the httpOnly cookie.
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  ndaAccepted: boolean;

  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  silentRefresh: () => Promise<boolean>;
  acceptNda: () => Promise<void>;
  checkNda: () => Promise<void>;
  setNdaAccepted: (v: boolean) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,
      isLoading:       false,
      ndaAccepted:     false,

      // ─── Login ──────────────────────────────────────────────────────────
      // Backend sets the refresh token as an httpOnly cookie.
      // We store only the access token in Zustand memory (not localStorage).

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(username, password);
          const { accessToken, user } = res.data.data;
          setApiToken(accessToken);
          set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      // ─── Logout ─────────────────────────────────────────────────────────
      // Calls the backend to clear the httpOnly cookie, then wipes local state.
      // Best-effort: even if the API call fails, local state is always cleared.

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore — the cookie may already be expired.
          // Local state is always cleared regardless.
        }
        setApiToken(null);
        // Clear the legacy hub_token key if it was left by an older session
        localStorage.removeItem('hub_token');
        set({
          user:            null,
          token:           null,
          isAuthenticated: false,
          ndaAccepted:     false,
        });
      },

      // ─── Silent refresh ─────────────────────────────────────────────────
      // Called on every page load before showing the app.
      // Uses native fetch with credentials: 'include' so the httpOnly refresh
      // cookie is sent automatically. Does NOT go through the Axios instance
      // to avoid triggering the 401 interceptor during initialization.
      // Returns true if a valid session was restored, false otherwise.

      silentRefresh: async () => {
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });

          if (!res.ok) {
            set({ user: null, token: null, isAuthenticated: false });
            return false;
          }

          const data = await res.json();
          const accessToken = data?.data?.accessToken;
          const user        = data?.data?.user;

          if (!accessToken) {
            set({ user: null, token: null, isAuthenticated: false });
            return false;
          }

          setApiToken(accessToken);
          set({ token: accessToken, isAuthenticated: true, ...(user ? { user } : {}) });
          return true;

        } catch {
          set({ user: null, token: null, isAuthenticated: false });
          return false;
        }
      },

      // ─── Fetch current user ─────────────────────────────────────────────
      fetchMe: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data.data, isAuthenticated: true });
        } catch {
          await get().logout();
        }
      },

      // ─── NDA ────────────────────────────────────────────────────────────
      acceptNda: async () => {
        try {
          await authApi.acceptNda();
          set({ ndaAccepted: true });
        } catch (e) {
          console.error('NDA accept failed:', e);
        }
      },

      checkNda: async () => {
        try {
          const res = await authApi.ndaStatus();
          set({ ndaAccepted: res.data.data });
        } catch {
          set({ ndaAccepted: false });
        }
      },

      setNdaAccepted: (v) => set({ ndaAccepted: v }),

      // Called by the Axios 401 interceptor after a successful background refresh
      setToken: (token) => {
        setApiToken(token);
        set({ token, isAuthenticated: true });
      },
    }),
    {
      name: 'hub_auth',
      // Only persist user info and auth state — NOT the token.
      // token lives in memory only. On reload, silentRefresh() restores it
      // via the httpOnly cookie without ever touching localStorage.
      partialize: (state) => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
