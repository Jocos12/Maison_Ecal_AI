import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { api } from '../api/client.js';

/** Sync interface language with user profile and persist changes. */
export default function I18nUserSync() {
  const { user } = useApp();
  const { lang, setLang } = useI18n();
  const hydrated = useRef(false);
  const lastPersisted = useRef(null);

  useEffect(() => {
    if (!user?.id || hydrated.current) return;
    hydrated.current = true;
    const stored = localStorage.getItem('mecal_lang');
    if (!stored && user.preferredLanguage && ['fr', 'en', 'sw'].includes(user.preferredLanguage)) {
      setLang(user.preferredLanguage);
    }
  }, [user?.id, user?.preferredLanguage, setLang]);

  useEffect(() => {
    if (!user?.id) return;
    if (lastPersisted.current === lang) return;
    lastPersisted.current = lang;
    api.patch('/api/auth/settings', { preferredLanguage: lang }).catch(() => {});
  }, [lang, user?.id]);

  return null;
}
