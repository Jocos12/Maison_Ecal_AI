import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import ApplicationList from '../components/applications/ApplicationList.jsx';
import ApplicationDetailModal from '../components/applications/ApplicationDetailModal.jsx';
import toast from 'react-hot-toast';
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
      toast.success(`Candidature enregistrée — Statut : ${statusLabels[status] || status}`, {
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

  return (
    <div className="page-shell space-y-6">
      <section className="mecal-hero-dashboard relative overflow-hidden rounded-3xl px-6 py-7 text-white shadow-xl md:px-8">
        <div className="pointer-events-none absolute -right-16 top-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <h1 className="mecal-title-shine text-2xl font-bold tracking-tight md:text-3xl">
          {t('applications.title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-100/90">{t('applications.subtitle')}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
            {t('applications.counterTotal', { count: apps.length })}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
            {t('applications.counterDraft', { count: counters.draft })}
          </span>
          <span className="rounded-full bg-white/15 px-3 py-1 font-semibold">
            {t('applications.counterSubmitted', { count: counters.submitted })}
          </span>
          <span className="rounded-full bg-amber-400/90 px-3 py-1 font-bold text-slate-900">
            {t('applications.counterPending', { count: counters.pending })}
          </span>
          <span className="rounded-full bg-emerald-500/90 px-3 py-1 font-bold text-white">
            {t('applications.counterWon', { count: counters.won })}
          </span>
          <span className="rounded-full bg-rose-500/90 px-3 py-1 font-bold text-white">
            {t('applications.counterRejected', { count: counters.rejected })}
          </span>
        </div>
      </section>
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
