/**
 * Countries offered in the phone field: ISO code, international dial code and the number of digits
 * of the national number (without the leading 0). `min` and `max` are equal when the length is fixed.
 * Names are not stored here: they come from Intl.DisplayNames so they follow the interface language.
 */
const rows = [
  // Central and East Africa first: they are the usual candidates of M-ECAL
  ['CD', '243', 9],
  ['RW', '250', 9],
  ['BI', '257', 8],
  ['UG', '256', 9],
  ['TZ', '255', 9],
  ['KE', '254', 9],
  ['ZM', '260', 9],
  ['AO', '244', 9],
  ['CG', '242', 9],
  ['CF', '236', 8],
  ['SS', '211', 9],
  ['CM', '237', 9],
  ['GA', '241', 8],
  ['TD', '235', 8],
  ['ET', '251', 9],
  ['SD', '249', 9],
  ['DJ', '253', 8],
  ['MG', '261', 9],
  ['MZ', '258', 9],
  ['MW', '265', 9],
  ['ZW', '263', 9],
  ['NA', '264', 9],
  ['BW', '267', [7, 8]],
  ['ZA', '27', 9],
  ['MU', '230', 8],
  // West and North Africa
  ['NG', '234', 10],
  ['GH', '233', 9],
  ['SN', '221', 9],
  ['CI', '225', 10],
  ['ML', '223', 8],
  ['BF', '226', 8],
  ['NE', '227', 8],
  ['TG', '228', 8],
  ['BJ', '229', 8],
  ['GN', '224', 9],
  ['SL', '232', 8],
  ['EG', '20', 10],
  ['MA', '212', 9],
  ['DZ', '213', 9],
  ['TN', '216', 8],
  // Europe, Americas, Asia
  ['FR', '33', 9],
  ['BE', '32', 9],
  ['DE', '49', [10, 11]],
  ['GB', '44', 10],
  ['CH', '41', 9],
  ['IT', '39', [9, 10]],
  ['ES', '34', 9],
  ['PT', '351', 9],
  ['NL', '31', 9],
  ['US', '1', 10],
  ['CA', '1', 10],
  ['BR', '55', [10, 11]],
  ['IN', '91', 10],
  ['CN', '86', 11],
  ['AE', '971', 9],
  ['SA', '966', 9],
  ['TR', '90', 10]
];

export const PHONE_COUNTRIES = rows.map(([iso, dial, len]) => ({
  iso,
  dial,
  min: Array.isArray(len) ? len[0] : len,
  max: Array.isArray(len) ? len[1] : len
}));

export const COUNTRY_BY_ISO = Object.fromEntries(PHONE_COUNTRIES.map((c) => [c.iso, c]));
export const DEFAULT_COUNTRY = 'CD';

const BY_DIAL_LENGTH = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/** Splits "+243 812345678" into the country and the national digits. Unknown or empty values fall back to the DRC. */
export function parsePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return { iso: DEFAULT_COUNTRY, digits: '' };
  const all = raw.replace(/\D/g, '');
  if (raw.startsWith('+')) {
    const country = BY_DIAL_LENGTH.find((c) => all.startsWith(c.dial));
    if (country) return { iso: country.iso, digits: all.slice(country.dial.length).replace(/^0+/, '').slice(0, country.max) };
  }
  // No international prefix: keep what was typed as a national number of the default country
  const fallback = COUNTRY_BY_ISO[DEFAULT_COUNTRY];
  return { iso: fallback.iso, digits: all.replace(/^0+/, '').slice(0, fallback.max) };
}

/** Readable form of a stored value, e.g. "+243 812 345 678". */
export function formatPhone(value) {
  const { iso, digits } = parsePhone(value);
  if (!digits) return '';
  return `+${COUNTRY_BY_ISO[iso].dial} ${digits.replace(/(\d{3})(?=\d)/g, '$1 ')}`;
}
