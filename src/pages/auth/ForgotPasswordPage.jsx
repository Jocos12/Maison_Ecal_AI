import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useI18n } from '../../context/I18nContext.jsx';
import { useShake } from '../../hooks/useShake.js';
import AuthShell from '../../components/auth/AuthShell.jsx';
import NeoField from '../../components/auth/NeoField.jsx';
import NeoMessage from '../../components/auth/NeoMessage.jsx';
import OTPInput from '../../components/auth/OTPInput.jsx';
import PasswordStrength from '../../components/auth/PasswordStrength.jsx';

const RESEND_SECONDS = 60;

/**
 * Forgot password in four steps, all on this page:
 * email -> 6-digit code sent by e-mail (only if the account exists) -> new password -> done.
 */
export default function ForgotPasswordPage() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [session, setSession] = useState(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [shaking, shake] = useShake();

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step !== 'done') return undefined;
    const timer = setTimeout(() => nav('/login', { replace: true }), 3000);
    return () => clearTimeout(timer);
  }, [step, nav]);

  const fail = (message) => {
    setError(message);
    shake();
  };

  /** Ask the server to e-mail a code. Also used by "resend". */
  const requestCode = async (resend = false) => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password', { email: email.trim() });
      // Only go on when the server confirms a code was really sent.
      if (data?.ok !== true) {
        fail(t('auth.errorSendCode'));
        return;
      }
      setOtp('');
      setCooldown(RESEND_SECONDS);
      setStep('code');
      toast.success(t(resend ? 'auth.toastResendOk' : 'auth.toastOtpSent'));
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'EMAIL_NOT_FOUND') {
        fail(t('auth.errorEmailNotFound'));
      } else if (data?.code === 'OTP_COOLDOWN') {
        // A code was sent a moment ago and is still valid: go on with it.
        setCooldown(data.wait || RESEND_SECONDS);
        if (resend) toast.error(data.message);
        else setStep('code');
      } else {
        fail(data?.message || t('auth.errorSendCode'));
      }
    } finally {
      setLoading(false);
    }
  };

  const submitEmail = (e) => {
    e.preventDefault();
    requestCode(false);
  };

  const submitCode = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      fail(t('auth.otpHint'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/forgot-password/verify', {
        email: email.trim(),
        code: otp
      });
      setSession({ key: data.key, token: data.token });
      setStep('password');
    } catch (err) {
      fail(err.response?.data?.message || t('auth.errorInvalidCode'));
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  const checkConfirm = () => {
    setConfirmError(confirm && password !== confirm ? t('auth.passwordMismatch') : '');
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      fail(t('auth.passwordTooShort'));
      return;
    }
    if (password !== confirm) {
      setConfirmError(t('auth.passwordMismatch'));
      fail(t('auth.passwordMismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', {
        key: session.key,
        token: session.token,
        password,
        confirmPassword: confirm
      });
      toast.success(t('auth.toastResetOk'));
      setStep('done');
    } catch (err) {
      fail(err.response?.data?.message || t('auth.errorReset'));
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = (
    <div className="mlogin-foot">
      <Link to="/login" className="mlogin-back">
        <ArrowLeft size={16} />
        {t('auth.backToLogin')}
      </Link>
    </div>
  );

  const formClass = `mlogin-form ${shaking ? 'animate-shake' : ''}`;
  const spinner = loading ? <Loader2 size={18} className="animate-spin" /> : null;

  if (step === 'code') {
    return (
      <AuthShell
        icon={ShieldCheck}
        title={t('auth.forgotCodeTitle')}
        subtitle={t('auth.forgotCodeDesc')}
        footer={
          <div className="mlogin-foot">
            <button
              type="button"
              className="mlogin-back"
              onClick={() => {
                setError('');
                setStep('email');
              }}
            >
              <ArrowLeft size={16} />
              {t('auth.changeEmail')}
            </button>
          </div>
        }
      >
        <form onSubmit={submitCode} autoComplete="off" className={formClass}>
          <span className="mlogin-chip">
            <Mail size={16} aria-hidden="true" />
            {email.trim()}
          </span>
          {error ? <NeoMessage>{error}</NeoMessage> : null}

          <OTPInput value={otp} onChange={setOtp} disabled={loading} error={Boolean(error)} />

          <button type="submit" className="mlogin-submit" disabled={loading}>
            {spinner}
            {t('auth.verify')}
          </button>
          <button
            type="button"
            className="mlogin-linkbtn"
            disabled={cooldown > 0 || loading}
            onClick={() => requestCode(true)}
          >
            {cooldown > 0 ? t('auth.resendCooldown', { seconds: cooldown }) : t('auth.resendCode')}
          </button>
        </form>
      </AuthShell>
    );
  }

  if (step === 'password') {
    return (
      <AuthShell
        icon={LockKeyhole}
        title={t('auth.resetTitle')}
        subtitle={t('auth.resetDesc')}
        footer={backToLogin}
      >
        <form onSubmit={submitPassword} autoComplete="off" className={formClass}>
          {error ? <NeoMessage>{error}</NeoMessage> : null}

          <NeoField
            id="mlogin-new-password"
            name="mecal-new-secret"
            label={t('auth.newPassword')}
            revealable
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <NeoField
            id="mlogin-confirm-password"
            name="mecal-new-secret-confirm"
            label={t('auth.confirmPassword')}
            revealable
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (confirmError && e.target.value === password) setConfirmError('');
            }}
            onBlur={checkConfirm}
            error={confirmError}
            hint={<PasswordStrength password={password} />}
            required
          />

          <button type="submit" className="mlogin-submit" disabled={loading}>
            {spinner}
            {t('auth.reset')}
          </button>
        </form>
      </AuthShell>
    );
  }

  if (step === 'done') {
    return (
      <AuthShell
        icon={CheckCircle2}
        title={t('auth.resetSuccess')}
        subtitle={t('auth.resetRedirect')}
      >
        <Link to="/login" className="mlogin-submit">
          {t('auth.backToLogin')}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      single
      icon={KeyRound}
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotDesc')}
      footer={backToLogin}
    >
      <form onSubmit={submitEmail} autoComplete="off" className={formClass}>
        {error ? <NeoMessage>{error}</NeoMessage> : null}

        <NeoField
          id="mlogin-email"
          name="mecal-identifier"
          type="email"
          label={t('auth.email')}
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="mlogin-submit" disabled={loading}>
          {spinner}
          {t('auth.sendResetCode')}
        </button>
      </form>
    </AuthShell>
  );
}
