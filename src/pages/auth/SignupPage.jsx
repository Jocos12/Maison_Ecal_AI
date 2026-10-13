import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import { useShake } from '../../hooks/useShake.js';
import AuthShell from '../../components/auth/AuthShell.jsx';
import NeoField from '../../components/auth/NeoField.jsx';
import NeoMessage from '../../components/auth/NeoMessage.jsx';
import NeoSelect from '../../components/auth/NeoSelect.jsx';
import PasswordStrength from '../../components/auth/PasswordStrength.jsx';
import RoundLink from '../../components/auth/RoundLink.jsx';

const ROLE_OPTIONS = [
  { value: 'Analyste', label: 'Analyste' },
  { value: 'Manager', label: 'Manager' }
];

export default function SignupPage() {
  const nav = useNavigate();
  const { refreshMe } = useApp();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Analyste');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [shaking, shake] = useShake();

  const checkConfirm = () => {
    setConfirmError(
      confirmPassword && password !== confirmPassword ? t('auth.passwordMismatch') : ''
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      shake();
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/signup', {
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        role
      });
      if (data.requiresOtp) {
        sessionStorage.setItem('mecal_pending_email', data.email);
        toast.success(t('auth.toastSignupOtp'));
        nav('/verify-otp', { state: { email: data.email } });
      } else if (data.requiresApproval) {
        sessionStorage.setItem('mecal_pending_email', data.email);
        toast.success(t('auth.toastSignupPending'));
        nav('/pending-approval', { state: { email: data.email, message: data.message } });
      } else {
        await refreshMe();
        toast.success(t('auth.toastSignupOk'));
        nav('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || t('auth.errorSignup'));
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      wide
      icon={UserPlus}
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupDesc')}
      footer={
        <div className="mlogin-foot">
          <span>{t('auth.hasAccount')}</span>
          <RoundLink to="/login" label={t('auth.signInLink')}>
            <LogIn size={20} strokeWidth={2.4} />
          </RoundLink>
        </div>
      }
    >
      <form
        onSubmit={submit}
        autoComplete="off"
        className={`mlogin-form mlogin-form--grid ${shaking ? 'animate-shake' : ''}`}
      >
        {error ? <NeoMessage>{error}</NeoMessage> : null}

        <NeoField
          id="mlogin-name"
          name="mecal-fullname"
          label={t('auth.fullName')}
          autoCapitalize="words"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
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
        <NeoField
          id="mlogin-password"
          name="mecal-new-secret"
          label={t('auth.password')}
          revealable
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={<PasswordStrength password={password} />}
          required
        />
        <NeoField
          id="mlogin-confirm"
          name="mecal-new-secret-confirm"
          label={t('auth.confirmPassword')}
          revealable
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={checkConfirm}
          error={confirmError}
          required
        />
        <NeoSelect
          id="mlogin-role"
          label={t('auth.role')}
          value={role}
          onChange={setRole}
          options={ROLE_OPTIONS}
        />

        <button type="submit" className="mlogin-submit" disabled={loading}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : null}
          {t('auth.signup')}
        </button>
      </form>
    </AuthShell>
  );
}
