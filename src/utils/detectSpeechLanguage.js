/**
 * Lightweight FR/EN detection for speech recognition locale (browser-side).
 * Mirrors backend/src/utils/detectMessageLanguage.js without Swahili for STT locales.
 */
const ENGLISH_MARKERS =
  /\b(the|you|your|are|is|was|were|what|which|where|when|how|why|can|could|would|should|please|hello|hi|thanks|thank|job|jobs|offer|offers|logistics|search|find|show|apply|help|want|need|about|with|from|this|that|have|has|do|does|will|not)\b/i;

const FRENCH_MARKERS =
  /\b(je|tu|vous|nous|le|la|les|un|une|des|du|de|et|est|sont|quoi|quel|quelle|comment|combien|où|pourquoi|quand|bonjour|merci|offre|offres|emploi|logistique|cherche|poste|postuler|aide|avec|dans|pour|sur|mon|ma|mes|être|avoir|faire|peux|veux|suis)\b/i;

export function detectSpeechLanguage(message = '', uiLang = 'fr') {
  const text = String(message || '').trim();
  if (!text) {
    return uiLang === 'en' ? 'en' : 'fr';
  }

  let englishScore = (text.match(ENGLISH_MARKERS) || []).length;
  let frenchScore = (text.match(FRENCH_MARKERS) || []).length;
  if (/[àâäéèêëïîôùûüçœæ]/i.test(text)) frenchScore += 2;
  if (/\b(i'm|i am|you're|don't|can't|won't|it's|that's)\b/i.test(text)) englishScore += 2;

  if (englishScore > frenchScore && englishScore >= 1) return 'en';
  if (frenchScore > englishScore) return 'fr';
  return uiLang === 'en' ? 'en' : 'fr';
}

export function speechRecognitionLocale(lang = 'fr') {
  return lang === 'en' ? 'en-US' : 'fr-FR';
}
