import { applyCommand, createGameState } from '@ge/shared';
import type { FromWorker, ToWorker, WorkerState } from './protocol';

/**
 * The worker's logic, kept free of worker globals so it can be tested. The game state lives
 * only here; the page gets copies of what it needs to draw (the client never changes it).
 */
export function handleMessage(state: WorkerState, msg: ToWorker): FromWorker[] {
  try {
    if (msg.type === 'newGame') {
      state.game = createGameState(msg.seed, { systems: msg.systems });
      return [
        { type: 'world', seed: msg.seed, galaxy: state.game.world.galaxy, time: state.game.time },
      ];
    }
    if (!state.game) return [{ type: 'error', message: 'Brak gry.' }];
    const out = applyCommand(state.game, msg.command, msg.time);
    state.game = out.state;
    return [{ type: 'result', id: msg.id, result: out.result, time: out.state.time }];
  } catch (e) {
    return [{ type: 'error', message: e instanceof Error ? e.message : String(e) }];
  }
}
