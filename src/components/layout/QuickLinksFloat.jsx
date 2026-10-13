import { NavLink } from 'react-router-dom';
import { Briefcase, ClipboardList, LayoutDashboard, Settings } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

// Flat, bright tones taken from the same family as the web app (steel blue, teal, amber, violet).
const LINKS = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, tile: 'bg-[#3b6fd6]' },
  { to: '/opportunities', labelKey: 'nav.opportunities', icon: Briefcase, tile: 'bg-[#0fa99a]' },
  { to: '/applications', labelKey: 'nav.applications', icon: ClipboardList, tile: 'bg-[#f0a62b]' },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings, tile: 'bg-[#7a6ee0]' }
];

/** Look of the panel that holds this content (the floating dock draws the box). */
export const QUICK_LINKS_SURFACE =
  'rounded-[2rem] border border-white/80 bg-[#eef3fc]/90 shadow-2xl backdrop-blur-xl dark:border-slate-600 dark:bg-slate-800/90';

/**
 * "Accès rapide": the four main pages, shown like the home screen of an iPhone 8: rounded app icons with
 * their label underneath.
 */
export default function QuickLinksPanel({ onClose }) {
  const { t } = useI18n();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 pt-3">
      <div className="mx-auto h-1 w-9 rounded-full bg-slate-300 dark:bg-slate-500" aria-hidden="true" />
      <h2 className="mt-3 text-center text-[13px] font-semibold text-slate-700 dark:text-slate-100">
        {t('quickLinks.title')}
      </h2>
      <nav aria-label={t('quickLinks.title')} className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
        {LINKS.map(({ to, labelKey, icon: Icon, tile }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className="group flex flex-col items-center gap-2 rounded-2xl focus:outline-none"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`grid h-[4.25rem] w-[4.25rem] place-items-center rounded-[1.35rem] text-white shadow-md transition duration-200 group-hover:-translate-y-0.5 group-hover:scale-105 group-active:scale-95 group-focus-visible:ring-4 group-focus-visible:ring-slate-400/50 ${tile} ${
                    isActive ? 'ring-4 ring-white dark:ring-slate-200' : ''
                  }`}
                >
                  <Icon className="h-8 w-8" strokeWidth={1.9} aria-hidden="true" />
                </span>
                <span className="max-w-full truncate text-[12px] font-semibold text-slate-700 dark:text-slate-100">
                  {t(labelKey)}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
