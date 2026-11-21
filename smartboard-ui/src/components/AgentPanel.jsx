import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  CircleCheck,
  Eye,
  GraduationCap,
  ListChecks,
  LoaderCircle,
  Send,
  Sparkles,
  Target,
  Terminal,
  TriangleAlert,
} from 'lucide-react';
import { clockTime, timeAgo } from '../hooks/useNow.js';

const STATUS = {
  monitoring: { label: 'Monitoring', tone: 'monitor' },
  analyzing: { label: 'Analyzing', tone: 'analyze' },
  responding: { label: 'Responding', tone: 'respond' },
  standby: { label: 'Standby', tone: 'standby' },
};

const TRIGGER_TEXT = {
  SESSION: 'Session check',
  STANDBY: 'Waiting for device',
  DEVICE_CONNECTED: 'Device connected',
  DEVICE_DISCONNECTED: 'Device disconnected',
  COMPONENT_INSERTED: 'Component inserted',
  COMPONENT_REMOVED: 'Component removed',
  COMPONENT_MOVED: 'Component moved',
  BOARD_RESET: 'Board reset',
};

/* ------------------------------------------------------------ blocks */

function Block({ b }) {
  switch (b.type) {
    case 'observation':
      return (
        <p className="blk blk-observation">
          <Eye size={14} />
          <span>{b.text}</span>
        </p>
      );
    case 'issue':
      return (
        <div className={`blk blk-issue sev-${b.severity}`}>
          <div className="blk-title">
            <TriangleAlert size={14} /> {b.title}
          </div>
          <p>{b.text}</p>
        </div>
      );
    case 'action':
      return (
        <div className="blk blk-action">
          <div className="blk-kicker">
            <Target size={13} /> Recommended action
          </div>
          {b.from && b.to && (
            <div className="move-chip">
              <span className="hole-chip hole-chip--bad">{b.from}</span>
              <ArrowRight size={14} />
              <span className="hole-chip hole-chip--good">{b.to}</span>
            </div>
          )}
          <p>{b.text}</p>
        </div>
      );
    case 'next':
      return (
        <div className="blk blk-next">
          <div className="blk-kicker">
            <ArrowRight size={13} /> {b.title}
          </div>
          <p>{b.text}</p>
        </div>
      );
    case 'success':
      return (
        <div className="blk blk-success">
          <div className="blk-title">
            <CircleCheck size={15} /> {b.title}
          </div>
          <p>{b.text}</p>
          {b.checks && (
            <ul className="checklist">
              {b.checks.map((c) => (
                <li key={c.label} className={c.ok ? 'ok' : ''}>
                  <CircleCheck size={13} /> {c.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case 'resolved':
      return (
        <p className="blk blk-resolved">
          <CircleCheck size={14} /> {b.text}
        </p>
      );
    case 'concept':
      return (
        <details className="blk blk-concept">
          <summary>
            <GraduationCap size={14} /> {b.title}
            <ChevronDown size={14} className="chev" />
          </summary>
          <p>{b.text}</p>
        </details>
      );
    default:
      return <p className="blk blk-text">{b.text}</p>;
  }
}

function AgentMessage({ m, now }) {
  if (m.role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="msg-bubble">{m.text}</div>
      </div>
    );
  }
  return (
    <article className={`msg msg-agent tone-${m.tone}`}>
      <header className="msg-head">
        {m.proactive ? (
          <span className="msg-trigger">
            <Sparkles size={12} /> Proactive · {TRIGGER_TEXT[m.trigger?.type] || m.trigger?.type}
          </span>
        ) : (
          <span className="msg-trigger is-reply">
            <Bot size={12} /> Answer
          </span>
        )}
        <time title={clockTime(m.ts)}>{timeAgo(m.ts, now)}</time>
      </header>
      {m.blocks.map((b, i) => (
        <Block key={i} b={b} />
      ))}
    </article>
  );
}

/* ---------------------------------------------------------- run card */

function RunCard({ run, status }) {
  const [open, setOpen] = useState(true);
  const running = !run.finishedAt;
  useEffect(() => setOpen(true), [run.id]);
  // Collapse the tool list a few seconds after a run completes.
  useEffect(() => {
    if (!run.finishedAt) return undefined;
    const t = setTimeout(() => setOpen(false), 3500);
    return () => clearTimeout(t);
  }, [run.finishedAt]);
  const done = run.tools.filter((t) => t.status === 'done').length;
  const secs = run.finishedAt ? ((run.finishedAt - run.startedAt) / 1000).toFixed(1) : null;
  return (
    <section className={`run ${running ? 'is-running' : ''}`}>
      <button className="run-head" onClick={() => setOpen((o) => !o)}>
        {running ? <LoaderCircle size={14} className="spin" /> : <CircleCheck size={14} className="ok" />}
        <span className="run-title">
          {running ? (status === 'responding' ? 'Writing response' : 'Running tools') : `Run complete · ${secs}s`}
        </span>
        <span className="run-trigger mono">{run.trigger}</span>
        <ChevronDown size={14} className={`chev ${open ? 'is-open' : ''}`} />
      </button>
      {open && (
        <ol className="tools">
          {run.tools.length === 0 && (
            <li className="tool is-running">
              <LoaderCircle size={13} className="spin" /> <span>Reading your question…</span>
            </li>
          )}
          {run.tools.map((t) => (
            <li key={t.id} className={`tool is-${t.status} ${t.tone ? `tone-${t.tone}` : ''}`}>
              <span className="tool-icon">
                {t.status === 'done' ? <CircleCheck size={13} /> : t.status === 'running' ? <LoaderCircle size={13} className="spin" /> : <span className="tool-dot" />}
              </span>
              <span className="tool-label">{t.label}</span>
              <span className="tool-detail mono">{t.status === 'pending' ? '' : t.detail}</span>
            </li>
          ))}
        </ol>
      )}
      {running && <div className="run-progress" style={{ width: `${(done / Math.max(1, run.tools.length)) * 100}%` }} />}
    </section>
  );
}

/* ------------------------------------------------------------- panel */

/**
 * Right-hand agent sidebar.
 * Props:
 *   agent: { status, messages, run, activity }
 *   persona: { name, tagline }
 *   suggestions: string[]
 *   onAsk(question)
 *   monitor: { connected, nodesWatched, lastEventAt }
 *   now: timestamp (for relative times)
 */
export default function AgentPanel({ agent, persona, suggestions = [], onAsk, monitor = {}, now = Date.now() }) {
  const [draft, setDraft] = useState('');
  const [logOpen, setLogOpen] = useState(false);
  const feedRef = useRef(null);
  const st = STATUS[agent.status] || STATUS.monitoring;
  const busy = agent.status === 'analyzing' || agent.status === 'responding';

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [agent.messages.length, agent.status]);

  const submit = (q) => {
    const text = (q ?? draft).trim();
    if (!text || busy) return;
    onAsk?.(text);
    setDraft('');
  };

  return (
    <aside className={`agent agent--${st.tone}`}>
      <header className="agent-head">
        <div className="agent-avatar">
          <Bot size={18} />
          <span className="agent-avatar-ring" />
        </div>
        <div className="agent-id">
          <strong>{persona?.name}</strong>
          <span className={`agent-status status-${st.tone}`}>
            <span className="status-ind" />
            {st.label}
          </span>
        </div>
        <span className="agent-mode" title="The agent reacts to hardware events without being asked">
          <Sparkles size={12} /> Proactive
        </span>
      </header>

      <div className="agent-monitor">
        <div className="scanline" />
        <span>
          {monitor.connected
            ? `Watching ${monitor.nodesWatched} nodes · last change ${timeAgo(monitor.lastEventAt, now)}`
            : 'Waiting for a device connection'}
        </span>
      </div>

      <div className="agent-feed" ref={feedRef}>
        {agent.messages.map((m) => (
          <AgentMessage key={m.id} m={m} now={now} />
        ))}
        {agent.status === 'responding' && (
          <div className="typing">
            <span />
            <span />
            <span />
          </div>
        )}
      </div>

      {agent.run && <RunCard run={agent.run} status={agent.status} />}

      <section className={`activity ${logOpen ? 'is-open' : ''}`}>
        <button className="activity-head" onClick={() => setLogOpen((o) => !o)}>
          <Terminal size={13} />
          <span>Agent activity log</span>
          <span className="activity-count">{agent.activity.length}</span>
          <ChevronDown size={14} className={`chev ${logOpen ? 'is-open' : ''}`} />
        </button>
        {logOpen && (
          <ol className="activity-list mono">
            {agent.activity.length === 0 && <li className="muted">No tool calls yet.</li>}
            {agent.activity.map((a) => (
              <li key={a.id} className={a.tone ? `tone-${a.tone}` : ''}>
                <span className="muted">{clockTime(a.ts)}</span> <span className="act-tool">{a.tool}</span>{' '}
                <span className="muted">→</span> {a.detail}
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="agent-input">
        <div className="suggestions">
          {suggestions.map((s) => (
            <button key={s} className="chip" onClick={() => submit(s)} disabled={busy}>
              <ListChecks size={12} /> {s}
            </button>
          ))}
        </div>
        <form
          className="ask"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask about your circuit…"
            aria-label="Ask the agent a question"
          />
          <button type="submit" className="ask-send" disabled={!draft.trim() || busy} aria-label="Send">
            <Send size={15} />
          </button>
        </form>
      </footer>
    </aside>
  );
}
