/**
 * Settings. Display preferences are applied live; agent preferences are
 * placeholders for the hackathon build.
 * Props: settings, onChange(patch)
 */
function Toggle({ checked, onChange, label, hint, placeholder }) {
  return (
    <label className="setting">
      <span>
        <strong>
          {label} {placeholder && <em className="placeholder-tag">placeholder</em>}
        </strong>
        <small className="muted">{hint}</small>
      </span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Choice({ value, options, onChange, label, hint, placeholder }) {
  return (
    <div className="setting">
      <span>
        <strong>
          {label} {placeholder && <em className="placeholder-tag">placeholder</em>}
        </strong>
        <small className="muted">{hint}</small>
      </span>
      <div className="segmented">
        {options.map((o) => (
          <button key={o.value} className={value === o.value ? 'is-on' : ''} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Settings({ settings, onChange }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Preferences</h1>
        </div>
      </header>
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h3>Digital twin</h3>
          </div>
          <Toggle label="Show next-placement hints" hint="Ghost outline of where the next part goes" checked={settings.showGhostHints} onChange={(v) => onChange({ showGhostHints: v })} />
          <Toggle label="Show row & column labels" hint="Numbers and letters around the board" checked={settings.showHoleLabels} onChange={(v) => onChange({ showHoleLabels: v })} />
        </section>
        <section className="card">
          <div className="card-head">
            <h3>Agent</h3>
          </div>
          <Choice
            label="Assistance mode"
            hint="Proactive agents speak up when the board changes"
            value={settings.proactivity}
            options={[
              { value: 'proactive', label: 'Proactive' },
              { value: 'on-request', label: 'On request' },
            ]}
            onChange={(v) => onChange({ proactivity: v })}
            placeholder
          />
          <Choice
            label="Explanation depth"
            hint="How much theory the agent includes"
            value={settings.explanationLevel}
            options={[
              { value: 'beginner', label: 'Beginner' },
              { value: 'intermediate', label: 'Intermediate' },
            ]}
            onChange={(v) => onChange({ explanationLevel: v })}
            placeholder
          />
          <Toggle label="Sound cues" hint="Chime when the agent detects a problem" checked={settings.soundCues} onChange={(v) => onChange({ soundCues: v })} placeholder />
        </section>
      </div>
    </div>
  );
}
