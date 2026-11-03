import { describe, expect, it } from 'vitest';
import {
  createGameState,
  GALAXY,
  generateGalaxy,
  nearestSystem,
  PLANET_TYPES,
  SPECIAL_RESOURCES,
  systemDistance,
  systemsFor,
  systemsWithin,
  type Galaxy,
} from '../src/index';

const SEEDS = Array.from({ length: 50 }, (_, i) => `seed-${i + 1}`);
const galaxies = SEEDS.map((s) => generateGalaxy(s));
const big = SEEDS.map((s) => generateGalaxy(s, { systems: systemsFor(12), startSlots: 12 }));

const allDistances = (g: Galaxy) =>
  g.systems.map((a) => g.systems.map((b) => systemDistance(g, a.id, b.id)));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('galaxy generator (spec 2.1-2.3)', () => {
  it('is deterministic: same seed = same galaxy, different seed = different galaxy', () => {
    expect(JSON.stringify(generateGalaxy('abc'))).toBe(JSON.stringify(generateGalaxy('abc')));
    expect(JSON.stringify(generateGalaxy('abc'))).not.toBe(JSON.stringify(generateGalaxy('abd')));
  });

  it('places 60 systems in a 100 LY disk at least 8 LY apart', () => {
    for (const g of galaxies) {
      expect(g.systems).toHaveLength(GALAXY.systems);
      for (const s of g.systems)
        expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(GALAXY.radius + 0.01);
      for (const a of g.systems) {
        for (const b of g.systems) {
          if (a.id < b.id)
            expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(GALAXY.minSpacing - 0.02);
        }
      }
    }
  });

  it('has no routes: distances are straight lines across the disk (owner 3.11.2026)', () => {
    expect(galaxies[0]).not.toHaveProperty('routes');
    const pairs = galaxies.map((g) => {
      const d = allDistances(g);
      return mean(d.flatMap((row, i) => row.slice(i + 1)));
    });
    // Mean distance between two random points of a 100 LY disk is about 90 LY.
    expect(mean(pairs)).toBeGreaterThan(80);
    expect(mean(pairs)).toBeLessThan(100);
    for (const g of galaxies) {
      for (const s of g.systems)
        expect(nearestSystem(g, s.id)!.ly).toBeGreaterThan(GALAXY.minSpacing - 0.02);
    }
    const g = galaxies[0]!;
    expect(systemDistance(g, 3, 7)).toBeCloseTo(systemDistance(g, 7, 3), 9);
    const within = systemsWithin(g, 0, 40);
    expect(within.every((x, i) => x.ly <= 40 && (i === 0 || within[i - 1]!.ly <= x.ly))).toBe(true);
  });

  it('systems have 3-7 planets with at least 3 different specialities; rich ones 5-7 with a rare type', () => {
    for (const g of galaxies) {
      for (const s of g.systems) {
        const planets = s.planets.map((id) => g.planets[id]!);
        expect(planets.length).toBeGreaterThanOrEqual(GALAXY.planets.min);
        expect(planets.length).toBeLessThanOrEqual(GALAXY.planets.max);
        expect(new Set(planets.map((p) => p.speciality ?? 'none')).size).toBeGreaterThanOrEqual(3);
        if (s.rich) {
          expect(planets.length).toBeGreaterThanOrEqual(GALAXY.richPlanets.min);
          expect(
            planets.some((p) => (GALAXY.rareTypes as readonly string[]).includes(p.type)),
          ).toBe(true);
        }
      }
    }
  });

  it('every planet has the four basic deposits; special deposits only where the type allows', () => {
    for (const g of galaxies) {
      for (const p of Object.values(g.planets)) {
        const basic = p.deposits.filter((d) =>
          ['metal', 'deuterium', 'titanium', 'silicon'].includes(d.resource),
        );
        expect(basic).toHaveLength(4);
        expect(p.fields).toBeGreaterThanOrEqual(p.starter ? 16 : 8);
        expect(p.fields).toBeLessThanOrEqual(p.starter ? 16 : 14);
        for (const d of p.deposits) {
          expect(d.pool).toBeGreaterThan(0);
          if ((SPECIAL_RESOURCES as readonly string[]).includes(d.resource)) {
            const allowed = PLANET_TYPES[p.type].specialisations.map((s) => s.resource);
            expect(allowed).toContain(d.resource);
          }
        }
        if (p.type === 'gasGiant') expect(PLANET_TYPES.gasGiant.housing).toBe(false);
      }
    }
  });

  it('a 12-player galaxy has 12 start slots at least 60 LY apart (spec 15)', () => {
    for (const g of big) {
      expect(g.startSlots).toHaveLength(12);
      const d = allDistances(g);
      for (const a of g.startSlots) {
        for (const b of g.startSlots)
          if (a !== b) expect(d[a]![b]!).toBeGreaterThanOrEqual(GALAXY.startSpacingLy);
      }
    }
    // The 60-system default fits at least 8 players.
    for (const g of galaxies) expect(g.startSlots.length).toBeGreaterThanOrEqual(8);
  });

  it('start systems hold a starting planet and an ice world or gas giant (spec 7)', () => {
    for (const g of [...galaxies, ...big]) {
      for (const slot of g.startSlots) {
        const planets = g.systems[slot]!.planets.map((id) => g.planets[id]!);
        const starter = planets.find((p) => p.starter);
        expect(starter?.fertility).toBeGreaterThanOrEqual(1);
        expect(starter?.renewable).not.toBeNull();
        expect(planets.some((p) => !p.starter && p.speciality === 'deuterium')).toBe(true);
      }
      expect(Object.values(g.planets).filter((p) => p.starter)).toHaveLength(g.startSlots.length);
    }
  });

  it(`within ${GALAXY.startSpecialLy} LY of every start: a radioactive planet and crystalite or helium-3`, () => {
    for (const g of [...galaxies, ...big]) {
      for (const slot of g.startSlots) {
        const near = Object.values(g.planets).filter(
          (p) => systemDistance(g, slot, p.system) <= GALAXY.startSpecialLy,
        );
        expect(near.some((p) => p.speciality === 'fissile')).toBe(true);
        expect(near.some((p) => p.speciality === 'crystalite' || p.speciality === 'helium3')).toBe(
          true,
        );
      }
    }
  });

  it('3-6 anomalies with exotic matter, far from the starts', () => {
    for (const g of [...galaxies, ...big]) {
      const anomalies = Object.values(g.planets).filter((p) => p.type === 'anomaly');
      expect(anomalies.length).toBeGreaterThanOrEqual(GALAXY.anomalies.min);
      expect(anomalies.length).toBeLessThanOrEqual(GALAXY.anomalies.max);
      for (const a of anomalies) expect(a.deposits.some((d) => d.resource === 'exotic')).toBe(true);
      const d = allDistances(g);
      const toStart = g.systems.map((s) => Math.min(...g.startSlots.map((st) => d[st]![s.id]!)));
      const sorted = [...toStart].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)]!;
      for (const a of anomalies) expect(toStart[a.system]!).toBeGreaterThanOrEqual(median);
    }
  });

  it('a new game state carries its galaxy', () => {
    const s = createGameState('world-1');
    expect(s.world.galaxy.systems).toHaveLength(GALAXY.systems);
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
