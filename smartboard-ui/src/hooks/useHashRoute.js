import { useCallback, useEffect, useState } from 'react';

const read = (fallback) => window.location.hash.replace(/^#\/?/, '') || fallback;

/** Minimal hash router: '#/workspace' → 'workspace'. */
export function useHashRoute(fallback = 'workspace') {
  const [route, setRoute] = useState(() => read(fallback));
  useEffect(() => {
    const onHash = () => setRoute(read(fallback));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [fallback]);
  const navigate = useCallback((to) => {
    window.location.hash = `/${to}`;
  }, []);
  return [route, navigate];
}
