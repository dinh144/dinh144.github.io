/**
 * The sky: a deterministic star-chart layout built from the real post data.
 * Posts are stars (size = reading length, colour + shape = type), posts sharing a tag are joined
 * by faint lines, series are drawn as named constellations. The layout is computed once per locale
 * at build time with a small force simulation, in three "worlds": landscape (desktop), mid (tablet,
 * the chart beside the copy) and portrait (phone, the chart above the copy).
 * Every page frames a region of the same sky, so moving between pages feels like moving the telescope.
 * Presentation only: all data comes from @blog/core.
 */
import { slugify, t, type Locale } from '@blog/core/i18n';
import { getPosts, getSeriesList, tagsOf, type Post } from '@blog/core/posts';
import { paths } from '@blog/core/routes';
import { tagLabel } from './tags';

export type Orientation = 'land' | 'mid' | 'port';
export const ORIENTATIONS: Orientation[] = ['land', 'mid', 'port'];
export interface Pt {
  x: number;
  y: number;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SkyStar {
  slug: string;
  title: string;
  href: string;
  type: 'article' | 'note' | 'link';
  minutes: number;
  date: string;
  tags: string[];
  series?: { id: string; part: number };
  /** 0..1, from reading length. */
  mag: number;
  /** Short meta line under the label. */
  meta: string;
  /** Shown in the default locale because this locale has no translation yet. */
  fallback: boolean;
  pos: Record<Orientation, Pt>;
  /** Which side of the star its label sits on, per world. */
  side: Record<Orientation, 'r' | 'l'>;
}
export interface SkyEdge {
  a: string;
  b: string;
  kind: 'tag' | 'series';
  tags: string[];
}
export interface SkyAnchor {
  id: string;
  kind: 'tag' | 'series';
  label: string;
  href: string;
  members: string[];
  pos: Record<Orientation, Pt>;
}
export interface Sky {
  locale: Locale;
  stars: SkyStar[];
  edges: SkyEdge[];
  anchors: SkyAnchor[];
  world: Record<Orientation, { w: number; h: number }>;
  counts: { stars: number; topics: number; constellations: number };
}

/**
 * Reference world sizes in CSS px. land: the full-bleed desktop hero; mid: the chart column beside
 * the copy on tablets / small laptops; port: the chart box between header and copy on phones.
 */
export const WORLD: Record<Orientation, { w: number; h: number }> = {
  land: { w: 1440, h: 820 },
  mid: { w: 640, h: 700 },
  port: { w: 390, h: 440 },
};
/** Label sizing per world (px): max label width, average glyph width, max lines. */
const LABEL: Record<Orientation, { max: number; char: number; lines: number; line: number; meta: number }> = {
  land: { max: 200, char: 7.4, lines: 4, line: 20, meta: 18 },
  mid: { max: 168, char: 7.0, lines: 3, line: 19, meta: 0 },
  port: { max: 168, char: 6.6, lines: 3, line: 17, meta: 0 },
};
/** On phones only the bright stars (articles) carry a standing label; the rest name themselves on tap. */
export function labelledIn(o: Orientation, type: string): boolean {
  return o !== 'port' || type === 'article';
}

/** Where stars may sit on the home hero, and where the title cartouche and legend live. */
const HOME: Record<Orientation, { bounds: Rect; avoid: Rect[] }> = {
  land: {
    bounds: { x: 90, y: 150, w: 1270, h: 600 },
    avoid: [
      { x: 0, y: 455, w: 760, h: 365 }, // title cartouche, bottom left
      { x: 1110, y: 640, w: 330, h: 180 }, // legend, bottom right
    ],
  },
  mid: {
    bounds: { x: 20, y: 112, w: 600, h: 560 },
    avoid: [],
  },
  port: {
    bounds: { x: 8, y: 14, w: 374, h: 412 },
    avoid: [],
  },
};

/* ---------- deterministic randomness ---------- */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/* ---------- force layout ---------- */
interface SimNode {
  id: string;
  kind: 'star' | 'anchor';
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Label footprint (width, height); for stars the label sits beside the dot. */
  lw: number;
  lh: number;
  r: number;
  side: 'r' | 'l';
}
interface SimLink {
  a: number;
  b: number;
  rest: number;
  k: number;
}

function footprint(n: SimNode): Rect {
  if (n.kind === 'anchor') return { x: n.x - n.lw / 2, y: n.y - n.lh / 2, w: n.lw, h: n.lh };
  const gap = 12;
  return n.side === 'r'
    ? { x: n.x - n.r, y: n.y - n.lh / 2, w: n.r + gap + n.lw, h: n.lh }
    : { x: n.x - gap - n.lw, y: n.y - n.lh / 2, w: n.r + gap + n.lw, h: n.lh };
}

/** Does segment p-q pass through rect r (inflated by pad)? */
function segmentHits(px: number, py: number, qx: number, qy: number, r: Rect, pad = 6): boolean {
  for (let i = 1; i < 16; i++) {
    const x = px + ((qx - px) * i) / 16;
    const y = py + ((qy - py) * i) / 16;
    if (x > r.x - pad && x < r.x + r.w + pad && y > r.y - pad && y < r.y + r.h + pad) return true;
  }
  return false;
}

function simulate(
  nodes: SimNode[],
  links: SimLink[],
  bounds: Rect,
  avoid: Rect[],
  segments: [number, number][] = [],
  iterations = 700,
) {
  const cx = bounds.x + bounds.w / 2;
  const cy = bounds.y + bounds.h / 2;
  const spread = Math.min(bounds.w, bounds.h);
  for (let it = 0; it < iterations; it++) {
    const alpha = 1 - it / iterations;
    // springs
    for (const l of links) {
      const a = nodes[l.a];
      const b = nodes[l.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = ((d - l.rest) / d) * l.k * alpha;
      a.vx += dx * f;
      a.vy += dy * f;
      b.vx -= dx * f;
      b.vy -= dy * f;
    }
    // repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = (b.x - a.x) / 1.6; // labels are wide: repel more along y
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy + 40;
        const f = ((spread * spread * 1.2) / d2) * alpha * 0.02;
        const d = Math.sqrt(d2);
        a.vx -= (dx / d) * f;
        a.vy -= (dy / d) * f;
        b.vx += (dx / d) * f;
        b.vy += (dy / d) * f;
      }
    }
    // gravity + integrate
    for (const n of nodes) {
      n.vx += (cx - n.x) * 0.0022 * alpha;
      n.vy += (cy - n.y) * 0.0036 * alpha;
      n.vx *= 0.6;
      n.vy *= 0.6;
      n.x += Math.max(-30, Math.min(30, n.vx));
      n.y += Math.max(-30, Math.min(30, n.vy));
      if (n.kind === 'star') n.side = n.x + 12 + n.lw > bounds.x + bounds.w ? 'l' : 'r';
    }
    // collisions between footprints
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const A = footprint(nodes[i]);
          const B = footprint(nodes[j]);
          const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) + 10;
          const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) + 10;
          if (ox > 0 && oy > 0) {
            const sx = A.x + A.w / 2 < B.x + B.w / 2 ? -1 : 1;
            const sy = A.y + A.h / 2 < B.y + B.h / 2 ? -1 : 1;
            if (oy < ox) {
              nodes[i].y += (sy * oy) / 2;
              nodes[j].y -= (sy * oy) / 2;
            } else {
              nodes[i].x += (sx * ox) / 2;
              nodes[j].x -= (sx * ox) / 2;
            }
          }
        }
      }
    }
    // region names never sit on a constellation line: push them off the segment
    if (it > iterations * 0.4) {
      for (const n of nodes) {
        if (n.kind !== 'anchor') continue;
        const f = footprint(n);
        for (const [ia, ib] of segments) {
          const a = nodes[ia];
          const b = nodes[ib];
          if (!segmentHits(a.x, a.y, b.x, b.y, f)) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          let nx = -dy / len;
          let ny = dx / len;
          if ((n.x - a.x) * nx + (n.y - a.y) * ny < 0) {
            nx = -nx;
            ny = -ny;
          }
          n.x += nx * 6;
          n.y += ny * 6;
        }
      }
    }
    // hard constraints: bounds + keep-out rects
    for (const n of nodes) {
      const f = footprint(n);
      if (f.x < bounds.x) n.x += bounds.x - f.x;
      if (f.x + f.w > bounds.x + bounds.w) n.x -= f.x + f.w - (bounds.x + bounds.w);
      if (f.y < bounds.y) n.y += bounds.y - f.y;
      if (f.y + f.h > bounds.y + bounds.h) n.y -= f.y + f.h - (bounds.y + bounds.h);
      for (const r of avoid) {
        const g = footprint(n);
        const ox = Math.min(g.x + g.w, r.x + r.w) - Math.max(g.x, r.x);
        const oy = Math.min(g.y + g.h, r.y + r.h) - Math.max(g.y, r.y);
        if (ox > 0 && oy > 0) {
          // push out along the cheapest axis, staying inside the bounds
          const up = g.y + g.h - r.y;
          const down = r.y + r.h - g.y;
          const left = g.x + g.w - r.x;
          const right = r.x + r.w - g.x;
          const best = Math.min(up, down, left, right);
          if (best === up) n.y -= up;
          else if (best === down) n.y += down;
          else if (best === left) n.x -= left;
          else n.x += right;
        }
      }
    }
  }
}

/* ---------- build ---------- */
function metaFor(post: Post): string {
  const { data, locale } = post;
  if (data.type === 'note') return t(locale, 'type.note');
  if (data.type === 'link')
    return `${t(locale, 'type.link')} · ${data.link ? new URL(data.link).hostname.replace(/^www\./, '') : ''}`;
  return `${t(locale, 'type.article')} · ${t(locale, 'post.minutes', { n: post.minutes })}`;
}

const cache = new Map<Locale, Promise<Sky>>();

export function getSky(locale: Locale): Promise<Sky> {
  let sky = cache.get(locale);
  if (!sky) {
    sky = buildSky(locale);
    cache.set(locale, sky);
  }
  return sky;
}

async function buildSky(locale: Locale): Promise<Sky> {
  const posts = await getPosts(locale);
  const seriesList = await getSeriesList(locale);
  const tags = tagsOf(posts);
  const maxMinutes = Math.max(1, ...posts.map((p) => p.minutes));

  // Edges: within each tag, join posts in date order (a path reads as a constellation, a clique as noise).
  const edgeMap = new Map<string, SkyEdge>();
  const addEdge = (a: string, b: string, kind: 'tag' | 'series', tag?: string) => {
    const key = [a, b].sort().join('|');
    const edge = edgeMap.get(key) ?? { a, b, kind, tags: [] };
    if (kind === 'series') edge.kind = 'series';
    if (tag && !edge.tags.includes(tag)) edge.tags.push(tag);
    edgeMap.set(key, edge);
  };
  for (const tag of tags) {
    const members = posts
      .filter((p) => p.data.tags.some((x) => slugify(x) === tag.slug))
      .sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
    for (let i = 1; i < members.length; i++) addEdge(members[i - 1].slug, members[i].slug, 'tag', tag.slug);
  }
  for (const series of seriesList) {
    for (let i = 1; i < series.parts.length; i++) addEdge(series.parts[i - 1].slug, series.parts[i].slug, 'series');
  }
  const edges = [...edgeMap.values()];

  const anchorsBase: Omit<SkyAnchor, 'pos'>[] = [
    ...tags
      .filter((tag) => tag.count >= 2)
      .map((tag) => ({
        id: `tag:${tag.slug}`,
        kind: 'tag' as const,
        label: tagLabel(locale, tag.name).replaceAll('-', ' '),
        href: paths.tag(locale, tag.name),
        members: posts.filter((p) => p.data.tags.some((x) => slugify(x) === tag.slug)).map((p) => p.slug),
      })),
    ...seriesList.map((s) => ({
      id: `series:${s.id}`,
      kind: 'series' as const,
      label: s.title,
      href: paths.series(locale, s.id),
      members: s.parts.map((p) => p.slug),
    })),
  ];

  const positions: Record<Orientation, { stars: Map<string, SimNode>; anchors: Map<string, SimNode> }> = {
    land: { stars: new Map(), anchors: new Map() },
    mid: { stars: new Map(), anchors: new Map() },
    port: { stars: new Map(), anchors: new Map() },
  };

  for (const o of ORIENTATIONS) {
    const { bounds, avoid } = HOME[o];
    const nodes: SimNode[] = [];
    const index = new Map<string, number>();
    const L = LABEL[o];
    for (const post of posts) {
      const r = rng(hash(`${post.slug}:${o}`));
      const len = post.data.title.length;
      const labelled = labelledIn(o, post.data.type);
      const lines = Math.min(L.lines, Math.ceil((len * L.char) / L.max));
      const lw = labelled ? Math.min(L.max, len * L.char) : 4;
      index.set(post.slug, nodes.length);
      nodes.push({
        id: post.slug,
        kind: 'star',
        x: bounds.x + r() * bounds.w,
        y: bounds.y + r() * bounds.h,
        vx: 0,
        vy: 0,
        lw,
        lh: labelled ? 10 + L.meta + lines * L.line : 30,
        r: 10,
        side: 'r',
      });
    }
    for (const anchor of anchorsBase) {
      const r = rng(hash(`${anchor.id}:${o}`));
      index.set(anchor.id, nodes.length);
      const big = anchor.kind === 'series';
      nodes.push({
        id: anchor.id,
        kind: 'anchor',
        x: bounds.x + r() * bounds.w,
        y: bounds.y + r() * bounds.h,
        vx: 0,
        vy: 0,
        lw: Math.min(o === 'land' ? 320 : 230, anchor.label.length * (big ? 10 : o === 'port' ? 7.6 : 8.6) + 20),
        lh: big ? 30 : 22,
        r: 0,
        side: 'r',
      });
    }
    const links: SimLink[] = [];
    for (const e of edges) {
      links.push({
        a: index.get(e.a)!,
        b: index.get(e.b)!,
        rest: o === 'land' ? 230 : o === 'mid' ? 150 : 120,
        k: e.kind === 'series' ? 0.08 : 0.04,
      });
    }
    for (const anchor of anchorsBase) {
      const series = anchor.kind === 'series';
      for (const m of anchor.members) {
        links.push({
          a: index.get(anchor.id)!,
          b: index.get(m)!,
          rest: (o === 'land' ? 120 : o === 'mid' ? 90 : 70) * (series ? 0.6 : 1),
          k: series ? 0.07 : 0.03,
        });
      }
    }
    const segments = edges.map((e) => [index.get(e.a)!, index.get(e.b)!] as [number, number]);
    simulate(nodes, links, bounds, avoid, segments);
    for (const n of nodes) (n.kind === 'star' ? positions[o].stars : positions[o].anchors).set(n.id, n);
  }

  const stars: SkyStar[] = posts.map((post) => {
    const at = (o: Orientation) => positions[o].stars.get(post.slug)!;
    const base = post.data.type === 'article' ? 0.45 : post.data.type === 'link' ? 0.22 : 0.12;
    return {
      slug: post.slug,
      title: post.data.title,
      href: paths.post(post),
      type: post.data.type,
      minutes: post.minutes,
      date: post.data.date.toISOString(),
      tags: post.data.tags.map(slugify),
      series: post.data.series,
      mag: Math.min(1, base + (0.55 * Math.log2(1 + post.minutes)) / Math.log2(1 + maxMinutes)),
      meta: metaFor(post),
      fallback: post.fallback,
      pos: {
        land: { x: at('land').x, y: at('land').y },
        mid: { x: at('mid').x, y: at('mid').y },
        port: { x: at('port').x, y: at('port').y },
      },
      side: { land: at('land').side, mid: at('mid').side, port: at('port').side },
    };
  });
  const anchors: SkyAnchor[] = anchorsBase.map((a) => {
    const at = (o: Orientation) => positions[o].anchors.get(a.id)!;
    return {
      ...a,
      pos: {
        land: { x: at('land').x, y: at('land').y },
        mid: { x: at('mid').x, y: at('mid').y },
        port: { x: at('port').x, y: at('port').y },
      },
    };
  });

  return {
    locale,
    stars,
    edges,
    anchors,
    world: WORLD,
    counts: { stars: posts.length, topics: tags.length, constellations: seriesList.length },
  };
}

/* ---------- frames: which region of the sky a stage shows ---------- */
/** The whole world in every orientation (home hero, 404). */
export function worldFrame(): Record<Orientation, Rect> {
  return {
    land: { x: 0, y: 0, ...WORLD.land },
    mid: { x: 0, y: 0, ...WORLD.mid },
    port: { x: 0, y: 0, ...WORLD.port },
  };
}

export interface FrameSpec {
  /** Stars the frame is built around; empty = the whole world. */
  focus?: string[];
  /** Reference stage aspect (w/h) per orientation. */
  aspect: { land: number; port: number; mid?: number };
  /** Padding around the focus box, in world px. */
  pad?: number;
  /** Minimum frame width as a share of the world width (keeps a single star from filling the frame). */
  minShare?: number;
  /** Count the stars' labels into the focus box (off for a lone "you are here" star). */
  labels?: boolean;
}

export function frameFor(sky: Sky, spec: FrameSpec): Record<Orientation, Rect> {
  const out = {} as Record<Orientation, Rect>;
  for (const o of ORIENTATIONS) {
    const world = sky.world[o];
    const focus = spec.focus?.length ? sky.stars.filter((s) => spec.focus!.includes(s.slug)) : [];
    let box: Rect;
    if (!focus.length) {
      box = { x: 0, y: 0, w: world.w, h: world.h };
    } else {
      const pad = spec.pad ?? (o === 'land' ? 120 : 60);
      const labelW = spec.labels === false ? 0 : o === 'land' ? 210 : 170;
      const xs = focus.flatMap((s) => [s.pos[o].x, s.pos[o].x + (s.side[o] === 'r' ? labelW : -labelW)]);
      const ys = focus.map((s) => s.pos[o].y);
      const x0 = Math.min(...xs) - pad;
      const x1 = Math.max(...xs) + pad;
      const y0 = Math.min(...ys) - pad;
      const y1 = Math.max(...ys) + pad;
      box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
      const minW = world.w * (spec.minShare ?? 0.36);
      if (box.w < minW) {
        box.x -= (minW - box.w) / 2;
        box.w = minW;
      }
    }
    // expand to the stage aspect, centred
    const aspect = spec.aspect[o] ?? spec.aspect.land;
    if (box.w / box.h > aspect) {
      const h = box.w / aspect;
      box.y -= (h - box.h) / 2;
      box.h = h;
    } else {
      const w = box.h * aspect;
      box.x -= (w - box.w) / 2;
      box.w = w;
    }
    out[o] = box;
  }
  return out;
}

export const GREEK = [
  'α',
  'β',
  'γ',
  'δ',
  'ε',
  'ζ',
  'η',
  'θ',
  'ι',
  'κ',
  'λ',
  'μ',
  'ν',
  'ξ',
  'ο',
  'π',
  'ρ',
  'σ',
  'τ',
  'υ',
];

/** Neighbours of a post: stars that share a tag or a series with it. */
export function neighboursOf(sky: Sky, slug: string, max = 5): string[] {
  const me = sky.stars.find((s) => s.slug === slug);
  if (!me) return [];
  const t0 = Date.parse(me.date);
  return sky.stars
    .filter((s) => s.slug !== slug)
    .map((s) => {
      const series = me.series && s.series?.id === me.series.id ? 1 : 0;
      const shared = s.tags.filter((tg) => me.tags.includes(tg)).length;
      return { s, score: series * 10 + shared, gap: Math.abs(Date.parse(s.date) - t0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.gap - b.gap)
    .slice(0, max)
    .map((x) => x.s.slug);
}
