// Star of the flag: five points, one of them straight up.
function starPoints(cx, cy, outer) {
  const inner = outer * 0.382;
  const points = [];
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (-90 + i * 36) * (Math.PI / 180);
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

/**
 * Flag of the Democratic Republic of the Congo: sky blue field, red diagonal band edged with yellow,
 * and a yellow star in the upper left corner. Drawn as a vector so it stays sharp at any size.
 * `round` lays it out for a circular badge (the star is kept clear of the rim).
 */
export default function DrcFlag({ className = '', round = false }) {
  const size = round ? { w: 40, h: 40, star: [12.5, 12.5, 6], line: [-6, 46, 46, -6] } : { w: 60, h: 40, star: [11.5, 11, 6.6], line: [-6, 44, 66, -4] };
  return (
    <svg
      className={className}
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label="République démocratique du Congo"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size.w} height={size.h} fill="#007FFF" />
      <line x1={size.line[0]} y1={size.line[1]} x2={size.line[2]} y2={size.line[3]} stroke="#F7D618" strokeWidth="11" />
      <line x1={size.line[0]} y1={size.line[1]} x2={size.line[2]} y2={size.line[3]} stroke="#CE1021" strokeWidth="7" />
      <polygon points={starPoints(...size.star)} fill="#F7D618" />
    </svg>
  );
}
