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
  firstFreeSlot,
  startConstruction,
} from '../economy/construction';
import {
  capacityOf,
  createPlanetState,
  landUnits,
  type PlanetState,
  resourceCapacity,
  STOCKED,
  STORED_RESOURCES,
} from '../economy/planet';
import { scheduleEvent, scheduleFleet, schedulePlanetJobs } from './events';
import { discover } from '../intel/intel';
import { DIPLOMACY } from '../config/diplomacy';
import {
  allianceOf,
  canAcceptAlliance,
  canCreateAlliance,
  canInvite,
  canProposePact,
  pairKey,
} from '../diplomacy/diplomacy';
import { canOrderUnits, cancelOrder, orderUnits } from '../fleet/shipyard';
import { canCreateRoute, createRoute } from '../fleet/routes';
import type { FleetMission } from '../config/fleets';
import { UNITS, type UnitId } from '../config/units';
import {
  canRecallFleet,
  canSendFleet,
  recallFleet,
  sendFleet,
  canMoveUnits,
  fitHangar,
  moveUnits,
  type UnitPlace,
  type UnitCounts,
} from '../fleet/fleet';
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
  | DebugAddResourcesCommand
  | SendFleetCommand
  | RecallFleetCommand
  | DebugAddUnitsCommand
  | MoveUnitsCommand
  | OrderUnitsCommand
  | CancelUnitOrderCommand
  | SetUpkeepPlanetCommand
  | CreateRouteCommand
  | DeleteRouteCommand
  | CreateAllianceCommand
  | InviteToAllianceCommand
  | AcceptAllianceCommand
  | LeaveAllianceCommand
  | ProposePactCommand
  | AcceptPactCommand
  | BreakPactCommand
  | DebugAddRivalCommand;

/** Debug only: a rival player on the next free start position (testing diplomacy alone). */
export interface DebugAddRivalCommand {
  readonly type: 'DebugAddRival';
  readonly playerId: PlayerId;
  readonly name: string;
}

/** Alliances (spec 16). */
export interface CreateAllianceCommand {
  readonly type: 'CreateAlliance';
  readonly playerId: PlayerId;
  readonly name: string;
}
export interface InviteToAllianceCommand {
  readonly type: 'InviteToAlliance';
  readonly playerId: PlayerId;
  readonly target: PlayerId;
}
export interface AcceptAllianceCommand {
  readonly type: 'AcceptAlliance';
  readonly playerId: PlayerId;
  readonly allianceId: string;
}
export interface LeaveAllianceCommand {
  readonly type: 'LeaveAlliance';
  readonly playerId: PlayerId;
}
/** Non-aggression pacts (question 34). */
export interface ProposePactCommand {
  readonly type: 'ProposePact';
  readonly playerId: PlayerId;
  readonly target: PlayerId;
}
export interface AcceptPactCommand {
  readonly type: 'AcceptPact';
  readonly playerId: PlayerId;
  readonly from: PlayerId;
}
export interface BreakPactCommand {
  readonly type: 'BreakPact';
  readonly playerId: PlayerId;
  readonly other: PlayerId;
}

/** A recurring transport route (spec 12.2): every `everyHours` a transport carries the cargo. */
export interface CreateRouteCommand {
  readonly type: 'CreateRoute';
  readonly playerId: PlayerId;
  readonly from: string;
  readonly to: string;
  readonly units: UnitCounts;
  readonly cargo: ResourceAmounts;
  readonly everyHours: number;
}

export interface DeleteRouteCommand {
  readonly type: 'DeleteRoute';
  readonly playerId: PlayerId;
  readonly routeId: string;
}

/** Reassign a planet's units to be fed by another planet of the player (question 37). */
export interface SetUpkeepPlanetCommand {
  readonly type: 'SetUpkeepPlanet';
  readonly playerId: PlayerId;
  readonly planetId: string;
  /** The feeding planet; null = the units' own planet again. */
  readonly from: string | null;
}

/** Order units in a planet's shipyard (spec 9.2, 10.7); paid in full at once. */
export interface OrderUnitsCommand {
  readonly type: 'OrderUnits';
  readonly playerId: PlayerId;
  readonly planetId: string;
  readonly unit: UnitId;
  readonly count: number;
}

/** Cancel a shipyard order; part of the unfinished units' cost comes back (CANCEL_REFUND). */
export interface CancelUnitOrderCommand {
  readonly type: 'CancelUnitOrder';
  readonly playerId: PlayerId;
  readonly planetId: string;
  readonly orderId: number;
}

/** Move units between the hangars and orbit of their planet (free, owner 3.11.2026). */
export interface MoveUnitsCommand {
  readonly type: 'MoveUnits';
  readonly playerId: PlayerId;
  readonly planetId: string;
  readonly units: UnitCounts;
  readonly to: UnitPlace;
}

/** Send units from an owned planet to another planet (spec 12.1). */
export interface SendFleetCommand {
  readonly type: 'SendFleet';
  readonly playerId: PlayerId;
  readonly from: string;
  readonly to: string;
  readonly units: UnitCounts;
  readonly mission: FleetMission;
  /** Resources to carry (transport). */
  readonly cargo?: ResourceAmounts;
}

/** Turn a fleet on its way out back home (spec 12.1.2: unused fuel returns to the store). */
export interface RecallFleetCommand {
  readonly type: 'RecallFleet';
  readonly playerId: PlayerId;
  readonly fleetId: string;
}

/** Debug only: puts units at an owned planet (the shipyard comes in step 1.10). */
export interface DebugAddUnitsCommand {
  readonly type: 'DebugAddUnits';
  readonly planetId: string;
  readonly units: UnitCounts;
}

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
  /** The field to build on (planet surface view); default: the first free one. */
  readonly slot?: number;
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
  schedulePlanetJobs(state, planetId);
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
        c.slot,
      );
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      const fields = galaxyPlanet(state, c.planetId).fields;
      startConstruction(
        p,
        {
          kind: c.kind,
          ...(c.deposit ? { deposit: c.deposit } : {}),
          slot: c.slot ?? firstFreeSlot(p, fields),
        },
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
        known: {},
        scans: {},
        alerts: [],
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
      discover(state, c.playerId, state.world.galaxy.planets[c.planetId]?.system ?? -1);
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
        const fields = state.world.galaxy.planets[c.planetId]?.fields ?? 0;
        const slot = firstFreeSlot(p, fields);
        p.buildings.push({
          ...(slot >= 0 ? { slot } : {}),
          uid: p.nextUid++,
          kind: c.kind,
          level: c.level,
          ...(c.deposit ? { deposit: c.deposit } : {}),
        });
      }
      fitHangar(p); // a hangar lowered or removed sends units into orbit
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
        if (!(STOCKED as readonly string[]).includes(r)) {
          return fail('BAD_RESOURCE', 'This resource cannot be kept on a planet.');
        }
        if (!Number.isFinite(n) || n < 0)
          return fail('BAD_AMOUNT', 'The amount must be a non-negative number.');
      }
      return OK;
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      for (const [r, n] of Object.entries(c.amounts) as [ResourceId, number][]) {
        p.stock[r] = Math.min(capacityOf(p, r), (p.stock[r] ?? 0) + n);
      }
    },
  },
  SendFleet: {
    validate(state, c) {
      if (!state.players[c.playerId]) return fail('NO_PLAYER', 'No such player.');
      const own = ownedBy(state, c.playerId, c.from);
      if (!own.ok) return own;
      const s = settledCopy(state, c.from);
      const p = s.planets[c.from] as NonNullable<GameState['planets'][string]>;
      return canSendFleet(s, c, ownerContext(s, p));
    },
    apply(state, c) {
      const p = settleOwned(state, c.from);
      if (!p) return;
      const f = sendFleet(state, c, ownerContext(state, p));
      scheduleFleet(state, f.id);
    },
  },
  RecallFleet: {
    validate(state, c) {
      return canRecallFleet(state, c.playerId, c.fleetId);
    },
    apply(state, c) {
      recallFleet(state, c.fleetId);
      scheduleFleet(state, c.fleetId);
    },
  },
  OrderUnits: {
    validate(state, c) {
      const own = ownedBy(state, c.playerId, c.planetId);
      if (!own.ok) return own;
      const s = settledCopy(state, c.planetId);
      const p = s.planets[c.planetId] as PlanetState;
      return canOrderUnits(p, c.unit, c.count, ownerContext(s, p));
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      orderUnits(p, c.unit, c.count, ownerContext(state, p), p.nextUid++);
      schedulePlanetJobs(state, c.planetId);
    },
  },
  CancelUnitOrder: {
    validate(state, c) {
      const own = ownedBy(state, c.playerId, c.planetId);
      if (!own.ok) return own;
      if (!state.planets[c.planetId]?.shipyard.some((o) => o.id === c.orderId))
        return fail('NO_ORDER', 'No such shipyard order.');
      return OK;
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      cancelOrder(p, c.orderId);
      schedulePlanetJobs(state, c.planetId);
    },
  },
  CreateRoute: {
    validate(state, c) {
      const p = state.planets[c.from];
      return canCreateRoute(state, c, p ? ownerContext(state, p) : {});
    },
    apply(state, c) {
      const r = createRoute(state, c);
      scheduleEvent(state, r.nextAt, { type: 'RouteTick', routeId: r.id, at: r.nextAt });
    },
  },
  DeleteRoute: {
    validate(state, c) {
      const r = state.routes[c.routeId];
      if (!r) return fail('NO_ROUTE', 'No such route.');
      if (r.owner !== c.playerId) return fail('NOT_YOURS', 'This is not your route.');
      return OK;
    },
    apply(state, c) {
      delete state.routes[c.routeId]; // its fleets already under way finish their trip
    },
  },
  DebugAddRival: {
    validate(state, c) {
      if (state.players[c.playerId])
        return fail('PLAYER_EXISTS', 'A player with this id already exists.');
      return freeStart(state) ? OK : fail('NO_START', 'No free start position left.');
    },
    apply(state, c) {
      const planet = freeStart(state);
      if (!planet) return;
      state.players[c.playerId] = {
        id: c.playerId,
        name: c.name,
        techs: {},
        known: {},
        scans: {},
        alerts: [],
      };
      state.planets[planet] = createPlanetState(planet, c.playerId, state.time);
      discover(state, c.playerId, state.world.galaxy.planets[planet]?.system ?? -1);
    },
  },
  CreateAlliance: {
    validate(state, c) {
      return canCreateAlliance(state, c.playerId, c.name);
    },
    apply(state, c) {
      const id = `a${state.nextAlliance++}`;
      state.alliances[id] = { id, name: c.name.trim(), members: [c.playerId], invites: [] };
    },
  },
  InviteToAlliance: {
    validate(state, c) {
      return canInvite(state, c.playerId, c.target);
    },
    apply(state, c) {
      const al = allianceOf(state, c.playerId);
      if (!al) return;
      al.invites.push(c.target);
      state.log.push({
        at: state.time,
        who: c.target,
        text: `${state.players[c.playerId]?.name ?? c.playerId} invites you to the alliance ${al.name}.`,
      });
    },
  },
  AcceptAlliance: {
    validate(state, c) {
      return canAcceptAlliance(state, c.playerId, c.allianceId);
    },
    apply(state, c) {
      const al = state.alliances[c.allianceId];
      if (!al) return;
      al.invites = al.invites.filter((p) => p !== c.playerId);
      al.members.push(c.playerId);
      for (const other of Object.values(state.alliances))
        other.invites = other.invites.filter((p) => p !== c.playerId);
      for (const m of al.members)
        state.log.push({
          at: state.time,
          who: m,
          text: `${state.players[c.playerId]?.name ?? c.playerId} joined the alliance ${al.name}.`,
        });
    },
  },
  LeaveAlliance: {
    validate(state, c) {
      return allianceOf(state, c.playerId)
        ? OK
        : fail('NO_ALLIANCE', 'You are not in an alliance.');
    },
    apply(state, c) {
      leaveAlliance(state, c.playerId);
    },
  },
  ProposePact: {
    validate(state, c) {
      return canProposePact(state, c.playerId, c.target);
    },
    apply(state, c) {
      state.pactOffers[pairKey(c.playerId, c.target)] = {
        from: c.playerId,
        to: c.target,
        at: state.time,
      };
      state.log.push({
        at: state.time,
        who: c.target,
        text: `${state.players[c.playerId]?.name ?? c.playerId} offers you a non-aggression pact.`,
      });
    },
  },
  AcceptPact: {
    validate(state, c) {
      const offer = state.pactOffers[pairKey(c.playerId, c.from)];
      if (!offer || offer.to !== c.playerId) return fail('NO_OFFER', 'No such pact offer.');
      return OK;
    },
    apply(state, c) {
      const key = pairKey(c.playerId, c.from);
      delete state.pactOffers[key];
      state.pacts[key] = { a: c.from, b: c.playerId, since: state.time };
      for (const who of [c.from, c.playerId])
        state.log.push({ at: state.time, who, text: 'A non-aggression pact was signed.' });
    },
  },
  BreakPact: {
    validate(state, c) {
      const p = state.pacts[pairKey(c.playerId, c.other)];
      if (!p) return fail('NO_PACT', 'There is no pact to break.');
      if (p.breakAt !== undefined) return fail('ALREADY_BROKEN', 'The pact is already ending.');
      return OK;
    },
    apply(state, c) {
      const key = pairKey(c.playerId, c.other);
      const p = state.pacts[key];
      if (!p) return;
      p.breakAt = state.time + DIPLOMACY.pactBreakMs;
      scheduleEvent(state, p.breakAt, { type: 'PactEnds', key, at: p.breakAt });
      for (const who of [c.playerId, c.other])
        state.log.push({
          at: state.time,
          who,
          text: `${state.players[c.playerId]?.name ?? c.playerId} broke the non-aggression pact; it ends in 12 h.`,
        });
    },
  },
  SetUpkeepPlanet: {
    validate(state, c) {
      const own = ownedBy(state, c.playerId, c.planetId);
      if (!own.ok) return own;
      if (c.from === null) return OK;
      if (c.from === c.planetId)
        return fail('SAME_PLANET', 'Choose another planet, or none to feed them here.');
      const from = ownedBy(state, c.playerId, c.from);
      return from.ok ? OK : fail('NOT_YOURS', 'The feeding planet must be yours.');
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      const old = p.upkeepFrom;
      if (old) {
        const y = settleOwned(state, old);
        if (y?.support) delete y.support[c.planetId];
      }
      if (c.from) p.upkeepFrom = c.from;
      else delete p.upkeepFrom;
      // refreshSupport (run after every command) puts the upkeep on the new planet.
    },
  },
  MoveUnits: {
    validate(state, c) {
      const own = ownedBy(state, c.playerId, c.planetId);
      if (!own.ok) return own;
      if (c.to !== 'hangar' && c.to !== 'orbit') return fail('BAD_PLACE', 'No such place.');
      return canMoveUnits(state.planets[c.planetId] as PlanetState, c.units, c.to);
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (p) moveUnits(p, c.units, c.to);
    },
  },
  DebugAddUnits: {
    validate(state, c) {
      if (!state.planets[c.planetId]) return fail('NOT_OWNED', 'This planet has no owner.');
      for (const [u, n] of Object.entries(c.units) as [UnitId, number][]) {
        if (!(u in UNITS)) return fail('NO_UNIT', 'No such unit.');
        if (UNITS[u].category === 'defense')
          return fail('NOT_MOVABLE', 'Defences are not kept in hangars.');
        if (!Number.isInteger(n) || n < 0)
          return fail('BAD_AMOUNT', 'Unit counts must be whole non-negative numbers.');
      }
      return OK;
    },
    apply(state, c) {
      const p = settleOwned(state, c.planetId);
      if (!p) return;
      landUnits(p, c.units);
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

/**
 * A player leaves their alliance (spec 16): the discovered map stays (the allies' discoveries
 * are kept), the view of their planets goes, and the defence fleets on both sides go home.
 */
function leaveAlliance(state: GameState, player: PlayerId): void {
  const al = allianceOf(state, player);
  if (!al) return;
  const me = state.players[player];
  const others = al.members.filter((m) => m !== player);
  for (const m of others) {
    const p = state.players[m];
    if (!me || !p) continue;
    for (const [sys, t] of Object.entries(p.known)) me.known[Number(sys)] ??= t;
    for (const pl of Object.values(state.planets))
      if (pl.owner === m) discover(state, player, state.world.galaxy.planets[pl.id]?.system ?? -1);
  }
  al.members = others;
  if (al.members.length === 0) delete state.alliances[al.id];
  // Fleets defending (or carrying to) former allies, either way, turn home.
  for (const f of Object.values(state.fleets)) {
    const at = f.phase === 'stationed' ? f.target : f.phase === 'out' ? f.leg?.to : undefined;
    const host = at ? state.planets[at]?.owner : undefined;
    if (!host || host === f.owner) continue;
    const crosses =
      (f.owner === player && others.includes(host)) ||
      (host === player && others.includes(f.owner));
    if (!crosses || (f.mission !== 'defend' && f.mission !== 'transport')) continue;
    recallFleet(state, f.id);
    scheduleFleet(state, f.id);
    state.log.push({
      at: state.time,
      who: f.owner,
      text: `Fleet ${f.id} returns home: the alliance is over.`,
    });
  }
  for (const who of [player, ...others])
    state.log.push({
      at: state.time,
      who,
      text: `${me?.name ?? player} left the alliance ${al.name}.`,
    });
}

/** The starter planet of the first start position nobody lives in. */
function freeStart(state: Readonly<GameState>): string | undefined {
  const g = state.world.galaxy;
  for (const slot of g.startSlots) {
    const planets = g.systems[slot]?.planets ?? [];
    if (planets.some((id) => state.planets[id])) continue;
    const starter = planets.find((id) => g.planets[id]?.starter) ?? planets[0];
    if (starter) return starter;
  }
  return undefined;
}
