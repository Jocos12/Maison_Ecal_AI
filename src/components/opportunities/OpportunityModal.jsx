import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useI18n } from '../../context/I18nContext.jsx';
import { api } from '../../api/client.js';
import toast from 'react-hot-toast';
import { X, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export default function OpportunityModal({ opp, onClose, onCreated }) {
  const { t, lang } = useI18n();
  const locale = lang === 'fr' ? fr : undefined;
  const [aiDoc, setAiDoc] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  if (!opp) return null;

  const createApplication = async () => {
    try {
      await api.post('/api/applications', {
        opportunity: opp._id,
        status: 'draft'
      });
      toast.success('OK');
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const archive = async () => {
    try {
      await api.patch(`/api/opportunities/${opp._id}/archive`);
      toast.success('OK');
      onCreated?.();
      onClose();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  const generateDoc = async (type) => {
    setLoadingAi(true);
    try {
      const { data } = await api.post(`/api/ai/opportunities/${opp._id}/${type}`);
      setAiDoc(data.letter || data.proposal);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Génération IA impossible');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-6 pt-12 space-y-4">
          <h2 className="text-xl font-bold text-slate-950 pr-8 dark:text-white">{opp.title}</h2>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
            <span className="rounded border border-slate-300 px-2 py-0.5 dark:border-slate-600">{opp.platform}</span>
            <span className="rounded border border-blue-500/40 px-2 py-0.5 text-blue-200">
              {t(`opportunities.${opp.category}`)}
            </span>
            {opp.location && <span>{opp.location}</span>}
          </div>
          {opp.organization && <p className="text-slate-500 dark:text-slate-400">{opp.organization}</p>}
          <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-500 dark:text-slate-400">
            <p>
              Posted:{' '}
              {opp.postedDate ? format(new Date(opp.postedDate), 'PP', { locale }) : '—'}
            </p>
            <p>
              {t('opportunities.deadline')}:{' '}
              {opp.deadline ? format(new Date(opp.deadline), 'PP', { locale }) : '—'}
            </p>
          </div>
          {opp.description && (
            <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap dark:prose-invert dark:text-slate-300">
              {opp.description.slice(0, 4000)}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-4">
            <a
              href={opp.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              <ExternalLink className="h-4 w-4" />
              {t('opportunities.external')}
            </a>
            <button
              type="button"
              onClick={createApplication}
              className="rounded-lg border border-blue-400/50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-900/30"
            >
              {t('opportunities.createApp')}
            </button>
            <button
              type="button"
              onClick={() => generateDoc('letter')}
              disabled={loadingAi}
              className="rounded-lg border border-emerald-500/50 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
            >
              Lettre IA
            </button>
            <button
              type="button"
              onClick={() => generateDoc('proposal')}
              disabled={loadingAi}
              className="rounded-lg border border-violet-500/50 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60 dark:text-violet-200 dark:hover:bg-violet-900/30"
            >
              Proposition IA
            </button>
            <button
              type="button"
              onClick={archive}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('opportunities.archive')}
            </button>
          </div>
          {aiDoc && (
            <textarea
              className="mt-4 min-h-[260px] w-full rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              value={aiDoc}
              onChange={(e) => setAiDoc(e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
