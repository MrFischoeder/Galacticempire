import { BUILDINGS, CORE } from '../config/buildings';
import { FLIGHT, MISSIONS, TRANSPORT, type FleetMission } from '../config/fleets';
import type { ResourceAmounts, ResourceId } from '../config/resources';
import { MS_PER_HOUR, MS_PER_MINUTE } from '../config/time';
import { HANGAR_SLOTS, UNIT_IDS, UNITS, type UnitId } from '../config/units';
import { fail, OK, type Result } from '../core/result';
import type { GameState, PlayerId } from '../core/state';
import {
  capacityOf,
  createPlanetState,
  hangarPlaces,
  landUnits,
  placesOf,
  STOCKED,
  type PlanetState,
} from '../economy/planet';
import type { Galaxy, PlanetId } from '../galaxy/types';
import { effectiveUnit, type ModifierContext } from '../rules/modifiers';
import { discover, scanSystem } from '../intel/intel';
import { allianceOf, allied, atPeace } from '../diplomacy/diplomacy';

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
  /**
   * out: flying to the target; back: flying home; waiting: in orbit at a full warehouse;
   * stationed: defending an ally's planet (spec 16).
   */
  phase: 'out' | 'back' | 'waiting' | 'stationed';
  leg: FleetLeg | null;
  /** Resources carried (transports, spec 12.2). */
  cargo: ResourceAmounts;
  /** A waiting transport tries to unload again at this game time. */
  retryAt?: number;
  /** The recurring route that sent it. */
  route?: string;
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
  /** Resources to carry (transport only). */
  readonly cargo?: ResourceAmounts;
  /** Set by a recurring route. */
  readonly route?: string;
}

/** Cargo room of some units (spec 10.1-10.2; race and research modifiers included). */
export function cargoCapacity(units: UnitCounts, ctx: ModifierContext): number {
  return (Object.entries(units) as [UnitId, number][]).reduce(
    (s, [u, n]) => s + (n > 0 ? effectiveUnit(u, ctx).cargo * n : 0),
    0,
  );
}

const total = (a: ResourceAmounts) => Object.values(a).reduce((s, n) => s + (n ?? 0), 0);

/** Loading time of a transport at a planet: its spaceport's (spec 9.1) or the default. */
export function loadTime(p: PlanetState): number {
  let minutes: number = TRANSPORT.loadMinutesNoSpaceport;
  for (const b of p.buildings) {
    const e = BUILDINGS[b.kind].effect;
    if (e.kind === 'spaceport')
      minutes = Math.min(minutes, e.loadMinutes * e.loadGrowth ** (b.level - 1));
  }
  return Math.round(minutes * MS_PER_MINUTE);
}

/**
 * The player who controls a system (at least half of its planets, spec 2.4), or null. A free
 * planet in a system controlled by someone else cannot be colonized (spec 10.5; with a pact or
 * an alliance it will be allowed, step 1.12).
 */
export function systemController(state: Readonly<GameState>, system: number): PlayerId | null {
  const planets = state.world.galaxy.systems[system]?.planets ?? [];
  // Control is counted for an alliance as a whole (spec 16); the first member stands for it.
  const group = (o: PlayerId) => allianceOf(state, o)?.members[0] ?? o;
  const count = new Map<PlayerId, number>();
  for (const id of planets) {
    const o = state.planets[id]?.owner;
    if (o) count.set(group(o), (count.get(group(o)) ?? 0) + 1);
  }
  for (const [o, n] of count) if (n * 2 >= planets.length && planets.length > 0) return o;
  return null;
}

function colonizeProblem(state: Readonly<GameState>, player: PlayerId, to: PlanetId): Result {
  if (state.planets[to]) return fail('NOT_FREE', 'Only a free planet can be colonized.');
  const sys = state.world.galaxy.planets[to]?.system ?? -1;
  const ctl = systemController(state, sys);
  // Next to an ally or a pact partner colonizing is allowed (question 34).
  if (ctl && !atPeace(state, ctl, player))
    return fail(
      'SYSTEM_CONTROLLED',
      'Another player controls this system; it cannot be colonized.',
    );
  return OK;
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
  const cargo = o.cargo ?? {};
  const targetOwner = state.planets[o.to]?.owner;
  if (
    o.mission === 'defend' &&
    (!targetOwner || targetOwner === o.playerId || !allied(state, targetOwner, o.playerId))
  )
    return fail('NOT_ALLY', "A defence fleet must go to an ally's planet.");
  if (o.mission === 'transport') {
    // To your own planets or an ally's (spec 16).
    if (!targetOwner || !allied(state, targetOwner, o.playerId))
      return fail('NOT_YOUR_TARGET', "A transport must go to one of your or your allies' planets.");
    for (const [r, n] of Object.entries(cargo) as [ResourceId, number][]) {
      if (!STOCKED.includes(r)) return fail('BAD_RESOURCE', 'This resource cannot be carried.');
      if (!Number.isFinite(n) || n < 0) return fail('BAD_AMOUNT', 'Cargo must be non-negative.');
    }
    if (total(cargo) <= 0) return fail('NO_CARGO', 'Choose what to carry.');
    const room = cargoCapacity(o.units, ctx);
    if (total(cargo) > room + 1e-9)
      return fail('CARGO_FULL', `The fleet can carry ${Math.floor(room)} units of cargo.`);
  } else if (total(cargo) > 0) return fail('NO_CARGO_MISSION', 'Only transports carry cargo.');
  if (o.mission === 'scan' && (o.units.probe ?? 0) < 1)
    return fail('NO_PROBE', 'A scan needs a probe.');
  if (o.mission === 'colonize') {
    if ((o.units.colonizer ?? 0) < 1)
      return fail('NO_COLONIZER', 'A colonization needs a colonizer.');
    const c = colonizeProblem(state, o.playerId, o.to);
    if (!c.ok) return c;
  }
  const plan = flightPlan(state, o.playerId, o.from, o.to, o.units, o.mission, ctx);
  for (const [r, n] of Object.entries(cargo) as [ResourceId, number][]) {
    const need = n + (r === FLIGHT.fuel ? plan.fuel : 0);
    if ((p.stock[r] ?? 0) < need - 1e-9)
      return fail('NOT_ENOUGH_CARGO', `Not enough ${r} here to load.`);
  }
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
  const cargo: ResourceAmounts = {};
  for (const [r, n] of Object.entries(o.cargo ?? {}) as [ResourceId, number][]) {
    if (!(n > 0)) continue;
    cargo[r] = n;
    p.stock[r] = Math.max(0, (p.stock[r] ?? 0) - n);
  }
  // A transport loads before it takes off (spec 9.1: the spaceport sets the loading time).
  const load = o.mission === 'transport' ? loadTime(p) : 0;
  const out = { ...plan, hyperspace: plan.hyperspace + load, duration: plan.duration + load };
  const fleet: Fleet = {
    id: `f${state.nextFleet++}`,
    owner: o.playerId,
    units,
    mission: o.mission,
    origin: o.from,
    target: o.to,
    phase: 'out',
    leg: leg(state.world.galaxy, o.from, o.to, state.time, out),
    cargo,
    ...(o.route ? { route: o.route } : {}),
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
  if (f.phase === 'waiting' || f.phase === 'stationed') return OK;
  if (f.phase !== 'out' || !f.leg)
    return fail('NOT_OUTBOUND', 'Only a fleet on its way out can be recalled.');
  return OK;
}

/** Turns a fleet back: it comes home in the time it has flown, unused fuel goes to the store. */
export function recallFleet(state: GameState, id: string): Fleet {
  const f = state.fleets[id] as Fleet;
  if (f.phase === 'waiting' || f.phase === 'stationed') {
    // A transport waiting at a full warehouse goes home with what it still carries; a defence
    // fleet leaves its ally (the fuel for the way back was paid at the start).
    turnHome(state, f, f.target);
    f.recalled = true;
    return f;
  }
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
function land(state: GameState, f: Fleet, p: PlanetState): string {
  releaseAway(state, f);
  landUnits(p, f.units);
  let lost = 0;
  for (const [r, n] of Object.entries(f.cargo) as [ResourceId, number][]) {
    const put = Math.max(0, Math.min(n, capacityOf(p, r) - (p.stock[r] ?? 0)));
    p.stock[r] = (p.stock[r] ?? 0) + put;
    lost += n - put;
  }
  if (f.reserve > 0) {
    const r = FLIGHT.fuel;
    p.stock[r] = Math.min(capacityOf(p, r), (p.stock[r] ?? 0) + f.reserve);
  }
  delete state.fleets[f.id];
  return lost > 0.5 ? ` ${Math.floor(lost)} units of cargo did not fit and were lost.` : '';
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

/** A round-trip fleet at its target turns home; the fuel for the way back was paid at the start. */
function turnHome(state: GameState, f: Fleet, where: PlanetId): void {
  f.reserve = Math.max(0, f.reserve - (f.fuelStart + f.fuelPerLy * f.ly));
  delete f.retryAt;
  flyOn(state, f, where, f.origin);
}

/**
 * A transport unloads into its target's stores (spec 12.2): what does not fit waits in orbit
 * and is tried again every TRANSPORT.retryMinutes. Returns the log text.
 */
export function unloadTransport(state: GameState, f: Fleet, p: PlanetState): string {
  const name = state.world.galaxy.planets[p.id]?.name ?? p.id;
  let put = 0;
  for (const [r, n] of Object.entries(f.cargo) as [ResourceId, number][]) {
    const k = Math.max(0, Math.min(n, capacityOf(p, r) - (p.stock[r] ?? 0)));
    p.stock[r] = (p.stock[r] ?? 0) + k;
    put += k;
    if (n - k > 1e-9) f.cargo[r] = n - k;
    else delete f.cargo[r];
  }
  if (total(f.cargo) <= 1e-9) {
    f.cargo = {};
    turnHome(state, f, p.id);
    return `Fleet ${f.id} unloaded ${Math.floor(put)} units at ${name} and turns back.`;
  }
  f.phase = 'waiting';
  f.leg = null;
  f.retryAt = state.time + TRANSPORT.retryMinutes * MS_PER_MINUTE;
  return `Fleet ${f.id} waits in the orbit of ${name}: the warehouse is full (${Math.floor(total(f.cargo))} units left).`;
}

/** Settles a free planet with the fleet's colonizer (spec 10.5). */
function colonize(state: GameState, f: Fleet, where: PlanetId): string {
  const name = state.world.galaxy.planets[where]?.name ?? where;
  const p = createPlanetState(where, f.owner, state.time, CORE.residents);
  p.buildings.push({ uid: p.nextUid++, kind: 'housing', level: 1, slot: 0 });
  state.planets[where] = p;
  discover(state, f.owner, state.world.galaxy.planets[where]?.system ?? -1);
  // The colonizer is used up; its crew are the settlers (owner 4.11.2026, question 36).
  releaseAway(state, f);
  const rest: UnitCounts = { ...f.units, colonizer: (f.units.colonizer ?? 0) - 1 };
  if (!rest.colonizer) delete rest.colonizer;
  landUnits(p, rest);
  delete state.fleets[f.id];
  return `Fleet ${f.id} founded a colony on ${name}.`;
}

/** What happens when a fleet's leg ends (called with the destination and home planets settled). */
export function arriveFleet(state: GameState, id: string): string | null {
  const f = state.fleets[id];
  if (!f?.leg) return null;
  const galaxy = state.world.galaxy;
  const where = f.leg.to;
  const name = galaxy.planets[where]?.name ?? where;
  const own = state.planets[where]?.owner === f.owner ? state.planets[where] : undefined;
  const targetOwner = state.planets[where]?.owner;
  const ally = targetOwner !== undefined && allied(state, targetOwner, f.owner);
  if (f.phase === 'out' && f.mission === 'defend') {
    if (ally && !own) {
      f.phase = 'stationed';
      f.leg = null;
      return `Fleet ${f.id} is stationed at ${name} to defend your ally.`;
    }
    turnHome(state, f, where);
    return `Fleet ${f.id} cannot defend ${name} (no longer an ally) and turns back.`;
  }
  if (f.phase === 'out' && f.mission === 'scan') {
    // A probe discovers the system and scans its planets (spec 13), then comes back.
    scanSystem(state, f.owner, galaxy.planets[where]?.system ?? -1);
    turnHome(state, f, where);
    return `Fleet ${f.id} scanned the ${galaxy.systems[galaxy.planets[where]?.system ?? -1]?.name ?? ''} system and turns back.`;
  }
  if (f.phase === 'out' && f.mission === 'return') {
    // The fuel for the way back was paid at the start (attacks and raids: phase 2).
    turnHome(state, f, where);
    return `Fleet ${f.id} reached ${name} and turns back.`;
  }
  if (f.phase === 'out' && f.mission === 'transport') {
    if (ally) return unloadTransport(state, f, state.planets[where] as PlanetState);
    turnHome(state, f, where);
    return `Fleet ${f.id} cannot unload at ${name} and turns back.`;
  }
  if (
    f.phase === 'out' &&
    f.mission === 'colonize' &&
    (f.units.colonizer ?? 0) > 0 &&
    colonizeProblem(state, f.owner, where).ok
  )
    return colonize(state, f, where);
  if (own) {
    const lost = land(state, f, own);
    return `Fleet ${f.id} landed at ${name}.${lost}`;
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
