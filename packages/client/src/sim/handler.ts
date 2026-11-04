import {
  advanceTo,
  applyCommand,
  createClock,
  createGameState,
  getPlayerView,
  peek,
  planetRates,
  setMultiplier,
  setPaused,
  tickClock,
  MS_PER_HOUR,
  type GameState,
} from '@ge/shared';
import type { FromWorker, PlanetView, Snapshot, ToWorker, WorkerState } from './protocol';

/** How many log lines the page sees. */
const LOG_LINES = 40;

export function createWorkerState(): WorkerState {
  return { game: null, clock: createClock(), playerId: 'p1', revealAll: false, chartKey: '' };
}

/** Processes events that are due by the clock (planets themselves are settled lazily). */
function catchUp(state: WorkerState): void {
  const game = state.game;
  if (!game) return;
  const now = state.clock.gameMs;
  const next = peek(game.events);
  if (now > game.time && next && next.at <= now) state.game = advanceTo(game, now);
}

/**
 * What the page gets: only the player's view of the game (spec 13, step 1.11), never the full
 * state. The chart goes along only when it changed.
 */
export function buildSnapshot(state: WorkerState): Snapshot | null {
  const game = state.game as GameState | null;
  if (!game) return null;
  const time = Math.max(state.clock.gameMs, game.time);
  const view = getPlayerView(game, state.playerId, time, {
    revealAll: state.revealAll,
    logLines: LOG_LINES,
  });
  if (!view) return null;
  const ctx = { ...(view.player.race ? { race: view.player.race } : {}), techs: view.player.techs };
  const planets: PlanetView[] = [];
  for (const p of view.planets) {
    const info = view.chart.planets[p.id];
    if (!info) continue;
    planets.push({ planet: p, info, deposits: info.deposits, rates: planetRates(p, info, ctx) });
  }
  const key = `${view.known.length}|${Object.keys(view.scans).length}|${state.revealAll}`;
  const chartChanged = key !== state.chartKey;
  state.chartKey = key;
  return {
    time,
    multiplier: state.clock.multiplier,
    paused: state.clock.paused,
    player: view.player,
    planets,
    log: view.log,
    fleets: view.fleets,
    routes: view.routes,
    owners: view.owners,
    scans: view.scans,
    contacts: view.contacts,
    alerts: view.alerts,
    revealAll: state.revealAll,
    ...(chartChanged ? { chart: view.chart } : {}),
  };
}

/**
 * The worker's logic, kept free of worker globals so it can be tested. The game state and the
 * game clock live only here; the page gets snapshots and sends commands.
 */
export function handleMessage(state: WorkerState, msg: ToWorker): FromWorker[] {
  try {
    if (msg.type === 'newGame') {
      let game = createGameState(msg.seed, { systems: msg.systems });
      const galaxy = game.world.galaxy;
      const homeSystem = galaxy.systems[galaxy.startSlots[0] as number];
      const homePlanet = homeSystem?.planets.find((id) => galaxy.planets[id]?.starter) ?? '';
      // The start (spec 7, decisions 2.8): an empty starter planet; proper joining comes in 4.2.
      for (const command of [
        { type: 'AddPlayer', playerId: state.playerId, name: 'Player', race: msg.race },
        { type: 'DebugGivePlanet', playerId: state.playerId, planetId: homePlanet },
      ] as const) {
        game = applyCommand(game, command, 0).state;
      }
      state.game = game;
      state.clock = createClock();
      state.chartKey = '';
      const chart = getPlayerView(game, state.playerId, 0, { revealAll: state.revealAll })?.chart;
      return [
        {
          type: 'world',
          seed: msg.seed,
          galaxy: chart ?? galaxy,
          playerId: state.playerId,
          homePlanet,
        },
      ];
    }
    if (msg.type === 'speed') {
      state.clock = setMultiplier(state.clock, msg.multiplier);
      return [];
    }
    if (msg.type === 'reveal') {
      state.revealAll = msg.on;
      return [];
    }
    if (msg.type === 'pause') {
      state.clock = setPaused(state.clock, msg.paused);
      return [];
    }
    if (!state.game)
      return msg.type === 'tick' ? [] : [{ type: 'error', message: 'No game running.' }];
    if (msg.type === 'tick') {
      state.clock = tickClock(state.clock, msg.realMs);
      catchUp(state);
      return [];
    }
    if (msg.type === 'skip') {
      state.clock = {
        ...state.clock,
        gameMs: state.clock.gameMs + Math.max(0, msg.hours) * MS_PER_HOUR,
      };
      state.game = advanceTo(state.game, state.clock.gameMs);
      return [];
    }
    const time = Math.max(state.clock.gameMs, state.game.time);
    const out = applyCommand(state.game, msg.command, time);
    state.game = out.state;
    return [{ type: 'result', id: msg.id, result: out.result }];
  } catch (e) {
    return [{ type: 'error', message: e instanceof Error ? e.message : String(e) }];
  }
}
