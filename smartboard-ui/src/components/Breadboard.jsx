/**
 * <Breadboard /> — read-only, dynamic SVG digital twin of the physical board.
 *
 * Everything shown is driven by props:
 *   components        placed parts [{ id, type, pins, value?, color? }]
 *   highlights        visual hints from lib/highlights.js
 *   litComponentIds   LEDs currently emitting light (from sensors)
 *   currentFlowing    animate current flow along wires
 *   recent            { componentId, key } — last changed part (entry animation)
 *   highlightsStale   dim highlights while the agent re-analyzes
 *   compact           smaller chrome for previews
 *
 * There are intentionally no drag/drop or click handlers: users build on the
 * physical board and this view mirrors it.
 */
import { memo, useMemo } from 'react';
import { BOTTOM_ROWS, COLUMNS, RAILS, TOP_ROWS, componentName, formatHole, parseHole } from '../lib/boardModel.js';

/* ---------------------------------------------------------------- geometry */
const P = 22;
const X0 = 54;
const W = X0 * 2 + (COLUMNS - 1) * P;
const H = 420;
const ROW_Y = { tp: 30, tn: 52, bn: 370, bp: 392 };
TOP_ROWS.forEach((r, i) => (ROW_Y[r] = 106 + i * P));
BOTTOM_ROWS.forEach((r, i) => (ROW_Y[r] = 238 + i * P));
const colX = (col) => X0 + (col - 1) * P;

export function holeXY(id) {
  const h = parseHole(id);
  return h ? { x: colX(h.col), y: ROW_Y[h.row] } : { x: 0, y: 0 };
}

function nodeRect(node) {
  if (RAILS.includes(node)) {
    const y = ROW_Y[node];
    return { x: X0 - 12, y: y - 10, w: W - 2 * X0 + 24, h: 20 };
  }
  const col = Number(node.slice(1));
  const top = node[0] === 'T';
  const y1 = top ? ROW_Y.a : ROW_Y.f;
  const y2 = top ? ROW_Y.e : ROW_Y.j;
  return { x: colX(col) - 9, y: y1 - 10, w: 18, h: y2 - y1 + 20 };
}

/* ------------------------------------------------------------------ colors */
const WIRE = { red: '#d8383a', black: '#26272b', blue: '#2f6fd6', green: '#1f9d61', yellow: '#e6b422', white: '#f2f2f2' };
const WIRE_DARK = { red: '#8f1f22', black: '#000', blue: '#1c4590', green: '#11613b', yellow: '#9c7a10', white: '#b9b9b9' };
const BAND = ['#1b1b1b', '#7a4a21', '#d1302f', '#ee7d1a', '#f2cb1d', '#2f9a4a', '#2a5fc9', '#7d3fbf', '#8c8c8c', '#f5f5f5'];
const LED = { red: ['#ff6b5e', '#d1261c'], green: ['#6dff9c', '#1d9e4c'], yellow: ['#ffe27a', '#d9a400'], blue: ['#7fb6ff', '#2459d6'] };

function resistorBands(ohms = 220) {
  const exp = Math.max(0, Math.floor(Math.log10(ohms)) - 1);
  const sig = Math.round(ohms / 10 ** exp);
  const d1 = Math.floor(sig / 10) % 10;
  const d2 = sig % 10;
  return [BAND[d1], BAND[d2], BAND[Math.min(exp, 9)], '#c9a43a'];
}

function wirePath(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  let nx = -dy / len;
  let ny = dx / len;
  if (ny > 0 || (ny === 0 && nx > 0)) {
    nx = -nx;
    ny = -ny;
  }
  const bow = Math.min(46, Math.max(10, len * 0.24));
  const cx = (a.x + b.x) / 2 + nx * bow;
  const cy = (a.y + b.y) / 2 + ny * bow;
  return `M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`;
}

const pinsOf = (c) => Object.values(c.pins || {}).map(holeXY);
const tooltip = (c) => `${c.id} · ${componentName(c)} · ${Object.values(c.pins).map(formatHole).join(' → ')}`;

/* -------------------------------------------------------------- components */

function Wire({ c, error, flowing }) {
  const [a, b] = pinsOf(c);
  const d = wirePath(a, b);
  const color = WIRE[c.color] || WIRE.yellow;
  const dark = WIRE_DARK[c.color] || '#555';
  return (
    <g>
      <title>{tooltip(c)}</title>
      {error && <path d={d} className="bb-error-glow" />}
      <path d={d} transform="translate(1.5,3)" stroke="rgba(0,0,0,.22)" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d={d} stroke={dark} strokeWidth="6.5" fill="none" strokeLinecap="round" />
      <path d={d} stroke={color} strokeWidth="4.6" fill="none" strokeLinecap="round" />
      <path d={d} transform="translate(-0.8,-1)" stroke="rgba(255,255,255,.35)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {flowing && <path d={d} className="bb-flow" />}
      {[a, b].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.2" fill={dark} />
          <circle cx={p.x} cy={p.y} r="2" fill="#c9c9c9" />
        </g>
      ))}
    </g>
  );
}

function Resistor({ c, error }) {
  const [a, b] = pinsOf(c);
  const len = Math.hypot(b.x - a.x, b.y - a.y);
  const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  const body = Math.min(42, len - 12);
  const s = (len - body) / 2;
  const bands = resistorBands(c.value);
  return (
    <g transform={`translate(${a.x},${a.y}) rotate(${ang})`}>
      <title>{tooltip(c)}</title>
      {error && <rect x={s - 4} y={-11} width={body + 8} height={22} rx={11} className="bb-error-glow-fill" />}
      <line x1="0" y1="0" x2={len} y2="0" stroke="#8d9096" strokeWidth="2.2" strokeLinecap="round" />
      <rect x={s} y={-6.5 + 2} width={body} height={13} rx={6.5} fill="rgba(0,0,0,.18)" />
      <rect x={s} y={-6.5} width={body} height={13} rx={6.5} fill="#e4cda4" stroke="#b39a72" strokeWidth="1" />
      {bands.map((col, i) => (
        <rect key={i} x={s + 7 + i * 7 + (i === 3 ? 4 : 0)} y={-6.5} width={3.4} height={13} fill={col} />
      ))}
      <rect x={s + 3} y={-4.5} width={body - 6} height={2.2} rx={1} fill="rgba(255,255,255,.45)" />
      {[0, len].map((x) => (
        <circle key={x} cx={x} cy={0} r="2.6" fill="#a7aab0" />
      ))}
    </g>
  );
}

function Led({ c, lit, error, uid }) {
  const a = holeXY(c.pins.anode);
  const k = holeXY(c.pins.cathode);
  const len = Math.hypot(k.x - a.x, k.y - a.y);
  const ang = (Math.atan2(k.y - a.y, k.x - a.x) * 180) / Math.PI;
  const cx = len / 2;
  const [hi, lo] = LED[c.color] || LED.red;
  const clip = `led-clip-${uid}`;
  return (
    <g transform={`translate(${a.x},${a.y}) rotate(${ang})`}>
      <title>{`${tooltip(c)} (anode → cathode)`}</title>
      <defs>
        <clipPath id={clip}>
          <rect x={cx - 14} y={-14} width={14 + 8.5} height={28} />
        </clipPath>
        <radialGradient id={`led-g-${uid}`} cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor={lit ? '#fff4ef' : hi} />
          <stop offset={lit ? '35%' : '55%'} stopColor={hi} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
      </defs>
      {lit && <circle cx={cx} cy={0} r={30} fill={`url(#led-glow)`} className="bb-led-glow" />}
      {error && <circle cx={cx} cy={0} r={16} className="bb-error-glow-fill" />}
      <line x1="0" y1="0" x2={len} y2="0" stroke="#8d9096" strokeWidth="2" />
      <circle cx={cx + 1.2} cy={2.5} r={11.5} fill="rgba(0,0,0,.2)" clipPath={`url(#${clip})`} />
      <circle cx={cx} cy={0} r={11.5} fill={lo} clipPath={`url(#${clip})`} />
      <circle cx={cx} cy={0} r={9} fill={`url(#led-g-${uid})`} opacity={lit ? 1 : 0.92} />
      <ellipse cx={cx - 3} cy={-3.5} rx={3.4} ry={2.2} fill="rgba(255,255,255,.55)" />
      <text x={cx - 6.5} y={-12.5} className="bb-led-pol">+</text>
    </g>
  );
}

function Ghost({ g }) {
  const pts = pinsOf(g);
  const [a, b] = pts;
  let shape;
  if (g.type === 'wire') shape = <path d={wirePath(a, b)} className="bb-ghost-line" />;
  else if (g.type === 'led') shape = <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={11} className="bb-ghost-line" />;
  else {
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
    shape = (
      <g transform={`translate(${a.x},${a.y}) rotate(${ang})`}>
        <line x1="0" y1="0" x2={len} y2="0" className="bb-ghost-line" />
        <rect x={(len - 42) / 2} y={-7} width={42} height={14} rx={7} className="bb-ghost-line" />
      </g>
    );
  }
  return (
    <g className="bb-ghost">
      {shape}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={7} className="bb-ghost-ring" />
      ))}
    </g>
  );
}

function Tag({ hole, text, tone, placement }) {
  const p = holeXY(hole);
  const w = text.length * 5.9 + 18;
  const below = placement === 'below-right';
  const x = below ? p.x + 8 : p.x - w - 8;
  const y = below ? p.y + 14 : p.y - 36;
  return (
    <g className={`bb-tag bb-tag--${tone}`}>
      <line x1={p.x} y1={p.y} x2={below ? x + 6 : x + w - 6} y2={below ? y + 2 : y + 18} className="bb-tag-leader" />
      <rect x={x} y={y} width={w} height={20} rx={10} />
      <text x={x + w / 2} y={y + 13.6} textAnchor="middle">
        {text}
      </text>
    </g>
  );
}

/* ------------------------------------------------------------------ board */

function BoardBase({ showLabels }) {
  const holes = [];
  const rows = [...RAILS, ...TOP_ROWS, ...BOTTOM_ROWS];
  for (const r of rows) {
    for (let col = 1; col <= COLUMNS; col++) {
      holes.push(<rect key={r + col} x={colX(col) - 4.5} y={ROW_Y[r] - 4.5} width={9} height={9} rx={1.6} className="bb-hole" />);
    }
  }
  return (
    <g>
      <rect x="0" y="0" width={W} height={H} rx="12" className="bb-body" />
      <rect x="6" y="6" width={W - 12} height="66" rx="8" className="bb-rail-band" />
      <rect x="6" y={H - 72} width={W - 12} height="66" rx="8" className="bb-rail-band" />
      <rect x={X0 - 16} y={ROW_Y.e + 13} width={W - 2 * X0 + 32} height={ROW_Y.f - ROW_Y.e - 26} rx="3" className="bb-channel" />
      {/* rail stripes */}
      <line x1={X0 - 12} x2={W - X0 + 12} y1={ROW_Y.tp - 12} y2={ROW_Y.tp - 12} className="bb-stripe bb-stripe--pos" />
      <line x1={X0 - 12} x2={W - X0 + 12} y1={ROW_Y.tn + 12} y2={ROW_Y.tn + 12} className="bb-stripe bb-stripe--neg" />
      <line x1={X0 - 12} x2={W - X0 + 12} y1={ROW_Y.bn - 12} y2={ROW_Y.bn - 12} className="bb-stripe bb-stripe--neg" />
      <line x1={X0 - 12} x2={W - X0 + 12} y1={ROW_Y.bp + 12} y2={ROW_Y.bp + 12} className="bb-stripe bb-stripe--pos" />
      {['tp', 'tn', 'bn', 'bp'].map((r) => (
        <g key={r} className={`bb-rail-sym ${r.endsWith('p') ? 'pos' : 'neg'}`}>
          <text x={24} y={ROW_Y[r] + 4.5}>{r.endsWith('p') ? '+' : '−'}</text>
          <text x={W - 24} y={ROW_Y[r] + 4.5}>{r.endsWith('p') ? '+' : '−'}</text>
        </g>
      ))}
      {holes}
      {showLabels && (
        <g className="bb-label">
          {Array.from({ length: COLUMNS }, (_, i) => i + 1).map((col) => (
            <g key={col} className={col % 5 === 0 || col === 1 ? 'major' : ''}>
              <text x={colX(col)} y={ROW_Y.a - 17} textAnchor="middle">{col}</text>
              <text x={colX(col)} y={ROW_Y.j + 24} textAnchor="middle">{col}</text>
            </g>
          ))}
          {[...TOP_ROWS, ...BOTTOM_ROWS].map((r) => (
            <g key={r}>
              <text x={X0 - 24} y={ROW_Y[r] + 3.5} textAnchor="middle">{r.toUpperCase()}</text>
              <text x={W - X0 + 24} y={ROW_Y[r] + 3.5} textAnchor="middle">{r.toUpperCase()}</text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

const MemoBase = memo(BoardBase);

function Breadboard({
  components = [],
  highlights,
  litComponentIds = [],
  currentFlowing = false,
  recent,
  highlightsStale = false,
  showLabels = true,
  compact = false,
  className = '',
}) {
  const hl = highlights || {};
  const errorIds = new Set(hl.errorComponentIds || []);
  const lit = new Set(litComponentIds);

  // Draw order: resistors, LEDs, then wires on top.
  const ordered = useMemo(() => {
    const order = { resistor: 0, led: 1, wire: 2 };
    return [...components].sort((a, b) => (order[a.type] ?? 1) - (order[b.type] ?? 1));
  }, [components]);

  const recentComp = recent && components.find((c) => c.id === recent.componentId);

  return (
    <svg
      viewBox={`-8 -8 ${W + 16} ${H + 16}`}
      className={`breadboard ${compact ? 'breadboard--compact' : ''} ${className}`}
      role="img"
      aria-label={`Live digital twin of the breadboard with ${components.length} placed items`}
    >
      <defs>
        <radialGradient id="led-glow">
          <stop offset="0%" stopColor="#ff5a4a" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#ff5a4a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ff5a4a" stopOpacity="0" />
        </radialGradient>
        <marker id="bb-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" className="bb-arrow-head" />
        </marker>
        <filter id="bb-shadow" x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter={compact ? undefined : 'url(#bb-shadow)'}>
        <MemoBase showLabels={showLabels && !compact} />
      </g>

      {/* node strip highlights */}
      <g className={highlightsStale ? 'bb-hl-stale' : ''}>
        {(hl.errorNodes || []).map((n) => {
          const r = nodeRect(n);
          return <rect key={`en-${n}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={5} className="bb-node bb-node--error" />;
        })}
        {(hl.suggestedNodes || []).map((n) => {
          const r = nodeRect(n);
          return <rect key={`sn-${n}`} x={r.x} y={r.y} width={r.w} height={r.h} rx={5} className="bb-node bb-node--suggest" />;
        })}
      </g>

      {(hl.ghosts || []).map((g) => (
        <Ghost key={g.id} g={g} />
      ))}

      {ordered.map((c, i) => {
        const isRecent = recent && recent.componentId === c.id;
        const err = errorIds.has(c.id) && !highlightsStale;
        return (
          <g key={`${c.id}-${isRecent ? recent.key : 'static'}`} className={isRecent ? 'bb-enter' : ''}>
            {c.type === 'wire' && <Wire c={c} error={err} flowing={currentFlowing} />}
            {c.type === 'resistor' && <Resistor c={c} error={err} />}
            {c.type === 'led' && <Led c={c} lit={lit.has(c.id)} error={err} uid={`${c.id}-${i}`} />}
          </g>
        );
      })}

      {/* insertion ripples */}
      {recentComp &&
        pinsOf(recentComp).map((p, i) => (
          <circle key={`${recent.key}-${i}`} cx={p.x} cy={p.y} r="6" className="bb-ripple" />
        ))}

      {/* corrections, target rings and tags */}
      <g className={highlightsStale ? 'bb-hl-stale' : ''}>
        {(hl.corrections || []).map((cr, i) => (
          <path key={`cr-${i}`} d={wirePath(holeXY(cr.anchor), holeXY(cr.to))} className="bb-correction" />
        ))}
        {(hl.guides || []).map((g, i) => {
          const a = holeXY(g.from);
          const b = holeXY(g.to);
          const mx = (a.x + b.x) / 2;
          const my = Math.min(a.y, b.y) - 16;
          return <path key={`gd-${i}`} d={`M${a.x},${a.y - 6} Q${mx},${my} ${b.x},${b.y - 7}`} className="bb-guide" markerEnd="url(#bb-arrow)" />;
        })}
        {(hl.errorHoles || []).map((h) => {
          const p = holeXY(h);
          return <circle key={`eh-${h}`} cx={p.x} cy={p.y} r="8" className="bb-ring bb-ring--error" />;
        })}
        {(hl.suggestedHoles || []).map((h) => {
          const p = holeXY(h);
          return (
            <g key={`sh-${h}`}>
              <circle cx={p.x} cy={p.y} r="8" className="bb-ring bb-ring--suggest" />
              <circle cx={p.x} cy={p.y} r="8" className="bb-ring-pulse" />
            </g>
          );
        })}
        {!compact && (hl.tags || []).map((t, i) => <Tag key={`tag-${i}`} {...t} />)}
      </g>
    </svg>
  );
}

export default memo(Breadboard);
