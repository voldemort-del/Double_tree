import { type ReactNode, useEffect } from 'react';

// Minimal hash-based router — no external dependencies.
// Supports paths like /guest/dashboard, /staff/requests/:id

export interface RouteMatch {
  path: string;
  segments: string[];
}

const NAV_EVENT = 'app:navigate';

function getPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash) return hash;
  const pathname = window.location.pathname;
  if (pathname && pathname !== '/') {
    window.location.hash = pathname;
    return pathname;
  }
  return '/';
}

function notifyRouteChange(): void {
  window.dispatchEvent(new Event(NAV_EVENT));
}

export function navigate(path: string): void {
  const current = getPath();
  if (current === path) {
    notifyRouteChange();
    return;
  }
  window.location.hash = path;
}

export function useRoute(): RouteMatch {
  // We use a subscription model via a custom event
  const [, setTick] = useTick();
  return {
    path: getPath(),
    segments: getPath().split('/').filter(Boolean),
  };
}

function useTick(): [number, (n: number) => void] {
  const [tick, setTick] = useStateTick();
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener('hashchange', handler);
    window.addEventListener('popstate', handler);
    window.addEventListener(NAV_EVENT, handler);
    return () => {
      window.removeEventListener('hashchange', handler);
      window.removeEventListener('popstate', handler);
      window.removeEventListener(NAV_EVENT, handler);
    };
  }, [setTick]);
  return [tick, setTick];
}

import { useState as useStateRaw } from 'react';
function useStateTick() {
  return useStateRaw(0);
}

export function RouterLink({
  to,
  children,
  className,
  onClick,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
