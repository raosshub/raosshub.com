import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeState {
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  toggleTheme: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  applyTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      sidebarCollapsed: false,

      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        document.body.classList.toggle('light-mode', next === 'light');
        set({ theme: next });
      },

      toggleSidebar: () => {
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed }));
      },

      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      applyTheme: () => {
        const { theme } = get();
        document.body.classList.toggle('light-mode', theme === 'light');
      },
    }),
    {
      name: 'hub_theme',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
