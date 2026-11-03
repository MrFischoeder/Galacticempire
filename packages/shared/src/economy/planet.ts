import { BUILD, BUILDINGS, CORE, type BuildingId } from '../config/buildings';
import { DEPOSIT_CLASS, DEPOSITS, PLANET_TYPES } from '../config/planets';
import { POPULATION } from '../config/population';
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
 * Economy of one owned planet (spec 4-8, 8.1; balance docs/BALANS.md), steps 1.4a and 1.4b.
 *
 * Lazy: nothing is ticked. settlePlanet() moves a planet from its last update to a given game
 * time in segments: within a segment every rate is constant; a segment ends at the next
 * change point (a store full or empty, the accumulators full or empty, a deposit exhausted,
 * one more or one fewer resident).
 *
 * Population changes in whole people: growth (or starvation) fills `growth`, a share of the
 * next person; at +1 a resident arrives, at -1 one dies. Workers come from the residents.
 */

/** Resources kept in the warehouse. */
export const STORED_RESOURCES: readonly ResourceId[] = [
  ...BASIC_RESOURCES.filter((r) => r !== 'biomass'),
  ...SPECIAL_RESOURCES,
  ...PROCESSED_RESOURCES,
];
/** Everything a planet stocks: the warehouse resources and biomass (silos). */
export const STOCKED: readonly ResourceId[] = [...STORED_RESOURCES, 'biomass'];

export interface BuildingState {
  /** Stable id within the planet (commands refer to buildings by it). */
  readonly uid?: number;
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
  /** Residents (whole people). */
  population: number;
  /** Progress to the next resident (+1) or the next death (-1). */
  growth: number;
  /** The one construction going on (spec 9: one at a time per planet). */
  construction: Construction | null;
  /** Next building uid. */
  nextUid: number;
}

/** A building being built (level 1) or upgraded (spec 9). */
export interface Construction {
  readonly kind: BuildingId;
  readonly deposit?: MinedResource;
  /** The building being upgraded; absent for a new building (it gets `newUid`). */
  readonly uid?: number;
  readonly newUid?: number;
  /** Level it reaches when done. */
  readonly level: number;
  readonly startedAt: number;
  readonly endsAt: number;
  /** What was paid (for refunds). */
  readonly cost: Partial<Record<ResourceId, number>>;
}

export function createPlanetState(
  id: PlanetId,
  owner: PlayerId,
  time: number,
  population: number = CORE.residents,
): PlanetState {
  return {
    id,
    owner,
    updatedAt: time,
    buildings: [],
    stock: {},
    energy: 0,
    population,
    growth: 0,
    construction: null,
    nextUid: 1,
  };
}

const grow = (base: number, growth: number, level: number) => base * growth ** (level - 1);

// --- capacities -------------------------------------------------------------------------

function storage(p: PlanetState, store: 'resources' | 'energy' | 'biomass', core: number): number {
  let cap = core;
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'storage' && e.store === store) cap += grow(e.base, e.growth, b.level);
  }
  return cap;
}

/** Warehouse capacity per resource: the core plus every warehouse (decision 3.11.2026). */
export const resourceCapacity = (p: PlanetState) => storage(p, 'resources', CORE.capacity);
export const energyCapacity = (p: PlanetState) => storage(p, 'energy', CORE.energy);
export const biomassCapacity = (p: PlanetState) => storage(p, 'biomass', CORE.biomass);

export function capacityOf(p: PlanetState, r: ResourceId): number {
  return r === 'biomass' ? biomassCapacity(p) : resourceCapacity(p);
}

/** Room for residents: the core's shelter plus housing (none on gas giants, spec 2.3). */
export function housingCapacity(p: PlanetState, planet: Planet): number {
  let room = CORE.residents;
  if (!PLANET_TYPES[planet.type].housing) return room;
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'housing') room += e.perLevel * b.level;
  }
  return room;
}

// --- workers ----------------------------------------------------------------------------

/** Crew share (0..1) of every building, by the priority list (spec 6). */
export function staffing(p: PlanetState): number[] {
  const shares: number[] = p.buildings.map((b) => (BUILDINGS[b.kind].workers > 0 ? 0 : 1));
  let free = p.population;
  const order = [...POPULATION.workerPriority] as string[];
  const rank = (k: BuildingId) => {
    const i = order.indexOf(k);
    return i < 0 ? order.length : i;
  };
  const idx = p.buildings
    .map((b, i) => ({ i, r: rank(b.kind) }))
    .filter(({ i }) => BUILDINGS[(p.buildings[i] as BuildingState).kind].workers > 0)
    .sort((a, b) => a.r - b.r || a.i - b.i);
  for (const { i } of idx) {
    const need = BUILDINGS[(p.buildings[i] as BuildingState).kind].workers;
    const got = Math.max(0, Math.min(need, free));
    free -= got;
    shares[i] = got / need;
  }
  return shares;
}

export function workersNeeded(p: PlanetState): number {
  return p.buildings.reduce((s, b) => s + BUILDINGS[b.kind].workers, 0);
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
  /** The residents eating (not a building). */
  readonly people?: boolean;
}

function depositOf(planet: Planet, r: MinedResource) {
  return planet.deposits.find((d) => d.resource === r);
}

function scaled(amounts: Partial<Record<ResourceId, number>>, k: number) {
  const out: Partial<Record<ResourceId, number>> = {};
  for (const [r, n] of Object.entries(amounts) as [ResourceId, number][]) out[r] = n * k;
  return out;
}

function processes(
  p: PlanetState,
  planet: Planet,
  ctx: ModifierContext,
  staff: number[],
): Process[] {
  const list: Process[] = [];
  const mining = economyBonus('mining', ctx);
  const mined = new Set<MinedResource>();
  p.buildings.forEach((b, i) => {
    const crew = staff[i] ?? 1;
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'mine' && b.deposit) {
      const dep = depositOf(planet, b.deposit);
      if (!dep) return;
      mined.add(b.deposit);
      const special = (SPECIAL_RESOURCES as readonly string[]).includes(b.deposit);
      const rate =
        grow(e.perHour, e.growth, b.level) *
        DEPOSIT_CLASS[dep.class] *
        (special ? DEPOSITS.specialRate : 1) *
        mining *
        crew;
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
      const k = grow(1, e.growth, b.level) * crew;
      list.push({
        label: b.kind,
        out: { [recipe.output]: recipe.outputPerHour * k },
        inp: scaled(recipe.inputPerHour, k),
        energyOut: 0,
        powered: true,
      });
    } else if (e.kind === 'farm') {
      const rate = grow(e.perHour, e.growth, b.level) * planet.fertility * crew;
      list.push({ label: 'farm', out: { biomass: rate }, inp: {}, energyOut: 0, powered: true });
    } else if (e.kind === 'reactor') {
      list.push({
        label: b.kind,
        out: {},
        inp: { [e.fuel]: e.fuelPerLevel * b.level * crew },
        energyOut: e.energyPerLevel * b.level * crew,
        powered: false,
      });
    }
  });
  // Emergency gathering by the core (spec 8.1): basic minerals without a mine, biomass on a
  // fertile planet. Not powered, no workers.
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
  if (planet.fertility > 0) {
    list.push({
      label: 'core:biomass',
      out: { biomass: CORE.trickleBiomass },
      inp: {},
      energyOut: 0,
      powered: false,
    });
  }
  // The residents eat biomass (spec 6).
  const eat = p.population * POPULATION.biomassPerResident * economyBonus('populationFood', ctx);
  list.push({
    label: 'people',
    out: {},
    inp: { biomass: eat },
    energyOut: 0,
    powered: false,
    people: true,
  });
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

/** Energy drawn per hour: every building, crewed ones in proportion to their crew. */
export function energyUse(p: PlanetState, staff: number[] = staffing(p)): number {
  return p.buildings.reduce(
    (s, b, i) => s + grow(BUILDINGS[b.kind].energy, BUILD.energyGrowth, b.level) * (staff[i] ?? 1),
    0,
  );
}

export interface PlanetRates {
  /** Net change of every stocked resource per hour. */
  readonly net: Partial<Record<ResourceId, number>>;
  /** Gross production and consumption per hour (biomass eaten included in `used`). */
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
  /** Crew share of every building (same order as PlanetState.buildings). */
  readonly staffing: number[];
  /** Residents gained (+) or lost (-) per hour. */
  readonly growth: number;
  /** Biomass ran out and the residents do not get enough (spec 6). */
  readonly starving: boolean;
  readonly housing: number;
}

const EPS = 1e-9;

/** Rates of a planet in its current state (constant until the next change point). */
export function planetRates(
  p: PlanetState,
  planet: Planet,
  ctx: ModifierContext = {},
): PlanetRates {
  const staff = staffing(p);
  const list = processes(p, planet, ctx, staff);
  const f: number[] = list.map((proc) => {
    if (proc.deposit) {
      const dep = depositOf(planet, proc.deposit);
      return dep && dep.pool > EPS ? 1 : 0;
    }
    return 1;
  });
  const use = energyUse(p, staff);
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
    for (const r of STOCKED) {
      const stock = p.stock[r] ?? 0;
      const m = made[r] ?? 0;
      const u = used[r] ?? 0;
      if (stock <= EPS && u > m + EPS) {
        // Empty input: its consumers (and the residents' meals) shrink to what flows in.
        const ratio = m / u;
        list.forEach((proc, i) => {
          if ((proc.inp[r] ?? 0) > 0) f[i] = (f[i] as number) * ratio;
        });
        changed = true;
      } else if (stock >= capacityOf(p, r) - EPS && m > u + EPS) {
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
  for (const r of STOCKED) {
    const n = (made[r] ?? 0) - (used[r] ?? 0);
    if (Math.abs(n) > EPS) net[r] = n;
  }
  const extraction: Partial<Record<MinedResource, number>> = {};
  const speed: Record<string, number> = {};
  let fed = 1;
  list.forEach((proc, i) => {
    speed[proc.label] = Math.max(speed[proc.label] ?? 0, f[i] as number);
    if (proc.people) fed = f[i] as number;
    if (proc.deposit) {
      const k = (f[i] as number) * efficiency;
      extraction[proc.deposit] =
        (extraction[proc.deposit] ?? 0) + (proc.out[proc.deposit] ?? 0) * k;
    }
  });

  // Population (spec 6): grows while biomass production beats what the residents eat and
  // there is room; starves while the stores are empty and the meals fall short.
  const housing = housingCapacity(p, planet);
  const eatPerHead = POPULATION.biomassPerResident * economyBonus('populationFood', ctx);
  const fullMeals = p.population * eatPerHead;
  // What the farms and the core can grow (a full silo throttles the farms, but the food is
  // there for newcomers, so growth looks at the potential).
  const produced = list.reduce(
    (sum, proc) => sum + (proc.out.biomass ?? 0) * (proc.powered ? efficiency : 1),
    0,
  );
  const starving = fed < 1 - 1e-6;
  let growth = 0;
  if (starving) {
    if (p.population > POPULATION.minPopulation)
      growth = -p.population * POPULATION.starvationPerHour;
  } else if (produced > fullMeals + EPS && p.population < housing) {
    const feedable = (produced - fullMeals) / eatPerHead;
    growth = Math.min(Math.max(1, p.population * POPULATION.growthPerHour), feedable);
  } else if (p.population > housing) {
    growth = -Math.max(1, (p.population - housing) * POPULATION.growthPerHour);
  }
  const energyNet = efficiency < 1 ? 0 : energyMade - use;
  return {
    net,
    made,
    used,
    energyMade,
    energyUsed: use,
    energyNet,
    efficiency,
    extraction,
    speed,
    staffing: staff,
    growth,
    starving,
    housing,
  };
}

// --- settling ---------------------------------------------------------------------------

/** Hours until the next change point under the given rates (Infinity = none). */
export function nextChangePoint(p: PlanetState, planet: Planet, rates: PlanetRates): number {
  let t = Infinity;
  for (const r of STOCKED) {
    const cap = capacityOf(p, r);
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
  const g = progressStart(p.growth, rates.growth);
  if (rates.growth > EPS) t = Math.min(t, (1 - g) / rates.growth);
  if (rates.growth < -EPS) t = Math.min(t, (1 + g) / -rates.growth);
  return Math.max(0, t);
}

/** Progress kept only while the direction of change stays the same. */
function progressStart(progress: number, rate: number): number {
  if (rate > 0) return Math.max(0, progress);
  if (rate < 0) return Math.min(0, progress);
  return 0;
}

const SNAP = 1e-6;
const MAX_SEGMENTS = 200_000;

/**
 * Moves the planet's stores, residents and deposits forward to game time `time` (ms).
 * Mutates `p` and `planet` (the engine clones the whole state first). Returns the number of
 * segments used.
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
  // Stores never hold more than the capacity (e.g. after a warehouse was lost).
  for (const r of STOCKED) {
    const cap = capacityOf(p, r);
    if ((p.stock[r] ?? 0) > cap) p.stock[r] = cap;
  }
  const ecap = energyCapacity(p);
  if (p.energy > ecap) p.energy = ecap;
  while (left > 0 && segments < MAX_SEGMENTS) {
    segments++;
    const rates = planetRates(p, planet, ctx);
    const dt = Math.min(left, nextChangePoint(p, planet, rates));
    for (const r of STOCKED) {
      const v = rates.net[r] ?? 0;
      if (v === 0) continue;
      const cap = capacityOf(p, r);
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
    let g = progressStart(p.growth, rates.growth) + rates.growth * dt;
    if (g >= 1 - SNAP) {
      p.population += 1;
      g = 0;
    } else if (g <= -1 + SNAP) {
      p.population = Math.max(POPULATION.minPopulation, p.population - 1);
      g = 0;
    }
    p.growth = g;
    left -= dt;
  }
  p.updatedAt = time;
  return segments;
}
