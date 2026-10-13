// The app never shows the long dash: wherever it appears in a text (a title scraped from a website, a text
// written by the AI, a name stored long ago) it is shown as a comma.
const LONG_DASH = /\s*\u2014\s*/g;
const KEEP_AS_IS = /(url|href|link|token|email|password)|(^id$|_id$|Id$)/i;

export function noDash(value) {
  return typeof value === 'string' && value.includes('\u2014') ? value.replace(LONG_DASH, ', ') : value;
}

/** Same thing for every text of an object coming from the server (links, ids and secrets are left alone). */
export function cleanDeep(value, key = '') {
  if (typeof value === 'string') return KEEP_AS_IS.test(key) ? value : noDash(value);
  if (Array.isArray(value)) return value.map((item) => cleanDeep(item, key));
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out = {};
    for (const k of Object.keys(value)) out[k] = cleanDeep(value[k], k);
    return out;
  }
  return value;
}
