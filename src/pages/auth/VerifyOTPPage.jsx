import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import AuthBackground from '../../components/auth/AuthBackground.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';
import OTPInput from '../../components/auth/OTPInput.jsx';
import { Button } from '../../components/ui/button.jsx';

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
  const [shake, setShake] = useState(false);

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
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
    <AuthBackground>
      <AuthCard title={t('auth.verifyTitle')} description={t('auth.verifyDesc')}>
        <form onSubmit={submit} className={`space-y-6 ${shake ? 'animate-shake' : ''}`}>
          <p className="text-center text-sm text-slate-400">{email}</p>
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
              {error}
            </p>
          )}
          <OTPInput value={otp} onChange={setOtp} disabled={loading} error={Boolean(error)} />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('auth.verify')}
          </Button>
          <div className="text-center text-sm">
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={resend}
              className={`font-medium ${
                cooldown > 0 ? 'cursor-not-allowed text-slate-600' : 'text-blue-400 hover:underline'
              }`}
            >
              {cooldown > 0
                ? t('auth.resendCooldown', { seconds: cooldown })
                : t('auth.resendCode')}
            </button>
          </div>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
