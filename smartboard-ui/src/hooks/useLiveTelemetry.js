import { useEffect, useState } from 'react';

/**
 * Adds small sensor noise to measurements so readings feel "live".
 * Purely presentational: the underlying values come from the device layer.
 */
export function useLiveTelemetry(measurements, interval = 1200) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!measurements) return undefined;
    const t = setInterval(() => setTick((x) => x + 1), interval);
    return () => clearInterval(t);
  }, [measurements, interval]);

  if (!measurements) return null;
  return measurements.map((m, i) => {
    if (!m.available || m.value == null || m.value === 0) return m;
    const noise = Math.sin(tick * 1.7 + i * 2.3) * 0.004 + Math.cos(tick * 0.9 + i) * 0.003;
    return { ...m, value: m.value * (1 + noise) };
  });
}
