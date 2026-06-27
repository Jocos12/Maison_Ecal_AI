import { useI18n } from '../context/I18nContext.jsx';

/** UI language drives API locale and formatted dates. */
export function useUiLocale() {
  const { lang, t } = useI18n();
  const dateLocale = lang === 'en' ? 'en-US' : lang === 'sw' ? 'sw-KE' : 'fr-FR';
  return { lang, t, dateLocale };
}
