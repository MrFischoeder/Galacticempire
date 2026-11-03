import {
  nearestSystem,
  PLANET_TYPES,
  RESOURCES,
  systemDistance,
  systemsWithin,
  type Galaxy,
  type SystemId,
} from '@ge/shared';

/** Pure helpers for the galaxy map (tested without WebGL). */

/** "Neighbours" shown in the system panel: systems within this distance. */
export const NEAR_LY = 30;

/**
 * Scene position of a system: the galaxy disk lies on the x-z plane; a small, stable height
 * from the id gives the map some depth without changing distances noticeably.
 */
export function scenePosition(galaxy: Galaxy, id: SystemId): [number, number, number] {
  const s = galaxy.systems[id];
  if (!s) throw new RangeError(`Unknown system ${id}`);
  const h = (((id * 2654435761) >>> 0) % 1000) / 1000 - 0.5;
  return [s.x, h * 6, s.y];
}

export const formatLy = (ly: number) => `${ly.toFixed(ly < 10 ? 1 : 0)} LY`;

/** Text for the system panel: planets with type, fields and speciality. */
export function systemSummary(galaxy: Galaxy, id: SystemId): { title: string; lines: string[] } {
  const s = galaxy.systems[id];
  if (!s) return { title: '', lines: [] };
  const lines = s.planets.map((pid) => {
    const p = galaxy.planets[pid];
    if (!p) return pid;
    const tags = [PLANET_TYPES[p.type].name, `${p.fields} fields`];
    if (p.speciality) tags.push(RESOURCES[p.speciality].name.toLowerCase());
    if (p.starter) tags.push('start');
    return `${p.name}: ${tags.join(', ')}`;
  });
  const nearest = nearestSystem(galaxy, id);
  const extra = [
    ...(nearest
      ? [`Nearest system: ${galaxy.systems[nearest.id]?.name} (${formatLy(nearest.ly)})`]
      : []),
    `Systems within ${NEAR_LY} LY: ${systemsWithin(galaxy, id, NEAR_LY).length}`,
    ...(s.rich ? ['Rich system'] : []),
    ...(galaxy.startSlots.includes(id) ? ['Start position'] : []),
  ];
  return { title: s.name, lines: [...extra, ...lines] };
}

/** Text of the flight preview between two systems (time and fuel come with fleets, step 1.9). */
export function flightText(galaxy: Galaxy, from: SystemId, to: SystemId): string {
  return `${galaxy.systems[from]?.name} → ${galaxy.systems[to]?.name}: ${formatLy(systemDistance(galaxy, from, to))}`;
}
