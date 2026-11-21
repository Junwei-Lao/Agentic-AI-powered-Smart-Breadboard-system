/**
 * Development mock data (device, demo scenario, session history, settings).
 *
 * Everything that a real Smart Breadboard / backend would provide later lives
 * here so it can be swapped out without touching UI components.
 */

export { projects, DEFAULT_PROJECT_ID } from './projects.js';
export { agentPlaybook } from './agentPlaybook.js';

/* ------------------------------------------------------------------ device */

export const virtualDevice = {
  mode: 'virtual',
  name: 'Pinpoint Board One',
  model: 'PB-1 (400-point)',
  deviceId: 'PB1-VIRT-0042',
  serial: 'SIM-24-0042',
  firmware: 'v0.9.3-sim (placeholder)',
  hardwareRevision: 'Rev B (prototype target)',
  transport: 'Virtual loopback',
  latencyMs: 12,
  sampleRateHz: 50,
};

/**
 * Electrical configuration of the board. Consumed by the netlist builder and
 * the virtual sensor model.
 */
export const boardConfig = {
  columns: 30,
  supplyVoltage: 5,
  // Rails that are tied together internally by the device.
  linkedRails: [
    ['tp', 'bp'],
    ['tn', 'bn'],
  ],
  vccRails: ['tp', 'bp'],
  gndRails: ['tn', 'bn'],
};

export const deviceSensors = [
  { id: 'contact-matrix', label: 'Hole contact matrix', detail: '300 terminal + 100 rail contacts', status: 'simulated' },
  { id: 'rail-monitor', label: 'Rail voltage monitor', detail: '±0.01 V resolution', status: 'simulated' },
  { id: 'current-sense', label: 'Current sense amplifier', detail: '0–500 mA, 0.1 mA resolution', status: 'simulated' },
  { id: 'component-id', label: 'Component identification', detail: 'Resistance / diode probe', status: 'simulated' },
  { id: 'thermal', label: 'Thermal sensor', detail: 'Over-current protection', status: 'offline' },
];

export const connectionOptions = [
  { id: 'virtual', label: 'Virtual device (demo mode)', detail: 'Driven by the Hardware Emulator page', available: true },
  { id: 'usb', label: 'USB-C serial', detail: 'WebSerial · 115200 baud', available: false },
  { id: 'ble', label: 'Bluetooth LE', detail: 'Pinpoint GATT service', available: false },
];

/* ------------------------------------------------------- demo scenario */

/**
 * Physical parts used by the Hardware Emulator. Pins are breadboard holes.
 * Hole ids: 'a'–'j' + column (e.g. 'b10'); rails: 'tp' (+ top), 'tn' (− top),
 * 'bn' (− bottom), 'bp' (+ bottom) + column.
 */
export const demoParts = {
  resistor: { id: 'R1', type: 'resistor', value: 220, pins: { p1: 'b10', p2: 'b14' } },
  led: { id: 'D1', type: 'led', color: 'red', pins: { anode: 'c14', cathode: 'c15' } },
  powerWire: { id: 'W1', type: 'wire', color: 'red', pins: { a: 'tp8', b: 'a10' } },
  groundWireWrong: { id: 'W2', type: 'wire', color: 'black', pins: { a: 'tn17', b: 'a16' } },
  groundWireCorrect: { id: 'W2', type: 'wire', color: 'black', pins: { a: 'tn17', b: 'a15' } },
};

/**
 * The nine required demo states. `action` refers to an emulator action in
 * src/lib/virtualDevice.js; `auto: true` states are produced by the agent.
 */
export const demoStates = [
  { id: 1, label: 'Empty breadboard connected', action: 'connect' },
  { id: 2, label: 'Resistor inserted', action: 'insertResistor' },
  { id: 3, label: 'LED inserted', action: 'insertLed' },
  { id: 4, label: 'Power connection added', action: 'addPowerWire' },
  { id: 5, label: 'Ground wire inserted into the wrong node', action: 'insertWrongGround' },
  { id: 6, label: 'Agent proactively detects the mismatch', auto: true },
  { id: 7, label: 'Incorrect connection + correction highlighted', auto: true },
  { id: 8, label: 'Ground wire is corrected', action: 'correctGround' },
  { id: 9, label: 'Agent confirms circuit matches reference', auto: true },
];

/* ---------------------------------------------------- session history */

export const pastSessions = [
  { id: 's-0419', project: 'First LED Circuit', date: '2026-11-19 14:02', duration: '18 min', events: 14, issues: 2, outcome: 'Verified' },
  { id: 's-0418', project: 'First LED Circuit', date: '2026-11-18 10:41', duration: '9 min', events: 7, issues: 1, outcome: 'Incomplete' },
  { id: 's-0412', project: 'Device calibration', date: '2026-11-12 16:20', duration: '4 min', events: 3, issues: 0, outcome: 'Verified' },
];

/* ------------------------------------------------------------ settings */

export const defaultSettings = {
  proactivity: 'proactive', // 'proactive' | 'on-request'
  explanationLevel: 'beginner', // 'beginner' | 'intermediate'
  showGhostHints: true,
  showHoleLabels: true,
  soundCues: false,
};
