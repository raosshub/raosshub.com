import { create } from 'zustand';

/**
 * Lightweight UI-level state shared across components.
 * Currently tracks whether Tab 2 (Language & Translation) is running
 * a Kimi translation — used to guard navigation in AppLayout and AdminSetupPage.
 */
interface UIState {
  translationRunning: boolean;
  setTranslationRunning: (v: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  translationRunning:    false,
  setTranslationRunning: (v) => set({ translationRunning: v }),
}));
