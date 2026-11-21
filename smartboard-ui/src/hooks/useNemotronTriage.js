import { useEffect, useState } from 'react';

const CHECKING = { mode: 'checking' };

export function useNemotronTriage({ enabled, hardware, diagnostics, project }) {
  const [receipt, setReceipt] = useState(null);
  const revision = hardware.events[0]?.id;
  const requested = enabled && hardware.connection === 'connected'
    && (diagnostics.issues.length > 0 || diagnostics.status === 'complete');
  const key = requested ? project.id + ':' + (revision || hardware.seq) : null;

  useEffect(() => {
    if (!key) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/nemotron/triage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id, components: hardware.components }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(24000)]),
        });
        if (!response.ok) throw new Error('Triage unavailable');
        const result = await response.json();
        if (!controller.signal.aborted) setReceipt({ key, result });
      } catch {
        if (!controller.signal.aborted) setReceipt({ key, result: { mode: 'local', reason: 'unavailable' } });
      }
    }, 240);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, hardware.components, project.id]);

  if (!key) return null;
  return receipt?.key === key ? receipt.result : CHECKING;
}
