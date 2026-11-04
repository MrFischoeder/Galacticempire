import { MS_PER_HOUR } from '../config/time';
import { galaxyPlanet, ownerContext, settleOwned } from '../economy/access';
import { nextJobHours, planetRates } from '../economy/planet';
import { arriveFleet, recallFleet, unloadTransport } from '../fleet/fleet';
import { runRoute } from '../fleet/routes';
import { warningTime } from '../intel/intel';
import { allied } from '../diplomacy/diplomacy';
import { scheduleResearchCheck } from '../economy/schedule';
import { enqueue } from './queue';
import { Rng } from './rng';
import type { GameState } from './state';

/**
 * Events processed by advanceTo at their game time. Later steps add arrivals, finished
 * buildings, battles and so on. `DebugMarker` exists for tests and the debug panel.
 */
export type GameEvent =
  | DebugMarkerEvent
  | PlanetJobsEvent
  | ResearchCheckEvent
  | FleetArrivalEvent
  | FleetRetryEvent
  | RouteTickEvent
  | FleetWarningEvent
  | PactEndsEvent;

/** A broken non-aggression pact ends (12 h after it was broken, question 34). */
export interface PactEndsEvent {
  readonly type: 'PactEnds';
  readonly key: string;
  readonly at: number;
}

/** A fleet heading for a player's planet enters the range of their scanners (spec 13). */
export interface FleetWarningEvent {
  readonly type: 'FleetWarning';
  readonly fleetId: string;
  readonly player: string;
  /** Identifies the leg the warning is about. */
  readonly arriveAt: number;
}

/** A transport waiting at a full warehouse tries to unload again (spec 12.2). */
export interface FleetRetryEvent {
  readonly type: 'FleetRetry';
  readonly fleetId: string;
  readonly at: number;
}

/** A recurring route runs (spec 12.2). */
export interface RouteTickEvent {
  readonly type: 'RouteTick';
  readonly routeId: string;
  readonly at: number;
}

/** A fleet reaches the end of its leg (spec 12.1). */
export interface FleetArrivalEvent {
  readonly type: 'FleetArrival';
  readonly fleetId: string;
  /** Identifies the leg: a recalled fleet leaves a stale event that does nothing. */
  readonly arriveAt: number;
}

/** Look at a research job: finish it, or check again at its new expected end (spec 9.3). */
export interface ResearchCheckEvent {
  readonly type: 'ResearchCheck';
  readonly planetId: string;
  readonly jobId: string;
}

/**
 * Look at a planet's construction and shipyard (owner 4.11.2026: energy and crews set their
 * pace, so they finish while the planet is settled). Re-scheduled at the expected end.
 */
export interface PlanetJobsEvent {
  readonly type: 'PlanetJobs';
  readonly planetId: string;
}

export interface DebugMarkerEvent {
  readonly type: 'DebugMarker';
  readonly label: string;
  /** If set, the handler draws a number 1..roll from the state's generator (determinism tests). */
  readonly roll?: number;
  /** If set, schedules another marker this many ms later (chained events). */
  readonly repeatEvery?: number;
  readonly repeatTimes?: number;
}

type Handler<E extends GameEvent> = (state: GameState, event: E) => void;
type Handlers = { [K in GameEvent['type']]: Handler<Extract<GameEvent, { type: K }>> };

/** Event handlers mutate the (already cloned) state passed in by advanceTo. */
export const EVENT_HANDLERS: Handlers = {
  ResearchCheck(state, event) {
    const job = state.planets[event.planetId]?.research.find((j) => j.id === event.jobId);
    if (!job || job.checkAt !== state.time) return; // finished, cancelled or a stale check
    settleOwned(state, event.planetId); // finishes the job if it is done
    if (state.planets[event.planetId]?.research.some((j) => j.id === event.jobId)) {
      scheduleResearchCheck(state, event.planetId, event.jobId);
    }
  },
  PlanetJobs(state, event) {
    const p = state.planets[event.planetId];
    if (!p || p.checkAt !== state.time) return; // stale check
    settleOwned(state, event.planetId); // finishes what is done and logs it
    schedulePlanetJobs(state, event.planetId);
  },
  FleetArrival(state, event) {
    const f = state.fleets[event.fleetId];
    if (!f?.leg || f.leg.arriveAt !== event.arriveAt) return;
    settleOwned(state, f.leg.to);
    settleOwned(state, f.origin); // its crews' upkeep stops there when they land
    const text = arriveFleet(state, f.id);
    if (text) state.log.push({ at: state.time, who: f.owner, text });
    scheduleFleet(state, f.id);
  },
  FleetRetry(state, event) {
    const f = state.fleets[event.fleetId];
    if (!f || f.phase !== 'waiting' || f.retryAt !== event.at) return;
    const p = settleOwned(state, f.target);
    let text: string;
    if (p && p.owner === f.owner) text = unloadTransport(state, f, p);
    else {
      recallFleet(state, f.id);
      text = `Fleet ${f.id} cannot unload any more and turns back.`;
    }
    // Only log when something changed (a full warehouse retries quietly).
    if (f.phase !== 'waiting' || !text.includes('waits'))
      state.log.push({ at: state.time, who: f.owner, text });
    scheduleFleet(state, f.id);
  },
  RouteTick(state, event) {
    const r = state.routes[event.routeId];
    if (!r || r.nextAt !== event.at) return;
    const p = settleOwned(state, r.from);
    const text = runRoute(state, r, p ? ownerContext(state, p) : {});
    const name = (id: string) => state.world.galaxy.planets[id]?.name ?? id;
    state.log.push({
      at: state.time,
      who: r.owner,
      text: `Route ${name(r.from)} → ${name(r.to)}: ${text.replace(/\.$/, '')}.`,
    });
    for (const f of Object.values(state.fleets))
      if (f.route === r.id && f.leg?.departAt === state.time) scheduleFleet(state, f.id);
    scheduleEvent(state, r.nextAt, { type: 'RouteTick', routeId: r.id, at: r.nextAt });
  },
  FleetWarning(state, event) {
    const f = state.fleets[event.fleetId];
    const p = state.players[event.player];
    if (!f?.leg || f.leg.arriveAt !== event.arriveAt || !p) return;
    if (state.planets[f.leg.to]?.owner !== event.player) return;
    p.alerts.push({
      at: state.time,
      fleetId: f.id,
      owner: f.owner,
      target: f.leg.to,
      arriveAt: f.leg.arriveAt,
      units: { ...f.units },
    });
    if (p.alerts.length > 50) p.alerts.splice(0, p.alerts.length - 50);
    const name = state.world.galaxy.planets[f.leg.to]?.name ?? f.leg.to;
    const who = state.players[f.owner]?.name ?? f.owner;
    state.log.push({
      at: state.time,
      who: event.player,
      text: `WARNING: a fleet of ${who} heads for ${name}, arriving in ${Math.round((f.leg.arriveAt - state.time) / 60000)} min.`,
    });
  },
  PactEnds(state, event) {
    const p = state.pacts[event.key];
    if (!p || p.breakAt !== event.at) return;
    delete state.pacts[event.key];
    for (const who of [p.a, p.b])
      state.log.push({ at: state.time, who, text: 'The non-aggression pact has ended.' });
  },
  DebugMarker(state, event) {
    let text = `Marker: ${event.label}`;
    if (event.roll !== undefined) {
      const rng = new Rng(state.rng);
      text += ` (roll ${rng.int(1, event.roll)})`;
      state.rng = rng.state;
    }
    state.log.push({ at: state.time, text });
    if (event.repeatEvery !== undefined && (event.repeatTimes ?? 0) > 0) {
      scheduleEvent(state, state.time + event.repeatEvery, {
        ...event,
        repeatTimes: (event.repeatTimes ?? 0) - 1,
      });
    }
  },
};

/** Schedules an event. Events cannot be placed in the past. */
export function scheduleEvent(state: GameState, at: number, event: GameEvent): void {
  if (at < state.time) {
    throw new RangeError(`Event ${event.type} scheduled in the past (${at} < ${state.time})`);
  }
  enqueue(state.events, at, event);
}

/** Schedules the arrival of a fleet's current leg (if it is flying). */
export function scheduleFleet(state: GameState, fleetId: string): void {
  const f = state.fleets[fleetId];
  if (f?.phase === 'waiting' && f.retryAt !== undefined) {
    scheduleEvent(state, f.retryAt, { type: 'FleetRetry', fleetId, at: f.retryAt });
    return;
  }
  const leg = f?.leg;
  // Defenders whose planet the fleet flies to are warned when it enters their scanners' range.
  const defender = leg ? state.planets[leg.to]?.owner : undefined;
  if (f && leg && defender && !allied(state, defender, f.owner)) {
    const t = warningTime(state, leg, defender);
    if (t !== null)
      scheduleEvent(state, Math.max(state.time, t), {
        type: 'FleetWarning',
        fleetId,
        player: defender,
        arriveAt: leg.arriveAt,
      });
  }
  if (leg)
    scheduleEvent(state, leg.arriveAt, { type: 'FleetArrival', fleetId, arriveAt: leg.arriveAt });
}

/**
 * Schedules the next check of a planet's jobs (the planet must be settled to now): at the
 * expected end at today's pace, or in an hour while they are stalled.
 */
export function schedulePlanetJobs(state: GameState, planetId: string): void {
  const p = state.planets[planetId];
  if (!p) return;
  if (!p.construction && p.shipyard.length === 0) {
    delete p.checkAt;
    return;
  }
  const rates = planetRates(p, galaxyPlanet(state, planetId), ownerContext(state, p));
  const h = nextJobHours(p, rates);
  const at =
    state.time + (Number.isFinite(h) ? Math.max(1, Math.ceil(h * MS_PER_HOUR)) : MS_PER_HOUR);
  p.checkAt = at;
  scheduleEvent(state, at, { type: 'PlanetJobs', planetId });
}
