import { cn } from '../../lib/utils.js';

function scorePassword(pw) {
  if (!pw) return { score: 0, label: '', color: 'bg-slate-600' };
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  const capped = Math.min(3, Math.floor(s * 0.7));
  if (capped === 0) return { score: 1, label: 'Faible', color: 'bg-red-500' };
  if (capped === 1) return { score: 2, label: 'Moyen', color: 'bg-amber-400' };
  return { score: 3, label: 'Fort', color: 'bg-emerald-500' };
}

export default function PasswordStrength({ password }) {
  const { score, label, color } = scorePassword(password);
  const pct = (score / 3) * 100;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div className={cn('h-full transition-all duration-300', color)} style={{ width: `${pct}%` }} />
      </div>
      {password && (
        <p className="text-xs text-slate-400">
          Sécurité : <span className="font-semibold text-slate-200">{label}</span>
        </p>
      )}
    </div>
  );
}
