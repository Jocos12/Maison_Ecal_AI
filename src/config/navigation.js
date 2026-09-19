import {
  Archive,
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  ClipboardList,
  MessageSquare,
  FolderTree,
  Filter,
  Globe2,
  HeartHandshake,
  LayoutDashboard,
  Link2,
  Mail,
  Settings,
  ShieldCheck
} from 'lucide-react';

/**
 * The pages of the app, grouped as in the sidebar. This is the single list used by the sidebar AND by the
 * global search: add a page here and it appears in both.
 * `keywords` are extra words (in any language) that also lead to the page.
 */
export const NAV_GROUPS = [
  {
    titleKey: 'sidebar.groups.main',
    items: [
      {
        to: '/dashboard',
        labelKey: 'sidebar.dashboard',
        icon: LayoutDashboard,
        color: 'text-blue-400',
        keywords: ['accueil', 'home', 'stats', 'statistiques', 'nyumbani']
      },
      {
        to: '/opportunities',
        labelKey: 'sidebar.opportunities',
        icon: Briefcase,
        color: 'text-emerald-400',
        badge: 'new',
        keywords: ['offres', 'appels', 'tenders', 'marchés', 'jobs', 'fursa', 'zabuni']
      },
      {
        to: '/applications',
        labelKey: 'sidebar.applications',
        icon: ClipboardList,
        color: 'text-amber-400',
        badge: 'pending',
        keywords: ['candidatures', 'postulé', 'applications', 'maombi', 'kanban']
      }
    ]
  },
  {
    titleKey: 'sidebar.groups.watch',
    items: [
      {
        to: '/strict-mecal',
        labelKey: 'sidebar.strictMecal',
        icon: Filter,
        color: 'text-teal-400',
        keywords: ['filtre', 'filter', 'pertinence', 'relevance', 'chujio']
      },
      {
        to: '/sources',
        labelKey: 'sidebar.sources',
        icon: Globe2,
        color: 'text-cyan-400',
        keywords: ['sites', 'scraper', 'veille', 'watch', 'vyanzo']
      },
      {
        to: '/nrc',
        labelKey: 'sidebar.nrc',
        icon: HeartHandshake,
        color: 'text-rose-400',
        badge: 'new',
        keywords: ['nrc', 'norwegian refugee council', 'ong', 'ngo', 'humanitaire', 'humanitarian', 'appels d\'offres', 'tenders', 'emplois', 'jobs', 'zabuni', 'ajira']
      },
      {
        to: '/categories',
        labelKey: 'sidebar.categories',
        icon: FolderTree,
        color: 'text-violet-400',
        keywords: ['métiers', 'types', 'kategoria', 'aina']
      },
      {
        to: '/agent',
        labelKey: 'sidebar.agent',
        icon: Bot,
        color: 'text-fuchsia-400',
        badge: 'actif',
        keywords: ['ia', 'ai', 'intelligence', 'assistant', 'chatbot', 'wakala']
      }
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
        navActive: (_, loc) => loc.pathname === '/assistant-emploi' && !loc.search.includes('section=linkedin'),
        keywords: ['emploi', 'cv', 'lettre', 'job', 'letter', 'ajira', 'barua']
      },
      {
        to: '/assistant-emploi?section=linkedin',
        labelKey: 'sidebar.linkedin',
        icon: Link2,
        color: 'text-[#0A66C2]',
        linkedInDot: true,
        navActive: (_, loc) => loc.pathname === '/assistant-emploi' && loc.search.includes('section=linkedin'),
        keywords: ['linkedin', 'réseau', 'network']
      }
    ]
  },
  {
    titleKey: 'sidebar.groups.comms',
    items: [
      {
        to: '/messaging',
        labelKey: 'sidebar.messaging',
        icon: Mail,
        color: 'text-red-400',
        badge: '0',
        keywords: ['email', 'e-mail', 'courrier', 'mail', 'boîte', 'inbox', 'barua pepe', 'gmail']
      },
      {
        to: '/marketing',
        labelKey: 'sidebar.marketing',
        icon: Bell,
        color: 'text-orange-400',
        keywords: ['campagne', 'campaign', 'promotion', 'uuzaji']
      }
    ]
  },
  {
    titleKey: 'sidebar.groups.analysis',
    items: [
      {
        to: '/analytics',
        labelKey: 'sidebar.analytics',
        icon: BarChart3,
        color: 'text-blue-400',
        keywords: ['graphiques', 'charts', 'rapports', 'reports', 'takwimu']
      },
      {
        to: '/alerts',
        labelKey: 'sidebar.alerts',
        icon: Bell,
        color: 'text-rose-400',
        keywords: ['notifications', 'alertes', 'arifa', 'tahadhari']
      }
    ]
  },
  {
    titleKey: 'sidebar.groups.data',
    items: [
      {
        to: '/archive',
        labelKey: 'sidebar.archive',
        icon: Archive,
        color: 'text-slate-400',
        keywords: ['archivées', 'expirées', 'expired', 'old', 'kumbukumbu']
      },
      {
        to: '/settings',
        labelKey: 'sidebar.settings',
        icon: Settings,
        color: 'text-blue-400',
        keywords: ['paramètres', 'configuration', 'préférences', 'preferences', 'profil', 'profile', 'mipangilio']
      }
    ]
  },
  {
    titleKey: 'sidebar.groups.admin',
    adminOnly: true,
    items: [
      {
        to: '/admin/users',
        labelKey: 'sidebar.users',
        icon: ShieldCheck,
        color: 'text-violet-400',
        keywords: ['utilisateurs', 'comptes', 'validation', 'accounts', 'watumiaji']
      }
    ]
  }
];
