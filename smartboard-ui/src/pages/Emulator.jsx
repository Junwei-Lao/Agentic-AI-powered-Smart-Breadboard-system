import { useEffect, useRef, useState } from 'react';
import {
  Cable,
  CircleCheck,
  ExternalLink,
  FlaskConical,
  Lightbulb,
  MoveRight,
  Pause,
  Play,
  Plug,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trash2,
  Unplug,
  Zap,
} from 'lucide-react';
import Breadboard from '../components/Breadboard.jsx';
import EventLog from '../components/EventLog.jsx';
import { componentName } from '../lib/boardModel.js';

const ICONS = {
  connect: Plug,
  disconnect: Unplug,
  insertResistor: Zap,
  insertLed: Lightbulb,
  rotateLed: RotateCcw,
  addPowerWire: Cable,
  insertWrongGround: Cable,
  correctGround: MoveRight,
  reset: RotateCcw,
};

const GROUPS = [
  { title: 'Connection', actions: ['connect', 'disconnect'] },
  { title: 'Components', actions: ['insertResistor', 'insertLed', 'rotateLed'] },
  { title: 'Wiring', actions: ['addPowerWire', 'insertWrongGround', 'correctGround'] },
];

/**
 * Hardware Emulator (developer-facing, simulated hardware).
 * Props:
 *   hardware          board state
 *   actions           emulator action table (lib/virtualDevice.js)
 *   demo              [{ id, label, done, isNext, auto }]
 *   onAction(name)    run a named emulator action
 *   onRemove(id)      remove a component
 *   onAdvance()       advance the scripted demo; returns false when finished
 *   onClearSession()  wipe the session (events + board)
 *   now
 */
export default function Emulator({ hardware, actions, demo, onAction, onRemove, onAdvance, onClearSession, now }) {
  const [removeId, setRemoveId] = useState('');
  const [autoPlay, setAutoPlay] = useState(false);
  const connected = hardware.connection === 'connected';
  const nextStep = demo.find((d) => d.isNext);

  useEffect(() => {
    if (!hardware.components.some((c) => c.id === removeId)) setRemoveId(hardware.components.at(-1)?.id || '');
  }, [hardware.components, removeId]);

  const advanceRef = useRef(onAdvance);
  advanceRef.current = onAdvance;
  const nextId = nextStep?.id ?? null;
  useEffect(() => {
    if (!autoPlay) return undefined;
    if (nextId == null) {
      setAutoPlay(false);
      return undefined;
    }
    if (hardware.connection === 'connecting') return undefined;
    // First step fires quickly; later ones leave time for the agent's analysis.
    const t = setTimeout(() => advanceRef.current(), hardware.seq === 0 ? 300 : 4200);
    return () => clearTimeout(t);
  }, [autoPlay, nextId, hardware.seq, hardware.connection]);

  return (
    <div className="page emulator">
      <div className="sim-tape">
        <FlaskConical size={15} />
        <strong>SIMULATED HARDWARE</strong>
        <span>Developer tool — emits the same events the physical Smart Breadboard will send. Not part of the student workspace.</span>
      </div>

      <header className="page-head">
        <div>
          <div className="eyebrow">Developer · Virtual device</div>
          <h1>Hardware Emulator</h1>
          <p className="lead">
            Drive the virtual board here and watch the Live Workspace react. Tip: open the workspace in a second window — they stay in sync.
          </p>
        </div>
        <div className="row gap-8">
          <a className="btn btn-ghost" href="#/workspace" target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Workspace in new window
          </a>
        </div>
      </header>

      <div className="emu-grid">
        <div className="emu-controls">
          <section className="card demo-card">
            <div className="card-head">
              <h3>Demo sequence</h3>
              <span className="muted mono">{demo.filter((d) => d.done).length}/9</span>
            </div>
            <ol className="demo-steps">
              {demo.map((d) => (
                <li key={d.id} className={`${d.done ? 'is-done' : ''} ${d.isNext ? 'is-next' : ''} ${d.auto ? 'is-auto' : ''}`}>
                  <span className="demo-dot">{d.done ? <CircleCheck size={13} /> : d.id}</span>
                  <span>{d.label}</span>
                  {d.auto && (
                    <span className="auto-tag">
                      <Sparkles size={11} /> agent
                    </span>
                  )}
                </li>
              ))}
            </ol>
            <div className="row gap-8">
              <button className="btn btn-primary grow" onClick={onAdvance} disabled={!nextStep}>
                <SkipForward size={15} /> {nextStep ? `Advance: ${nextStep.label}` : 'Sequence complete'}
              </button>
              <button className="btn btn-ghost" onClick={() => setAutoPlay((a) => !a)} disabled={!nextStep && !autoPlay} title="Auto-play the remaining steps">
                {autoPlay ? <Pause size={15} /> : <Play size={15} />}
              </button>
            </div>
          </section>

          <section className="card">
            <div className="card-head"><h3>Debug challenge</h3></div>
            <div className="emu-actions">
              <button className="emu-btn is-fault" disabled={!actions.loadDebugChallenge.available(hardware)} onClick={() => {
                setAutoPlay(false);
                onAction('loadDebugChallenge');
              }}>
                <FlaskConical size={16} />
                <span><strong>Load two-fault challenge</strong><small>Replace the current layout with a dark LED circuit.</small></span>
              </button>
            </div>
          </section>

          {GROUPS.map((g) => (
            <section key={g.title} className="card">
              <div className="card-head">
                <h3>{g.title}</h3>
              </div>
              <div className="emu-actions">
                {g.actions.map((name) => {
                  const a = actions[name];
                  const Icon = ICONS[name];
                  const enabled = a.available(hardware);
                  return (
                    <button key={name} className={`emu-btn ${name === 'insertWrongGround' ? 'is-fault' : ''}`} disabled={!enabled} onClick={() => onAction(name)}>
                      <Icon size={16} />
                      <span>
                        <strong>{a.label}</strong>
                        {a.hint && <small className="mono">{a.hint}</small>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <section className="card">
            <div className="card-head">
              <h3>Board</h3>
            </div>
            <div className="emu-actions">
              <div className="emu-remove">
                <select value={removeId} onChange={(e) => setRemoveId(e.target.value)} disabled={!hardware.components.length || !connected} aria-label="Component to remove">
                  {!hardware.components.length && <option value="">No components</option>}
                  {hardware.components.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {componentName(c)}
                    </option>
                  ))}
                </select>
                <button className="btn btn-ghost" disabled={!removeId || !connected} onClick={() => onRemove(removeId)}>
                  <Trash2 size={15} /> Remove component
                </button>
              </div>
              <button className="emu-btn" disabled={!actions.reset.available(hardware)} onClick={() => onAction('reset')}>
                <RotateCcw size={16} />
                <span>
                  <strong>{actions.reset.label}</strong>
                  <small>Pull every component off the board</small>
                </span>
              </button>
              <button className="btn btn-ghost btn-sm" onClick={onClearSession}>
                Clear session &amp; event history
              </button>
            </div>
          </section>
        </div>

        <div className="emu-side">
          <section className="card">
            <div className="card-head">
              <h3>Virtual board state</h3>
              <span className="muted mono">
                {hardware.connection} · {hardware.components.length} items
              </span>
            </div>
            <div className="emu-preview">
              <Breadboard components={hardware.components} litComponentIds={hardware.litComponentIds} compact />
            </div>
          </section>
          <section className="card console-card">
            <div className="card-head">
              <h3>Event console</h3>
              <span className="muted mono">{hardware.events.length} events</span>
            </div>
            <EventLog events={hardware.events} variant="console" limit={100} now={now} emptyText="> waiting for simulated hardware events_" />
          </section>
        </div>
      </div>
    </div>
  );
}
