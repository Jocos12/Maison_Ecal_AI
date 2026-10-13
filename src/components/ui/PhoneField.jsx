import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, CheckCircle2, ChevronDown, Search } from 'lucide-react';
import DrcFlag from '../layout/DrcFlag.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { COUNTRY_BY_ISO, DEFAULT_COUNTRY, PHONE_COUNTRIES, parsePhone } from '../../utils/phoneCountries.js';

function Flag({ iso }) {
  const [failed, setFailed] = useState(false);
  const box = 'h-4 w-6 flex-none rounded-[3px] ring-1 ring-slate-900/15';
  if (iso === 'CD') return <DrcFlag className={box} />;
  if (failed) {
    return (
      <span className={`grid place-items-center bg-slate-200 text-[8px] font-bold text-slate-600 ${box}`} aria-hidden="true">
        {iso}
      </span>
    );
  }
  const code = iso.toLowerCase();
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt=""
      aria-hidden="true"
      width="24"
      height="16"
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${box}`}
    />
  );
}

const DRC_NAMES = { fr: 'République démocratique du Congo', en: 'DR Congo', sw: 'DR Kongo' };

function expectedLabel(country) {
  return country.min === country.max ? String(country.max) : `${country.min}-${country.max}`;
}

/**
 * Phone number with a country picker (flag and dial code). The number must have exactly the digits of the
 * chosen country: the box refuses extra digits and tells how many are missing.
 * `value` and `onChange` use the form "+243 812345678"; an incomplete number is reported as an empty string
 * so a half typed number is never saved.
 */
export default function PhoneField({ id, value, onChange, onStatus, disabled = false }) {
  const { t, lang } = useI18n();
  const listId = useId();
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const emitted = useRef(value || '');
  const initial = useMemo(() => parsePhone(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [iso, setIso] = useState(initial.iso);
  const [digits, setDigits] = useState(initial.digits);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 320, up: false });

  const country = COUNTRY_BY_ISO[iso] || COUNTRY_BY_ISO[DEFAULT_COUNTRY];

  // A value that changes from outside (CV import, another conversation) replaces what is shown
  useEffect(() => {
    if ((value || '') === emitted.current) return;
    const parsed = parsePhone(value);
    emitted.current = value || '';
    setIso(parsed.iso);
    setDigits(parsed.digits);
  }, [value]);

  const names = useMemo(() => {
    let display = null;
    try {
      display = new Intl.DisplayNames([lang || 'fr'], { type: 'region' });
    } catch {
      display = null;
    }
    const map = {};
    for (const c of PHONE_COUNTRIES) map[c.iso] = display?.of(c.iso) || c.iso;
    // The full name of the DRC reads better than "Congo-Kinshasa"
    map.CD = DRC_NAMES[lang] || DRC_NAMES.fr;
    return map;
  }, [lang]);

  const options = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\+/, '');
    // Without a search the list keeps the order of the data: the DRC and its neighbours come first
    return PHONE_COUNTRIES.filter(
      (c) => !q || names[c.iso].toLowerCase().includes(q) || c.dial.startsWith(q) || c.iso.toLowerCase() === q
    );
  }, [names, query]);

  const emit = (nextIso, nextDigits) => {
    const c = COUNTRY_BY_ISO[nextIso];
    const complete = nextDigits.length >= c.min && nextDigits.length <= c.max;
    const out = complete ? `+${c.dial} ${nextDigits}` : '';
    emitted.current = out;
    onChange(out);
  };

  const onDigits = (e) => {
    const raw = e.target.value;
    if (raw.trim().startsWith('+')) {
      // A full international number pasted: pick its country as well
      const parsed = parsePhone(raw);
      setIso(parsed.iso);
      setDigits(parsed.digits);
      emit(parsed.iso, parsed.digits);
      return;
    }
    const next = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, country.max);
    setDigits(next);
    emit(iso, next);
  };

  const choose = (c) => {
    const trimmed = digits.slice(0, c.max);
    setIso(c.iso);
    setDigits(trimmed);
    setOpen(false);
    setQuery('');
    emit(c.iso, trimmed);
    requestAnimationFrame(() => document.getElementById(id)?.focus());
  };

  const openList = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const room = window.innerHeight - rect.bottom;
      const up = room < 350 && rect.top > room;
      const width = Math.min(Math.max(rect.width, 288), window.innerWidth - 24);
      const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
      setPos({ top: up ? rect.top - 8 : rect.bottom + 8, left, width, up });
    }
    setActive(Math.max(0, PHONE_COUNTRIES.findIndex((c) => c.iso === iso)));
    setQuery('');
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    // On a phone the keyboard would cover the list, so the search box is only focused with a mouse
    if (!window.matchMedia?.('(pointer: coarse)').matches) searchRef.current?.focus();
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) setOpen(false);
    };
    const onScroll = (e) => {
      // Only a scroll of what holds the field moves it away from the list
      const holder = e.target === document ? document.documentElement : e.target;
      if (!listRef.current?.contains(e.target) && holder?.contains?.(buttonRef.current)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const onListKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (options[active]) choose(options[active]);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  const missing = Math.max(0, country.min - digits.length);
  const complete = digits.length >= country.min;
  const empty = digits.length === 0;

  useEffect(() => {
    onStatus?.(empty ? 'empty' : complete ? 'complete' : 'partial');
  }, [empty, complete]); // eslint-disable-line react-hooks/exhaustive-deps
  const countryName = names[country.iso];

  return (
    <div ref={rootRef}>
      <div
        className={`flex items-stretch rounded-xl border bg-white transition focus-within:ring-4 dark:bg-slate-800 ${
          disabled ? 'pointer-events-none border-slate-200 opacity-60 dark:border-slate-700' : ''
        } ${
          complete
            ? 'border-emerald-400 focus-within:border-emerald-500 focus-within:ring-emerald-500/15'
            : !empty
              ? 'border-amber-400 focus-within:border-amber-500 focus-within:ring-amber-500/15'
              : 'border-slate-200 focus-within:border-[#24478a] focus-within:ring-[#24478a]/15 dark:border-slate-600'
        }`}
      >
        <button
          ref={buttonRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={t('jobAssistant.phoneCountry')}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openList())}
          className="flex flex-none items-center gap-1.5 rounded-l-xl border-r border-slate-200 bg-slate-50 px-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 focus:outline-none focus-visible:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          <Flag iso={country.iso} />
          <span className="tabular-nums">+{country.dial}</span>
          <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={digits}
          disabled={disabled}
          onChange={onDigits}
          maxLength={country.max + 6}
          placeholder={'0'.repeat(country.max)}
          aria-describedby={`${id}-hint`}
          className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm font-semibold tabular-nums tracking-[0.06em] text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-300 dark:text-white dark:placeholder:text-slate-500"
        />
        <span
          className={`flex flex-none items-center pr-3 text-[11px] font-bold tabular-nums ${
            complete ? 'text-emerald-600' : empty ? 'text-slate-400' : 'text-amber-600'
          }`}
          aria-hidden="true"
        >
          {digits.length}/{country.max}
        </span>
      </div>

      <p
        id={`${id}-hint`}
        className={`mt-1.5 flex items-start gap-1.5 text-xs leading-snug ${
          complete ? 'text-emerald-700 dark:text-emerald-300' : empty ? 'text-slate-500 dark:text-slate-400' : 'text-amber-700 dark:text-amber-300'
        }`}
      >
        {complete ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-none" aria-hidden="true" /> : null}
        <span>
          {complete
            ? t('jobAssistant.phoneComplete')
            : empty
              ? t('jobAssistant.phoneExpected', { count: expectedLabel(country), country: countryName, dial: `+${country.dial}` })
              : t('jobAssistant.phoneMissing', { count: missing })}
        </span>
      </p>

      {open ? (
        <div
          ref={listRef}
          onKeyDown={onListKey}
          style={{
            position: 'fixed',
            left: pos.left,
            width: pos.width,
            ...(pos.up ? { bottom: window.innerHeight - pos.top } : { top: pos.top })
          }}
          className="z-[60] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800"
        >
          <div className="relative border-b border-slate-100 p-2 dark:border-slate-700">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('jobAssistant.phoneSearch')}
              aria-label={t('jobAssistant.phoneSearch')}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#24478a] focus:bg-white dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <ul id={listId} role="listbox" aria-label={t('jobAssistant.phoneCountry')} className="historique-scroll max-h-64 p-1.5">
            {options.map((c, index) => {
              const selected = c.iso === iso;
              const highlighted = index === active;
              return (
                <li
                  key={c.iso}
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(c)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-[13px] leading-snug transition ${
                    selected
                      ? 'bg-[#24478a] font-semibold text-white'
                      : highlighted
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <Flag iso={c.iso} />
                  <span className="min-w-0 flex-1 break-words">{names[c.iso]}</span>
                  <span className={`flex-none text-xs tabular-nums ${selected ? 'text-blue-100' : 'text-slate-400'}`}>+{c.dial}</span>
                  {selected ? <Check className="h-3.5 w-3.5 flex-none" aria-hidden="true" /> : null}
                </li>
              );
            })}
            {options.length === 0 ? (
              <li className="px-3 py-4 text-center text-xs text-slate-500">{t('jobAssistant.phoneNoResult')}</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
