import { BUILD, BUILDINGS, CORE, type BuildingId } from '../config/buildings';
import { DEPOSIT_CLASS, DEPOSITS } from '../config/planets';
import { RECIPES } from '../config/recipes';
import {
  BASIC_RESOURCES,
  PROCESSED_RESOURCES,
  SPECIAL_RESOURCES,
  type MinedResource,
  type ResourceId,
} from '../config/resources';
import { MS_PER_HOUR } from '../config/time';
import type { PlayerId } from '../core/state';
import { economyBonus, type ModifierContext } from '../rules/modifiers';
import type { Planet, PlanetId } from '../galaxy/types';

/**
 * Production of one owned planet (spec 4, 5, 8, 8.1; balance docs/BALANS.md), step 1.4a.
 *
 * Lazy: nothing is ticked. settlePlanet() moves a planet from its last update to a given game
 * time in segments: within a segment every rate is constant; a segment ends at the next
 * change point (a store full or empty, the accumulators full or empty, a deposit exhausted).
 *
 * Not yet (step 1.4b): population, workers, farms and biomass. Until then every building
 * counts as fully staffed.
 */

/** Resources kept in the warehouse (biomass lives in silos, step 1.4b). */
export const STORED_RESOURCES: readonly ResourceId[] = [
  ...BASIC_RESOURCES.filter((r) => r !== 'biomass'),
  ...SPECIAL_RESOURCES,
  ...PROCESSED_RESOURCES,
];

export interface BuildingState {
  readonly kind: BuildingId;
  level: number;
  /** For a mine: the deposit it works. */
  readonly deposit?: MinedResource;
}

export interface PlanetState {
  readonly id: PlanetId;
  owner: PlayerId;
  /** Game time (ms) the stores were last settled at. */
  updatedAt: number;
  buildings: BuildingState[];
  stock: Partial<Record<ResourceId, number>>;
  /** Energy held in the core and the accumulators. */
  energy: number;
}

export function createPlanetState(id: PlanetId, owner: PlayerId, time: number): PlanetState {
  return { id, owner, updatedAt: time, buildings: [], stock: {}, energy: 0 };
}

const grow = (base: number, growth: number, level: number) => base * growth ** (level - 1);

// --- capacities -------------------------------------------------------------------------

/** Warehouse capacity per resource: the core plus every warehouse (decision 3.11.2026). */
export function resourceCapacity(p: PlanetState): number {
  let cap = CORE.capacity;
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'storage' && e.store === 'resources') cap += grow(e.base, e.growth, b.level);
  }
  return cap;
}

export function energyCapacity(p: PlanetState): number {
  let cap = CORE.energy;
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'storage' && e.store === 'energy') cap += grow(e.base, e.growth, b.level);
  }
  return cap;
}

// --- rates ------------------------------------------------------------------------------

/** One producing or consuming activity with constant rates per hour at full speed. */
interface Process {
  readonly label: string;
  readonly out: Partial<Record<ResourceId, number>>;
  readonly inp: Partial<Record<ResourceId, number>>;
  /** Energy produced (reactors) per hour at full speed. */
  readonly energyOut: number;
  /** Scaled by the energy efficiency (buildings that need power to work). */
  readonly powered: boolean;
  /** Deposit it draws from (mines). */
  readonly deposit?: MinedResource;
}

function depositOf(planet: Planet, r: MinedResource) {
  return planet.deposits.find((d) => d.resource === r);
}

function processes(p: PlanetState, planet: Planet, ctx: ModifierContext): Process[] {
  const list: Process[] = [];
  const mining = economyBonus('mining', ctx);
  const mined = new Set<MinedResource>();
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'mine' && b.deposit) {
      const dep = depositOf(planet, b.deposit);
      if (!dep) continue;
      mined.add(b.deposit);
      const special = (SPECIAL_RESOURCES as readonly string[]).includes(b.deposit);
      const rate =
        grow(e.perHour, e.growth, b.level) *
        DEPOSIT_CLASS[dep.class] *
        (special ? DEPOSITS.specialRate : 1) *
        mining;
      list.push({
        label: `mine:${b.deposit}`,
        out: { [b.deposit]: rate },
        inp: {},
        energyOut: 0,
        powered: true,
        deposit: b.deposit,
      });
    } else if (e.kind === 'recipe') {
      const recipe = RECIPES[e.recipe];
      const k = grow(1, e.growth, b.level);
      const inp: Partial<Record<ResourceId, number>> = {};
      for (const [r, n] of Object.entries(recipe.inputPerHour) as [ResourceId, number][])
        inp[r] = n * k;
      list.push({
        label: b.kind,
        out: { [recipe.output]: recipe.outputPerHour * k },
        inp,
        energyOut: 0,
        powered: true,
      });
    } else if (e.kind === 'reactor') {
      list.push({
        label: b.kind,
        out: {},
        inp: { [e.fuel]: e.fuelPerLevel * b.level },
        energyOut: e.energyPerLevel * b.level,
        powered: false,
      });
    }
  }
  // Emergency gathering by the core: basic minerals without a mine, not powered (spec 8.1).
  for (const d of planet.deposits) {
    if ((BASIC_RESOURCES as readonly string[]).includes(d.resource) && !mined.has(d.resource)) {
      list.push({
        label: `core:${d.resource}`,
        out: { [d.resource]: CORE.tricklePerHour },
        inp: {},
        energyOut: 0,
        powered: false,
      });
    }
  }
  return list;
}

/** Energy that does not depend on fuel: renewables and the core's trickle. */
function steadyEnergy(p: PlanetState, planet: Planet): number {
  if (!planet.renewable) return 0;
  let made = CORE.trickleEnergy;
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'renewable') made += grow(e.perHour, e.growth, b.level);
  }
  return made;
}

export function energyUse(p: PlanetState): number {
  return p.buildings.reduce(
    (s, b) => s + grow(BUILDINGS[b.kind].energy, BUILD.energyGrowth, b.level),
    0,
  );
}

export interface PlanetRates {
  /** Net change per hour of every stored resource. */
  readonly net: Partial<Record<ResourceId, number>>;
  /** Gross production and consumption per hour. */
  readonly made: Partial<Record<ResourceId, number>>;
  readonly used: Partial<Record<ResourceId, number>>;
  readonly energyMade: number;
  readonly energyUsed: number;
  /** Net change of the stored energy per hour (0 while empty and short). */
  readonly energyNet: number;
  /** Share of full output the powered buildings reach (1 = no shortage, spec 5). */
  readonly efficiency: number;
  /** Extraction per hour from each deposit. */
  readonly extraction: Partial<Record<MinedResource, number>>;
  /** Speed of every process (0..1) after full stores and empty inputs are taken into account. */
  readonly speed: Record<string, number>;
}

const EPS = 1e-9;

/** Rates of a planet in its current state (constant until the next change point). */
export function planetRates(
  p: PlanetState,
  planet: Planet,
  ctx: ModifierContext = {},
): PlanetRates {
  const list = processes(p, planet, ctx);
  const cap = resourceCapacity(p);
  const f: number[] = list.map((proc) => {
    if (proc.deposit) {
      const dep = depositOf(planet, proc.deposit);
      return dep && dep.pool > EPS ? 1 : 0;
    }
    return 1;
  });
  const use = energyUse(p);
  const steady = steadyEnergy(p, planet);
  let efficiency = 1;
  let made: Partial<Record<ResourceId, number>> = {};
  let used: Partial<Record<ResourceId, number>> = {};
  let energyMade = steady;

  for (let iter = 0; iter < 100; iter++) {
    energyMade = steady + list.reduce((s, proc, i) => s + proc.energyOut * (f[i] as number), 0);
    efficiency = p.energy > EPS || energyMade >= use || use === 0 ? 1 : energyMade / use;
    made = {};
    used = {};
    list.forEach((proc, i) => {
      const k = (f[i] as number) * (proc.powered ? efficiency : 1);
      for (const [r, n] of Object.entries(proc.out) as [ResourceId, number][])
        made[r] = (made[r] ?? 0) + n * k;
      for (const [r, n] of Object.entries(proc.inp) as [ResourceId, number][])
        used[r] = (used[r] ?? 0) + n * k;
    });
    let changed = false;
    for (const r of STORED_RESOURCES) {
      const stock = p.stock[r] ?? 0;
      const m = made[r] ?? 0;
      const u = used[r] ?? 0;
      if (stock <= EPS && u > m + EPS) {
        // Empty input: its consumers slow down to what flows in.
        const ratio = m / u;
        list.forEach((proc, i) => {
          if ((proc.inp[r] ?? 0) > 0) f[i] = (f[i] as number) * ratio;
        });
        changed = true;
      } else if (stock >= cap - EPS && m > u + EPS) {
        // Full store: production stops at what is used up (spec 8).
        const ratio = u / m;
        list.forEach((proc, i) => {
          if ((proc.out[r] ?? 0) > 0) f[i] = (f[i] as number) * ratio;
        });
        changed = true;
      }
    }
    if (!changed) break;
  }

  const net: Partial<Record<ResourceId, number>> = {};
  for (const r of STORED_RESOURCES) {
    const n = (made[r] ?? 0) - (used[r] ?? 0);
    if (Math.abs(n) > EPS) net[r] = n;
  }
  const extraction: Partial<Record<MinedResource, number>> = {};
  const speed: Record<string, number> = {};
  list.forEach((proc, i) => {
    speed[proc.label] = Math.max(speed[proc.label] ?? 0, f[i] as number);
    if (proc.deposit) {
      const k = (f[i] as number) * efficiency;
      extraction[proc.deposit] =
        (extraction[proc.deposit] ?? 0) + (proc.out[proc.deposit] ?? 0) * k;
    }
  });
  const energyNet = efficiency < 1 ? 0 : energyMade - use;
  return { net, made, used, energyMade, energyUsed: use, energyNet, efficiency, extraction, speed };
}

// --- settling ---------------------------------------------------------------------------

/** Hours until the next change point under the given rates (Infinity = none). */
export function nextChangePoint(p: PlanetState, planet: Planet, rates: PlanetRates): number {
  const cap = resourceCapacity(p);
  let t = Infinity;
  for (const r of STORED_RESOURCES) {
    const v = rates.net[r] ?? 0;
    const s = p.stock[r] ?? 0;
    if (v > EPS && s < cap - EPS) t = Math.min(t, (cap - s) / v);
    if (v < -EPS && s > EPS) t = Math.min(t, s / -v);
  }
  const ecap = energyCapacity(p);
  if (rates.energyNet > EPS && p.energy < ecap - EPS)
    t = Math.min(t, (ecap - p.energy) / rates.energyNet);
  if (rates.energyNet < -EPS && p.energy > EPS) t = Math.min(t, p.energy / -rates.energyNet);
  for (const [r, v] of Object.entries(rates.extraction) as [MinedResource, number][]) {
    const dep = depositOf(planet, r);
    if (dep && v > EPS && dep.pool > EPS) t = Math.min(t, dep.pool / v);
  }
  return t;
}

const SNAP = 1e-6;
const MAX_SEGMENTS = 100_000;

/**
 * Moves the planet's stores and its deposits forward to game time `time` (ms). Mutates `p`
 * and `planet` (callers pass clones; the engine clones the whole state). Returns the number
 * of segments used.
 */
export function settlePlanet(
  p: PlanetState,
  planet: Planet,
  time: number,
  ctx: ModifierContext = {},
): number {
  if (time < p.updatedAt)
    throw new RangeError(`Cannot settle backwards (${time} < ${p.updatedAt})`);
  let left = (time - p.updatedAt) / MS_PER_HOUR;
  let segments = 0;
  const cap = resourceCapacity(p);
  const ecap = energyCapacity(p);
  // Stores never hold more than the capacity (e.g. after a warehouse was lost).
  for (const r of STORED_RESOURCES) if ((p.stock[r] ?? 0) > cap) p.stock[r] = cap;
  if (p.energy > ecap) p.energy = ecap;
  while (left > 0 && segments < MAX_SEGMENTS) {
    segments++;
    const rates = planetRates(p, planet, ctx);
    const dt = Math.min(left, nextChangePoint(p, planet, rates));
    for (const r of STORED_RESOURCES) {
      const v = rates.net[r] ?? 0;
      if (v === 0) continue;
      let s = (p.stock[r] ?? 0) + v * dt;
      if (s < SNAP) s = 0;
      if (s > cap - SNAP) s = cap;
      p.stock[r] = s;
    }
    let e = p.energy + rates.energyNet * dt;
    if (e < SNAP) e = 0;
    if (e > ecap - SNAP) e = ecap;
    p.energy = e;
    for (const [r, v] of Object.entries(rates.extraction) as [MinedResource, number][]) {
      const dep = depositOf(planet, r);
      if (!dep) continue;
      dep.pool = Math.max(0, dep.pool - v * dt);
      if (dep.pool < SNAP) dep.pool = 0;
    }
    left -= dt;
  }
  p.updatedAt = time;
  return segments;
}
