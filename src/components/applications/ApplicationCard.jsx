import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useI18n } from '../../context/I18nContext.jsx';

export default function ApplicationCard({ app, onClick }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const opp = app.opportunity;

  return (
    <button
      type="button"
      onClick={() => onClick(app)}
      className="w-full text-left rounded-lg border border-slate-200 bg-white/85 p-3 transition hover:-translate-y-0.5 hover:border-blue-500/40 dark:border-slate-700 dark:bg-slate-900/80"
    >
      <p className="font-medium text-slate-950 text-sm line-clamp-2 dark:text-white">{opp?.title || '—'}</p>
      <p className="text-xs text-slate-500 mt-1">{opp?.organization}</p>
      {opp?.deadline && (
        <p className="text-[10px] text-slate-500 mt-2">
          {t('opportunities.deadline')}: {format(new Date(opp.deadline), 'dd MMM', { locale })}
        </p>
      )}
      {app.notes && <p className="text-xs text-slate-400 mt-2 line-clamp-2">{app.notes}</p>}
    </button>
  );
}
