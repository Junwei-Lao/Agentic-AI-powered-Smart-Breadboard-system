/**
 * Mock agent engine.
 *
 * Given a hardware event and the before/after diagnostics, plans an agent
 * "run": the tool calls it executes and the message it posts. All wording
 * comes from data/agentPlaybook.js. Replace `planAgentRun` with a call to a
 * real LLM agent later — the UI only consumes the returned objects.
 */
import { agentPlaybook as P } from '../data/agentPlaybook.js';
import { componentName, formatHole, formatNode, formatResistance, parseHole } from './boardModel.js';

/** Fill "{key}" placeholders. Unknown keys are left empty. */
export function fill(template, ctx = {}) {
  return String(template || '').replace(/\{(\w+)\}/g, (_, k) => (ctx[k] ?? '') + '');
}

let msgSeq = 0;
export const newMessageId = (prefix = 'msg') => `${prefix}-${Date.now().toString(36)}-${++msgSeq}`;

const termLabel = (term, project) => {
  if (term === 'GND') return { long: 'ground (− rail)', short: 'ground' };
  if (term === 'VCC') return { long: '+5 V rail', short: '+5 V' };
  const [ref, pin] = term.split('.');
  const rc = project?.reference?.components.find((c) => c.ref === ref);
  const name = rc?.type === 'led' ? 'LED' : rc?.label || ref;
  return { long: `${name} ${pin}`, short: `${name} ${pin}` };
};

export function componentSummaryText(components) {
  if (!components.length) return P.emptyBoard;
  const parts = components.filter((c) => c.type !== 'wire').map(componentName);
  const wires = components.filter((c) => c.type === 'wire').length;
  const bits = [];
  if (parts.length) bits.push(parts.join(', '));
  if (wires) bits.push(`${wires} jumper wire${wires > 1 ? 's' : ''}`);
  return bits.join(' and ');
}

function observationText(event, ctx) {
  if (!event) return fill(P.observations.session, ctx);
  const p = event.payload || {};
  const tpl = P.observations[event.type];
  if (event.type === 'COMPONENT_INSERTED') {
    const c = p.component;
    const t = tpl[c.type] || tpl.default;
    const pins = Object.values(c.pins);
    return fill(t, {
      value: formatResistance(c.value),
      pinList: pins.map(formatHole).join(' and '),
      anode: formatHole(c.pins.anode),
      cathode: formatHole(c.pins.cathode),
      color: c.color,
      from: formatHole(pins[0]),
      to: formatHole(pins[1]),
    });
  }
  if (event.type === 'COMPONENT_REMOVED') return fill(tpl, { componentName: componentName(p.component) });
  if (event.type === 'COMPONENT_MOVED') {
    const c = ctx.components.find((x) => x.id === p.componentId);
    return fill(tpl, { componentName: componentName(c), fromPin: formatHole(p.from), toPin: formatHole(p.to) });
  }
  return fill(tpl, ctx);
}

/** Text blocks for a diagnostic issue. */
export function issueBlocks(issue, { components, project }) {
  const t = P.issues[issue.code];
  if (!t) return [];
  const comp = components.find((c) => c.id === issue.componentId);
  const ctx = { ...(issue.context || {}) };
  if (issue.code === 'MISPLACED_WIRE_END') {
    const anchor = termLabel(issue.context.anchorTerm, project);
    const target = termLabel(issue.context.targetTerm, project);
    Object.assign(ctx, {
      wireColor: comp?.color || '',
      anchorLabel: anchor.long,
      anchorShort: anchor.short,
      targetLabel: target.long,
      wrongHole: formatHole(issue.wrongHole),
      suggestedHole: formatHole(issue.suggestedHole),
      wrongNode: formatNode(issue.wrongNode),
      terminalRows: parseHole(issue.suggestedHole)?.row >= 'f' ? 'F–J' : 'A–E',
    });
  }
  if (issue.code === 'LED_REVERSED') {
    ctx.anode = formatHole(issue.context.anode);
    ctx.cathode = formatHole(issue.context.cathode);
  }
  if (issue.code === 'WRONG_RESISTOR_VALUE') {
    ctx.actual = formatResistance(issue.context.actual);
    ctx.expected = formatResistance(issue.context.expected);
  }
  if (issue.code === 'UNEXPECTED_COMPONENT') {
    ctx.componentName = componentName(comp);
    ctx.pinList = Object.values(comp?.pins || {}).map(formatHole).join(' and ');
  }
  const blocks = [
    { type: 'issue', severity: issue.severity, title: t.title, text: fill(t.explanation, ctx), issueKey: issue.key },
    {
      type: 'action',
      text: fill(t.action, ctx),
      from: issue.wrongHole ? formatHole(issue.wrongHole) : null,
      to: issue.suggestedHole ? formatHole(issue.suggestedHole) : null,
    },
  ];
  if (issue.code === 'MISPLACED_WIRE_END' && issue.context.targetAfterRotation) {
    blocks[0].text = `The ${ctx.wireColor} wire ends in ${ctx.wrongHole}, an unused column. After rotating the LED, ${ctx.targetLabel} belongs in column ${ctx.targetCol}.`;
  }
  if (t.concept) blocks.push({ type: 'concept', title: t.concept.title, text: t.concept.body });
  return blocks;
}

function measurementOf(measurements, id) {
  return measurements?.find((m) => m.id === id && m.available && m.value != null);
}

/**
 * Plan a proactive agent run.
 * @returns {{ tools: {id,label,detail}[], message: object }}
 */
export function planAgentRun({ event, prevDiagnostics, diagnostics, project, hardware }) {
  const { components, device, measurements } = hardware;
  const d = diagnostics;
  const errors = d.issues.filter((i) => i.severity !== 'warning');
  const summary = d.summary;

  const tools = [
    {
      id: 'read_board_state',
      label: P.tools.read_board_state.label,
      detail: `${summary.parts} part${summary.parts === 1 ? '' : 's'} · ${summary.wires} wire${summary.wires === 1 ? '' : 's'}`,
    },
    { id: 'validate_connections', label: P.tools.validate_connections.label, detail: `${d.netsTraced} nets traced` },
    {
      id: 'compare_reference',
      label: P.tools.compare_reference.label,
      detail: `${d.matchedNets}/${d.totalNets} match${errors.length ? ` · ${errors.length} mismatch` : ''}`,
      tone: errors.length ? 'error' : d.status === 'complete' ? 'success' : undefined,
    },
    {
      id: 'generate_guidance',
      label: errors.length ? P.tools.generate_guidance.label : P.tools.generate_guidance.altLabel,
      detail: errors.length ? `${errors.length} corrective action${errors.length > 1 ? 's' : ''}` : d.activeStep ? d.activeStep.title : 'verification summary',
    },
  ];

  const ctx = {
    components,
    deviceName: device?.name || 'Device',
    componentSummary: componentSummaryText(components),
  };

  const blocks = [{ type: 'observation', text: observationText(event, ctx) }];

  if (event?.type === 'DEVICE_DISCONNECTED') {
    return { tools: tools.slice(0, 1), message: makeMessage(event, blocks, 'info') };
  }

  // Issues resolved since the last run.
  const prevKeys = new Set((prevDiagnostics?.issues || []).map((i) => i.key));
  const nowKeys = new Set(d.issues.map((i) => i.key));
  for (const prev of prevDiagnostics?.issues || []) {
    if (!nowKeys.has(prev.key) && P.issues[prev.code]) {
      blocks.push({ type: 'resolved', text: fill(P.resolved, { issueTitle: P.issues[prev.code].title }) });
    }
  }

  // New and persisting issues (most severe first).
  const sorted = [...d.issues].sort((a, b) => rank(b.severity) - rank(a.severity));
  for (const issue of sorted) {
    if (prevKeys.has(issue.key) && event) continue; // already explained
    blocks.push(...issueBlocks(issue, { components, project }));
  }

  let tone = errors.length ? 'error' : 'info';
  if (d.status === 'complete') {
    const cur = measurementOf(measurements, 'current');
    blocks.push({
      type: 'success',
      title: P.success.title,
      text: fill(P.success.body, {
        matched: d.matchedNets,
        measurementText: cur ? fill(P.success.measurementText, { current: cur.value.toFixed(1) }) : '',
      }),
      checks: d.nets.map((n) => ({ label: n.label, ok: n.satisfied })),
    });
    blocks.push({ type: 'concept', title: P.success.concept.title, text: P.success.concept.body });
    tone = 'success';
  } else if (!errors.length && d.activeStep) {
    const step = project.steps.find((s) => s.id === d.activeStep.id);
    blocks.push({ type: 'next', title: fill(P.nextStepPrefix, { stepTitle: step.title }), text: step.guidance });
  }

  return { tools, message: makeMessage(event, blocks, tone) };
}

const rank = (s) => ({ critical: 3, error: 2, warning: 1 })[s] || 0;

function makeMessage(event, blocks, tone) {
  return {
    id: newMessageId('agent'),
    role: 'agent',
    proactive: true,
    tone,
    trigger: event ? { type: event.type, eventId: event.id } : { type: 'SESSION' },
    ts: Date.now(),
    blocks,
  };
}

export function disconnectedMessage() {
  return {
    id: newMessageId('agent'),
    role: 'agent',
    proactive: true,
    tone: 'info',
    trigger: { type: 'STANDBY' },
    ts: Date.now(),
    blocks: [{ type: 'observation', text: P.disconnectedHint }],
  };
}
