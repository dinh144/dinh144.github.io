import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';

const requireFrom = createRequire(import.meta.url);
// Loaded through require at runtime so the bundler never tries to inline the native .node binding.
const { Resvg } = requireFrom('@resvg/resvg-js') as typeof import('@resvg/resvg-js');

export interface OgColors {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
}

export const DEFAULT_OG_COLORS: OgColors = { bg: '#F4F1EA', ink: '#22201E', muted: '#6A625C', accent: '#A50E1A' };

type FontWeight = 400 | 800;
let fontsPromise: Promise<{ name: string; data: Buffer; weight: FontWeight; style: 'normal' }[]> | undefined;

/** Be Vietnam Pro, latin + vietnamese subsets (satori reads woff, not woff2). */
function loadFonts() {
  fontsPromise ??= Promise.all(
    (['latin', 'vietnamese'] as const).flatMap((subset) =>
      ([400, 800] as const).map(async (weight) => ({
        name: `BVP-${subset}`,
        weight,
        style: 'normal' as const,
        data: await readFile(
          requireFrom.resolve(`@fontsource/be-vietnam-pro/files/be-vietnam-pro-${subset}-${weight}-normal.woff`),
        ),
      })),
    ),
  );
  return fontsPromise;
}

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

/** 1200x630 share image: kicker line, big title, site name. */
export async function renderOg(opts: {
  title: string;
  kicker: string;
  site: string;
  colors?: Partial<OgColors>;
}): Promise<Buffer> {
  const c = { ...DEFAULT_OG_COLORS, ...opts.colors };
  const size = opts.title.length > 70 ? 56 : opts.title.length > 40 ? 68 : 84;
  const tree = h(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '72px 80px',
      background: c.bg,
      color: c.ink,
      fontFamily: 'BVP-latin, BVP-vietnamese',
    },
    [
      h('div', { display: 'flex', fontSize: 30, color: c.accent, letterSpacing: 1 }, opts.kicker),
      h('div', { display: 'flex', fontSize: size, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2 }, opts.title),
      h('div', { display: 'flex', justifyContent: 'space-between', fontSize: 28, color: c.muted }, [
        h('div', { display: 'flex' }, opts.site),
        h('div', { display: 'flex', width: 120, height: 10, background: c.accent, marginTop: 14 }),
      ]),
    ],
  );
  const svg = await satori(tree as never, { width: 1200, height: 630, fonts: await loadFonts() });
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}
