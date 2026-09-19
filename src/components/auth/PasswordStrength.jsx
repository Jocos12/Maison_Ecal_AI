import { useI18n } from '../../context/I18nContext.jsx';

function scorePassword(pw) {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^a-zA-Z0-9]/.test(pw)) s++;
  const capped = Math.min(3, Math.floor(s * 0.7));
  if (capped === 0) return { level: 'weak', pct: 34 };
  if (capped === 1) return { level: 'medium', pct: 67 };
  return { level: 'strong', pct: 100 };
}

const LABEL_KEY = {
  weak: 'auth.strengthWeak',
  medium: 'auth.strengthMedium',
  strong: 'auth.strengthStrong'
};

export default function PasswordStrength({ password }) {
  const { t } = useI18n();
  const result = scorePassword(password);
  if (!result) return null;

  return (
    <div className="mlogin-strength">
      <div className="mlogin-strength-track" aria-hidden="true">
        <div
          className={`mlogin-strength-fill mlogin-strength-fill--${result.level}`}
          style={{ width: `${result.pct}%` }}
        />
      </div>
      <p className={`mlogin-strength-label mlogin-strength-label--${result.level}`} aria-live="polite">
        {t('auth.strengthLabel')} : <strong>{t(LABEL_KEY[result.level])}</strong>
      </p>
    </div>
  );
}
