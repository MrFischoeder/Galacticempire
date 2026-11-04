import { MS_PER_HOUR, MS_PER_MINUTE } from '@ge/shared';
import { describe, expect, it } from 'vitest';
import { buildSnapshot, createWorkerState, handleMessage } from '../src/sim/handler';

describe('simulation worker (steps 1.7-1.8)', () => {
  it('starts a game with the player on an empty starter planet', () => {
    const state = createWorkerState();
    expect(
      handleMessage(state, {
        type: 'command',
        id: 1,
        command: { type: 'AddPlayer', playerId: 'x', name: 'X' },
      })[0]?.type,
    ).toBe('error');
    const [world] = handleMessage(state, {
      type: 'newGame',
      seed: 'w',
      systems: 60,
      race: 'swarm',
    });
    expect(world?.type).toBe('world');
    const snap = buildSnapshot(state)!;
    expect(snap.player.race).toBe('swarm');
    expect(snap.planets).toHaveLength(1);
    expect(snap.planets[0]!.planet.buildings).toEqual([]);
    expect(snap.planets[0]!.info.starter).toBe(true);
  });

  it('runs the game clock: speed, pause, skip', () => {
    const state = createWorkerState();
    handleMessage(state, { type: 'newGame', seed: 'w', systems: 60, race: 'merchants' });
    handleMessage(state, { type: 'tick', realMs: 1000 });
    expect(buildSnapshot(state)!.time).toBe(1000);
    handleMessage(state, { type: 'speed', multiplier: 60 });
    handleMessage(state, { type: 'tick', realMs: 60_000 });
    expect(buildSnapshot(state)!.time).toBe(1000 + MS_PER_HOUR);
    handleMessage(state, { type: 'pause', paused: true });
    handleMessage(state, { type: 'tick', realMs: 60_000 });
    expect(buildSnapshot(state)!.time).toBe(1000 + MS_PER_HOUR);
    handleMessage(state, { type: 'skip', hours: 2 });
    const snap = buildSnapshot(state)!;
    expect(snap.time).toBe(1000 + 3 * MS_PER_HOUR);
    // The core has gathered 20/h of each basic mineral, shown in the snapshot.
    expect(snap.planets[0]!.planet.stock.metal).toBeCloseTo(20 * (snap.time / MS_PER_HOUR), 3);
  });

  it('commands use the game clock; finished buildings show up', () => {
    const state = createWorkerState();
    const [world] = handleMessage(state, {
      type: 'newGame',
      seed: 'w',
      systems: 60,
      race: 'merchants',
    });
    if (world?.type !== 'world') throw new Error('no world');
    handleMessage(state, { type: 'skip', hours: 2 });
    const [res] = handleMessage(state, {
      type: 'command',
      id: 7,
      command: {
        type: 'StartBuilding',
        playerId: world.playerId,
        planetId: world.homePlanet,
        kind: 'renewable',
      },
    });
    expect(res).toMatchObject({ type: 'result', id: 7, result: { ok: true } });
    handleMessage(state, { type: 'speed', multiplier: 60 });
    handleMessage(state, { type: 'tick', realMs: 5 * 1000 });
    const snap = buildSnapshot(state)!;
    expect(snap.time).toBeGreaterThan(2 * MS_PER_HOUR + 3 * MS_PER_MINUTE);
    expect(snap.planets[0]!.planet.buildings.map((b) => b.kind)).toEqual(['renewable']);
    expect(snap.log.at(-1)?.text).toContain('Renewable power plant level 1 completed');
    const [bad] = handleMessage(state, {
      type: 'command',
      id: 8,
      command: {
        type: 'StartBuilding',
        playerId: world.playerId,
        planetId: world.homePlanet,
        kind: 'laboratory',
      },
    });
    expect(bad).toMatchObject({ result: { ok: false, error: { code: 'REQUIREMENT' } } });
  });
});

describe('fog of war in the page (step 1.11)', () => {
  it('the snapshot carries only the player view; "reveal all" lifts the fog', () => {
    const state = createWorkerState();
    handleMessage(state, { type: 'newGame', seed: 'fog', systems: 60, race: 'swarm' });
    const g = state.game!.world.galaxy;
    const far = g.systems[g.startSlots[1]!]!;
    let snap = buildSnapshot(state)!;
    expect(snap.chart).toBeDefined();
    expect(snap.chart!.seed).toBe('');
    expect(snap.chart!.systems[far.id]!.name).toBe('Unknown');
    expect(snap.chart!.planets[far.planets[0]!]).toBeUndefined();
    // The chart is sent again only when it changes.
    expect(buildSnapshot(state)!.chart).toBeUndefined();
    handleMessage(state, { type: 'reveal', on: true });
    snap = buildSnapshot(state)!;
    expect(snap.chart!.systems[far.id]!.name).toBe(far.name);
    expect(snap.chart!.planets[far.planets[0]!]!.deposits.length).toBeGreaterThan(0);
  });
});
