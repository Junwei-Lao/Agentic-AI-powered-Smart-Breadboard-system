/**
 * Hardware store: reduces hardware events into board state.
 *
 * The state is mirrored to localStorage so the Hardware Emulator can run in a
 * second browser tab/window and drive the Live Workspace in real time.
 */
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { applyHardwareEvent, initialHardwareState } from '../lib/hardwareEvents.js';
import { simulateSensors } from '../lib/virtualDevice.js';

const STORAGE_KEY = 'pinpoint.hardware.v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialHardwareState;
    const saved = { ...initialHardwareState, ...JSON.parse(raw) };
    // A half-finished handshake cannot survive a reload.
    if (saved.connection === 'connecting') saved.connection = 'disconnected';
    return saved;
  } catch {
    return initialHardwareState;
  }
}

function reducer(boardConfig) {
  return (state, action) => {
    switch (action.type) {
      case 'EVENTS': {
        let next = state;
        for (const e of action.events) next = applyHardwareEvent(next, e);
        // Virtual device: attach simulated sensor readings.
        const sensors = simulateSensors(next.components, boardConfig, next.connection === 'connected');
        return { ...next, ...sensors, origin: 'local' };
      }
      case 'CONNECTING':
        return { ...state, connection: 'connecting', origin: 'local' };
      case 'SYNC':
        return action.state.seq === state.seq && action.state.connection === state.connection
          ? state
          : { ...action.state, origin: 'sync' };
      case 'CLEAR':
        return { ...initialHardwareState, origin: 'local' };
      default:
        return state;
    }
  };
}

export function useHardware(boardConfig) {
  const reducerRef = useRef(reducer(boardConfig));
  const [state, dispatch] = useReducer(reducerRef.current, undefined, load);

  // Persist local changes and broadcast them to other tabs.
  useEffect(() => {
    if (state.origin !== 'local') return;
    try {
      const { origin, ...persist } = state;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    } catch {
      /* storage unavailable — single-tab mode */
    }
  }, [state]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      try {
        dispatch({ type: 'SYNC', state: e.newValue ? JSON.parse(e.newValue) : initialHardwareState });
      } catch {
        /* ignore malformed payloads */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const sendEvents = useCallback((events) => {
    if (events?.length) dispatch({ type: 'EVENTS', events });
  }, []);

  const setConnecting = useCallback(() => dispatch({ type: 'CONNECTING' }), []);
  const clearSession = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return { state, sendEvents, setConnecting, clearSession };
}
