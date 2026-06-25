import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import ru from '../locales/ru.json';
import en from '../locales/en.json';
import { LANG_STORAGE_KEY } from '../utils/constants';
import type { Lang } from '../types';

const DICTIONARIES: Record<Lang, any> = { ru, en };

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function resolveKey(dict: any, key: string): unknown {
  return key.split('.').reduce<any>((acc, part) => (acc != null ? acc[part] : undefined), dict);
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.keys(vars).reduce(
    (str, varKey) => str.replace(new RegExp(`{{${varKey}}}`, 'g'), String(vars[varKey])),
    template
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_STORAGE_KEY) as Lang | null;
    return saved === 'ru' || saved === 'en' ? saved : 'ru';
  });

  useEffect(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggleLang = useCallback(() => setLangState((prev) => (prev === 'ru' ? 'en' : 'ru')), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const primary = resolveKey(DICTIONARIES[lang], key);
      const fallback = resolveKey(DICTIONARIES.ru, key);
      const value = typeof primary === 'string' ? primary : typeof fallback === 'string' ? fallback : key;
      return interpolate(value, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, toggleLang, t }), [lang, setLang, toggleLang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
