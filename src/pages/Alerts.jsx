import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Bell,
  BellRing,
  Check,
  Clock,
  Hourglass,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  Radio,
  Save,
  Search,
  Sunrise,
  X,
  Zap
} from 'lucide-react';
import { api } from '../api/client.js';
import PhoneField from '../components/ui/PhoneField.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';
import {
  DEFAULT_KEYWORDS,
  RDC_CITIES,
  checkNewJobsAndAlert,
  getAlertLog,
  getAlertSettings,
  getIntervalMs,
  requestBrowserNotifications,
  saveAlertSettings
} from '../services/alertService.js';

const DEFAULT_CITIES = ['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi'];
const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';
const CARD = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 dark:border-slate-700 dark:bg-slate-900';

const FREQUENCIES = [
  { value: '15min', icon: Zap, label: 'f15min', sub: 'f15minSub' },
  { value: '1h', icon: Clock, label: 'f1h', sub: 'f1hSub', recommended: true },
  { value: '6h', icon: Hourglass, label: 'f6h', sub: 'f6hSub' },
  { value: 'daily', icon: Sunrise, label: 'fdaily', sub: 'fdailySub' }
];

const buildPayload = (v) => ({
  enabled: v.enabled,
  frequency: v.frequency,
  email: v.email,
  emailEnabled: v.emailEnabled,
  whatsapp: v.whatsapp,
  whatsappEnabled: v.whatsappEnabled,
  browserNotify: true,
  keywords: v.keywords,
  cities: v.cities
});

function Switch({ checked, onChange, label, onClass = 'bg-emerald-600', offClass = 'bg-slate-300 dark:bg-slate-600' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 flex-none rounded-full transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/30 ${checked ? onClass : offClass}`}
    >
      <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${checked ? 'left-[1.375rem]' : 'left-0.5'}`} />
    </button>
  );
}

/** One numbered stage of the setup: the number sits on a line that leads to the next stage. */
function Step({ n, last, title, hint, aside, children }) {
  return (
    <li className="relative lg:pl-16">
      <span className="absolute left-0 top-0 hidden h-11 w-11 place-items-center rounded-2xl bg-[#24478a] text-base font-extrabold text-white shadow-sm lg:grid">{n}</span>
      {!last ? <span className="absolute -bottom-6 left-[21px] top-12 hidden w-0.5 bg-slate-200 lg:block dark:bg-slate-700" aria-hidden="true" /> : null}
      <section className={CARD}>
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-[#24478a] text-sm font-extrabold text-white lg:hidden">{n}</span>
            <div className="min-w-0">
              <h2 className="text-base font-bold leading-tight text-slate-900 dark:text-white">{title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p>
            </div>
          </div>
          {aside}
        </header>
        <div className="mt-5">{children}</div>
      </section>
    </li>
  );
}

export default function Alerts() {
  const { t, dateLocale } = useUiLocale();
  const { user, refreshMe } = useApp();

  const readStored = useCallback(() => {
    const s = getAlertSettings();
    return {
      enabled: s.enabled !== false,
      frequency: s.frequency || '1h',
      email: s.email || user?.digestEmail || user?.email || '',
      emailEnabled: s.emailEnabled !== false,
      whatsapp: s.whatsapp || user?.whatsappNumber || '',
      whatsappEnabled: Boolean(s.whatsappEnabled),
      keywords: s.keywords || [...DEFAULT_KEYWORDS],
      cities: s.cities || DEFAULT_CITIES,
      lastCheckAt: s.lastCheckAt || null
    };
  }, [user]);

  const [form, setForm] = useState(() => readStored());
  const [baseline, setBaseline] = useState(() => JSON.stringify(buildPayload(readStored())));
  const [lastCheckAt, setLastCheckAt] = useState(() => readStored().lastCheckAt);
  const [alertLog, setAlertLog] = useState(() => getAlertLog());
  const [keywordInput, setKeywordInput] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [phoneState, setPhoneState] = useState('empty');
  const [permission, setPermission] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));

  const payload = useMemo(() => buildPayload(form), [form]);
  const dirty = JSON.stringify(payload) !== baseline;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  const patch = (changes) => setForm((f) => ({ ...f, ...changes }));

  const reload = useCallback(() => {
    const stored = readStored();
    setForm(stored);
    setBaseline(JSON.stringify(buildPayload(stored)));
    setLastCheckAt(stored.lastCheckAt);
    setAlertLog(getAlertLog());
  }, [readStored]);

  // A check or a save elsewhere refreshes the history, but never overwrites what is being typed here
  useEffect(() => {
    const onUpdate = () => {
      const stored = readStored();
      setLastCheckAt(stored.lastCheckAt);
      setAlertLog(getAlertLog());
      if (!dirtyRef.current) {
        setForm(stored);
        setBaseline(JSON.stringify(buildPayload(stored)));
      }
    };
    window.addEventListener('mecal:alerts-updated', onUpdate);
    return () => window.removeEventListener('mecal:alerts-updated', onUpdate);
  }, [readStored]);

  const relative = (iso) => {
    if (!iso) return t('alertsPage.never');
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return t('alertsPage.justNow');
    if (mins < 60) return t('alertsPage.minutesAgo', { count: mins });
    return t('alertsPage.hoursAgo', { count: Math.floor(mins / 60) });
  };

  const nextCheck = () => {
    if (!lastCheckAt) return t('alertsPage.soon');
    const remaining = getIntervalMs(form.frequency) - (Date.now() - new Date(lastCheckAt).getTime());
    const mins = Math.max(1, Math.ceil(remaining / 60000));
    return mins < 60 ? t('alertsPage.inMinutes', { count: mins }) : t('alertsPage.inHours', { count: Math.ceil(mins / 60) });
  };

  const logTime = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days === 0) return t('alertsPage.logToday', { time: d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }) });
    if (days === 1) return t('alertsPage.logYesterday');
    return d.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' });
  };

  const save = async () => {
    if (form.emailEnabled && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast.error(t('alertsPage.toastEmail'));
      return;
    }
    if (form.whatsappEnabled && phoneState === 'partial') {
      toast.error(t('alertsPage.toastPhone'));
      return;
    }
    setSaving(true);
    try {
      saveAlertSettings(payload);
      await api.patch('/api/auth/settings', {
        alertsEnabled: form.enabled,
        alertFrequency: form.frequency === '15min' ? 'immediate' : form.frequency === 'daily' ? 'daily' : 'weekly',
        whatsappNumber: form.whatsapp,
        digestEmail: form.email,
        keywords: form.keywords
      });
      await refreshMe();
      setBaseline(JSON.stringify(payload));
      toast.success(t('alertsPage.toastSaved'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('alertsPage.toastSaveFail'));
    } finally {
      setSaving(false);
    }
  };

  const runCheckNow = async () => {
    setChecking(true);
    try {
      const result = await checkNewJobsAndAlert(payload);
      setLastCheckAt(getAlertSettings().lastCheckAt || new Date().toISOString());
      setAlertLog(getAlertLog());
      if (result.newCount > 0) toast.success(t('alertsPage.toastNew', { count: result.newCount }));
      else toast.success(t('alertsPage.toastNone'));
    } catch {
      toast.error(t('alertsPage.toastCheckFail'));
    } finally {
      setChecking(false);
    }
  };

  const enableBrowser = async () => {
    const result = await requestBrowserNotifications();
    setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
    if (result.ok) toast.success(t('alertsPage.browserOn'));
    else toast.error(t('alertsPage.browserDenied'));
  };

  const addKeyword = () => {
    const kw = keywordInput.trim();
    if (!kw || form.keywords.some((k) => k.toLowerCase() === kw.toLowerCase())) return;
    patch({ keywords: [...form.keywords, kw] });
    setKeywordInput('');
  };

  const toggleCity = (city) =>
    patch({ cities: form.cities.includes(city) ? form.cities.filter((c) => c !== city) : [...form.cities, city] });

  const cyclePercent = lastCheckAt
    ? Math.min(100, Math.max(2, ((Date.now() - new Date(lastCheckAt).getTime()) / getIntervalMs(form.frequency)) * 100))
    : 0;
  const activeChannels = [form.emailEnabled, form.whatsappEnabled, permission === 'granted'].filter(Boolean).length;
  const on = form.enabled;
  const inputClass =
    'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  return (
    <div className="page-shell space-y-6 pb-4">
      <h1 className="sr-only">{t('pages.alerts.title')}</h1>
      <p className="max-w-2xl text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{t('pages.alerts.subtitle')}</p>

      {/* Status card: blue when the system is on (grey when off); green only marks the "active" state */}
      <section className="overflow-hidden rounded-3xl shadow-sm">
        <div className={`relative p-5 text-white transition-colors md:p-7 ${on ? 'bg-[#24478a]' : 'bg-slate-600'}`}>
          <span className="pointer-events-none absolute -right-16 -top-24 h-60 w-60 rounded-full border-[30px] border-white/5" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full border-[24px] border-white/5" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <span className="relative grid h-14 w-14 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm">
                {on ? <BellRing className="h-7 w-7" aria-hidden="true" /> : <Bell className="h-7 w-7 text-slate-500" aria-hidden="true" />}
                {on ? <span className="absolute -right-1 -top-1 h-4 w-4 animate-pulse rounded-full border-2 border-[#24478a] bg-emerald-400" aria-hidden="true" /> : null}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="text-xl font-extrabold leading-tight">{on ? t('alertsPage.statusOn') : t('alertsPage.statusOff')}</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white">
                    <span className={`h-2 w-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-slate-300'}`} aria-hidden="true" />
                    {on ? t('alertsPage.channelOn') : t('alertsPage.channelOff')}
                  </span>
                </div>
                <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-blue-100">
                  {lastCheckAt
                    ? `${t('alertsPage.lastCheck', { when: relative(lastCheckAt) })} · ${t('alertsPage.nextCheck', { when: on ? nextCheck() : t('alertsPage.notAvailable') })}`
                    : t('alertsPage.noCycle')}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={runCheckNow}
                disabled={checking}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-[#24478a] shadow-sm transition hover:bg-blue-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-white/40 disabled:opacity-60"
              >
                {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                {checking ? t('alertsPage.checking') : t('alertsPage.checkNow')}
              </button>
              <Switch checked={on} onChange={(v) => patch({ enabled: v })} label={on ? t('alertsPage.statusOn') : t('alertsPage.statusOff')} onClass="bg-emerald-500" offClass="bg-white/30" />
            </div>
          </div>

          <div className="relative mt-6 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {t(`alertsPage.${(FREQUENCIES.find((x) => x.value === form.frequency) || FREQUENCIES[1]).label}`)}
            </span>
            {form.emailEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                {t('alertsPage.email')}
              </span>
            ) : null}
            {form.whatsappEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                {t('alertsPage.whatsapp')}
              </span>
            ) : null}
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white">
                <BellRing className="h-3.5 w-3.5" aria-hidden="true" />
                {t('alertsPage.browser')}
              </span>
            ) : null}
          </div>
          {on && lastCheckAt ? (
            <div className="relative mt-4" aria-hidden="true">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${cyclePercent}%` }} />
              </div>
            </div>
          ) : null}
        </div>

        <dl className="grid grid-cols-3 divide-x divide-slate-100 border-x border-b border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-700 dark:bg-slate-900">
          {[
            [Radio, 'bg-[#e3ebf9] text-[#24478a]', t('alertsPage.statChannels'), activeChannels],
            [KeyRound, 'bg-violet-50 text-violet-700', t('alertsPage.statKeywords'), form.keywords.length],
            [MapPin, 'bg-teal-50 text-teal-700', t('alertsPage.statCities'), form.cities.length]
          ].map(([StatIcon, tone, label, value]) => (
            <div key={label} className="flex flex-col items-start gap-2.5 p-4 sm:flex-row sm:items-center sm:gap-3.5 md:px-6 md:py-5">
              <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${tone}`}>
                <StatIcon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <dd className="text-3xl font-extrabold leading-none tabular-nums text-slate-900 dark:text-white">{value}</dd>
                <dt className="mt-1.5 text-xs font-semibold leading-snug text-slate-500 dark:text-slate-400">{label}</dt>
              </div>
            </div>
          ))}
        </dl>
      </section>

      <ol className="space-y-6">
        <Step n={1} title={t('alertsPage.s1')} hint={t('alertsPage.s1Hint')}>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            <div className="pb-5">
              <div className="flex items-center gap-4">
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${form.emailEnabled ? 'bg-[#e3ebf9] text-[#24478a]' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </span>
                <label htmlFor="alert-email" className="min-w-0 flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">{t('alertsPage.email')}</label>
                <Switch checked={form.emailEnabled} onChange={(v) => patch({ emailEnabled: v })} label={t('alertsPage.email')} onClass="bg-[#24478a]" />
              </div>
              <div className="mt-3 sm:pl-[3.75rem]">
                <input
                  id="alert-email"
                  type="email"
                  value={form.email}
                  disabled={!form.emailEnabled}
                  onChange={(e) => patch({ email: e.target.value })}
                  placeholder={t('alertsPage.emailPlaceholder')}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="py-5">
              <div className="flex items-center gap-4">
                <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${form.whatsappEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                  <MessageCircle className="h-5 w-5" aria-hidden="true" />
                </span>
                <label htmlFor="alert-whatsapp" className="min-w-0 flex-1 text-sm font-bold text-slate-800 dark:text-slate-100">{t('alertsPage.whatsapp')}</label>
                <Switch checked={form.whatsappEnabled} onChange={(v) => patch({ whatsappEnabled: v })} label={t('alertsPage.whatsapp')} onClass="bg-emerald-600" />
              </div>
              <div className="mt-3 sm:pl-[3.75rem]">
                <PhoneField
                  id="alert-whatsapp"
                  value={form.whatsapp}
                  disabled={!form.whatsappEnabled}
                  onChange={(v) => patch({ whatsapp: v })}
                  onStatus={setPhoneState}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-5">
              <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${permission === 'granted' ? 'bg-violet-50 text-violet-700' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                <BellRing className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('alertsPage.browser')}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {permission === 'denied'
                    ? t('alertsPage.browserDenied')
                    : permission === 'unsupported'
                      ? t('alertsPage.browserUnsupported')
                      : t('alertsPage.browserHint')}
                </p>
              </div>
              {permission === 'granted' ? (
                <span className="inline-flex flex-none items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('alertsPage.browserOn')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={enableBrowser}
                  disabled={permission === 'denied' || permission === 'unsupported'}
                  className="flex-none rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-violet-700/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('alertsPage.browserActivate')}
                </button>
              )}
            </div>
          </div>
        </Step>

        <Step n={2} title={t('alertsPage.s2')} hint={t('alertsPage.s2Hint')}>
          <div role="radiogroup" aria-label={t('alertsPage.s2')} className="grid gap-3 sm:grid-cols-2">
            {FREQUENCIES.map(({ value, icon: FreqIcon, label, sub, recommended }) => {
              const selected = form.frequency === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => patch({ frequency: value })}
                  className={`flex items-center gap-3.5 rounded-xl border-2 p-4 text-left transition ${FOCUS} ${
                    selected
                      ? 'border-[#24478a] bg-[#f2f6fc] dark:bg-slate-800'
                      : 'border-slate-200 bg-white hover:border-[#24478a]/50 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${selected ? 'bg-[#24478a] text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                    <FreqIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-900 dark:text-white">{t(`alertsPage.${label}`)}</span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{t(`alertsPage.${sub}`)}</span>
                  </span>
                  {selected ? (
                    <span className="grid h-6 w-6 flex-none place-items-center rounded-full bg-[#24478a] text-white">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  ) : recommended ? (
                    <span className="flex-none rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      {t('alertsPage.recommended')}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Step>

        <Step n={3} title={t('alertsPage.s3')} hint={t('alertsPage.s3Hint')}>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t('alertsPage.keywords')}</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('alertsPage.keywordsHint')}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {form.keywords.map((kw) => (
                  <li key={kw} className="inline-flex items-center gap-1.5 rounded-lg bg-[#eaf0fb] py-1 pl-3 pr-1 text-xs font-semibold text-[#1b3a72] ring-1 ring-[#c9d8f1] dark:bg-slate-800 dark:text-blue-200 dark:ring-slate-600">
                    {kw}
                    <button
                      type="button"
                      onClick={() => patch({ keywords: form.keywords.filter((k) => k !== kw) })}
                      aria-label={t('alertsPage.removeKeyword', { keyword: kw })}
                      className="grid h-6 w-6 place-items-center rounded-md text-[#24478a]/70 transition hover:bg-red-600 hover:text-white dark:text-blue-200"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder={t('alertsPage.addKeyword')}
                  aria-label={t('alertsPage.addKeyword')}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={addKeyword}
                  disabled={!keywordInput.trim()}
                  className={`inline-flex h-11 flex-none items-center gap-1.5 rounded-xl bg-[#24478a] px-4 text-sm font-bold text-white transition hover:bg-[#1c3a72] disabled:opacity-50 ${FOCUS}`}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('alertsPage.add')}
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 dark:border-slate-800">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <MapPin className="h-4 w-4 text-teal-700" aria-hidden="true" />
                {t('alertsPage.cities')}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t('alertsPage.citiesHint')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {RDC_CITIES.map((city) => {
                  const selected = form.cities.includes(city);
                  return (
                    <button
                      key={city}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCity(city)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition ${FOCUS} ${
                        selected
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-teal-600 hover:text-teal-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      {city}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </Step>

        <Step n={4} last title={t('alertsPage.s4')} hint={t('alertsPage.s4Hint')}>
          {alertLog.length ? (
            <ol className="relative space-y-4">
              <span className="absolute bottom-3 left-[15px] top-3 w-px bg-slate-200 dark:bg-slate-700" aria-hidden="true" />
              {alertLog.slice(0, 8).map((log, i) => (
                <li key={`${log.time}-${i}`} className="relative flex items-start gap-4">
                  <span className="relative grid h-8 w-8 flex-none place-items-center rounded-full bg-[#e3ebf9] text-[#24478a] ring-4 ring-white dark:bg-slate-700 dark:text-blue-200 dark:ring-slate-900">
                    {log.type === 'email' ? <Mail className="h-4 w-4" aria-hidden="true" /> : <Bell className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {t('alertsPage.logEntry', { count: log.count, city: log.city })}
                    </p>
                    <p className="text-xs text-slate-400">{logTime(log.time)}</p>
                  </div>
                  <span className="inline-flex flex-none items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {t('alertsPage.sent')}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
              {t('alertsPage.logEmpty')}
            </p>
          )}
        </Step>
      </ol>

      {/* Appears as soon as something changed and has not been saved */}
      {dirty ? (
        <div className="sticky bottom-3 z-20 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 pl-5 shadow-2xl dark:border-slate-600 dark:bg-slate-900" role="status">
          <p className="flex items-center gap-2.5 text-sm font-bold text-slate-800 dark:text-slate-100">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
            {t('alertsPage.dirty')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reload}
              className={`rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800 ${FOCUS}`}
            >
              {t('alertsPage.discard')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {saving ? t('alertsPage.saving') : t('alertsPage.save')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
