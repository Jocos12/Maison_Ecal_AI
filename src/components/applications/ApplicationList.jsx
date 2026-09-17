import { useState } from 'react';
import ApplicationCard from './ApplicationCard.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

const COLUMNS = [
  { key: 'draft', accent: 'border-t-slate-400', header: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50/80 dark:bg-slate-900/40' },
  { key: 'submitted', accent: 'border-t-blue-500', header: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50/50 dark:bg-blue-950/20' },
  { key: 'pending', accent: 'border-t-amber-500', header: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50/50 dark:bg-amber-950/20' },
  { key: 'won', accent: 'border-t-emerald-500', header: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20' },
  { key: 'rejected', accent: 'border-t-rose-500', header: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50/50 dark:bg-rose-950/20' }
];

function columnOf(status) {
  if (status === 'interview') return 'pending';
  return COLUMNS.some((c) => c.key === status) ? status : 'draft';
}

export default function ApplicationList({ apps, onSelect, onStatusDrop, highlightStatus }) {
  const { t } = useI18n();
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  const byStatus = Object.fromEntries(COLUMNS.map((c) => [c.key, []]));
  for (const a of apps || []) {
    byStatus[columnOf(a.status)].push(a);
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {COLUMNS.map((col) => {
        const active = highlightStatus === col.key || (highlightStatus === 'interview' && col.key === 'pending');
        const isOver = overCol === col.key;
        return (
          <div
            key={col.key}
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
            className={`min-h-[280px] rounded-2xl border border-slate-200 border-t-4 ${col.accent} ${col.bg} p-2 dark:border-slate-700 ${
              isOver ? 'ring-2 ring-blue-500/60' : ''
            } ${active ? 'ring-2 ring-blue-400/40' : ''}`}
          >
            <div className="flex items-center justify-between px-2 py-2">
              <h3 className={`text-xs font-bold uppercase tracking-wider ${col.header}`}>
                {t(`applications.${col.key}`)}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                {byStatus[col.key].length}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-1">
              {byStatus[col.key].map((app) => (
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
            </div>
          </div>
        );
      })}
    </div>
  );
}
