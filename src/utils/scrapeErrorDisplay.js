const ORPHAN_GENERIC =
  /scan interrompu\s*[-–—:]?\s*processus arr[eê]t[eé] avant la fin/i;

const TIMEOUT_HINT =
  /timeout|scan interrompu apr[eè]s\s+\d+\s+minute|d[eé]lai d[eé]pass[eé]|SCAN_TIMEOUT|ScanTimeoutError/i;

const DATABASE_HINT =
  /mongo|mongoose|mongodb|base de donn[eé]es|ECONNREFUSED[^\n]{0,40}27017/i;

const NETWORK_HINT =
  /\b(ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|EPIPE|ENETUNREACH|socket hang up|fetch failed|network|CERT_|SSL|getaddrinfo|UND_ERR)\b/i;

export function stripTechnicalStack(text = '') {
  const kept = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .filter((line) => {
      const l = line.trim();
      if (!l) return false;
      if (/^at\s+/.test(l)) return false;
      if (/^file:\/\//i.test(l)) return false;
      return true;
    })
    .join('\n');

  return kept
    .replace(/\(file:\/{2,}[^)]+\)/gi, '')
    .replace(/file:\/{2,}\S+/gi, '')
    .replace(/\b[A-Za-z]:\\(?:[^\\/:*?"<>|\r\n]+\\)+[^\\/:*?"<>|\s)]+/g, '')
    .replace(/\s+at\s+\S+(?:\.\S+)*(?:\.<anonymous>)?/g, '')
    .replace(/\bScanTimeoutError:\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractTimeoutMinutes(text = '') {
  const m = String(text).match(/apr[eè]s\s+(\d+)\s+minutes?/i) || String(text).match(/after\s+(\d+)\s+minutes?/i);
  return m ? Number(m[1]) : null;
}

function collectParts(log = {}) {
  const errors = Array.isArray(log.errors) ? log.errors : [];
  const parts = [
    log.failureKind || '',
    log.message || '',
    ...errors.map((e) => `${e?.source || ''} ${e?.message || ''}`)
  ];
  return { errors, blob: parts.join('\n') };
}

export function classifyScrapeFailure(log = {}) {
  const kindField = String(log.failureKind || '').toLowerCase();
  if (kindField === 'timeout') return 'timeout';
  if (kindField === 'orphan_restart') return 'orphan_restart';

  const { blob } = collectParts(log);
  if (TIMEOUT_HINT.test(blob)) return 'timeout';
  if (ORPHAN_GENERIC.test(blob) || /orphan_restart|process-restart/i.test(blob)) return 'orphan_restart';
  if (DATABASE_HINT.test(blob)) return 'database';
  if (NETWORK_HINT.test(blob)) return 'network';
  return 'pipeline';
}

function firstUsefulErrorMessage(log = {}) {
  const { errors } = collectParts(log);
  for (const err of errors) {
    const msg = stripTechnicalStack(err?.message || '');
    if (!msg || ORPHAN_GENERIC.test(msg)) continue;
    const source = String(err?.source || '').trim();
    if (source && source !== 'pipeline' && source !== 'timeout') {
      return `${source}: ${msg}`;
    }
    return msg;
  }
  return stripTechnicalStack(log.message || '');
}

/**
 * User-facing scrape failure copy. `t` is the i18n function; falls back to French.
 */
export function describeScrapeFailure(log = {}, t) {
  const translate = typeof t === 'function' ? t : (key, vars) => interpolateFr(key, vars);
  const kind = classifyScrapeFailure(log);
  const raw = collectParts(log).blob;
  const minutes = extractTimeoutMinutes(raw);

  if (kind === 'timeout') {
    return {
      kind,
      badgeKey: 'dashboard.scrapeErrorBadgeTimeout',
      message: minutes
        ? translate('dashboard.scrapeErrorTimeoutHint', { minutes })
        : translate('dashboard.scrapeErrorTimeoutHintGeneric')
    };
  }

  if (kind === 'orphan_restart') {
    return {
      kind,
      badgeKey: 'dashboard.scrapeErrorBadgeRestart',
      message: translate('dashboard.scrapeErrorRestartHint')
    };
  }

  if (kind === 'database') {
    const detail = firstUsefulErrorMessage(log);
    return {
      kind,
      badgeKey: 'dashboard.scrapeErrorBadgeDatabase',
      message: detail
        ? translate('dashboard.scrapeErrorDatabaseHint', { detail: detail.slice(0, 220) })
        : translate('dashboard.scrapeErrorDatabaseHintGeneric')
    };
  }

  if (kind === 'network') {
    const detail = firstUsefulErrorMessage(log);
    return {
      kind,
      badgeKey: 'dashboard.scrapeErrorBadgeNetwork',
      message: detail
        ? translate('dashboard.scrapeErrorNetworkHint', { detail: detail.slice(0, 220) })
        : translate('dashboard.scrapeErrorNetworkHintGeneric')
    };
  }

  const detail = firstUsefulErrorMessage(log);
  return {
    kind,
    badgeKey: 'dashboard.scrapeErrorBadgeOther',
    message: detail || translate('dashboard.scrapeErrorOtherHint')
  };
}

const FR_FALLBACK = {
  'dashboard.scrapeErrorTimeoutHint':
    'Scan interrompu après {minutes} minutes, délai dépassé, probablement dû à un volume élevé d’images à analyser',
  'dashboard.scrapeErrorTimeoutHintGeneric':
    'Scan interrompu, délai dépassé, probablement dû à un volume élevé d’images à analyser',
  'dashboard.scrapeErrorRestartHint':
    'Scan interrompu par un redémarrage du process, le serveur s’est arrêté (crash ou redémarrage) avant la fin de la collecte.',
  'dashboard.scrapeErrorDatabaseHint': 'Impossible de joindre la base de données. {detail}',
  'dashboard.scrapeErrorDatabaseHintGeneric': 'Impossible de joindre la base de données.',
  'dashboard.scrapeErrorNetworkHint': 'Erreur réseau pendant la collecte. {detail}',
  'dashboard.scrapeErrorNetworkHintGeneric': 'Erreur réseau pendant la collecte.',
  'dashboard.scrapeErrorOtherHint': 'La collecte s’est arrêtée avant la fin.'
};

function interpolateFr(key, vars) {
  const str = FR_FALLBACK[key] || key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}
