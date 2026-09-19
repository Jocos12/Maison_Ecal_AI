/**
 * Maison ECAL logo redrawn as a vector so it stays sharp at any size.
 * Sky-blue house outline (#00AEEF) above the bold "ECAL" wordmark:
 * navy (#101B2C) on light backgrounds, white with variant="light" on dark ones.
 */
export default function EcalLogo({ height = 46, className = '', variant = 'dark' }) {
  const wordmark = variant === 'light' ? '#FFFFFF' : '#101B2C';

  return (
    <svg
      className={className}
      viewBox="10 0 102 40"
      height={height}
      role="img"
      aria-label="Maison ECAL"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" stroke="#00AEEF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 19.7 34.2 1.8 45.4 8.2V5.2H53V10.4H59.5" />
        <path d="M20.4 15.2V34.5" />
      </g>
      <text
        x="27.5"
        y="36.3"
        textLength="81"
        lengthAdjust="spacingAndGlyphs"
        fontFamily="Poppins, Inter, Arial, sans-serif"
        fontWeight="800"
        fontSize="33"
        fill={wordmark}
        stroke={wordmark}
        strokeWidth="0.5"
      >
        ECAL
      </text>
    </svg>
  );
}
