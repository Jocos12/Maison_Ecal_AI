import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import ApplicationList from '../components/applications/ApplicationList.jsx';
import ApplicationDetailModal from '../components/applications/ApplicationDetailModal.jsx';
import toast from 'react-hot-toast';
import { ClipboardList, GripVertical } from 'lucide-react';
import { isLocalFileUrl, sanitizeDocuments } from '../utils/applicationDocuments.js';
import { stripMarkdown } from '../utils/stripMarkdown.js';

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function emptyTracking() {
  return {
    sentOn: '',
    sendMethod: '',
    actualRecipientName: '',
    actualRecipientContact: '',
    companyReference: '',
    handledBy: '',
    followUps: []
  };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      resolve(raw.includes(',') ? raw.split(',')[1] : raw);
    };
    reader.onerror = () => reject(new Error('Lecture fichier impossible'));
    reader.readAsDataURL(file);
  });
}

export default function Applications() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const [apps, setApps] = useState([]);
  const [sel, setSel] = useState(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('draft');
  const [followUp, setFollowUp] = useState('');
  const [documents, setDocuments] = useState([]);
  const [documentName, setDocumentName] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [letterText, setLetterText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState(emptyTracking());
  const [followDraft, setFollowDraft] = useState({ date: '', note: '' });

  const load = async () => {
    const { data } = await api.get('/api/applications');
    setApps(data);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  useEffect(() => {
    const onUpd = () => load().catch(() => {});
    window.addEventListener('mecal:applications-updated', onUpd);
    return () => window.removeEventListener('mecal:applications-updated', onUpd);
  }, []);

  const highlightStatus = searchParams.get('status') || '';

  // Coming from the global search: open that application once the list is loaded.
  const focusId = searchParams.get('id');
  const openedFromLink = useRef(null);
  useEffect(() => {
    if (!focusId || !apps.length || openedFromLink.current === focusId) return;
    const app = apps.find((a) => String(a._id) === focusId);
    if (app) {
      openedFromLink.current = focusId;
      open(app);
    }
  }, [focusId, apps]);

  const counters = useMemo(() => {
    const by = { draft: 0, submitted: 0, pending: 0, won: 0, rejected: 0 };
    for (const a of apps) {
      if (a.status === 'interview') by.pending += 1;
      else if (by[a.status] != null) by[a.status] += 1;
    }
    return by;
  }, [apps]);

  const open = (app) => {
    const rawDocs = app.documents || [];
    const hadLocal = rawDocs.some((d) => isLocalFileUrl(d.url));
    const cleanDocs = sanitizeDocuments(rawDocs);

    setSel(app);
    setNotes(app.notes || '');
    setStatus(app.status);
    setFollowUp(app.followUpDate ? app.followUpDate.slice(0, 10) : '');
    setDocuments(cleanDocs);
    setDocumentName('');
    setDocumentUrl('');
    setLetterText(stripMarkdown(app.letterText || ''));
    setRejectionReason(app.rejectionReason || '');
    setTracking({
      sentOn: toDateInput(app.sentOn || app.appliedDate),
      sendMethod: app.sendMethod || '',
      actualRecipientName: app.actualRecipientName || app.contactPerson?.name || '',
      actualRecipientContact: app.actualRecipientContact || app.contactPerson?.email || '',
      companyReference: app.companyReference || '',
      handledBy: app.handledBy || '',
      followUps: Array.isArray(app.followUps) ? app.followUps : []
    });
    setFollowDraft({ date: '', note: '' });

    if (hadLocal) {
      toast(
        'Les chemins locaux (file://) ont été retirés. Utilisez « Importer un PDF » pour joindre vos fichiers.',
        { icon: '⚠️', duration: 4000 }
      );
    }
  };

  const statusLabels = {
    pending: 'En attente',
    interview: 'En cours',
    submitted: 'Soumis',
    won: 'Accepté',
    rejected: 'Rejeté',
    draft: 'Brouillon'
  };

  const onStatusDrop = async (id, status) => {
    const current = apps.find((a) => a._id === id);
    if (!current || current.status === status) return;
    setApps((list) => list.map((a) => (a._id === id ? { ...a, status } : a)));
    try {
      await api.patch(`/api/applications/${id}`, { status });
      toast.success(t('applications.statusUpdated', { status: t(`applications.${status}`) }));
    } catch (e) {
      toast.error(e.response?.data?.message || t('applications.statusError'));
      load();
    }
  };

  const save = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      const cleanDocs = sanitizeDocuments(documents);
      const sentOn = tracking.sentOn || null;
      await api.patch(`/api/applications/${sel._id}`, {
        notes,
        status,
        followUpDate: followUp || null,
        documents: cleanDocs,
        letterText: stripMarkdown(letterText),
        rejectionReason,
        sentOn,
        appliedDate: sentOn || sel.appliedDate || null,
        sendMethod: tracking.sendMethod || undefined,
        actualRecipientName: tracking.actualRecipientName,
        actualRecipientContact: tracking.actualRecipientContact,
        companyReference: tracking.companyReference,
        handledBy: tracking.handledBy,
        followUps: tracking.followUps,
        contactPerson: {
          name: tracking.actualRecipientName || sel.contactPerson?.name || '',
          email: tracking.actualRecipientContact?.includes('@')
            ? tracking.actualRecipientContact
            : sel.contactPerson?.email || '',
          phone: sel.contactPerson?.phone || ''
        }
      });
      toast.success(`Candidature enregistrée, Statut : ${statusLabels[status] || status}`, {
        duration: 2500
      });
      setSel(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  const addDocument = () => {
    if (!documentName.trim() || !documentUrl.trim()) return;
    if (isLocalFileUrl(documentUrl)) return;
    setDocuments((current) => [
      ...current,
      { name: documentName.trim(), url: documentUrl.trim() }
    ]);
    setDocumentName('');
    setDocumentUrl('');
  };

  const uploadDocument = async (file) => {
    if (!sel) return;
    try {
      const fileBase64 = await fileToBase64(file);
      const { data } = await api.post(`/api/applications/${sel._id}/documents/upload`, {
        fileName: file.name,
        fileBase64,
        mimeType: file.type || 'application/pdf'
      });
      setDocuments(data.application?.documents || []);
      toast.success('Document importé sur le serveur M-ECAL', { duration: 2500 });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Import impossible');
      throw e;
    }
  };

  const decided = counters.won + counters.rejected;
  const successRate = decided ? Math.round((counters.won / decided) * 100) : null;
  const stages = [
    { key: 'draft', dot: 'bg-slate-400' },
    { key: 'submitted', dot: 'bg-[#24478a]' },
    { key: 'pending', dot: 'bg-amber-500' },
    { key: 'won', dot: 'bg-emerald-500' },
    { key: 'rejected', dot: 'bg-rose-500' }
  ];

  return (
    <div className="page-shell space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-[#24478a] text-white shadow-sm">
              <ClipboardList className="h-6 w-6" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl dark:text-white">
                {t('applications.title')}
              </h1>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {t('applications.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-none divide-x divide-slate-200 overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200 dark:divide-slate-700 dark:bg-slate-800/60 dark:ring-slate-700">
            <div className="px-6 py-3.5">
              <p className="text-4xl font-extrabold leading-none tabular-nums text-slate-900 dark:text-white">{apps.length}</p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('applications.kpi.total')}
              </p>
            </div>
            <div className="px-6 py-3.5">
              <p className="text-4xl font-extrabold leading-none tabular-nums text-emerald-600 dark:text-emerald-400">
                {successRate == null ? 'n/d' : `${successRate} %`}
              </p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {t('applications.successRate')}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {decided ? t('applications.successRateHint', { count: decided }) : t('applications.noDecision')}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{t('applications.pipelineTitle')}</p>
          <div
            className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="img"
            aria-label={t('applications.pipelineTitle')}
          >
            {apps.length
              ? stages.map(({ key, dot }) =>
                  counters[key] ? (
                    <span
                      key={key}
                      className={`${dot} first:rounded-l-full last:rounded-r-full`}
                      style={{ width: `${(counters[key] / apps.length) * 100}%` }}
                    />
                  ) : null
                )
              : null}
          </div>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
            {stages.map(({ key, dot }) => (
              <li key={key} className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 flex-none rounded-sm ${dot}`} aria-hidden="true" />
                <span className="whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{t(`applications.kpi.${key}`)}</span>
                <span className="ml-auto text-sm font-bold tabular-nums text-slate-900 dark:text-white">{counters[key]}</span>
                <span className="w-10 text-right text-xs tabular-nums text-slate-400">
                  {apps.length ? `${Math.round((counters[key] / apps.length) * 100)} %` : '0 %'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="flex items-center gap-2 px-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        <GripVertical className="h-4 w-4 flex-none text-slate-400" aria-hidden="true" />
        {t('applications.dragHint')}
      </p>
      <ApplicationList
        apps={apps}
        onSelect={open}
        onStatusDrop={onStatusDrop}
        highlightStatus={highlightStatus}
      />

      {sel ? (
        <ApplicationDetailModal
          application={sel}
          notes={notes}
          status={status}
          followUp={followUp}
          documents={documents}
          documentName={documentName}
          documentUrl={documentUrl}
          rejectionReason={rejectionReason}
          letterText={letterText}
          tracking={tracking}
          followDraft={followDraft}
          saving={saving}
          onClose={() => setSel(null)}
          onNotesChange={setNotes}
          onStatusChange={setStatus}
          onFollowUpChange={setFollowUp}
          onTrackingChange={setTracking}
          onFollowDraftChange={setFollowDraft}
          onAddFollowUp={() => {
            if (!followDraft.date && !followDraft.note.trim()) return;
            setTracking((cur) => ({
              ...cur,
              followUps: [
                ...(cur.followUps || []),
                { date: followDraft.date || new Date().toISOString().slice(0, 10), note: followDraft.note.trim() }
              ]
            }));
            if (followDraft.date) setFollowUp(followDraft.date);
            setFollowDraft({ date: '', note: '' });
          }}
          onDocumentNameChange={setDocumentName}
          onDocumentUrlChange={setDocumentUrl}
          onAddDocument={addDocument}
          onUploadDocument={uploadDocument}
          onDocumentsChange={setDocuments}
          onRejectionReasonChange={setRejectionReason}
          onLetterChange={setLetterText}
          onApplicationRefresh={(app) => {
            if (!app) return;
            setSel(app);
            setStatus(app.status || status);
            setDocuments(sanitizeDocuments(app.documents || []));
            setLetterText(app.letterText || letterText);
            load();
          }}
          onRemoveDocument={(i) => setDocuments((current) => current.filter((_, idx) => idx !== i))}
          onSave={save}
        />
      ) : null}
    </div>
  );
}
