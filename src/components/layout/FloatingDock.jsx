import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bot, Globe2, LayoutGrid, Plus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import AIAgentModal from '../agent/AIAgentModal.jsx';
import QuickLinksPanel, { QUICK_LINKS_SURFACE } from './QuickLinksFloat.jsx';
import SiteMenuPanel, { SITE_MENU_SURFACE } from './SiteMenuFloat.jsx';

/**
 * One launcher replaces the three floating buttons. It rests against the right edge of the screen as a thin,
 * translucent tab, so it never covers the page. Pointing at the edge (or tapping the tab, or reaching it with the
 * keyboard) slides it out and shows the AI assistant, the website menu and the quick access buttons.
 * They stay until the user clicks somewhere else (or presses Esc): choosing one opens its panel next to the dock.
 */
export default function FloatingDock() {
  const { t } = useI18n();
  const location = useLocation();
  const rootRef = useRef(null);
  const openedByHover = useRef(false);
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(null); // 'site' | 'quick' | null
  const [chatOpen, setChatOpen] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState(null);

  const closeAll = useCallback(() => {
    openedByHover.current = false;
    setOpen(false);
    setPanel(null);
  }, []);

  // "Ask the assistant" links elsewhere in the app dispatch this event
  useEffect(() => {
    const handler = (event) => {
      const prompt = event.detail?.prompt;
      if (prompt) setSeedPrompt(prompt);
      setChatOpen(true);
      closeAll();
    };
    window.addEventListener('mecal:open-agent', handler);
    return () => window.removeEventListener('mecal:open-agent', handler);
  }, [closeAll]);

  // a click anywhere else closes everything
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) closeAll();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') closeAll();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeAll]);

  useEffect(() => {
    closeAll();
  }, [location.pathname, closeAll]);

  const onLauncherEnter = () => {
    if (!open) {
      openedByHover.current = true;
      setOpen(true);
    }
  };

  const onLauncherClick = () => {
    if (open && openedByHover.current) {
      // the user pointed at the launcher and now clicks it: keep the buttons, do not close them right away
      openedByHover.current = false;
      return;
    }
    if (open) closeAll();
    else setOpen(true);
  };

  const choose = (key) => {
    if (key === 'ai') {
      setChatOpen(true);
      closeAll();
      return;
    }
    setPanel((current) => (current === key ? null : key));
  };

  // closest to the launcher first
  const items = [
    { key: 'ai', icon: Bot, label: t('agent.tooltip'), color: 'bg-[#1b3a72]' },
    { key: 'site', icon: Globe2, label: t('siteMenu.open'), color: 'bg-[#1b7f5c]' },
    { key: 'quick', icon: LayoutGrid, label: t('quickLinks.open'), color: 'bg-[#4a55c4]' }
  ];

  return (
    <>
      <div ref={rootRef} className="pointer-events-none fixed bottom-24 right-0 z-[55] flex flex-col-reverse items-end gap-3 pr-3">
        {/* Invisible strip along the screen edge: pointing at it slides the launcher out */}
        {!open ? (
          <span
            className="pointer-events-auto absolute bottom-0 right-0 h-14 w-7 [@media(pointer:coarse)]:hidden"
            onMouseEnter={onLauncherEnter}
            aria-hidden="true"
          />
        ) : null}
        <button
          type="button"
          onMouseEnter={onLauncherEnter}
          onClick={onLauncherClick}
          aria-expanded={open}
          aria-label={t('layout.dockLabel')}
          title={t('layout.dockLabel')}
          className={`pointer-events-auto grid h-12 w-12 place-items-center rounded-full bg-[#24478a] text-white shadow-xl transition-all duration-300 ease-out focus:outline-none focus-visible:translate-x-0 focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-[#24478a]/30 ${
            open
              ? 'translate-x-0 opacity-100 ring-4 ring-[#24478a]/25'
              : 'translate-x-[calc(100%+0.75rem-10px)] opacity-40 hover:translate-x-0 hover:opacity-100 [@media(pointer:coarse)]:translate-x-[calc(100%+0.75rem-18px)]'
          }`}
        >
          <Plus
            className={`h-6 w-6 transition-transform duration-300 ${open ? 'rotate-[135deg]' : 'rotate-0'}`}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        </button>

        {items.map(({ key, icon: Icon, label, color }, i) => {
          const active = panel === key;
          return (
            <div
              key={key}
              className={`relative flex items-center transition-all duration-200 ease-out ${
                open ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-75 opacity-0'
              }`}
              style={{ transitionDelay: open ? `${(i + 1) * 45}ms` : '0ms' }}
            >
              {open && !panel ? (
                <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
                  {label}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => choose(key)}
                tabIndex={open ? 0 : -1}
                aria-label={label}
                aria-pressed={key === 'ai' ? undefined : active}
                className={`pointer-events-auto grid h-12 w-12 place-items-center rounded-full text-white shadow-xl transition duration-200 hover:scale-110 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/50 ${color} ${
                  active ? 'ring-4 ring-white dark:ring-slate-300' : ''
                }`}
              >
                <Icon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          );
        })}

        {panel ? (
          <div
            className={`mecal-panel-in pointer-events-auto absolute bottom-0 right-[calc(100%+0.75rem)] flex max-h-[calc(100vh-3rem)] flex-col overflow-hidden ${
              panel === 'quick'
                ? `w-[min(17.5rem,calc(100vw-6.5rem))] ${QUICK_LINKS_SURFACE}`
                : `w-[min(34rem,calc(100vw-6.5rem))] ${SITE_MENU_SURFACE}`
            }`}
          >
            {panel === 'quick' ? <QuickLinksPanel onClose={closeAll} /> : <SiteMenuPanel />}
          </div>
        ) : null}
      </div>

      {chatOpen ? (
        <AIAgentModal
          seedPrompt={seedPrompt}
          onSeedConsumed={() => setSeedPrompt(null)}
          onClose={() => {
            setChatOpen(false);
            setSeedPrompt(null);
          }}
        />
      ) : null}
    </>
  );
}
