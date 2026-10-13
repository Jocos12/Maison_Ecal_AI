import { Pin } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';
import HeaderLogo from './HeaderLogo.jsx';
import Sidebar from './Sidebar.jsx';
import SidebarUserFooter from './SidebarUserFooter.jsx';

/**
 * The left column: header part (logo, tagline and pin) on top, sidebar navigation in the middle and the
 * signed-in user's card at the bottom (always visible).
 * Desktop: a narrow rail that always shows the icons. Moving the cursor onto it expands it to the full
 * sidebar and the page moves over to make room (nothing is covered). It goes back to the rail when the
 * cursor leaves, unless it is pinned.
 * Phones: a drawer opened by the menu button of the header.
 */
export default function SidebarDock({ dock, mobileOpen, onNavigate }) {
  const { t } = useI18n();
  const { isDark } = useTheme();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const { pinned, visible: expanded, open, closeSoon, togglePin } = dock;
  const compact = isDesktop && !expanded;

  const surface = isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-slate-200/80 bg-white';
  const layout = `fixed inset-y-0 left-0 z-50 w-[19rem] ${
    mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
  } md:static md:z-auto md:h-full md:translate-x-0 md:shadow-none ${expanded ? 'md:w-[19rem]' : 'md:w-[72px]'}`;

  return (
    <aside
      className={`flex flex-none flex-col overflow-hidden border-r transition-[transform,width] duration-200 ease-out ${surface} ${layout}`}
      onMouseEnter={open}
      onMouseLeave={() => closeSoon()}
      onFocus={open}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) closeSoon();
      }}
    >
      <div
        className={`flex h-[57px] flex-none items-center border-b ${surface} ${
          compact ? 'justify-center px-1' : 'justify-between gap-2 px-4'
        }`}
      >
        <HeaderLogo
          compact={compact}
          width={compact ? undefined : 86}
          tagline={compact ? undefined : t('layout.logoTagline')}
          alwaysShowTagline
          className="min-w-0"
        />
        {compact ? null : (
          <button
            type="button"
            onClick={togglePin}
            aria-pressed={pinned}
            aria-label={pinned ? t('layout.unpinSidebar') : t('layout.pinSidebar')}
            title={pinned ? t('layout.unpinSidebar') : t('layout.pinSidebar')}
            className={`hidden h-8 w-8 flex-none items-center justify-center rounded-full border transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/25 md:flex ${
              pinned
                ? 'border-[#24478a] bg-[#24478a] text-white shadow-md hover:bg-[#1c3a72]'
                : 'border-slate-200 bg-white text-slate-500 hover:border-[#24478a] hover:text-[#24478a] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-300 dark:hover:text-blue-300'
            }`}
          >
            <Pin
              className={`h-4 w-4 transition-transform duration-200 ${pinned ? 'fill-current' : 'rotate-45'}`}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
      <Sidebar compact={compact} onNavigate={onNavigate} />
      <SidebarUserFooter compact={compact} />
    </aside>
  );
}
