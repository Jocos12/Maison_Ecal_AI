import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import ApplicationList from '../components/applications/ApplicationList.jsx';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

const statuses = ['draft', 'submitted', 'pending', 'interview', 'won', 'rejected'];

export default function Applications() {
  const { t } = useI18n();
  const [apps, setApps] = useState([]);
  const [sel, setSel] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [followUp, setFollowUp] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  const load = async () => {
    const { data } = await api.get('/api/applications');
    setApps(data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const open = (app) => {
    setSel(app);
    setNotes(app.notes || '');
    setStatus(app.status);
    setFollowUp(app.followUpDate ? app.followUpDate.slice(0, 10) : '');
    setDocuments(app.documents || []);
    setDocumentName('');
    setDocumentUrl('');
  };

  const save = async () => {
    if (!sel) return;
    try {
      await api.patch(`/api/applications/${sel._id}`, {
        notes,
        status,
        followUpDate: followUp || null,
        documents
      });
      toast.success('OK');
      setSel(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('applications.title')}</h1>
      <ApplicationList apps={apps} onSelect={open} />

      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setSel(null)}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-slate-950 pr-8 dark:text-white">{sel.opportunity?.title}</h2>
            <label className="block text-sm text-slate-400 mt-4">{t('applications.notes')}</label>
            <textarea
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 min-h-[100px] dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <label className="block text-sm text-slate-400 mt-3">Status</label>
            <select
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {t(`applications.${s}`)}
                </option>
              ))}
            </select>
            <label className="block text-sm text-slate-400 mt-3">{t('applications.followUp')}</label>
            <input
              type="date"
              className="w-full mt-1 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
            />
            <label className="block text-sm text-slate-400 mt-3">Documents (CV, lettre, offre technique)</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="Nom"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
              <input
                className="rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="URL du fichier"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                if (!documentName && !documentUrl) return;
                setDocuments((current) => [...current, { name: documentName || 'Document', url: documentUrl }]);
                setDocumentName('');
                setDocumentUrl('');
              }}
              className="mt-2 rounded-lg border border-slate-400 px-3 py-1.5 text-sm dark:border-slate-600"
            >
              Ajouter le document
            </button>
            <div className="mt-2 space-y-1">
              {documents.map((doc, index) => (
                <div key={`${doc.name}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-950">
                  <span>{doc.name}</span>
                  <button type="button" onClick={() => setDocuments((current) => current.filter((_, i) => i !== index))} className="text-red-500">
                    Retirer
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={save}
              className="mt-6 w-full rounded-lg bg-blue-600 py-2 font-semibold text-white hover:bg-blue-500"
            >
              {t('applications.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
