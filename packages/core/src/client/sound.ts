/**
 * Interaction sounds synthesised with Web Audio: no audio files, nothing autoplays.
 * Every call is a no-op unless the reader switched sound on (data-sound="on").
 * Themes may pass their own recipe; the built-ins are a soft tick, a paper turn and an ink drop.
 */
let ctx: AudioContext | undefined;

function audio(): AudioContext | undefined {
  if (document.documentElement.dataset.sound !== 'on') return undefined;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return undefined;
  }
}

function envelope(ac: AudioContext, peak: number, attack: number, decay: number) {
  const gain = ac.createGain();
  const now = ac.currentTime;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);
  gain.connect(ac.destination);
  return gain;
}

/** Short, soft click for hovers and toggles. */
export function tick(pitch = 1) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = 1400 * pitch;
  osc.connect(envelope(ac, 0.04, 0.002, 0.05));
  osc.start();
  osc.stop(ac.currentTime + 0.08);
}

/** Filtered noise sweep, like turning a page; for page transitions. */
export function turn() {
  const ac = audio();
  if (!ac) return;
  const length = Math.floor(ac.sampleRate * 0.35);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(800, ac.currentTime);
  filter.frequency.exponentialRampToValueAtTime(3200, ac.currentTime + 0.3);
  src.connect(filter).connect(envelope(ac, 0.05, 0.03, 0.3));
  src.start();
}

/** Low, round drop; for arrivals and confirmations. */
export function drop() {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(520, ac.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180, ac.currentTime + 0.25);
  osc.connect(envelope(ac, 0.06, 0.005, 0.3));
  osc.start();
  osc.stop(ac.currentTime + 0.35);
}
