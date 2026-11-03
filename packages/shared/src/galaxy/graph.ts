import type { Galaxy, SystemId } from './types';

/**
 * Distances (owner's decision 3.11.2026): there are no hyperspace routes; a fleet flies in a
 * straight line from any system to any other, paying time and fuel by the distance in LY.
 */
export function systemDistance(galaxy: Galaxy, a: SystemId, b: SystemId): number {
  const s = galaxy.systems[a];
  const t = galaxy.systems[b];
  if (!s || !t) throw new RangeError(`Unknown system ${a} or ${b}`);
  return Math.hypot(s.x - t.x, s.y - t.y);
}

/** Systems within `ly` of a system (itself excluded), nearest first. */
export function systemsWithin(
  galaxy: Galaxy,
  id: SystemId,
  ly: number,
): { id: SystemId; ly: number }[] {
  return galaxy.systems
    .filter((s) => s.id !== id)
    .map((s) => ({ id: s.id, ly: systemDistance(galaxy, id, s.id) }))
    .filter((x) => x.ly <= ly)
    .sort((x, y) => x.ly - y.ly || x.id - y.id);
}

export function nearestSystem(galaxy: Galaxy, id: SystemId): { id: SystemId; ly: number } | null {
  return systemsWithin(galaxy, id, Infinity)[0] ?? null;
}
