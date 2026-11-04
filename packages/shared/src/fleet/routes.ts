import { TRANSPORT } from '../config/fleets';
import type { ResourceAmounts, ResourceId } from '../config/resources';
import { MS_PER_HOUR } from '../config/time';
import { fail, OK, type Result } from '../core/result';
import type { GameState, PlayerId } from '../core/state';
import { FLIGHT } from '../config/fleets';
import type { PlanetId } from '../galaxy/types';
import type { ModifierContext } from '../rules/modifiers';
import { canSendFleet, cargoCapacity, sendFleet, type UnitCounts } from './fleet';

/**
 * Recurring routes (spec 12.2): a standing order that sends a transport every few hours,
 * also while the player is away. Each run takes what the origin has, up to the order.
 */
export interface Route {
  readonly id: string;
  readonly owner: PlayerId;
  readonly from: PlanetId;
  readonly to: PlanetId;
  readonly units: UnitCounts;
  readonly cargo: ResourceAmounts;
  readonly everyHours: number;
  /** Game time of the next run. */
  nextAt: number;
  /** Trips sent so far. */
  trips: number;
  /** What happened on the last run (shown to the player). */
  last: string;
}

export interface RouteOrder {
  readonly playerId: PlayerId;
  readonly from: PlanetId;
  readonly to: PlanetId;
  readonly units: UnitCounts;
  readonly cargo: ResourceAmounts;
  readonly everyHours: number;
}

export function canCreateRoute(
  state: Readonly<GameState>,
  o: RouteOrder,
  ctx: ModifierContext,
): Result {
  const p = state.planets[o.from];
  if (!p || p.owner !== o.playerId)
    return fail('NOT_YOURS', 'The route must start at your planet.');
  if (state.planets[o.to]?.owner !== o.playerId)
    return fail('NOT_YOUR_TARGET', 'A route must go to one of your planets.');
  if (o.to === o.from) return fail('SAME_PLANET', 'Choose another planet.');
  if (!Number.isFinite(o.everyHours) || o.everyHours < TRANSPORT.minEveryHours)
    return fail('BAD_INTERVAL', `A route runs at most every ${TRANSPORT.minEveryHours} h.`);
  const mine = Object.values(state.routes).filter((r) => r.owner === o.playerId).length;
  if (mine >= TRANSPORT.maxRoutes)
    return fail('TOO_MANY_ROUTES', `At most ${TRANSPORT.maxRoutes} routes.`);
  const cargo = Object.values(o.cargo).reduce((s, n) => s + (n ?? 0), 0);
  if (cargo <= 0) return fail('NO_CARGO', 'Choose what to carry.');
  if (cargo > cargoCapacity(o.units, ctx) + 1e-9)
    return fail('CARGO_FULL', 'The units cannot carry that much.');
  return OK;
}

export function createRoute(state: GameState, o: RouteOrder): Route {
  const route: Route = {
    id: `r${state.nextRoute++}`,
    owner: o.playerId,
    from: o.from,
    to: o.to,
    units: { ...o.units },
    cargo: { ...o.cargo },
    everyHours: o.everyHours,
    nextAt: state.time,
    trips: 0,
    last: 'waiting for the first run',
  };
  state.routes[route.id] = route;
  return route;
}

/**
 * One run of a route (the origin settled to now): loads what is there, up to the order (fuel
 * for the flight comes first), and sends the transport; or records why it could not.
 */
export function runRoute(state: GameState, r: Route, ctx: ModifierContext): string {
  const p = state.planets[r.from];
  r.nextAt = state.time + Math.round(r.everyHours * MS_PER_HOUR);
  if (!p || p.owner !== r.owner) {
    r.last = 'the origin is no longer yours';
    return r.last;
  }
  const cargo: ResourceAmounts = {};
  for (const [res, n] of Object.entries(r.cargo) as [ResourceId, number][]) {
    const have = p.stock[res] ?? 0;
    const k = Math.floor(Math.min(n, res === FLIGHT.fuel ? have / 2 : have));
    if (k > 0) cargo[res] = k;
  }
  if (Object.keys(cargo).length === 0) {
    r.last = 'nothing to carry';
    return r.last;
  }
  const order = {
    playerId: r.owner,
    from: r.from,
    to: r.to,
    units: r.units,
    mission: 'transport' as const,
    cargo,
    route: r.id,
  };
  const ok = canSendFleet(state, order, ctx);
  if (!ok.ok) {
    r.last = ok.error.message;
    return r.last;
  }
  const f = sendFleet(state, order, ctx);
  r.trips++;
  r.last = `trip ${r.trips} sent (${f.id})`;
  return r.last;
}
