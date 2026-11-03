import { BUILDINGS } from '../config/buildings';
import { settleOwned } from '../economy/access';
import { finishConstruction } from '../economy/construction';
import { enqueue } from './queue';
import { Rng } from './rng';
import type { GameState } from './state';

/**
 * Events processed by advanceTo at their game time. Later steps add arrivals, finished
 * buildings, battles and so on. `DebugMarker` exists for tests and the debug panel.
 */
export type GameEvent = DebugMarkerEvent | ConstructionDoneEvent;

/** A building or an upgrade finishes (spec 9). */
export interface ConstructionDoneEvent {
  readonly type: 'ConstructionDone';
  readonly planetId: string;
  /** Identifies the construction: a cancelled one leaves a stale event that does nothing. */
  readonly startedAt: number;
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
  ConstructionDone(state, event) {
    const p = settleOwned(state, event.planetId);
    const c = p?.construction;
    if (!p || !c || c.startedAt !== event.startedAt) return;
    const b = finishConstruction(p);
    if (b) {
      const name = state.world.galaxy.planets[event.planetId]?.name ?? event.planetId;
      state.log.push({
        at: state.time,
        text: `${name}: ${BUILDINGS[b.kind].name} poziom ${b.level} gotowy.`,
      });
    }
  },
  DebugMarker(state, event) {
    let text = `Znacznik: ${event.label}`;
    if (event.roll !== undefined) {
      const rng = new Rng(state.rng);
      text += ` (rzut ${rng.int(1, event.roll)})`;
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
