import { create } from 'zustand';
import type { Language, UiStrings, LocaleContent } from '@/types';
import { i18nApi } from '@/utils/api';

const LANG_STORAGE_KEY = 'hub_lang';

interface I18nState {
  languages:        Language[];
  currentLang:      string;
  defaultLang:      string;
  isRtl:            boolean;
  uiStrings:        UiStrings;
  uiStringsLoading: boolean;
  localeContent:    LocaleContent;
  localeLoading:    boolean;

  setLanguage:    (code: string) => void;
  loadLanguages:  () => Promise<void>;
  loadUiStrings:  (lang?: string) => Promise<void>;
  loadLocale:     (lang?: string) => Promise<void>;
  t:              (key: string, fallback?: string) => string;
  getTeamName:    (teamId: string) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  languages:        [],
  currentLang:      'en',
  defaultLang:      'en',
  isRtl:            false,
  uiStrings:        {},
  uiStringsLoading: false,
  localeContent:    {},
  localeLoading:    false,

  /**
   * Switches the active language, persists the choice to localStorage,
   * and reloads UI strings and locale content.
   */
  setLanguage: (code) => {
    const lang  = get().languages.find((l) => l.code === code);
    const isRtl = lang?.isRtl || false;

    // Persist so login screen and next session use the saved language
    localStorage.setItem(LANG_STORAGE_KEY, code);
    document.documentElement.lang = code;
    document.documentElement.dir  = isRtl ? 'rtl' : 'ltr';

    set({ currentLang: code, isRtl });
    get().loadUiStrings(code);
    get().loadLocale(code);
  },

  /**
   * Loads active languages and resolves the initial language:
   *   1. Saved preference in localStorage (hub_lang)
   *   2. System default language (isDefault = true in DB)
   *   3. English as fallback
   *
   * Sets currentLang so subsequent loadUiStrings() / loadLocale()
   * calls without an explicit lang arg use the correct language.
   */
  loadLanguages: async () => {
    try {
      const res   = await i18nApi.getLanguages();
      const langs: Language[] = res.data.data;

      const def        = langs.find((l) => l.isDefault);
      const saved      = localStorage.getItem(LANG_STORAGE_KEY);
      const isValid    = saved && langs.some((l) => l.code === saved && l.isActive);
      const initial    = isValid ? saved! : (def?.code || 'en');
      const initialLang = langs.find((l) => l.code === initial);

      document.documentElement.lang = initial;
      document.documentElement.dir  = initialLang?.isRtl ? 'rtl' : 'ltr';

      set({
        languages:   langs,
        defaultLang: def?.code || 'en',
        currentLang: initial,
        isRtl:       initialLang?.isRtl || false,
      });
    } catch (e) {
      console.error('[i18n] Failed to load languages:', e);
    }
  },

  loadUiStrings: async (lang?: string) => {
    const code = lang || get().currentLang;
    set({ uiStringsLoading: true });
    try {
      const res = await i18nApi.getUiStrings(code);
      set({ uiStrings: res.data.data, uiStringsLoading: false });
    } catch (e) {
      console.error('[i18n] Failed to load UI strings:', e);
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
      // Silently fails when called before authentication (locale requires auth)
      set({ localeLoading: false });
    }
  },

  t: (key, fallback = '') => {
    const { uiStrings } = get();
    const val = uiStrings[key];
    return val !== undefined && val !== '' ? val : (fallback || key);
  },

  getTeamName: (teamId) => {
    const nav = (get().localeContent as any)?.nav || {};
    return nav[teamId] || teamId;
  },
}));
