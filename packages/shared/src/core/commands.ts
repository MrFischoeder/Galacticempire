import { BUILDINGS, type BuildingId } from '../config/buildings';
import { RACES, type RaceId } from '../config/races';
import type { TechId } from '../config/techs';
import { canStartResearch, finalizeResearch, startResearch } from '../economy/research';
import { scheduleResearchCheck } from '../economy/schedule';
import type { MinedResource, ResourceAmounts, ResourceId } from '../config/resources';
import { galaxyPlanet, ownerContext, settleOwned } from '../economy/access';
import {
  canStartBuilding,
  canStartUpgrade,
  cancelConstruction,
  startConstruction,
} from '../economy/construction';
import { createPlanetState, resourceCapacity, STORED_RESOURCES } from '../economy/planet';
import { scheduleEvent } from './events';
import { fail, OK, type Result } from './result';
import type { GameState, PlayerId } from './state';

/**
 * Commands are the only way players and the AI change the state (spec 23.3). Each command
 * has a validator (no side effects) and an apply step (mutates an already cloned state).
 */
export type Command =
  | StartResearchCommand
  | StartBuildingCommand
  | StartUpgradeCommand
  | CancelConstructionCommand
  | AddPlayerCommand
  | RenamePlayerCommand
  | DebugScheduleMarkerCommand
  | DebugGivePlanetCommand
  | DebugSetBuildingCommand
  | DebugAddResourcesCommand;

/** Research the next level of a technology in a planet's laboratory (spec 9.3). */
export interface StartResearchCommand {
  readonly type: 'StartResearch';
  readonly playerId: PlayerId;
  readonly planetId: string;
  readonly tech: TechId;
}

/** Put up a new building (level 1) on an owned planet (spec 9). */
export interface StartBuildingCommand {
  readonly type: 'StartBuilding';
  readonly playerId: PlayerId;
  readonly planetId: string;
  readonly kind: BuildingId;
  /** For a mine: the deposit it works. */
  readonly deposit?: MinedResource;
}

/** Raise a building one level (spec 9). */
export interface StartUpgradeCommand {
  readonly type: 'StartUpgrade';
  readonly playerId: PlayerId;
  readonly planetId: string;
  readonly uid: number;
}

/** Stop the construction going on; part of the cost comes back (CANCEL_REFUND). */
export interface CancelConstructionCommand {
  readonly type: 'CancelConstruction';
  readonly playerId: PlayerId;
  readonly planetId: string;
}

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
  readonly race?: RaceId;
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
  if (trimmed.length === 0) return fail('NAME_EMPTY', 'The name cannot be empty.');
  if (trimmed.length > NAME_MAX) {
    return fail('NAME_TOO_LONG', `The name can have at most ${NAME_MAX} characters.`);
  }
  return OK;
}

interface CommandSpec<C extends Command> {
  validate(state: Readonly<GameState>, command: C): Result;
  apply(state: GameState, command: C): void;
}
type Specs = { [K in Command['type']]: CommandSpec<Extract<Command, { type: K }>> };

/** The planet must exist, be owned by the player; it is settled to now (validation reads it). */
function ownedBy(state: Readonly<GameState>, playerId: PlayerId, planetId: string): Result {
  const p = state.planets[planetId];
  if (!p) return fail('NOT_OWNED', 'This planet has no owner.');
  if (p.owner !== playerId) return fail('NOT_YOURS', 'This is not your planet.');
  return OK;
}

/** Validation reads the stores, so it works on a settled copy (validate must not mutate). */
function settledCopy(state: Readonly<GameState>, planetId: string): GameState {
  const copy = JSON.parse(JSON.stringify(state)) as GameState;
  settleOwned(copy, planetId);
  return copy;
}

function schedule(state: GameState, planetId: string): void {
  const c = state.planets[planetId]?.construction;
  if (c)
    scheduleEvent(state, c.endsAt, { type: 'ConstructionDone', planetId, startedAt: c.startedAt });
}

export const COMMANDS: Specs = {
  StartResearch: {
    validate(state, c) {
      if (!state.players[c.playerId]) return fail('NO_PLAYER', 'No such player.');
      if (!state.planets[c.planetId]) return fail('NOT_OWNED', 'This planet has no owner.');
      // Jobs that have just finished are counted as done (settled copy).
      return canStartResearch(settledCopy(state, c.planetId), c.playerId, c.planetId, c.tech);
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      const job = startResearch(
        state,
        c.playerId,
        c.planetId,
        c.tech,
        state.time,
        ownerContext(state, p),
      );
      scheduleResearchCheck(state, c.planetId, job.id);
    },
  },
  StartBuilding: {
    validate(state, c) {
      const own = ownedBy(state, c.playerId, c.planetId);
      if (!own.ok) return own;
      const s = settledCopy(state, c.planetId);
      const p = s.planets[c.planetId] as NonNullable<GameState['planets'][string]>;
      return canStartBuilding(
        p,
        galaxyPlanet(s, c.planetId),
        c.kind,
        c.deposit,
        ownerContext(s, p),
      );
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      startConstruction(
        p,
        { kind: c.kind, ...(c.deposit ? { deposit: c.deposit } : {}) },
        state.time,
        ownerContext(state, p),
      );
      schedule(state, c.planetId);
    },
  },
  StartUpgrade: {
    validate(state, c) {
      const own = ownedBy(state, c.playerId, c.planetId);
      if (!own.ok) return own;
      const s = settledCopy(state, c.planetId);
      const p = s.planets[c.planetId] as NonNullable<GameState['planets'][string]>;
      return canStartUpgrade(p, c.uid, ownerContext(s, p));
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      const b = p?.buildings.find((x) => x.uid === c.uid);
      if (!p || !b) return;
      startConstruction(p, { kind: b.kind, uid: c.uid }, state.time, ownerContext(state, p));
      schedule(state, c.planetId);
    },
  },
  CancelConstruction: {
    validate(state, c) {
      const own = ownedBy(state, c.playerId, c.planetId);
      if (!own.ok) return own;
      if (!state.planets[c.planetId]?.construction)
        return fail('NOTHING_TO_CANCEL', 'Nothing is being built on this planet.');
      return OK;
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (p) cancelConstruction(p);
    },
  },
  AddPlayer: {
    validate(state, c) {
      if (state.players[c.playerId]) {
        return fail('PLAYER_EXISTS', 'A player with this id already exists.');
      }
      if (c.race !== undefined && !(c.race in RACES)) return fail('NO_RACE', 'No such race.');
      return checkName(c.name);
    },
    apply(state, c) {
      state.players[c.playerId] = {
        id: c.playerId,
        name: c.name.trim(),
        ...(c.race ? { race: c.race } : {}),
        techs: {},
      };
    },
  },
  RenamePlayer: {
    validate(state, c) {
      if (!state.players[c.playerId]) return fail('NO_PLAYER', 'No such player.');
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
        return fail('BAD_DELAY', 'The delay must be a non-negative number.');
      }
      if (c.roll !== undefined && (!Number.isInteger(c.roll) || c.roll < 1)) {
        return fail('BAD_ROLL', 'The roll must be a positive whole number.');
      }
      if (c.repeatEvery !== undefined && !(c.repeatEvery > 0)) {
        return fail('BAD_REPEAT', 'The repeat interval must be positive.');
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
      if (!state.players[c.playerId]) return fail('NO_PLAYER', 'No such player.');
      if (!state.world.galaxy.planets[c.planetId]) return fail('NO_PLANET', 'No such planet.');
      if (state.planets[c.planetId])
        return fail('PLANET_TAKEN', 'This planet already has an owner.');
      return OK;
    },
    apply(state, c) {
      state.planets[c.planetId] = createPlanetState(c.planetId, c.playerId, state.time);
    },
  },
  DebugSetBuilding: {
    validate(state, c) {
      const p = state.planets[c.planetId];
      if (!p) return fail('NOT_OWNED', 'This planet has no owner.');
      const spec = BUILDINGS[c.kind];
      if (!spec) return fail('NO_BUILDING', 'No such building.');
      if (!Number.isInteger(c.level) || c.level < 0 || c.level > spec.maxLevel) {
        return fail('BAD_LEVEL', `The level must be between 0 and ${spec.maxLevel}.`);
      }
      if (spec.effect.kind === 'mine') {
        const planet = state.world.galaxy.planets[c.planetId];
        if (!c.deposit || !planet?.deposits.some((d) => d.resource === c.deposit)) {
          return fail('NO_DEPOSIT', 'A mine must stand on a deposit of this planet.');
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
          uid: p.nextUid++,
          kind: c.kind,
          level: c.level,
          ...(c.deposit ? { deposit: c.deposit } : {}),
        });
      }
      // Lowering a warehouse can shrink the capacity below the stock.
      const cap = resourceCapacity(p);
      for (const r of STORED_RESOURCES) if ((p.stock[r] ?? 0) > cap) p.stock[r] = cap;
      // Removing the laboratory aborts its research.
      finalizeResearch(state, c.planetId);
    },
  },
  DebugAddResources: {
    validate(state, c) {
      if (!state.planets[c.planetId]) return fail('NOT_OWNED', 'This planet has no owner.');
      for (const [r, n] of Object.entries(c.amounts)) {
        if (!(STORED_RESOURCES as readonly string[]).includes(r)) {
          return fail('BAD_RESOURCE', 'This resource cannot be kept in the warehouse.');
        }
        if (!Number.isFinite(n) || n < 0)
          return fail('BAD_AMOUNT', 'The amount must be a non-negative number.');
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
  if (!spec) return fail('UNKNOWN_COMMAND', 'Unknown command.');
  return spec.validate(state, command);
}

export function applyValidated(state: GameState, command: Command): void {
  (COMMANDS[command.type] as CommandSpec<Command>).apply(state, command);
}
