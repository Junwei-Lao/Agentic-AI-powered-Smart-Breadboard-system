import { Activity, Cable, Lightbulb, MoveRight, Plug, RotateCcw, Trash2, Unplug, Zap } from 'lucide-react';
import { describeEvent } from '../lib/hardwareEvents.js';
import { clockTime, timeAgo } from '../hooks/useNow.js';

const ICONS = { plug: Plug, unplug: Unplug, wire: Cable, led: Lightbulb, resistor: Zap, remove: Trash2, move: MoveRight, reset: RotateCcw };

/**
 * Hardware event timeline.
 * Props: events (newest first), now, limit, variant: 'timeline' | 'console', emptyText
 */
export default function EventLog({ events = [], now = Date.now(), limit = 40, variant = 'timeline', emptyText = 'No hardware events yet.' }) {
  const list = events.slice(0, limit);
  if (!list.length) return <div className="eventlog-empty">{emptyText}</div>;

  if (variant === 'console') {
    return (
      <ol className="console">
        {list.map((e) => (
          <li key={e.id} className="console-line">
            <span className="console-time">{clockTime(e.ts)}</span>
            <span className="console-seq">#{String(e.seq ?? '').padStart(3, '0')}</span>
            <span className={`console-type t-${describeEvent(e).tone}`}>{e.type}</span>
            <code className="console-payload">{JSON.stringify(e.payload)}</code>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <ol className="timeline">
      {list.map((e, i) => {
        const d = describeEvent(e);
        const Icon = ICONS[d.icon] || Activity;
        return (
          <li key={e.id} className={`timeline-item tone-${d.tone} ${i === 0 ? 'is-latest' : ''}`}>
            <span className="timeline-icon">
              <Icon size={13} strokeWidth={2} />
            </span>
            <div className="timeline-body">
              <div className="timeline-title">
                {d.title}
                <span className="timeline-time" title={clockTime(e.ts)}>
                  {timeAgo(e.ts, now)}
                </span>
              </div>
              <div className="timeline-detail mono">{d.detail}</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
