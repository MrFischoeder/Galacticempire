import { createQueue, type EventQueue } from './queue';
import { hashString, type RngState } from './rng';
import type { GameEvent } from './events';
import type { RaceId } from '../config/races';
import type { TechId } from '../config/techs';
import { generateGalaxy, type GalaxyOptions } from '../galaxy/generate';
import type { Galaxy, PlanetId } from '../galaxy/types';
import type { PlanetState } from '../economy/planet';
import type { Fleet } from '../fleet/fleet';
import type { Alert, ScanReport } from '../intel/intel';
import type { Route } from '../fleet/routes';
import type { Alliance, Pact } from '../diplomacy/diplomacy';

/** Bump when the shape of GameState changes (saves are migrated by version). */
export const STATE_VERSION = 16;

export type PlayerId = string;

export interface Player {
  readonly id: PlayerId;
  name: string;
  /** Race (spec 3); absent = no race modifiers (tests, debug). */
  readonly race?: RaceId;
  /** Researched technology levels (spec 9.3); they belong to the player, not a planet. */
  techs: Partial<Record<TechId, number>>;
  /** Systems discovered (game time), spec 13: by owning a planet there or by a probe. */
  known: Record<number, number>;
  /** Probe scans of planets (spec 13). */
  scans: Record<PlanetId, ScanReport>;
  /** Warnings of fleets heading for the player's planets (spec 13). */
  alerts: Alert[];
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
  /** The player it concerns; absent = everyone (spec 13: each player sees only their own). */
  readonly who?: PlayerId;
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
  /** Fleets in flight (spec 12.1); units at their owner's planets are in the planet state. */
  fleets: Record<string, Fleet>;
  /** Next fleet number. */
  nextFleet: number;
  /** Recurring transport routes (spec 12.2). */
  routes: Record<string, Route>;
  nextRoute: number;
  /** Alliances (spec 16) and non-aggression pacts (question 34), with pending pact offers. */
  alliances: Record<string, Alliance>;
  nextAlliance: number;
  pacts: Record<string, Pact>;
  pactOffers: Record<
    string,
    { readonly from: PlayerId; readonly to: PlayerId; readonly at: number }
  >;
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
    fleets: {},
    nextFleet: 1,
    routes: {},
    nextRoute: 1,
    alliances: {},
    nextAlliance: 1,
    pacts: {},
    pactOffers: {},
    rng: hashString(`${seed}\u0000events`),
    events: createQueue<GameEvent>(),
    log: [],
  };
}

/** Deep copy of plain JSON data. Used so that engine functions never mutate their input. */
export function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}
