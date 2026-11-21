import { Activity, CircuitBoard, Cpu, FlaskConical, History, LayoutDashboard, Settings, Wrench } from 'lucide-react';
import Logo from './Logo.jsx';

const NAV = [
  { id: 'workspace', label: 'Live Workspace', icon: LayoutDashboard },
  { id: 'professional', label: 'Professional', icon: Activity },
  { id: 'projects', label: 'Projects', icon: FlaskConical },
  { id: 'device', label: 'My Device', icon: Cpu },
  { id: 'history', label: 'Session History', icon: History },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const DEV_NAV = [{ id: 'emulator', label: 'Hardware Emulator', icon: Wrench, badge: 'SIM' }];

const CONNECTION_TEXT = { connected: 'Connected', connecting: 'Connecting…', disconnected: 'No device' };

/**
 * Left navigation.
 * Props: route, onNavigate(id), connection, device, issueCount
 */
export default function Sidebar({ route, onNavigate, connection, device, issueCount = 0 }) {
  const Item = ({ item }) => {
    const Icon = item.icon;
    const active = route === item.id;
    return (
      <button className={`nav-item ${active ? 'is-active' : ''}`} onClick={() => onNavigate(item.id)} aria-current={active ? 'page' : undefined}>
        <Icon size={17} strokeWidth={1.8} />
        <span className="nav-label">{item.label}</span>
        {item.id === 'workspace' && issueCount > 0 && <span className="nav-count">{issueCount}</span>}
        {item.badge && <span className="nav-badge">{item.badge}</span>}
      </button>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Logo />
      </div>
      <nav className="nav">
        {NAV.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </nav>
      <div className="nav-section-label">Developer</div>
      <nav className="nav">
        {DEV_NAV.map((item) => (
          <Item key={item.id} item={item} />
        ))}
      </nav>

      <button className="sidebar-device" onClick={() => onNavigate('device')}>
        <span className={`conn-dot conn-dot--${connection}`} />
        <span className="sidebar-device-text">
          <strong>{device?.name || 'Pinpoint Board One'}</strong>
          <small>
            {CONNECTION_TEXT[connection]}
            {device?.mode === 'virtual' && connection !== 'disconnected' ? ' · virtual' : ''}
          </small>
        </span>
        <CircuitBoard size={15} className="muted" />
      </button>
    </aside>
  );
}
