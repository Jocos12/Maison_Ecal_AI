import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import AuthBackground from '../../components/auth/AuthBackground.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';
import PasswordStrength from '../../components/auth/PasswordStrength.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';
import { Select } from '../../components/ui/select.jsx';

export default function SignupPage() {
  const nav = useNavigate();
  const { refreshMe } = useApp();
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Analyste');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [shake, setShake] = useState(false);

  const blurConfirm = () => {
    if (confirmPassword && password !== confirmPassword) {
      setFieldErrors((f) => ({ ...f, confirm: t('auth.passwordMismatch') }));
    } else setFieldErrors((f) => ({ ...f, confirm: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/signup', {
        name,
        email,
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
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <AuthCard title={t('auth.signupTitle')} description={t('auth.signupDesc')}>
        <form onSubmit={submit} className={`space-y-4 ${shake ? 'animate-shake' : ''}`}>
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t('auth.fullName')}</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={show1 ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`pr-11 ${password && password.length < 8 ? 'border-red-500/50' : ''}`}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setShow1(!show1)}
              >
                {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <PasswordStrength password={password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t('auth.confirmPassword')}</Label>
            <div className="relative">
              <Input
                id="confirm"
                type={show2 ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={blurConfirm}
                className={`pr-11 ${fieldErrors.confirm ? 'border-red-500/50' : ''}`}
                required
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setShow2(!show2)}
              >
                {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.confirm && <p className="text-xs text-red-400">{fieldErrors.confirm}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t('auth.role')}</Label>
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Analyste">Analyste</option>
              <option value="Manager">Manager</option>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('auth.signup')}
          </Button>
          <p className="text-center text-sm text-slate-500">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="font-semibold text-blue-400 hover:underline">
              {t('auth.signInLink')}
            </Link>
          </p>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
