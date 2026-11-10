/**
 * The dean logo for server-side use: the outline (Open Bot Avatar's gallery Cloud, unchanged) and helpers for
 * still frames and the favicon. The live version runs in client/dean-logo.ts.
 */
import json from './dean.json';
import { deanFavicon, deanSvg, type DeanState } from './deanframe';
import type { AvatarDefinition } from './vendor/open-bot-avatar/src/index.ts';

export const DEAN_DEFINITION = json as AvatarDefinition;

/** One still frame as an SVG string. */
export function deanStill(state: DeanState = 'idle', size = 40): string {
  return deanSvg({ definition: DEAN_DEFINITION, state, still: true, size });
}

/** `href` for <link rel="icon">: the orange cloud with two thick eyes, as an SVG data URI. */
export function deanFaviconHref(): string {
  return `data:image/svg+xml,${encodeURIComponent(deanFavicon(DEAN_DEFINITION))}`;
}
