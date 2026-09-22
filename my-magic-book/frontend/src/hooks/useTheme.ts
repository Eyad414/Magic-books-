import { useCallback, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

const KEY = 'mmb_theme';

/** What the visitor last chose here, if anything. */
export function storedTheme(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    // Private windows and blocked site data throw on read.
    return null;
  }
}

/** A choice wins; otherwise follow the operating system. */
export function resolveTheme(): Theme {
  const saved = storedTheme();
  if (saved) return saved;
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function stamp(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/**
 * Dark or light, for the whole site.
 *
 * The palette lives in CSS variables (see index.css) and Tailwind reads them,
 * so flipping this attribute repaints everything — including the ~1,100 places
 * written as text-white/50 or bg-white/5, which mean "foreground at N%" rather
 * than the colour white.
 *
 * index.html stamps the attribute before first paint; this hook only keeps
 * React in step with it and writes the visitor's choice down.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    (document.documentElement.getAttribute('data-theme') as Theme) || resolveTheme(),
  );

  useEffect(() => {
    stamp(theme);
    try { localStorage.setItem(KEY, theme); } catch { /* nothing we can do */ }
  }, [theme]);

  // Follow the OS while the visitor has expressed no preference of their own.
  // Once they pick, their choice stands and this stops applying.
  useEffect(() => {
    if (storedTheme()) return;
    let mq: MediaQueryList;
    try { mq = window.matchMedia('(prefers-color-scheme: light)'); } catch { return; }
    const onChange = (e: MediaQueryListEvent) => {
      if (!storedTheme()) setTheme(e.matches ? 'light' : 'dark');
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  return { theme, setTheme, toggle };
}
