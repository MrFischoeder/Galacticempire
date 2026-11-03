import type { GameState } from '../core/state';
import type { Planet, PlanetId } from '../galaxy/types';
import { settlePlanet, type PlanetState } from './planet';
import { finalizeResearch } from './research';
import type { ModifierContext } from '../rules/modifiers';

/** Modifier context of a planet's owner: race and researched technologies. */
export function ownerContext(state: GameState, planet: PlanetState): ModifierContext {
  const player = state.players[planet.owner];
  if (!player) return {};
  return { ...(player.race ? { race: player.race } : {}), techs: player.techs };
}

export function galaxyPlanet(state: GameState, id: PlanetId): Planet {
  const planet = state.world.galaxy.planets[id];
  if (!planet) throw new RangeError(`Unknown planet ${id}`);
  return planet;
}

/** Settles an owned planet to the state's current time (mutates the state: engine use only). */
export function settleOwned(state: GameState, id: PlanetId): PlanetState | undefined {
  const p = state.planets[id];
  if (!p) return undefined;
  if (p.updatedAt < state.time)
    settlePlanet(p, galaxyPlanet(state, id), state.time, ownerContext(state, p));
  finalizeResearch(state, id);
  return p;
}

/**
 * Read-only view of an owned planet at game time `time` (>= its last update): the stores and
 * the deposits as they would be then. Does not change the state.
 */
export function planetAt(
  state: GameState,
  id: PlanetId,
  time: number,
): { planet: PlanetState; deposits: Planet['deposits'] } | undefined {
  const owned = state.planets[id];
  if (!owned) return undefined;
  const p = JSON.parse(JSON.stringify(owned)) as PlanetState;
  const g = JSON.parse(JSON.stringify(galaxyPlanet(state, id))) as Planet;
  settlePlanet(p, g, Math.max(time, p.updatedAt), ownerContext(state, p));
  return { planet: p, deposits: g.deposits };
}
