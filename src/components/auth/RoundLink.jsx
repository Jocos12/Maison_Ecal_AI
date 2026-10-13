import { Link } from 'react-router-dom';

/**
 * Round icon link. While hovered or focused it turns into a text link showing `label`.
 * `children` is the icon.
 */
export default function RoundLink({ to, label, children }) {
  return (
    <Link to={to} className="mlogin-plus" aria-label={label}>
      <span className="mlogin-plus-face">
        <span className="mlogin-plus-icon" aria-hidden="true">
          {children}
        </span>
        <span className="mlogin-plus-label">{label}</span>
      </span>
    </Link>
  );
}
