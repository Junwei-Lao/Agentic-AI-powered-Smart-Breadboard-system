import EventLog from '../components/EventLog.jsx';
import StatusPill from '../components/StatusPill.jsx';

/**
 * Session History.
 * Props: sessions (past, mock), current { project, events, issuesFound, status }, now
 */
export default function SessionHistory({ sessions = [], current, now }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Session History</div>
          <h1>Your build sessions</h1>
          <p className="lead">Every hardware event and agent intervention is recorded so you can review how a circuit came together.</p>
        </div>
      </header>

      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h3>Current session</h3>
            <StatusPill tone={current.status === 'complete' ? 'success' : current.status === 'error' ? 'error' : 'info'} live>
              {current.status === 'complete' ? 'Verified' : 'In progress'}
            </StatusPill>
          </div>
          <dl className="kv">
            <div>
              <dt>Project</dt>
              <dd>{current.project}</dd>
            </div>
            <div>
              <dt>Hardware events</dt>
              <dd className="mono">{current.events.length}</dd>
            </div>
            <div>
              <dt>Agent messages</dt>
              <dd className="mono">{current.agentMessages}</dd>
            </div>
          </dl>
          <div className="history-log">
            <EventLog events={current.events} now={now} limit={50} />
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Previous sessions</h3>
            <span className="muted small">Sample data</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Project</th>
                <th>Duration</th>
                <th>Issues</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.date}</td>
                  <td>{s.project}</td>
                  <td>{s.duration}</td>
                  <td className="mono">{s.issues}</td>
                  <td>
                    <StatusPill tone={s.outcome === 'Verified' ? 'success' : 'neutral'}>{s.outcome}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
