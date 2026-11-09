/**
 * Three screens: dark, phosphor (green CRT) and light. Core preferences know light and dark only,
 * so phosphor is stored by this theme ('signal:screen') and rendered as data-screen="phosphor" on top
 * of data-theme="dark". Core stays the source of truth for the theme itself.
 */
import { readPrefs, resolvedTheme, setPref } from '@blog/core/client/preferences';

export type Screen = 'dark' | 'phosphor' | 'light';
const KEY = 'signal:screen';

function storedPhosphor(): boolean {
  try {
    return localStorage.getItem(KEY) === 'phosphor';
  } catch {
    return false;
  }
}

export function currentScreen(): Screen {
  const theme = resolvedTheme(readPrefs());
  if (theme === 'light') return 'light';
  return storedPhosphor() ? 'phosphor' : 'dark';
}

/** Mirror the stored screen onto <html>; call after every swap. */
export function applyScreen() {
  const root = document.documentElement;
  if (storedPhosphor()) root.dataset.screen = 'phosphor';
  else delete root.dataset.screen;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) {
    const s = currentScreen();
    meta.content = s === 'light' ? '#f4f1ea' : s === 'phosphor' ? '#040a05' : '#0c0c0c';
  }
}

export function setScreen(screen: Screen) {
  try {
    if (screen === 'phosphor') localStorage.setItem(KEY, 'phosphor');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: the attribute still applies for this page */
  }
  applyScreen();
  if (screen === 'phosphor' && !document.documentElement.dataset.screen)
    document.documentElement.dataset.screen = 'phosphor';
  // setPref dispatches prefs:change, so listeners see the final screen.
  setPref('theme', screen === 'light' ? 'light' : 'dark');
}
