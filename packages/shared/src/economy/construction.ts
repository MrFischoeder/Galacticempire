import { BUILD, BUILDINGS, CANCEL_REFUND, type BuildingId } from '../config/buildings';
import { PLANET_TYPES } from '../config/planets';
import {
  RESOURCES,
  type MinedResource,
  type ResourceAmounts,
  type ResourceId,
} from '../config/resources';
import { MS_PER_MINUTE } from '../config/time';
import { UNITS, type UnitId } from '../config/units';
import { fail, OK, type Result } from '../core/result';
import type { Planet } from '../galaxy/types';
import { unitMultiplier, type ModifierContext } from '../rules/modifiers';
import { capacityOf, type BuildingState, type PlanetState } from './planet';

/** Building, upgrading and cancelling (spec 9, balance docs/BALANS.md), step 1.5. */

/** Cost of reaching `level` (level 1 = putting the building up). */
export function buildingCost(
  kind: BuildingId,
  level: number,
  ctx: ModifierContext = {},
): ResourceAmounts {
  const spec = BUILDINGS[kind];
  const k = BUILD.costGrowth ** (level - 1);
  // Defensive structures are also units: race modifiers (e.g. Fortress -30%) apply.
  const race =
    kind in UNITS
      ? unitMultiplier(kind as UnitId, 'cost', { ...(ctx.race ? { race: ctx.race } : {}) })
      : 1;
  const cost: ResourceAmounts = {};
  for (const [r, n] of Object.entries(spec.cost) as [ResourceId, number][]) {
    cost[r] = Math.round(n * k * race);
  }
  // Special resources from their gate level (docs/SUROWCE.md) unless the base cost has them.
  for (const gate of spec.special) {
    if (level < gate.fromLevel || spec.cost[gate.resource] !== undefined) continue;
    const exotic = gate.resource === 'exotic';
    const base = exotic ? BUILD.exoticBase : BUILD.specialBase;
    cost[gate.resource] =
      (cost[gate.resource] ?? 0) +
      Math.round(base * BUILD.specialGrowth ** (level - gate.fromLevel));
  }
  return cost;
}

/** Build time of `level` in game ms. */
export function buildingTime(kind: BuildingId, level: number): number {
  const minutes = BUILDINGS[kind].buildMinutes * BUILD.timeGrowth ** (level - 1);
  return Math.round(minutes * 60) * 1000;
}

export function fieldsUsed(p: PlanetState): number {
  return p.buildings.length + (p.construction && p.construction.uid === undefined ? 1 : 0);
}

/**
 * What stands on every field (0..fields-1): a building, the new building under construction,
 * or null. Buildings without a recorded field (older saves, debug) take the first free fields
 * in order, so the result is the same every time.
 */
export type SlotContent =
  { readonly building: BuildingState } | { readonly construction: true } | null;

export function slotsOf(p: PlanetState, fields: number): SlotContent[] {
  const slots: SlotContent[] = new Array<SlotContent>(fields).fill(null);
  const placed = (i: number | undefined) =>
    i !== undefined && i >= 0 && i < fields && slots[i] === null;
  const unplaced: BuildingState[] = [];
  for (const b of p.buildings) {
    if (placed(b.slot)) slots[b.slot as number] = { building: b };
    else unplaced.push(b);
  }
  const c = p.construction;
  if (c && c.uid === undefined && placed(c.slot)) slots[c.slot as number] = { construction: true };
  for (const b of unplaced) {
    const free = slots.indexOf(null);
    if (free >= 0) slots[free] = { building: b };
  }
  if (c && c.uid === undefined && !slots.some((x) => x !== null && 'construction' in x)) {
    const free = slots.indexOf(null);
    if (free >= 0) slots[free] = { construction: true };
  }
  return slots;
}

export function firstFreeSlot(p: PlanetState, fields: number): number {
  return slotsOf(p, fields).indexOf(null);
}

export function findBuilding(p: PlanetState, uid: number): BuildingState | undefined {
  return p.buildings.find((b) => b.uid === uid);
}

function hasLevel(p: PlanetState, kind: BuildingId, level: number): boolean {
  return p.buildings.some((b) => b.kind === kind && b.level >= level);
}

const name = (r: ResourceId) => RESOURCES[r].name.toLowerCase();

/** Can the planet pay and store this cost right now? */
export function checkCost(p: PlanetState, cost: ResourceAmounts): Result {
  for (const [r, n] of Object.entries(cost) as [ResourceId, number][]) {
    if (n > capacityOf(p, r)) {
      return fail(
        'COST_EXCEEDS_STORAGE',
        `The cost in ${name(r)} (${n}) exceeds the storage capacity. Upgrade the warehouse first.`,
      );
    }
  }
  for (const [r, n] of Object.entries(cost) as [ResourceId, number][]) {
    const have = p.stock[r] ?? 0;
    if (have + 1e-9 < n) {
      return fail(
        'NOT_ENOUGH',
        `Not enough ${name(r)}: ${n} needed, ${Math.floor(have)} available.`,
      );
    }
  }
  return OK;
}

function checkRequirements(p: PlanetState, kind: BuildingId): Result {
  for (const req of BUILDINGS[kind].requires) {
    if (!hasLevel(p, req.building, req.level)) {
      return fail(
        'REQUIREMENT',
        `Requires: ${BUILDINGS[req.building].name} level ${req.level} on this planet.`,
      );
    }
  }
  return OK;
}

/** Validation of a new building (level 1). */
export function canStartBuilding(
  p: PlanetState,
  planet: Planet,
  kind: BuildingId,
  deposit: MinedResource | undefined,
  ctx: ModifierContext = {},
  slot?: number,
): Result {
  const spec = BUILDINGS[kind];
  if (!spec) return fail('NO_BUILDING', 'No such building.');
  if (p.construction)
    return fail('BUSY', 'A construction is already under way on this planet. Wait or cancel it.');
  if (fieldsUsed(p) >= planet.fields)
    return fail('NO_FIELDS', 'No free fields left on this planet.');
  if (slot !== undefined) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= planet.fields)
      return fail('BAD_SLOT', 'No such field on this planet.');
    if (slotsOf(p, planet.fields)[slot] !== null)
      return fail('SLOT_TAKEN', 'This field is already taken.');
  }
  if (planet.type === 'gasGiant' && !spec.gasGiantOk) {
    return fail('GAS_GIANT', 'This building cannot be built on a gas giant.');
  }
  if (!PLANET_TYPES[planet.type].housing && spec.effect.kind === 'housing') {
    return fail('GAS_GIANT', 'Housing cannot be built on a gas giant.');
  }
  if (spec.effect.kind === 'renewable' && !planet.renewable) {
    return fail('NO_RENEWABLE', 'This planet has no renewable energy source.');
  }
  if (spec.effect.kind === 'mine') {
    if (!deposit || !planet.deposits.some((d) => d.resource === deposit)) {
      return fail('NO_DEPOSIT', 'A mine must stand on a deposit of this planet.');
    }
  }
  const count = p.buildings.filter((b) => b.kind === kind).length;
  if (spec.unique && count > 0)
    return fail('UNIQUE', 'Only one of these buildings can stand on a planet.');
  if (spec.maxCount !== undefined && count >= spec.maxCount) {
    return fail('MAX_COUNT', `At most ${spec.maxCount} of these buildings can stand on a planet.`);
  }
  const req = checkRequirements(p, kind);
  if (!req.ok) return req;
  return checkCost(p, buildingCost(kind, 1, ctx));
}

/** Validation of an upgrade of the building `uid`. */
export function canStartUpgrade(p: PlanetState, uid: number, ctx: ModifierContext = {}): Result {
  const b = findBuilding(p, uid);
  if (!b) return fail('NO_SUCH_BUILDING', 'No such building on this planet.');
  if (p.construction)
    return fail('BUSY', 'A construction is already under way on this planet. Wait or cancel it.');
  const spec = BUILDINGS[b.kind];
  if (b.level >= spec.maxLevel)
    return fail('MAX_LEVEL', 'This building is already at its highest level.');
  return checkCost(p, buildingCost(b.kind, b.level + 1, ctx));
}

/** Starts building (the planet must be settled to `now` and validated). Pays the cost. */
export function startConstruction(
  p: PlanetState,
  target: { kind: BuildingId; deposit?: MinedResource; uid?: number; slot?: number },
  now: number,
  ctx: ModifierContext = {},
): PlanetState['construction'] {
  const existing = target.uid !== undefined ? findBuilding(p, target.uid) : undefined;
  const level = existing ? existing.level + 1 : 1;
  const cost = buildingCost(target.kind, level, ctx);
  for (const [r, n] of Object.entries(cost) as [ResourceId, number][]) {
    p.stock[r] = Math.max(0, (p.stock[r] ?? 0) - n);
  }
  p.construction = {
    kind: target.kind,
    ...(target.deposit ? { deposit: target.deposit } : {}),
    ...(existing ? { uid: target.uid as number } : { newUid: p.nextUid++ }),
    ...(!existing && target.slot !== undefined ? { slot: target.slot } : {}),
    level,
    startedAt: now,
    endsAt: now + buildingTime(target.kind, level),
    cost,
  };
  return p.construction;
}

/** Finishes the construction (the planet must be settled to its end time). */
export function finishConstruction(p: PlanetState): BuildingState | undefined {
  const c = p.construction;
  if (!c) return undefined;
  p.construction = null;
  if (c.uid !== undefined) {
    const b = findBuilding(p, c.uid);
    if (b) b.level = c.level;
    return b;
  }
  const b: BuildingState = {
    uid: c.newUid as number,
    kind: c.kind,
    level: 1,
    ...(c.deposit ? { deposit: c.deposit } : {}),
    ...(c.slot !== undefined ? { slot: c.slot } : {}),
  };
  p.buildings.push(b);
  return b;
}

/** Cancels the construction and returns CANCEL_REFUND of what was paid (what fits). */
export function cancelConstruction(p: PlanetState): ResourceAmounts {
  const c = p.construction;
  if (!c) return {};
  p.construction = null;
  const back: ResourceAmounts = {};
  for (const [r, n] of Object.entries(c.cost) as [ResourceId, number][]) {
    const refund = Math.floor(n * CANCEL_REFUND);
    const room = capacityOf(p, r) - (p.stock[r] ?? 0);
    const got = Math.max(0, Math.min(refund, room));
    p.stock[r] = (p.stock[r] ?? 0) + got;
    back[r] = got;
  }
  return back;
}

/** Minutes of a level, for the UI. */
export const buildingMinutes = (kind: BuildingId, level: number) =>
  buildingTime(kind, level) / MS_PER_MINUTE;
