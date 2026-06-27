import { api } from '../api/client.js';

export async function downloadJobDocument(documentId, fileName = 'document-mecal.pdf') {
  if (!documentId) throw new Error('Document introuvable');

  const { data } = await api.get(`/api/job-assistant/documents/${documentId}/download`, {
    responseType: 'blob'
  });

  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
