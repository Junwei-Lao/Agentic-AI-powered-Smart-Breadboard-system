import { useState } from 'react';
import { CircleCheck, Cpu, LoaderCircle, Lock, Radio, ScanLine, TriangleAlert, Workflow } from 'lucide-react';
import Breadboard from '../components/Breadboard.jsx';
import AgentPanel from '../components/AgentPanel.jsx';
import EventLog from '../components/EventLog.jsx';
import SensorCards from '../components/SensorCards.jsx';
import SchematicView from '../components/SchematicView.jsx';
import ProgressSteps from '../components/ProgressSteps.jsx';
import StatusPill from '../components/StatusPill.jsx';

function BoardBanner({ diagnostics, stale, connected }) {
  if (!connected) return null;
  if (stale)
    return (
      <div className="board-banner tone-analyze">
        <LoaderCircle size={14} className="spin" /> Change detected — agent is re-analyzing
      </div>
    );
  const errors = diagnostics.issues.filter((i) => i.severity !== 'warning').length;
  if (diagnostics.status === 'error')
    return (
      <div className="board-banner tone-error">
        <TriangleAlert size={14} /> {errors} incorrect connection{errors > 1 ? 's' : ''} · see suggested fix
      </div>
    );
  if (diagnostics.status === 'complete')
    return (
      <div className="board-banner tone-success">
        <CircleCheck size={14} /> Matches reference circuit · {diagnostics.matchedNets}/{diagnostics.totalNets} connections
      </div>
    );
  const active = diagnostics.activeStep;
  return (
    <div className="board-banner tone-info">
      <ScanLine size={14} /> {active ? `Next: ${active.title}` : 'Watching for changes'}
    </div>
  );
}

/**
 * Live Workspace — all data arrives through props.
 */
export default function Workspace({
  project,
  hardware,
  diagnostics,
  highlights,
  highlightsStale,
  recent,
  measurements,
  agent,
  persona,
  suggestions,
  onAsk,
  onNavigate,
  settings,
  now,
}) {
  const [showSchematic, setShowSchematic] = useState(false);
  const connected = hardware.connection === 'connected';
  const device = hardware.device;
  const errorNetIds = diagnostics.issues.filter((i) => i.severity !== 'warning').flatMap((i) => i.netIds || []);

  return (
    <div className="workspace">
      <section className="ws-center">
        <header className="ws-header">
          <div>
            <div className="crumbs">
              <button className="link" onClick={() => onNavigate('projects')}>
                Learning Lab
              </button>
              <span>/</span>
              <span>{project.difficulty}</span>
            </div>
            <h1>{project.title}</h1>
          </div>
          <div className="ws-header-right">
            {connected ? (
              <StatusPill tone="success" live>
                Connected
              </StatusPill>
            ) : hardware.connection === 'connecting' ? (
              <StatusPill tone="warn" live>
                Connecting…
              </StatusPill>
            ) : (
              <StatusPill tone="neutral">Disconnected</StatusPill>
            )}
            <span className="device-meta mono">
              <Cpu size={13} /> {device?.deviceId || '—'}
              {connected && <span className="muted"> · {device?.latencyMs} ms</span>}
            </span>
            {device?.mode === 'virtual' && connected && <StatusPill tone="sim">Virtual device</StatusPill>}
          </div>
        </header>

        <ProgressSteps steps={diagnostics.steps} progress={diagnostics.progress} />

        <div className="card board-card">
          <div className="board-toolbar">
            <div className="board-toolbar-left">
              <span className="live-label">
                <Radio size={14} /> Live digital twin
              </span>
              <span className="readonly">
                <Lock size={12} /> Read-only mirror
              </span>
            </div>
            <div className="legend">
              <span className="lg lg-error">Incorrect</span>
              <span className="lg lg-suggest">Suggested</span>
              <span className="lg lg-ghost">Next placement</span>
            </div>
            <button
              className={`btn btn-ghost btn-sm ${showSchematic ? 'is-on' : ''}`}
              onClick={() => setShowSchematic((s) => !s)}
              aria-pressed={showSchematic}
            >
              <Workflow size={14} /> Reference schematic
            </button>
          </div>

          <div className="board-stage">
            <Breadboard
              components={hardware.components}
              highlights={highlights}
              highlightsStale={highlightsStale}
              litComponentIds={hardware.litComponentIds}
              currentFlowing={hardware.litComponentIds.length > 0}
              recent={recent}
              showLabels={settings.showHoleLabels}
            />
            {showSchematic && (
              <div className="schematic-float">
                <div className="schematic-head">
                  <span>Reference circuit</span>
                  <span className="muted mono">
                    {diagnostics.matchedNets}/{diagnostics.totalNets} nets
                  </span>
                </div>
                <SchematicView
                  nets={diagnostics.nets}
                  errorNetIds={errorNetIds}
                  placed={Object.fromEntries(Object.keys(diagnostics.matches).map((k) => [k, true]))}
                  lit={hardware.litComponentIds.length > 0}
                />
              </div>
            )}
            <BoardBanner diagnostics={diagnostics} stale={highlightsStale} connected={connected} />
            {!connected && (
              <div className="board-overlay">
                <div className="board-overlay-card">
                  <Cpu size={22} />
                  <h3>{hardware.connection === 'connecting' ? 'Connecting to your board…' : 'No board connected'}</h3>
                  <p>Start the virtual device from the Hardware Emulator to see the board update.</p>
                  <div className="row gap-8">
                    <button className="btn btn-primary btn-sm" onClick={() => onNavigate('device')}>
                      My Device
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('emulator')}>
                      Open emulator
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="ws-bottom">
          <div className="card">
            <div className="card-head">
              <h3>Simulated measurements</h3>
              {connected && (
                <StatusPill tone="success" live>
                  Streaming
                </StatusPill>
              )}
            </div>
            <SensorCards measurements={measurements} />
          </div>
          <div className="card timeline-card">
            <div className="card-head">
              <h3>Hardware event timeline</h3>
              <span className="muted mono">{hardware.events.length} events</span>
            </div>
            <EventLog events={hardware.events} now={now} limit={30} emptyText="Waiting for hardware events…" />
          </div>
        </div>
      </section>

      <AgentPanel
        agent={agent}
        persona={persona}
        suggestions={suggestions}
        onAsk={onAsk}
        now={now}
        monitor={{ connected, nodesWatched: 64, lastEventAt: hardware.lastEventAt }}
      />
    </div>
  );
}
