/**
 * Reference schematic for a single-loop LED circuit, color-coded by the
 * validator's net results.
 * Props: nets [{ id, satisfied, pending }], errorNetIds, placed { R1, D1 }, lit
 */
const SEGMENTS = {
  n_supply: 'M44,70 V36 H104',
  n_series: 'M176,36 H276 V78',
  n_ground: 'M276,124 V170 H44 V130',
};

export default function SchematicView({ nets = [], errorNetIds = [], placed = {}, lit = false }) {
  const state = (id) => {
    const n = nets.find((x) => x.id === id);
    if (errorNetIds.includes(id)) return 'error';
    if (n?.satisfied) return 'ok';
    return 'pending';
  };
  return (
    <svg viewBox="0 0 320 200" className="schematic" role="img" aria-label="Reference schematic">
      {Object.entries(SEGMENTS).map(([id, d]) => (
        <path key={id} d={d} className={`sch-net sch-${state(id)}`} />
      ))}
      {/* battery */}
      <g className="sch-part">
        <line x1="30" y1="72" x2="58" y2="72" strokeWidth="2.4" />
        <line x1="36" y1="80" x2="52" y2="80" />
        <line x1="30" y1="90" x2="58" y2="90" strokeWidth="2.4" />
        <line x1="36" y1="98" x2="52" y2="98" />
        <line x1="44" y1="98" x2="44" y2="130" className="sch-wire-plain" />
        <text x="62" y="76" className="sch-label">+5 V</text>
      </g>
      {/* resistor */}
      <g className={`sch-part ${placed.R1 ? '' : 'is-missing'}`}>
        <path d="M104,36 l6,-9 l10,18 l10,-18 l10,18 l10,-18 l10,18 l10,-18 l6,9" />
        <text x="140" y="62" textAnchor="middle" className="sch-label">R1 · 220 Ω</text>
      </g>
      {/* LED */}
      <g className={`sch-part ${placed.D1 ? '' : 'is-missing'} ${lit ? 'is-lit' : ''}`}>
        <path d="M262,82 H290 L276,106 Z" className="sch-diode" />
        <line x1="262" y1="106" x2="290" y2="106" />
        <line x1="276" y1="106" x2="276" y2="124" />
        <path d="M294,88 l10,-8 M298,80 h6 v6 M294,98 l10,-8 M298,90 h6 v6" className="sch-rays" />
        <text x="252" y="98" textAnchor="end" className="sch-label">D1 · LED</text>
      </g>
      {/* ground */}
      <g className="sch-part">
        <line x1="150" y1="170" x2="150" y2="180" />
        <line x1="138" y1="180" x2="162" y2="180" />
        <line x1="143" y1="185" x2="157" y2="185" />
        <line x1="147" y1="190" x2="153" y2="190" />
        <text x="168" y="190" className="sch-label">GND</text>
      </g>
    </svg>
  );
}
