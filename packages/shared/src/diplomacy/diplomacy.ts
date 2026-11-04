import { DIPLOMACY } from '../config/diplomacy';
import { fail, OK, type Result } from '../core/result';
import type { GameState, PlayerId } from '../core/state';

/**
 * Alliances (spec 16) and non-aggression pacts (owner 3.11.2026, question 34), step 1.12.
 * Allies see each other's planets, share the discovered map and warnings, carry resources to
 * each other, may station fleets to defend each other (owner 4.11.2026) and cannot attack each
 * other. A pact only forbids attacks (and allows colonizing next to each other); breaking it
 * takes effect after 12 hours.
 */
export interface Alliance {
  readonly id: string;
  name: string;
  members: PlayerId[];
  /** Players invited and not yet answered. */
  invites: PlayerId[];
}

export interface Pact {
  readonly a: PlayerId;
  readonly b: PlayerId;
  readonly since: number;
  /** Set when one side broke it: the pact ends at this game time. */
  breakAt?: number;
}

/** Key of a pair of players (order does not matter). */
export const pairKey = (a: PlayerId, b: PlayerId) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function allianceOf(state: Readonly<GameState>, player: PlayerId): Alliance | undefined {
  return Object.values(state.alliances).find((al) => al.members.includes(player));
}

export function allied(state: Readonly<GameState>, a: PlayerId, b: PlayerId): boolean {
  if (a === b) return true;
  const al = allianceOf(state, a);
  return al !== undefined && al.members.includes(b);
}

/** The other members of a player's alliance. */
export function alliesOf(state: Readonly<GameState>, player: PlayerId): PlayerId[] {
  return allianceOf(state, player)?.members.filter((m) => m !== player) ?? [];
}

export function hasPact(state: Readonly<GameState>, a: PlayerId, b: PlayerId): boolean {
  const p = state.pacts[pairKey(a, b)];
  return p !== undefined && (p.breakAt === undefined || p.breakAt > state.time);
}

/** Allied or bound by a pact: no attacks between them (spec 16, question 34). */
export function atPeace(state: Readonly<GameState>, a: PlayerId, b: PlayerId): boolean {
  return allied(state, a, b) || hasPact(state, a, b);
}

/** Validation ready for phase 2 (combat): an attack on an ally or a pact partner is refused. */
export function canAttack(
  state: Readonly<GameState>,
  attacker: PlayerId,
  defender: PlayerId,
): Result {
  if (attacker === defender) return fail('OWN_PLANET', 'You cannot attack yourself.');
  if (allied(state, attacker, defender))
    return fail('ALLY', 'You cannot attack a member of your alliance.');
  if (hasPact(state, attacker, defender))
    return fail('PACT', 'A non-aggression pact forbids this attack.');
  return OK;
}

function checkName(name: string): Result {
  const n = name.trim();
  if (!n) return fail('NAME_EMPTY', 'The name cannot be empty.');
  if (n.length > DIPLOMACY.nameMax)
    return fail('NAME_TOO_LONG', `The name can have at most ${DIPLOMACY.nameMax} characters.`);
  return OK;
}

export function canCreateAlliance(
  state: Readonly<GameState>,
  player: PlayerId,
  name: string,
): Result {
  if (!state.players[player]) return fail('NO_PLAYER', 'No such player.');
  if (allianceOf(state, player)) return fail('IN_ALLIANCE', 'Leave your alliance first.');
  return checkName(name);
}

export function canInvite(state: Readonly<GameState>, player: PlayerId, target: PlayerId): Result {
  const al = allianceOf(state, player);
  if (!al) return fail('NO_ALLIANCE', 'You are not in an alliance.');
  if (!state.players[target]) return fail('NO_PLAYER', 'No such player.');
  if (al.members.includes(target)) return fail('ALREADY_MEMBER', 'Already a member.');
  if (al.invites.includes(target)) return fail('ALREADY_INVITED', 'Already invited.');
  if (al.members.length + al.invites.length >= DIPLOMACY.maxMembers)
    return fail('ALLIANCE_FULL', `An alliance has at most ${DIPLOMACY.maxMembers} members.`);
  return OK;
}

export function canAcceptAlliance(
  state: Readonly<GameState>,
  player: PlayerId,
  id: string,
): Result {
  const al = state.alliances[id];
  if (!al || !al.invites.includes(player)) return fail('NO_INVITE', 'No such invitation.');
  if (allianceOf(state, player)) return fail('IN_ALLIANCE', 'Leave your alliance first.');
  if (al.members.length >= DIPLOMACY.maxMembers)
    return fail('ALLIANCE_FULL', `An alliance has at most ${DIPLOMACY.maxMembers} members.`);
  return OK;
}

export function canProposePact(
  state: Readonly<GameState>,
  player: PlayerId,
  target: PlayerId,
): Result {
  if (!state.players[target] || target === player) return fail('NO_PLAYER', 'No such player.');
  if (hasPact(state, player, target)) return fail('PACT_EXISTS', 'You already have a pact.');
  if (allied(state, player, target)) return fail('ALLY', 'Allies need no pact.');
  return OK;
}
