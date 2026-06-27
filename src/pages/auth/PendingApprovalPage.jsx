import { Link, useLocation } from 'react-router-dom';
import { Clock, Mail } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';
import AuthBackground from '../../components/auth/AuthBackground.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';

export default function PendingApprovalPage() {
  const { t } = useI18n();
  const location = useLocation();
  const email = location.state?.email || sessionStorage.getItem('mecal_pending_email') || '';
  const message = location.state?.message || t('auth.pendingDefault');

  return (
    <AuthBackground>
      <AuthCard title={t('auth.pendingTitle')} description={t('auth.pendingDesc')}>
        <div className="space-y-5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-amber-500/20">
            <Clock className="h-7 w-7 text-amber-400" />
          </div>
          <p className="text-sm leading-relaxed text-slate-300">{message}</p>
          {email ? (
            <p className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-sm text-slate-300">
              <Mail className="h-4 w-4 text-blue-400" />
              {email}
            </p>
          ) : null}
          <p className="text-xs text-slate-500">{t('auth.pendingHint')}</p>
          <Link
            to="/login"
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-lg hover:scale-[1.02]"
          >
            {t('auth.backToLogin')}
          </Link>
        </div>
      </AuthCard>
    </AuthBackground>
  );
}
