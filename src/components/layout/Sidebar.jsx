import { NavLink, useLocation } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  ClipboardList,
  MessageSquare,
  FolderTree,
  Globe2,
  LayoutDashboard,
  Linkedin,
  Mail,
  Megaphone,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { useGmailUnreadCount } from '../../hooks/useGmailUnreadCount.js';
import { api } from '../../api/client.js';
import { isLinkedInPanelStale } from '../linkedin/LinkedInLogistiqueRDC.jsx';

const cities = ['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi'];

function buildNavGroups(t, pendingCount = 0) {
  return [
    {
      titleKey: 'sidebar.groups.main',
      items: [
        { to: '/dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard, color: 'text-blue-400' },
        { to: '/opportunities', labelKey: 'sidebar.opportunities', icon: Briefcase, color: 'text-emerald-400', badge: 'new' },
        { to: '/applications', labelKey: 'sidebar.applications', icon: ClipboardList, color: 'text-amber-400', badge: 'pending' }
      ]
    },
    {
      titleKey: 'sidebar.groups.watch',
      items: [
        { to: '/sources', labelKey: 'sidebar.sources', icon: Globe2, color: 'text-cyan-400' },
        { to: '/categories', labelKey: 'sidebar.categories', icon: FolderTree, color: 'text-violet-400' },
        { to: '/agent', labelKey: 'sidebar.agent', icon: Bot, color: 'text-fuchsia-400', badge: 'actif' }
      ]
    },
    {
      titleKey: 'sidebar.groups.jobs',
      items: [
        {
          to: '/assistant-emploi',
          labelKey: 'sidebar.jobAssistant',
          icon: MessageSquare,
          color: 'text-lime-400',
          navActive: (_, loc) =>
            loc.pathname === '/assistant-emploi' && !loc.search.includes('section=linkedin')
        },
        {
          to: '/assistant-emploi?section=linkedin',
          labelKey: 'sidebar.linkedin',
          icon: Linkedin,
          color: 'text-[#0A66C2]',
          linkedInDot: true,
          navActive: (_, loc) =>
            loc.pathname === '/assistant-emploi' && loc.search.includes('section=linkedin')
        }
      ]
    },
    {
      titleKey: 'sidebar.groups.comms',
      items: [
        { to: '/messaging', labelKey: 'sidebar.messaging', icon: Mail, color: 'text-red-400', badge: '0' },
        { to: '/marketing', labelKey: 'sidebar.marketing', icon: Megaphone, color: 'text-orange-400' }
      ]
    },
    {
      titleKey: 'sidebar.groups.analysis',
      items: [
        { to: '/analytics', labelKey: 'sidebar.analytics', icon: BarChart3, color: 'text-sky-400' },
        { to: '/alerts', labelKey: 'sidebar.alerts', icon: Bell, color: 'text-rose-400' }
      ]
    },
    {
      titleKey: 'sidebar.groups.data',
      items: [
        { to: '/archive', labelKey: 'sidebar.archive', icon: Archive, color: 'text-slate-400' },
        { to: '/settings', labelKey: 'sidebar.settings', icon: Settings, color: 'text-indigo-400' }
      ]
    },
    ...(pendingCount >= 0
      ? [
          {
            titleKey: 'sidebar.groups.admin',
            items: [
              {
                to: '/admin/users',
                labelKey: 'sidebar.users',
                icon: ShieldCheck,
                color: 'text-violet-400',
                badge: pendingCount > 0 ? String(pendingCount) : null
              }
            ]
          }
        ]
      : [])
  ];
}

function resolveBadgeLabel(badge, t) {
  if (badge === 'new') return t('badges.new');
  if (badge === 'pending') return t('badges.pending');
  if (badge === 'actif') return t('badges.active');
  return badge;
}

function isNavItemActive(to, navActive, location) {
  if (navActive) return navActive(null, location);
  const [path, query] = to.split('?');
  if (location.pathname !== path) return false;
  if (!query) return true;
  return location.search === `?${query}` || location.search.includes(query);
}

export default function Sidebar({ variant = 'desktop', onNavigate }) {
  const location = useLocation();
  const { isDark } = useTheme();
  const { user } = useApp();
  const { t, lang } = useI18n();
  const gmailUnread = useGmailUnreadCount();
  const [linkedinStale, setLinkedinStale] = useState(() => isLinkedInPanelStale());
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [selectedCities, setSelectedCities] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mecal_city_filters') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('mecal_city_filters', JSON.stringify(selectedCities));
    window.dispatchEvent(new CustomEvent('mecal:city-filters', { detail: selectedCities }));
  }, [selectedCities]);

  useEffect(() => {
    const refreshLinkedInDot = () => setLinkedinStale(isLinkedInPanelStale());
    refreshLinkedInDot();
    window.addEventListener('mecal:linkedin-visit', refreshLinkedInDot);
    window.addEventListener('storage', refreshLinkedInDot);
    return () => {
      window.removeEventListener('mecal:linkedin-visit', refreshLinkedInDot);
      window.removeEventListener('storage', refreshLinkedInDot);
    };
  }, []);

  const isAdmin = user && ['Admin', 'admin'].includes(user.role);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;
    api
      .get('/api/admin/users/pending')
      .then((res) => {
        if (!cancelled) setPendingApprovals((res.data?.users || []).length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAdmin, location.pathname]);

  const navGroups = useMemo(() => {
    if (!isAdmin) {
      return buildNavGroups(t, -1).filter((g) => g.titleKey !== 'sidebar.groups.admin');
    }
    return buildNavGroups(t, pendingApprovals);
  }, [t, lang, isAdmin, pendingApprovals]);

  const toggleCity = (city) => {
    setSelectedCities((current) =>
      current.includes(city) ? current.filter((value) => value !== city) : [...current, city]
    );
  };

  const asideClass =
    variant === 'mobile'
      ? `app-sidebar fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col overflow-hidden border-r shadow-2xl ${
          isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-gray-100 bg-white'
        }`
      : `app-sidebar hidden h-full w-72 shrink-0 flex-col overflow-hidden border-r md:flex ${
          isDark ? 'border-slate-800 bg-[#0f172a]' : 'border-gray-100 bg-white'
        }`;

  const groupLabel = isDark ? 'text-slate-500' : 'text-slate-400';
  const navIdle = isDark
    ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900';
  const iconWrapIdle = isDark ? 'bg-slate-800/80' : 'bg-slate-100';
  const citiesBox = isDark
    ? 'border-slate-700/80 bg-slate-800/50'
    : 'border-slate-200 bg-slate-50';
  const cityLabel = isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900';

  return (
    <aside className={asideClass}>
      <div className="m-3 flex-shrink-0 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 p-4 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-200">M-ECAL</p>
        <p className="mt-0.5 text-base font-bold">{t('sidebar.brandTitle')}</p>
        <p className="mt-1 text-xs text-blue-200">{t('sidebar.brandSubtitle')}</p>
      </div>

      <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      {navGroups.map((group) => (
        <div key={group.titleKey} className="space-y-0.5">
          <p className={`px-3 pb-1 pt-3 text-[10px] font-black uppercase tracking-[0.22em] ${groupLabel}`}>
            {t(group.titleKey)}
          </p>
          {group.items.map(({ to, labelKey, icon: Icon, color, badge, linkedInDot, navActive }) => {
            const gmailBadge =
              gmailUnread > 0 ? (gmailUnread > 99 ? '99+' : String(gmailUnread)) : null;
            const visibleBadge = to === '/messaging' ? gmailBadge : resolveBadgeLabel(badge, t);
            const isActive = isNavItemActive(to, navActive, location);
            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => onNavigate?.()}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                    : navIdle
                }`}
              >
                <span
                  className={`relative grid h-9 w-9 place-items-center rounded-xl transition group-hover:scale-105 ${
                    isActive ? 'bg-white/15' : iconWrapIdle
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : color}`} />
                  {linkedInDot && linkedinStale ? (
                    <span
                      className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 bg-red-500 ${
                        isDark ? 'border-[#0f172a]' : 'border-white'
                      }`}
                    />
                  ) : null}
                </span>
                <span className="leading-snug">{t(labelKey)}</span>
                {visibleBadge ? (
                  <span
                    className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white shadow-sm'
                    }`}
                  >
                    {visibleBadge}
                  </span>
                ) : null}
              </NavLink>
            );
          })}
        </div>
      ))}

      <div className={`mt-4 rounded-2xl border p-3 ${citiesBox}`}>
        <p className={`text-xs font-black uppercase tracking-wide ${groupLabel}`}>{t('sidebar.citiesTitle')}</p>
        <div className="mt-2 space-y-1">
          {cities.map((city) => (
            <label
              key={city}
              className={`flex cursor-pointer items-center gap-2 text-xs font-semibold ${cityLabel}`}
            >
              <input
                type="checkbox"
                checked={selectedCities.includes(city)}
                onChange={() => toggleCity(city)}
                className="accent-blue-500"
              />
              {city}
            </label>
          ))}
        </div>
      </div>
      </nav>
    </aside>
  );
}
