import { create } from "zustand";
import { trpc } from "@/providers/trpc";
import { useEffect, useMemo } from "react";

interface I18nState {
  lang: string;
  locales: Record<string, Record<string, any>>;
  setLang: (lang: string) => void;
  setLocales: (lang: string, data: Record<string, any>) => void;
  t: (key: string, fallback?: string) => string;
}

export const useI18nStore = create<I18nState>((set, get) => ({
  lang: localStorage.getItem("hub_lang") || "en",
  locales: {},
  setLang: (lang: string) => {
    localStorage.setItem("hub_lang", lang);
    set({ lang });
  },
  setLocales: (lang: string, data: Record<string, any>) =>
    set((s) => ({ locales: { ...s.locales, [lang]: data } })),
  t: (key: string, fallback?: string) => {
    const { locales, lang } = get();
    const val: any = key.split(".").reduce((obj: any, k) => obj?.[k], locales[lang]);
    if (val != null && val !== "") return String(val);
    const enVal: any = key.split(".").reduce((obj: any, k) => obj?.[k], locales["en"]);
    if (enVal != null && enVal !== "") return String(enVal);
    return fallback || key;
  },
}));

export function useI18n() {
  const store = useI18nStore();

  const { data: serverLocales } = trpc.locale.getLocales.useQuery(
    { projectId: 1, lang: store.lang },
    { enabled: !!store.lang, staleTime: 1000 * 60 * 10 }
  );

  // CRITICAL: useEffect prevents setState during render
  useEffect(() => {
    if (serverLocales && Object.keys(serverLocales).length > 0) {
      useI18nStore.getState().setLocales(store.lang, serverLocales);
    }
  }, [serverLocales, store.lang]);

  // Memoized to prevent re-renders
  return useMemo(
    () => ({
      lang: store.lang,
      setLang: store.setLang,
      t: store.t,
      locales: store.locales,
    }),
    [store.lang]
  );
}
