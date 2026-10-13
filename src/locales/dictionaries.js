import { en } from './en.js';
import { fr } from './fr.js';
import { sw } from './sw.js';
import { enExtended } from './en-ext.js';
import { frExtended } from './fr-ext.js';
import { swExtended } from './sw-ext.js';
import { mergeLocales } from './mergeLocales.js';

/** All interface languages, complete. Also used by the global search to match text in every language. */
export const dictionaries = {
  en: mergeLocales(en, enExtended),
  fr: mergeLocales(fr, frExtended),
  sw: mergeLocales(sw, swExtended)
};

export const LANGUAGE_CODES = ['fr', 'en', 'sw'];

function getNested(obj, path) {
  return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

/** The text of a translation key in every language (missing ones are skipped). */
export function translationsOf(key) {
  return LANGUAGE_CODES.map((code) => getNested(dictionaries[code], key)).filter(
    (value) => typeof value === 'string' && value
  );
}
