import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { boardConfig, DEFAULT_PROJECT_ID, projects } from '../src/data/mockData.js';
import { applyHardwareEvent, initialHardwareState } from '../src/lib/hardwareEvents.js';
import { emulatorActions, simulateSensors } from '../src/lib/virtualDevice.js';
import { inspectSnapshot, runNemotron } from '../server/nemotron.js';
import { nemotronMiddleware } from '../server/nemotronMiddleware.js';

const project = projects.find(item => item.id === DEFAULT_PROJECT_ID);
const apply = (state, action) => emulatorActions[action].events(state).reduce(applyHardwareEvent, state);
const view = ({ components }) => inspectSnapshot({ projectId: project.id, components });
const initial = apply(initialHardwareState, 'loadDebugChallenge');
const faulty = view(initial);
const ids = Object.fromEntries(faulty.actions.map(action => [action.code, action.id]));
assert.match(faulty.actions.find(action => action.code === 'MISPLACED_WIRE_END').instruction, /A16 to A15/);
assert.ok(ids.LED_REVERSED);
for (const sequence of [['correctGround', 'rotateLed'], ['rotateLed', 'correctGround']]) {
  const partiallyFixed = apply(initial, sequence[0]);
  assert.equal(view(partiallyFixed).actions.length, 1);
  assert.equal(view(partiallyFixed).diagnostics.status, 'error');
  assert.equal(simulateSensors(partiallyFixed.components, boardConfig, true).litComponentIds.length, 0);
  const fixed = apply(partiallyFixed, sequence[1]);
  assert.equal(view(fixed).diagnostics.status, 'complete');
  assert.deepEqual(simulateSensors(fixed.components, boardConfig, true).litComponentIds, ['D1']);
}
console.log('Two hardware faults are detected and can be fixed in either order.');

const toolResponse = (name, args, id) => Response.json({
  id: 'mock-request-' + id,
  choices: [{ message: {
    content: null,
    tool_calls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  } }],
});
function fakeProvider(actionId = ids.MISPLACED_WIRE_END) {
  let round = 0;
  return async (url, options) => {
    assert.equal(url, 'https://integrate.api.nvidia.com/v1/chat/completions');
    const body = JSON.parse(options.body);
    assert.match(body.model, /^nvidia\/nemotron/);
    if (round++ === 0) return toolResponse('inspect_circuit', {}, 'inspect');
    if (round === 2) {
      const evidence = JSON.parse(body.messages.at(-1).content);
      assert.equal(evidence.actions.length, 2);
      return toolResponse('trace_hole', { hole: 'a16' }, 'trace');
    }
    return toolResponse('select_next_action', { action_id: actionId, explanation: 'The ground jumper is on an unused column.' }, 'select');
  };
}
const liveShape = await runNemotron(faulty, { key: 'fake-key', fetcher: fakeProvider() });
assert.equal(liveShape.mode, 'nemotron');
assert.equal(liveShape.action.code, 'MISPLACED_WIRE_END');
assert.deepEqual(liveShape.activity.map(step => step.name), ['inspect_circuit', 'trace_hole', 'select_next_action']);
assert.equal((await runNemotron(faulty, { key: 'fake-key', fetcher: fakeProvider('imaginary') })).mode, 'local');
assert.equal((await runNemotron(faulty, { key: 'fake-key', fetcher: async () => new Response(null, { status: 429 }) })).reason, 'provider_http_429');
assert.equal((await runNemotron(faulty)).reason, 'missing_key');

const handler = nemotronMiddleware({ NVIDIA_API_KEY: 'fake-key' }, fakeProvider());
const server = createServer((req, res) => handler(req, res, () => res.writeHead(404).end())).listen(0, '127.0.0.1');
await once(server, 'listening');
try {
  const url = 'http://127.0.0.1:' + server.address().port + '/api/nemotron/triage';
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId: project.id, components: initial.components }),
  });
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.mode, 'nemotron');
  assert.match(result.action.instruction, /A16 to A15/);
  assert.ok(!JSON.stringify(result).includes('fake-key'));
} finally {
  server.close();
}
console.log('Mocked NIM tool protocol, server endpoint, rejected action, and local fallback verified.');

if (process.argv.includes('--live')) {
  const key = process.env.NVIDIA_API_KEY?.trim();
  if (!key) throw new Error('Add NVIDIA_API_KEY to .env.local before running the live check.');
  let board = initial;
  for (const stage of ['two faults', 'remaining fault', 'reference matched']) {
    const start = Date.now();
    const result = await runNemotron(view(board), { key, model: process.env.NVIDIA_MODEL?.trim() || undefined });
    assert.equal(result.mode, 'nemotron', `Live NVIDIA check failed at ${stage}: ${result.reason}`);
    const actionName = { MISPLACED_WIRE_END: 'correctGround', LED_REVERSED: 'rotateLed' }[result.action.code];
    if (stage === 'reference matched') assert.equal(result.action.code, 'REFERENCE_MATCHED');
    else assert.ok(actionName);
    console.log(JSON.stringify({
      stage, model: result.model, latency_ms: Date.now() - start, request_id: result.providerRequestId,
      selected_action: result.action.code, tools: result.activity.map(entry => entry.name),
    }));
    if (actionName) board = apply(board, actionName);
  }
}
