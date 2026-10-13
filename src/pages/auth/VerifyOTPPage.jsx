import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { useShake } from '../../hooks/useShake.js';
import AuthShell from '../../components/auth/AuthShell.jsx';
import NeoMessage from '../../components/auth/NeoMessage.jsx';
import OTPInput from '../../components/auth/OTPInput.jsx';

export default function VerifyOTPPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { refreshMe } = useApp();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [shaking, shake] = useShake();

  useEffect(() => {
    const fromState = location.state?.email;
    const stored = sessionStorage.getItem('mecal_pending_email');
    const resolved = fromState || stored || '';
    setEmail(resolved);
    if (!resolved) nav('/login', { replace: true });
  }, [location.state, nav]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError(t('auth.otpHint'));
      shake();
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/verify-otp', { email, code: otp });
      sessionStorage.removeItem('mecal_pending_email');
      await refreshMe();
      toast.success(t('auth.toastVerifyOk'));
      nav('/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.data?.code === 'PENDING_APPROVAL') {
        sessionStorage.removeItem('mecal_pending_email');
        nav('/pending-approval', {
          state: { email, message: err.response.data.message }
        });
        return;
      }
      setError(err.response?.data?.message || t('auth.errorInvalidCode'));
      shake();
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await api.post('/api/auth/resend-otp', { email });
      toast.success(t('auth.toastResendOk'));
      setCooldown(60);
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.errorResend'));
    }
  };

  return (
    <AuthShell icon={ShieldCheck} title={t('auth.verifyTitle')} subtitle={t('auth.verifyDesc')}>
      <form
        onSubmit={submit}
        autoComplete="off"
        className={`mlogin-form ${shaking ? 'animate-shake' : ''}`}
      >
        {email ? (
          <span className="mlogin-chip">
            <Mail size={16} aria-hidden="true" />
            {email}
          </span>
        ) : null}
        {error ? <NeoMessage>{error}</NeoMessage> : null}

        <OTPInput value={otp} onChange={setOtp} disabled={loading} error={Boolean(error)} />

        <button type="submit" className="mlogin-submit" disabled={loading}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {t('auth.verify')}
        </button>

        <button type="button" className="mlogin-linkbtn" disabled={cooldown > 0} onClick={resend}>
          {cooldown > 0 ? t('auth.resendCooldown', { seconds: cooldown }) : t('auth.resendCode')}
        </button>
      </form>
    </AuthShell>
  );
}
