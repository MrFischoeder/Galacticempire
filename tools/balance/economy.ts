/**
 * Economy balance model (step 1.2b). A simple minute-by-minute model of one planet played by
 * a sensible bot, used only to tune the numbers in packages/shared/src/config. The real game
 * engine (lazy production between change points) comes in step 1.4 and must agree with it.
 */
import {
  BUILD,
  BUILDINGS,
  CORE,
  DEPOSIT_CLASS,
  POPULATION,
  RECIPES,
  STARTER_PLANET,
  type BuildingId,
  type ResourceAmounts,
  type ResourceId,
} from '../../packages/shared/src/index';

export type Mineral = 'metal' | 'deuterium' | 'titanium' | 'silicon';
export const MINERALS: Mineral[] = ['metal', 'deuterium', 'titanium', 'silicon'];
const STORED: ResourceId[] = [
  'metal',
  'deuterium',
  'titanium',
  'silicon',
  'fuel',
  'alloy',
  'components',
];

export interface Building {
  id: BuildingId;
  level: number;
  mineral?: Mineral;
}

export interface PlanItem {
  id: BuildingId;
  mineral?: Mineral;
  /** Target level; a new building is built when fewer than `nth` matching ones exist. */
  level: number;
  /** Which instance (1-based) of a building that can stand several times. */
  nth?: number;
}

const growth = (g: number, level: number) => g ** (level - 1);

function effectOf<K extends string>(id: BuildingId, kind: K) {
  const e = BUILDINGS[id].effect;
  if (e.kind !== kind) throw new Error(`${id} is not ${kind}`);
  return e as Extract<typeof e, { kind: K }>;
}
export const renewableOut = (level: number) => {
  const e = effectOf('renewable', 'renewable');
  return e.perHour * growth(e.growth, level);
};
export const mineOut = (level: number) => {
  const e = effectOf('mine', 'mine');
  return e.perHour * growth(e.growth, level);
};

/** Cost of reaching `level` (level 1 = building it). */
export function levelCost(id: BuildingId, level: number): ResourceAmounts {
  const out: ResourceAmounts = {};
  for (const [r, n] of Object.entries(BUILDINGS[id].cost) as [ResourceId, number][]) {
    out[r] = Math.round(n * growth(BUILD.costGrowth, level));
  }
  return out;
}

export const levelMinutes = (id: BuildingId, level: number) =>
  BUILDINGS[id].buildMinutes * growth(BUILD.timeGrowth, level);

export const energyUse = (id: BuildingId, level: number) =>
  BUILDINGS[id].energy * growth(BUILD.energyGrowth, level);

/** Highest level reachable with basic resources only (before a special-resource gate). */
export function basicCap(id: BuildingId): number {
  const b = BUILDINGS[id];
  const gate = Math.min(...b.special.map((g) => g.fromLevel), b.maxLevel + 1);
  return Math.min(b.maxLevel, gate - 1);
}

export interface Report {
  log: { t: number; text: string }[];
  milestones: Record<string, number | null>;
  /** Hours in each limiting state. */
  hours: {
    energyShort: number;
    workersShort: number;
    storageFull: number;
    waiting: number;
    idle: number;
  };
  snapshots: { day: number; perHour: Record<string, number>; levels: string; pop: number }[];
  buildings: Building[];
  /** Hours each mineral sat at full storage. */
  fullBy: Record<string, number>;
}

export function simulate(plan: PlanItem[], days: number): Report {
  const res: Record<string, number> = Object.fromEntries(STORED.map((r) => [r, 0]));
  res.biomass = 0;
  let energy = 0;
  let pop: number = CORE.residents;
  const buildings: Building[] = [];
  let construction: { item: PlanItem; target?: Building; end: number } | null = null;
  const log: Report['log'] = [];
  const milestones: Report['milestones'] = {};
  const hours = { energyShort: 0, workersShort: 0, storageFull: 0, waiting: 0, idle: 0 };
  const fullBy: Record<string, number> = {};
  const snapshots: Report['snapshots'] = [];
  const dt = 1 / 60;
  let planIndex = 0;
  const say = (t: number, text: string) => log.push({ t, text });
  const mark = (key: string, t: number) => {
    if (milestones[key] === undefined) milestones[key] = t;
  };

  let lastNet = 0;
  let lastFood = 0;
  const staffedNeed = () => buildings.reduce((n, b) => n + BUILDINGS[b.id].workers, 0);
  const sumLevels = (id: BuildingId) =>
    buildings.filter((b) => b.id === id).reduce((s, b) => s + growth(1.3, b.level), 0);
  const cap = () => CORE.capacity + 400 * sumLevels('warehouse');
  const bioCap = () => CORE.biomass + 300 * sumLevels('silo');
  const energyCap = () => CORE.energy + 200 * sumLevels('accumulator');
  const housing = () =>
    CORE.residents +
    buildings.filter((b) => b.id === 'housing').reduce((s, b) => s + 20 * b.level, 0);

  const same = (item: PlanItem) =>
    buildings.filter((b) => b.id === item.id && b.mineral === item.mineral);
  const nthOf = (item: PlanItem) => same(item)[(item.nth ?? 1) - 1];
  const find = (item: PlanItem) => {
    const b = nthOf(item);
    return b && b.level < item.level ? b : undefined;
  };
  const exists = (item: PlanItem) => {
    const b = nthOf(item);
    return b !== undefined && b.level >= item.level;
  };

  for (let step = 0; step <= days * 24 * 60; step++) {
    const t = step * dt;

    // --- finish construction ---
    if (construction && t >= construction.end) {
      const { item, target } = construction;
      if (target) target.level += 1;
      else
        buildings.push({
          id: item.id,
          level: 1,
          ...(item.mineral ? { mineral: item.mineral } : {}),
        });
      const name = `${item.id}${item.mineral ? `(${item.mineral})` : ''}`;
      say(t, `done ${name} -> ${target ? target.level : 1}`);
      mark(`built:${item.id}`, t);
      if (buildings.length === 1) mark('first building done', t);
      if (buildings.length === 5) mark('5 buildings', t);
      if (buildings.length === 10) mark('10 buildings', t);
      if (buildings.length === STARTER_PLANET.fields) mark('all fields used', t);
      construction = null;
    }

    // --- start the next plan item when affordable ---
    if (!construction) {
      while (planIndex < plan.length && exists(plan[planIndex] as PlanItem)) planIndex++;
      let item = plan[planIndex];
      // A careful player: fix energy, hands and food before the next plan item.
      if (item) {
        const extraEnergy =
          item.id === 'renewable' ? 0 : energyUse(item.id, (find(item)?.level ?? 0) + 1);
        const renewables = buildings.filter((b) => b.id === 'renewable');
        const weakest = [...renewables].sort((a, b) => a.level - b.level)[0];
        const workersNeeded =
          BUILDINGS[item.id].workers > 0 && !find(item) ? BUILDINGS[item.id].workers : 0;
        const freeHands = pop - staffedNeed();
        const houses = buildings.filter((b) => b.id === 'housing');
        if (renewables.length > 0 && lastNet - extraEnergy < 0 && energy < energyCap() * 0.5) {
          if (renewables.length < 3 && buildings.length < STARTER_PLANET.fields) {
            item = { id: 'renewable', level: 1, nth: renewables.length + 1 };
          } else if (weakest && weakest.level < basicCap('renewable')) {
            item = {
              id: 'renewable',
              level: weakest.level + 1,
              nth: renewables.indexOf(weakest) + 1,
            };
          }
        } else if (workersNeeded > freeHands && pop >= housing() - 1 && houses.length > 0) {
          const h = houses[0] as Building;
          if (h.level < basicCap('housing')) item = { id: 'housing', level: h.level + 1 };
        } else if (lastFood < 0) {
          const farm = buildings.find((b) => b.id === 'farm');
          if (farm && farm.level < basicCap('farm')) item = { id: 'farm', level: farm.level + 1 };
        }
      }
      if (item) {
        const target = find(item);
        const level = target ? target.level + 1 : 1;
        if (!target && buildings.length >= STARTER_PLANET.fields) {
          planIndex++; // no field left
        } else {
          const cost = levelCost(item.id, level);
          const fits = Object.values(cost).every((n) => n <= cap());
          const ok = Object.entries(cost).every(([r, n]) => (res[r] ?? 0) >= n);
          if (!fits) {
            // Cost exceeds storage: the bot builds/raises a warehouse first.
            const wh = buildings.find((b) => b.id === 'warehouse');
            plan.splice(planIndex, 0, { id: 'warehouse', level: wh ? wh.level + 1 : 1 });
          } else if (ok) {
            for (const [r, n] of Object.entries(cost)) res[r] = (res[r] ?? 0) - n;
            construction = {
              item,
              ...(target ? { target } : {}),
              end: t + levelMinutes(item.id, level) / 60,
            };
            if (buildings.length === 0) mark('first building started', t);
          } else if (milestones['every building at its basic cap'] === undefined) {
            hours.waiting += dt;
          }
        }
      }
    }

    // --- workers: farm first, then mines, processing, the rest ---
    const order: BuildingId[] = [
      'farm',
      'mine',
      'smelter',
      'refinery',
      'workshop',
      'spaceport',
      'shipyard',
      'scanner',
      'laboratory',
    ];
    let free = pop;
    const staff = new Map<Building, number>();
    for (const id of order) {
      for (const b of buildings.filter((x) => x.id === id)) {
        const need = BUILDINGS[id].workers;
        const got = Math.min(need, Math.max(0, free));
        free -= got;
        staff.set(b, need > 0 ? got / need : 1);
      }
    }
    for (const b of buildings) if (!staff.has(b)) staff.set(b, 1);
    if (buildings.some((b) => (staff.get(b) ?? 1) < 1)) hours.workersShort += dt;

    // --- energy ---
    let made: number = CORE.trickleEnergy;
    let used = 0;
    for (const b of buildings) {
      if (b.id === 'renewable') made += renewableOut(b.level);
      used += energyUse(b.id, b.level) * (staff.get(b) ?? 1);
    }
    let eff = 1;
    lastNet = made - used;
    const net = (made - used) * dt;
    if (energy + net >= 0) energy = Math.min(energyCap(), energy + net);
    else {
      eff = used > 0 ? Math.min(1, (made + energy / dt) / used) : 1;
      energy = 0;
      hours.energyShort += dt;
    }

    // --- production ---
    let full = false;
    const add = (r: string, n: number, limit = cap()) => {
      const before = res[r] ?? 0;
      res[r] = Math.min(limit, before + n);
      // Only the mined minerals count: unused products piling up is the bot's choice.
      if (
        res[r] >= limit &&
        n > 0 &&
        (MINERALS as string[]).includes(r) &&
        milestones['every building at its basic cap'] === undefined
      ) {
        full = true;
        fullBy[r] = (fullBy[r] ?? 0) + dt;
      }
    };
    for (const m of MINERALS) {
      const mines = buildings.filter((b) => b.id === 'mine' && b.mineral === m);
      const cls = DEPOSIT_CLASS[STARTER_PLANET.deposits[m]];
      if (mines.length === 0) add(m, CORE.tricklePerHour * dt);
      for (const b of mines) add(m, mineOut(b.level) * cls * eff * (staff.get(b) ?? 1) * dt);
    }
    // processing
    for (const id of ['smelter', 'refinery', 'workshop'] as const) {
      for (const b of buildings.filter((x) => x.id === id)) {
        const k = growth(1.25, b.level) * eff * (staff.get(b) ?? 1) * dt;
        const recipe = RECIPES[id];
        const inputs = recipe.inputPerHour as Record<string, number>;
        let share = 1;
        for (const [r, n] of Object.entries(inputs))
          share = Math.min(share, (res[r] ?? 0) / (n * k || 1));
        share = Math.max(0, Math.min(1, share));
        const room = (cap() - (res[recipe.output] ?? 0)) / (recipe.outputPerHour * k || 1);
        share = Math.min(share, Math.max(0, room));
        for (const [r, n] of Object.entries(inputs)) res[r] = (res[r] ?? 0) - n * k * share;
        add(recipe.output, recipe.outputPerHour * k * share);
      }
    }
    // biomass and population
    let food: number = CORE.trickleBiomass;
    for (const b of buildings.filter((x) => x.id === 'farm')) {
      food += 30 * growth(1.25, b.level) * STARTER_PLANET.fertility * eff * (staff.get(b) ?? 1);
    }
    const eat = pop * POPULATION.biomassPerResident;
    lastFood = food - eat;
    res.biomass = Math.min(bioCap(), (res.biomass ?? 0) + (food - eat) * dt);
    if ((res.biomass ?? 0) < 0) {
      res.biomass = 0;
      pop = Math.max(1, pop * (1 - POPULATION.starvationPerHour * dt));
    } else if (food > eat && pop < housing()) {
      // Grow while the surplus feeds the newcomers.
      const room = (food - eat) / POPULATION.biomassPerResident;
      pop = Math.min(
        housing(),
        pop + Math.min(Math.max(1, pop * POPULATION.growthPerHour), room) * dt,
      );
    }
    if (full) hours.storageFull += dt;
    if (milestones['every building at its basic cap'] === undefined && !construction)
      hours.idle += dt;

    // --- milestones about the fleet ---
    if (
      buildings.some((b) => b.id === 'shipyard') &&
      (res.alloy ?? 0) >= 55 &&
      (res.components ?? 0) >= 6
    ) {
      mark('first fighter affordable', t);
    }
    const capped =
      buildings.length >= STARTER_PLANET.fields &&
      buildings.every((b) => b.level >= basicCap(b.id));
    if (capped) mark('every building at its basic cap', t);

    // --- snapshots ---
    for (const day of [0.5, 1, 2, 3, 7, 14, 21, 30]) {
      if (Math.abs(t - day * 24) < dt / 2) {
        const perHour: Record<string, number> = {};
        for (const m of MINERALS) {
          const cls = DEPOSIT_CLASS[STARTER_PLANET.deposits[m]];
          perHour[m] = buildings
            .filter((b) => b.id === 'mine' && b.mineral === m)
            .reduce((s, b) => s + mineOut(b.level) * cls, 0);
        }
        perHour.energyNet = made - used;
        perHour.food = food - eat;
        snapshots.push({
          day,
          perHour,
          levels: buildings
            .map((b) => `${b.id}${b.mineral ? `:${b.mineral[0]}` : ''} ${b.level}`)
            .join(', '),
          pop: Math.round(pop),
        });
      }
    }
  }
  return { log, milestones, hours, snapshots, buildings, fullBy };
}
