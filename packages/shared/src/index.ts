// Pure game logic. No DOM, no Node APIs, no system clock, no Math.random.
// See CLAUDE.md for the rules enforced by eslint.config.js.

export const GAME_NAME = 'Galactic Empire';

/** Clamp a value into [min, max]. Placeholder utility until step 1.1. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
