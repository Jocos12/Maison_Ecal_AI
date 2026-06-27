/**
 * Détecte la langue d'un message utilisateur
 * @param {string} message - Le texte à analyser
 * @returns {'fr' | 'en' | 'sw'} - Code de la langue détectée
 */
export function detectMessageLanguage(message) {
  if (!message || typeof message !== 'string') return 'fr';

  const lower = message.toLowerCase().trim();

  const frWords = [
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils',
    'les', 'des', 'une', 'est', 'sont', 'avoir', 'être',
    'comment', 'pourquoi', 'quand', 'où', 'quoi', 'quel',
    'bonjour', 'merci', 'oui', 'non', 'aide', 'besoin',
    'postuler', 'candidature', 'offre', 'emploi', 'travail'
  ];

  const enWords = [
    'the', 'is', 'are', 'you', 'what', 'how', 'can',
    'will', 'have', 'has', 'this', 'that', 'with',
    'hello', 'thanks', 'yes', 'no', 'help', 'need',
    'apply', 'application', 'job', 'work', 'opportunity'
  ];

  const swWords = [
    'habari', 'asante', 'ndiyo', 'hapana', 'kazi',
    'nafasi', 'msaada', 'tafadhali', 'karibu', 'sawa'
  ];

  const frScore = frWords.filter((w) => lower.includes(w)).length;
  const enScore = enWords.filter((w) => lower.includes(w)).length;
  const swScore = swWords.filter((w) => lower.includes(w)).length;

  if (swScore > frScore && swScore > enScore) return 'sw';
  if (enScore > frScore) return 'en';
  return 'fr';
}

/**
 * Retourne le label lisible d'une langue
 * @param {'fr' | 'en' | 'sw'} lang
 * @returns {string}
 */
export function getLanguageLabel(lang) {
  const labels = {
    fr: 'Français',
    en: 'English',
    sw: 'Kiswahili'
  };
  return labels[lang] || 'Français';
}

/**
 * Retourne le prompt système selon la langue détectée
 * @param {'fr' | 'en' | 'sw'} lang
 * @returns {string}
 */
export function getSystemPromptByLanguage(lang) {
  const prompts = {
    fr: `Tu es l'Assistant Emploi de M-ECAL, expert en opportunités 
         logistiques en République Démocratique du Congo. 
         Réponds toujours en français, de façon claire et professionnelle.`,
    en: `You are the M-ECAL Job Assistant, expert in logistics opportunities 
         in the Democratic Republic of Congo. 
         Always respond in English, clearly and professionally.`,
    sw: `Wewe ni Msaidizi wa Kazi wa M-ECAL, mtaalamu wa fursa za usafirishaji 
         katika Jamhuri ya Kidemokrasia ya Kongo. 
         Jibu kwa Kiswahili, kwa uwazi na kitaalamu.`
  };
  return prompts[lang] || prompts.fr;
}
