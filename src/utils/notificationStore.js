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

export function upsertNotification(entry) {
  const list = readAll();
  const idx = list.findIndex((n) => n.id === entry.id);
  const item = {
    read: false,
    createdAt: new Date().toISOString(),
    ...entry
  };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...item, read: list[idx].read && item.read !== false ? true : false };
  } else {
    list.unshift(item);
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
