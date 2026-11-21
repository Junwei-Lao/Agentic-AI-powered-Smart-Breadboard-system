/** Pinpoint brand mark: a breadboard hole grid with one "pinpointed" node. */
export default function Logo({ size = 28, withWordmark = true }) {
  const holes = [
    [7, 7], [14, 7], [21, 7],
    [7, 14], [21, 14],
    [7, 21], [14, 21], [21, 21],
  ];
  return (
    <span className="logo">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--surface-3)" />
        {holes.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" fill="var(--logo-hole)" />
        ))}
        <circle cx="16" cy="16" r="6" fill="none" stroke="var(--brand)" strokeOpacity=".45" strokeWidth="1.4" className="logo-pulse" />
        <circle cx="16" cy="16" r="3.2" fill="var(--brand)" />
      </svg>
      {withWordmark && (
        <span className="logo-word">
          Pinpoint<span className="logo-sub">Smart Breadboard</span>
        </span>
      )}
    </span>
  );
}
