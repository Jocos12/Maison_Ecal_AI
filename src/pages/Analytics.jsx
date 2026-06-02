import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const colors = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

function BarSeries({ rows, labelKey }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <div className="space-y-3">
      {rows.map((row, index) => (
        <div key={row[labelKey]} className="grid grid-cols-[150px_1fr_40px] items-center gap-3 text-sm">
          <span className="truncate text-slate-600 dark:text-slate-300">{row[labelKey]}</span>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full" style={{ width: `${(row.count / max) * 100}%`, background: colors[index % colors.length] }} />
          </div>
          <b>{row.count}</b>
        </div>
      ))}
    </div>
  );
}

function LineSeries({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.count));
  const points = rows.map((row, index) => {
    const x = rows.length <= 1 ? 0 : (index / (rows.length - 1)) * 100;
    const y = 100 - (row.count / max) * 88 - 6;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div>
      <svg viewBox="0 0 100 100" className="h-64 w-full overflow-visible">
        <polyline fill="none" stroke="#2563eb" strokeWidth="3" points={points} vectorEffect="non-scaling-stroke" />
        {rows.map((row, index) => {
          const x = rows.length <= 1 ? 0 : (index / (rows.length - 1)) * 100;
          const y = 100 - (row.count / max) * 88 - 6;
          return <circle key={row.week} cx={x} cy={y} r="2.5" fill="#2563eb" />;
        })}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-slate-500">
        {rows.map((row) => <span key={row.week}>{row.week}</span>)}
      </div>
    </div>
  );
}

export default function Analytics() {
  const [data, setData] = useState({ byWeek: [], byCategory: [], bySource: [], averageRelevance: 0 });

  useEffect(() => {
    api.get('/api/analytics').then((res) => setData(res.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">Analytiques</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tendances, sources actives et pertinence des opportunités.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="glass-panel rounded-2xl p-5">
          <h2 className="mb-4 font-bold">Opportunités par semaine</h2>
          <LineSeries rows={data.byWeek} />
        </section>
        <section className="glass-panel rounded-2xl p-5">
          <h2 className="mb-4 font-bold">Répartition par catégorie</h2>
          <BarSeries rows={data.byCategory} labelKey="category" />
        </section>
        <section className="glass-panel rounded-2xl p-5 xl:col-span-2">
          <h2 className="mb-4 font-bold">Sources les plus actives</h2>
          <BarSeries rows={data.bySource} labelKey="source" />
        </section>
      </div>
    </div>
  );
}
