import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../context/I18nContext.jsx';

/**
 * Floating-label text field for the auth pages.
 * - `revealable`: password field with a show/hide button.
 * - `error` / `hint`: text shown under the field.
 * Fields stay read-only until they are focused, so the browser cannot
 * autofill saved credentials when the page opens.
 */
export default function NeoField({
  id,
  label,
  type = 'text',
  revealable = false,
  autoComplete = 'off',
  error,
  hint,
  ...rest
}) {
  const { t } = useI18n();
  const [unlocked, setUnlocked] = useState(false);
  const [shown, setShown] = useState(false);

  return (
    <div className="mlogin-field">
      <div className="mlogin-control">
        <input
          id={id}
          className="mlogin-input"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          {...rest}
          type={revealable ? (shown ? 'text' : 'password') : type}
          autoComplete={revealable ? 'new-password' : autoComplete}
          placeholder=" "
          readOnly={!unlocked}
          onFocus={() => setUnlocked(true)}
        />
        <label className="mlogin-label" htmlFor={id}>
          {label}
        </label>
        <span className="mlogin-line" aria-hidden="true" />
        {revealable ? (
          <button
            type="button"
            className="mlogin-eye"
            aria-label={shown ? t('auth.hidePassword') : t('auth.showPassword')}
            onClick={() => setShown(!shown)}
          >
            {shown ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mlogin-field-error">
          {error}
        </p>
      ) : null}
      {hint}
    </div>
  );
}
