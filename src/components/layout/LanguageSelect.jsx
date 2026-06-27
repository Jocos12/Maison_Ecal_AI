import { ChevronDown, Globe2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' }
];

export default function LanguageSelect({ className = '', compact = false }) {
  const { lang, setLang, t } = useI18n();
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Globe2
        className="pointer-events-none absolute left-2.5 z-10 h-4 w-4 text-slate-400 dark:text-slate-500"
        aria-hidden
      />
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        aria-label={t('layout.language')}
        className={`appearance-none cursor-pointer rounded-xl border border-slate-200 bg-white pl-9 pr-9 font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:shadow focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-500/50 ${
          compact ? 'py-1.5 text-sm' : 'py-2 text-sm'
        }`}
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-400 dark:text-slate-500"
        aria-hidden
      />
      {!compact && (
        <span className="sr-only">
          {t('layout.currentLanguage', { label: current.label })}
        </span>
      )}
    </div>
  );
}
