/** Small status pill with an optional live dot. */
export default function StatusPill({ tone = 'neutral', live = false, children, title }) {
  return (
    <span className={`pill pill--${tone}`} title={title}>
      {live && <span className="pill-dot" />}
      {children}
    </span>
  );
}
