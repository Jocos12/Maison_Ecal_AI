/** Coloured message box. kind: 'error' (default, red) or 'success' (green). */
export default function NeoMessage({ kind = 'error', children }) {
  const success = kind === 'success';

  return (
    <p
      className={`mlogin-message ${success ? 'mlogin-message--success' : ''}`}
      role={success ? 'status' : 'alert'}
    >
      {children}
    </p>
  );
}
