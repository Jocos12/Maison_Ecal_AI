import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BadgeCheck,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Plug,
  Plus,
  RefreshCw,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  TestTube2,
  Trash2,
  User,
  UserRound,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client.js';
import LanguageMenu from '../components/layout/LanguageMenu.jsx';
import PhoneField from '../components/ui/PhoneField.jsx';
import { useApp } from '../context/AppContext.jsx';
import { useUiLocale } from '../hooks/useUiLocale.js';
import { AVATAR_MAX_INPUT_BYTES, toAvatarDataUrl } from '../utils/avatarImage.js';
import { COUNTRY_BY_ISO, parsePhone } from '../utils/phoneCountries.js';

const FOCUS = 'focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25';
const CARD = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const INPUT =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#24478a] focus:ring-4 focus:ring-[#24478a]/15 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const TEXTAREA = `${INPUT.replace('h-11', '')} min-h-[7rem] py-2.5 resize-y`;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const NAV = [
  { id: 'account', icon: User },
  { id: 'security', icon: Lock },
  { id: 'preferences', icon: Globe },
  { id: 'company', icon: Building2 },
  { id: 'integrations', icon: Plug }
];

const COMPANY_FIELDS = [
  ['companyName', 'companyName'],
  ['director', 'director'],
  ['email', 'companyEmail'],
  ['phone', 'companyPhone'],
  ['address', 'address'],
  ['yearsExperience', 'yearsExperience']
];

function initialsOf(user) {
  const words = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return String(user?.email || '?')[0].toUpperCase();
}

/** Given name and family name of the account; older accounts only have a full name, which is split on the first space. */
function namesOf(user) {
  const first = String(user?.firstName || '').trim();
  const last = String(user?.lastName || '').trim();
  if (first || last) return { first, last };
  const parts = String(user?.name || '').trim().split(/\s+/).filter(Boolean);
  return { first: parts[0] || '', last: parts.slice(1).join(' ') };
}

/** The phone number on file: the professional one, else the WhatsApp number given elsewhere, without any "whatsapp:" prefix. */
function registeredPhoneOf(user) {
  const stored = String(user?.phone || user?.whatsappNumber || '').replace(/^whatsapp:/i, '').trim();
  const { iso, digits } = parsePhone(stored);
  return digits ? '+' + COUNTRY_BY_ISO[iso].dial + ' ' + digits : '';
}

const CITY_SUGGESTIONS = ['Kinshasa', 'Goma', 'Bukavu', 'Lubumbashi', 'Kalemie', 'Kolwezi', 'Matadi', 'Mbuji-Mayi', 'Kisangani', 'Kananga'];

const filled = (value) => String(value ?? '').trim().length > 0;

/** Ten headings of the company file; the share that is filled in drives the ring on the card. */
function companyCompletion(p) {
  const checks = [
    filled(p.companyName),
    filled(p.director),
    filled(p.email),
    String(p.phone || '').replace(/\D/g, '').length > 4,
    filled(p.address),
    filled(p.yearsExperience),
    filled(p.description),
    filled(p.projectReferences),
    (p.services || []).length > 0,
    (p.cities || []).length > 0
  ];
  const done = checks.filter(Boolean).length;
  return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
}

/** Blue identity card of the company, rebuilt live from the form below it. */
function CompanyCard({ profile, t }) {
  const { done, total, pct } = companyCompletion(profile);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const phone = String(profile.phone || '').replace(/\D/g, '').length > 4 ? profile.phone : '';
  const chips = [
    [Mail, profile.email],
    [Phone, phone],
    [MapPin, profile.address],
    [Award, filled(profile.yearsExperience) ? t('settingsPage.yearsCount', { count: String(profile.yearsExperience).trim() }) : '']
  ].filter(([, value]) => filled(value));
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#24478a] p-6 text-white shadow-sm md:p-7">
      <span className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border-[30px] border-white/5" aria-hidden="true" />
      <span className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full border-[24px] border-white/5" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-6">
        <div className="flex min-w-0 flex-1 basis-72 items-start gap-4">
          <span className="grid h-16 w-16 flex-none place-items-center rounded-2xl bg-white text-[#24478a] shadow-sm">
            <Building2 className="h-8 w-8" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-blue-200">
              {t('settingsPage.companyCardTag')}
              <span className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[10px] tracking-wide text-white">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                {t('settingsPage.aiBadge')}
              </span>
            </p>
            <h2 className="mt-1.5 break-words text-2xl font-extrabold leading-tight">{filled(profile.companyName) ? profile.companyName : t('settingsPage.companyName')}</h2>
            {filled(profile.director) ? <p className="mt-1 text-sm text-blue-100">{t('settingsPage.directorLine', { name: profile.director })}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
          <div className="relative h-[84px] w-[84px] flex-none">
            <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90" role="img" aria-label={t('settingsPage.completion')}>
              <circle cx="42" cy="42" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="8" />
              <circle cx="42" cy="42" r={radius} fill="none" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(pct / 100) * circumference} ${circumference}`} />
            </svg>
            <span className="absolute inset-0 grid place-items-center text-lg font-extrabold tabular-nums">{pct}%</span>
          </div>
          <div className="max-w-[11rem]">
            <p className="text-sm font-bold">{t('settingsPage.completion')}</p>
            <p className="mt-0.5 text-xs leading-snug text-blue-100">{t('settingsPage.fieldsFilled', { done, total })}</p>
          </div>
        </div>
      </div>

      {chips.length ? (
        <ul className="relative mt-5 flex flex-wrap gap-2">
          {chips.map(([ChipIcon, value]) => (
            <li key={value} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
              <ChipIcon className="h-3.5 w-3.5 flex-none text-blue-200" aria-hidden="true" />
              <span className="min-w-0 break-words">{value}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

/** Text box with an "add" button: Enter also adds. */
function AddRow({ id, value, onChange, onAdd, placeholder, label }) {
  return (
    <div className="flex gap-2">
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
        className={INPUT}
      />
      <button
        type="button"
        onClick={onAdd}
        disabled={!value.trim()}
        className={`inline-flex h-11 flex-none items-center gap-2 rounded-xl border border-[#24478a] bg-white px-4 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>
    </div>
  );
}

function passwordRules(pw) {
  return {
    length: pw.length >= 8,
    case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    digit: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw)
  };
}

function SectionCard({ icon: Icon, tone = 'bg-[#e3ebf9] text-[#24478a]', title, hint, children, footer }) {
  return (
    <section className={CARD}>
      <header className="flex items-start gap-3.5 border-b border-slate-100 p-5 md:px-6 dark:border-slate-800">
        <span className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold leading-tight text-slate-900 dark:text-white">{title}</h2>
          {hint ? <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
      </header>
      <div className="space-y-5 p-5 md:p-6">{children}</div>
      {footer ? <footer className="flex flex-wrap items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-5 py-4 md:px-6 dark:border-slate-800 dark:bg-slate-800/40">{footer}</footer> : null}
    </section>
  );
}

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-bold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p> : hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </div>
  );
}

function PasswordField({ id, label, value, onChange, autoComplete, error, t }) {
  const [shown, setShown] = useState(false);
  return (
    <Field id={id} label={label} error={error}>
      <div className="relative">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          className={`${INPUT} pr-11 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/15' : ''}`}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? t('settingsPage.hidePassword') : t('settingsPage.showPassword')}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700"
        >
          {shown ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
    </Field>
  );
}

function PrimaryButton({ busy, disabled, onClick, children, icon: Icon = Save, tone = 'blue' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS} ${
        tone === 'red' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#24478a] hover:bg-[#1c3a72]'
      }`}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
      {children}
    </button>
  );
}

function StatusRow({ label, ok, okLabel, offLabel }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-3 ring-1 ring-slate-100 dark:bg-slate-800/60 dark:ring-slate-700">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${
          ok
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900'
            : 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
        {ok ? okLabel : offLabel}
      </span>
    </li>
  );
}

export default function Settings({ compact = false }) {
  const { user, setUser, refreshMe } = useApp();
  const { t, dateLocale } = useUiLocale();
  const [section, setSection] = useState('account');
  const fileRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // account
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneState, setPhoneState] = useState('empty');
  const [savingAccount, setSavingAccount] = useState(false);
  const [emailStep, setEmailStep] = useState('idle'); // idle | form | code
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  // security
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);

  // company profile and integrations
  const [profile, setProfile] = useState(null);
  const [profileSnapshot, setProfileSnapshot] = useState('');
  const [serviceDraft, setServiceDraft] = useState('');
  const [endBar, setEndBar] = useState(null);
  const [endInView, setEndInView] = useState(false);
  const [cityDraft, setCityDraft] = useState('');
  const [profileState, setProfileState] = useState('loading');
  const [savingProfile, setSavingProfile] = useState(false);
  const [testing, setTesting] = useState(false);
  const [scraping, setScraping] = useState(false);

  useEffect(() => {
    if (!user) return;
    const names = namesOf(user);
    setFirstName(names.first);
    setLastName(names.last);
    setPhone(registeredPhoneOf(user));
  }, [user?.name, user?.firstName, user?.lastName, user?.phone, user?.whatsappNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (compact) return;
    api
      .get('/api/settings/profile')
      .then(({ data }) => {
        setProfile(data);
        setProfileSnapshot(JSON.stringify(data));
        setProfileState('ready');
      })
      .catch(() => setProfileState('error'));
  }, [compact]);

  // While the company form is being scrolled the save control sits under the left menu; once the bottom of
  // the form comes into view it settles there instead.
  useEffect(() => {
    if (!endBar || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setEndInView(entry.isIntersecting), { threshold: 0.6 });
    observer.observe(endBar);
    return () => observer.disconnect();
  }, [endBar]);

  const isAdmin = ['Admin', 'admin'].includes(user?.role);
  const roleKey = ['admin', 'manager', 'analyste'].includes(String(user?.role || '').toLowerCase()) ? String(user.role).toLowerCase() : 'user';
  const registeredPhone = registeredPhoneOf(user);
  const accountDirty =
    Boolean(user) &&
    (firstName.trim() !== namesOf(user).first || lastName.trim() !== namesOf(user).last || phone !== registeredPhone);
  const rules = useMemo(() => passwordRules(newPassword), [newPassword]);
  const score = Object.values(rules).filter(Boolean).length + (newPassword.length >= 12 ? 1 : 0);
  const level = newPassword ? (score <= 2 ? 'weak' : score === 3 ? 'medium' : 'strong') : null;
  const filledBars = level === 'weak' ? 1 : level === 'medium' ? 2 : level === 'strong' ? 4 : 0;
  const levelStyle = { weak: ['bg-red-500', 'text-red-600'], medium: ['bg-amber-500', 'text-amber-600'], strong: ['bg-emerald-500', 'text-emerald-600'] };
  const mismatch = Boolean(confirmPassword) && confirmPassword !== newPassword;

  if (compact) {
    return (
      <div className="space-y-4">
        <LanguageMenu variant="field" className="w-full max-w-xs" />
      </div>
    );
  }

  const pickPhoto = () => {
    if (!photoBusy) fileRef.current?.click();
  };

  const onPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > AVATAR_MAX_INPUT_BYTES) {
      toast.error(t('sidebar.photoInvalid'));
      return;
    }
    setPhotoBusy(true);
    try {
      const image = await toAvatarDataUrl(file);
      const { data } = await api.put('/api/auth/avatar', { image });
      setUser((current) => ({ ...current, avatar: data?.avatar ?? image }));
      toast.success(t('sidebar.photoUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.message || t('sidebar.photoError'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (photoBusy) return;
    setPhotoBusy(true);
    try {
      await api.delete('/api/auth/avatar');
      setUser((current) => ({ ...current, avatar: '' }));
    } catch (err) {
      toast.error(err.response?.data?.message || t('sidebar.photoError'));
    } finally {
      setPhotoBusy(false);
    }
  };

  const saveAccount = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error(t('settingsPage.namesInvalid'));
      return;
    }
    if (phoneState === 'partial') {
      toast.error(t('settingsPage.phoneIncomplete'));
      return;
    }
    setSavingAccount(true);
    try {
      const { data } = await api.patch('/api/auth/settings', { firstName: firstName.trim(), lastName: lastName.trim(), phone });
      // The server answers with the stored account: if the new values are not in it, nothing was saved
      if ((data?.firstName ?? '') !== firstName.trim() || (data?.lastName ?? '') !== lastName.trim() || (data?.phone ?? '') !== phone) {
        throw new Error('not-saved');
      }
      await refreshMe();
      toast.success(t('settingsPage.saved'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.saveFail'));
    } finally {
      setSavingAccount(false);
    }
  };

  const resetEmailFlow = () => {
    setEmailStep('idle');
    setNewEmail('');
    setEmailPassword('');
    setEmailCode('');
  };

  const requestEmailChange = async () => {
    if (!EMAIL_RE.test(newEmail.trim())) {
      toast.error(t('settingsPage.emailInvalid'));
      return;
    }
    if (!emailPassword) {
      toast.error(t('settingsPage.passwordRequired'));
      return;
    }
    setEmailBusy(true);
    try {
      const { data } = await api.post('/api/auth/email/request', { newEmail: newEmail.trim(), password: emailPassword });
      if (data.changed) {
        await refreshMe();
        toast.success(t('settingsPage.emailChanged'));
        resetEmailFlow();
      } else {
        setSentTo(data.sentTo || newEmail.trim());
        setEmailStep('code');
        await refreshMe();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.saveFail'));
    } finally {
      setEmailBusy(false);
    }
  };

  const confirmEmailChange = async () => {
    if (!/^\d{6}$/.test(emailCode.trim())) {
      toast.error(t('settingsPage.codeInvalid'));
      return;
    }
    setEmailBusy(true);
    try {
      await api.post('/api/auth/email/confirm', { code: emailCode.trim() });
      await refreshMe();
      toast.success(t('settingsPage.emailChanged'));
      resetEmailFlow();
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.saveFail'));
    } finally {
      setEmailBusy(false);
    }
  };

  const cancelEmailChange = async () => {
    if (user?.pendingEmail) {
      try {
        await api.delete('/api/auth/email/pending');
        await refreshMe();
      } catch {
        /* the pending request simply expires */
      }
    }
    resetEmailFlow();
  };

  const changePassword = async () => {
    if (!currentPassword) {
      toast.error(t('settingsPage.passwordRequired'));
      return;
    }
    if (!rules.length || mismatch || !confirmPassword) {
      toast.error(mismatch || !confirmPassword ? t('settingsPage.mismatch') : t('settingsPage.ruleLength'));
      return;
    }
    setPasswordBusy(true);
    try {
      await api.put('/api/auth/password', { currentPassword, newPassword });
      toast.success(t('settingsPage.passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.saveFail'));
    } finally {
      setPasswordBusy(false);
    }
  };

  const saveCompany = async () => {
    if (!profile) return;
    setSavingProfile(true);
    try {
      await api.put('/api/settings/profile', profile);
      setProfileSnapshot(JSON.stringify(profile));
      toast.success(t('settingsPage.companySaved'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.saveFail'));
    } finally {
      setSavingProfile(false);
    }
  };

  const updateProfile = (key, value) => setProfile((c) => ({ ...c, [key]: value }));
  const addToProfileList = (key, draft, clear) => {
    const value = draft.trim();
    if (!value) return;
    setProfile((c) => {
      const list = c[key] || [];
      return list.some((item) => item.toLowerCase() === value.toLowerCase()) ? c : { ...c, [key]: [...list, value] };
    });
    clear('');
  };
  const removeFromProfileList = (key, item) => setProfile((c) => ({ ...c, [key]: (c[key] || []).filter((x) => x !== item) }));
  const profileDirty = Boolean(profile) && JSON.stringify(profile) !== profileSnapshot;

  const testNotif = async () => {
    setTesting(true);
    try {
      const to = user?.whatsappNumber || user?.phone;
      await api.post('/api/auth/test-notification', {
        email: user?.digestEmail || user?.email,
        whatsappTo: to ? `whatsapp:${String(to).replace(/^whatsapp:/, '').replace(/\s/g, '')}` : undefined
      });
      toast.success(t('settingsPage.testSent'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.testFail'));
    } finally {
      setTesting(false);
    }
  };

  const scrape = async () => {
    setScraping(true);
    try {
      const { data } = await api.post('/api/opportunities/scrape');
      toast.success(t('settingsPage.scrapeDone', { count: data.saved ?? 0 }));
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.scrapeFail'));
    } finally {
      setScraping(false);
    }
  };

  const connectGmail = async () => {
    try {
      const { data } = await api.get('/api/gmail/auth-url');
      if (data.authUrl) window.location.href = data.authUrl;
    } catch (e) {
      toast.error(e.response?.data?.message || t('settingsPage.gmailMissing'));
      if (e.response?.data?.hint) toast(e.response.data.hint, { duration: 6000 });
    }
  };

  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' }) : null;
  const lastLogin = user?.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString(dateLocale, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="page-shell space-y-6 pb-10">
      {/* Profile card: cover, picture, identity */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="relative h-28 bg-[#24478a] md:h-32">
          <span className="pointer-events-none absolute -right-14 -top-20 h-56 w-56 rounded-full border-[30px] border-white/5" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full border-[24px] border-white/5" aria-hidden="true" />
          <span className="absolute left-5 top-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white md:left-7">
            <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t('settingsPage.pageTag')}
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4 px-5 pb-6 md:px-7">
          <div className="group/avatar relative -mt-14 h-28 w-28 flex-none">
            <button
              type="button"
              onClick={pickPhoto}
              aria-label={t('settingsPage.changePhoto')}
              className={`relative h-full w-full overflow-hidden rounded-full shadow-lg ring-4 ring-white dark:ring-slate-900 ${FOCUS}`}
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-full w-full object-cover" draggable={false} />
              ) : (
                <span className="grid h-full w-full place-items-center bg-[#e3ebf9] text-4xl font-extrabold tracking-wide text-[#24478a]">{initialsOf(user)}</span>
              )}
              <span
                className={`absolute inset-0 grid place-items-center bg-[#24478a]/70 text-white transition ${
                  photoBusy ? 'opacity-100' : 'opacity-0 group-hover/avatar:opacity-100 group-focus-within/avatar:opacity-100'
                }`}
              >
                {photoBusy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" />}
              </span>
            </button>
            <span className="absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-[3px] border-white bg-emerald-500 dark:border-slate-900" aria-hidden="true" />
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPhoto} />
          </div>

          <div className="min-w-0 flex-1 basis-56 pt-3">
            <h1 className="break-words text-2xl font-extrabold leading-tight tracking-tight text-slate-950 dark:text-white">{user?.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                <Mail className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                {user?.email}
              </span>
              {registeredPhone ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                  <Phone className="h-3.5 w-3.5 flex-none text-[#24478a] dark:text-blue-300" aria-hidden="true" />
                  {registeredPhone}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSection('account');
                    window.setTimeout(() => document.getElementById('settings-phone')?.focus(), 60);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-2 py-0.5 text-xs font-bold text-slate-500 transition hover:border-[#24478a] hover:text-[#24478a] ${FOCUS}`}
                >
                  <Phone className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                  {t('settingsPage.addPhone')}
                </button>
              )}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e3ebf9] px-2.5 py-1 text-xs font-bold text-[#24478a] dark:bg-slate-700 dark:text-blue-200">
                {roleKey === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
                {t(`sidebar.roles.${roleKey}`)}
              </span>
              {user?.isVerified ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900">
                  <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('settingsPage.verified')}
                </span>
              ) : null}
              {memberSince ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('settingsPage.memberSince', { date: memberSince })}
                </span>
              ) : null}
              {lastLogin ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('settingsPage.lastLogin', { date: lastLogin })}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-3">
            <button
              type="button"
              onClick={pickPhoto}
              disabled={photoBusy}
              className={`inline-flex items-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:opacity-60 ${FOCUS}`}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {t('settingsPage.changePhoto')}
            </button>
            {user?.avatar ? (
              <button
                type="button"
                onClick={removePhoto}
                disabled={photoBusy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-red-600 hover:bg-red-600 hover:text-white focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t('settingsPage.removePhoto')}
              </button>
            ) : null}
          </div>
          <p className="basis-full text-xs text-slate-400">{t('settingsPage.photoHint')}</p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[14.5rem_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-4 lg:sticky lg:top-2">
        <nav className={`${CARD} flex flex-wrap gap-1.5 p-2 lg:flex-col lg:gap-1`} aria-label={t('settingsPage.pageTag')}>
          {NAV.map(({ id, icon: NavIcon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${FOCUS} ${
                  active ? 'bg-[#24478a] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${active ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                  <NavIcon className="h-4 w-4" aria-hidden="true" />
                </span>
                {t(`settingsPage.nav.${id}`)}
              </button>
            );
          })}
        </nav>

        {section === 'company' && profile && profileState === 'ready' ? (
          <div
            className={`hidden rounded-2xl border bg-white p-4 shadow-sm transition-all duration-300 lg:block dark:bg-slate-900 ${
              endInView ? 'pointer-events-none translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
            } ${profileDirty ? 'border-amber-300' : 'border-slate-200 dark:border-slate-700'}`}
            aria-hidden={endInView}
          >
            <p className="flex items-center gap-2.5 text-[13px] font-bold text-slate-700 dark:text-slate-200">
              <span className={`h-2.5 w-2.5 flex-none rounded-full ${profileDirty ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} aria-hidden="true" />
              {profileDirty ? t('settingsPage.unsaved') : t('settingsPage.upToDate')}
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={saveCompany}
                disabled={!profileDirty || savingProfile}
                tabIndex={endInView ? -1 : 0}
                className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#24478a] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#1c3a72] disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS}`}
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {t('settingsPage.saveCompany')}
              </button>
            </div>
          </div>
        ) : null}
        </div>

        <div className="min-w-0 space-y-6">
          {section === 'account' ? (
            <SectionCard
              icon={User}
              title={t('settingsPage.personalTitle')}
              hint={t('settingsPage.personalHint')}
              footer={
                <PrimaryButton busy={savingAccount} disabled={!accountDirty} onClick={saveAccount}>
                  {savingAccount ? t('settingsPage.saving') : t('settingsPage.save')}
                </PrimaryButton>
              }
            >
              <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
                <Field id="settings-first-name" label={t('settingsPage.firstName')}>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input id="settings-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={60} placeholder={t('settingsPage.firstNamePlaceholder')} autoComplete="given-name" className={`${INPUT} pl-10`} />
                  </div>
                </Field>
                <Field id="settings-last-name" label={t('settingsPage.lastName')}>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                    <input id="settings-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={60} placeholder={t('settingsPage.lastNamePlaceholder')} autoComplete="family-name" className={`${INPUT} pl-10`} />
                  </div>
                </Field>
              </div>

              <div>
                <span className="mb-1.5 block text-[13px] font-bold text-slate-700 dark:text-slate-200">{t('settingsPage.email')}</span>
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-600 dark:bg-slate-800/60">
                  <Mail className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
                  <span className="min-w-0 flex-1 break-all text-sm font-semibold text-slate-800 dark:text-slate-100">{user?.email}</span>
                  {emailStep === 'idle' ? (
                    <button
                      type="button"
                      onClick={() => setEmailStep('form')}
                      className={`rounded-lg border border-[#24478a] bg-white px-3 py-1.5 text-xs font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
                    >
                      {t('settingsPage.changeEmail')}
                    </button>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('settingsPage.emailHint')}</p>

                {emailStep === 'idle' && user?.pendingEmail ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                    <span className="min-w-0 flex-1 break-words">{t('settingsPage.pendingEmail', { email: user.pendingEmail })}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSentTo(user.pendingEmail);
                        setEmailStep('code');
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white transition hover:bg-amber-700"
                    >
                      {t('settingsPage.enterCode')}
                    </button>
                  </div>
                ) : null}

                {emailStep === 'form' ? (
                  <div className="mt-3 space-y-4 rounded-xl border border-[#c9d8f1] bg-[#f4f7fd] p-4 dark:border-slate-600 dark:bg-slate-800/40">
                    <Field id="settings-new-email" label={t('settingsPage.newEmail')}>
                      <input id="settings-new-email" type="email" name="new-email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="off" className={INPUT} />
                    </Field>
                    <PasswordField id="settings-email-password" label={t('settingsPage.currentPassword')} value={emailPassword} onChange={setEmailPassword} autoComplete="current-password" t={t} />
                    <div className="flex flex-wrap gap-2">
                      <PrimaryButton busy={emailBusy} onClick={requestEmailChange} icon={Send}>
                        {emailBusy ? t('settingsPage.sending') : t('settingsPage.sendCode')}
                      </PrimaryButton>
                      <button type="button" onClick={resetEmailFlow} className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}>
                        {t('settingsPage.cancel')}
                      </button>
                    </div>
                  </div>
                ) : null}

                {emailStep === 'code' ? (
                  <div className="mt-3 space-y-4 rounded-xl border border-[#c9d8f1] bg-[#f4f7fd] p-4 dark:border-slate-600 dark:bg-slate-800/40">
                    <p className="flex items-start gap-2 text-[13px] font-semibold leading-relaxed text-[#1b3a72] dark:text-blue-200">
                      <Mail className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
                      {t('settingsPage.codeSent', { email: sentTo })}
                    </p>
                    <Field id="settings-email-code" label={t('settingsPage.code')}>
                      <input
                        id="settings-email-code"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ''))}
                        className={`${INPUT} max-w-[12rem] text-center text-lg font-bold tracking-[0.5em]`}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <PrimaryButton busy={emailBusy} onClick={confirmEmailChange} icon={Check}>
                        {t('settingsPage.confirmEmail')}
                      </PrimaryButton>
                      <button type="button" onClick={cancelEmailChange} className={`rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 ${FOCUS}`}>
                        {t('settingsPage.cancel')}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <Field id="settings-phone" label={t('settingsPage.phone')}>
                <PhoneField id="settings-phone" value={phone} onChange={setPhone} onStatus={setPhoneState} />
              </Field>
            </SectionCard>
          ) : null}

          {section === 'security' ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem] xl:items-start">
              <SectionCard
                icon={KeyRound}
                tone="bg-violet-50 text-violet-700"
                title={t('settingsPage.passwordTitle')}
                hint={t('settingsPage.passwordHint')}
                footer={
                  <PrimaryButton busy={passwordBusy} onClick={changePassword} icon={Lock}>
                    {t('settingsPage.updatePassword')}
                  </PrimaryButton>
                }
              >
                <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly tabIndex={-1} aria-hidden="true" className="sr-only" />
                <PasswordField id="settings-current-password" label={t('settingsPage.currentPassword')} value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" t={t} />
                <PasswordField id="settings-new-password" label={t('settingsPage.newPassword')} value={newPassword} onChange={setNewPassword} autoComplete="new-password" t={t} />

                <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100 dark:bg-slate-800/60 dark:ring-slate-700">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold">
                    <span className="text-slate-600 dark:text-slate-300">{t('settingsPage.strength')}</span>
                    <span className={level ? levelStyle[level][1] : 'text-slate-400'}>
                      {level === 'weak' ? t('settingsPage.strengthWeak') : level === 'medium' ? t('settingsPage.strengthMedium') : level === 'strong' ? t('settingsPage.strengthStrong') : ''}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-1.5" aria-hidden="true">
                    {[1, 2, 3, 4].map((n) => (
                      <span key={n} className={`h-1.5 rounded-full ${level && n <= filledBars ? levelStyle[level][0] : 'bg-slate-200 dark:bg-slate-700'}`} />
                    ))}
                  </div>
                  <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                    {[
                      ['length', 'ruleLength'],
                      ['case', 'ruleCase'],
                      ['digit', 'ruleDigit'],
                      ['symbol', 'ruleSymbol']
                    ].map(([key, label]) => (
                      <li key={key} className={`flex items-center gap-2 text-xs font-semibold ${rules[key] ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        <span className={`grid h-4 w-4 flex-none place-items-center rounded-full ${rules[key] ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700'}`}>
                          {rules[key] ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                        </span>
                        {t(`settingsPage.${label}`)}
                      </li>
                    ))}
                  </ul>
                </div>

                <PasswordField
                  id="settings-confirm-password"
                  label={t('settingsPage.confirmPassword')}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  error={mismatch ? t('settingsPage.mismatch') : ''}
                  t={t}
                />
              </SectionCard>

              <aside className="rounded-2xl border border-[#c9d8f1] bg-[#f4f7fd] p-5 dark:border-slate-700 dark:bg-slate-800/40">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#24478a] text-white">
                  <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">{t('settingsPage.tipTitle')}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{t('settingsPage.tipText')}</p>
              </aside>
            </div>
          ) : null}

          {section === 'preferences' ? (
            <div className="grid gap-6 md:grid-cols-2">
              <SectionCard icon={Globe} tone="bg-teal-50 text-teal-700" title={t('settingsPage.languageTitle')} hint={t('settingsPage.languageHint')}>
                <LanguageMenu variant="field" className="w-full" />
              </SectionCard>
              <SectionCard icon={Bell} tone="bg-amber-50 text-amber-700" title={t('settingsPage.alertsTitle')} hint={t('settingsPage.alertsHint')}>
                <Link
                  to="/alerts"
                  className={`inline-flex items-center gap-2 rounded-xl border border-[#24478a] bg-white px-4 py-2.5 text-sm font-bold text-[#24478a] transition hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 ${FOCUS}`}
                >
                  {t('settingsPage.openAlerts')}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </SectionCard>
            </div>
          ) : null}

          {section === 'company' ? (
            profileState === 'loading' ? (
              <p className="flex items-center gap-2 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t('settingsPage.companyLoading')}
              </p>
            ) : profileState === 'error' || !profile ? (
              <p className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-600">{t('settingsPage.companyUnavailable')}</p>
            ) : (
              <div className="space-y-6">
                <CompanyCard profile={profile} t={t} />

                <SectionCard icon={Building2} title={t('settingsPage.cardIdentityTitle')} hint={t('settingsPage.cardIdentityHint')}>
                  <div className="grid grid-cols-[minmax(0,1fr)] gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Field id="company-companyName" label={t('settingsPage.companyName')}>
                        <div className="relative">
                          <Building2 className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                          <textarea
                            id="company-companyName"
                            rows={2}
                            className={`${INPUT} h-auto min-h-[2.75rem] resize-none py-2.5 pl-10 leading-snug`}
                            value={profile.companyName || ''}
                            onChange={(e) => updateProfile('companyName', e.target.value.replace(/\n/g, ' '))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.preventDefault();
                            }}
                          />
                        </div>
                      </Field>
                    </div>
                    <Field id="company-director" label={t('settingsPage.director')}>
                      <div className="relative">
                        <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input id="company-director" className={`${INPUT} pl-10`} value={profile.director || ''} onChange={(e) => updateProfile('director', e.target.value)} />
                      </div>
                    </Field>
                    <Field id="company-yearsExperience" label={t('settingsPage.yearsExperience')}>
                      <div className="relative">
                        <Award className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input
                          id="company-yearsExperience"
                          inputMode="numeric"
                          maxLength={3}
                          className={`${INPUT} pl-10 pr-12`}
                          value={profile.yearsExperience || ''}
                          onChange={(e) => updateProfile('yearsExperience', e.target.value.replace(/\D/g, ''))}
                        />
                        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{t('settingsPage.yearsSuffix')}</span>
                      </div>
                    </Field>
                    <Field id="company-email" label={t('settingsPage.companyEmail')}>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                        <input id="company-email" type="email" className={`${INPUT} pl-10`} value={profile.email || ''} onChange={(e) => updateProfile('email', e.target.value)} />
                      </div>
                    </Field>
                    <Field id="company-phone" label={t('settingsPage.companyPhone')}>
                      <PhoneField id="company-phone" value={profile.phone || ''} onChange={(value) => updateProfile('phone', value)} />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field id="company-address" label={t('settingsPage.address')}>
                        <div className="relative">
                          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                          <input id="company-address" className={`${INPUT} pl-10`} value={profile.address || ''} onChange={(e) => updateProfile('address', e.target.value)} />
                        </div>
                      </Field>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={Briefcase} tone="bg-teal-50 text-teal-700" title={t('settingsPage.cardActivityTitle')} hint={t('settingsPage.cardActivityHint')}>
                  <Field id="company-description" label={t('settingsPage.description')} hint={t('settingsPage.descriptionHint')}>
                    <textarea id="company-description" className={TEXTAREA} value={profile.description || ''} onChange={(e) => updateProfile('description', e.target.value)} />
                  </Field>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="company-services" className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                        {t('settingsPage.serviceListLabel')}
                      </label>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">{(profile.services || []).length}</span>
                    </div>
                    {(profile.services || []).length ? (
                      <ul className="mb-3 space-y-2">
                        {(profile.services || []).map((service) => (
                          <li key={service} className="flex items-start gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100 dark:bg-slate-800/60 dark:ring-slate-700">
                            <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-md bg-teal-100 text-teal-700">
                              <Check className="h-3 w-3" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1 break-words text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">{service}</span>
                            <button
                              type="button"
                              onClick={() => removeFromProfileList('services', service)}
                              aria-label={t('settingsPage.removeItem', { item: service })}
                              className="grid h-6 w-6 flex-none place-items-center rounded-md text-slate-400 transition hover:bg-red-600 hover:text-white"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-center text-xs font-semibold text-slate-500 dark:border-slate-600">{t('settingsPage.servicesEmpty')}</p>
                    )}
                    <AddRow
                      id="company-services"
                      value={serviceDraft}
                      onChange={setServiceDraft}
                      onAdd={() => addToProfileList('services', serviceDraft, setServiceDraft)}
                      placeholder={t('settingsPage.servicePlaceholder')}
                      label={t('settingsPage.add')}
                    />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <label htmlFor="company-cities" className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                        {t('settingsPage.citiesLabel')}
                      </label>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">{(profile.cities || []).length}</span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(profile.cities || []).map((city) => (
                        <span key={city} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 py-1.5 pl-2.5 pr-1.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:text-teal-200 dark:ring-teal-900">
                          <MapPin className="h-3 w-3" aria-hidden="true" />
                          {city}
                          <button
                            type="button"
                            onClick={() => removeFromProfileList('cities', city)}
                            aria-label={t('settingsPage.removeItem', { item: city })}
                            className="grid h-5 w-5 place-items-center rounded-md text-teal-700 transition hover:bg-red-600 hover:text-white"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                      {!(profile.cities || []).length ? <p className="text-xs font-semibold text-slate-500">{t('settingsPage.citiesEmpty')}</p> : null}
                    </div>
                    <AddRow
                      id="company-cities"
                      value={cityDraft}
                      onChange={setCityDraft}
                      onAdd={() => addToProfileList('cities', cityDraft, setCityDraft)}
                      placeholder={t('settingsPage.cityPlaceholder')}
                      label={t('settingsPage.add')}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{t('settingsPage.suggestions')}</span>
                      {CITY_SUGGESTIONS.filter((city) => !(profile.cities || []).some((c) => c.toLowerCase() === city.toLowerCase())).map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => addToProfileList('cities', city, () => {})}
                          className={`inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-500 transition hover:border-[#24478a] hover:text-[#24478a] ${FOCUS}`}
                        >
                          <Plus className="h-3 w-3" aria-hidden="true" />
                          {city}
                        </button>
                      ))}
                    </div>
                  </div>
                </SectionCard>

                <SectionCard icon={MessageSquareText} tone="bg-violet-50 text-violet-700" title={t('settingsPage.cardCommsTitle')} hint={t('settingsPage.cardCommsHint')}>
                  <Field id="company-projectReferences" label={t('settingsPage.projectReferences')} hint={t('settingsPage.projectReferencesHint')}>
                    <textarea id="company-projectReferences" className={`${TEXTAREA} min-h-[9rem]`} value={profile.projectReferences || ''} onChange={(e) => updateProfile('projectReferences', e.target.value)} />
                  </Field>

                  <div>
                    <span className="mb-1.5 block text-[13px] font-bold text-slate-700 dark:text-slate-200">{t('settingsPage.tone')}</span>
                    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t('settingsPage.tone')}>
                      {[
                        ['formel', 'toneFormal', 'toneFormalExample'],
                        ['semi-formel', 'toneSemi', 'toneSemiExample']
                      ].map(([value, label, example]) => {
                        const on = (profile.emailTone || 'formel') === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={on}
                            onClick={() => updateProfile('emailTone', value)}
                            className={`flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition ${FOCUS} ${
                              on ? 'border-[#24478a] bg-[#eef3fb] ring-2 ring-[#24478a]/20 dark:bg-slate-800' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800'
                            }`}
                          >
                            <span className="flex w-full items-center justify-between gap-2">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">{t(`settingsPage.${label}`)}</span>
                              <span className={`grid h-5 w-5 place-items-center rounded-full border-2 ${on ? 'border-[#24478a] bg-[#24478a] text-white' : 'border-slate-300'}`}>
                                {on ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                              </span>
                            </span>
                            <span className="text-xs italic leading-relaxed text-slate-500 dark:text-slate-400">{t(`settingsPage.${example}`)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </SectionCard>

                <div
                  ref={setEndBar}
                  className={`sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-lg transition-all duration-300 lg:static lg:shadow-sm dark:border-slate-700 dark:bg-slate-900 ${
                    endInView ? 'lg:translate-y-0 lg:opacity-100' : 'lg:pointer-events-none lg:translate-y-2 lg:opacity-0'
                  }`}
                >
                  <p className="flex items-center gap-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    <span className={`h-2.5 w-2.5 rounded-full ${profileDirty ? 'bg-amber-500' : 'bg-emerald-500'}`} aria-hidden="true" />
                    {profileDirty ? t('settingsPage.unsaved') : t('settingsPage.upToDate')}
                  </p>
                  <PrimaryButton busy={savingProfile} disabled={!profileDirty} onClick={saveCompany}>
                    {t('settingsPage.saveCompany')}
                  </PrimaryButton>
                </div>
              </div>
            )
          ) : null}

          {section === 'integrations' ? (
            <div className="grid gap-6 md:grid-cols-2">
              <SectionCard icon={Sparkles} tone="bg-violet-50 text-violet-700" title={t('settingsPage.statusTitle')}>
                <ul className="space-y-2.5">
                  <StatusRow label={t('settingsPage.claude')} ok={Boolean(profile?.anthropicConfigured)} okLabel={t('settingsPage.active')} offLabel={t('settingsPage.keyMissing')} />
                  <StatusRow label={t('settingsPage.gmail')} ok={Boolean(profile?.gmailConnected)} okLabel={t('settingsPage.connected')} offLabel={t('settingsPage.notConnected')} />
                </ul>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t('settingsPage.fallbackText')}</p>
              </SectionCard>

              <SectionCard icon={Mail} tone="bg-red-50 text-red-600" title={t('settingsPage.gmailTitle')} hint={t('settingsPage.gmailText')}>
                <button
                  type="button"
                  onClick={connectGmail}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
                >
                  {t('settingsPage.connectGmail')}
                </button>
              </SectionCard>

              <SectionCard icon={TestTube2} tone="bg-teal-50 text-teal-700" title={t('settingsPage.testTitle')} hint={t('settingsPage.testText')}>
                <PrimaryButton busy={testing} onClick={testNotif} icon={Send}>
                  {t('settingsPage.testButton')}
                </PrimaryButton>
              </SectionCard>

              {isAdmin ? (
                <SectionCard icon={RefreshCw} tone="bg-[#e3ebf9] text-[#24478a]" title={t('settingsPage.scrapeTitle')} hint={t('settingsPage.scrapeText')}>
                  <PrimaryButton busy={scraping} onClick={scrape} icon={RefreshCw}>
                    {t('settingsPage.scrapeButton')}
                  </PrimaryButton>
                </SectionCard>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
