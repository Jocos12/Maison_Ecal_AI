import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '/flags/fr.png' },
  { code: 'en', label: 'English', flag: '/flags/en.png' },
  { code: 'sw', label: 'Kiswahili', flag: '/flags/sw.png' }
];

function Flag({ src }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width="24"
      height="16"
      className="h-4 w-6 flex-none rounded-[3px] object-cover shadow-sm ring-1 ring-slate-900/15"
    />
  );
}

/**
 * Language picker with a flag for every language.
 * - variant "header": compact, shows only the flag of the chosen language. Hovering it (or focusing it)
 *   expands it to the full control with the list of all languages; moving away collapses it again.
 * - variant "field": full-width drop-down for forms (opens on click).
 */
export default function LanguageMenu({ variant = 'header', className = '' }) {
  const { lang, setLang, t } = useI18n();
  const rootRef = useRef(null);
  const closeTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const isHeader = variant === 'header';
  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const currentIndex = LANGUAGES.indexOf(current);

  const openNow = useCallback(() => {
    clearTimeout(closeTimer.current);
    setActive(currentIndex);
    setOpen(true);
  }, [currentIndex]);

  const closeSoon = useCallback((delay = 160) => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), delay);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open || isHeader) return undefined;
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, isHeader]);

  const pick = (index) => {
    setLang(LANGUAGES[index].code);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openNow();
        return;
      }
      setActive((i) => (e.key === 'ArrowDown' ? Math.min(LANGUAGES.length - 1, i + 1) : Math.max(0, i - 1)));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) pick(active);
      else openNow();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  const triggerBase =
    'flex items-center gap-2 overflow-hidden rounded-xl border bg-white text-sm font-medium text-slate-800 shadow-sm transition-[width,border-color,box-shadow] duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:bg-slate-900 dark:text-slate-100';
  const triggerState = open
    ? 'border-blue-500 shadow-md dark:border-blue-400'
    : 'border-slate-200 hover:border-blue-300 dark:border-slate-600 dark:hover:border-blue-500/60';

  const list = open ? (
    <ul
      role="listbox"
      aria-label={t('layout.language')}
      className="overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
    >
      {LANGUAGES.map((l, index) => {
        const selected = l.code === lang;
        return (
          <li
            key={l.code}
            role="option"
            aria-selected={selected}
            onMouseEnter={() => setActive(index)}
            onClick={() => pick(index)}
            className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium ${
              selected
                ? 'bg-blue-600 text-white'
                : index === active
                  ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                  : 'text-slate-700 dark:text-slate-200'
            }`}
          >
            <Flag src={l.flag} />
            <span>{l.label}</span>
          </li>
        );
      })}
    </ul>
  ) : null;

  if (!isHeader) {
    return (
      <div ref={rootRef} className={`relative ${className}`}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('layout.language')}
          onClick={() => (open ? setOpen(false) : openNow())}
          onKeyDown={onKeyDown}
          className={`${triggerBase} ${triggerState} w-full px-3 py-2`}
        >
          <Flag src={current.flag} />
          <span className="flex-1 text-left">{current.label}</span>
          <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
        </button>
        {open ? <div className="absolute left-0 right-0 top-full z-50 mt-2">{list}</div> : null}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`relative h-9 flex-none transition-[width] duration-200 ease-out ${
        open ? 'w-[152px]' : 'w-10'
      } ${className}`}
      onMouseEnter={openNow}
      onMouseLeave={() => closeSoon()}
      onFocus={openNow}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget)) closeSoon(0);
      }}
    >
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('layout.language')} : ${current.label}`}
        onClick={() => (open ? setOpen(false) : openNow())}
        onKeyDown={onKeyDown}
        className={`${triggerBase} ${triggerState} h-9 w-full ${
          open ? 'justify-start px-2.5' : 'justify-center px-0'
        }`}
      >
        <Flag src={current.flag} />
        {open ? (
          <>
            <span className="flex-1 whitespace-nowrap text-left">{current.label}</span>
            <ChevronDown className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
          </>
        ) : null}
      </button>
      {open ? <div className="absolute right-0 top-full z-50 w-[152px] pt-2">{list}</div> : null}
    </div>
  );
}
