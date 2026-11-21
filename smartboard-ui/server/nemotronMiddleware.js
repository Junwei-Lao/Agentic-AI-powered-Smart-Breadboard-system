import { inspectSnapshot, runNemotron, DEFAULT_MODEL } from './nemotron.js';

export function nemotronMiddleware(env, fetcher) {
  return async (req, res, next) => {
    if (req.url?.split('?')[0] !== '/api/nemotron/triage') return next();
    const json = (status, result) => res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    }).end(JSON.stringify(result));
    if (req.method !== 'POST') return json(405, { error: 'Expected POST' });
    if (req.headers['sec-fetch-site'] === 'cross-site' ||
        (req.headers.origin && URL.parse(req.headers.origin)?.host !== req.headers.host)) {
      return json(403, { error: 'Expected same-origin request' });
    }
    if (!req.headers['content-type']?.startsWith('application/json')) return json(415, { error: 'Expected JSON' });
    const key = env.NVIDIA_API_KEY?.trim();
    if (!key) return json(200, { mode: 'local', reason: 'missing_key', activity: [] });
    const controller = new AbortController();
    res.once('close', () => controller.abort());
    let snapshot;
    try {
      let raw = '';
      req.setEncoding('utf8');
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 20000) return json(413, { error: 'Payload too large' });
      }
      snapshot = inspectSnapshot(JSON.parse(raw));
    } catch {
      if (!res.destroyed) return json(400, { error: 'Invalid board snapshot' });
      return;
    }
    const result = await runNemotron(snapshot, {
      key, model: env.NVIDIA_MODEL?.trim() || DEFAULT_MODEL, signal: controller.signal, fetcher,
    });
    if (!res.destroyed) json(200, result);
  };
}
