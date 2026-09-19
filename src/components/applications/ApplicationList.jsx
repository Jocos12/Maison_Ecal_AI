import { useState } from 'react';
import { FilePen, Hourglass, Inbox, Send, Trophy, XCircle } from 'lucide-react';
import ApplicationCard from './ApplicationCard.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

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

function columnOf(status) {
  if (status === 'interview') return 'pending';
  return COLUMNS.some((c) => c.key === status) ? status : 'draft';
}

/** The follow-up board: one column per stage; cards can be dragged from one column to another. */
export default function ApplicationList({ apps, onSelect, onStatusDrop, highlightStatus }) {
  const { t } = useI18n();
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const byStatus = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
  for (const a of apps || []) {
    byStatus[columnOf(a.status)].push(a);
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] items-start gap-4">
      {COLUMNS.map((col) => {
        const Icon = col.icon;
        const active = highlightStatus === col.key || (highlightStatus === 'interview' && col.key === 'pending');
        const isOver = overCol === col.key;
        const cards = byStatus[col.key];
        return (
          <section
            key={col.key}
            aria-label={t(`applications.${col.key}`)}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setOverCol(col.key);
            }}
            onDragLeave={() => setOverCol((c) => (c === col.key ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData('text/plain');
              setOverCol(null);
              setDragId(null);
              if (id) onStatusDrop?.(id, col.key);
            }}
            className={`rounded-2xl border p-3 transition ${isOver ? col.over : col.box} ${
              active ? 'ring-2 ring-[#24478a]/30' : ''
            }`}
          >
            <header className={`flex items-center gap-2.5 px-1 ${cards.length ? 'pb-3' : 'pb-2.5'}`}>
              <span className={`grid h-8 w-8 flex-none place-items-center rounded-lg shadow-sm ${col.tile}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <h3 className={`min-w-0 flex-1 text-[12px] font-bold uppercase tracking-[0.12em] ${col.title}`}>
                {t(`applications.${col.key}`)}
              </h3>
              <span className={`grid h-6 min-w-[1.5rem] place-items-center rounded-full px-2 text-[11px] font-bold tabular-nums ${col.count}`}>
                {cards.length}
              </span>
            </header>

            <div className="flex flex-col gap-2.5">
              {cards.map((app) => (
                <ApplicationCard
                  key={app._id}
                  app={app}
                  onClick={onSelect}
                  dragging={dragId === app._id}
                  onDragStart={(a) => setDragId(a._id)}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverCol(null);
                  }}
                />
              ))}
              {cards.length === 0 || isOver ? (
                <div
                  className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-3.5 text-center ${col.dashed}`}
                >
                  <Inbox className="h-4 w-4 flex-none" aria-hidden="true" />
                  <p className="text-xs font-semibold">
                    {isOver && dragId ? t('applications.dropHere') : t('applications.emptyColumn')}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
