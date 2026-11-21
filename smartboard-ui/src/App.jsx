/**
 * App shell and data flow.
 *
 *   hardware events ──► useHardware (board state + sensors)
 *                           │
 *                           ├─► validateCircuit (lib)  ──► diagnostics
 *                           │                                 │
 *                           └─► useAgent (tools + messages) ◄─┘ ──► assessment
 *                                                                   │
 *                     deriveBoardHighlights (lib) ◄─────────────────┘
 *                                │
 *                     pages / components (props only)
 */
import { useCallback, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Workspace from './pages/Workspace.jsx';
import Projects from './pages/Projects.jsx';
import Device from './pages/Device.jsx';
import Emulator from './pages/Emulator.jsx';
import SessionHistory from './pages/SessionHistory.jsx';
import Settings from './pages/Settings.jsx';
import {
  agentPlaybook,
  boardConfig,
  connectionOptions,
  DEFAULT_PROJECT_ID,
  defaultSettings,
  deviceSensors,
  pastSessions,
  projects,
  virtualDevice,
} from './data/mockData.js';
import { useHardware } from './hooks/useHardware.js';
import { useAgent } from './hooks/useAgent.js';
import { useHashRoute } from './hooks/useHashRoute.js';
import { useNow } from './hooks/useNow.js';
import { useLiveTelemetry } from './hooks/useLiveTelemetry.js';
import { validateCircuit } from './lib/circuitValidator.js';
import { deriveBoardHighlights } from './lib/highlights.js';
import { demoProgress, emulatorActions, nextDemoEvents, removeComponentEvent } from './lib/virtualDevice.js';

const ROUTES = ['workspace', 'projects', 'device', 'history', 'settings', 'emulator'];
const HANDSHAKE_MS = 900;

export default function App() {
  const [route, navigate] = useHashRoute('workspace');
  const [activeProjectId, setActiveProjectId] = useState(DEFAULT_PROJECT_ID);
  const [settings, setSettings] = useState(defaultSettings);
  const now = useNow(1000);

  /* hardware */
  const { state: hardware, sendEvents, setConnecting, clearSession } = useHardware(boardConfig);
  const measurements = useLiveTelemetry(hardware.measurements);

  /* validation + agent */
  const project = projects.find((p) => p.id === activeProjectId) || projects[0];
  const diagnostics = useMemo(
    () => validateCircuit({ components: hardware.components, project, boardConfig }),
    [hardware.components, project],
  );
  const agent = useAgent({ hardware, diagnostics, project });
  const assessment = agent.assessment || diagnostics;
  const highlightsStale = agent.run?.kind === 'proactive' && !agent.run.finishedAt;
  const highlights = useMemo(
    () => deriveBoardHighlights(assessment, project, hardware.components, { showGhosts: settings.showGhostHints }),
    [assessment, project, hardware.components, settings.showGhostHints],
  );

  const latest = hardware.events[0];
  const recent = useMemo(() => {
    if (!latest || Date.now() - latest.ts > 5000) return null;
    const id = latest.payload?.component?.id || (latest.type === 'COMPONENT_MOVED' ? latest.payload.componentId : null);
    return id && latest.type !== 'COMPONENT_REMOVED' ? { componentId: id, key: latest.id } : null;
  }, [latest]);

  /* emulator / device commands */
  const connect = useCallback(() => {
    setConnecting();
    setTimeout(() => sendEvents(emulatorActions.connect.events()), HANDSHAKE_MS);
  }, [setConnecting, sendEvents]);

  const runAction = useCallback(
    (name) => {
      if (name === 'connect') return connect();
      const a = emulatorActions[name];
      if (a?.available(hardware)) sendEvents(a.events(hardware));
      return undefined;
    },
    [hardware, connect, sendEvents],
  );

  const advanceDemo = useCallback(() => {
    if (hardware.connection === 'connecting') return;
    const next = nextDemoEvents(hardware);
    if (!next) return;
    if (next.step.action === 'connect') connect();
    else sendEvents(next.events);
  }, [hardware, connect, sendEvents]);

  const removeComponent = useCallback((id) => sendEvents([removeComponentEvent(hardware, id)].filter(Boolean)), [hardware, sendEvents]);

  const page = ROUTES.includes(route) ? route : 'workspace';
  const errorCount = assessment.issues.filter((i) => i.severity !== 'warning').length;

  let content;
  switch (page) {
    case 'projects':
      content = (
        <Projects
          projects={projects}
          activeProjectId={activeProjectId}
          onStart={(id) => {
            setActiveProjectId(id);
            navigate('workspace');
          }}
        />
      );
      break;
    case 'device':
      content = (
        <Device
          hardware={hardware}
          deviceInfo={virtualDevice}
          sensors={deviceSensors}
          connectionOptions={connectionOptions}
          boardConfig={boardConfig}
          onConnect={connect}
          onDisconnect={() => runAction('disconnect')}
          onNavigate={navigate}
        />
      );
      break;
    case 'emulator':
      content = (
        <Emulator
          hardware={hardware}
          actions={emulatorActions}
          demo={demoProgress(hardware)}
          onAction={runAction}
          onRemove={removeComponent}
          onAdvance={advanceDemo}
          onClearSession={clearSession}
          now={now}
        />
      );
      break;
    case 'history':
      content = (
        <SessionHistory
          sessions={pastSessions}
          current={{
            project: project.title,
            events: hardware.events,
            agentMessages: agent.messages.filter((m) => m.role === 'agent').length,
            status: assessment.status,
          }}
          now={now}
        />
      );
      break;
    case 'settings':
      content = <Settings settings={settings} onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))} />;
      break;
    default:
      content = (
        <Workspace
          project={project}
          hardware={hardware}
          diagnostics={assessment}
          highlights={highlights}
          highlightsStale={highlightsStale}
          recent={recent}
          measurements={measurements}
          agent={agent}
          persona={agentPlaybook.persona}
          suggestions={agentPlaybook.suggestions}
          onAsk={agent.ask}
          onNavigate={navigate}
          settings={settings}
          now={now}
        />
      );
  }

  return (
    <div className="app">
      <Sidebar route={page} onNavigate={navigate} connection={hardware.connection} device={hardware.device || virtualDevice} issueCount={errorCount} />
      <main className={`main main--${page}`}>{content}</main>
    </div>
  );
}
