import { useState } from 'react';
import { ChevronLeft, ChevronRight, FilePen, Hourglass, Inbox, Send, Trophy, XCircle } from 'lucide-react';
import ApplicationCard from './ApplicationCard.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

// Exactly two cards per column page. The slot height is fixed so a short column
// occupies the same space as a full one, without growing into an empty void.
const PAGE_SIZE = 2;
const SLOT_CLASS = 'h-[10.75rem] min-h-[10.75rem] max-h-[10.75rem]';

// One flat colour per stage of the follow-up.
const COLUMNS = [
  {
    key: 'draft',
    icon: FilePen,
    tile: 'bg-slate-500 text-white',
    title: 'text-slate-700 dark:text-slate-200',
    count: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    box: 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50',
    over: 'border-slate-400 bg-slate-100 dark:bg-slate-800',
    dashed: 'border-slate-300 text-slate-400 dark:border-slate-600'
  },
  {
    key: 'submitted',
    icon: Send,
    tile: 'bg-[#24478a] text-white',
    title: 'text-[#1b3a72] dark:text-blue-200',
    count: 'bg-[#dbe5f7] text-[#24478a] dark:bg-slate-700 dark:text-blue-200',
    box: 'border-[#c9d8f1] bg-[#f1f5fc] dark:border-slate-700 dark:bg-slate-900/50',
    over: 'border-[#24478a] bg-[#e3ebf9] dark:bg-slate-800',
    dashed: 'border-[#b3c7ea] text-[#7f98c9] dark:border-slate-600'
  },
  {
    key: 'pending',
    icon: Hourglass,
    tile: 'bg-amber-500 text-white',
    title: 'text-amber-800 dark:text-amber-300',
    count: 'bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200',
    box: 'border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-slate-900/50',
    over: 'border-amber-500 bg-amber-100 dark:bg-slate-800',
    dashed: 'border-amber-300 text-amber-400 dark:border-amber-800'
  },
  {
    key: 'won',
    icon: Trophy,
    tile: 'bg-emerald-600 text-white',
    title: 'text-emerald-800 dark:text-emerald-300',
    count: 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200',
    box: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-slate-900/50',
    over: 'border-emerald-500 bg-emerald-100 dark:bg-slate-800',
    dashed: 'border-emerald-300 text-emerald-400 dark:border-emerald-800'
  },
  {
    key: 'rejected',
    icon: XCircle,
    tile: 'bg-rose-600 text-white',
    title: 'text-rose-800 dark:text-rose-300',
    count: 'bg-rose-200 text-rose-900 dark:bg-rose-900/60 dark:text-rose-200',
    box: 'border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-slate-900/50',
    over: 'border-rose-500 bg-rose-100 dark:bg-slate-800',
    dashed: 'border-rose-300 text-rose-400 dark:border-rose-800'
  }
];

const pagerButton =
  'inline-flex h-8 min-w-0 items-center justify-center gap-0.5 rounded-xl border px-2 text-[11px] font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#24478a]/20 disabled:cursor-not-allowed';

const pagerEnabled =
  'border-[#24478a] bg-white text-[#24478a] shadow-sm hover:bg-[#24478a] hover:text-white dark:bg-slate-900 dark:text-blue-200 dark:hover:bg-[#24478a] dark:hover:text-white';

const pagerDisabled =
  'border-slate-200 bg-slate-100 text-slate-400 shadow-none hover:bg-slate-100 hover:text-slate-400 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-500 dark:hover:bg-slate-800/80 dark:hover:text-slate-500';

function columnOf(status) {
  if (status === 'interview') return 'pending';
  return COLUMNS.some((c) => c.key === status) ? status : 'draft';
}

function pageCountOf(total) {
  return Math.max(1, Math.ceil(total / PAGE_SIZE));
}

/** Put a card that was just dropped at the top of its new column, so it shows on page 1. */
function withBumpedFirst(cards, bumped) {
  if (!bumped) return cards;
  const index = cards.findIndex((app) => app._id === bumped);
  if (index <= 0) return cards;
  const next = cards.slice();
  const [item] = next.splice(index, 1);
  next.unshift(item);
  return next;
}

/** The follow-up board: one column per stage; cards can be dragged from one column to another. */
export default function ApplicationList({ apps, onSelect, onStatusDrop, highlightStatus }) {
  const { t } = useI18n();
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);
  const [pages, setPages] = useState({});
  const [bumped, setBumped] = useState(null);

  const byStatus = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
  for (const app of apps || []) {
    byStatus[columnOf(app.status)].push(app);
  }

  const bumpedActive =
    bumped && byStatus[bumped.column]?.some((app) => app._id === bumped.id) ? bumped : null;

  const goTo = (key, nextPage, pageCount) => {
    const page = Math.min(pageCount - 1, Math.max(0, nextPage));
    setPages((current) => ({ ...current, [key]: page }));
  };

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] items-start gap-4">
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        const active = highlightStatus === col.key || (highlightStatus === 'interview' && col.key === 'pending');
        const isOver = overCol === col.key;
        const cards = withBumpedFirst(
          byStatus[col.key],
          bumpedActive?.column === col.key ? bumpedActive.id : null
        );
        const pageCount = pageCountOf(cards.length);
        const page = Math.min(pages[col.key] ?? 0, pageCount - 1);
        const visible = cards.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
        const showPager = cards.length > PAGE_SIZE;
        const columnLabel = t(`applications.${col.key}`);

        return (
          <section
            key={col.key}
            aria-label={columnLabel}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOverCol(col.key);
            }}
            onDragLeave={() => setOverCol((current) => (current === col.key ? null : current))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              setOverCol(null);
              setDragId(null);
              if (!id) return;
              const moving = (apps || []).find((app) => app._id === id);
              if (!moving || columnOf(moving.status) !== col.key) {
                setBumped({ id, column: col.key });
                setPages((current) => ({ ...current, [col.key]: 0 }));
              }
              onStatusDrop?.(id, col.key);
            }}
            className={`relative flex flex-col rounded-2xl border p-3 transition ${isOver ? col.over : col.box} ${
              active ? 'ring-2 ring-[#24478a]/30' : ''
            }`}
          >
            <header className="flex items-center gap-2.5 px-1 pb-3">
              <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg shadow-sm ${col.tile}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className={`min-w-0 flex-1 text-[12px] font-bold uppercase tracking-[0.12em] ${col.title}`}>
                {columnLabel}
              </h3>
              <span className={`grid h-6 min-w-[1.5rem] place-items-center rounded-full px-2 text-[11px] font-bold tabular-nums ${col.count}`}>
                {cards.length}
              </span>
            </header>

            <div className="relative grid grid-rows-2 gap-2">
              {Array.from({ length: PAGE_SIZE }, (_, index) => {
                const app = visible[index];
                return (
                  <div key={app?._id || `${col.key}-slot-${index}`} className={SLOT_CLASS}>
                    {app ? (
                      <ApplicationCard
                        app={app}
                        onClick={onSelect}
                        dragging={dragId === app._id}
                        className="h-full overflow-hidden"
                        onDragStart={(item) => setDragId(item._id)}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverCol(null);
                        }}
                      />
                    ) : null}
                  </div>
                );
              })}
              {cards.length === 0 ? (
                <div
                  className={`pointer-events-none absolute inset-0 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 text-center ${col.dashed}`}
                >
                  <Inbox className="h-4 w-4 flex-none" aria-hidden="true" />
                  <p className="text-xs font-semibold">
                    {isOver && dragId ? t('applications.dropHere') : t('applications.emptyColumn')}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="mt-2.5 h-12 shrink-0">
              {showPager ? (
                <nav
                  className="grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 border-t border-black/5 dark:border-white/10"
                  aria-label={`${columnLabel}, ${t('applications.pageOf', { page: page + 1, pages: pageCount })}`}
                >
                  <button
                    type="button"
                    onClick={() => goTo(col.key, page - 1, pageCount)}
                    disabled={page <= 0}
                    aria-label={`${t('applications.previous')}, ${columnLabel}`}
                    className={`${pagerButton} justify-self-start ${page <= 0 ? pagerDisabled : pagerEnabled}`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                    <span className="truncate">{t('applications.previous')}</span>
                  </button>
                  <p className="px-1 text-center text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
                    {t('applications.pageOf', { page: page + 1, pages: pageCount })}
                  </p>
                  <button
                    type="button"
                    onClick={() => goTo(col.key, page + 1, pageCount)}
                    disabled={page >= pageCount - 1}
                    aria-label={`${t('applications.next')}, ${columnLabel}`}
                    className={`${pagerButton} justify-self-end ${page >= pageCount - 1 ? pagerDisabled : pagerEnabled}`}
                  >
                    <span className="truncate">{t('applications.next')}</span>
                    <ChevronRight className="h-3.5 w-3.5 flex-none" aria-hidden="true" />
                  </button>
                </nav>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
