import ApplicationCard from './ApplicationCard.jsx';
import { useI18n } from '../../context/I18nContext.jsx';

const columns = ['draft', 'submitted', 'pending', 'won', 'rejected'];

export default function ApplicationList({ apps, onSelect }) {
  const { t } = useI18n();
  const byStatus = Object.fromEntries(columns.map((c) => [c, []]));
  for (const a of apps || []) {
    if (byStatus[a.status]) byStatus[a.status].push(a);
  }

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {columns.map((col) => (
        <div key={col} className="glass-panel rounded-xl p-2 min-h-[200px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 px-2 py-2 border-b border-slate-200 dark:border-slate-800 dark:text-blue-300">
            {t(`applications.${col}`)}
          </h3>
          <div className="flex flex-col gap-2 p-2">
            {byStatus[col].map((app) => (
              <ApplicationCard key={app._id} app={app} onClick={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
