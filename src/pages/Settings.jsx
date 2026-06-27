import { useEffect, useState } from 'react';
import {
  Bell,
  Building2,
  Globe,
  Mail,
  RefreshCw,
  Save,
  Settings2,
  Sparkles,
  TestTube2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LanguageSelect from '../components/layout/LanguageSelect.jsx';

const TABS = [
  { id: 'profile', label: 'Profil M-ECAL', icon: Building2 },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'integrations', label: 'Intégrations', icon: Mail }
];

const PROFILE_FIELDS = [
  ['companyName', 'Nom entreprise'],
  ['director', 'Directeur'],
  ['email', 'Email'],
  ['phone', 'Téléphone'],
  ['address', 'Adresse'],
  ['yearsExperience', 'Années d\'expérience'],
  ['projectReferences', 'Références projets']
];

export default function Settings({ compact = false }) {
  const { user, refreshMe } = useApp();
  const { t, lang } = useI18n();
  const [tab, setTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [alertFrequency, setAlertFrequency] = useState('daily');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [digestEmail, setDigestEmail] = useState('');
  const [keywords, setKeywords] = useState('');
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!user) return;
    setAlertsEnabled(user.alertsEnabled);
    setAlertFrequency(user.alertFrequency);
    setWhatsappNumber(user.whatsappNumber || '');
    setDigestEmail(user.digestEmail || user.email || '');
    setKeywords((user.keywords || []).join(', '));
  }, [user]);

  useEffect(() => {
    api.get('/api/settings/profile').then(({ data }) => setProfile(data)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/api/auth/settings', {
        alertsEnabled,
        alertFrequency,
        whatsappNumber,
        digestEmail,
        keywords: keywords
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        preferredLanguage: lang
      });
      if (profile) {
        await api.put('/api/settings/profile', profile);
      }
      await refreshMe();
      toast.success('Paramètres enregistrés');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const testNotif = async () => {
    try {
      const { data } = await api.post('/api/auth/test-notification', {
        email: digestEmail,
        whatsappTo: whatsappNumber ? `whatsapp:${whatsappNumber.replace(/^whatsapp:/, '')}` : undefined
      });
      toast.success(`Test envoyé : ${JSON.stringify(data.channels)}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Test impossible');
    }
  };

  const scrape = async () => {
    try {
      const { data } = await api.post('/api/opportunities/scrape');
      toast.success(`${data.saved} opportunité(s) collectée(s)`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Collecte impossible');
    }
  };

  const connectGmail = async () => {
    try {
      const { data } = await api.get('/api/gmail/auth-url');
      if (data.authUrl) window.location.href = data.authUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || 'Configuration Gmail OAuth2 manquante');
      if (e.response?.data?.hint) toast(e.response.data.hint, { duration: 6000 });
    }
  };

  if (compact) {
    return (
      <div className="space-y-4">
        <LanguageSelect className="w-full max-w-xs" />
        <button type="button" onClick={save} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white">
          {t('common.save')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 p-6 text-white shadow-xl shadow-blue-500/20">
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-100">Configuration</p>
            <h1 className="mt-1 text-2xl font-bold">{t('settings.title')}</h1>
            <p className="mt-2 max-w-xl text-sm text-blue-100/90">
              Profil M-ECAL pour l&apos;IA, alertes veille, langue et intégrations Gmail.
            </p>
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Enregistrement…' : t('common.save')}
          </button>
        </div>
        <Settings2 className="absolute -bottom-4 -right-4 h-32 w-32 text-white/10" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
              tab === id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'profile' && profile ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
              <Sparkles className="h-5 w-5 text-indigo-500" />
              <div>
                <h2 className="font-bold text-slate-900 dark:text-white">Profil M-ECAL pour l&apos;IA</h2>
                <p className="text-xs text-slate-500">Utilisé par l&apos;agent IA, les CV et lettres de motivation</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {PROFILE_FIELDS.map(([key, label]) => (
                <label key={key} className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600 dark:text-slate-400">{label}</span>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    value={profile[key] || ''}
                    onChange={(e) => setProfile((c) => ({ ...c, [key]: e.target.value }))}
                  />
                </label>
              ))}
            </div>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600 dark:text-slate-400">Description entreprise</span>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={profile.description || ''}
                onChange={(e) => setProfile((c) => ({ ...c, description: e.target.value }))}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600 dark:text-slate-400">Services offerts (un par ligne)</span>
              <textarea
                className="min-h-[120px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={(profile.services || []).join('\n')}
                onChange={(e) =>
                  setProfile((c) => ({ ...c, services: e.target.value.split('\n').filter(Boolean) }))
                }
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600 dark:text-slate-400">Villes d&apos;intervention</span>
                <input
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  value={(profile.cities || []).join(', ')}
                  onChange={(e) =>
                    setProfile((c) => ({
                      ...c,
                      cities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    }))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-600 dark:text-slate-400">Ton des emails</span>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  value={profile.emailTone || 'formel'}
                  onChange={(e) => setProfile((c) => ({ ...c, emailTone: e.target.value }))}
                >
                  <option value="formel">Formel</option>
                  <option value="semi-formel">Semi-formel</option>
                </select>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <h3 className="font-semibold text-slate-900 dark:text-white">Statut IA</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <span>Anthropic (Claude)</span>
                  <span className={profile.anthropicConfigured ? 'text-emerald-600' : 'text-amber-600'}>
                    {profile.anthropicConfigured ? '✓ Actif' : 'Clé absente'}
                  </span>
                </li>
                <li className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-950">
                  <span>Gmail</span>
                  <span className={profile.gmailConnected ? 'text-emerald-600' : 'text-slate-500'}>
                    {profile.gmailConnected ? '✓ Connecté' : 'Non connecté'}
                  </span>
                </li>
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                L&apos;agent utilise Claude → Groq → Gemini → analyse locale si les quotas sont épuisés.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold text-slate-900 dark:text-white">{t('settings.langPrefs')}</h3>
              </div>
              <div className="mt-3">
                <LanguageSelect className="w-full" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'alerts' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Bell className="h-5 w-5 text-blue-500" />
            {t('settings.alerts')}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlertsEnabled(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('settings.alertsOn')}</span>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">{t('settings.frequency')}</span>
              <select
                value={alertFrequency}
                onChange={(e) => setAlertFrequency(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="immediate">{t('settings.immediate')}</option>
                <option value="daily">{t('settings.daily')}</option>
                <option value="weekly">{t('settings.weekly')}</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">{t('settings.whatsapp')}</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+243..."
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-600">{t('settings.digestEmail')}</span>
              <input
                type="email"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={digestEmail}
                onChange={(e) => setDigestEmail(e.target.value)}
              />
            </label>
            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block font-medium text-slate-600">{t('settings.keywords')}</span>
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="logistique, supply chain, inventaire…"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={testNotif}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800"
          >
            <TestTube2 className="h-4 w-4" />
            {t('settings.test')}
          </button>
        </div>
      ) : null}

      {tab === 'integrations' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40">
              <Mail className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-bold text-slate-900 dark:text-white">Gmail OAuth2</h3>
            <p className="mt-1 text-sm text-slate-500">
              Connectez votre compte pour la messagerie clients et les candidatures par email.
            </p>
            <button
              type="button"
              onClick={connectGmail}
              className="mt-4 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              Connecter Gmail
            </button>
          </div>

          {['Admin', 'admin'].includes(user?.role) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-bold text-slate-900 dark:text-white">Collecte manuelle</h3>
              <p className="mt-1 text-sm text-slate-500">
                Lance une collecte immédiate sur toutes les sources de veille configurées.
              </p>
              <button
                type="button"
                onClick={scrape}
                className="mt-4 rounded-xl border border-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/30"
              >
                {t('settings.scrape')}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
