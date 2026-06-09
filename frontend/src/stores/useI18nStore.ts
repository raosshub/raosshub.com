import { create } from 'zustand';
import type { Language, UiStrings, LocaleContent } from '@/types';
import { i18nApi } from '@/utils/api';

const LANG_KEY = 'hub_lang';

interface I18nState {
  languages:          Language[];
  currentLang:        string;
  defaultLang:        string;
  isRtl:              boolean;
  uiStrings:          UiStrings;
  defaultLangStrings: UiStrings;
  uiStringsLoading:   boolean;
  localeContent:      LocaleContent;
  localeLoading:      boolean;
  setLanguage:   (code: string) => void;
  loadLanguages: () => Promise<void>;
  loadUiStrings: (lang?: string) => Promise<void>;
  loadLocale:    (lang?: string) => Promise<void>;
  t:             (key: string, fallback?: string) => string;
  getTeamName:   (teamId: string) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  languages:          [],
  currentLang:        'en',
  defaultLang:        'en',
  isRtl:              false,
  uiStrings:          {},
  defaultLangStrings: {},
  uiStringsLoading:   false,
  localeContent:      {},
  localeLoading:      false,

  setLanguage: (code) => {
    const lang  = get().languages.find(l => l.code === code);
    const isRtl = lang?.isRtl || false;
    localStorage.setItem(LANG_KEY, code);
    document.documentElement.lang = code;
    document.documentElement.dir  = isRtl ? 'rtl' : 'ltr';
    set({ currentLang: code, isRtl });
    get().loadUiStrings(code);
    get().loadLocale(code);
  },

  loadLanguages: async () => {
    try {
      const res   = await i18nApi.getLanguages();
      const langs: Language[] = res.data.data || [];
      const def        = langs.find(l => l.isDefault);
      const saved      = localStorage.getItem(LANG_KEY);
      const isValid    = saved && langs.some(l => l.code === saved && l.isActive);
      const initial    = isValid ? saved! : (def?.code || 'en');
      const initialLang = langs.find(l => l.code === initial);
      document.documentElement.lang = initial;
      document.documentElement.dir  = initialLang?.isRtl ? 'rtl' : 'ltr';
      set({ languages: langs, defaultLang: def?.code || 'en', currentLang: initial, isRtl: initialLang?.isRtl || false });
    } catch (e) {
      console.error('[i18n] loadLanguages failed:', e);
    }
  },

  // Loads current lang AND default lang strings in parallel.
  // defaultLangStrings is the second level of the t() fallback chain.
  loadUiStrings: async (lang?: string) => {
    const code        = lang || get().currentLang;
    const defaultLang = get().defaultLang;
    set({ uiStringsLoading: true });
    try {
      if (code === defaultLang) {
        const res     = await i18nApi.getUiStrings(code);
        const strings = res.data.data || {};
        set({ uiStrings: strings, defaultLangStrings: strings, uiStringsLoading: false });
      } else {
        const [cur, def] = await Promise.allSettled([
          i18nApi.getUiStrings(code),
          i18nApi.getUiStrings(defaultLang),
        ]);
        const curStrings = cur.status === 'fulfilled' ? (cur.value?.data?.data || {}) : {};
        const defStrings = def.status === 'fulfilled' ? (def.value?.data?.data || {}) : {};
        set({ uiStrings: curStrings, defaultLangStrings: defStrings, uiStringsLoading: false });
      }
    } catch {
      set({ uiStringsLoading: false });
    }
  },

  // Falls back to defaultLang locale content if current lang has none.
  loadLocale: async (lang?: string) => {
    const code        = lang || get().currentLang;
    const defaultLang = get().defaultLang;
    set({ localeLoading: true });
    try {
      const res  = await i18nApi.getLocale(code);
      const data = res.data.data;
      if (code === defaultLang) {
        set({ localeContent: (data || {}) as LocaleContent, localeLoading: false });
        return;
      }
      const isEmpty = !data || Object.keys(data).length === 0;
      if (isEmpty) {
        try {
          const defRes = await i18nApi.getLocale(defaultLang);
          set({ localeContent: (defRes.data.data || {}) as LocaleContent, localeLoading: false });
        } catch {
          set({ localeContent: {}, localeLoading: false });
        }
      } else {
        set({ localeContent: data as LocaleContent, localeLoading: false });
      }
    } catch {
      set({ localeLoading: false });
    }
  },

  // Fallback chain: current lang → default lang → hardcoded param.
  // NEVER returns the raw key — always returns a human-readable string.
  // Rule: every t() call MUST provide a meaningful English fallback as 2nd arg.
  t: (key, fallback = '') => {
    const { uiStrings, defaultLangStrings } = get();
    const val = uiStrings[key];
    if (val !== undefined && val !== '') return val;
    const defVal = defaultLangStrings[key];
    if (defVal !== undefined && defVal !== '') return defVal;
    // Never return raw key — return hardcoded EN fallback
    return fallback;
  },

  getTeamName: (teamId) => {
    const nav = (get().localeContent as any)?.nav || {};
    return nav[teamId] || teamId;
  },
}));
