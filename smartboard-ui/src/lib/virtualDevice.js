/**
 * Virtual Smart Breadboard.
 *
 * Stands in for the physical prototype: it produces the same hardware events
 * the real firmware will send, plus simulated sensor readings. Only the
 * Hardware Emulator page drives it.
 */
import { buildNetlist } from './netlist.js';
import { createHardwareEvent } from './hardwareEvents.js';
import { demoParts, demoStates, virtualDevice } from '../data/mockData.js';

const LED_FORWARD_V = 2.0;

/* --------------------------------------------------------- sensor model */

/**
 * Very small DC model good enough for single-loop LED circuits:
 * +V → resistor → LED (anode→cathode) → GND.
 */
export function simulateSensors(components, boardConfig, connected) {
  if (!connected) return { measurements: null, litComponentIds: [] };
  const net = buildNetlist(components, boardConfig);
  const supply = net.shorted ? 0 : boardConfig.supplyVoltage;
  const lit = [];
  let current = 0;
  let resistorPower = null;
  let ledVf = null;

  for (const led of components.filter((c) => c.type === 'led')) {
    const an = net.netOfPin(led.id, 'anode');
    const ca = net.netOfPin(led.id, 'cathode');
    if (ca !== net.gndNet || !an || net.shorted) continue;
    const r = components.find((c) => {
      if (c.type !== 'resistor') return false;
      const [p1, p2] = Object.keys(c.pins).map((p) => net.netOfPin(c.id, p));
      return (p1 === an && p2 === net.vccNet) || (p2 === an && p1 === net.vccNet);
    });
    if (r) {
      const i = (supply - LED_FORWARD_V) / r.value; // amps
      current += i * 1000;
      resistorPower = i * i * r.value * 1000;
      ledVf = LED_FORWARD_V;
      lit.push(led.id);
    }
  }

  return {
    litComponentIds: lit,
    measurements: [
      { id: 'supply', label: 'Supply rail', value: supply, unit: 'V', precision: 2, available: true },
      { id: 'current', label: 'Loop current', value: current, unit: 'mA', precision: 1, available: true, max: 20 },
      { id: 'led_vf', label: 'LED forward drop', value: ledVf, unit: 'V', precision: 2, available: ledVf != null },
      { id: 'r_power', label: 'Resistor power', value: resistorPower, unit: 'mW', precision: 1, available: resistorPower != null },
    ],
  };
}

/* ------------------------------------------------------ emulator actions */

const has = (s, id) => s.components.some((c) => c.id === id);
const find = (s, id) => s.components.find((c) => c.id === id);
const connected = (s) => s.connection === 'connected';
const inserted = (component) => createHardwareEvent('COMPONENT_INSERTED', { component: { ...component, pins: { ...component.pins } } });

export const emulatorActions = {
  connect: {
    label: 'Connect virtual device',
    available: (s) => s.connection === 'disconnected',
    isDone: (s) => connected(s),
    events: () => [createHardwareEvent('DEVICE_CONNECTED', { device: virtualDevice })],
  },
  disconnect: {
    label: 'Disconnect',
    available: (s) => connected(s),
    events: () => [createHardwareEvent('DEVICE_DISCONNECTED')],
  },
  insertResistor: {
    label: 'Insert resistor',
    hint: '220 Ω · B10 → B14',
    available: (s) => connected(s) && !has(s, 'R1'),
    isDone: (s) => has(s, 'R1'),
    events: () => [inserted(demoParts.resistor)],
  },
  insertLed: {
    label: 'Insert LED',
    hint: 'Anode C14 · Cathode C15',
    available: (s) => connected(s) && !has(s, 'D1'),
    isDone: (s) => has(s, 'D1'),
    events: () => [inserted(demoParts.led)],
  },
  rotateLed: {
    label: 'Rotate LED 180°',
    available: (s) => connected(s) && has(s, 'D1'),
    events: (s) => {
      const led = find(s, 'D1');
      return [
        removeComponentEvent(s, led.id),
        inserted({ ...led, pins: { anode: led.pins.cathode, cathode: led.pins.anode } }),
      ];
    },
  },
  loadDebugChallenge: {
    label: 'Load two-fault challenge',
    available: (s) => s.connection !== 'connecting',
    events: (s) => [
      ...(connected(s) ? [] : emulatorActions.connect.events()),
      ...emulatorActions.reset.events(),
      inserted(demoParts.resistor),
      inserted({ ...demoParts.led, pins: { anode: demoParts.led.pins.cathode, cathode: demoParts.led.pins.anode } }),
      inserted(demoParts.powerWire),
      inserted(demoParts.groundWireWrong),
    ],
  },
  addPowerWire: {
    label: 'Add positive supply wire',
    hint: '+ rail 8 → A10',
    available: (s) => connected(s) && !has(s, 'W1'),
    isDone: (s) => has(s, 'W1'),
    events: () => [inserted(demoParts.powerWire)],
  },
  insertWrongGround: {
    label: 'Insert incorrect ground wire',
    hint: '− rail 17 → A16 (wrong column)',
    available: (s) => connected(s) && !has(s, 'W2'),
    isDone: (s) => has(s, 'W2'),
    events: () => [inserted(demoParts.groundWireWrong)],
  },
  correctGround: {
    label: 'Correct ground wire',
    hint: 'Move A16 → A15',
    available: (s) => connected(s) && has(s, 'W2') && find(s, 'W2').pins.b !== demoParts.groundWireCorrect.pins.b,
    isDone: (s) => has(s, 'W2') && find(s, 'W2').pins.b === demoParts.groundWireCorrect.pins.b,
    events: (s) => [
      createHardwareEvent('COMPONENT_MOVED', {
        componentId: 'W2',
        pin: 'b',
        from: find(s, 'W2').pins.b,
        to: demoParts.groundWireCorrect.pins.b,
      }),
    ],
  },
  reset: {
    label: 'Reset board',
    available: (s) => s.components.length > 0,
    events: () => [createHardwareEvent('BOARD_RESET')],
  },
};

export function removeComponentEvent(state, componentId) {
  const component = find(state, componentId);
  if (!component) return null;
  return createHardwareEvent('COMPONENT_REMOVED', { componentId, component });
}

/** Status of each of the nine demo states for the current board. */
export function demoProgress(state) {
  let lastActionDone = true;
  let nextFound = false;
  return demoStates.map((d) => {
    let done;
    if (d.auto) done = lastActionDone;
    else {
      done = emulatorActions[d.action].isDone(state);
      lastActionDone = done;
    }
    const isNext = !done && !d.auto && !nextFound;
    if (isNext) nextFound = true;
    return { ...d, done, isNext };
  });
}

/** Events for the next scripted demo step, or null when finished. */
export function nextDemoEvents(state) {
  const next = demoProgress(state).find((d) => d.isNext);
  if (!next) return null;
  const action = emulatorActions[next.action];
  return action.available(state) ? { step: next, events: action.events(state) } : null;
}
