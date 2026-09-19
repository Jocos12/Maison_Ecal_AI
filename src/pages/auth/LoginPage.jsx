import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { useShake } from '../../hooks/useShake.js';
import AuthShell from '../../components/auth/AuthShell.jsx';
import NeoField from '../../components/auth/NeoField.jsx';
import NeoMessage from '../../components/auth/NeoMessage.jsx';
import RoundLink from '../../components/auth/RoundLink.jsx';

export default function LoginPage() {
  const nav = useNavigate();
  const { refreshMe } = useApp();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shaking, shake] = useShake();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const cleanEmail = email.trim();
    try {
      const { data } = await api.post('/api/auth/login', { email: cleanEmail, password });
      if (data.requiresOtp) {
        sessionStorage.setItem('mecal_pending_email', data.email);
        toast.success(t('auth.toastOtpSent'));
        nav('/verify-otp', { state: { email: data.email } });
      } else {
        await refreshMe();
        toast.success(t('auth.toastLoginOk'));
        nav('/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.response?.data?.code === 'PENDING_APPROVAL') {
        nav('/pending-approval', {
          state: { email: cleanEmail, message: err.response.data.message }
        });
        return;
      }
      setError(err.response?.data?.message || t('auth.errorInvalid'));
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={t('auth.loginWelcome')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <div className="mlogin-foot">
          <span>{t('auth.noAccount')}</span>
          <RoundLink to="/signup" label={t('auth.signUpLink')}>
            <Plus size={22} strokeWidth={2.4} />
          </RoundLink>
        </div>
      }
    >
      <form
        onSubmit={submit}
        autoComplete="off"
        className={`mlogin-form ${shaking ? 'animate-shake' : ''}`}
      >
        {error ? <NeoMessage>{error}</NeoMessage> : null}

        <NeoField
          id="mlogin-email"
          name="mecal-identifier"
          label={t('auth.email')}
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <NeoField
          id="mlogin-password"
          name="mecal-secret"
          label={t('auth.password')}
          revealable
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="mlogin-row">
          <Link to="/forgot-password" className="mlogin-link mlogin-link--danger">
            {t('auth.forgotLink')}
          </Link>
        </div>

        <button type="submit" className="mlogin-submit" disabled={loading}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {t('auth.login')}
        </button>
      </form>
    </AuthShell>
  );
}
