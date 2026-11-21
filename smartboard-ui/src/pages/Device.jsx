import { Bluetooth, Cable, CircleCheck, FlaskConical, Monitor, Plug, Power, Unplug, Usb } from 'lucide-react';
import Breadboard from '../components/Breadboard.jsx';
import StatusPill from '../components/StatusPill.jsx';

const OPTION_ICONS = { virtual: Monitor, usb: Usb, ble: Bluetooth };
const SENSOR_TONE = { ok: 'success', simulated: 'sim', offline: 'neutral' };

/**
 * My Device.
 * Props: hardware, deviceInfo, sensors, connectionOptions, boardConfig, onConnect, onDisconnect, onNavigate
 */
export default function Device({ hardware, deviceInfo, sensors, connectionOptions, boardConfig, onConnect, onDisconnect, onNavigate }) {
  const connected = hardware.connection === 'connected';
  const connecting = hardware.connection === 'connecting';
  const info = hardware.device || deviceInfo;

  const rows = [
    ['Model', info.model],
    ['Device ID', info.deviceId],
    ['Serial', info.serial],
    ['Firmware', info.firmware],
    ['Hardware', info.hardwareRevision],
    ['Transport', info.transport],
  ];
  const config = [
    ['Layout', `${boardConfig.columns} columns × 10 rows + 4 rails`],
    ['Supply', `${boardConfig.supplyVoltage.toFixed(1)} V regulated (top + bottom rails)`],
    ['Rail linking', 'Top ↔ bottom rails linked'],
    ['Sample rate', `${info.sampleRateHz} Hz contact scan`],
    ['Monitored nodes', '64 (60 terminal strips + 4 rails)'],
  ];

  return (
    <div className="page">
      <div className="sim-banner">
        <FlaskConical size={15} />
        <strong>Virtual device · demo mode.</strong> No physical prototype is attached — this device is simulated by the Hardware Emulator.
        <button className="link" onClick={() => onNavigate('emulator')}>
          Open emulator →
        </button>
      </div>

      <header className="page-head">
        <div>
          <div className="eyebrow">My Device</div>
          <h1>{info.name}</h1>
          <p className="lead">Smart breadboard with per-hole contact sensing, rail monitoring and live current measurement.</p>
        </div>
        <div className="row gap-8">
          {connected ? (
            <StatusPill tone="success" live>
              Connected
            </StatusPill>
          ) : connecting ? (
            <StatusPill tone="warn" live>
              Connecting…
            </StatusPill>
          ) : (
            <StatusPill tone="neutral">Disconnected</StatusPill>
          )}
          {connected ? (
            <button className="btn btn-ghost" onClick={onDisconnect}>
              <Unplug size={15} /> Disconnect
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onConnect} disabled={connecting}>
              <Plug size={15} /> Connect virtual device
            </button>
          )}
        </div>
      </header>

      <div className="device-hero card">
        <div className="device-render">
          <div className={`enclosure ${connected ? 'is-on' : ''}`}>
            <div className="enclosure-strip">
              <span className="enc-brand">PINPOINT</span>
              <span className="enc-model mono">PB-1</span>
              <span className="enc-spacer" />
              <span className="enc-led" title="Status LED" />
              <span className="enc-port" title="USB-C" />
            </div>
            <Breadboard components={hardware.components} litComponentIds={hardware.litComponentIds} compact />
          </div>
        </div>
        <div className="device-facts">
          <h3>Device details</h3>
          <dl className="kv">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd className="mono">{v}</dd>
              </div>
            ))}
            <div>
              <dt>Status</dt>
              <dd>{connected ? `Online · ${info.latencyMs} ms latency` : connecting ? 'Handshake in progress' : 'Offline'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="grid-3">
        <section className="card">
          <div className="card-head">
            <h3>Board configuration</h3>
          </div>
          <dl className="kv">
            {config.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Sensor status</h3>
          </div>
          <ul className="sensor-list">
            {sensors.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>{s.label}</strong>
                  <small className="muted">{s.detail}</small>
                </div>
                <StatusPill tone={connected ? SENSOR_TONE[s.status] : 'neutral'}>{connected ? s.status : 'idle'}</StatusPill>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Connection options</h3>
          </div>
          <ul className="conn-list">
            {connectionOptions.map((o) => {
              const Icon = OPTION_ICONS[o.id] || Cable;
              const isActive = o.id === 'virtual' && (connected || connecting);
              return (
                <li key={o.id} className={`${o.available ? '' : 'is-disabled'} ${isActive ? 'is-active' : ''}`}>
                  <Icon size={17} />
                  <div>
                    <strong>{o.label}</strong>
                    <small className="muted">{o.detail}</small>
                  </div>
                  {isActive ? (
                    <CircleCheck size={16} className="ok" />
                  ) : o.available ? (
                    <button className="btn btn-ghost btn-sm" onClick={onConnect} disabled={connected || connecting}>
                      <Power size={13} /> Use
                    </button>
                  ) : (
                    <span className="muted small">Hardware pending</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
