import { MS_PER_HOUR } from '../config/time';
import { galaxyPlanet, ownerContext, settleOwned } from '../economy/access';
import { nextJobHours, planetRates } from '../economy/planet';
import { arriveFleet } from '../fleet/fleet';
import { scheduleResearchCheck } from '../economy/schedule';
import { enqueue } from './queue';
import { Rng } from './rng';
import type { GameState } from './state';

/**
 * Events processed by advanceTo at their game time. Later steps add arrivals, finished
 * buildings, battles and so on. `DebugMarker` exists for tests and the debug panel.
 */
export type GameEvent = DebugMarkerEvent | PlanetJobsEvent | ResearchCheckEvent | FleetArrivalEvent;

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
    if (text) state.log.push({ at: state.time, text });
    scheduleFleet(state, f.id);
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
  const leg = state.fleets[fleetId]?.leg;
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
