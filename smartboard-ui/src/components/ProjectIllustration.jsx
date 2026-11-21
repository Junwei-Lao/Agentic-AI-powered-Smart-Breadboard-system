/**
 * Small SVG illustrations for project cards (schematic "blueprint" style).
 * Props: kind: 'led' | 'button' | 'divider' | 'logic' | 'series'
 */
const Resistor = ({ x, y, vertical }) =>
  vertical ? (
    <path d={`M${x},${y} l0,6 l-6,4 l12,6 l-12,6 l12,6 l-12,6 l6,4 l0,6`} className="il-part" />
  ) : (
    <path d={`M${x},${y} l6,0 l4,-6 l6,12 l6,-12 l6,12 l6,-12 l4,6 l6,0`} className="il-part" />
  );

const Led = ({ x, y, lit }) => (
  <g>
    {lit && <circle cx={x} cy={y + 10} r="18" className="il-glow" />}
    <path d={`M${x - 9},${y} h18 l-9,14 z`} className={`il-part ${lit ? 'il-lit' : ''}`} />
    <line x1={x - 9} y1={y + 14} x2={x + 9} y2={y + 14} className="il-part" />
  </g>
);

export default function ProjectIllustration({ kind }) {
  let body;
  switch (kind) {
    case 'led':
      body = (
        <>
          <path d="M40,40 H90 M134,40 H180 V62 M180,90 V120 H40 V40" className="il-wire" />
          <Resistor x={90} y={40} />
          <Led x={180} y={62} lit />
          <text x="40" y="34" className="il-label">+5V</text>
        </>
      );
      break;
    case 'button':
      body = (
        <>
          <path d="M40,40 H70 M100,40 H120 M164,40 H190 V62 M190,90 V120 H40 V40" className="il-wire" />
          <circle cx="72" cy="40" r="2.5" className="il-node" />
          <circle cx="98" cy="40" r="2.5" className="il-node" />
          <path d="M72,30 L98,24 M85,26 V16 M78,16 H92" className="il-part" />
          <Resistor x={120} y={40} />
          <Led x={190} y={62} />
        </>
      );
      break;
    case 'divider':
      body = (
        <>
          <path d="M120,20 V34 M120,82 V96 M120,58 H180 M120,144 V130" className="il-wire" />
          <Resistor x={120} y={34} vertical />
          <Resistor x={120} y={82} vertical />
          <circle cx="120" cy="58" r="3" className="il-node il-accent" />
          <text x="186" y="62" className="il-label il-accent-text">Vout</text>
          <text x="128" y="22" className="il-label">5V</text>
          <path d="M108,130 H132 M112,135 H128 M116,140 H124" className="il-part" />
        </>
      );
      break;
    case 'logic':
      body = (
        <>
          <path d="M40,50 H96 M40,90 H96 M150,70 H200" className="il-wire" />
          <path d="M96,40 H124 A30,30 0 0 1 124,100 H96 Z" className="il-part" />
          <circle cx="200" cy="70" r="5" className="il-node il-accent" />
          <text x="36" y="44" className="il-label">A</text>
          <text x="36" y="84" className="il-label">B</text>
          <text x="104" y="74" className="il-label">AND</text>
        </>
      );
      break;
    default:
      body = (
        <>
          <path d="M30,30 H200 M30,110 H200 M30,30 V110 M80,30 V46 M80,94 V110 M140,30 V46 M140,94 V110 M200,30 V46 M200,94 V110" className="il-wire" />
          <Resistor x={80} y={46} vertical />
          <Resistor x={140} y={46} vertical />
          <Resistor x={200} y={46} vertical />
        </>
      );
  }
  return (
    <svg viewBox="0 0 240 150" className="illustration" aria-hidden="true">
      <defs>
        <pattern id={`grid-${kind}`} width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="6" cy="6" r="0.9" className="il-dot" />
        </pattern>
      </defs>
      <rect width="240" height="150" fill={`url(#grid-${kind})`} />
      {body}
    </svg>
  );
}
