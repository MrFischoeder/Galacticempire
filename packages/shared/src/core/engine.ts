import { applyValidated, validateCommand, type Command } from './commands';
import { EVENT_HANDLERS, type GameEvent } from './events';
import { dequeue, peek } from './queue';
import { fail, type Result } from './result';
import { cloneState, type GameState } from './state';

/** Safety net against an event that keeps scheduling itself at the same time forever. */
const MAX_EVENTS_PER_ADVANCE = 1_000_000;

function runEvent(state: GameState, event: GameEvent): void {
  const handler = EVENT_HANDLERS[event.type] as (s: GameState, e: GameEvent) => void;
  handler(state, event);
}

/** Processes every event due up to `time` on a state that may be mutated. */
function advanceInPlace(state: GameState, time: number): void {
  let processed = 0;
  for (let next = peek(state.events); next && next.at <= time; next = peek(state.events)) {
    dequeue(state.events);
    state.time = next.at;
    runEvent(state, next.event);
    if (++processed > MAX_EVENTS_PER_ADVANCE) {
      throw new Error('Too many events in one advance (an event keeps rescheduling itself?)');
    }
  }
  state.time = time;
}

/**
 * Returns the state at game time `time`: every event due by then is processed in time order
 * (equal times in the order they were scheduled). Never mutates the input.
 */
export function advanceTo(state: GameState, time: number): GameState {
  if (!Number.isFinite(time)) throw new RangeError(`Bad game time ${time}`);
  if (time < state.time) throw new RangeError(`Cannot go back in time (${time} < ${state.time})`);
  const next = cloneState(state);
  advanceInPlace(next, time);
  return next;
}

export interface CommandOutcome {
  readonly state: GameState;
  readonly result: Result;
}

/**
 * Applies a command at game time `time`: first the state is advanced to that time, then the
 * command is validated and applied. A rejected command leaves the state as it was (but
 * advanced to `time`). Never mutates the input.
 */
export function applyCommand(state: GameState, command: Command, time: number): CommandOutcome {
  if (!Number.isFinite(time) || time < state.time) {
    return {
      state,
      result: fail('TIME_IN_PAST', 'Polecenie z czasem wcześniejszym niż czas gry.'),
    };
  }
  const next = cloneState(state);
  advanceInPlace(next, time);
  const result = validateCommand(next, command);
  if (result.ok) applyValidated(next, command);
  return { state: next, result };
}

/** A command stamped with the game time it was issued at (for replays and saves). */
export interface TimedCommand {
  readonly at: number;
  readonly command: Command;
}

/** Replays commands in order and advances to `until`. Results are returned for inspection. */
export function replay(
  initial: GameState,
  commands: readonly TimedCommand[],
  until: number,
): { state: GameState; results: Result[] } {
  let state = initial;
  const results: Result[] = [];
  for (const { at, command } of commands) {
    const out = applyCommand(state, command, at);
    state = out.state;
    results.push(out.result);
  }
  return { state: advanceTo(state, Math.max(until, state.time)), results };
}
