import { describe, expect, it } from 'vitest';
import {
  biomassCapacity,
  createPlanetState,
  housingCapacity,
  MS_PER_HOUR,
  planetRates,
  settlePlanet,
  staffing,
  type BuildingId,
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
    speciality: 'biomass',
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

function owned(
  buildings: [BuildingId, number, MinedResource?][] = [],
  population = 10,
): PlanetState {
  const p = createPlanetState('t-0', 'p1', 0, population);
  p.buildings = buildings.map(([kind, level, deposit]) => ({
    kind,
    level,
    ...(deposit ? { deposit } : {}),
  }));
  return p;
}

const run = (p: PlanetState, g: Planet, hours: number) =>
  settlePlanet(p, g, p.updatedAt + hours * H);

describe('population, workers and biomass (step 1.4b)', () => {
  it('the core shelters 10 people and feeds them exactly: no growth without a farm', () => {
    const p = owned();
    const g = testPlanet();
    const r = planetRates(p, g);
    expect(r.made.biomass).toBeCloseTo(5);
    expect(r.used.biomass).toBeCloseTo(5);
    expect(r.growth).toBe(0);
    expect(r.starving).toBe(false);
    run(p, g, 48);
    expect(p.population).toBe(10);
  });

  it('a farm and housing let the population grow (10%/h, at least 1/h) up to the housing', () => {
    const p = owned([
      ['farm', 1],
      ['renewable', 1],
      ['housing', 1],
    ]);
    const g = testPlanet();
    expect(housingCapacity(p, g)).toBe(30);
    expect(planetRates(p, g).growth).toBeCloseTo(1);
    run(p, g, 10);
    // 10% an hour compounds: about 10 x e = 26-27 after 10 hours.
    expect(p.population).toBeGreaterThanOrEqual(25);
    expect(p.population).toBeLessThanOrEqual(27);
    run(p, g, 30);
    expect(p.population).toBe(30); // stops at the housing
    expect(planetRates(p, g).growth).toBe(0);
  });

  it('growth is limited by how many newcomers the surplus can feed', () => {
    const p = owned(
      [
        ['farm', 1],
        ['renewable', 1],
        ['housing', 5],
      ],
      60,
    );
    p.buildings.push({ kind: 'silo', level: 1 });
    const g = testPlanet();
    // 30 + 5 made, 30 eaten: the surplus of 5 feeds 10 more people; 10% of 60 = 6/h.
    expect(planetRates(p, g).growth).toBeCloseTo(6);
    p.population = 66;
    // 35 made, 33 eaten: room for 4 more people at most, that is the rate per hour.
    expect(planetRates(p, g).growth).toBeCloseTo(4);
  });

  it('workers go to the farm first, then the mines; a short crew works in proportion', () => {
    const p = owned([
      ['mine', 1, 'metal'],
      ['mine', 1, 'titanium'],
      ['farm', 1],
      ['renewable', 2],
    ]);
    const g = testPlanet();
    expect(staffing(p)).toEqual([1, 0, 1, 1]);
    let r = planetRates(p, g);
    expect(r.made.metal).toBeCloseTo(60);
    expect(r.made.titanium ?? 0).toBe(0); // its mine stands idle and the core no longer gathers it
    p.population = 12;
    expect(staffing(p)).toEqual([1, 0.4, 1, 1]);
    r = planetRates(p, g);
    expect(r.made.titanium).toBeCloseTo(42 * 0.4);
  });

  it('starvation: with empty stores the population falls by 5% an hour', () => {
    const p = owned([['housing', 1]], 30);
    const g = testPlanet();
    const r = planetRates(p, g);
    expect(r.starving).toBe(true);
    expect(r.growth).toBeCloseTo(-1.5);
    expect(r.net.biomass ?? 0).toBe(0);
    run(p, g, 4);
    expect(p.population).toBeLessThan(30);
    expect(p.population).toBeGreaterThan(22);
    run(p, g, 200);
    // It falls until the core's 5 biomass feed everyone: 10 people.
    expect(p.population).toBe(10);
    expect(planetRates(p, g).starving).toBe(false);
  });

  it('stored biomass is eaten first; silos add to the core', () => {
    const p = owned(
      [
        ['housing', 1],
        ['silo', 1],
      ],
      30,
    );
    const g = testPlanet();
    expect(biomassCapacity(p)).toBe(400);
    p.stock.biomass = 100;
    // 15 eaten, 5 made: the store lasts 10 hours with nobody starving.
    run(p, g, 9.9);
    expect(p.population).toBe(30);
    run(p, g, 0.2);
    expect(p.stock.biomass ?? 0).toBe(0);
    expect(planetRates(p, g).starving).toBe(true);
  });

  it('a planet without fertility has no farm output and no core biomass', () => {
    const p = owned([
      ['farm', 1],
      ['renewable', 1],
    ]);
    const g = testPlanet({ fertility: 0, type: 'rocky' });
    const r = planetRates(p, g);
    expect(r.made.biomass ?? 0).toBe(0);
    expect(r.starving).toBe(true);
  });

  it('gas giants have no housing (spec 2.3)', () => {
    const p = owned([['housing', 3]]);
    expect(housingCapacity(p, testPlanet({ type: 'gasGiant' }))).toBe(10);
  });

  it('too many residents for the housing leave', () => {
    const p = owned(
      [
        ['farm', 2],
        ['renewable', 1],
      ],
      25,
    );
    const g = testPlanet();
    run(p, g, 30);
    expect(p.population).toBe(10);
  });

  it('Swarm residents eat 25% more (spec 3)', () => {
    const p = owned([], 10);
    const r = planetRates(p, testPlanet(), { race: 'swarm' });
    expect(r.used.biomass).toBeCloseTo(5);
    expect(r.starving).toBe(true);
  });

  it('one long step equals many short steps, residents included', () => {
    const build = () =>
      owned([
        ['farm', 2],
        ['renewable', 2],
        ['housing', 3],
        ['mine', 1, 'metal'],
        ['mine', 1, 'silicon'],
        ['smelter', 1],
      ]);
    const a = build();
    const ga = testPlanet();
    run(a, ga, 30);
    const b = build();
    const gb = testPlanet();
    for (let m = 1; m <= 30 * 12; m++) settlePlanet(b, gb, (m * H) / 12);
    expect(b.population).toBe(a.population);
    expect(b.growth).toBeCloseTo(a.growth, 6);
    for (const r of ['metal', 'silicon', 'alloy', 'biomass'] as const)
      expect(b.stock[r] ?? 0).toBeCloseTo(a.stock[r] ?? 0, 4);
  });
});
