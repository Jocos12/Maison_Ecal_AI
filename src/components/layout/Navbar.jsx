import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import LanguageSelect from './LanguageSelect.jsx';
import NotificationDropdown from '../notifications/NotificationDropdown.jsx';
import { LayoutDashboard, Briefcase, ClipboardList, Settings, LogOut, Moon, Sun, Menu } from 'lucide-react';

function EcalLogo({ tagline }) {
  return (
    <Link to="/" className="flex items-center gap-2 group shrink-0">
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
    </Link>
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

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/90">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <EcalLogo tagline={t('layout.logoTagline')} />
        <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
          <a href="https://maison-ecal.com" className={linkClass({ isActive: false })} target="_blank" rel="noreferrer">
            {t('nav.home')}
          </a>
          <a href="https://maison-ecal.com" className={linkClass({ isActive: false })} target="_blank" rel="noreferrer">
            {t('nav.about')}
          </a>
          <a href="https://maison-ecal.com" className={linkClass({ isActive: false })} target="_blank" rel="noreferrer">
            {t('nav.projects')}
          </a>
          <a href="https://maison-ecal.com" className={linkClass({ isActive: false })} target="_blank" rel="noreferrer">
            {t('nav.event')}
          </a>
            <span className="text-sm font-semibold text-slate-700 dark:text-white px-2 py-1 flex items-center gap-1 cursor-default">
            {t('nav.services')}
            <span className="text-blue-400 text-xs">▾</span>
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-white px-2 py-1">
            {t('nav.contact')}
          </span>
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
