import { describe, expect, it } from 'vitest';
import {
  applyCommand,
  createGameState,
  createPlanetState,
  energyCapacity,
  MS_PER_HOUR,
  planetAt,
  planetRates,
  resourceCapacity,
  Rng,
  settlePlanet,
  STORED_RESOURCES,
  type BuildingId,
  type Command,
  type GameState,
  type MinedResource,
  type Planet,
  type PlanetState,
} from '../src/index';

const H = MS_PER_HOUR;

function testPlanet(extra: Partial<Planet> = {}): Planet {
  return {
    id: 't-0',
    system: 0,
    name: 'Test I',
    type: 'green',
    orbit: 1,
    fields: 16,
    fertility: 1,
    renewable: 'wind',
    speciality: null,
    starter: true,
    deposits: [
      { resource: 'metal', class: 'average', pool: 100_000, initial: 100_000 },
      { resource: 'deuterium', class: 'poor', pool: 20_000, initial: 20_000 },
      { resource: 'titanium', class: 'poor', pool: 20_000, initial: 20_000 },
      { resource: 'silicon', class: 'poor', pool: 20_000, initial: 20_000 },
    ],
    ...extra,
  };
}

function owned(buildings: [BuildingId, number, MinedResource?][] = []): PlanetState {
  const p = createPlanetState('t-0', 'p1', 0);
  p.buildings = buildings.map(([kind, level, deposit]) => ({
    kind,
    level,
    ...(deposit ? { deposit } : {}),
  }));
  return p;
}

const run = (p: PlanetState, g: Planet, hours: number) =>
  settlePlanet(p, g, p.updatedAt + hours * H);

describe('planet production (step 1.4a)', () => {
  it('an empty planet: the core gathers 20/h of each basic mineral and 5 energy/h', () => {
    const p = owned();
    const g = testPlanet();
    run(p, g, 3);
    for (const r of ['metal', 'deuterium', 'titanium', 'silicon'] as const)
      expect(p.stock[r]).toBeCloseTo(60);
    expect(p.energy).toBeCloseTo(15);
    run(p, g, 20);
    expect(p.stock.metal).toBeCloseTo(150); // the core alone holds 150
    expect(p.energy).toBeCloseTo(100);
    // The core's trickle does not touch the deposits.
    expect(g.deposits[0]!.pool).toBe(100_000);
  });

  it('a mine replaces the trickle of its mineral and draws on its deposit', () => {
    const p = owned([
      ['mine', 1, 'metal'],
      ['renewable', 1],
    ]);
    const g = testPlanet();
    const r = planetRates(p, g);
    expect(r.made.metal).toBeCloseTo(60);
    expect(r.made.titanium).toBeCloseTo(20);
    run(p, g, 2);
    expect(p.stock.metal).toBeCloseTo(120);
    expect(g.deposits[0]!.pool).toBeCloseTo(100_000 - 120);
  });

  it('poor deposits give 0.7 and special deposits a third (docs/SUROWCE.md)', () => {
    const g = testPlanet({
      deposits: [
        ...testPlanet().deposits,
        { resource: 'fissile', class: 'average', pool: 5000, initial: 5000 },
      ],
    });
    const r = planetRates(
      owned([
        ['mine', 1, 'titanium'],
        ['mine', 1, 'fissile'],
        ['renewable', 2],
      ]),
      g,
    );
    expect(r.made.titanium).toBeCloseTo(42);
    expect(r.made.fissile).toBeCloseTo(20);
  });

  it('capacity is core + warehouses; the warehouse table holds (spec 8 + decision 3.11)', () => {
    const p = owned([
      ['mine', 1, 'metal'],
      ['warehouse', 1],
      ['renewable', 1],
    ]);
    const g = testPlanet();
    expect(resourceCapacity(p)).toBe(550);
    run(p, g, 9);
    expect(p.stock.metal).toBeCloseTo(540);
    run(p, g, 1);
    expect(p.stock.metal).toBe(550);
    const before = g.deposits[0]!.pool;
    run(p, g, 5);
    // A full store stops the mine: no more extraction.
    expect(g.deposits[0]!.pool).toBeCloseTo(before);
    expect(resourceCapacity(owned([['warehouse', 3]]))).toBeCloseTo(150 + 400 * 1.3 ** 2);
  });

  it('energy shortage: accumulators drain first, then everything slows proportionally (spec 5)', () => {
    const p = owned([
      ['mine', 1, 'metal'],
      ['accumulator', 1],
    ]);
    const g = testPlanet();
    expect(energyCapacity(p)).toBe(300);
    p.energy = 10;
    // The mine uses 10/h (the accumulator none, question 36), the core makes 5/h: the store
    // lasts 10 / 5 = 2 hours at full speed.
    run(p, g, 2);
    expect(p.energy).toBeCloseTo(0, 5);
    expect(p.stock.metal).toBeCloseTo(120, 4);
    const r = planetRates(p, g);
    expect(r.efficiency).toBeCloseTo(5 / 10);
    expect(r.made.metal).toBeCloseTo(60 * (5 / 10));
    // The core's trickle of other minerals does not need power.
    expect(r.made.titanium).toBeCloseTo(20);
  });

  it('processing follows the recipes and slows down to what flows in', () => {
    const p = owned([
      ['smelter', 1],
      ['mine', 2, 'metal'],
      ['renewable', 2],
      ['warehouse', 1],
    ]);
    const g = testPlanet();
    p.stock = { metal: 150, titanium: 60 };
    let r = planetRates(p, g);
    expect(r.made.alloy).toBeCloseTo(30);
    expect(r.used.metal).toBeCloseTo(60);
    expect(r.used.titanium).toBeCloseTo(30);
    // 60 titanium + 20/h from the core, using 30/h: empty after 6 h.
    run(p, g, 6);
    expect(p.stock.titanium).toBeCloseTo(0, 5);
    expect(p.stock.alloy).toBeCloseTo(180, 4);
    r = planetRates(p, g);
    expect(r.made.alloy).toBeCloseTo(20); // limited by the 20/h titanium trickle
    expect(r.net.titanium ?? 0).toBeCloseTo(0);
  });

  it('the reactor burns fissile material and stops when it runs out', () => {
    const p = owned([
      ['reactor', 1],
      ['mine', 1, 'metal'],
    ]);
    const g = testPlanet();
    p.stock = { fissile: 50 };
    let r = planetRates(p, g);
    expect(r.energyMade).toBeCloseTo(105);
    run(p, g, 5);
    expect(p.stock.fissile ?? 0).toBeCloseTo(0, 5);
    r = planetRates(p, g);
    expect(r.energyMade).toBeCloseTo(5);
  });

  it('an exhausted deposit stops its mine', () => {
    const g = testPlanet();
    g.deposits[0]!.pool = 90;
    const p = owned([
      ['mine', 1, 'metal'],
      ['renewable', 1],
    ]);
    run(p, g, 5);
    expect(g.deposits[0]!.pool).toBe(0);
    expect(p.stock.metal).toBeCloseTo(90);
    expect(planetRates(p, g).made.metal ?? 0).toBe(0);
  });

  it('10 hours in one step equal 600 one-minute steps', () => {
    const build = (): PlanetState => {
      const p = owned([
        ['mine', 2, 'metal'],
        ['mine', 1, 'titanium'],
        ['mine', 1, 'silicon'],
        ['mine', 1, 'deuterium'],
        ['smelter', 1],
        ['refinery', 1],
        ['workshop', 1],
        ['reactor', 1],
        ['renewable', 1],
        ['warehouse', 1],
        ['accumulator', 1],
      ]);
      p.stock = { fissile: 40, metal: 100 };
      p.energy = 60;
      return p;
    };
    const a = build();
    const ga = testPlanet();
    run(a, ga, 10);
    const b = build();
    const gb = testPlanet();
    for (let m = 1; m <= 600; m++) settlePlanet(b, gb, (m * H) / 60);
    for (const r of STORED_RESOURCES) expect(b.stock[r] ?? 0).toBeCloseTo(a.stock[r] ?? 0, 5);
    expect(b.energy).toBeCloseTo(a.energy, 5);
    expect(gb.deposits.map((d) => d.pool)).toEqual(
      ga.deposits.map((d) => expect.closeTo(d.pool, 5)),
    );
  });

  it('never produces negative numbers or NaN (random planets and times)', () => {
    const rng = Rng.fromSeed('fuzz');
    const kinds: [BuildingId, MinedResource?][] = [
      ['mine', 'metal'],
      ['mine', 'titanium'],
      ['mine', 'silicon'],
      ['mine', 'deuterium'],
      ['smelter'],
      ['refinery'],
      ['workshop'],
      ['reactor'],
      ['renewable'],
      ['warehouse'],
      ['accumulator'],
      ['shipyard'],
      ['scanner'],
    ];
    for (let i = 0; i < 200; i++) {
      const p = owned(
        kinds
          .filter(() => rng.chance(0.5))
          .map(([k, d]) => [k, rng.int(1, 6), d] as [BuildingId, number, MinedResource?]),
      );
      const g = testPlanet({ renewable: rng.chance(0.7) ? 'solar' : null });
      for (const d of g.deposits) d.pool = rng.int(0, 3000);
      for (const r of STORED_RESOURCES) if (rng.chance(0.3)) p.stock[r] = rng.range(0, 500);
      p.energy = rng.range(0, 100);
      let t = 0;
      for (let k = 0; k < 5; k++) {
        t += rng.range(0, 30) * H;
        settlePlanet(p, g, t);
        const cap = resourceCapacity(p);
        for (const r of STORED_RESOURCES) {
          const v = p.stock[r] ?? 0;
          expect(Number.isFinite(v) && v >= 0 && v <= cap + 1e-6).toBe(true);
        }
        expect(
          Number.isFinite(p.energy) && p.energy >= 0 && p.energy <= energyCapacity(p) + 1e-6,
        ).toBe(true);
        for (const d of g.deposits) expect(d.pool >= 0).toBe(true);
      }
    }
  });
});

describe('planets in the game state', () => {
  function setup(): GameState {
    let s = createGameState('econ');
    const planetId = s.world.galaxy.systems[s.world.galaxy.startSlots[0]!]!.planets[0]!;
    const steps: [Command, number][] = [
      [{ type: 'AddPlayer', playerId: 'p1', name: 'Player' }, 0],
      [{ type: 'DebugGivePlanet', playerId: 'p1', planetId }, 0],
      [{ type: 'DebugSetBuilding', planetId, kind: 'renewable', level: 1 }, 0],
      [{ type: 'DebugSetBuilding', planetId, kind: 'mine', level: 1, deposit: 'metal' }, H],
      [{ type: 'DebugAddResources', planetId, amounts: { titanium: 50 } }, 2 * H],
    ];
    for (const [c, t] of steps) {
      const out = applyCommand(s, c, t);
      expect(out.result).toEqual({ ok: true });
      s = out.state;
    }
    return s;
  }

  it('commands settle the planet before changing it', () => {
    const s = setup();
    const id = Object.keys(s.planets)[0]!;
    const p = s.planets[id]!;
    expect(p.updatedAt).toBe(2 * H);
    // 1 h of the core's trickle (20), then 1 h of the mine (60); the trickle stops once it stands.
    expect(p.stock.metal).toBeCloseTo(20 + 60);
    expect(p.stock.titanium).toBeCloseTo(40 + 50);
  });

  it('planetAt reads ahead without changing the state, and matches settling later', () => {
    const s = setup();
    const id = Object.keys(s.planets)[0]!;
    const before = JSON.stringify(s);
    const view = planetAt(s, id, 5 * H)!;
    expect(JSON.stringify(s)).toBe(before);
    const later = applyCommand(
      s,
      { type: 'DebugAddResources', planetId: id, amounts: {} },
      5 * H,
    ).state;
    expect(later.planets[id]!.stock).toEqual(view.planet.stock);
  });

  it('rejects bad debug commands with English messages', () => {
    const s = setup();
    const id = Object.keys(s.planets)[0]!;
    const out = applyCommand(
      s,
      { type: 'DebugSetBuilding', planetId: id, kind: 'mine', level: 1, deposit: 'exotic' },
      3 * H,
    );
    expect(out.result).toEqual({
      ok: false,
      error: { code: 'NO_DEPOSIT', message: 'A mine must stand on a deposit of this planet.' },
    });
    const taken = applyCommand(s, { type: 'DebugGivePlanet', playerId: 'p1', planetId: id }, 3 * H);
    expect(taken.result.ok).toBe(false);
  });
});
