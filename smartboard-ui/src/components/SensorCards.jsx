import { Activity, Gauge, Lightbulb, Thermometer } from 'lucide-react';

const ICONS = { supply: Gauge, current: Activity, led_vf: Lightbulb, r_power: Thermometer };

/**
 * Live electrical measurements.
 * Props: measurements [{ id, label, value, unit, precision, available, max? }] | null
 */
export default function SensorCards({ measurements }) {
  if (!measurements) {
    return (
      <div className="sensors">
        {['Supply rail', 'Loop current', 'LED forward drop', 'Resistor power'].map((l) => (
          <div key={l} className="sensor is-off">
            <span className="sensor-label">{l}</span>
            <span className="sensor-value">—</span>
            <span className="sensor-sub">No device</span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="sensors">
      {measurements.map((m) => {
        const Icon = ICONS[m.id] || Activity;
        const ok = m.available && m.value != null;
        const pct = ok && m.max ? Math.min(100, (m.value / m.max) * 100) : null;
        return (
          <div key={m.id} className={`sensor ${ok ? '' : 'is-off'} ${ok && m.value > 0 ? 'is-live' : ''}`}>
            <span className="sensor-label">
              <Icon size={13} /> {m.label}
            </span>
            <span className="sensor-value mono">
              {ok ? m.value.toFixed(m.precision) : '—'}
              <small>{ok ? m.unit : ''}</small>
            </span>
            {pct != null ? (
              <span className="sensor-bar" title={`${m.max} ${m.unit} LED rating`}>
                <span style={{ width: `${pct}%` }} />
              </span>
            ) : (
              <span className="sensor-sub">{ok ? 'Live' : 'Not available yet'}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
