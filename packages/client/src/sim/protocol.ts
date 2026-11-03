import type { Command, Galaxy, GameState, Result } from '@ge/shared';

/** Messages between the page and the simulation worker (step 1.7). */
export type ToWorker =
  | { readonly type: 'newGame'; readonly seed: string; readonly systems: number }
  | {
      readonly type: 'command';
      readonly id: number;
      readonly command: Command;
      readonly time: number;
    };

export type FromWorker =
  | {
      readonly type: 'world';
      readonly seed: string;
      readonly galaxy: Galaxy;
      readonly time: number;
    }
  | { readonly type: 'result'; readonly id: number; readonly result: Result; readonly time: number }
  | { readonly type: 'error'; readonly message: string };

export interface WorkerState {
  game: GameState | null;
}
