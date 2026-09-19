const STORAGE_KEY = 'mecal_notifications';
const SNAPSHOT_KEY = 'mecal_notify_snapshot';

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 80)));
  window.dispatchEvent(new CustomEvent('mecal:notifications-updated'));
}

export function getNotifications() {
  return readAll().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function getUnreadCount() {
  return readAll().filter((n) => !n.read).length;
}

export function markAllRead() {
  writeAll(readAll().map((n) => ({ ...n, read: true })));
}

export function markRead(id) {
  writeAll(readAll().map((n) => (n.id === id ? { ...n, read: true } : n)));
}

/**
 * Add a notification, or update the one with the same id.
 * An existing notification keeps its date, and once it has been read it stays read: a later sync or poll
 * that sends it again must not bring it back into the list.
 */
export function upsertNotification(entry) {
  const list = readAll();
  const idx = list.findIndex((n) => n.id === entry.id);
  if (idx >= 0) {
    const current = list[idx];
    list[idx] = { ...current, ...entry, createdAt: current.createdAt, read: Boolean(current.read || entry.read) };
  } else {
    list.unshift({ read: false, createdAt: new Date().toISOString(), ...entry });
  }
  writeAll(list);
}

export function getNotifySnapshot() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '{}');
  } catch {
    return {};
  }
}

export function setNotifySnapshot(snapshot) {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}
