import { api } from '../api/client.js';
import { downloadJobDocument } from './downloadJobDocument.js';

export function isLocalFileUrl(url = '') {
  return /^file:\/\//i.test(String(url).trim());
}

export function isHttpUrl(url = '') {
  return /^https?:\/\//i.test(String(url).trim());
}

export function isAppDocumentApiUrl(url = '') {
  return /\/api\/applications\/documents\/file\//i.test(String(url));
}

export function isJobAssistantDocUrl(url = '') {
  return /\/api\/job-assistant\/documents\/[^/]+\/download/i.test(String(url));
}

export function extractJobAssistantDocumentId(doc = {}) {
  if (doc.documentId) return doc.documentId;
  const m = String(doc.url || '').match(/\/api\/job-assistant\/documents\/([^/]+)\/download/i);
  return m?.[1] || null;
}

export function sanitizeDocuments(documents = []) {
  return documents
    .map((d) => ({
      name: d.name?.trim() || 'Document',
      url: isLocalFileUrl(d.url) ? '' : (d.url || '').trim(),
      documentId: d.documentId || extractJobAssistantDocumentId(d) || undefined,
      storageKey: d.storageKey || undefined
    }))
    .filter((d) => Boolean(d.name?.trim()));
}

export async function downloadApplicationFile(url, fileName = 'document.pdf') {
  const path = url.startsWith('/api/') ? url : `/api${url.replace(/^\/api/, '')}`;
  const { data } = await api.get(path, { responseType: 'blob' });
  const blob = data instanceof Blob ? data : new Blob([data]);
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function openOrDownloadDocument(doc = {}) {
  const jobId = extractJobAssistantDocumentId(doc);
  if (jobId) {
    await downloadJobDocument(jobId, doc.name || 'document-mecal.pdf');
    return;
  }
  if (isAppDocumentApiUrl(doc.url)) {
    await downloadApplicationFile(doc.url, doc.name || 'document.pdf');
    return;
  }
  if (isHttpUrl(doc.url)) {
    window.open(doc.url, '_blank', 'noopener,noreferrer');
    return;
  }
  throw new Error('Document non accessible');
}
