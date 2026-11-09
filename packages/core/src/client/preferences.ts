/**
 * Reader preferences, stored per browser: colour theme, reading mode, sound.
 * Everything is reflected as data attributes on <html> so themes can style and gate effects:
 *   data-theme="light|dark"   resolved theme
 *   data-reading="on|off"     reading mode (effects off on article pages)
 *   data-sound="on|off"       interaction sounds
 *   data-motion="full|reduce" reduce when the OS asks for it or reading mode is on
 */
export type ThemePref = 'light' | 'dark' | 'system';
export interface Prefs {
  theme: ThemePref;
  reading: boolean;
  sound: boolean;
}

const KEY = 'blog:prefs';
const DEFAULTS: Prefs = { theme: 'system', reading: false, sound: false };

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function writePrefs(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* private mode or blocked storage: keep the in-memory value only */
  }
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function resolvedTheme(prefs: Prefs = readPrefs()): 'light' | 'dark' {
  if (prefs.theme !== 'system') return prefs.theme;
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyPrefs(prefs: Prefs = readPrefs()) {
  const root = document.documentElement;
  root.dataset.theme = resolvedTheme(prefs);
  root.dataset.reading = prefs.reading ? 'on' : 'off';
  root.dataset.sound = prefs.sound ? 'on' : 'off';
  root.dataset.motion = prefersReducedMotion() || prefs.reading ? 'reduce' : 'full';
}

export function setPref<K extends keyof Prefs>(key: K, value: Prefs[K]) {
  const prefs = { ...readPrefs(), [key]: value };
  writePrefs(prefs);
  applyPrefs(prefs);
  document.dispatchEvent(new CustomEvent('prefs:change', { detail: prefs }));
}

export function togglePref(key: 'reading' | 'sound') {
  setPref(key, !readPrefs()[key]);
}

export function toggleTheme() {
  setPref('theme', resolvedTheme() === 'dark' ? 'light' : 'dark');
}

/** True when heavy effects may run right now. Themes check this before starting WebGL, smooth scroll, etc. */
export function motionAllowed(): boolean {
  return document.documentElement.dataset.motion !== 'reduce';
}

/** Re-apply when the OS settings change. Call once per page load. */
export function watchSystemPrefs() {
  if (typeof matchMedia !== 'function') return;
  for (const query of ['(prefers-reduced-motion: reduce)', '(prefers-color-scheme: dark)']) {
    matchMedia(query).addEventListener('change', () => {
      applyPrefs();
      document.dispatchEvent(new CustomEvent('prefs:change', { detail: readPrefs() }));
    });
  }
}
