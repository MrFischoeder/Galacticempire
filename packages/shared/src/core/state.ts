import { createQueue, type EventQueue } from './queue';
import { hashString, type RngState } from './rng';
import type { GameEvent } from './events';
import type { RaceId } from '../config/races';
import type { TechId } from '../config/techs';
import { generateGalaxy, type GalaxyOptions } from '../galaxy/generate';
import type { Galaxy, PlanetId } from '../galaxy/types';
import type { PlanetState } from '../economy/planet';

/** Bump when the shape of GameState changes (saves are migrated by version). */
export const STATE_VERSION = 7;

export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  name: string;
  /** Race (spec 3); absent = no race modifiers (tests, debug). */
  readonly race?: RaceId;
  /** Researched technology levels (spec 9.3); they belong to the player, not a planet. */
  techs: Partial<Record<TechId, number>>;
}

/** The generated world. Planets change during the game (owners, buildings, deposits). */
export interface World {
  readonly seed: string;
  galaxy: Galaxy;
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
  /** Owned planets and their economy (settled lazily, see economy/planet.ts). */
  planets: Record<PlanetId, PlanetState>;
  /** State of the general-purpose generator for events (separate streams use rngStream). */
  rng: RngState;
  events: EventQueue<GameEvent>;
  log: LogEntry[];
}

export function createGameState(seed: string, galaxy: GalaxyOptions = {}): GameState {
  return {
    version: STATE_VERSION,
    time: 0,
    world: { seed, galaxy: generateGalaxy(seed, galaxy) },
    players: {},
    planets: {},
    rng: hashString(`${seed}\u0000events`),
    events: createQueue<GameEvent>(),
    log: [],
  };
}

/** Deep copy of plain JSON data. Used so that engine functions never mutate their input. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
