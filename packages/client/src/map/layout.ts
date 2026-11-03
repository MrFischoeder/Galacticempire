import { PLANET_TYPES, RESOURCES, type Galaxy, type Route, type SystemId } from '@ge/shared';

/** Pure helpers for the galaxy map (tested without WebGL). */

/** Systems with the most routes (5, about a fifth of them) are hubs (spec 2.1), drawn highlighted. */
export const HUB_LINKS = 5;

export function degrees(galaxy: Galaxy): number[] {
  const d = new Array<number>(galaxy.systems.length).fill(0);
  for (const r of galaxy.routes) {
    d[r.a] = (d[r.a] ?? 0) + 1;
    d[r.b] = (d[r.b] ?? 0) + 1;
  }
  return d;
}

export function isHub(galaxy: Galaxy, id: SystemId, deg = degrees(galaxy)): boolean {
  return (deg[id] ?? 0) >= HUB_LINKS;
}

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

export function routesOf(galaxy: Galaxy, id: SystemId): Route[] {
  return galaxy.routes.filter((r) => r.a === id || r.b === id);
}

/** Text for the system panel: planets with type, fields and speciality. */
export function systemSummary(galaxy: Galaxy, id: SystemId): { title: string; lines: string[] } {
  const s = galaxy.systems[id];
  if (!s) return { title: '', lines: [] };
  const lines = s.planets.map((pid) => {
    const p = galaxy.planets[pid];
    if (!p) return pid;
    const tags = [PLANET_TYPES[p.type].name, `${p.fields} pól`];
    if (p.speciality) tags.push(RESOURCES[p.speciality].name.toLowerCase());
    if (p.starter) tags.push('start');
    return `${p.name}: ${tags.join(', ')}`;
  });
  const extra = [
    `Połączenia: ${routesOf(galaxy, id).length}${isHub(galaxy, id) ? ' (węzeł)' : ''}`,
    ...(s.rich ? ['Układ bogaty'] : []),
    ...(galaxy.startSlots.includes(id) ? ['Pozycja startowa'] : []),
  ];
  return { title: s.name, lines: [...extra, ...lines] };
}
