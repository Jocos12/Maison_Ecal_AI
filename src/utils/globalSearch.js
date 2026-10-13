import { LogOut, Moon, Languages, Tag, Globe2 } from 'lucide-react';
import { NAV_GROUPS } from '../config/navigation.js';
import { SITE_LINKS } from '../config/site.js';
import { translationsOf } from '../locales/dictionaries.js';

const CATEGORY_SLUGS = [
  'formation',
  'formation_chauffeurs',
  'consultance',
  'inventaire',
  'inventaire_actifs',
  'inventaire_general',
  'etude_marche',
  'assistance'
];

const LANGUAGE_NAMES = { fr: 'Français', en: 'English', sw: 'Kiswahili' };

/** Lower-case and remove accents, keeping the same length so match positions stay valid for highlighting. */
function foldChar(ch) {
  const folded = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return folded.length === ch.length ? folded : ch.toLowerCase();
}

export function fold(text) {
  return Array.from(String(text || ''), foldChar).join('');
}

export function queryTerms(query) {
  return fold(query).split(/\s+/).filter(Boolean);
}

/** Splits `text` into [{ text, match }] so the parts that match a typed word can be highlighted. */
export function highlightSegments(text, terms) {
  const source = String(text || '');
  if (!terms.length) return [{ text: source, match: false }];
  const folded = fold(source);
  const marked = new Array(source.length).fill(false);
  for (const term of terms) {
    let from = 0;
    while (term && from <= folded.length - term.length) {
      const at = folded.indexOf(term, from);
      if (at === -1) break;
      for (let i = at; i < at + term.length; i += 1) marked[i] = true;
      from = at + term.length;
    }
  }
  const segments = [];
  let start = 0;
  for (let i = 1; i <= source.length; i += 1) {
    if (i === source.length || marked[i] !== marked[start]) {
      segments.push({ text: source.slice(start, i), match: marked[start] });
      start = i;
    }
  }
  return segments;
}

function haystackOf(...parts) {
  return fold(parts.flat().filter(Boolean).join(' '));
}

/**
 * Everything that can be found without asking the server: pages, categories, quick actions and links to
 * the public website. The words of EVERY language are indexed, so "dashboard", "tableau de bord" and the
 * Swahili name all lead to the same page whatever language the interface is in.
 */
export function buildLocalEntries({ isAdmin }) {
  const entries = [];

  for (const group of NAV_GROUPS) {
    if (group.adminOnly && !isAdmin) continue;
    for (const item of group.items) {
      entries.push({
        id: `page:${item.to}`,
        kind: 'page',
        to: item.to,
        icon: item.icon,
        labelKey: item.labelKey,
        haystack: haystackOf(translationsOf(item.labelKey), translationsOf(group.titleKey), item.keywords)
      });
    }
  }

  for (const slug of CATEGORY_SLUGS) {
    const key = `opportunities.${slug}`;
    entries.push({
      id: `category:${slug}`,
      kind: 'category',
      to: `/opportunities?category=${slug}`,
      icon: Tag,
      labelKey: key,
      haystack: haystackOf(translationsOf(key), slug.replace(/_/g, ' '))
    });
  }

  entries.push({
    id: 'action:theme',
    kind: 'action',
    action: 'theme',
    icon: Moon,
    labelKey: null,
    haystack: haystackOf(
      translationsOf('layout.themeDark'),
      translationsOf('layout.themeLight'),
      'theme thème mode sombre dark light clair mandhari giza mwanga'
    )
  });
  for (const code of Object.keys(LANGUAGE_NAMES)) {
    entries.push({
      id: `action:lang:${code}`,
      kind: 'action',
      action: 'lang',
      lang: code,
      icon: Languages,
      label: LANGUAGE_NAMES[code],
      haystack: haystackOf(LANGUAGE_NAMES[code], 'langue language lugha traduction interface', code)
    });
  }
  entries.push({
    id: 'action:logout',
    kind: 'action',
    action: 'logout',
    icon: LogOut,
    labelKey: 'nav.logout',
    haystack: haystackOf(translationsOf('nav.logout'), 'logout sign out quitter déconnecter toka')
  });

  const site = [
    ['home', SITE_LINKS.home],
    ['about', SITE_LINKS.about],
    ['projects', SITE_LINKS.projects],
    ['event', SITE_LINKS.event],
    ['contact', SITE_LINKS.contact]
  ];
  for (const [key, href] of site) {
    entries.push({
      id: `site:${key}`,
      kind: 'site',
      href,
      icon: Globe2,
      labelKey: `nav.${key}`,
      haystack: haystackOf(translationsOf(`nav.${key}`), 'site web website maison ecal')
    });
  }
  for (const service of SITE_LINKS.services) {
    entries.push({
      id: `site:service:${service.key}`,
      kind: 'site',
      href: service.href,
      icon: Globe2,
      labelKey: `nav.serviceItems.${service.key}`,
      haystack: haystackOf(translationsOf(`nav.serviceItems.${service.key}`), 'service services huduma')
    });
  }

  return entries;
}

const KIND_LIMITS = { page: 8, category: 4, action: 4, site: 5 };

/** Entries that contain every typed word, best matches first. `labelOf` gives the label in the current language. */
export function searchLocal(entries, terms, labelOf) {
  if (!terms.length) return [];
  const joined = terms.join(' ');
  const scored = [];
  entries.forEach((entry, order) => {
    if (!terms.every((term) => entry.haystack.includes(term))) return;
    const label = fold(labelOf(entry));
    let score = 0;
    if (label.startsWith(terms[0])) score += 3;
    else if (label.includes(joined)) score += 2;
    else if (terms.some((term) => label.includes(term))) score += 1;
    scored.push({ entry, score, order });
  });
  scored.sort((a, b) => b.score - a.score || a.order - b.order);

  const counts = {};
  const result = [];
  for (const { entry } of scored) {
    counts[entry.kind] = (counts[entry.kind] || 0) + 1;
    if (counts[entry.kind] <= (KIND_LIMITS[entry.kind] || 5)) result.push(entry);
  }
  return result;
}
