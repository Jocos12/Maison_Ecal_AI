/**
 * Prépare l'envoi d'un CV vers l'API backend (extraction PDF/DOCX côté serveur).
 */

const MAX_BYTES = 5 * 1024 * 1024;

function guessMime(name = '') {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.txt')) return 'text/plain';
  return 'application/octet-stream';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || '');
      const base64 = raw.includes(',') ? raw.split(',')[1] : raw;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Encodage du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

async function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Lecture du fichier texte impossible'));
    reader.readAsText(file);
  });
}

export const CV_ACCEPT = '.pdf,.docx,.txt';

export async function prepareCvUploadPayload(file) {
  if (!file) throw new Error('Aucun fichier sélectionné');
  if (file.size > MAX_BYTES) {
    throw new Error('CV trop volumineux (maximum 5 Mo).');
  }

  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  const fileBase64 = await fileToBase64(file);
  const payload = {
    fileName: file.name,
    fileBase64,
    mimeType: type || guessMime(name),
    replaceExisting: true
  };

  if (type === 'text/plain' || name.endsWith('.txt')) {
    payload.cvText = await readTextFile(file);
  }

  return payload;
}
