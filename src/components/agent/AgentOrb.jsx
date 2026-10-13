/**
 * The face of the assistant: a round robot head that is always slightly alive.
 * It blinks, its antenna glows, rings pulse around it, and its behaviour follows what the agent is doing:
 *  - idle: calm smile, slow rings
 *  - thinking: eyes glance left and right, amber antenna, faster rings
 *  - listening: rose antenna and rings while the microphone is open
 *  - speaking: the mouth moves, emerald rings
 * `tone="onBlue"` draws a white head for the blue header, `tone="onLight"` a steel-blue head for white surfaces.
 */
export function AgentOrb({ size = 48, tone = 'onBlue', state = 'idle', floating = false, className = '' }) {
  const onBlue = tone === 'onBlue';
  const core = onBlue ? '#ffffff' : '#24478a';
  const ink = onBlue ? '#24478a' : '#ffffff';
  const ringColor =
    state === 'listening' ? 'bg-rose-400' : state === 'speaking' ? 'bg-emerald-400' : state === 'thinking' ? 'bg-amber-300' : onBlue ? 'bg-white' : 'bg-[#24478a]';
  const antenna = state === 'listening' ? '#fb7185' : state === 'thinking' ? '#fcd34d' : '#34d399';
  const fast = state !== 'idle';

  return (
    <span className={`relative inline-grid flex-none place-items-center ${floating ? 'agent-float' : ''} ${className}`} style={{ width: size, height: size }} aria-hidden="true">
      <span className={`agent-ring absolute inset-[8%] rounded-full ${ringColor} ${fast ? 'agent-ring-fast' : ''}`} />
      <span className={`agent-ring absolute inset-[8%] rounded-full ${ringColor} ${fast ? 'agent-ring-fast' : ''}`} style={{ animationDelay: fast ? '0.6s' : '1.3s' }} />
      <svg viewBox="0 0 48 48" className="relative h-full w-full">
        <circle cx="24" cy="27" r="19.5" fill={core} />
        <line x1="24" y1="7.5" x2="24" y2="4" stroke={core} strokeWidth="2.2" strokeLinecap="round" />
        <circle className="agent-antenna" cx="24" cy="3.2" r="2.7" fill={antenna} />
        <g className={state === 'thinking' ? 'agent-look' : ''}>
          <rect className="agent-blink" x="15.5" y="20" width="5" height="9" rx="2.5" fill={ink} />
          <rect className="agent-blink" x="27.5" y="20" width="5" height="9" rx="2.5" fill={ink} />
        </g>
        {state === 'speaking' ? (
          <ellipse className="agent-talk" cx="24" cy="36" rx="4.2" ry="3" fill={ink} />
        ) : (
          <path d="M18.5 34.5 Q24 39.5 29.5 34.5" fill="none" stroke={ink} strokeWidth="2.4" strokeLinecap="round" />
        )}
      </svg>
    </span>
  );
}

/** A few vertical bars that dance: "I am listening / thinking / speaking". */
export function EqBars({ className = '', bars = 4, height = 14 }) {
  return (
    <span className={`inline-flex items-end gap-[3px] ${className}`} style={{ height }} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className="agent-eq-bar w-[3px] rounded-full bg-current" style={{ height: '100%', animationDelay: `${i * 0.13}s` }} />
      ))}
    </span>
  );
}
