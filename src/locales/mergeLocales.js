/** Deep-merge locale objects (nested plain objects only). */
export function mergeLocales(base, extra) {
  const out = { ...base };
  for (const [key, val] of Object.entries(extra || {})) {
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof base[key] === 'object') {
      out[key] = mergeLocales(base[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}
