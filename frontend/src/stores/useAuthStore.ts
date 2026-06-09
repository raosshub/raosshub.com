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
        } catch (e) {
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
    }),
    {
      name:       'hub_auth',
      partialize: (state) => ({
        user:            state.user,
        token:           state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
