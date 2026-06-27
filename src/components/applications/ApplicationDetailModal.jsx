import { useState } from 'react';
import {
  Calendar,
  Clock,
  Download,
  FileText,
  MapPin,
  Paperclip,
  Plus,
  Save,
  Tag,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '../../context/I18nContext.jsx';
import {
  isLocalFileUrl,
  openOrDownloadDocument
} from '../../utils/applicationDocuments.js';

const STATUS_CONFIG = {
  pending: {
    label: 'En attente',
    dot: 'bg-amber-400',
    badge: 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200'
  },
  interview: {
    label: 'En cours',
    dot: 'bg-blue-500',
    badge: 'border-blue-200/80 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-200'
  },
  submitted: {
    label: 'Soumis',
    dot: 'bg-blue-500',
    badge: 'border-blue-200/80 bg-blue-50 text-blue-800 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-200'
  },
  won: {
    label: 'Accepté',
    dot: 'bg-emerald-500',
    badge: 'border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200'
  },
  rejected: {
    label: 'Rejeté',
    dot: 'bg-red-500',
    badge: 'border-red-200/80 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200'
  },
  draft: {
    label: 'Brouillon',
    dot: 'bg-slate-400',
    badge: 'border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'
  }
};

const STATUSES = ['pending', 'interview', 'submitted', 'won', 'rejected', 'draft'];

const inputCls =
  'w-full rounded-lg border border-slate-200/80 bg-slate-50/80 px-3 py-[9px] text-sm text-slate-800 transition-all duration-200 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600/80 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:bg-slate-900';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatRelativeModified(value) {
  if (!value) return "aujourd'hui";
  const d = new Date(value);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays <= 0) return "aujourd'hui";
  if (diffDays === 1) return 'hier';
  return `le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
}

function truncateUrl(url = '', max = 36) {
  if (!url) return '—';
  return url.length > max ? `${url.slice(0, max)}…` : url;
}

function statusLabel(status, t) {
  return t(`applications.${status}`) || STATUS_CONFIG[status]?.label || status;
}

export default function ApplicationDetailModal({
  application,
  notes,
  status,
  followUp,
  documents,
  documentName,
  documentUrl,
  onClose,
  onNotesChange,
  onStatusChange,
  onFollowUpChange,
  onDocumentNameChange,
  onDocumentUrlChange,
  onAddDocument,
  onRemoveDocument,
  onUploadDocument,
  onSave
}) {
  const { t } = useI18n();
  const [docError, setDocError] = useState(false);
  const [docErrorMsg, setDocErrorMsg] = useState('');
  const [downloadingIdx, setDownloadingIdx] = useState(null);
  const [uploading, setUploading] = useState(false);

  const opp = application?.opportunity || {};
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  const publishDate = formatDate(opp.scrapedAt || opp.createdAt);
  const location = opp.ville || opp.city || 'RDC';
  const category = opp.category || opp.platform || 'Logistique';
  const lastModified = formatRelativeModified(application?.updatedAt || application?.createdAt);

  const handleAddDocument = () => {
    if (!documentName.trim() || !documentUrl.trim()) {
      setDocError(true);
      setDocErrorMsg('Veuillez remplir le nom et l\'URL du document.');
      return;
    }
    if (isLocalFileUrl(documentUrl)) {
      setDocError(true);
      setDocErrorMsg(
        'Les chemins locaux (file://) ne fonctionnent pas dans le navigateur. Utilisez « Importer un PDF » ci-dessous.'
      );
      return;
    }
    setDocError(false);
    setDocErrorMsg('');
    onAddDocument();
    toast.success('Document ajouté', { duration: 2500 });
  };

  const handleDownloadDocument = async (doc, index) => {
    if (isLocalFileUrl(doc.url)) {
      toast.error('Chemin local — importez le fichier PDF via le bouton ci-dessous.');
      return;
    }
    setDownloadingIdx(index);
    try {
      await openOrDownloadDocument(doc);
    } catch {
      toast.error('Téléchargement impossible');
    } finally {
      setDownloadingIdx(null);
    }
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

  const handleRemoveDocument = (index) => {
    onRemoveDocument(index);
    toast.success('Document supprimé', { duration: 2500 });
  };

  const handleSave = () => {
    onSave();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700/80 dark:bg-slate-800">
        {/* En-tête */}
        <div className="flex-shrink-0 px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <span
                className={`mb-2.5 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.badge}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {statusLabel(status, t)}
              </span>
              <h2 className="line-clamp-2 text-base font-bold leading-snug text-slate-900 dark:text-white">
                {opp.title || 'Candidature'}
              </h2>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {location}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 flex-shrink-0" />
                  {publishDate}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Tag className="h-3 w-3 flex-shrink-0" />
                  {category}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200/80 text-slate-400 transition-colors duration-200 hover:border-slate-300 hover:text-slate-600 dark:border-slate-600 dark:hover:text-slate-200"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 h-px bg-slate-100 dark:bg-slate-700/80" />
        </div>

        {/* Corps */}
        <div className="modal-scroll flex-1 space-y-5 overflow-y-auto px-5 pb-2">
          {/* Notes */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <FileText className="h-3.5 w-3.5" />
              Notes internes
            </label>
            <textarea
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              rows={3}
              placeholder="Ajoutez vos notes sur cette candidature…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Statut + Relance */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Statut
              </label>
              <select
                value={status}
                onChange={(e) => onStatusChange(e.target.value)}
                className={inputCls}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s, t)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Date de relance
              </label>
              <input
                type="date"
                value={followUp}
                onChange={(e) => onFollowUpChange(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Documents */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Paperclip className="h-3.5 w-3.5" />
              Documents joints
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {documents.length}
              </span>
            </label>

            {documents.length > 0 ? (
              <ul className="mb-3 space-y-2">
                {documents.map((doc, i) => (
                  <li
                    key={`${doc.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/60 px-3 py-2 dark:border-slate-600/60 dark:bg-slate-900/40"
                  >
                    <FileText className="h-4 w-4 flex-shrink-0 text-blue-500" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                        {doc.name}
                      </p>
                      {isLocalFileUrl(doc.url) ? (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          Chemin local — cliquez Télécharger ou réimportez le PDF
                        </p>
                      ) : doc.url || doc.documentId ? (
                        <p
                          className="truncate text-[11px] text-slate-500 dark:text-slate-400"
                          title={doc.url}
                        >
                          {truncateUrl(doc.url || 'Document M-ECAL')}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">—</p>
                      )}
                    </div>
                    {(doc.url || doc.documentId) && !isLocalFileUrl(doc.url) ? (
                      <button
                        type="button"
                        disabled={downloadingIdx === i}
                        onClick={() => handleDownloadDocument(doc, i)}
                        className="flex-shrink-0 rounded-md p-1.5 text-blue-600 transition-colors duration-200 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40"
                        title="Télécharger / ouvrir"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(i)}
                      className="flex-shrink-0 rounded-md p-1.5 text-slate-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      aria-label="Supprimer le document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <input
                placeholder="Nom du document"
                value={documentName}
                onChange={(e) => {
                  setDocError(false);
                  setDocErrorMsg('');
                  onDocumentNameChange(e.target.value);
                }}
                className={`${inputCls} sm:flex-1`}
              />
              <input
                placeholder="URL"
                value={documentUrl}
                onChange={(e) => {
                  setDocError(false);
                  setDocErrorMsg('');
                  onDocumentUrlChange(e.target.value);
                }}
                className={`${inputCls} sm:flex-1`}
              />
              <button
                type="button"
                onClick={handleAddDocument}
                className="flex h-[38px] w-full flex-shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white transition-colors duration-200 hover:bg-blue-700 sm:w-10"
                aria-label="Ajouter un document"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {docError ? (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                {docErrorMsg || 'Veuillez remplir le nom et l\'URL du document.'}
              </p>
            ) : null}

            <div className="mt-3 flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-blue-300/80 bg-blue-50/50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors duration-200 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 dark:text-blue-300">
                <Upload className="h-3.5 w-3.5" />
                {uploading ? 'Import…' : 'Importer un PDF'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>
              <span className="text-[11px] text-slate-400">
                Recommandé — évite les chemins locaux file://
              </span>
            </div>
          </div>
        </div>

        {/* Pied */}
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/50">
          <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Clock className="h-3.5 w-3.5 flex-shrink-0" />
            Dernière modif. {lastModified}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200/80 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors duration-200 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-blue-700"
            >
              <Save className="h-3.5 w-3.5" />
              {t('applications.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
