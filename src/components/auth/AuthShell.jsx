import { useI18n } from '../../context/I18nContext.jsx';
import EcalLogo from './EcalLogo.jsx';
import './auth-neo.css';

/**
 * Shared frame of the auth pages: coloured background and a card.
 * - default: translucent two-panel card (brand on the left, form on the right).
 *   `wide` gives forms with many fields (signup) more room for two columns.
 * - `single`: one compact centered card (brand on top, form below).
 * `icon` is optional: without it no round icon badge is shown.
 */
export default function AuthShell({
  icon: Icon,
  title,
  subtitle,
  children,
  footer,
  wide = false,
  single = false
}) {
  const { t } = useI18n();

  const badge = Icon ? (
    <div className="mlogin-lock" aria-hidden="true">
      <Icon size={32} strokeWidth={2.4} />
    </div>
  ) : null;

  const heading = (
    <>
      <h1 className="mlogin-title">{title}</h1>
      {subtitle ? <p className="mlogin-subtitle">{subtitle}</p> : null}
    </>
  );

  return (
    <main className="mlogin">
      <div className="mlogin-bg" aria-hidden="true" />

      <div className={`mlogin-stage ${wide ? 'mlogin-stage--wide' : ''} ${single ? 'mlogin-stage--single' : ''}`}>
        {single ? (
          <section className="mlogin-card mlogin-card--single animate-fade-in">
            <div className="mlogin-brand">
              <EcalLogo height={46} />
              <p className="mlogin-tagline">{t('layout.logoTagline')}</p>
            </div>
            {badge}
            {heading}
            {children}
            {footer}
          </section>
        ) : (
          <section className="mlogin-card animate-fade-in">
            <aside className="mlogin-side">
              {badge}
              <EcalLogo height={52} variant="light" />
              <p className="mlogin-tagline">{t('layout.logoTagline')}</p>
              <p className="mlogin-side-desc">{t('auth.loginDesc')}</p>
            </aside>

            <div className="mlogin-main">
              {heading}
              {children}
              {footer}
            </div>
          </section>
        )}

        <p className="mlogin-secure">{t('auth.secureNote')}</p>
      </div>
    </main>
  );
}
