import { FLIGHT, MISSIONS, type FleetMission } from '../config/fleets';
import { MS_PER_HOUR, MS_PER_MINUTE } from '../config/time';
import { HANGAR_SLOTS, UNIT_IDS, UNITS, type UnitId } from '../config/units';
import { fail, OK, type Result } from '../core/result';
import type { GameState, PlayerId } from '../core/state';
import { capacityOf, hangarPlaces, landUnits, placesOf, type PlanetState } from '../economy/planet';
import type { Galaxy, PlanetId } from '../galaxy/types';
import { effectiveUnit, type ModifierContext } from '../rules/modifiers';

/**
 * Fleets (spec 12.1, step 1.9). A player's units at their own planets live in the planet's
 * hangars (`units`) or orbit (`orbit`); a Fleet exists only while units are in flight. Owner
 * 3.11.2026: flights go in a straight line; no stationing at other players' planets; the fuel of
 * the whole mission is worked out and paid at the start, so a fleet never runs dry on the way.
 */
export type UnitCounts = Partial<Record<UnitId, number>>;

export interface FleetLeg {
  readonly from: PlanetId;
  readonly to: PlanetId;
  /** Map positions (galaxy units, LY) of the start and the end of the leg. */
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  readonly departAt: number;
  /** End of the hyperspace entry: the fleet moves from here on. */
  readonly moveAt: number;
  readonly arriveAt: number;
}

export interface Fleet {
  readonly id: string;
  readonly owner: PlayerId;
  units: UnitCounts;
  readonly mission: FleetMission;
  readonly origin: PlanetId;
  readonly target: PlanetId;
  /** out: flying to the target; back: flying home. */
  phase: 'out' | 'back';
  leg: FleetLeg | null;
  /** Distance of the whole flight (one way), LY. */
  readonly ly: number;
  /** Fleet speed (slowest unit), LY per hour, fixed at launch. */
  readonly speed: number;
  /** Fuel of the whole fleet at launch: per start and per LY (modifiers fixed at launch). */
  readonly fuelStart: number;
  readonly fuelPerLy: number;
  /** Fuel taken from the store at launch. */
  readonly paid: number;
  /** Fuel the fleet still carries (for the way back, or to be returned to the store). */
  reserve: number;
  recalled: boolean;
}

// --- units at a planet ---------------------------------------------------------------------

export function addUnits(to: UnitCounts, add: UnitCounts): void {
  for (const [u, n] of Object.entries(add) as [UnitId, number][]) {
    if (n > 0) to[u] = (to[u] ?? 0) + n;
  }
}

/** Every unit of the owner at the planet: hangars and orbit. */
export function unitsAt(p: PlanetState): UnitCounts {
  const all: UnitCounts = {};
  addUnits(all, p.units);
  addUnits(all, p.orbit);
  return all;
}

export function countUnits(units: UnitCounts): number {
  return Object.values(units).reduce((s, n) => s + (n ?? 0), 0);
}

/** Hangars that lost places push units out into orbit (the biggest kinds last in, first out). */
export function fitHangar(p: PlanetState): void {
  let over = placesOf(p.units) - hangarPlaces(p);
  for (const u of [...UNIT_IDS].reverse()) {
    if (over <= 0) break;
    const n = p.units[u] ?? 0;
    if (n <= 0) continue;
    const size = HANGAR_SLOTS[UNITS[u].size];
    const out = Math.min(n, Math.ceil(over / size));
    p.units[u] = n - out;
    if (p.units[u] === 0) delete p.units[u];
    p.orbit[u] = (p.orbit[u] ?? 0) + out;
    over -= out * size;
  }
}

/** Where units go inside their planet: into the hangars or out into orbit (free). */
export type UnitPlace = 'hangar' | 'orbit';

export function canMoveUnits(p: PlanetState, units: UnitCounts, to: UnitPlace): Result {
  const from = to === 'hangar' ? p.orbit : p.units;
  let any = false;
  for (const [u, n] of Object.entries(units) as [UnitId, number][]) {
    if (!(u in UNITS)) return fail('NO_UNIT', 'No such unit.');
    if (n === 0) continue;
    if (!Number.isInteger(n) || n < 0)
      return fail('BAD_AMOUNT', 'Unit counts must be whole non-negative numbers.');
    if ((from[u] ?? 0) < n)
      return fail(
        'NOT_ENOUGH_UNITS',
        `There are not enough ${UNITS[u].name} units ${to === 'hangar' ? 'in orbit' : 'in the hangars'}.`,
      );
    any = true;
  }
  if (!any) return fail('NO_UNITS', 'Choose the units to move.');
  if (to === 'hangar' && placesOf(p.units) + placesOf(units) > hangarPlaces(p))
    return fail('HANGAR_FULL', 'Not enough hangar places.');
  return OK;
}

export function moveUnits(p: PlanetState, units: UnitCounts, to: UnitPlace): void {
  const [from, into] = to === 'hangar' ? [p.orbit, p.units] : [p.units, p.orbit];
  for (const [u, n] of Object.entries(units) as [UnitId, number][]) {
    if (!(n > 0)) continue;
    from[u] = (from[u] ?? 0) - n;
    if (from[u] === 0) delete from[u];
    into[u] = (into[u] ?? 0) + n;
  }
}

/** As many units as fit into the hangars from orbit (the "Dock all" button). */
export function dockable(p: PlanetState): UnitCounts {
  const out: UnitCounts = {};
  let free = hangarPlaces(p) - placesOf(p.units);
  for (const u of UNIT_IDS) {
    const n = p.orbit[u] ?? 0;
    const size = HANGAR_SLOTS[UNITS[u].size];
    const k = Math.max(0, Math.min(n, Math.floor(free / size)));
    if (k > 0) out[u] = k;
    free -= k * size;
  }
  return out;
}

function takeUnits(p: PlanetState, units: UnitCounts): void {
  for (const [u, n] of Object.entries(units) as [UnitId, number][]) {
    let left = n;
    for (const store of [p.orbit, p.units]) {
      const take = Math.min(left, store[u] ?? 0);
      if (take > 0) {
        store[u] = (store[u] ?? 0) - take;
        if (store[u] === 0) delete store[u];
        left -= take;
      }
    }
  }
}

// --- flight plan ---------------------------------------------------------------------------

export interface FlightDistance {
  readonly ly: number;
  /** Between systems (pays the hyperspace entry) or inside one system. */
  readonly interstellar: boolean;
}

/** Straight-line distance between two planets (spec 12.1, 12.1.5). */
export function flightDistance(galaxy: Galaxy, from: PlanetId, to: PlanetId): FlightDistance {
  const a = galaxy.planets[from];
  const b = galaxy.planets[to];
  if (!a || !b) throw new RangeError(`Unknown planet ${from} or ${to}`);
  if (a.system === b.system) return { ly: Math.abs(a.orbit - b.orbit), interstellar: false };
  const s = galaxy.systems[a.system];
  const t = galaxy.systems[b.system];
  if (!s || !t) throw new RangeError(`Unknown system`);
  return { ly: Math.hypot(s.x - t.x, s.y - t.y), interstellar: true };
}

/** One-way flight time in ms (spec 12.1.1): distance / speed + hyperspace entry between systems. */
export function flightTime(ly: number, speed: number, interstellar: boolean): number {
  const hyperspace = interstellar ? FLIGHT.hyperspaceMinutes * MS_PER_MINUTE : 0;
  return Math.round(hyperspace + (speed > 0 && speed < Infinity ? (ly / speed) * MS_PER_HOUR : 0));
}

export interface FlightPlan {
  readonly ly: number;
  readonly interstellar: boolean;
  /** Slowest unit, LY per hour. */
  readonly speed: number;
  readonly slowest: UnitId;
  /** One way, ms (hyperspace entry included). */
  readonly duration: number;
  readonly hyperspace: number;
  /** Fuel for the whole fleet: one way, and what the mission takes at launch. */
  readonly fuelStart: number;
  readonly fuelPerLy: number;
  readonly fuelOneWay: number;
  readonly fuel: number;
  readonly free: boolean;
}

/** Time and fuel of a flight (spec 12.1.1-12.1.2). Units must be able to fly. */
export function flightPlan(
  state: Readonly<GameState>,
  player: PlayerId,
  from: PlanetId,
  to: PlanetId,
  units: UnitCounts,
  mission: FleetMission,
  ctx: ModifierContext,
): FlightPlan {
  const galaxy = state.world.galaxy;
  const { ly, interstellar } = flightDistance(galaxy, from, to);
  let speed = Infinity;
  let slowest: UnitId = 'probe';
  let fuelStart = 0;
  let fuelPerLy = 0;
  for (const [u, n] of Object.entries(units) as [UnitId, number][]) {
    if (!(n > 0)) continue;
    const e = effectiveUnit(u, ctx);
    if (e.speed < speed) {
      speed = e.speed;
      slowest = u;
    }
    fuelStart += e.fuelStart * n;
    fuelPerLy += e.fuelPerLy * n;
  }
  // Flights inside one system burn no fuel (owner 3.11.2026).
  const free = !interstellar;
  if (free) {
    fuelStart = 0;
    fuelPerLy = 0;
  }
  const hyperspace = interstellar ? FLIGHT.hyperspaceMinutes * MS_PER_MINUTE : 0;
  const duration = flightTime(ly, speed, interstellar);
  const fuelOneWay = fuelStart + fuelPerLy * ly;
  return {
    ly,
    interstellar,
    speed,
    slowest,
    duration,
    hyperspace,
    fuelStart,
    fuelPerLy,
    fuelOneWay,
    fuel: MISSIONS[mission].roundTrip ? 2 * fuelOneWay : fuelOneWay,
    free,
  };
}

function leg(galaxy: Galaxy, from: PlanetId, to: PlanetId, at: number, plan: FlightPlan): FleetLeg {
  const a = galaxy.systems[galaxy.planets[from]?.system ?? -1];
  const b = galaxy.systems[galaxy.planets[to]?.system ?? -1];
  return {
    from,
    to,
    x0: a?.x ?? 0,
    y0: a?.y ?? 0,
    x1: b?.x ?? 0,
    y1: b?.y ?? 0,
    departAt: at,
    moveAt: at + plan.hyperspace,
    arriveAt: at + plan.duration,
  };
}

// --- commands ------------------------------------------------------------------------------

export interface SendFleetOrder {
  readonly playerId: PlayerId;
  readonly from: PlanetId;
  readonly to: PlanetId;
  readonly units: UnitCounts;
  readonly mission: FleetMission;
}

/** Checks a SendFleet order against a planet settled to now. */
export function canSendFleet(
  state: Readonly<GameState>,
  o: SendFleetOrder,
  ctx: ModifierContext,
): Result {
  const p = state.planets[o.from];
  if (!p) return fail('NOT_OWNED', 'This planet has no owner.');
  if (p.owner !== o.playerId) return fail('NOT_YOURS', 'This is not your planet.');
  if (!state.world.galaxy.planets[o.to]) return fail('NO_PLANET', 'No such target planet.');
  if (o.to === o.from) return fail('SAME_PLANET', 'The fleet is already at this planet.');
  if (!(o.mission in MISSIONS)) return fail('BAD_MISSION', 'No such mission.');
  if (o.mission === 'transfer' && state.planets[o.to]?.owner !== o.playerId)
    return fail('NOT_YOUR_TARGET', 'A transfer must go to one of your planets.');
  const here = unitsAt(p);
  let any = false;
  for (const [u, n] of Object.entries(o.units) as [UnitId, number][]) {
    if (!(u in UNITS)) return fail('NO_UNIT', 'No such unit.');
    if (n === 0) continue;
    if (!Number.isInteger(n) || n < 0)
      return fail('BAD_AMOUNT', 'Unit counts must be whole non-negative numbers.');
    if (UNITS[u].speed <= 0) return fail('CANNOT_FLY', `${UNITS[u].name} cannot fly on its own.`);
    if ((here[u] ?? 0) < n)
      return fail('NOT_ENOUGH_UNITS', `There are not enough ${UNITS[u].name} units here.`);
    any = true;
  }
  if (!any) return fail('NO_UNITS', 'Choose the units to send.');
  const plan = flightPlan(state, o.playerId, o.from, o.to, o.units, o.mission, ctx);
  if ((p.stock[FLIGHT.fuel] ?? 0) < plan.fuel - 1e-9)
    return fail('NO_FUEL', `Not enough fuel: the flight needs ${Math.ceil(plan.fuel)}.`);
  return OK;
}

/** Launches a fleet (the planet must be settled to now and the order checked). */
export function sendFleet(state: GameState, o: SendFleetOrder, ctx: ModifierContext): Fleet {
  const p = state.planets[o.from] as PlanetState;
  const plan = flightPlan(state, o.playerId, o.from, o.to, o.units, o.mission, ctx);
  const units: UnitCounts = {};
  addUnits(units, o.units);
  takeUnits(p, units);
  addUnits(p.away, units); // the crews are still fed by the home planet (spec 10.4)
  p.stock[FLIGHT.fuel] = Math.max(0, (p.stock[FLIGHT.fuel] ?? 0) - plan.fuel);
  const fleet: Fleet = {
    id: `f${state.nextFleet++}`,
    owner: o.playerId,
    units,
    mission: o.mission,
    origin: o.from,
    target: o.to,
    phase: 'out',
    leg: leg(state.world.galaxy, o.from, o.to, state.time, plan),
    ly: plan.ly,
    speed: plan.speed,
    fuelStart: plan.fuelStart,
    fuelPerLy: plan.fuelPerLy,
    paid: plan.fuel,
    reserve: plan.fuel - plan.fuelOneWay,
    recalled: false,
  };
  state.fleets[fleet.id] = fleet;
  return fleet;
}

/**
 * Fuel the fleet has left after coming back from here; returned to the store on landing. A
 * fleet never runs dry (owner 3.11.2026): a one-way flight past half way just returns nothing.
 */
export function recallLeftover(f: Fleet, time: number): number {
  const flown =
    f.leg && f.leg.arriveAt > f.leg.moveAt
      ? (f.ly * Math.max(0, Math.min(time, f.leg.arriveAt) - f.leg.moveAt)) /
        (f.leg.arriveAt - f.leg.moveAt)
      : 0;
  return f.paid - (f.fuelStart + 2 * f.fuelPerLy * flown);
}

export function canRecallFleet(state: Readonly<GameState>, playerId: PlayerId, id: string): Result {
  const f = state.fleets[id];
  if (!f) return fail('NO_FLEET', 'No such fleet.');
  if (f.owner !== playerId) return fail('NOT_YOUR_FLEET', 'This is not your fleet.');
  if (f.phase !== 'out' || !f.leg)
    return fail('NOT_OUTBOUND', 'Only a fleet on its way out can be recalled.');
  return OK;
}

/** Turns a fleet back: it comes home in the time it has flown, unused fuel goes to the store. */
export function recallFleet(state: GameState, id: string): Fleet {
  const f = state.fleets[id] as Fleet;
  const l = f.leg as FleetLeg;
  const now = state.time;
  const total = l.arriveAt - l.moveAt;
  const share = total > 0 ? Math.max(0, Math.min(1, (now - l.moveAt) / total)) : 0;
  const x = l.x0 + (l.x1 - l.x0) * share;
  const y = l.y0 + (l.y1 - l.y0) * share;
  const elapsed = now - l.departAt;
  const entered = Math.min(now, l.moveAt) - l.departAt;
  f.reserve = Math.max(0, recallLeftover(f, now));
  f.phase = 'back';
  f.recalled = true;
  f.leg = {
    from: l.to,
    to: f.origin,
    x0: x,
    y0: y,
    x1: l.x0,
    y1: l.y0,
    departAt: now,
    moveAt: now + entered,
    arriveAt: now + elapsed,
  };
  return f;
}

/** Map position of a fleet at `time`. */
export function fleetPosition(f: Fleet, time: number): { x: number; y: number } | null {
  const l = f.leg;
  if (!l) return null;
  const total = l.arriveAt - l.moveAt;
  const share = total > 0 ? Math.max(0, Math.min(1, (time - l.moveAt) / total)) : 1;
  return { x: l.x0 + (l.x1 - l.x0) * share, y: l.y0 + (l.y1 - l.y0) * share };
}

// --- arrival -------------------------------------------------------------------------------

/** The fleet's units stop being fed by its home planet (they land, or are lost). */
function releaseAway(state: GameState, f: Fleet): void {
  const home = state.planets[f.origin];
  if (!home || home.owner !== f.owner) return;
  for (const [u, n] of Object.entries(f.units) as [UnitId, number][]) {
    const left = (home.away[u] ?? 0) - n;
    if (left > 0) home.away[u] = left;
    else delete home.away[u];
  }
}

/** Lands the fleet's units at an own planet and returns its unused fuel to the store. */
function land(state: GameState, f: Fleet, p: PlanetState): void {
  releaseAway(state, f);
  landUnits(p, f.units);
  if (f.reserve > 0) {
    const r = FLIGHT.fuel;
    p.stock[r] = Math.min(capacityOf(p, r), (p.stock[r] ?? 0) + f.reserve);
  }
  delete state.fleets[f.id];
}

/** The owner's planet nearest to a planet (for a fleet whose home was lost). */
function nearestOwn(state: GameState, owner: PlayerId, from: PlanetId): PlanetId | null {
  let best: PlanetId | null = null;
  let bestLy = Infinity;
  for (const p of Object.values(state.planets)) {
    if (p.owner !== owner) continue;
    const ly = flightDistance(state.world.galaxy, from, p.id).ly;
    if (ly < bestLy || (ly === bestLy && best !== null && p.id < best)) {
      best = p.id;
      bestLy = ly;
    }
  }
  return best;
}

/** Starts a flight from `from` to `to` for a fleet already in space (no fuel taken). */
function flyOn(state: GameState, f: Fleet, from: PlanetId, to: PlanetId): void {
  const galaxy = state.world.galaxy;
  const { ly, interstellar } = flightDistance(galaxy, from, to);
  const duration = flightTime(ly, f.speed, interstellar);
  const plan = { hyperspace: duration - flightTime(ly, f.speed, false), duration } as FlightPlan;
  f.phase = 'back';
  f.leg = leg(galaxy, from, to, state.time, plan);
}

/** What happens when a fleet's leg ends (called with the destination and home planets settled). */
export function arriveFleet(state: GameState, id: string): string | null {
  const f = state.fleets[id];
  if (!f?.leg) return null;
  const galaxy = state.world.galaxy;
  const where = f.leg.to;
  const name = galaxy.planets[where]?.name ?? where;
  const own = state.planets[where]?.owner === f.owner ? state.planets[where] : undefined;
  if (f.phase === 'out' && f.mission === 'return') {
    // The fuel for the way back was paid at the start (attacks and raids: phase 2).
    f.reserve = Math.max(0, f.reserve - (f.fuelStart + f.fuelPerLy * f.ly));
    flyOn(state, f, where, f.origin);
    return `Fleet ${f.id} reached ${name} and turns back.`;
  }
  if (own) {
    land(state, f, own);
    return `Fleet ${f.id} landed at ${name}.`;
  }
  // The planet is not (or no longer) the owner's: the fleet heads for the nearest own planet.
  const home = nearestOwn(state, f.owner, where);
  if (!home) {
    releaseAway(state, f);
    delete state.fleets[f.id];
    return `Fleet ${f.id} found no planet of yours to land at and was lost.`;
  }
  flyOn(state, f, where, home);
  return `Fleet ${f.id} cannot land at ${name} and heads for ${galaxy.planets[home]?.name ?? home}.`;
}
