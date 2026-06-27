import React, { createContext, useContext, useMemo, useCallback, useEffect } from 'react';
import { en } from '../locales/en.js';
import { fr } from '../locales/fr.js';
import { sw } from '../locales/sw.js';
import { enExtended } from '../locales/en-ext.js';
import { frExtended } from '../locales/fr-ext.js';
import { swExtended } from '../locales/sw-ext.js';
import { mergeLocales } from '../locales/mergeLocales.js';

const dict = {
  en: mergeLocales(en, enExtended),
  fr: mergeLocales(fr, frExtended),
  sw: mergeLocales(sw, swExtended)
};

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
    if (!['fr', 'en', 'sw'].includes(l)) return;
    setLangState(l);
    localStorage.setItem('mecal_lang', l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

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
