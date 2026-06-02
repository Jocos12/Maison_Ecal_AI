import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { en } from '../locales/en.js';
import { fr } from '../locales/fr.js';
import { sw } from '../locales/sw.js';

const dict = { en, fr, sw };

const I18nContext = createContext({
  lang: 'fr',
  t: (key) => key,
  setLang: () => {}
});

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

function getNested(obj, path) {
  return path.split('.').reduce((acc, p) => (acc && acc[p] !== undefined ? acc[p] : undefined), obj);
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = React.useState(() => localStorage.getItem('mecal_lang') || 'fr');

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem('mecal_lang', l);
  }, []);

  const t = useCallback(
    (key, vars) => {
      const table = dict[lang] || dict.fr;
      let val = getNested(table, key);
      if (val === undefined) val = getNested(dict.en, key);
      if (typeof val !== 'string') return key;
      return interpolate(val, vars);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
