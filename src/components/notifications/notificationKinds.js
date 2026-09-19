import { AlertTriangle, Bell, Bot, Briefcase, Radar, Sparkles, UserSearch } from 'lucide-react';

// One flat icon tile per kind of notification (tones are the app's own family of colours).
export const NOTIFICATION_KINDS = {
  opportunities: {
    icon: Briefcase,
    tile: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    label: 'text-emerald-700 dark:text-emerald-300'
  },
  'emploi-rdc': {
    icon: UserSearch,
    tile: 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300',
    label: 'text-sky-700 dark:text-sky-300'
  },
  agent: {
    icon: Bot,
    tile: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    label: 'text-violet-700 dark:text-violet-300'
  },
  veille: {
    icon: Radar,
    tile: 'bg-[#e3ebf9] text-[#24478a] dark:bg-slate-700 dark:text-blue-200',
    label: 'text-[#24478a] dark:text-blue-200'
  },
  'veille-error': {
    icon: AlertTriangle,
    tile: 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300',
    label: 'text-red-600 dark:text-red-300'
  },
  'mecal-match': {
    icon: Sparkles,
    tile: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    label: 'text-amber-700 dark:text-amber-300'
  }
};

export const FALLBACK_KIND = {
  icon: Bell,
  tile: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  label: 'text-slate-600 dark:text-slate-300'
};

export function kindOf(type) {
  return NOTIFICATION_KINDS[type] || FALLBACK_KIND;
}

export function kindKey(type) {
  return NOTIFICATION_KINDS[type] ? type : 'default';
}
