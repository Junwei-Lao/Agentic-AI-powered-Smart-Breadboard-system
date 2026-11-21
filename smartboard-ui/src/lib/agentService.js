/**
 * Mock conversational agent service.
 *
 * `askAgent` has the same shape a real LLM-backed service would have:
 * it receives the user's question plus live board context and resolves to
 * the tools it used and a reply message. Replace the body with an API call
 * (e.g. Claude with tool use) to go live — no UI changes required.
 */
import { agentPlaybook as P } from '../data/agentPlaybook.js';
import { fill, issueBlocks, newMessageId } from './agentEngine.js';

const LATENCY_MS = 900;

function measurementSummary(measurements) {
  if (!measurements) return 'No device is connected, so live readings are unavailable.';
  const fmt = (id) => {
    const m = measurements.find((x) => x.id === id);
    return m && m.available && m.value != null ? `${m.value.toFixed(m.precision)} ${m.unit}` : null;
  };
  const cur = fmt('current');
  return `Supply rail: ${fmt('supply') ?? '—'}. Loop current: ${cur ?? '—'}${cur === '0.0 mA' ? ' (the loop is not closed yet)' : ''}.`;
}

export function askAgent(question, { diagnostics, project, hardware }) {
  const q = question.toLowerCase();
  const tools = [
    { id: 'read_board_state', label: P.tools.read_board_state.label, detail: `${hardware.components.length} items on board` },
    { id: 'retrieve_concepts', label: P.tools.retrieve_concepts.label, detail: 'beginner notes' },
    { id: 'compose_answer', label: P.tools.compose_answer.label, detail: 'context-aware' },
  ];

  let blocks;
  const errors = diagnostics.issues.filter((i) => i.severity !== 'warning');
  const asksNext = /next|what (should|do) i|stuck|help|wrong|fix|error|problem/.test(q);

  if (asksNext) {
    if (errors.length) {
      blocks = issueBlocks(errors[0], { components: hardware.components, project }).filter((b) => b.type !== 'concept');
    } else if (diagnostics.status === 'complete') {
      blocks = [{ type: 'text', text: P.contextual.complete }];
    } else if (diagnostics.activeStep) {
      const step = project.steps.find((s) => s.id === diagnostics.activeStep.id);
      blocks = [{ type: 'next', title: step.title, text: step.guidance }];
    }
  }

  if (!blocks) {
    const scored = P.knowledge
      .map((k) => ({ k, score: k.keywords.filter((w) => q.includes(w)).length }))
      .sort((a, b) => b.score - a.score);
    const hit = scored[0]?.score ? scored[0].k : null;
    blocks = [
      {
        type: 'text',
        text: hit ? fill(hit.answer, { measurementSummary: measurementSummary(hardware.measurements) }) : P.fallback,
      },
    ];
  }

  const message = { id: newMessageId('agent'), role: 'agent', proactive: false, tone: 'info', ts: Date.now(), blocks };
  return new Promise((resolve) => setTimeout(() => resolve({ tools, message }), LATENCY_MS));
}
