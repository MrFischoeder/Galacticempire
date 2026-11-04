import type { GameState } from '../core/state';
import type { Planet, PlanetId } from '../galaxy/types';
import { settlePlanet, upkeepPerHour, type PlanetState } from './planet';
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
  if (p.news.length > 0) {
    const name = state.world.galaxy.planets[id]?.name ?? id;
    for (const n of p.news) state.log.push({ at: n.at, who: p.owner, text: `${name}: ${n.text}` });
    p.news = [];
  }
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

/**
 * Keeps the upkeep that planets pay for each other's units up to date (question 37). Run after
 * every command and event: each feeding planet is settled to now before its rate changes.
 */
export function refreshSupport(state: GameState): void {
  for (const p of Object.values(state.planets)) {
    for (const [x, n] of Object.entries(p.support ?? {})) {
      const fed = state.planets[x];
      const want =
        fed && fed.upkeepFrom === p.id && fed.owner === p.owner
          ? upkeepPerHour(fed, ownerContext(state, fed))
          : 0;
      if (Math.abs((n ?? 0) - want) > 1e-12) {
        settleOwned(state, p.id);
        if (want > 0) (p.support ??= {})[x] = want;
        else delete p.support?.[x];
      }
    }
  }
  for (const x of Object.values(state.planets)) {
    if (!x.upkeepFrom) continue;
    const y = state.planets[x.upkeepFrom];
    if (!y || y.owner !== x.owner) {
      settleOwned(state, x.id);
      delete x.upkeepFrom;
      continue;
    }
    const want = upkeepPerHour(x, ownerContext(state, x));
    if (Math.abs((y.support?.[x.id] ?? 0) - want) > 1e-12) {
      settleOwned(state, y.id);
      (y.support ??= {})[x.id] = want;
    }
  }
}
