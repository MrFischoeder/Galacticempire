import { GALAXY } from '../config/galaxy';
import {
  BASIC_MINERALS,
  DEPOSITS,
  PLANET_FIELDS,
  PLANET_TYPES,
  IN_SYSTEM_LY,
  STARTER_PLANET,
  type DepositClass,
  type PlanetTypeId,
} from '../config/planets';
import type { MinedResource } from '../config/resources';
import { rngStream, type Rng } from '../core/rng';
import { adjacency, dijkstra, hopCounts, isConnected } from './graph';
import { ROMAN, starName } from './names';
import type { Deposit, Galaxy, Planet, Route, StarSystem, SystemId } from './types';

/**
 * Deterministic galaxy generator (spec 2.1-2.3, 15). Same seed and options = same galaxy.
 * Steps: positions in a disk, Gabriel-graph routes limited to 2-5 links, start slots far
 * apart by route, then planets (rich systems and anomalies away from the starts, special
 * deposits guaranteed near every start).
 */
export interface GalaxyOptions {
  readonly systems?: number;
  /** Disk radius in LY (default: grows with the number of systems at a constant density). */
  readonly radius?: number;
  readonly startSlots?: number;
}

/** Galaxy size for a number of players: at least the stage 1 default of 60 systems. */
export function systemsFor(players: number): number {
  return Math.max(GALAXY.systems, Math.ceil(players * GALAXY.systemsPerPlayer));
}

/** Radius that keeps the stage 1 density (60 systems in 100 LY) for any galaxy size. */
export function radiusFor(systems: number): number {
  return GALAXY.radius * Math.sqrt(systems / GALAXY.systems);
}

interface Point {
  x: number;
  y: number;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function placeSystems(rng: Rng, count: number, radius: number): Point[] {
  const points: Point[] = [];
  for (let tries = 0; points.length < count && tries < count * 2000; tries++) {
    const r = radius * Math.sqrt(rng.float());
    const a = rng.float() * Math.PI * 2;
    const p = { x: r * Math.cos(a), y: r * Math.sin(a) };
    if (points.every((q) => dist(p, q) >= GALAXY.minSpacing)) points.push(p);
  }
  if (points.length < count)
    throw new Error(`Could only place ${points.length} of ${count} systems`);
  return points;
}

const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`);

function buildRoutes(points: Point[]): Route[] {
  const n = points.length;
  const edges = new Map<string, Route>();
  // Gabriel graph: a and b are linked when no other system lies inside the circle on a-b.
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      const pa = points[a] as Point;
      const pb = points[b] as Point;
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      const r = dist(pa, pb) / 2;
      let empty = true;
      for (let k = 0; k < n && empty; k++) {
        if (k !== a && k !== b && dist(points[k] as Point, mid) < r - 1e-9) empty = false;
      }
      if (empty) edges.set(key(a, b), { a, b, ly: dist(pa, pb) });
    }
  }
  const degree = (s: number) => [...edges.values()].filter((e) => e.a === s || e.b === s).length;

  // Trim to at most maxLinks, dropping the longest links that keep the graph connected.
  for (let s = 0; s < n; s++) {
    const mine = [...edges.values()]
      .filter((e) => e.a === s || e.b === s)
      .sort((x, y) => y.ly - x.ly || key(x.a, x.b).localeCompare(key(y.a, y.b)));
    for (const e of mine) {
      if (degree(s) <= GALAXY.maxLinks) break;
      const other = e.a === s ? e.b : e.a;
      if (degree(other) <= GALAXY.minLinks) continue;
      edges.delete(key(e.a, e.b));
      if (!isConnected(n, [...edges.values()])) edges.set(key(e.a, e.b), e);
    }
  }
  // Fill up to minLinks with the nearest systems that still have room.
  for (let s = 0; s < n; s++) {
    const candidates = points
      .map((p, i) => ({ i, d: dist(points[s] as Point, p) }))
      .filter((c) => c.i !== s)
      .sort((x, y) => x.d - y.d || x.i - y.i);
    for (const c of candidates) {
      if (degree(s) >= GALAXY.minLinks) break;
      if (edges.has(key(s, c.i)) || degree(c.i) >= GALAXY.maxLinks) continue;
      edges.set(key(s, c.i), { a: Math.min(s, c.i), b: Math.max(s, c.i), ly: c.d });
    }
  }
  return [...edges.values()].sort((x, y) => x.a - y.a || x.b - y.b);
}

/**
 * Start slots: as many systems as possible that are pairwise at least startSpacingLy apart by
 * route (spec 15). A maximum independent set in the "too close" graph, found by the
 * fewest-conflicts-first heuristic with seeded tie-breaks over several tries; among the
 * largest sets the most spread out wins. Returns at most `wanted` slots.
 */
function chooseStarts(all: number[][], wanted: number, rng: Rng): SystemId[] {
  const n = all.length;
  const close = (a: number, b: number) =>
    ((all[a] as number[])[b] as number) < GALAXY.startSpacingLy;
  let best: SystemId[] = [];
  let bestSpread = -1;
  for (let attempt = 0; attempt < GALAXY.startTries; attempt++) {
    const alive = new Set<number>(Array.from({ length: n }, (_, i) => i));
    const chosen: SystemId[] = [];
    while (alive.size > 0 && chosen.length < wanted) {
      let pick = -1;
      let pickConflicts = Infinity;
      let pickTie = 0;
      for (const v of alive) {
        let conflicts = 0;
        for (const u of alive) if (u !== v && close(v, u)) conflicts++;
        const tie = rng.float();
        if (conflicts < pickConflicts || (conflicts === pickConflicts && tie < pickTie)) {
          pick = v;
          pickConflicts = conflicts;
          pickTie = tie;
        }
      }
      chosen.push(pick);
      for (const u of [...alive]) if (u === pick || close(pick, u)) alive.delete(u);
    }
    let spread = Infinity;
    for (const x of chosen)
      for (const y of chosen)
        if (x !== y) spread = Math.min(spread, (all[x] as number[])[y] as number);
    if (chosen.length > best.length || (chosen.length === best.length && spread > bestSpread)) {
      best = chosen;
      bestSpread = spread;
    }
  }
  return best;
}

function weighted<T>(rng: Rng, items: readonly { item: T; weight: number }[]): T {
  const total = items.reduce((s, x) => s + x.weight, 0);
  let roll = rng.float() * total;
  for (const x of items) {
    roll -= x.weight;
    if (roll < 0) return x.item;
  }
  return (items[items.length - 1] as { item: T }).item;
}

const RANDOM_TYPES = (Object.keys(PLANET_TYPES) as PlanetTypeId[]).filter(
  (t) => PLANET_TYPES[t].frequency > 0,
);

function pool(rng: Rng, range: { min: number; max: number }, cls: DepositClass): number {
  const lo = cls === 'rich' ? (range.min + range.max) / 2 : range.min;
  const hi = cls === 'rich' ? range.max : (range.min + range.max) / 2;
  return Math.round(rng.range(lo, hi) / 100) * 100;
}

interface PlanetDraft {
  type: PlanetTypeId;
  /** Rolled speciality deposit (null for fertile worlds and the starter). */
  special: MinedResource | null;
  starter?: boolean;
}

function draftOf(rng: Rng, type: PlanetTypeId, special?: MinedResource): PlanetDraft {
  const spec = PLANET_TYPES[type];
  const rolled =
    special ??
    (spec.specialisations.length > 0
      ? weighted(
          rng,
          spec.specialisations.map((s) => ({ item: s.resource, weight: s.weight })),
        )
      : null);
  return { type, special: rolled };
}

function makePlanet(
  rng: Rng,
  system: SystemId,
  systemName: string,
  index: number,
  orbit: number,
  draft: PlanetDraft,
  rich: boolean,
): Planet {
  const spec = PLANET_TYPES[draft.type];
  const id = `${system}-${index}`;
  const name = `${systemName} ${ROMAN[index] ?? index + 1}`;
  if (draft.starter) {
    return {
      id,
      system,
      name,
      type: STARTER_PLANET.type,
      orbit,
      fields: STARTER_PLANET.fields,
      fertility: STARTER_PLANET.fertility,
      renewable: STARTER_PLANET.renewable,
      speciality: 'biomass',
      deposits: BASIC_MINERALS.map((m) => {
        const cls = STARTER_PLANET.deposits[m];
        const p = pool(rng, cls === 'poor' ? DEPOSITS.basicPool : DEPOSITS.richPool, 'average');
        return { resource: m, class: cls, pool: p, initial: p };
      }),
      starter: true,
    };
  }
  const fertility = weighted(
    rng,
    spec.fertility.map((f) => ({ item: f.value, weight: f.weight })),
  );
  const renewable =
    spec.renewable && rng.chance(spec.renewable.chance) ? spec.renewable.kind : null;
  const special = draft.special;
  const deposits: Deposit[] = BASIC_MINERALS.map((m) => {
    if (m === special) {
      const cls: DepositClass = rich || rng.chance(GALAXY.richDepositChance) ? 'rich' : 'average';
      const p = pool(rng, DEPOSITS.richPool, cls);
      return { resource: m, class: cls, pool: p, initial: p };
    }
    const p = pool(rng, DEPOSITS.basicPool, 'poor');
    return { resource: m, class: DEPOSITS.basicClass, pool: p, initial: p };
  });
  if (special && !(BASIC_MINERALS as readonly string[]).includes(special)) {
    const cls: DepositClass = rich ? 'rich' : 'average';
    const p = pool(rng, DEPOSITS.specialPool, cls);
    deposits.push({ resource: special, class: cls, pool: p, initial: p });
  }
  return {
    id,
    system,
    name,
    type: draft.type,
    orbit,
    fields: rng.int(PLANET_FIELDS.min, PLANET_FIELDS.max),
    fertility,
    renewable,
    speciality: special ?? (fertility >= 1 ? 'biomass' : null),
    deposits,
    starter: false,
  };
}

/** Fertile worlds (no mineral speciality) always roll fertility >= 1, so they count as biomass. */
function distinctSpecialities(drafts: PlanetDraft[]): number {
  return new Set(drafts.map((d) => d.special ?? 'biomass')).size;
}

export function generateGalaxy(seed: string, opts: GalaxyOptions = {}): Galaxy {
  const count = opts.systems ?? GALAXY.systems;
  const rng = rngStream(seed, 'galaxy');
  const points = placeSystems(rng, count, opts.radius ?? radiusFor(count));
  const routes = buildRoutes(points);
  const adj = adjacency(count, routes);
  const all = points.map((_, i) => dijkstra(adj, i).dist);
  const startSlots = chooseStarts(all, opts.startSlots ?? GALAXY.startSlots, rng);
  const isStart = new Set(startSlots);
  const minToStart = points.map((_, i) =>
    Math.min(...startSlots.map((s) => (all[s] as number[])[i] as number)),
  );
  const hopsFromStarts = startSlots.map((s) => hopCounts(adj, s));
  const nearStart = (i: number) =>
    hopsFromStarts.some((h) => (h[i] as number) <= GALAXY.startSpecialHops);

  // Far systems first (for rich systems and anomalies); ties by id.
  const far = points
    .map((_, i) => i)
    .filter((i) => !isStart.has(i))
    .sort((a, b) => (minToStart[b] as number) - (minToStart[a] as number) || a - b);
  const richSet = new Set(far.slice(0, Math.round(count * GALAXY.richShare)));
  const anomalyCount = rng.int(GALAXY.anomalies.min, GALAXY.anomalies.max);
  // Anomalies far from every start: outside the starts' special-deposit range when possible.
  const anomalySet = new Set(
    [...far.filter((i) => !nearStart(i)), ...far.filter((i) => nearStart(i))].slice(
      0,
      anomalyCount,
    ),
  );

  // --- planet types per system ---
  const names = new Set<string>();
  const drafts: PlanetDraft[][] = points.map((_, i) => {
    const rich = richSet.has(i);
    const n = rich
      ? rng.int(GALAXY.richPlanets.min, GALAXY.richPlanets.max)
      : rng.int(GALAXY.planets.min, GALAXY.planets.max);
    const pick = () =>
      Array.from({ length: n }, () =>
        draftOf(
          rng,
          weighted(
            rng,
            RANDOM_TYPES.map((t) => ({ item: t, weight: PLANET_TYPES[t].frequency })),
          ),
        ),
      );
    let list = pick();
    for (
      let tries = 0;
      distinctSpecialities(list) < GALAXY.minSpecialities && tries < 20;
      tries++
    ) {
      list = pick();
    }
    const fallback: PlanetTypeId[] = ['rocky', 'ice', 'desert', 'volcanic'];
    for (let j = 0; distinctSpecialities(list) < GALAXY.minSpecialities; j++) {
      list[list.length - 1 - (j % list.length)] = draftOf(
        rng,
        fallback[j % fallback.length] as PlanetTypeId,
      );
    }
    if (rich && !list.some((d) => (GALAXY.rareTypes as readonly string[]).includes(d.type))) {
      list[list.length - 1] = draftOf(rng, rng.pick(GALAXY.rareTypes));
    }
    if (isStart.has(i)) {
      // Starting planet (spec 7) plus an ice planet or gas giant in the same system.
      list[0] = { type: STARTER_PLANET.type, special: null, starter: true };
      if (!list.slice(1).some((d) => d.special === 'deuterium')) list[1] = draftOf(rng, 'ice');
    }
    if (anomalySet.has(i)) list[list.length - 1] = draftOf(rng, 'anomaly');
    return list;
  });

  // --- special deposits near every start (docs/SUROWCE.md) ---
  const holds = (i: number, res: MinedResource[]) =>
    (drafts[i] as PlanetDraft[]).some((d) => d.special !== null && res.includes(d.special));
  for (const hops of hopsFromStarts) {
    const around = points
      .map((_, i) => i)
      .filter(
        (i) =>
          !isStart.has(i) && !anomalySet.has(i) && (hops[i] as number) <= GALAXY.startSpecialHops,
      )
      .sort((a, b) => (hops[a] as number) - (hops[b] as number) || a - b);
    const needs: [MinedResource[], PlanetTypeId, MinedResource][] = [
      [['fissile'], 'radioactive', 'fissile'],
      [['crystalite', 'helium3'], 'crystalline', 'crystalite'],
    ];
    for (const [res, type, special] of needs) {
      if (around.some((i) => holds(i, res))) continue;
      const target = around[0];
      if (target === undefined) continue;
      const list = drafts[target] as PlanetDraft[];
      // Replace a planet whose speciality is repeated in the system, else the last one.
      const counts = new Map<string, number>();
      for (const d of list)
        counts.set(d.special ?? 'biomass', (counts.get(d.special ?? 'biomass') ?? 0) + 1);
      let j = list.findIndex(
        (d) => (counts.get(d.special ?? 'biomass') ?? 0) > 1 && d.special !== 'fissile',
      );
      if (j < 0) j = list.length - 1;
      list[j] = draftOf(rng, type, special);
    }
  }

  // The changes above can leave a system with too few specialities: swap a repeated one.
  const repairTypes: [PlanetTypeId, MinedResource | 'biomass'][] = [
    ['rocky', 'metal'],
    ['ice', 'deuterium'],
    ['desert', 'silicon'],
    ['volcanic', 'titanium'],
    ['oceanic', 'biomass'],
  ];
  drafts.forEach((list, i) => {
    const isRare = (d: PlanetDraft) => (GALAXY.rareTypes as readonly string[]).includes(d.type);
    if (richSet.has(i) && !list.some(isRare)) {
      const counts = new Map<string, number>();
      for (const d of list)
        counts.set(d.special ?? 'biomass', (counts.get(d.special ?? 'biomass') ?? 0) + 1);
      let j = list.findIndex(
        (d) => !d.starter && d.type !== 'anomaly' && (counts.get(d.special ?? 'biomass') ?? 0) > 1,
      );
      if (j < 0) j = list.findIndex((d) => !d.starter && d.type !== 'anomaly');
      if (j >= 0) list[j] = draftOf(rng, rng.pick(GALAXY.rareTypes));
    }
    while (distinctSpecialities(list) < GALAXY.minSpecialities) {
      const present = new Set(list.map((d) => d.special ?? 'biomass'));
      const counts = new Map<string, number>();
      for (const d of list)
        counts.set(d.special ?? 'biomass', (counts.get(d.special ?? 'biomass') ?? 0) + 1);
      const j = list.findIndex(
        (d) =>
          !d.starter &&
          d.type !== 'anomaly' &&
          (counts.get(d.special ?? 'biomass') ?? 0) > 1 &&
          !(richSet.has(i) && isRare(d) && list.filter(isRare).length === 1),
      );
      const add = repairTypes.find(([, sp]) => !present.has(sp));
      if (j < 0 || !add) break;
      list[j] = draftOf(rng, add[0], add[1] === 'biomass' ? undefined : add[1]);
    }
  });

  // --- systems and planets ---
  const systems: StarSystem[] = [];
  const planets: Record<string, Planet> = {};
  points.forEach((p, i) => {
    const name = starName(rng, names);
    const list = drafts[i] as PlanetDraft[];
    const orbits = list
      .map(() => rng.range(IN_SYSTEM_LY.min, IN_SYSTEM_LY.max))
      .sort((a, b) => a - b)
      .map((o) => Math.round(o * 10) / 10);
    const ids: string[] = [];
    list.forEach((draft, j) => {
      const planet = makePlanet(rng, i, name, j, orbits[j] as number, draft, richSet.has(i));
      planets[planet.id] = planet;
      ids.push(planet.id);
    });
    systems.push({
      id: i,
      name,
      x: Math.round(p.x * 100) / 100,
      y: Math.round(p.y * 100) / 100,
      rich: richSet.has(i),
      planets: ids,
    });
  });

  // Route lengths from the rounded coordinates, so the map and the rules agree.
  const finalRoutes = routes.map((r) => {
    const a = systems[r.a] as StarSystem;
    const b = systems[r.b] as StarSystem;
    return { a: r.a, b: r.b, ly: Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 100) / 100 };
  });
  return { seed, systems, planets, routes: finalRoutes, startSlots };
}
