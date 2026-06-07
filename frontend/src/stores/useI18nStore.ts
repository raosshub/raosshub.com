import { create } from 'zustand';
import type { Language, UiStrings, LocaleContent } from '@/types';
import { i18nApi } from '@/utils/api';

interface I18nState {
  // Languages
  languages: Language[];
  currentLang: string;
  defaultLang: string;
  isRtl: boolean;

  // UI strings
  uiStrings: UiStrings;
  uiStringsLoading: boolean;

  // Locale content
  localeContent: LocaleContent;
  localeLoading: boolean;

  // Actions
  setLanguage: (code: string) => void;
  loadLanguages: () => Promise<void>;
  loadUiStrings: (lang?: string) => Promise<void>;
  loadLocale: (lang?: string) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  getTeamName: (teamId: string) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  languages: [],
  currentLang: 'en',
  defaultLang: 'en',
  isRtl: false,
  uiStrings: {},
  uiStringsLoading: false,
  localeContent: {},
  localeLoading: false,

  setLanguage: (code) => {
    const lang = get().languages.find((l) => l.code === code);
    const isRtl = lang?.isRtl || false;
    document.documentElement.lang = code;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    set({ currentLang: code, isRtl });
    get().loadUiStrings(code);
    get().loadLocale(code);
  },

  loadLanguages: async () => {
    try {
      const res = await i18nApi.getLanguages();
      const langs: Language[] = res.data.data;
      const def = langs.find((l) => l.isDefault);
      set({
        languages: langs,
        defaultLang: def?.code || 'en',
      });
    } catch (e) {
      console.error('Failed to load languages:', e);
    }
  },

  loadUiStrings: async (lang?: string) => {
    const code = lang || get().currentLang;
    set({ uiStringsLoading: true });
    try {
      const res = await i18nApi.getUiStrings(code);
      set({ uiStrings: res.data.data, uiStringsLoading: false });
    } catch (e) {
      console.error('Failed to load UI strings:', e);
      set({ uiStringsLoading: false });
    }
  },

  loadLocale: async (lang?: string) => {
    const code = lang || get().currentLang;
    set({ localeLoading: true });
    try {
      const res = await i18nApi.getLocale(code);
      set({ localeContent: res.data.data as LocaleContent, localeLoading: false });
    } catch (e) {
      console.error('Failed to load locale:', e);
      set({ localeLoading: false });
    }
  },

  t: (key, fallback = '') => {
    const { uiStrings, currentLang, defaultLang } = get();
    const val = uiStrings[key];
    if (val !== undefined && val !== '') return val;
    // Fallback to default language
    if (currentLang !== defaultLang) {
      // Will be loaded separately; for now return fallback
      return fallback || key;
    }
    return fallback || key;
  },

  getTeamName: (teamId) => {
    const { localeContent, currentLang } = get();
    const nav = (localeContent as any)?.nav || {};
    return nav[teamId] || teamId;
  },
}));
