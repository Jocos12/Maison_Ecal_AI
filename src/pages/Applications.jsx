import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useI18n } from '../context/I18nContext.jsx';
import ApplicationList from '../components/applications/ApplicationList.jsx';
import ApplicationDetailModal from '../components/applications/ApplicationDetailModal.jsx';
import toast from 'react-hot-toast';
import { isLocalFileUrl, sanitizeDocuments } from '../utils/applicationDocuments.js';

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

  const save = async () => {
    if (!sel) return;
    try {
      const cleanDocs = sanitizeDocuments(documents);
      await api.patch(`/api/applications/${sel._id}`, {
        notes,
        status,
        followUpDate: followUp || null,
        documents: cleanDocs
      });
      toast.success(`Candidature enregistrée — Statut : ${statusLabels[status] || status}`, {
        duration: 2500
      });
      setSel(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Erreur');
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-950 dark:text-white">{t('applications.title')}</h1>
      <ApplicationList apps={apps} onSelect={open} />

      {sel ? (
        <ApplicationDetailModal
          application={sel}
          notes={notes}
          status={status}
          followUp={followUp}
          documents={documents}
          documentName={documentName}
          documentUrl={documentUrl}
          onClose={() => setSel(null)}
          onNotesChange={setNotes}
          onStatusChange={setStatus}
          onFollowUpChange={setFollowUp}
          onDocumentNameChange={setDocumentName}
          onDocumentUrlChange={setDocumentUrl}
          onAddDocument={addDocument}
          onUploadDocument={uploadDocument}
          onRemoveDocument={(i) => setDocuments((current) => current.filter((_, idx) => idx !== i))}
          onSave={save}
        />
      ) : null}
    </div>
  );
}
