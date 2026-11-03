import type {
  Command,
  Deposit,
  Fleet,
  Galaxy,
  GameClock,
  GameState,
  LogEntry,
  Planet,
  PlanetRates,
  PlanetState,
  Player,
  RaceId,
  Result,
  TimeMultiplier,
} from '@ge/shared';

/** Messages between the page and the simulation worker (steps 1.7-1.8). */
export type ToWorker =
  | {
      readonly type: 'newGame';
      readonly seed: string;
      readonly systems: number;
      readonly race: RaceId;
    }
  | { readonly type: 'command'; readonly id: number; readonly command: Command }
  | { readonly type: 'speed'; readonly multiplier: TimeMultiplier }
  | { readonly type: 'pause'; readonly paused: boolean }
  /** Debug: move the game clock forward. */
  | { readonly type: 'skip'; readonly hours: number }
  /** Real time passed (sent by the worker's own timer; separate so it can be tested). */
  | { readonly type: 'tick'; readonly realMs: number };

/** An owned planet as of the snapshot time (settled copy) with its rates. */
export interface PlanetView {
  readonly planet: PlanetState;
  readonly info: Planet;
  readonly deposits: Deposit[];
  readonly rates: PlanetRates;
}

/** What the page needs to draw (the page never changes the game state). */
export interface Snapshot {
  readonly time: number;
  readonly multiplier: TimeMultiplier;
  readonly paused: boolean;
  readonly player: Player;
  readonly planets: PlanetView[];
  readonly log: LogEntry[];
  /** The player's fleets away from their planets. */
  readonly fleets: Fleet[];
}

export type FromWorker =
  | {
      readonly type: 'world';
      readonly seed: string;
      readonly galaxy: Galaxy;
      readonly playerId: string;
      readonly homePlanet: string;
    }
  | { readonly type: 'snapshot'; readonly snapshot: Snapshot }
  | { readonly type: 'result'; readonly id: number; readonly result: Result }
  | { readonly type: 'error'; readonly message: string };

export interface WorkerState {
  game: GameState | null;
  clock: GameClock;
  playerId: string;
}
