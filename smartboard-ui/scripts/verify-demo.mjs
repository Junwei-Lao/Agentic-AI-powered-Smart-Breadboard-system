/**
 * Headless check of the demo sequence: runs every scripted emulator step
 * through the hardware reducer, validator and agent engine and asserts the
 * expected diagnostics. Run with `npm run verify`.
 */
import assert from 'node:assert/strict';
import { applyHardwareEvent, initialHardwareState } from '../src/lib/hardwareEvents.js';
import { nextDemoEvents, simulateSensors, emulatorActions, demoProgress } from '../src/lib/virtualDevice.js';
import { validateCircuit } from '../src/lib/circuitValidator.js';
import { planAgentRun } from '../src/lib/agentEngine.js';
import { deriveBoardHighlights } from '../src/lib/highlights.js';
import { holesOfNode, parseHole } from '../src/lib/boardModel.js';
import { reportSession, toSessionCsv } from '../src/lib/sessionReport.js';
import { askAgent } from '../src/lib/agentService.js';
import { projects, boardConfig } from '../src/data/mockData.js';

const project = projects.find((p) => p.id === 'led-basic');
let state = initialHardwareState;
let prev = null;
const apply = (events) => {
  for (const e of events) {
    state = applyHardwareEvent(state, e);
    Object.assign(state, simulateSensors(state.components, boardConfig, state.connection === 'connected'));
  }
};

const expected = [
  { status: 'empty', done: 0 },
  { status: 'in_progress', done: 1 },
  { status: 'in_progress', done: 2 },
  { status: 'in_progress', done: 3 },
  { status: 'error', done: 3, issue: 'MISPLACED_WIRE_END' },
  { status: 'complete', done: 5 },
];

let i = 0;
let step;
while ((step = nextDemoEvents(state))) {
  apply(step.events.map(event => ({ ...event, ts: (i + 1) * 1000 })));
  const d = validateCircuit({ components: state.components, project, boardConfig });
  const run = planAgentRun({ event: state.events[0], prevDiagnostics: prev, diagnostics: d, project, hardware: state });
  const hl = deriveBoardHighlights(d, project, state.components);
  prev = d;
  const exp = expected[i++];
  const cur = state.measurements?.find((m) => m.id === 'current')?.value;
  console.log(`\n[${step.step.id}] ${step.step.label}\n  status=${d.status} steps=${d.progress.done}/${d.progress.total} nets=${d.matchedNets}/${d.totalNets} current=${cur?.toFixed(1)}mA lit=${state.litComponentIds}`);
  console.log('  tools:', run.tools.map((t) => `${t.label} (${t.detail})`).join(' | '));
  for (const b of run.message.blocks) console.log(`  · ${b.type}: ${b.title ? b.title + ' — ' : ''}${b.text}`);
  if (hl.errorHoles.length || hl.ghosts.length) console.log('  highlights:', JSON.stringify({ err: hl.errorHoles, sug: hl.suggestedHoles, ghosts: hl.ghosts.map((g) => g.id) }));
  assert.equal(d.status, exp.status, `status at step ${step.step.id}`);
  assert.equal(d.progress.done, exp.done, `progress at step ${step.step.id}`);
  if (exp.issue) {
    const issue = d.issues.find((x) => x.code === exp.issue);
    assert.ok(issue, 'expected issue');
    assert.equal(issue.wrongHole, 'a16');
    assert.equal(issue.suggestedHole, 'a15');
  }
}
assert.equal(i, expected.length, 'all demo steps executed');
assert.ok(demoProgress(state).every((s) => s.done), 'all nine demo states reached');
assert.deepEqual(state.litComponentIds, ['D1']);

// Extra: reversed LED is detected.
let s2 = initialHardwareState;
for (const a of ['connect', 'insertResistor']) for (const e of emulatorActions[a].events(s2)) s2 = applyHardwareEvent(s2, e);
s2 = { ...s2, components: [...s2.components, { id: 'D1', type: 'led', color: 'red', pins: { anode: 'c15', cathode: 'c14' } }] };
const d2 = validateCircuit({ components: s2.components, project, boardConfig });
assert.ok(d2.issues.some((x) => x.code === 'LED_REVERSED'), 'reversed LED detected');

const ans = await askAgent('What should I do next?', { diagnostics: d2, project, hardware: s2 });
console.log('\nChat answer:', ans.message.blocks.map((b) => b.title || b.text).join(' / '));
console.log('\n✔ Demo sequence verified: all 9 states reached and validated.');

const report = reportSession(state.events, project, boardConfig);
assert.equal(report.fullHistory, true);
assert.equal(report.recoveryMs, 1000);
assert.match(report.rows.at(-2).issues.join(' '), /MISPLACED_WIRE_END/);
assert.equal(report.rows.at(-1).status, 'complete');
assert.match(toSessionCsv(report.rows, project), /COMPONENT_MOVED.*A16.*A15.*complete/);
const partial = reportSession(state.events.slice(0, -1), project, boardConfig);
assert.equal(partial.fullHistory, false);
assert.equal(partial.recoveryMs, null);
assert.equal(partial.rows.at(-1).status, '');
const resetState = applyHardwareEvent(state, { ...emulatorActions.reset.events()[0], ts: 7000 });
assert.equal(reportSession(resetState.events, project, boardConfig).recoveryMs, null);
assert.equal(holesOfNode('tp').length, 25);
assert.equal(parseHole('tp26'), null);
assert.ok(parseHole('a30'));
console.log('✔ Professional trace, timing, CSV, reset, and 400-point geometry verified.');
