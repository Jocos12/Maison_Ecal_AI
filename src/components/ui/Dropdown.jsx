import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Custom drop-down list (replaces the native <select>).
 * `options`: [{ value, label, hint?, dot? }]. The chosen option is the filled blue row; `dot` is an optional
 * Tailwind background class for a small coloured marker in front of the label.
 * Keyboard: arrows, Home/End, Enter or Space to choose, Esc to close, letters jump to a matching label.
 */
export default function Dropdown({ label, icon: Icon, value, options, onChange, defaultValue = '', className = '' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];
  const isFiltered = value !== defaultValue;

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // keep the highlighted option visible while moving with the keyboard
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openList = () => {
    setActive(selectedIndex);
    setOpen(true);
  };

  const choose = (index) => {
    const option = options[index];
    if (option) onChange(option.value);
    setOpen(false);
    rootRef.current?.querySelector('button[aria-haspopup]')?.focus();
  };

  const typeahead = useMemo(() => options.map((o) => String(o.label).toLowerCase()), [options]);

  const onKeyDown = (e) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key.length === 1) {
      const found = typeahead.findIndex((text, i) => i > active && text.startsWith(e.key.toLowerCase()));
      const first = found === -1 ? typeahead.findIndex((text) => text.startsWith(e.key.toLowerCase())) : found;
      if (first !== -1) setActive(first);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${className}`} onKeyDown={onKeyDown}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())}
        className={`flex min-h-[46px] w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[13px] shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/15 ${
          open
            ? 'border-[#24478a] bg-white ring-4 ring-[#24478a]/10 dark:bg-slate-800'
            : isFiltered
              ? 'border-[#24478a]/50 bg-[#f4f7fd] hover:border-[#24478a] dark:border-blue-400/50 dark:bg-slate-800'
              : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:hover:border-slate-500'
        }`}
      >
        {Icon ? (
          <span
            className={`grid h-7 w-7 flex-none place-items-center rounded-lg transition ${
              isFiltered || open
                ? 'bg-[#24478a] text-white'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {selected?.dot ? <span className={`h-2 w-2 flex-none rounded-full ${selected.dot}`} aria-hidden="true" /> : null}
          <span className={`min-w-0 break-words font-medium leading-tight ${isFiltered ? 'text-[#1b3a72] dark:text-blue-200' : 'text-slate-800 dark:text-slate-100'}`}>
            {selected?.label}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-none text-slate-400 transition-transform duration-200 ${open ? 'rotate-180 text-[#24478a]' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 z-40 mt-2 max-h-72 w-max min-w-full max-w-[min(26rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-slate-600 dark:bg-slate-800"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === active;
            return (
              <li
                key={String(option.value) || 'all'}
                role="option"
                aria-selected={isSelected}
                data-index={index}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(index)}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] leading-snug transition ${
                  isSelected
                    ? 'bg-[#24478a] font-semibold text-white'
                    : isActive
                      ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                      : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {option.dot ? (
                  <span className={`h-2 w-2 flex-none rounded-full ${isSelected ? 'ring-2 ring-white/70' : ''} ${option.dot}`} aria-hidden="true" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block break-words">{option.label}</span>
                  {option.hint ? (
                    <span className={`mt-0.5 block text-xs font-normal ${isSelected ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {option.hint}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
