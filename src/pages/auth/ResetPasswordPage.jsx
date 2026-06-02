import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import AuthBackground from '../../components/auth/AuthBackground.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';
import PasswordStrength from '../../components/auth/PasswordStrength.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const key = params.get('key') || '';
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!key || !token) setError('Lien invalide ou incomplet.');
  }, [key, token]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/reset-password', { key, token, password, confirmPassword: confirm });
      setSuccess(true);
      toast.success('Mot de passe mis à jour');
      setTimeout(() => nav('/login', { replace: true }), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground>
      <AuthCard title="Nouveau mot de passe" description="Choisissez un mot de passe fort">
        {success ? (
          <div className="animate-fade-in rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-6 text-center text-emerald-100">
            <p className="font-semibold">Mot de passe mis à jour</p>
            <p className="mt-2 text-sm text-emerald-200/90">Redirection vers la connexion…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
          {error && (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="np">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="np"
                type={show1 ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-11"
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
            <Label htmlFor="c">Confirmer</Label>
            <div className="relative">
              <Input
                id="c"
                type={show2 ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="pr-11"
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
          </div>
          <Button type="submit" className="w-full" disabled={loading || !key || !token}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Réinitialiser
          </Button>
          <p className="text-center text-xs text-slate-500">
            Redirection vers la connexion dans 3 secondes après succès.
          </p>
          <p className="text-center text-sm">
            <Link to="/login" className="text-blue-400 hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </form>
        )}
      </AuthCard>
    </AuthBackground>
  );
}
