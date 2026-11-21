/**
 * Circuit validator.
 *
 * Compares the observed board (placed components) to a project's reference
 * circuit and returns a plain diagnostics object. It contains *codes and
 * data only* — human-readable text is produced by the agent layer.
 */
import { buildNetlist } from './netlist.js';
import {
  componentPins,
  findFreeHole,
  isRailNode,
  nodeOfHole,
  parseHole,
  summarizeComponents,
  columnOfNode,
} from './boardModel.js';

const EMPTY = {
  status: 'empty',
  issues: [],
  steps: [],
  activeStep: null,
  progress: { done: 0, total: 0, ratio: 0 },
  nets: [],
  matchedNets: 0,
  totalNets: 0,
  netsTraced: 0,
  summary: { parts: 0, wires: 0, total: 0 },
  matches: {},
};

const issueKey = (i) => `${i.code}:${i.componentId || ''}:${i.wrongHole || ''}`;

/** All true/false combinations for n flags. */
function combos(n) {
  const out = [];
  for (let m = 0; m < 1 << n; m++) out.push(Array.from({ length: n }, (_, i) => Boolean(m & (1 << i))));
  return out;
}

export function validateCircuit({ components = [], project, boardConfig }) {
  const reference = project?.reference;
  if (!reference) return { ...EMPTY, status: 'unsupported' };

  const netlist = buildNetlist(components, boardConfig);
  const refComps = Object.fromEntries(reference.components.map((rc) => [rc.ref, rc]));

  /* 1 ─ match placed parts to reference parts by type (prefer same value) */
  const used = new Set();
  const matches = {};
  for (const rc of reference.components) {
    const candidates = components.filter((c) => c.type === rc.type && !used.has(c.id));
    const best = candidates.find((c) => rc.value == null || c.value === rc.value) || candidates[0];
    if (best) {
      matches[rc.ref] = best;
      used.add(best.id);
    }
  }

  /* 2 ─ resolve reference terms to nets for a given orientation */
  const nonPolar = reference.components.filter((rc) => !rc.polarized && matches[rc.ref]).map((rc) => rc.ref);

  const resolve = (term, orient, swapped) => {
    if (term === 'VCC') return netlist.vccNet;
    if (term === 'GND') return netlist.gndNet;
    const [ref, pin] = term.split('.');
    const comp = matches[ref];
    if (!comp) return null;
    const rc = refComps[ref];
    let actual = pin;
    if (!rc.polarized) {
      const keys = Object.keys(comp.pins);
      const idx = pin === 'a' ? 0 : 1;
      actual = keys[orient[ref] ? 1 - idx : idx];
    } else if (swapped[ref]) {
      actual = rc.pins[1 - rc.pins.indexOf(pin)];
    }
    return netlist.netOfPin(comp.id, actual);
  };

  const evaluate = (orient, swapped = {}) =>
    reference.nets.map((n) => {
      const memberNets = n.members.map((m) => ({ term: m, net: resolve(m, orient, swapped) }));
      const pending = memberNets.some((m) => m.net == null);
      const satisfied = !pending && memberNets.every((m) => m.net === memberNets[0].net);
      return { id: n.id, label: n.label, members: memberNets, pending, satisfied };
    });

  const score = (results) => results.filter((r) => r.satisfied).length;

  const bestOf = (swapped) => {
    let best = null;
    for (const flags of combos(nonPolar.length)) {
      const orient = Object.fromEntries(nonPolar.map((ref, i) => [ref, flags[i]]));
      const results = evaluate(orient, swapped);
      if (!best || score(results) > score(best.results)) best = { orient, results };
    }
    return best;
  };

  const { orient, results: netResults } = bestOf({});
  const netById = Object.fromEntries(netResults.map((r) => [r.id, r]));
  const matchedNets = score(netResults);

  /* 3 ─ issue detection */
  const issues = [];

  if (netlist.shorted) {
    issues.push({ code: 'SHORT_CIRCUIT', severity: 'critical', netIds: [] });
  }

  // Polarized parts inserted backwards.
  for (const rc of reference.components) {
    if (!rc.polarized || !matches[rc.ref]) continue;
    const swappedBest = bestOf({ [rc.ref]: true });
    if (score(swappedBest.results) > matchedNets) {
      const comp = matches[rc.ref];
      const fixedNets = swappedBest.results.filter((r, i) => r.satisfied && !netResults[i].satisfied).map((r) => r.id);
      issues.push({
        code: 'LED_REVERSED',
        severity: 'error',
        componentId: comp.id,
        netIds: fixedNets,
        holes: Object.values(comp.pins),
        context: { anode: comp.pins.anode, cathode: comp.pins.cathode },
      });
    }
  }

  // Wire end landing in a dead (unconnected) column next to where it should be.
  const wires = components.filter((c) => c.type === 'wire');
  const flaggedWires = new Set();
  for (const r of netResults) {
    if (r.satisfied || r.pending) continue;
    if (issues.some((i) => i.netIds?.includes(r.id))) continue;
    for (const w of wires) {
      if (flaggedWires.has(w.id)) continue;
      const wireNet = netlist.netOfPin(w.id, Object.keys(w.pins)[0]);
      const anchor = r.members.find((m) => m.net === wireNet);
      const target = r.members.find((m) => m.net !== wireNet && m.term.includes('.'));
      if (!anchor || !target) continue;
      for (const [pin, hole] of componentPins(w)) {
        const node = nodeOfHole(hole);
        if (!node || isRailNode(node)) continue;
        const others = components.some(
          (c) => c.id !== w.id && componentPins(c).some(([, h]) => nodeOfHole(h) === node),
        );
        if (others) continue;
        // `hole` is a dangling wire end → suggest the target pin's column.
        const [tRef, tPin] = target.term.split('.');
        const tComp = matches[tRef];
        const tActualPin = refComps[tRef].polarized
          ? tPin
          : Object.keys(tComp.pins)[(tPin === 'a') !== Boolean(orient[tRef]) ? 0 : 1];
        const targetNode = netlist.nodeOfPin(tComp.id, tActualPin);
        const suggestedHole = findFreeHole(targetNode, components, parseHole(hole).row);
        issues.push({
          code: 'MISPLACED_WIRE_END',
          severity: 'error',
          componentId: w.id,
          netIds: [r.id],
          wrongHole: hole,
          wrongPin: pin,
          wrongNode: node,
          suggestedHole,
          targetNode,
          context: {
            anchorTerm: anchor.term,
            targetTerm: target.term,
            targetComponentId: tComp.id,
            targetPin: tActualPin,
            wrongCol: columnOfNode(node),
            targetCol: columnOfNode(targetNode),
          },
        });
        flaggedWires.add(w.id);
        break;
      }
    }
  }

  // Wrong resistor values / unexpected parts (warnings).
  for (const rc of reference.components) {
    const c = matches[rc.ref];
    if (c && rc.value != null && c.value !== rc.value) {
      issues.push({ code: 'WRONG_RESISTOR_VALUE', severity: 'warning', componentId: c.id, netIds: [], context: { actual: c.value, expected: rc.value } });
    }
  }
  for (const c of components) {
    if (c.type !== 'wire' && !used.has(c.id)) {
      issues.push({ code: 'UNEXPECTED_COMPONENT', severity: 'warning', componentId: c.id, netIds: [], holes: Object.values(c.pins) });
    }
  }
  issues.forEach((i) => (i.key = issueKey(i)));

  /* 4 ─ step progress */
  const allComponents = reference.components.every((rc) => matches[rc.ref]);
  const allNets = matchedNets === netResults.length;
  const hasErrors = issues.some((i) => i.severity !== 'warning');
  const reqPass = (req) => {
    if (req.component) return Boolean(matches[req.component]);
    if (req.net) return Boolean(netById[req.net]?.satisfied);
    if (req.allNets) return allComponents && allNets && !hasErrors;
    return false;
  };
  const errorNetIds = new Set(issues.filter((i) => i.severity !== 'warning').flatMap((i) => i.netIds || []));
  let activeFound = false;
  const steps = (project.steps || []).map((s) => {
    const done = s.requires.every(reqPass);
    const hasError = s.requires.some((r) => r.net && errorNetIds.has(r.net));
    let status = done ? 'done' : hasError ? 'error' : 'pending';
    if (!done && !activeFound) {
      activeFound = true;
      if (status === 'pending') status = 'active';
    }
    return { id: s.id, label: s.label, title: s.title, status };
  });
  const doneCount = steps.filter((s) => s.status === 'done').length;

  let status = 'in_progress';
  if (!components.length) status = 'empty';
  else if (hasErrors) status = 'error';
  else if (allComponents && allNets) status = 'complete';

  const tracedNets = [...netlist.nets.values()].filter((n) => n.pins.length > 0).length;

  return {
    status,
    issues,
    steps,
    activeStep: steps.find((s) => s.status !== 'done') || null,
    progress: { done: doneCount, total: steps.length, ratio: steps.length ? doneCount / steps.length : 0 },
    nets: netResults.map(({ id, label, satisfied, pending }) => ({ id, label, satisfied, pending })),
    matchedNets,
    totalNets: netResults.length,
    netsTraced: tracedNets,
    summary: summarizeComponents(components),
    matches: Object.fromEntries(Object.entries(matches).map(([ref, c]) => [ref, c.id])),
  };
}
