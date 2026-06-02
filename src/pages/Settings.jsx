import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import toast from 'react-hot-toast';

export default function Settings({ compact = false }) {
  const { user, refreshMe } = useApp();
  const { t, lang, setLang } = useI18n();
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
      toast.success('OK');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const testNotif = async () => {
    try {
      const { data } = await api.post('/api/auth/test-notification', {
        email: digestEmail,
        whatsappTo: whatsappNumber ? `whatsapp:${whatsappNumber.replace(/^whatsapp:/, '')}` : undefined
      });
      toast.success(JSON.stringify(data.channels));
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const scrape = async () => {
    try {
      const { data } = await api.post('/api/opportunities/scrape');
      toast.success(`saved: ${data.saved}`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
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

  return (
    <div className="max-w-xl space-y-6">
      {!compact && <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('settings.title')}</h1>}

      <div className="glass-panel rounded-xl p-6 space-y-4">
        {!compact && profile && (
          <>
            <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wide">Profil M-ECAL pour l’IA</h2>
            {[
              ['companyName', 'Nom entreprise'],
              ['director', 'Directeur'],
              ['email', 'Email'],
              ['phone', 'Téléphone'],
              ['address', 'Adresse'],
              ['yearsExperience', 'Années d’expérience'],
              ['projectReferences', 'Références projets']
            ].map(([key, label]) => (
              <label key={key} className="block text-sm text-slate-500 dark:text-slate-400">
                {label}
                <input
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                  value={profile[key] || ''}
                  onChange={(e) => setProfile((current) => ({ ...current, [key]: e.target.value }))}
                />
              </label>
            ))}
            <label className="block text-sm text-slate-500 dark:text-slate-400">
              Description entreprise
              <textarea
                className="mt-1 min-h-[90px] w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                value={profile.description || ''}
                onChange={(e) => setProfile((current) => ({ ...current, description: e.target.value }))}
              />
            </label>
            <label className="block text-sm text-slate-500 dark:text-slate-400">
              Services offerts (un par ligne)
              <textarea
                className="mt-1 min-h-[120px] w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                value={(profile.services || []).join('\n')}
                onChange={(e) => setProfile((current) => ({ ...current, services: e.target.value.split('\n').filter(Boolean) }))}
              />
            </label>
            <label className="block text-sm text-slate-500 dark:text-slate-400">
              Villes d’intervention (séparées par virgules)
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                value={(profile.cities || []).join(', ')}
                onChange={(e) => setProfile((current) => ({ ...current, cities: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }))}
              />
            </label>
            <label className="block text-sm text-slate-500 dark:text-slate-400">
              Ton des emails
              <select
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                value={profile.emailTone || 'formel'}
                onChange={(e) => setProfile((current) => ({ ...current, emailTone: e.target.value }))}
              >
                <option value="formel">Formel</option>
                <option value="semi-formel">Semi-formel</option>
              </select>
            </label>
            <div className="rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-900">
              Anthropic: {profile.anthropicConfigured ? 'configuré' : 'clé absente'} · Gmail: {profile.gmailConnected ? 'connecté' : 'non connecté'}
            </div>
          </>
        )}
        <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wide">{t('settings.langPrefs')}</h2>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="sw">Kiswahili</option>
        </select>

        <h2 className="text-sm font-semibold text-blue-300 uppercase tracking-wide pt-2">{t('settings.alerts')}</h2>
        <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={alertsEnabled}
            onChange={(e) => setAlertsEnabled(e.target.checked)}
          />
          {t('settings.alertsOn')}
        </label>
        <label className="block text-sm text-slate-400">{t('settings.frequency')}</label>
        <select
          value={alertFrequency}
          onChange={(e) => setAlertFrequency(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
        >
          <option value="immediate">{t('settings.immediate')}</option>
          <option value="daily">{t('settings.daily')}</option>
          <option value="weekly">{t('settings.weekly')}</option>
        </select>
        <label className="block text-sm text-slate-400">{t('settings.whatsapp')}</label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          placeholder="+243..."
        />
        <label className="block text-sm text-slate-400">{t('settings.digestEmail')}</label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          type="email"
          value={digestEmail}
          onChange={(e) => setDigestEmail(e.target.value)}
        />
        <label className="block text-sm text-slate-400">{t('settings.keywords')}</label>
        <input
          className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />

        <div className="flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            {t('common.save')}
          </button>
          <button
            type="button"
            onClick={testNotif}
            className="rounded-lg border border-slate-400 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:border-slate-500 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('settings.test')}
          </button>
          {['Admin', 'admin'].includes(user?.role) && (
            <button
              type="button"
              onClick={scrape}
              className="rounded-lg border border-blue-500/50 px-4 py-2 text-sm text-blue-200 hover:bg-blue-900/20"
            >
              {t('settings.scrape')}
            </button>
          )}
          <button
            type="button"
            onClick={connectGmail}
            className="rounded-lg border border-red-500/50 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-900/20"
          >
            Connecter Gmail
          </button>
        </div>
      </div>
    </div>
  );
}
