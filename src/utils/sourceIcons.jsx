import {
  Banknote,
  Briefcase,
  Building2,
  FileText,
  Gavel,
  HeartHandshake,
  HelpCircle,
  Landmark,
  Library,
  MapPinned,
  University,
  Users
} from 'lucide-react';

function compact(value = '') {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');
}

const SOURCE_VISUALS = [
  {
    id: 'ReliefWeb',
    keys: ['reliefweb'],
    icon: HeartHandshake,
    wrap: 'bg-sky-100 text-sky-700',
    label: 'ReliefWeb'
  },
  {
    id: 'UNGM',
    keys: ['ungm'],
    icon: Landmark,
    wrap: 'bg-indigo-100 text-indigo-800',
    label: 'UNGM'
  },
  {
    id: 'UNjobs',
    keys: ['unjobs'],
    icon: Users,
    wrap: 'bg-violet-100 text-violet-800',
    label: 'UNjobs'
  },
  {
    id: 'ARSP',
    keys: ['arsp'],
    icon: FileText,
    wrap: 'bg-pink-100 text-pink-800',
    label: 'ARSP'
  },
  {
    id: 'ARMP',
    keys: ['armp'],
    icon: Gavel,
    wrap: 'bg-red-100 text-red-800',
    label: 'ARMP'
  },
  {
    id: 'AchatPublicRDC',
    keys: ['achatpublicrdc', 'achatpublic'],
    icon: Building2,
    wrap: 'bg-rose-100 text-rose-800',
    label: 'AchatPublicRDC'
  },
  {
    id: 'ProfilRDC',
    keys: ['profilrdc'],
    icon: MapPinned,
    wrap: 'bg-orange-100 text-orange-800',
    label: 'ProfilRDC'
  },
  {
    id: 'SIGMAP',
    keys: ['sigmap'],
    icon: Library,
    wrap: 'bg-fuchsia-100 text-fuchsia-800',
    label: 'SIGMAP'
  },
  {
    id: 'AfDB',
    keys: ['afdb', 'africandevelopmentbank'],
    icon: Banknote,
    wrap: 'bg-lime-100 text-lime-800',
    label: 'AfDB'
  },
  {
    id: 'WorldBank',
    keys: ['worldbank'],
    icon: University,
    wrap: 'bg-emerald-100 text-emerald-800',
    label: 'WorldBank'
  },
  {
    id: 'DevEx',
    keys: ['devex'],
    icon: Briefcase,
    wrap: 'bg-teal-100 text-teal-800',
    label: 'DevEx'
  }
];

const UNKNOWN = {
  id: 'unknown',
  icon: HelpCircle,
  wrap: 'bg-slate-200 text-slate-600',
  label: 'Source inconnue'
};

export function getSourceVisual(source, platform) {
  const hay = compact(`${platform || ''} ${source || ''}`);
  if (!hay) return UNKNOWN;
  const hit = SOURCE_VISUALS.find((row) => row.keys.some((key) => hay.includes(compact(key))));
  return hit || UNKNOWN;
}

export function SourceGlyph({ source, platform, className = 'h-3.5 w-3.5' }) {
  const visual = getSourceVisual(source, platform);
  const Icon = visual.icon;
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${visual.wrap}`}
      title={visual.label}
    >
      <Icon className={className} />
    </span>
  );
}

export { SOURCE_VISUALS };
