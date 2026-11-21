/**
 * Breadboard model: hole ids, electrical nodes and formatting helpers.
 *
 * Hole id format
 *   terminal holes: '<row><col>'  row ∈ a–j, col ∈ 1–30   e.g. 'b10'
 *   rail holes:     '<rail><col>' rail ∈ tp | tn | bn | bp  e.g. 'tn17'
 *     tp = top + rail, tn = top − rail, bn = bottom − rail, bp = bottom + rail
 *
 * Node (internal metal strip) ids
 *   'T<col>' for rows a–e, 'B<col>' for rows f–j, and the rail id for rails.
 */

export const COLUMNS = 30;
export const TOP_ROWS = ['a', 'b', 'c', 'd', 'e'];
export const BOTTOM_ROWS = ['f', 'g', 'h', 'i', 'j'];
export const TERMINAL_ROWS = [...TOP_ROWS, ...BOTTOM_ROWS];
export const RAILS = ['tp', 'tn', 'bn', 'bp'];

export const RAIL_META = {
  tp: { polarity: '+', side: 'top', label: 'top + rail' },
  tn: { polarity: '−', side: 'top', label: 'top − rail' },
  bn: { polarity: '−', side: 'bottom', label: 'bottom − rail' },
  bp: { polarity: '+', side: 'bottom', label: 'bottom + rail' },
};

const HOLE_RE = /^(tp|tn|bn|bp|[a-j])(\d{1,2})$/;

export function parseHole(id) {
  const m = HOLE_RE.exec(id || '');
  if (!m) return null;
  const col = Number(m[2]);
  if (col < 1 || col > COLUMNS) return null;
  return { row: m[1], col, isRail: m[1].length === 2 };
}

export const holeId = (row, col) => `${row}${col}`;

export function nodeOfHole(id) {
  const h = parseHole(id);
  if (!h) return null;
  if (h.isRail) return h.row;
  return TOP_ROWS.includes(h.row) ? `T${h.col}` : `B${h.col}`;
}

export function holesOfNode(node) {
  if (RAILS.includes(node)) {
    return Array.from({ length: COLUMNS }, (_, i) => holeId(node, i + 1));
  }
  const half = node[0];
  const col = Number(node.slice(1));
  const rows = half === 'T' ? TOP_ROWS : BOTTOM_ROWS;
  return rows.map((r) => holeId(r, col));
}

export const isRailNode = (node) => RAILS.includes(node);

/** Human-readable hole label: 'A15' or '− rail · 17'. */
export function formatHole(id) {
  const h = parseHole(id);
  if (!h) return String(id);
  if (h.isRail) return `${RAIL_META[h.row].polarity} rail ${h.col}`;
  return `${h.row.toUpperCase()}${h.col}`;
}

export function formatNode(node) {
  if (isRailNode(node)) return RAIL_META[node].label;
  const rows = node[0] === 'T' ? 'A–E' : 'F–J';
  return `column ${node.slice(1)} (${rows})`;
}

export function columnOfNode(node) {
  return isRailNode(node) ? null : Number(node.slice(1));
}

/** [[pinName, holeId], ...] for a component. */
export const componentPins = (component) => Object.entries(component?.pins || {});

/** Map holeId -> { componentId, pin } for all occupied holes. */
export function occupiedHoles(components) {
  const map = new Map();
  for (const c of components) {
    for (const [pin, hole] of componentPins(c)) map.set(hole, { componentId: c.id, pin });
  }
  return map;
}

/**
 * Pick a free hole in `node`, preferring `preferRow` and then the hole
 * closest to it.
 */
export function findFreeHole(node, components, preferRow) {
  const used = occupiedHoles(components);
  const holes = holesOfNode(node).filter((h) => !used.has(h));
  if (!holes.length) return null;
  if (!preferRow) return holes[0];
  const order = isRailNode(node) ? null : TERMINAL_ROWS;
  const exact = holes.find((h) => parseHole(h).row === preferRow);
  if (exact || !order) return exact || holes[0];
  const target = order.indexOf(preferRow);
  return holes
    .slice()
    .sort((x, y) => Math.abs(order.indexOf(parseHole(x).row) - target) - Math.abs(order.indexOf(parseHole(y).row) - target))[0];
}

export function formatResistance(ohms) {
  if (ohms == null) return '';
  if (ohms >= 1e6) return `${+(ohms / 1e6).toFixed(2)} MΩ`;
  if (ohms >= 1e3) return `${+(ohms / 1e3).toFixed(2)} kΩ`;
  return `${ohms} Ω`;
}

export function componentName(c) {
  if (!c) return 'component';
  if (c.type === 'resistor') return `${formatResistance(c.value)} resistor`;
  if (c.type === 'led') return `${c.color || ''} LED`.trim();
  if (c.type === 'wire') return `${c.color || ''} jumper wire`.trim();
  return c.type;
}

export function summarizeComponents(components) {
  const parts = components.filter((c) => c.type !== 'wire').length;
  const wires = components.filter((c) => c.type === 'wire').length;
  return { parts, wires, total: components.length };
}
