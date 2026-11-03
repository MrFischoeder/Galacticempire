import { scheduleEvent } from './events';
import { fail, OK, type Result } from './result';
import type { GameState, PlayerId } from './state';

/**
 * Commands are the only way players and the AI change the state (spec 23.3). Each command
 * has a validator (no side effects) and an apply step (mutates an already cloned state).
 */
export type Command = AddPlayerCommand | RenamePlayerCommand | DebugScheduleMarkerCommand;

export interface AddPlayerCommand {
  readonly type: 'AddPlayer';
  readonly playerId: PlayerId;
  readonly name: string;
}

export interface RenamePlayerCommand {
  readonly type: 'RenamePlayer';
  readonly playerId: PlayerId;
  readonly name: string;
}

/** Debug only: schedules a DebugMarker event `delay` ms from now. */
export interface DebugScheduleMarkerCommand {
  readonly type: 'DebugScheduleMarker';
  readonly delay: number;
  readonly label: string;
  readonly roll?: number;
  readonly repeatEvery?: number;
  readonly repeatTimes?: number;
}

const NAME_MAX = 24;

function checkName(name: string): Result {
  const trimmed = name.trim();
  if (trimmed.length === 0) return fail('NAME_EMPTY', 'Nazwa nie może być pusta.');
  if (trimmed.length > NAME_MAX) {
    return fail('NAME_TOO_LONG', `Nazwa może mieć najwyżej ${NAME_MAX} znaki.`);
  }
  return OK;
}

interface CommandSpec<C extends Command> {
  validate(state: Readonly<GameState>, command: C): Result;
  apply(state: GameState, command: C): void;
}
type Specs = { [K in Command['type']]: CommandSpec<Extract<Command, { type: K }>> };

export const COMMANDS: Specs = {
  AddPlayer: {
    validate(state, c) {
      if (state.players[c.playerId]) {
        return fail('PLAYER_EXISTS', 'Gracz o tym identyfikatorze już istnieje.');
      }
      return checkName(c.name);
    },
    apply(state, c) {
      state.players[c.playerId] = { id: c.playerId, name: c.name.trim() };
    },
  },
  RenamePlayer: {
    validate(state, c) {
      if (!state.players[c.playerId]) return fail('NO_PLAYER', 'Nie ma takiego gracza.');
      return checkName(c.name);
    },
    apply(state, c) {
      const player = state.players[c.playerId];
      if (player) player.name = c.name.trim();
    },
  },
  DebugScheduleMarker: {
    validate(_state, c) {
      if (!Number.isFinite(c.delay) || c.delay < 0) {
        return fail('BAD_DELAY', 'Opóźnienie musi być liczbą nieujemną.');
      }
      if (c.roll !== undefined && (!Number.isInteger(c.roll) || c.roll < 1)) {
        return fail('BAD_ROLL', 'Rzut musi być dodatnią liczbą całkowitą.');
      }
      if (c.repeatEvery !== undefined && !(c.repeatEvery > 0)) {
        return fail('BAD_REPEAT', 'Odstęp powtórzeń musi być dodatni.');
      }
      return OK;
    },
    apply(state, c) {
      scheduleEvent(state, state.time + c.delay, {
        type: 'DebugMarker',
        label: c.label,
        ...(c.roll !== undefined ? { roll: c.roll } : {}),
        ...(c.repeatEvery !== undefined ? { repeatEvery: c.repeatEvery } : {}),
        ...(c.repeatTimes !== undefined ? { repeatTimes: c.repeatTimes } : {}),
      });
    },
  },
};

export function validateCommand(state: Readonly<GameState>, command: Command): Result {
  const spec = COMMANDS[command.type] as CommandSpec<Command> | undefined;
  if (!spec) return fail('UNKNOWN_COMMAND', 'Nieznane polecenie.');
  return spec.validate(state, command);
}

export function applyValidated(state: GameState, command: Command): void {
  (COMMANDS[command.type] as CommandSpec<Command>).apply(state, command);
}
