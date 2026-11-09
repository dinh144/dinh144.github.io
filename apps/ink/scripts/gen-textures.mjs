#!/usr/bin/env node
// Generates the theme's raster textures into public/tex/ (committed; rerun only to tweak them):
//   paper-light.png / paper-dark.png  tileable paper fibre + mottling overlays (alpha only)
//   blot.png                          organic ink blot, the mask for the page-turn ink wipe
//   wash.png                          ragged ink-wash edge, the mask for list reveals
// Pure Node (zlib PNG encoder), seeded, so the output is reproducible.
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const out = new URL('../public/tex/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

/* ---------- seeded random + tileable value noise ---------- */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function lattice(n, seed) {
  const r = rng(seed);
  return Float32Array.from({ length: n * n }, () => r());
}
const smooth = (t) => t * t * (3 - 2 * t);
/** Value noise that wraps every `period` cells, sampled at (x, y) in cell units. */
function noise(grid, period, x, y) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smooth(x - xi);
  const fy = smooth(y - yi);
  const at = (i, j) => grid[(((j % period) + period) % period) * period + (((i % period) + period) % period)];
  const a = at(xi, yi);
  const b = at(xi + 1, yi);
  const c = at(xi, yi + 1);
  const d = at(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
// Cache lattices: fbm above rebuilds them per call, which is too slow for full images.
function fbmField(w, h, octaves, seed, base = 4, tile = true) {
  const grids = [];
  for (let o = 0; o < octaves; o++) grids.push(lattice(base << o, seed + o * 101));
  const f = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let amp = 0.5;
      let norm = 0;
      for (let o = 0; o < octaves; o++) {
        const period = base << o;
        const u = tile ? x / w : x / Math.max(w, h);
        const v = tile ? y / h : y / Math.max(w, h);
        sum += amp * noise(grids[o], period, u * period, v * period);
        norm += amp;
        amp *= 0.5;
      }
      f[y * w + x] = sum / norm;
    }
  return f;
}

/* ---------- PNG encoder (RGBA8) ---------- */
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** RGBA PNG with one flat colour (`rgb`, 0..255) and a per-pixel alpha (0..1). */
function pngA(w, h, rgb, alpha) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = y * (w * 4 + 1) + 1 + x * 4;
      raw[o] = rgb[0];
      raw[o + 1] = rgb[1];
      raw[o + 2] = rgb[2];
      // Quantise alpha to even steps: invisible difference, much better compression.
      raw[o + 3] = Math.round(Math.min(1, Math.max(0, alpha[i])) * 127) * 2;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ---------- paper: mottled sizing + long thin fibres, tileable ---------- */
function paper(seed, strength) {
  const S = 320;
  const mottle = fbmField(S, S, 5, seed, 3);
  const fine = fbmField(S, S, 3, seed + 7, 48);
  const a = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const m = Math.max(0, mottle[i] - 0.3) * 0.2;
    const f = Math.max(0, fine[i] - 0.45) * 0.12;
    a[i] = (m + f) * strength;
  }
  // Fibres: short curved strokes, drawn with wraparound so the tile seams vanish.
  const r = rng(seed + 99);
  for (let n = 0; n < 70; n++) {
    let x = r() * S;
    let y = r() * S;
    let ang = r() * Math.PI * 2;
    const len = 10 + r() * 46;
    const weight = (0.025 + r() * 0.05) * strength;
    for (let s = 0; s < len; s += 0.5) {
      ang += (r() - 0.5) * 0.12;
      x += Math.cos(ang) * 0.5;
      y += Math.sin(ang) * 0.5;
      const fade = Math.sin((s / len) * Math.PI);
      const xi = ((Math.round(x) % S) + S) % S;
      const yi = ((Math.round(y) % S) + S) % S;
      a[yi * S + xi] = Math.min(1, a[yi * S + xi] + weight * fade);
    }
  }
  return { S, a };
}
{
  const { S, a } = paper(11, 1);
  writeFileSync(
    `${out}paper-light.png`,
    pngA(S, S, [92, 70, 48], a),
  );
  const d = paper(23, 0.8);
  writeFileSync(
    `${out}paper-dark.png`,
    pngA(d.S, d.S, [236, 222, 204], d.a),
  );
}

/* ---------- blot: a wet ink blot with a ragged rim and a few satellites ---------- */
{
  const S = 512;
  const edge = fbmField(S, S, 5, 5, 4);
  const a = new Float32Array(S * S);
  const c = S / 2;
  const sats = [];
  const r = rng(77);
  for (let n = 0; n < 9; n++) {
    const ang = r() * Math.PI * 2;
    const dist = 0.36 + r() * 0.1;
    sats.push([c + Math.cos(ang) * dist * S, c + Math.sin(ang) * dist * S, 4 + r() * 12]);
  }
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const dx = (x - c) / S;
      const dy = (y - c) / S;
      const rad = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      const wobble = 0.3 + 0.07 * Math.sin(ang * 3 + 1.3) + 0.04 * Math.sin(ang * 7) + (edge[i] - 0.5) * 0.14;
      let v = Math.min(1, Math.max(0, (wobble - rad) / 0.012));
      for (const [sx, sy, sr] of sats) {
        const d = Math.hypot(x - sx, y - sy);
        v = Math.max(v, Math.min(1, Math.max(0, (sr - d) / 1.5)));
      }
      a[i] = v;
    }
  writeFileSync(
    `${out}blot.png`,
    pngA(S, S, [255, 255, 255], a),
  );
}

/* ---------- wash: opaque left third, ragged soft edge, transparent right ---------- */
{
  const W = 1200;
  const H = 120;
  const n1 = fbmField(W, H, 5, 31, 6, false);
  const a = new Float32Array(W * H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const edgeX = 600 + (n1[i] - 0.5) * 220 + Math.sin(y * 0.07) * 18;
      a[i] = Math.min(1, Math.max(0, (edgeX - x) / 70 + 0.5));
    }
  writeFileSync(
    `${out}wash.png`,
    pngA(W, H, [255, 255, 255], a),
  );
}
console.log('textures written to', out);
