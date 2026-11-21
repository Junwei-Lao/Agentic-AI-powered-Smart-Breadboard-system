import { useMemo } from 'react';
import { Download, FlaskConical } from 'lucide-react';
import StatusPill from '../components/StatusPill.jsx';
import { formatHole, formatNode } from '../lib/boardModel.js';
import { buildNetlist } from '../lib/netlist.js';
import { reportSession, toSessionCsv } from '../lib/sessionReport.js';

function downloadCsv(rows, project) {
  const url = URL.createObjectURL(new Blob(['\uFEFF', toSessionCsv(rows, project)], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'pinpoint-session.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function outcomeText(status) {
  const outcomes = { empty: 'Awaiting components', in_progress: 'In progress', error: 'Mismatch detected', complete: 'Reference matched', unsupported: 'No reference' };
  return outcomes[status] || status;
}

export default function Professional({ hardware, diagnostics, project, boardConfig, onNavigate }) {
  const report = useMemo(() => reportSession(hardware.events, project, boardConfig), [hardware.events, project, boardConfig]);
  const nets = useMemo(() => [...buildNetlist(hardware.components, boardConfig).nets.values()],
    [hardware.components, boardConfig]);
  const connected = hardware.connection === 'connected';
  const tone = diagnostics.status === 'complete' ? 'success' : diagnostics.status === 'error' ? 'error' : 'neutral';
  const lastTrace = report.rows.slice(-12).reverse();

  return (
    <div className="page professional">
      <header className="page-head">
        <div>
          <h1>Professional Workspace</h1>
          <p className="lead">Inspect connections and review the evidence from an onboarding or debugging session.</p>
        </div>
        <div className="row gap-8">
          <StatusPill tone="sim">Simulated hardware</StatusPill>
          <button className="btn btn-primary" disabled={!report.rows.length} onClick={() => downloadCsv(report.rows, project)}>
            <Download size={16} /> Export session CSV
          </button>
        </div>
      </header>

      <section className="card pro-summary" aria-label="Session summary">
        <div><span className="muted">Circuit status</span><StatusPill tone={connected ? tone : 'neutral'}>
          {connected ? outcomeText(diagnostics.status) : 'Disconnected'}
        </StatusPill></div>
        <div><span className="muted">Reference nets matched</span><strong>{connected ? `${diagnostics.matchedNets} / ${diagnostics.totalNets}` : '—'}</strong></div>
        <div><span className="muted">First fault to verification</span><strong>{report.recoveryMs === null ? '—' : `${(report.recoveryMs / 1000).toFixed(1)} s`}</strong></div>
      </section>

      {!connected && <section className="card pro-empty">
        <FlaskConical size={18} />
        <p>Connect the virtual device to inspect a live circuit.</p>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('emulator')}>Open emulator</button>
      </section>}

      {connected && <div className="grid-2">
        <section className="card pro-scroll">
          <div className="card-head"><h3>Reference checks</h3><span className="muted">{project.title}</span></div>
          <table className="table">
            <thead><tr><th scope="col">Expected connection</th><th scope="col">Result</th></tr></thead>
            <tbody>{diagnostics.nets.map(net => <tr key={net.id}>
              <td>{net.label}</td>
              <td><StatusPill tone={net.satisfied ? 'success' : net.pending ? 'neutral' : 'warn'}>
                {net.satisfied ? 'Matched' : net.pending ? 'Awaiting parts' : 'Open'}
              </StatusPill></td>
            </tr>)}</tbody>
          </table>
          {diagnostics.issues.length > 0 && <p className="pro-note mono">{diagnostics.issues.map(issue => issue.code).join(' · ')}</p>}
        </section>
        <section className="card pro-scroll">
          <div className="card-head"><h3>Observed electrical nets</h3></div>
          <table className="table">
            <thead><tr><th scope="col">Node group</th><th scope="col">Pins in this net</th></tr></thead>
            <tbody>{nets.map(net => <tr key={net.id}>
              <td>
                {net.isVcc && net.isGnd ? 'Supply short' : net.isVcc ? `Supply (+${boardConfig.supplyVoltage} V)` : net.isGnd ? 'Ground' : formatNode(net.nodes[0])}
              </td>
              <td>{net.pins.length ? net.pins.map(pin => `${pin.componentId}.${pin.pin} (${formatHole(pin.hole)})`).join(', ') : '—'}</td>
            </tr>)}</tbody>
          </table>
        </section>
      </div>}

      <section className="card pro-scroll">
        <div className="card-head"><h3>Session trace</h3><span className="muted">{report.rows.length} recorded events</span></div>
        {lastTrace.length > 0 ? <table className="table">
          <thead><tr><th scope="col">Time</th><th scope="col">Hardware event</th><th scope="col">Validation after event</th></tr></thead>
          <tbody>{lastTrace.map(event => <tr key={event.seq}>
            <td className="mono">{new Date(event.time).toLocaleTimeString()}</td>
            <td>{event.title}<span className="pro-detail muted">{event.detail}</span></td>
            <td>{event.issues.length ? event.issues.join(' · ') : outcomeText(event.status) || '—'}</td>
          </tr>)}</tbody>
        </table> : <p className="pro-note muted">Assemble or debug a circuit in the emulator to start the trace.</p>}
        {report.rows.length > 0 && !report.fullHistory && <p className="pro-note muted">Earlier events have expired. Validation history and recovery timing require a complete trace.</p>}
      </section>
    </div>
  );
}
