import { NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import LanguageSelect from './LanguageSelect.jsx';
import NotificationDropdown from '../notifications/NotificationDropdown.jsx';
import VoiceModeToggle from '../voice/VoiceModeToggle.jsx';
import { LayoutDashboard, Briefcase, ClipboardList, Settings, LogOut, Moon, Sun, Menu } from 'lucide-react';

/** Site public officiel Maison ECAL */
export const MECAL_SITE = 'https://www.maison-ecal-divers.com';

const SITE_LINKS = {
  home: `${MECAL_SITE}/index.html`,
  about: `${MECAL_SITE}/team.html`,
  projects: `${MECAL_SITE}/projects.html`,
  event: `${MECAL_SITE}/event.html`,
  contact: `${MECAL_SITE}/contact.html`,
  services: [
    { key: 'procurement', href: `${MECAL_SITE}/services/procurement.html` },
    { key: 'inventory', href: `${MECAL_SITE}/services/inventory-management.html` },
    { key: 'orders', href: `${MECAL_SITE}/services/order-management.html` },
    { key: 'consultancy', href: `${MECAL_SITE}/services/logistics-consultancy.html` },
    { key: 'support', href: `${MECAL_SITE}/services/logistics-support.html` },
    { key: 'fleet', href: `${MECAL_SITE}/services/fleet-management.html` }
  ]
};

function EcalLogo({ tagline }) {
  return (
    <a
      href={SITE_LINKS.home}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 group shrink-0"
      title="Maison ECAL — site officiel"
    >
      <div className="relative flex items-end font-bold text-xl tracking-tight text-slate-950 dark:text-white">
        <svg
          className="absolute -top-3 left-0 w-7 h-5 text-blue-500"
          viewBox="0 0 32 24"
          aria-hidden
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            d="M2 22 L16 8 L30 22 M8 22 L8 14 L24 14 L24 22"
          />
        </svg>
        <span className="pl-0.5">ECAL</span>
      </div>
      <span className="hidden sm:block text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 max-w-[140px] leading-tight">
        {tagline}
      </span>
    </a>
  );
}

function ExternalNavLink({ href, children, className }) {
  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function Navbar({ onMenuToggle }) {
  const { t } = useI18n();
  const { user, logout } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-semibold px-2 py-1 rounded-md transition ${
      isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 hover:text-blue-600 dark:text-white dark:hover:text-blue-300'
    }`;

  const externalClass = linkClass({ isActive: false });

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/90">
      <div className="mx-auto flex w-full max-w-[1760px] items-center gap-4 px-4 py-3">
        <EcalLogo tagline={t('layout.logoTagline')} />
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          <ExternalNavLink href={SITE_LINKS.home} className={externalClass}>
            {t('nav.home')}
          </ExternalNavLink>
          <ExternalNavLink href={SITE_LINKS.about} className={externalClass}>
            {t('nav.about')}
          </ExternalNavLink>
          <ExternalNavLink href={SITE_LINKS.projects} className={externalClass}>
            {t('nav.projects')}
          </ExternalNavLink>
          <ExternalNavLink href={SITE_LINKS.event} className={externalClass}>
            {t('nav.event')}
          </ExternalNavLink>

          <div className="relative group">
            <span className="text-sm font-semibold text-slate-700 dark:text-white px-2 py-1 flex items-center gap-1 cursor-default">
              {t('nav.services')}
              <span className="text-blue-400 text-xs">▾</span>
            </span>
            <div className="invisible absolute left-0 top-full z-50 mt-1 min-w-[240px] rounded-xl border border-slate-200 bg-white py-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900">
              {SITE_LINKS.services.map((svc) => (
                <a
                  key={svc.key}
                  href={svc.href}
                  target="_blank"
                  rel="noreferrer"
                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-blue-300"
                >
                  {t(`nav.serviceItems.${svc.key}`)}
                </a>
              ))}
            </div>
          </div>

          <ExternalNavLink href={SITE_LINKS.contact} className={externalClass}>
            {t('nav.contact')}
          </ExternalNavLink>
        </nav>
        {user && onMenuToggle ? (
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden dark:border-slate-700 dark:text-slate-200"
            aria-label={t('layout.menuNav')}
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        {user && (
          <nav className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <NavLink to="/dashboard" className={linkClass} title={t('nav.dashboard')}>
              <LayoutDashboard className="h-5 w-5" />
            </NavLink>
            <NavLink to="/opportunities" className={linkClass} title={t('nav.opportunities')}>
              <Briefcase className="h-5 w-5" />
            </NavLink>
            <NavLink to="/applications" className={linkClass} title={t('nav.applications')}>
              <ClipboardList className="h-5 w-5" />
            </NavLink>
            <NavLink to="/settings" className={linkClass} title={t('nav.settings')}>
              <Settings className="h-5 w-5" />
            </NavLink>
            <NotificationDropdown />
            <VoiceModeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
              title={t('nav.logout')}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </nav>
        )}
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          title={isDark ? t('layout.themeLight') : t('layout.themeDark')}
        >
          {isDark ? <Sun className="h-4 w-4 text-amber-300" /> : <Moon className="h-4 w-4 text-blue-600" />}
        </button>
        <div className="border-l border-slate-200 pl-3 dark:border-slate-700">
          <LanguageSelect compact />
        </div>
      </div>
    </header>
  );
}
