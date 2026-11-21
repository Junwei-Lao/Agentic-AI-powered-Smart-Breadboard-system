/**
 * Hardware event protocol.
 *
 * Real Smart Breadboard firmware (or the virtual device) emits these events;
 * the app reduces them into board state. Event shape:
 *   { id, seq, type, ts, source: 'virtual' | 'usb' | 'ble', payload }
 *
 * Types:
 *   DEVICE_CONNECTED     payload: { device }
 *   DEVICE_DISCONNECTED  payload: {}
 *   COMPONENT_INSERTED   payload: { component }
 *   COMPONENT_REMOVED    payload: { componentId, component }
 *   COMPONENT_MOVED      payload: { componentId, pin, from, to }
 *   BOARD_RESET          payload: {}
 */
import { componentName, formatHole, formatResistance } from './boardModel.js';

let localSeq = 0;

export function createHardwareEvent(type, payload = {}, source = 'virtual') {
  localSeq += 1;
  return {
    id: `evt-${Date.now().toString(36)}-${localSeq}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    ts: Date.now(),
    source,
    payload,
  };
}

export const initialHardwareState = {
  connection: 'disconnected', // 'disconnected' | 'connecting' | 'connected'
  device: null,
  components: [],
  events: [], // newest first
  measurements: null,
  litComponentIds: [],
  seq: 0,
};

/** Pure reducer step: apply one hardware event to the board state. */
export function applyHardwareEvent(state, event) {
  const p = event.payload || {};
  let next = { ...state };
  switch (event.type) {
    case 'DEVICE_CONNECTED':
      next.connection = 'connected';
      next.device = p.device || state.device;
      break;
    case 'DEVICE_DISCONNECTED':
      next.connection = 'disconnected';
      next.measurements = null;
      next.litComponentIds = [];
      break;
    case 'COMPONENT_INSERTED':
      next.components = [...state.components.filter((c) => c.id !== p.component.id), p.component];
      break;
    case 'COMPONENT_REMOVED':
      next.components = state.components.filter((c) => c.id !== p.componentId);
      break;
    case 'COMPONENT_MOVED':
      next.components = state.components.map((c) =>
        c.id === p.componentId ? { ...c, pins: { ...c.pins, [p.pin]: p.to } } : c,
      );
      break;
    case 'BOARD_RESET':
      next.components = [];
      break;
    default:
      break;
  }
  const seq = state.seq + 1;
  next.seq = seq;
  next.events = [{ ...event, seq }, ...state.events].slice(0, 200);
  next.lastEventAt = event.ts;
  return next;
}

/* ------------------------------------------------------------ formatting */

const pinListOf = (c) => Object.values(c?.pins || {}).map(formatHole).join(' → ');

/** Compact presentation info for timelines / consoles (not AI text). */
export function describeEvent(event) {
  const p = event.payload || {};
  switch (event.type) {
    case 'DEVICE_CONNECTED':
      return { title: 'Device connected', detail: p.device?.deviceId || '', tone: 'info', icon: 'plug' };
    case 'DEVICE_DISCONNECTED':
      return { title: 'Device disconnected', detail: '', tone: 'muted', icon: 'unplug' };
    case 'COMPONENT_INSERTED': {
      const c = p.component;
      const kind = c.type === 'wire' ? 'Wire inserted' : `${c.type === 'led' ? 'LED' : 'Resistor'} inserted`;
      const extra = c.type === 'resistor' ? ` · ${formatResistance(c.value)}` : '';
      return { title: kind, detail: `${c.id} · ${pinListOf(c)}${extra}`, tone: 'add', icon: c.type };
    }
    case 'COMPONENT_REMOVED':
      return { title: 'Component removed', detail: `${p.componentId} · ${componentName(p.component)}`, tone: 'remove', icon: 'remove' };
    case 'COMPONENT_MOVED':
      return { title: 'Wire moved', detail: `${p.componentId} · ${formatHole(p.from)} → ${formatHole(p.to)}`, tone: 'move', icon: 'move' };
    case 'BOARD_RESET':
      return { title: 'Board cleared', detail: 'All components removed', tone: 'muted', icon: 'reset' };
    default:
      return { title: event.type, detail: '', tone: 'muted', icon: 'event' };
  }
}

/** Short code-style trigger label, e.g. "COMPONENT_INSERTED · W2". */
export function eventTriggerLabel(event) {
  if (!event) return 'session';
  const p = event.payload || {};
  const id = p.component?.id || p.componentId || p.device?.deviceId;
  return id ? `${event.type} · ${id}` : event.type;
}
