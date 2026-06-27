import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import { useApp } from '../../context/AppContext.jsx';
import { useI18n } from '../../context/I18nContext.jsx';
import AuthBackground from '../../components/auth/AuthBackground.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';

export default function LoginPage() {
  const nav = useNavigate();
  const { refreshMe } = useApp();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/auth/login', { email, password });
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
          state: { email, message: err.response.data.message }
        });
        return;
      }
      setError(err.response?.data?.message || t('auth.errorInvalid'));
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <AuthCard title={t('auth.loginTitle')} description={t('auth.loginDesc')}>
        <form onSubmit={submit} className={`space-y-5 ${shake ? 'animate-shake' : ''}`}>
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('auth.password')}</Label>
            <div className="relative">
              <Input
                id="password"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
                required
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('auth.login')}
          </Button>
          <div className="flex flex-col gap-2 text-center text-sm">
            <Link to="/forgot-password" className="text-blue-400 hover:text-blue-300 hover:underline">
              {t('auth.forgotLink')}
            </Link>
            <span className="text-slate-500">
              {t('auth.noAccount')}{' '}
              <Link to="/signup" className="font-semibold text-blue-400 hover:text-blue-300 hover:underline">
                {t('auth.signUpLink')}
              </Link>
            </span>
          </div>
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
