import type { EconomyStat, UnitFilter, UnitModifier, UnitStat } from '../config/modifiers';
import { RACES, STARVING_ATTACK_PENALTY, type RaceId } from '../config/races';
import { RESOURCES, type ResourceAmounts, type ResourceId } from '../config/resources';
import { RESEARCH, TECHS, type TechId } from '../config/techs';
import {
  BUILD_MINUTES_PER_VALUE,
  UNITS,
  type TargetClass,
  type UnitId,
  type UnitSpec,
} from '../config/units';

/**
 * The ONE place that turns base data into effective numbers (CLAUDE.md). Within one source
 * (all levels of a technology, or a race) bonuses add up; different sources multiply:
 * effective = base × (1 + race) × (1 + tech A) × (1 + tech B) × ...
 */
export interface ModifierContext {
  readonly race?: RaceId;
  readonly techs?: Partial<Record<TechId, number>>;
  /** Home planet out of biomass (spec 10.4). */
  readonly starving?: boolean;
}

export interface EffectiveUnit {
  readonly id: UnitId;
  readonly attack: number;
  readonly armor: number;
  readonly structure: number;
  readonly targets: number;
  readonly multipliers: Partial<Record<TargetClass, number>>;
  readonly speed: number;
  readonly fuelStart: number;
  readonly fuelPerLy: number;
  readonly cargo: number;
  /** Full cost including the special resources. */
  readonly cost: ResourceAmounts;
  readonly buildMinutes: number;
  /** Biomass per hour. */
  readonly upkeep: number;
}

export function matches(unit: UnitSpec, id: UnitId, filter: UnitFilter): boolean {
  if (filter.units?.includes(id)) return true;
  if (filter.categories?.includes(unit.category)) return true;
  return filter.tags?.some((t) => unit.tags.includes(t)) ?? false;
}

function levelOf(ctx: ModifierContext, tech: TechId): number {
  const level = ctx.techs?.[tech] ?? 0;
  return Math.max(0, Math.min(RESEARCH.maxLevel, Math.floor(level)));
}

/** Product of (1 + sum per source) for one unit stat. */
export function unitMultiplier(id: UnitId, stat: UnitStat, ctx: ModifierContext): number {
  const unit = UNITS[id];
  const sum = (mods: readonly UnitModifier[], times: number) =>
    mods.reduce((s, m) => (m.stat === stat && matches(unit, id, m.to) ? s + m.add * times : s), 0);
  let mult = 1;
  if (ctx.race) mult *= 1 + sum(RACES[ctx.race].units, 1);
  for (const tech of Object.keys(ctx.techs ?? {}) as TechId[]) {
    const level = levelOf(ctx, tech);
    if (level > 0) mult *= 1 + sum(TECHS[tech].units, level);
  }
  if (stat === 'attack' && ctx.starving) mult *= 1 - STARVING_ATTACK_PENALTY;
  return Math.max(0, mult);
}

function extraTargets(id: UnitId, ctx: ModifierContext): number {
  let extra = 0;
  for (const tech of Object.keys(ctx.techs ?? {}) as TechId[]) {
    const spec = TECHS[tech];
    if (!spec.extraTargetsAt || !spec.extraTargetsUnits?.includes(id as 'fieldArtillery')) continue;
    const level = levelOf(ctx, tech);
    extra += spec.extraTargetsAt.filter((l) => level >= l).length;
  }
  return extra;
}

function scaleAmounts(amounts: ResourceAmounts, mult: number): ResourceAmounts {
  const out: ResourceAmounts = {};
  for (const [r, n] of Object.entries(amounts) as [ResourceId, number][]) out[r] = n * mult;
  return out;
}

function addAmounts(a: ResourceAmounts, b: ResourceAmounts): ResourceAmounts {
  const out: ResourceAmounts = { ...a };
  for (const [r, n] of Object.entries(b) as [ResourceId, number][]) out[r] = (out[r] ?? 0) + n;
  return out;
}

export function effectiveUnit(id: UnitId, ctx: ModifierContext = {}): EffectiveUnit {
  const u = UNITS[id];
  const m = (stat: UnitStat) => unitMultiplier(id, stat, ctx);
  const fuel = m('fuelUse');
  return {
    id,
    attack: u.attack * m('attack'),
    armor: u.armor * m('armor'),
    structure: u.structure * m('structure'),
    targets: u.targets > 0 ? u.targets + extraTargets(id, ctx) : 0,
    multipliers: u.multipliers,
    speed: u.speed * m('speed'),
    fuelStart: u.fuel.start * fuel,
    fuelPerLy: u.fuel.perLy * fuel,
    cargo: u.cargo * m('cargo'),
    cost: scaleAmounts(addAmounts(u.cost, u.special), m('cost')),
    buildMinutes: u.value * BUILD_MINUTES_PER_VALUE * m('buildTime'),
    upkeep: u.upkeep * m('upkeep'),
  };
}

/** Multiplier for an economy stat; for scanFreshMinutes it returns extra minutes instead. */
export function economyBonus(stat: EconomyStat, ctx: ModifierContext = {}): number {
  const sum = (mods: readonly { stat: EconomyStat; add: number }[], times: number) =>
    mods.reduce((s, m) => (m.stat === stat ? s + m.add * times : s), 0);
  if (stat === 'scanFreshMinutes') {
    let minutes = ctx.race ? sum(RACES[ctx.race].economy, 1) : 0;
    for (const tech of Object.keys(ctx.techs ?? {}) as TechId[]) {
      minutes += sum(TECHS[tech].economy, levelOf(ctx, tech));
    }
    return minutes;
  }
  let mult = ctx.race ? 1 + sum(RACES[ctx.race].economy, 1) : 1;
  for (const tech of Object.keys(ctx.techs ?? {}) as TechId[]) {
    const level = levelOf(ctx, tech);
    if (level > 0) mult *= 1 + sum(TECHS[tech].economy, level);
  }
  return Math.max(0, mult);
}

/** Research cost multiplier from the race (spec 9.3.6); catch-up comes in step 1.6. */
export function researchCostMultiplier(tech: TechId, ctx: ModifierContext = {}): number {
  return ctx.race && RACES[ctx.race].cheaperTechs.includes(tech) ? 1 - RESEARCH.raceDiscount : 1;
}

/** Balance value of a unit's base cost (spec 10.0). */
export function unitBaseValue(id: UnitId): number {
  let total = 0;
  for (const [r, n] of Object.entries(UNITS[id].cost) as [ResourceId, number][]) {
    total += RESOURCES[r].value * n;
  }
  return total;
}
