import { useEffect, useState } from 'react';
import { api } from '../api/client.js';

const GMAIL_COUNT_KEY = 'mecal_gmail_count';

function countUnread(messages = []) {
  return messages.filter((m) => m.unread || m.isRead === false).length;
}

export function useGmailUnreadCount(enabled = true) {
  const [count, setCount] = useState(() => Number(localStorage.getItem(GMAIL_COUNT_KEY) || 0));

  useEffect(() => {
    if (!enabled) return undefined;

    const sync = (value) => {
      const n = Number(value) || 0;
      setCount(n);
      localStorage.setItem(GMAIL_COUNT_KEY, String(n));
    };

    const onEvent = (e) => sync(e.detail ?? localStorage.getItem(GMAIL_COUNT_KEY));
    window.addEventListener('mecal:gmail-count', onEvent);
    window.addEventListener('storage', onEvent);

    const fetchCount = async () => {
      try {
        const { data: status } = await api.get('/api/gmail/status');
        if (!status.connected) {
          sync(0);
          return;
        }
        const { data } = await api.get('/api/gmail/messages', { params: { maxResults: 50 } });
        sync(countUnread(data.messages || []));
      } catch {
        /* garde la dernière valeur */
      }
    };

    fetchCount();
    const interval = window.setInterval(fetchCount, 120000);

    return () => {
      window.removeEventListener('mecal:gmail-count', onEvent);
      window.removeEventListener('storage', onEvent);
      window.clearInterval(interval);
    };
  }, [enabled]);

  return count;
}
