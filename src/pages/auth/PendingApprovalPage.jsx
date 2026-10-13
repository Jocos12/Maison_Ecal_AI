import { Link, useLocation } from 'react-router-dom';
import { Clock, Mail } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import AuthShell from '../../components/auth/AuthShell.jsx';

export default function PendingApprovalPage() {
  const { t } = useI18n();
  const location = useLocation();
  const email = location.state?.email || sessionStorage.getItem('mecal_pending_email') || '';
  const message = location.state?.message || t('auth.pendingDefault');

  return (
    <AuthShell icon={Clock} title={t('auth.pendingTitle')} subtitle={t('auth.pendingDesc')}>
      <div className="mlogin-form">
        <p className="mlogin-text">{message}</p>
        {email ? (
          <span className="mlogin-chip">
            <Mail size={16} aria-hidden="true" />
            {email}
          </span>
        ) : null}
        <p className="mlogin-hint">{t('auth.pendingHint')}</p>
        <Link to="/login" className="mlogin-submit">
          {t('auth.backToLogin')}
        </Link>
      </div>
    </AuthShell>
  );
}
