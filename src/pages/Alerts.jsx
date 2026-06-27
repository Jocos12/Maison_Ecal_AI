import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import {
  DEFAULT_KEYWORDS,
  RDC_CITIES,
  checkNewJobsAndAlert,
  formatAlertLogTime,
  getAlertLog,
  getAlertSettings,
  getIntervalMs,
  requestBrowserNotifications,
  saveAlertSettings,
  startAlertScheduler
} from '../services/alertService.js';

const FREQUENCIES = [
  { value: '15min', label: 'Toutes les 15 min', sub: 'Temps réel' },
  { value: '1h', label: 'Toutes les heures', sub: 'Recommandé' },
  { value: '6h', label: 'Toutes les 6h', sub: 'Économique' },
  { value: 'daily', label: 'Résumé quotidien', sub: 'Le matin à 8h' }
];

function relativeLastCheck(iso) {
  if (!iso) return 'Jamais';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  return `il y a ${hours}h`;
}

function nextCheckLabel(frequency, lastCheck) {
  if (!lastCheck) return 'bientôt';
  const remaining = getIntervalMs(frequency) - (Date.now() - new Date(lastCheck).getTime());
  const mins = Math.max(1, Math.ceil(remaining / 60000));
  if (mins < 60) return `dans ${mins} min`;
  return `dans ${Math.ceil(mins / 60)}h`;
}

export default function Alerts() {
  const { t } = useI18n();
  const { user, refreshMe } = useApp();
  const [enabled, setEnabled] = useState(true);
  const [frequency, setFrequency] = useState('1h');
  const [email, setEmail] = useState('');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [keywords, setKeywords] = useState([...DEFAULT_KEYWORDS]);
  const [cities, setCities] = useState(['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi']);
  const [keywordInput, setKeywordInput] = useState('');
  const [alertLog, setAlertLog] = useState([]);
  const [lastCheckAt, setLastCheckAt] = useState(null);
  const [checking, setChecking] = useState(false);

  const loadLocal = useCallback(() => {
    const s = getAlertSettings();
    setEnabled(s.enabled !== false);
    setFrequency(s.frequency || '1h');
    setEmail(s.email || user?.digestEmail || user?.email || '');
    setEmailEnabled(s.emailEnabled !== false);
    setWhatsapp(s.whatsapp || user?.whatsappNumber || '');
    setWhatsappEnabled(Boolean(s.whatsappEnabled));
    setKeywords(s.keywords || [...DEFAULT_KEYWORDS]);
    setCities(s.cities || ['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi']);
    setLastCheckAt(s.lastCheckAt || null);
    setAlertLog(getAlertLog());
  }, [user]);

  useEffect(() => {
    loadLocal();
    const onUpdate = () => loadLocal();
    window.addEventListener('mecal:alerts-updated', onUpdate);
    return () => window.removeEventListener('mecal:alerts-updated', onUpdate);
  }, [loadLocal]);

  const settingsPayload = useMemo(
    () => ({
      enabled,
      frequency,
      email,
      emailEnabled,
      whatsapp,
      whatsappEnabled,
      browserNotify: true,
      keywords,
      cities
    }),
    [enabled, frequency, email, emailEnabled, whatsapp, whatsappEnabled, keywords, cities]
  );

  const savePreferences = async () => {
    try {
      saveAlertSettings(settingsPayload);
      await api.patch('/api/auth/settings', {
        alertsEnabled: enabled,
        alertFrequency: frequency === '15min' ? 'immediate' : frequency === 'daily' ? 'daily' : 'weekly',
        whatsappNumber: whatsapp,
        digestEmail: email,
        keywords
      });
      await refreshMe();
      toast.success('Préférences d\'alerte enregistrées');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Enregistrement impossible');
    }
  };

  const runCheckNow = async () => {
    setChecking(true);
    try {
      const result = await checkNewJobsAndAlert(settingsPayload);
      loadLocal();
      if (result.newCount > 0) {
        toast.success(`${result.newCount} nouveau(x) job(s) logistique détecté(s)`);
      } else {
        toast.success('Vérification terminée — aucun nouveau job');
      }
    } catch {
      toast.error('Échec de la vérification');
    } finally {
      setChecking(false);
    }
  };

  const handleBrowserNotify = async () => {
    const result = await requestBrowserNotifications();
    if (result.ok) toast.success(result.message);
    else toast.error(result.message);
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || keywords.includes(kw)) return;
    setKeywords((k) => [...k, kw]);
    setKeywordInput('');
  };

  const removeKeyword = (kw) => setKeywords((k) => k.filter((x) => x !== kw));

  const toggleCity = (city) => {
    setCities((c) => (c.includes(city) ? c.filter((x) => x !== city) : [...c, city]));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-1 md:p-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">🔔 {t('pages.alerts.title')}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{t('pages.alerts.subtitle')}</p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-lg text-white">
          {enabled ? '✓' : '—'}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-green-800 dark:text-green-300">
            {enabled ? "Système d'alertes actif" : 'Alertes désactivées'}
          </p>
          <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
            Dernière vérification : {relativeLastCheck(lastCheckAt)} • Prochaine :{' '}
            {enabled ? nextCheckLabel(frequency, lastCheckAt) : '—'}
          </p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-5" />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="font-semibold text-gray-700 dark:text-slate-200">📡 Canaux de notification</h3>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-base">📧</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">E-mail</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
              />
              <div className="h-5 w-10 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-500 peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-base">💬</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">WhatsApp</p>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+243..."
                className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
              />
              <div className="h-5 w-10 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-base">🔔</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Notifications navigateur</p>
              <p className="mt-0.5 text-xs text-gray-400">Alertes instantanées dans votre navigateur</p>
            </div>
            <button
              type="button"
              onClick={handleBrowserNotify}
              className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs text-white transition-colors hover:bg-purple-700"
            >
              Activer
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="font-semibold text-gray-700 dark:text-slate-200">⏱ Fréquence de vérification</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5">
          {FREQUENCIES.map((freq) => (
            <label
              key={freq.value}
              className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-gray-100 p-3 transition-all has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50 dark:border-slate-700 dark:has-[:checked]:bg-blue-950/30"
            >
              <input
                type="radio"
                name="frequency"
                value={freq.value}
                checked={frequency === freq.value}
                onChange={() => setFrequency(freq.value)}
                className="accent-blue-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{freq.label}</p>
                <p className="text-xs text-gray-400">{freq.sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="font-semibold text-gray-700 dark:text-slate-200">🔑 Mots-clés surveillés</h3>
          <p className="mt-0.5 text-xs text-gray-400">Alertes uniquement pour ces catégories logistiques</p>
        </div>
        <div className="p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw}
                className="flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
              >
                {kw}
                <button type="button" onClick={() => removeKeyword(kw)} className="ml-0.5 text-blue-400 hover:text-red-500">
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
              placeholder="Ajouter un mot-clé..."
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <button
              type="button"
              onClick={addKeyword}
              className="rounded-xl bg-blue-600 px-4 text-sm text-white hover:bg-blue-700"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="font-semibold text-gray-700 dark:text-slate-200">📍 Villes surveillées (RDC)</h3>
        </div>
        <div className="grid grid-cols-3 gap-2 p-5">
          {RDC_CITIES.map((city) => (
            <label key={city} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={cities.includes(city)}
                onChange={() => toggleCity(city)}
                className="h-4 w-4 accent-blue-600"
              />
              <span className="text-sm text-gray-700 dark:text-slate-300">{city}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="font-semibold text-gray-700 dark:text-slate-200">📋 Dernières alertes envoyées</h3>
          <span className="text-xs text-gray-400">7 derniers jours</span>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-800">
          {alertLog.length ? (
            alertLog.slice(0, 8).map((log, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs">
                    {log.type === 'email' ? '📧' : '🔔'}
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 dark:text-slate-200">
                      <strong>{log.count} offre(s)</strong> trouvées — {log.city}
                    </p>
                    <p className="text-xs text-gray-400">{formatAlertLogTime(log.time)}</p>
                  </div>
                </div>
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Envoyé ✓</span>
              </div>
            ))
          ) : (
            <p className="px-5 py-8 text-center text-sm text-gray-400">
              Aucune alerte envoyée pour le moment. Lancez une vérification manuelle.
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={runCheckNow}
          disabled={checking}
          className="flex-1 rounded-2xl border border-blue-200 py-3.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-300"
        >
          {checking ? 'Vérification…' : '🔍 Vérifier maintenant'}
        </button>
        <button
          type="button"
          onClick={savePreferences}
          className="flex-[2] rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 dark:shadow-none"
        >
          💾 Enregistrer les préférences
        </button>
      </div>
    </div>
  );
}
