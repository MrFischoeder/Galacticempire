import { BUILDINGS, type BuildingId } from '../config/buildings';
import type { MinedResource, ResourceAmounts, ResourceId } from '../config/resources';
import { settleOwned } from '../economy/access';
import { createPlanetState, resourceCapacity, STORED_RESOURCES } from '../economy/planet';
import { scheduleEvent } from './events';
import { fail, OK, type Result } from './result';
import type { GameState, PlayerId } from './state';

/**
 * Commands are the only way players and the AI change the state (spec 23.3). Each command
 * has a validator (no side effects) and an apply step (mutates an already cloned state).
 */
export type Command =
  | AddPlayerCommand
  | RenamePlayerCommand
  | DebugScheduleMarkerCommand
  | DebugGivePlanetCommand
  | DebugSetBuildingCommand
  | DebugAddResourcesCommand;

/** Debug only: makes a player the owner of a free planet (proper start positions: step 4.2). */
export interface DebugGivePlanetCommand {
  readonly type: 'DebugGivePlanet';
  readonly playerId: PlayerId;
  readonly planetId: string;
}

/**
 * Debug only: sets a building to a level (0 removes it). Building and upgrading for real
 * comes in step 1.5. `nth` picks which of several buildings of a kind (default the first).
 */
export interface DebugSetBuildingCommand {
  readonly type: 'DebugSetBuilding';
  readonly planetId: string;
  readonly kind: BuildingId;
  readonly level: number;
  readonly deposit?: MinedResource;
  readonly nth?: number;
}

/** Debug only: adds resources to a planet's stores (up to the capacity). */
export interface DebugAddResourcesCommand {
  readonly type: 'DebugAddResources';
  readonly planetId: string;
  readonly amounts: ResourceAmounts;
}

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
  DebugGivePlanet: {
    validate(state, c) {
      if (!state.players[c.playerId]) return fail('NO_PLAYER', 'Nie ma takiego gracza.');
      if (!state.world.galaxy.planets[c.planetId])
        return fail('NO_PLANET', 'Nie ma takiej planety.');
      if (state.planets[c.planetId]) return fail('PLANET_TAKEN', 'Ta planeta ma już właściciela.');
      return OK;
    },
    apply(state, c) {
      state.planets[c.planetId] = createPlanetState(c.planetId, c.playerId, state.time);
    },
  },
  DebugSetBuilding: {
    validate(state, c) {
      const p = state.planets[c.planetId];
      if (!p) return fail('NOT_OWNED', 'Ta planeta nie należy do nikogo.');
      const spec = BUILDINGS[c.kind];
      if (!spec) return fail('NO_BUILDING', 'Nie ma takiego budynku.');
      if (!Number.isInteger(c.level) || c.level < 0 || c.level > spec.maxLevel) {
        return fail('BAD_LEVEL', `Poziom musi być od 0 do ${spec.maxLevel}.`);
      }
      if (spec.effect.kind === 'mine') {
        const planet = state.world.galaxy.planets[c.planetId];
        if (!c.deposit || !planet?.deposits.some((d) => d.resource === c.deposit)) {
          return fail('NO_DEPOSIT', 'Kopalnia musi stać na złożu tej planety.');
        }
      }
      return OK;
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      const existing = findBuilding(state, c);
      if (c.level === 0) {
        if (existing) p.buildings.splice(p.buildings.indexOf(existing), 1);
      } else if (existing) {
        existing.level = c.level;
      } else {
        p.buildings.push({
          kind: c.kind,
          level: c.level,
          ...(c.deposit ? { deposit: c.deposit } : {}),
        });
      }
      // Lowering a warehouse can shrink the capacity below the stock.
      const cap = resourceCapacity(p);
      for (const r of STORED_RESOURCES) if ((p.stock[r] ?? 0) > cap) p.stock[r] = cap;
    },
  },
  DebugAddResources: {
    validate(state, c) {
      if (!state.planets[c.planetId]) return fail('NOT_OWNED', 'Ta planeta nie należy do nikogo.');
      for (const [r, n] of Object.entries(c.amounts)) {
        if (!(STORED_RESOURCES as readonly string[]).includes(r)) {
          return fail('BAD_RESOURCE', 'Tego zasobu nie da się przechowywać w magazynie.');
        }
        if (!Number.isFinite(n) || n < 0)
          return fail('BAD_AMOUNT', 'Ilość musi być liczbą nieujemną.');
      }
      return OK;
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      const cap = resourceCapacity(p);
      for (const [r, n] of Object.entries(c.amounts) as [ResourceId, number][]) {
        p.stock[r] = Math.min(cap, (p.stock[r] ?? 0) + n);
      }
    },
  },
};

function findBuilding(state: Readonly<GameState>, c: DebugSetBuildingCommand) {
  const p = state.planets[c.planetId];
  const same = p?.buildings.filter((b) => b.kind === c.kind && b.deposit === c.deposit) ?? [];
  return same[(c.nth ?? 1) - 1];
}

export function validateCommand(state: Readonly<GameState>, command: Command): Result {
  const spec = COMMANDS[command.type] as CommandSpec<Command> | undefined;
  if (!spec) return fail('UNKNOWN_COMMAND', 'Nieznane polecenie.');
  return spec.validate(state, command);
}

export function applyValidated(state: GameState, command: Command): void {
  (COMMANDS[command.type] as CommandSpec<Command>).apply(state, command);
}
