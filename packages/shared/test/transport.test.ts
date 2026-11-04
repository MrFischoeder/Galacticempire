import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  cargoCapacity,
  createGameState,
  effectiveUnit,
  flightDistance,
  flightTime,
  loadTime,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  TRANSPORT,
  type Command,
  type GameState,
} from '../src/index';

const base = createGameState('transport');

function run(s: GameState, cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c, s.time);
    if (!r.result.ok) throw new Error(JSON.stringify(r.result));
    s = r.state;
  }
  return s;
}

function setup(race?: 'merchants') {
  let s = JSON.parse(JSON.stringify(base)) as GameState;
  const g = s.world.galaxy;
  const home = g.systems[g.startSlots[0]!]!.planets[0]!;
  const far = g.systems[g.startSlots[1]!]!.planets[0]!;
  const free = g.systems[g.startSlots[2]!]!.planets[0]!;
  s = run(s, [
    { type: 'AddPlayer', playerId: 'p1', name: 'Player', ...(race ? { race } : {}) },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: home },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: far },
    { type: 'DebugSetBuilding', planetId: home, kind: 'warehouse', level: 10 },
    { type: 'DebugSetBuilding', planetId: far, kind: 'warehouse', level: 3 },
    {
      type: 'DebugAddResources',
      planetId: home,
      amounts: { fuel: 3000, titanium: 3000, metal: 3000 },
    },
    { type: 'DebugAddUnits', planetId: home, units: { transport: 2, colonizer: 1 } },
  ]);
  return { s, home, far, free };
}

const fuel = (s: GameState, id: string) => s.planets[id]!.stock.fuel ?? 0;

describe('transports (spec 12.2)', () => {
  it('a transport carries 500, the Merchants 625 (spec 10.2)', () => {
    expect(cargoCapacity({ transport: 1 }, {})).toBe(500);
    expect(cargoCapacity({ transport: 1 }, { race: 'merchants' })).toBe(625);
  });

  it('there and back with the right fuel; the cargo lands at the target', () => {
    const { s: s0, home, far } = setup();
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: far,
        units: { transport: 1 },
        mission: 'transport',
        cargo: { titanium: 400 },
      },
    ]);
    const { ly } = flightDistance(s.world.galaxy, home, far);
    const e = effectiveUnit('transport');
    // Fuel for both ways at once (spec 12.1.2): 2 × (2 + 0.5/LY).
    expect(fuel(s0, home) - fuel(s, home)).toBeCloseTo(2 * (e.fuelStart + e.fuelPerLy * ly), 6);
    expect((s0.planets[home]!.stock.titanium ?? 0) - (s.planets[home]!.stock.titanium ?? 0)).toBe(
      400,
    );
    const f = Object.values(s.fleets)[0]!;
    // Loading takes the default time without a spaceport.
    expect(f.leg!.arriveAt).toBe(
      TRANSPORT.loadMinutesNoSpaceport * MS_PER_MINUTE + flightTime(ly, e.speed, true),
    );
    const titaniumFar = s.planets[far]!.stock.titanium ?? 0;
    s = advanceTo(s, f.leg!.arriveAt);
    expect((s.planets[far]!.stock.titanium ?? 0) - titaniumFar).toBeGreaterThanOrEqual(399);
    const back = s.fleets[f.id]!;
    expect(back.phase).toBe('back');
    s = advanceTo(s, back.leg!.arriveAt);
    expect(s.fleets).toEqual({});
    expect(s.planets[home]!.orbit.transport).toBe(2);
  });

  it('a spaceport loads faster', () => {
    const { s: s0, home } = setup();
    const s = run(s0, [{ type: 'DebugSetBuilding', planetId: home, kind: 'spaceport', level: 3 }]);
    expect(loadTime(s.planets[home]!)).toBe(Math.round(10 * 0.9 ** 2 * MS_PER_MINUTE));
  });

  it('cargo over capacity, without stock or for other missions is refused', () => {
    const { s, home, far } = setup();
    const send = (o: Partial<Extract<Command, { type: 'SendFleet' }>>) =>
      applyCommand(
        s,
        {
          type: 'SendFleet',
          playerId: 'p1',
          from: home,
          to: far,
          units: { transport: 1 },
          mission: 'transport',
          cargo: { metal: 100 },
          ...o,
        },
        s.time,
      ).result;
    expect(send({ cargo: { metal: 600 } })).toMatchObject({ error: { code: 'CARGO_FULL' } });
    expect(send({ cargo: {} })).toMatchObject({ error: { code: 'NO_CARGO' } });
    expect(send({ cargo: { silicon: 100 } })).toMatchObject({
      error: { code: 'NOT_ENOUGH_CARGO' },
    });
    expect(send({ mission: 'transfer' })).toMatchObject({ error: { code: 'NO_CARGO_MISSION' } });
  });

  it('a full warehouse: the transport waits in orbit and unloads when there is room', () => {
    const { s: s0, home, far } = setup();
    let s = JSON.parse(JSON.stringify(s0)) as GameState;
    const cap = 150 + 400 * 1.3 ** 2; // far: core + warehouse level 3
    s.planets[far]!.stock.metal = cap - 100;
    s = run(s, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: far,
        units: { transport: 1 },
        mission: 'transport',
        cargo: { metal: 400 },
      },
    ]);
    const f = Object.values(s.fleets)[0]!;
    s = advanceTo(s, f.leg!.arriveAt);
    const w = s.fleets[f.id]!;
    expect(w.phase).toBe('waiting');
    expect(w.cargo.metal).toBeGreaterThan(250);
    // Room appears: the next retry unloads the rest and the fleet goes home.
    s.planets[far]!.stock.metal = 0;
    s = advanceTo(s, w.retryAt!);
    expect(s.fleets[f.id]!.phase).toBe('back');
    expect(s.fleets[f.id]!.cargo).toEqual({});
  });
});

describe('recurring routes (spec 12.2)', () => {
  it('runs 3 trips without the player', () => {
    const { s: s0, home, far } = setup();
    let s = run(s0, [
      {
        type: 'CreateRoute',
        playerId: 'p1',
        from: home,
        to: far,
        units: { transport: 1 },
        cargo: { titanium: 200 },
        everyHours: 10,
      },
    ]);
    const titaniumFar = s.planets[far]!.stock.titanium ?? 0;
    s = advanceTo(s, 21 * MS_PER_HOUR); // runs at 0 h, 10 h and 20 h (a round trip ~9 h)
    const r = Object.values(s.routes)[0]!;
    expect(r.trips).toBe(3);
    s = advanceTo(s, 40 * MS_PER_HOUR);
    expect((s.planets[far]!.stock.titanium ?? 0) - titaniumFar).toBeGreaterThanOrEqual(3 * 200 - 1);
    expect(s.log.filter((l) => l.text.startsWith('Route')).length).toBeGreaterThanOrEqual(3);
  });

  it('skips a run while the transport is away and says why', () => {
    const { s: s0, home, far } = setup();
    let s = run(s0, [
      {
        type: 'CreateRoute',
        playerId: 'p1',
        from: home,
        to: far,
        units: { transport: 2 },
        cargo: { metal: 100 },
        everyHours: 1,
      },
    ]);
    s = advanceTo(s, MS_PER_HOUR + 1);
    const r = Object.values(s.routes)[0]!;
    expect(r.trips).toBe(1);
    expect(r.last).toMatch(/not enough Transport/);
  });
});

describe('colonization (spec 10.5)', () => {
  it('a colonizer settles a free planet: core, 10 residents, housing level 1', () => {
    const { s: s0, home, free } = setup();
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: home,
        to: free,
        units: { colonizer: 1, transport: 1 },
        mission: 'colonize',
      },
    ]);
    s = advanceTo(s, Object.values(s.fleets)[0]!.leg!.arriveAt);
    const p = s.planets[free]!;
    expect(p.owner).toBe('p1');
    expect(p.population).toBe(10);
    expect(p.buildings).toEqual([{ uid: 1, kind: 'housing', level: 1, slot: 0 }]);
    expect(p.orbit).toEqual({ transport: 1 }); // the colonizer is used up
    expect(s.fleets).toEqual({});
    expect(s.planets[home]!.away).toEqual({});
  });

  it('refuses a taken planet, a fleet without a colonizer and a system someone else controls', () => {
    const { s: s0, home, far, free } = setup();
    const send = (s: GameState, o: Partial<Extract<Command, { type: 'SendFleet' }>>) =>
      applyCommand(
        s,
        {
          type: 'SendFleet',
          playerId: 'p1',
          from: home,
          to: free,
          units: { colonizer: 1 },
          mission: 'colonize',
          ...o,
        },
        s.time,
      ).result;
    expect(send(s0, { to: far })).toMatchObject({ error: { code: 'NOT_FREE' } });
    expect(send(s0, { units: { transport: 1 } })).toMatchObject({
      error: { code: 'NO_COLONIZER' },
    });
    let s = run(s0, [{ type: 'AddPlayer', playerId: 'p2', name: 'Rival' }]);
    const sys = s.world.galaxy.planets[free]!.system;
    const others = s.world.galaxy.systems[sys]!.planets.filter((id) => id !== free);
    for (const id of others.slice(0, Math.ceil((others.length + 1) / 2)))
      s = run(s, [{ type: 'DebugGivePlanet', playerId: 'p2', planetId: id }]);
    expect(send(s, {})).toMatchObject({ error: { code: 'SYSTEM_CONTROLLED' } });
  });
});
