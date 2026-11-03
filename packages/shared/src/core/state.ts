import { createQueue, type EventQueue } from './queue';
import { hashString, type RngState } from './rng';
import type { GameEvent } from './events';

/** Bump when the shape of GameState changes (saves are migrated by version). */
export const STATE_VERSION = 1;

export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  name: string;
}

/** Placeholder for galaxy, systems and planets (step 1.3 onwards). */
export interface World {
  readonly seed: string;
}

/** One line of the event log: what happened at which game time. */
export interface LogEntry {
  readonly at: number;
  readonly text: string;
}

/**
 * The whole simulation state. Plain JSON data only (no classes, no functions), so it can be
 * saved, sent to a Web Worker or a server, and compared in tests.
 */
export interface GameState {
  readonly version: number;
  /** Current game time in ms. Only advanceTo moves it forward. */
  time: number;
  world: World;
  players: Record<PlayerId, Player>;
  /** State of the general-purpose generator for events (separate streams use rngStream). */
  rng: RngState;
  events: EventQueue<GameEvent>;
  log: LogEntry[];
}

export function createGameState(seed: string): GameState {
  return {
    version: STATE_VERSION,
    time: 0,
    world: { seed },
    players: {},
    rng: hashString(`${seed}\u0000events`),
    events: createQueue<GameEvent>(),
    log: [],
  };
}

/** Deep copy of plain JSON data. Used so that engine functions never mutate their input. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
