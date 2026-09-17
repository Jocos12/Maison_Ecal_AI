/** Strip markdown / emoji noise before sending text to TTS. */
export function prepareTextForSpeech(raw = '', maxChars = 800) {
  let text = String(raw || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[#>*_~|]+/g, ' ')
    .replace(/📥|🤖|🔍|📄|✉️|📬|📊|💬|✅|❌|ℹ️|🏆|👤|📤/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars).trim()}…`;
  }
  return text;
}
