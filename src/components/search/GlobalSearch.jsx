import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Bell,
  Briefcase,
  ClipboardList,
  CornerDownLeft,
  Globe2,
  Loader2,
  MessageSquare,
  Search,
  SearchX,
  Sun,
  User,
  X
} from 'lucide-react';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { buildLocalEntries, highlightSegments, queryTerms, searchLocal } from '../../utils/globalSearch.js';

const EMPTY_REMOTE = { loading: false, error: false, groups: {} };

function Highlighted({ text, terms }) {
  return highlightSegments(text, terms).map((part, i) =>
    part.match ? (
      <mark
        key={i}
        className="rounded bg-blue-100 px-0.5 font-bold text-blue-800 dark:bg-blue-500/25 dark:text-blue-200"
      >
        {part.text}
      </mark>
    ) : (
      <span key={i}>{part.text}</span>
    )
  );
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url || '';
  }
}

/**
 * Global search of the header.
 * - Pages, categories, quick actions and website links are found instantly, in every language of the app.
 * - Data (opportunities, applications, sources, alerts, conversations, users for admins) is searched on the server.
 * Words are matched anywhere in the text, ignoring accents and capitals. Ctrl+K or "/" focuses it.
 */
export default function GlobalSearch() {
  const { t, setLang } = useI18n();
  const { user, logout } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const nav = useNavigate();
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [remote, setRemote] = useState(EMPTY_REMOTE);

  const isAdmin = Boolean(user && ['Admin', 'admin'].includes(user.role));
  const trimmed = query.trim();
  const terms = useMemo(() => queryTerms(query), [query]);
  const searchable = trimmed.replace(/\s+/g, '').length >= 2;
  const entries = useMemo(() => buildLocalEntries({ isAdmin }), [isAdmin]);

  const labelOf = useCallback(
    (entry) => {
      if (entry.label) return entry.label;
      if (entry.action === 'theme') return isDark ? t('layout.themeLight') : t('layout.themeDark');
      return t(entry.labelKey);
    },
    [t, isDark]
  );

  const close = useCallback(() => {
    setOpen(false);
    setMobileOpen(false);
    inputRef.current?.blur();
  }, []);

  const clear = useCallback(() => {
    setQuery('');
    setRemote(EMPTY_REMOTE);
  }, []);

  const go = useCallback(
    (to) => {
      nav(to);
      clear();
      close();
    },
    [nav, clear, close]
  );

  const runAction = useCallback(
    async (entry) => {
      if (entry.action === 'theme') toggleTheme();
      if (entry.action === 'lang') setLang(entry.lang);
      clear();
      close();
      if (entry.action === 'logout') {
        await logout();
        nav('/login', { replace: true });
      }
    },
    [toggleTheme, setLang, logout, nav, clear, close]
  );

  // Data search on the server (debounced, previous request cancelled).
  useEffect(() => {
    if (!searchable) {
      setRemote(EMPTY_REMOTE);
      return undefined;
    }
    const controller = new AbortController();
    setRemote((r) => ({ ...r, loading: true, error: false }));
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get('/api/search', { params: { q: trimmed }, signal: controller.signal });
        setRemote({ loading: false, error: false, groups: data?.groups || {} });
      } catch (err) {
        if (controller.signal.aborted || err.code === 'ERR_CANCELED') return;
        setRemote({ loading: false, error: true, groups: {} });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, searchable]);

  // Sections of results, in the order they are shown.
  const sections = useMemo(() => {
    const out = [];
    const local = searchable ? searchLocal(entries, terms, labelOf) : [];

    const localSection = (kind, titleKey) => {
      const rows = local.filter((e) => e.kind === kind);
      if (!rows.length) return;
      out.push({
        key: kind,
        title: t(titleKey),
        items: rows.map((e) => ({
          key: e.id,
          icon: e.kind === 'site' ? Globe2 : e.action === 'theme' ? Sun : e.icon,
          title: labelOf(e),
          subtitle: e.kind === 'action' && e.action === 'lang' ? t('search.switchLanguage', { label: e.label }) : '',
          external: e.kind === 'site',
          run: () => {
            if (e.href) {
              window.open(e.href, '_blank', 'noopener,noreferrer');
              clear();
              close();
            } else if (e.to) go(e.to);
            else runAction(e);
          }
        }))
      });
    };

    if (!searchable) {
      const quick = entries.filter((e) => e.kind === 'page').slice(0, 6);
      out.push({
        key: 'quick',
        title: t('search.quickAccess'),
        items: quick.map((e) => ({
          key: e.id,
          icon: e.icon,
          title: labelOf(e),
          subtitle: '',
          run: () => go(e.to)
        }))
      });
      return out;
    }

    localSection('page', 'search.groups.pages');
    localSection('category', 'search.groups.categories');
    localSection('action', 'search.groups.actions');

    const g = remote.groups;
    if (g.opportunities?.length) {
      out.push({
        key: 'opportunities',
        title: t('search.groups.opportunities'),
        items: g.opportunities.map((o) => ({
          key: `o:${o.id}`,
          icon: Briefcase,
          title: o.title,
          subtitle: [o.organization, o.place, o.category ? t(`opportunities.${o.category}`) : ''].filter(Boolean).join(' · '),
          badge: o.archived ? t('sidebar.archive') : o.urgent ? t('opportunities.urgent') : '',
          run: () => go(`/opportunities?id=${o.id}`)
        }))
      });
    }
    if (g.applications?.length) {
      out.push({
        key: 'applications',
        title: t('search.groups.applications'),
        items: g.applications.map((a) => ({
          key: `a:${a.id}`,
          icon: ClipboardList,
          title: a.title,
          subtitle: a.organization,
          run: () => go(`/applications?id=${a.id}`)
        }))
      });
    }
    if (g.sources?.length) {
      out.push({
        key: 'sources',
        title: t('search.groups.sources'),
        items: g.sources.map((s) => ({
          key: `s:${s.id}`,
          icon: Globe2,
          title: s.name,
          subtitle: hostOf(s.url),
          run: () => go(`/sources?id=${s.id}`)
        }))
      });
    }
    if (g.alerts?.length) {
      out.push({
        key: 'alerts',
        title: t('search.groups.alerts'),
        items: g.alerts.map((a) => ({
          key: `al:${a.id}`,
          icon: Bell,
          title: a.title,
          subtitle: a.organization,
          run: () => go(a.opportunityId ? `/opportunities?id=${a.opportunityId}` : '/alerts')
        }))
      });
    }
    if (g.conversations?.length) {
      out.push({
        key: 'conversations',
        title: t('search.groups.conversations'),
        items: g.conversations.map((c) => ({
          key: `c:${c.id}`,
          icon: MessageSquare,
          title: c.title,
          subtitle: '',
          run: () => go('/assistant-emploi')
        }))
      });
    }
    if (g.users?.length) {
      out.push({
        key: 'users',
        title: t('search.groups.users'),
        items: g.users.map((u) => ({
          key: `u:${u.id}`,
          icon: User,
          title: u.name,
          subtitle: [u.email, u.role].filter(Boolean).join(' · '),
          run: () => go(`/admin/users?search=${encodeURIComponent(u.email)}`)
        }))
      });
    }

    localSection('site', 'search.groups.site');

    out.push({
      key: 'all',
      title: '',
      items: [
        {
          key: 'all-opportunities',
          icon: Search,
          title: t('search.searchAllOpportunities', { query: trimmed }),
          subtitle: '',
          run: () => go(`/opportunities?search=${encodeURIComponent(trimmed)}`)
        }
      ]
    });
    return out;
  }, [entries, terms, searchable, remote.groups, trimmed, labelOf, t, go, runAction, clear, close]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const onlyFallback = searchable && flat.length === 1;

  useEffect(() => {
    setActive(0);
  }, [trimmed, remote.groups]);

  useEffect(() => {
    document.getElementById(`gs-opt-${active}`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  // Shortcuts: Ctrl/Cmd+K, or "/" outside of text fields.
  useEffect(() => {
    const focusSearch = () => {
      if (window.matchMedia('(max-width: 767px)').matches) setMobileOpen(true);
      setOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    const onKeyDown = (e) => {
      const tag = e.target?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        focusSearch();
      } else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        focusSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  useEffect(() => {
    if (mobileOpen) setTimeout(() => inputRef.current?.focus(), 0);
  }, [mobileOpen]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      flat[active]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (query) clear();
      else close();
    }
  };

  const showPanel = open;
  const noResults = searchable && onlyFallback && !remote.loading && !remote.error;

  const backdrop = mobileOpen ? (
    <button
      type="button"
      className="fixed inset-0 z-[65] bg-black/40 md:hidden"
      aria-label={t('search.clear')}
      onClick={close}
    />
  ) : null;

  const searchBox = (
      <div
        ref={rootRef}
        className={`${
          mobileOpen
            ? 'fixed inset-x-0 top-0 z-[70] bg-white p-3 shadow-2xl md:relative md:inset-auto md:z-auto md:bg-transparent md:p-0 md:shadow-none dark:bg-slate-950'
            : 'relative hidden md:block'
        } md:mx-auto md:w-full md:max-w-xl md:flex-1`}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls="gs-listbox"
            aria-activedescendant={showPanel && flat.length ? `gs-opt-${active}` : undefined}
            aria-autocomplete="list"
            name="site-search"
            autoComplete="off"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            spellCheck={false}
            value={query}
            placeholder={t('search.placeholder')}
            onChange={(e) => {
              // Browsers sometimes autofill this box (a saved e-mail next to a password field) without the
              // person typing in it: only a change made while the box has focus counts as a search.
              if (document.activeElement !== e.target) return;
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-20 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/25 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:bg-slate-900"
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {remote.loading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" /> : null}
            {query ? (
              <button
                type="button"
                onClick={() => {
                  clear();
                  inputRef.current?.focus();
                }}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                aria-label={t('search.clear')}
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 lg:block dark:border-slate-600 dark:bg-slate-800">
                Ctrl K
              </kbd>
            )}
          </div>
        </div>

        {showPanel ? (
          <div
            id="gs-listbox"
            role="listbox"
            aria-label={t('search.open')}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white pb-1 shadow-2xl md:left-0 dark:border-slate-700 dark:bg-slate-900"
          >
            {noResults ? (
              <div className="flex flex-col items-center px-6 py-6 text-center">
                <SearchX className="h-8 w-8 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('search.noResults', { query: trimmed })}
                </p>
                <p className="mt-1 text-xs text-slate-500">{t('search.noResultsHint')}</p>
              </div>
            ) : null}

            {remote.error ? (
              <p className="mx-3 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {t('search.error')}
              </p>
            ) : null}

            {(() => {
              let index = -1;
              return sections.map((section) => (
                <div key={section.key} className="pb-1">
                  {section.title ? (
                    <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {section.title}
                    </p>
                  ) : null}
                  {section.items.map((item) => {
                    index += 1;
                    const i = index;
                    const isActive = i === active;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.key}
                        id={`gs-opt-${i}`}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={item.run}
                        className={`mx-2 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 ${
                          isActive ? 'bg-blue-50 dark:bg-slate-800' : ''
                        }`}
                      >
                        <span
                          className={`grid h-8 w-8 flex-none place-items-center rounded-lg ${
                            isActive
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                            <Highlighted text={item.title} terms={terms} />
                          </span>
                          {item.subtitle ? (
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              <Highlighted text={item.subtitle} terms={terms} />
                            </span>
                          ) : null}
                        </span>
                        {item.badge ? (
                          <span className="flex-none rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                            {item.badge}
                          </span>
                        ) : null}
                        {item.external ? (
                          <ArrowUpRight className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
                        ) : isActive ? (
                          <CornerDownLeft className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ));
            })()}

            <div className="mt-1 flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 dark:border-slate-800">
              <span>
                <kbd className="font-semibold">↑↓</kbd> {t('search.footer.navigate')} ·{' '}
                <kbd className="font-semibold">↵</kbd> {t('search.footer.open')} ·{' '}
                <kbd className="font-semibold">Esc</kbd> {t('search.footer.close')}
              </span>
              {remote.loading ? <span>{t('search.searching')}</span> : null}
            </div>
          </div>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {searchable && !remote.loading ? t('search.resultsCount', { count: flat.length }) : ''}
        </span>
      </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setMobileOpen(true);
          setOpen(true);
        }}
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label={t('search.open')}
      >
        <Search className="h-5 w-5" />
      </button>

      {/* On phones the search covers the top of the screen: it is rendered on the page body because the
          header's blur effect would otherwise trap it inside the header. */}
      {mobileOpen ? (
        createPortal(
          <>
            {backdrop}
            {searchBox}
          </>,
          document.body
        )
      ) : (
        searchBox
      )}
    </>
  );
}
