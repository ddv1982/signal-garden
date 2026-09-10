import { useSyncExternalStore } from 'react';

function readSystemReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

function subscribe(onChange: () => void) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }
  query.addListener(onChange);
  return () => query.removeListener(onChange);
}

export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, readSystemReducedMotion, () => false);
}
