import { NavLink } from 'react-router-dom';
import {
  Archive,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  ClipboardList,
  FolderTree,
  Globe2,
  LayoutDashboard,
  Mail,
  Megaphone,
  Settings
} from 'lucide-react';

import { useEffect, useState } from 'react';

const groups = [
  {
    title: 'Principal',
    items: [
      { to: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, color: 'text-blue-400' },
      { to: '/opportunities', label: 'Opportunités', icon: Briefcase, color: 'text-emerald-400', badge: 'new' },
      { to: '/applications', label: 'Candidatures', icon: ClipboardList, color: 'text-amber-400', badge: 'pending' }
    ]
  },
  {
    title: 'Veille & IA',
    items: [
      { to: '/sources', label: 'Sources de Veille', icon: Globe2, color: 'text-cyan-400' },
      { to: '/categories', label: 'Catégories', icon: FolderTree, color: 'text-violet-400' },
      { to: '/agent', label: 'Agent IA', icon: Bot, color: 'text-fuchsia-400', badge: 'actif' }
    ]
  },
  {
    title: 'Communication',
    items: [
      { to: '/messaging', label: 'Messagerie Gmail', icon: Mail, color: 'text-red-400', badge: '0' },
      { to: '/marketing', label: 'Marketing', icon: Megaphone, color: 'text-orange-400' }
    ]
  },
  {
    title: 'Analyse',
    items: [
      { to: '/analytics', label: 'Analytiques', icon: BarChart3, color: 'text-sky-400' },
      { to: '/alerts', label: 'Alertes & Notifications', icon: Bell, color: 'text-rose-400' }
    ]
  },
  {
    title: 'Données',
    items: [
      { to: '/archive', label: 'Archive', icon: Archive, color: 'text-slate-400' },
      { to: '/settings', label: 'Paramètres', icon: Settings, color: 'text-indigo-400' }
    ]
  }
];

const cities = ['Bukavu', 'Goma', 'Kinshasa', 'Kalemie', 'Lubumbashi'];

export default function Sidebar() {
  const [gmailCount, setGmailCount] = useState(() => localStorage.getItem('mecal_gmail_count') || '0');
  const [selectedCities, setSelectedCities] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('mecal_city_filters') || '[]');
    } catch {
      return [];
    }
  });
  const item =
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-950 hover:shadow-md dark:text-slate-300 dark:hover:bg-slate-800/80 dark:hover:text-white';
  const active = 'border border-blue-500/30 bg-blue-600/15 text-blue-700 shadow-sm dark:text-blue-200';

  useEffect(() => {
    localStorage.setItem('mecal_city_filters', JSON.stringify(selectedCities));
    window.dispatchEvent(new CustomEvent('mecal:city-filters', { detail: selectedCities }));
  }, [selectedCities]);

  useEffect(() => {
    const syncGmailCount = (event) => {
      setGmailCount(String(event.detail ?? localStorage.getItem('mecal_gmail_count') ?? '0'));
    };
    window.addEventListener('mecal:gmail-count', syncGmailCount);
    window.addEventListener('storage', syncGmailCount);
    return () => {
      window.removeEventListener('mecal:gmail-count', syncGmailCount);
      window.removeEventListener('storage', syncGmailCount);
    };
  }, []);

  const toggleCity = (city) => {
    setSelectedCities((current) =>
      current.includes(city) ? current.filter((value) => value !== city) : [...current, city]
    );
  };

  return (
    <aside className="app-sidebar hidden md:flex w-72 shrink-0 flex-col gap-2 border-r border-slate-200/70 bg-white/70 p-4 shadow-xl shadow-slate-200/30 dark:border-slate-800 dark:bg-slate-950/75 dark:shadow-black/20 backdrop-blur">
      <div className="mb-3 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 p-4 text-white shadow-lg shadow-blue-900/20">
        <p className="text-xs uppercase tracking-[0.28em] text-blue-100">M-ECAL</p>
        <p className="mt-1 text-lg font-black leading-tight">Veille Logistique RDC</p>
        <p className="mt-2 text-xs text-blue-50">Services, consultance, formations et marchés.</p>
      </div>
      {groups.map((group) => (
        <div key={group.title} className="space-y-1">
          <p className="px-3 pt-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
            {group.title}
          </p>
          {group.items.map(({ to, label, icon: Icon, color, badge }) => {
            const visibleBadge = to === '/messaging' ? gmailCount : badge;
            return (
            <NavLink key={to} to={to} className={({ isActive }) => `${item} ${isActive ? active : ''}`}>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 transition group-hover:scale-105 dark:bg-slate-800">
                <Icon className={`h-4 w-4 ${color}`} />
              </span>
              <span className="leading-snug">{label}</span>
              {visibleBadge && (
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {visibleBadge}
                </span>
              )}
            </NavLink>
            );
          })}
        </div>
      ))}
      <div className="mt-4 rounded-2xl bg-slate-100 p-3 dark:bg-slate-900">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Villes RDC</p>
        <div className="mt-2 space-y-1">
          {cities.map((city) => (
            <label key={city} className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={selectedCities.includes(city)}
                onChange={() => toggleCity(city)}
                className="accent-blue-600"
              />
              {city}
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
