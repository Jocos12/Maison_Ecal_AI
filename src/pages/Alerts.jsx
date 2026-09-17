import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  BellRing,
  Check,
  CheckCircle2,
  Clock,
  KeyRound,
  ListTodo,
  Mail,
  MapPin,
  MessageCircle,
  Radio,
  Save,
  Search
} from 'lucide-react';
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
    <div className="page-shell space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800 dark:text-white">
          <Bell className="h-6 w-6 text-blue-600" strokeWidth={2} aria-hidden />
          {t('pages.alerts.title')}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">{t('pages.alerts.subtitle')}</p>
      </div>

      <div
        className={`flex flex-col gap-3 rounded-2xl border p-5 sm:flex-row sm:items-center sm:gap-4 ${
          enabled
            ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
            : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900'
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${
            enabled ? 'bg-emerald-500' : 'bg-slate-400'
          }`}
        >
          {enabled ? <Check className="h-5 w-5" strokeWidth={2} aria-hidden /> : <span className="text-lg leading-none">—</span>}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={`font-semibold ${
              enabled ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            {enabled ? "Système d'alertes actif" : 'Alertes désactivées'}
          </p>
          {lastCheckAt ? (
            <p className="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
              Dernière vérification : {relativeLastCheck(lastCheckAt)} • Prochaine :{' '}
              {enabled ? nextCheckLabel(frequency, lastCheckAt) : '—'}
            </p>
          ) : (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
              En attente du premier cycle — lancez « Vérifier maintenant » ou attendez la prochaine passe
              automatique.
            </p>
          )}
        </div>
        <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
          <input
            type="checkbox"
            className="peer sr-only"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-5" />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-stretch">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 font-semibold text-gray-700 dark:text-slate-200">
            <Radio className="h-4 w-4 text-slate-500" strokeWidth={2} aria-hidden />
            Canaux de notification
          </h3>
        </div>
        <div className="space-y-5 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <Mail className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">E-mail</p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="mt-1 h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-blue-500 peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className={`flex items-center gap-4 ${whatsappEnabled ? '' : 'opacity-80'}`}>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                whatsappEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}
            >
              <MessageCircle className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-medium ${
                  whatsappEnabled ? 'text-gray-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                WhatsApp
              </p>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="+243..."
                disabled={!whatsappEnabled}
                className={`mt-1 h-11 w-full rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 dark:text-white ${
                  whatsappEnabled
                    ? 'border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-500'
                }`}
              />
            </div>
            <label className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
              />
              <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-5" />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <BellRing className="h-5 w-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Notifications navigateur</p>
              <p className="mt-0.5 text-xs text-gray-400">Alertes instantanées dans votre navigateur</p>
            </div>
            <button
              type="button"
              onClick={handleBrowserNotify}
              className="inline-flex h-11 shrink-0 items-center rounded-xl bg-purple-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
            >
              Activer
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="font-semibold text-gray-700 dark:text-slate-200">⏱ Fréquence de vérification</h3>
        </div>
        <div className="grid flex-1 grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {FREQUENCIES.map((freq) => {
            const selected = frequency === freq.value;
            return (
              <label
                key={freq.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3.5 transition-all ${
                  selected
                    ? 'border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-600/20 dark:border-blue-500 dark:bg-blue-950/40'
                    : 'border-gray-100 hover:border-blue-200 dark:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="frequency"
                  value={freq.value}
                  checked={selected}
                  onChange={() => setFrequency(freq.value)}
                  className="sr-only"
                />
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                    selected ? 'bg-blue-600 text-white' : 'border-2 border-slate-200 dark:border-slate-600'
                  }`}
                >
                  {selected ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} aria-hidden /> : null}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-200">{freq.label}</p>
                  <p className="text-xs text-gray-400">{freq.sub}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2 xl:items-stretch">
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 font-semibold text-gray-700 dark:text-slate-200">
            <KeyRound className="h-4 w-4 text-slate-500" strokeWidth={2} aria-hidden />
            Mots-clés surveillés
          </h3>
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
          <h3 className="flex items-center gap-2 font-semibold text-gray-700 dark:text-slate-200">
            <MapPin className="h-4 w-4 text-slate-500" strokeWidth={2} aria-hidden />
            Villes surveillées (RDC)
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-2 p-5 sm:grid-cols-3">
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4 dark:border-slate-800">
          <h3 className="flex items-center gap-2 font-semibold text-gray-700 dark:text-slate-200">
            <ListTodo className="h-4 w-4 text-slate-500" strokeWidth={2} aria-hidden />
            Dernières alertes envoyées
          </h3>
          <span className="text-xs text-gray-400">7 derniers jours</span>
        </div>
        <div className="divide-y divide-gray-50 dark:divide-slate-800">
          {alertLog.length ? (
            alertLog.slice(0, 8).map((log, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    {log.type === 'email' ? (
                      <Mail className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    ) : (
                      <Bell className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 dark:text-slate-200">
                      <strong>{log.count} offre(s)</strong> trouvées — {log.city}
                    </p>
                    <p className="text-xs text-gray-400">{formatAlertLogTime(log.time)}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                  <Check className="h-3 w-3" strokeWidth={2} aria-hidden />
                  Envoyé
                </span>
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
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-blue-200 py-3.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50 dark:border-blue-800 dark:text-blue-300"
        >
          {checking ? (
            'Vérification…'
          ) : (
            <>
              <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
              Vérifier maintenant
            </>
          )}
        </button>
        <button
          type="button"
          onClick={savePreferences}
          className="inline-flex flex-[2] items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition-colors hover:bg-blue-700 dark:shadow-none"
        >
          <Save className="h-4 w-4" strokeWidth={2} aria-hidden />
          Enregistrer les préférences
        </button>
      </div>
    </div>
  );
}
