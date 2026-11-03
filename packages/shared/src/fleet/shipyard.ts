import { BUILDINGS, CANCEL_REFUND } from '../config/buildings';
import { SHIPYARD } from '../config/fleets';
import type { ResourceAmounts, ResourceId } from '../config/resources';
import { MS_PER_MINUTE } from '../config/time';
import { UNITS, type UnitId } from '../config/units';
import { fail, OK, type Result } from '../core/result';
import { capacityOf, type PlanetState, type ShipOrder } from '../economy/planet';
import { effectiveUnit, type ModifierContext } from '../rules/modifiers';
import { landUnits } from './fleet';

/** The shipyard (spec 9.2, 10.7): a queue of unit orders built one unit after another. */

/** Highest shipyard level on the planet (0 = none). */
export function shipyardLevel(p: PlanetState): number {
  return p.buildings.reduce(
    (m, b) => (BUILDINGS[b.kind].effect.kind === 'shipyard' ? Math.max(m, b.level) : m),
    0,
  );
}

/** Units built in a shipyard: not defences (those go up in the building queue, spec 9.2). */
export const shipyardUnits = (): UnitId[] =>
  (Object.keys(UNITS) as UnitId[]).filter(
    (u) => UNITS[u].category !== 'defense' && UNITS[u].shipyardLevel > 0,
  );

/** Cost and build time of one unit for this owner. */
export function unitOrderSpec(
  unit: UnitId,
  ctx: ModifierContext,
): { cost: ResourceAmounts; ms: number } {
  const e = effectiveUnit(unit, ctx);
  return { cost: e.cost, ms: Math.round(e.buildMinutes * MS_PER_MINUTE) };
}

export function canOrderUnits(
  p: PlanetState,
  unit: UnitId,
  count: number,
  ctx: ModifierContext,
): Result {
  const spec = UNITS[unit];
  if (!spec) return fail('NO_UNIT', 'No such unit.');
  if (spec.category === 'defense' || spec.shipyardLevel === 0)
    return fail('NOT_IN_SHIPYARD', `${spec.name} is not built in a shipyard.`);
  if (!Number.isInteger(count) || count < 1 || count > SHIPYARD.maxBatch)
    return fail('BAD_COUNT', `Order between 1 and ${SHIPYARD.maxBatch} units.`);
  const level = shipyardLevel(p);
  if (level === 0) return fail('NO_SHIPYARD', 'This planet has no shipyard.');
  if (level < spec.shipyardLevel)
    return fail('SHIPYARD_LEVEL', `${spec.name} needs a level ${spec.shipyardLevel} shipyard.`);
  if (p.shipyard.length >= SHIPYARD.maxOrders)
    return fail('QUEUE_FULL', `At most ${SHIPYARD.maxOrders} orders can wait in the shipyard.`);
  const { cost } = unitOrderSpec(unit, ctx);
  for (const [r, n] of Object.entries(cost) as [ResourceId, number][]) {
    if ((p.stock[r] ?? 0) < n * count - 1e-9)
      return fail('NOT_ENOUGH', 'Not enough resources for this order.');
  }
  return OK;
}

/** Pays and queues an order; starts it at once if the shipyard is idle. */
export function orderUnits(
  p: PlanetState,
  unit: UnitId,
  count: number,
  time: number,
  ctx: ModifierContext,
  id: number,
): ShipOrder {
  const { cost, ms } = unitOrderSpec(unit, ctx);
  for (const [r, n] of Object.entries(cost) as [ResourceId, number][])
    p.stock[r] = Math.max(0, (p.stock[r] ?? 0) - n * count);
  const order: ShipOrder = {
    id,
    unit,
    count,
    built: 0,
    unitMs: ms,
    cost,
    startedAt: p.shipyard.length === 0 ? time : null,
  };
  p.shipyard.push(order);
  return order;
}

/** When the unit now being built is done (null while idle). */
export function nextUnitAt(p: PlanetState): number | null {
  const o = p.shipyard[0];
  return o && o.startedAt !== null ? o.startedAt + o.unitMs : null;
}

/**
 * Finishes the unit due at `time` (if any): it lands at the planet; the next unit or order
 * starts at once. Returns the finished unit kind.
 */
export function finishUnit(p: PlanetState, time: number): UnitId | null {
  const o = p.shipyard[0];
  if (!o || o.startedAt === null || o.startedAt + o.unitMs !== time) return null;
  landUnits(p, { [o.unit]: 1 });
  o.built++;
  if (o.built >= o.count) {
    p.shipyard.shift();
    const next = p.shipyard[0];
    if (next) next.startedAt = time;
  } else o.startedAt = time;
  return o.unit;
}

/** Cancels an order: CANCEL_REFUND of the unfinished units' cost comes back (what fits). */
export function cancelOrder(p: PlanetState, id: number, time: number): ResourceAmounts {
  const i = p.shipyard.findIndex((o) => o.id === id);
  if (i < 0) return {};
  const [o] = p.shipyard.splice(i, 1) as [ShipOrder];
  const left = o.count - o.built;
  const back: ResourceAmounts = {};
  for (const [r, n] of Object.entries(o.cost) as [ResourceId, number][]) {
    const refund = Math.floor(n * left * CANCEL_REFUND);
    const got = Math.max(0, Math.min(refund, capacityOf(p, r) - (p.stock[r] ?? 0)));
    p.stock[r] = (p.stock[r] ?? 0) + got;
    back[r] = got;
  }
  if (i === 0 && p.shipyard[0]) p.shipyard[0].startedAt = time;
  return back;
}
