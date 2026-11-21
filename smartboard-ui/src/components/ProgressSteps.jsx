import { Check, X } from 'lucide-react';

/**
 * Assembly progress indicator.
 * Props: steps [{ id, label, status: done|active|error|pending }], progress { done, total, ratio }
 */
export default function ProgressSteps({ steps = [], progress }) {
  const pct = Math.round((progress?.ratio || 0) * 100);
  return (
    <div className="progress">
      <div className="progress-ring" style={{ '--pct': pct }}>
        <span>{pct}%</span>
      </div>
      <div className="progress-text">
        <strong>Assembly progress</strong>
        <span className="muted">
          {progress?.done ?? 0} of {progress?.total ?? 0} steps
        </span>
      </div>
      <ol className="progress-steps">
        {steps.map((s, i) => (
          <li key={s.id} className={`pstep is-${s.status}`}>
            <span className="pstep-dot">
              {s.status === 'done' ? <Check size={11} strokeWidth={3} /> : s.status === 'error' ? <X size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className="pstep-label">{s.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
