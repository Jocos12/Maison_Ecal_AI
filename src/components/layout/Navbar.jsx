import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import LanguageMenu from './LanguageMenu.jsx';
import HeaderLogo from './HeaderLogo.jsx';
import NotificationDropdown from '../notifications/NotificationDropdown.jsx';
import VoiceModeToggle from '../voice/VoiceModeToggle.jsx';
import GlobalSearch from '../search/GlobalSearch.jsx';
import { LogOut, Moon, Sun, Menu } from 'lucide-react';

export default function Navbar({ onMenuToggle }) {
  const { t } = useI18n();
  const { user, logout } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const nav = useNavigate();

  const handleLogout = async () => {
    await logout();
    nav('/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-950/90">
      <div className="mx-auto flex h-[57px] w-full max-w-[1760px] items-center gap-4 px-4">
        <HeaderLogo tagline={t('layout.logoTagline')} className="md:hidden" />
        <GlobalSearch />
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
            <NotificationDropdown />
            <VoiceModeToggle />
            <button
              type="button"
              onClick={handleLogout}
              aria-label={t('nav.logout')}
              className="group flex items-center rounded-md p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 focus-visible:bg-red-50 focus-visible:outline-none dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300 dark:focus-visible:bg-red-950/40"
            >
              <LogOut className="h-5 w-5 flex-none" />
              <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-200 group-hover:ml-2 group-hover:max-w-[10rem] group-hover:opacity-100 group-focus-visible:ml-2 group-focus-visible:max-w-[10rem] group-focus-visible:opacity-100">
                {t('nav.logout')}
              </span>
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
          <LanguageMenu variant="header" />
        </div>
      </div>
    </header>
  );
}
