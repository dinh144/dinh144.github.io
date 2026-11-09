/** Reader's choice to pause the type rhythm (theme-local; core preferences have no slot for it). */
const PAUSE_KEY = 'rhythm:paused';

export function isPaused(): boolean {
  try {
    return localStorage.getItem(PAUSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPaused(value: boolean) {
  try {
    localStorage.setItem(PAUSE_KEY, value ? '1' : '0');
  } catch {
    /* storage blocked: the attribute below still holds for this page view */
  }
  document.documentElement.dataset.tempo = value ? 'paused' : 'playing';
}
