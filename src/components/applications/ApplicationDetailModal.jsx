import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Paperclip,
  Plus,
  Save,
  Send,
  Tag,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import {
  isLocalFileUrl,
  openOrDownloadDocument
} from '../../utils/applicationDocuments.js';
import { deadlineUrgency, urgencyBadgeClass } from '../../utils/opportunityUrgency.js';
import { stripMarkdown } from '../../utils/stripMarkdown.js';

const STATUS_CONFIG = {
  pending: {
    badge: 'bg-amber-500 text-white shadow-sm'
  },
  interview: {
    badge: 'bg-blue-500 text-white shadow-sm'
  },
  submitted: {
    badge: 'bg-blue-600 text-white shadow-sm'
  },
  won: {
    badge: 'bg-emerald-600 text-white shadow-sm'
  },
  rejected: {
    badge: 'bg-rose-600 text-white shadow-sm'
  },
  draft: {
    badge: 'bg-slate-500 text-white shadow-sm'
  }
};

const STATUSES = ['draft', 'submitted', 'pending', 'won', 'rejected'];

const inputCls =
  'w-full rounded-lg border border-slate-200/80 bg-white px-3 py-[9px] text-sm text-slate-800 transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600/80 dark:bg-slate-900/50 dark:text-slate-100';

function formatDate(value) {
  if (!value) return 'n/d';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'n/d';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return 'n/d';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'n/d';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function fileKind(name = '') {
  const n = String(name).toLowerCase();
  if (n.endsWith('.pdf')) return 'PDF';
  if (n.endsWith('.docx') || n.endsWith('.doc')) return 'DOC';
  return 'FILE';
}

function statusLabel(status, t) {
  return t(`applications.${status}`) || status;
}

export default function ApplicationDetailModal({
  application,
  notes,
  status,
  followUp,
  documents,
  documentName,
  documentUrl,
  rejectionReason,
  letterText,
  tracking = {},
  followDraft = { date: '', note: '' },
  saving,
  onClose,
  onNotesChange,
  onStatusChange,
  onFollowUpChange,
  onTrackingChange,
  onFollowDraftChange,
  onAddFollowUp,
  onDocumentNameChange,
  onDocumentUrlChange,
  onAddDocument,
  onRemoveDocument,
  onUploadDocument,
  onDocumentsChange,
  onRejectionReasonChange,
  onLetterChange,
  onApplicationRefresh,
  onSave
}) {
  const { t } = useI18n();
  const [docError, setDocError] = useState('');
  const [downloadingIdx, setDownloadingIdx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [attachingCv, setAttachingCv] = useState(false);
  const [cvMeta, setCvMeta] = useState(null);
  const [generatingLetter, setGeneratingLetter] = useState(false);
  const [view, setView] = useState('edit');
  const [showSentCopy, setShowSentCopy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const opp = application?.opportunity || {};
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const location = opp.ville || opp.city || 'RDC';
  const category = opp.category || opp.platform || 'Logistique';
  const urgency = deadlineUrgency(opp.deadline);
  const notesLen = String(notes || '').length;
  const canSend = status === 'draft' && Boolean(String(letterText || '').trim());

  useEffect(() => {
    api
      .get('/api/job-assistant/profile')
      .then(({ data }) => setCvMeta(data?.cv || null))
      .catch(() => setCvMeta(null));
  }, []);

  const handleAddDocument = () => {
    if (!documentName.trim() || !documentUrl.trim()) {
      setDocError('Veuillez remplir le nom et l’URL du document.');
      return;
    }
    if (isLocalFileUrl(documentUrl)) {
      setDocError('Les chemins locaux (file://) ne fonctionnent pas. Utilisez Importer.');
      return;
    }
    setDocError('');
    onAddDocument();
    toast.success('Document ajouté');
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadDocument) return;
    setUploading(true);
    try {
      await onUploadDocument(file);
    } finally {
      setUploading(false);
    }
  };

  const attachImportedCv = async () => {
    setAttachingCv(true);
    try {
      const { data } = await api.post(`/api/applications/${application._id}/attach-cv`);
      onDocumentsChange?.(data.application?.documents || []);
      onApplicationRefresh?.(data.application);
      toast.success(
        data.alreadyAttached ? t('applications.cvAlreadyAttached') : t('applications.cvAttached')
      );
    } catch (e) {
      toast.error(e.response?.data?.message || t('applications.cvAttachError'));
    } finally {
      setAttachingCv(false);
    }
  };

  const generateLetter = async () => {
    if (!opp._id) return;
    setGeneratingLetter(true);
    try {
      const { data } = await api.post(`/api/ai/opportunities/${opp._id}/letter`);
      const letter = stripMarkdown(data.letter || '');
      onLetterChange?.(letter);
      await api.patch(`/api/applications/${application._id}`, { letterText: letter });
      toast.success(t('applications.letterGenerated'));
    } catch (e) {
      toast.error(e.response?.data?.message || t('opportunities.aiGenerateError'));
    } finally {
      setGeneratingLetter(false);
    }
  };

  const openSendPreview = async () => {
    setPreviewLoading(true);
    setView('preview');
    try {
      const { data } = await api.post('/api/applications/preview-email', {
        applicationId: application._id,
        opportunityId: opp._id,
        letterOverride: letterText
      });
      setPreview(data);
      setTo(data.to || '');
      setSubject(data.subject || '');
      setBody(stripMarkdown(letterText || data.body || ''));
    } catch (e) {
      toast.error(e.response?.data?.message || t('opportunities.aiGenerateError'));
      setView('edit');
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmSend = async () => {
    if (!to.includes('@') || !body.trim()) {
      toast.error(t('applications.emailNoContact'));
      return;
    }
    setSending(true);
    try {
      const { data } = await api.post('/api/applications/send-email', {
        applicationId: application._id,
        opportunityId: opp._id,
        confirmed: true,
        to,
        subject,
        body
      });
      toast.success(t('applications.sentOk'));
      onApplicationRefresh?.(data.application);
      onStatusChange?.('submitted');
      onLetterChange?.(body);
      setView('edit');
    } catch (e) {
      toast.error(e.response?.data?.message || t('applications.sendFailed'));
      onStatusChange?.('draft');
    } finally {
      setSending(false);
    }
  };

  const previewCanSend =
    Boolean(to.includes('@')) &&
    Boolean(body.trim()) &&
    preview?.hasCv &&
    preview?.gmailConnected &&
    !sending;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0e1c33]/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving && !sending) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex-shrink-0 bg-[#24478a] px-5 py-4 text-white">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <span className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${cfg.badge}`}>
                {statusLabel(status, t)}
              </span>
              <h2 className="line-clamp-2 text-lg font-bold leading-snug">{opp.title || 'Candidature'}</h2>
              {opp.organization ? <p className="mt-1 text-sm text-blue-100/90">{opp.organization}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              title="Fermer"
              className="mecal-x-pop group relative grid h-9 w-9 flex-none place-items-center rounded-full bg-red-500 text-white shadow-lg shadow-red-950/30 ring-2 ring-white/80 transition duration-300 hover:rotate-90 hover:scale-110 hover:bg-red-600 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-95"
            >
              <span className="absolute inset-0 rounded-full bg-red-400 opacity-0 group-hover:animate-ping" aria-hidden="true" />
              <X className="relative h-[18px] w-[18px]" strokeWidth={2.6} />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-blue-100">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Tag className="h-3 w-3" /> {category}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {t('opportunities.deadline')}: {formatDate(opp.deadline)}
            </span>
            {urgency.level !== 'none' ? (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${urgencyBadgeClass(urgency.level)}`}>
                {urgency.level === 'passed'
                  ? t('opportunities.deadlinePassed')
                  : urgency.level === 'critical'
                    ? t('opportunities.daysLeft', { count: urgency.days })
                    : urgency.level === 'soon'
                      ? t('opportunities.closingSoon', { count: urgency.days })
                      : t('opportunities.daysLeft', { count: urgency.days })}
              </span>
            ) : null}
          </div>
          {opp._id ? (
            <Link
              to={`/opportunities?id=${opp._id}`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white underline-offset-2 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t('applications.openOffer')}
            </Link>
          ) : null}
        </div>

        {view === 'preview' ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-white">
                {t('applications.emailPreviewTitle')}
              </p>
              {previewLoading ? (
                <p className="text-sm text-slate-500">{t('common.loading')}</p>
              ) : (
                <>
                  {!preview?.to ? (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">{t('applications.emailNoContact')}</p>
                  ) : null}
                  {!preview?.hasCv ? (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{t('applications.emailNoCv')}</p>
                  ) : null}
                  {!preview?.gmailConnected ? (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">{t('applications.emailGmailOff')}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Gmail : {preview.gmailUser}</p>
                  )}
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    {t('applications.emailTo')}
                    <input value={to} onChange={(e) => setTo(e.target.value)} className={`${inputCls} mt-1`} />
                  </label>
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    {t('applications.emailSubject')}
                    <input value={subject} onChange={(e) => setSubject(e.target.value)} className={`${inputCls} mt-1`} />
                  </label>
                  <p className="text-xs text-slate-500">
                    {t('applications.emailAttachment')}: <strong>{preview?.attachmentName || 'n/d'}</strong>
                  </p>
                  <label className="block text-xs font-semibold uppercase text-slate-500">
                    {t('applications.emailBody')}
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      rows={12}
                      className={`${inputCls} mt-1 resize-y font-sans leading-relaxed`}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="flex justify-between gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setView('edit')}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm dark:border-slate-600"
              >
                {t('applications.backToEdit')}
              </button>
              <button
                type="button"
                disabled={!previewCanSend}
                onClick={confirmSend}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? t('applications.sending') : t('applications.confirmSend')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="modal-scroll flex-1 space-y-5 overflow-y-auto px-5 py-4">
              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('applications.groupSending')}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t('applicationsDetail.status')}
                    </label>
                    <select value={status} onChange={(e) => onStatusChange(e.target.value)} className={inputCls}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s, t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t('applications.sentOn')}
                    </label>
                    <input
                      type="date"
                      value={tracking.sentOn || ''}
                      onChange={(e) => onTrackingChange?.({ ...tracking, sentOn: e.target.value })}
                      className={inputCls}
                    />
                    <p className="mt-1 text-[10px] text-slate-400">{t('applications.sentOnHint')}</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t('applications.sendMethod')}
                    </label>
                    <select
                      value={tracking.sendMethod || ''}
                      onChange={(e) => onTrackingChange?.({ ...tracking, sendMethod: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">{t('applications.sendMethodPlaceholder')}</option>
                      <option value="email">{t('applications.sendMethodEmail')}</option>
                      <option value="portal">{t('applications.sendMethodPortal')}</option>
                      <option value="other">{t('applications.sendMethodOther')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t('applications.handledBy')}
                    </label>
                    <input
                      value={tracking.handledBy || ''}
                      onChange={(e) => onTrackingChange?.({ ...tracking, handledBy: e.target.value })}
                      placeholder={t('applications.handledByPlaceholder')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t('applications.actualRecipientName')}
                    </label>
                    <input
                      value={tracking.actualRecipientName || ''}
                      onChange={(e) => onTrackingChange?.({ ...tracking, actualRecipientName: e.target.value })}
                      placeholder={t('applications.actualRecipientNamePlaceholder')}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t('applications.actualRecipientContact')}
                    </label>
                    <input
                      value={tracking.actualRecipientContact || ''}
                      onChange={(e) => onTrackingChange?.({ ...tracking, actualRecipientContact: e.target.value })}
                      placeholder={t('applications.actualRecipientContactPlaceholder')}
                      className={inputCls}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {t('applications.companyReference')}
                    </label>
                    <input
                      value={tracking.companyReference || ''}
                      onChange={(e) => onTrackingChange?.({ ...tracking, companyReference: e.target.value })}
                      placeholder={t('applications.companyReferencePlaceholder')}
                      className={inputCls}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('applications.groupFollowUp')}
                </h3>
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      {t('applications.notes')}
                    </label>
                    <span className="text-[10px] text-slate-400">{notesLen}</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                    rows={3}
                    placeholder={t('applications.notesPlaceholder')}
                    className={`${inputCls} resize-none`}
                  />
                </div>
                <div className="mt-4">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('applications.followUp')}
                  </label>
                  <input type="date" value={followUp} onChange={(e) => onFollowUpChange(e.target.value)} className={inputCls} />
                  <p className="mt-1 text-[10px] text-slate-400">{t('applications.nextFollowUpHint')}</p>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('applications.followUpLog')}
                  </p>
                  {(tracking.followUps || []).length === 0 ? (
                    <p className="mb-3 text-xs text-slate-400">{t('applications.followUpLogEmpty')}</p>
                  ) : (
                    <ul className="mb-3 space-y-2">
                      {(tracking.followUps || []).map((item, i) => (
                        <li
                          key={`${item.date}-${i}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800/50"
                        >
                          <p className="font-semibold text-slate-700 dark:text-slate-200">
                            {item.date ? formatDate(item.date) : 'n/d'}
                          </p>
                          {item.note ? <p className="mt-0.5 text-slate-600 dark:text-slate-300">{item.note}</p> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="date"
                      value={followDraft.date || ''}
                      onChange={(e) => onFollowDraftChange?.({ ...followDraft, date: e.target.value })}
                      className={`${inputCls} sm:w-40`}
                    />
                    <input
                      value={followDraft.note || ''}
                      onChange={(e) => onFollowDraftChange?.({ ...followDraft, note: e.target.value })}
                      placeholder={t('applications.followUpNotePlaceholder')}
                      className={`${inputCls} flex-1`}
                    />
                    <button
                      type="button"
                      onClick={onAddFollowUp}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800"
                    >
                      {t('applications.addFollowUp')}
                    </button>
                  </div>
                </div>
              </section>

              {status === 'rejected' ? (
                <div>
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('applications.rejectionReason')}
                  </label>
                  <input
                    value={rejectionReason}
                    onChange={(e) => onRejectionReasonChange(e.target.value)}
                    placeholder={t('applications.rejectionPlaceholder')}
                    className={inputCls}
                  />
                </div>
              ) : null}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Mail className="h-3.5 w-3.5" />
                    {t('applications.letterAi')}
                  </label>
                  <button
                    type="button"
                    onClick={generateLetter}
                    disabled={generatingLetter}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 disabled:opacity-50"
                  >
                    {generatingLetter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                    {generatingLetter ? t('agent.thinking') : t('applications.generateLetter')}
                  </button>
                </div>
                <textarea
                  value={letterText}
                  onChange={(e) => onLetterChange(e.target.value)}
                  rows={8}
                  placeholder={t('applications.letterPlaceholder')}
                  className={`${inputCls} resize-y font-sans leading-relaxed`}
                />
              </div>

              <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t('applications.groupDocuments')}
                </h3>
                <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Paperclip className="h-3.5 w-3.5" />
                  {t('applications.attachments')}
                  <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{documents.length}</span>
                </label>
                {documents.length === 0 ? (
                  <p className="mb-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                    {t('applications.noDocuments')}
                  </p>
                ) : (
                  <ul className="mb-3 space-y-2">
                    {documents.map((doc, i) => (
                      <li
                        key={`${doc.name}-${i}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50"
                      >
                        <span className="rounded bg-[#15294a] px-1.5 py-0.5 text-[9px] font-bold text-white">
                          {fileKind(doc.name)}
                        </span>
                        <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">{doc.name}</p>
                        {(doc.url || doc.documentId) && !isLocalFileUrl(doc.url) ? (
                          <button
                            type="button"
                            disabled={downloadingIdx === i}
                            onClick={async () => {
                              setDownloadingIdx(i);
                              try {
                                await openOrDownloadDocument(doc);
                              } catch {
                                toast.error('Téléchargement impossible');
                              } finally {
                                setDownloadingIdx(null);
                              }
                            }}
                            className="rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onRemoveDocument(i)}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {cvMeta?.fileName ? (
                  <button
                    type="button"
                    onClick={attachImportedCv}
                    disabled={attachingCv}
                    className="mb-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 disabled:opacity-50"
                  >
                    {attachingCv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
                    {t('applications.attachImportedCv', { name: cvMeta.fileName })}
                  </button>
                ) : (
                  <p className="mb-3 text-[11px] text-slate-400">{t('applications.noImportedCv')}</p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    placeholder={t('applicationsDetail.docName')}
                    value={documentName}
                    onChange={(e) => {
                      setDocError('');
                      onDocumentNameChange(e.target.value);
                    }}
                    className={`${inputCls} sm:flex-1`}
                  />
                  <input
                    placeholder="URL"
                    value={documentUrl}
                    onChange={(e) => {
                      setDocError('');
                      onDocumentUrlChange(e.target.value);
                    }}
                    className={`${inputCls} sm:flex-1`}
                  />
                  <button type="button" onClick={handleAddDocument} className="flex h-[38px] items-center justify-center rounded-lg bg-blue-600 px-3 text-white sm:w-10">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {docError ? <p className="mt-1.5 text-xs text-rose-600">{docError}</p> : null}
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-3 py-2 text-xs font-medium text-blue-800">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? t('applicationsDetail.importing') : t('applicationsDetail.importPdf')}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" disabled={uploading} onChange={handleFileUpload} />
                </label>
              </section>

              {application?.sentEmail?.body ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3">
                  <button
                    type="button"
                    onClick={() => setShowSentCopy((v) => !v)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-800"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t('applications.viewSentEmail')}
                    {application.sentEmail.sentAt ? ` · ${formatDateTime(application.sentEmail.sentAt)}` : ''}
                  </button>
                  {showSentCopy ? (
                    <div className="mt-2 space-y-1 text-xs text-slate-700">
                      <p>
                        {t('applications.emailTo')}: <strong>{application.sentEmail.to}</strong>
                      </p>
                      <p>
                        {t('applications.emailSubject')}: {application.sentEmail.subject}
                      </p>
                      <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-2">{application.sentEmail.body}</pre>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60">
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5" />
                {application?.appliedDate || tracking.sentOn
                  ? `${t('applications.sentAt')} ${formatDateTime(tracking.sentOn || application.appliedDate)}`
                  : t('applications.draftHint')}
                {application?.updatedAt ? ` · ${t('applicationsDetail.lastModified')} ${formatDateTime(application.updatedAt)}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600">
                  {t('common.close')}
                </button>
                {canSend ? (
                  <button
                    type="button"
                    onClick={openSendPreview}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {t('applications.sendApplication')}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={saving}
                  onClick={onSave}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? t('applications.saving') : t('applications.save')}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
