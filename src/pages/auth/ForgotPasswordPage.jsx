import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../api/client.js';
import AuthBackground from '../../components/auth/AuthBackground.jsx';
import AuthCard from '../../components/auth/AuthCard.jsx';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Label } from '../../components/ui/label.jsx';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/auth/forgot-password', { email });
    } catch {
      /* même message pour ne pas divulguer si l’e-mail existe */
    } finally {
      setLoading(false);
    }
    setDone(true);
    toast.success('Si cet e-mail existe, vous recevrez un lien.');
  };

  return (
    <AuthBackground>
      <AuthCard
        title="Mot de passe oublié"
        description="Nous vous enverrons un lien sécurisé si l’adresse est reconnue"
      >
        {done ? (
          <p className="animate-fade-in rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm text-emerald-100">
            Si cet e-mail existe dans notre système, vous recevrez un lien de réinitialisation sous peu.
          </p>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Envoyer le lien de réinitialisation
            </Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-blue-400 hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </AuthCard>
    </AuthBackground>
  );
}
