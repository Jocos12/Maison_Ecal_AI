/** Merge class names (no external deps). */
export function cn(...inputs) {
  return inputs.flat(Infinity).filter(Boolean).join(' ');
}
