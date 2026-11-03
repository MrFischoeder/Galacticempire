import { describe, expect, it } from 'vitest';
import {
  createPlanetState,
  MS_PER_HOUR,
  planetRates,
  settlePlanet,
  STARTER_PLANET,
  type BuildingId,
  type MinedResource,
  type Planet,
} from '../packages/shared/src/index';
import { simulate } from '../tools/balance/economy';
import { standardPlan } from '../tools/balance/plan';

/**
 * The game engine (packages/shared/src/economy) must agree with the balance model that tuned
 * the numbers (tools/balance, docs/BALANS.md): replay the model's construction log on the
 * engine and compare the population and the mines' output.
 */
describe('engine agrees with the balance model (step 1.4b)', () => {
  const DAYS = 10;
  const model = simulate(standardPlan(), DAYS);

  const planet: Planet = {
    id: 'start',
    system: 0,
    name: 'Start I',
    type: STARTER_PLANET.type,
    orbit: 1,
    fields: STARTER_PLANET.fields,
    fertility: STARTER_PLANET.fertility,
    renewable: STARTER_PLANET.renewable,
    speciality: 'biomass',
    starter: true,
    deposits: (['metal', 'deuterium', 'titanium', 'silicon'] as const).map((m) => ({
      resource: m,
      class: STARTER_PLANET.deposits[m],
      pool: 1e7,
      initial: 1e7,
    })),
  };
  const p = createPlanetState('start', 'p1', 0);
  const samples: { day: number; engine: number; model: number }[] = [];
  const checkpoints = model.snapshots.filter((s) => s.day <= DAYS);

  const events = model.log
    .map((l) => {
      const m = /^done (\w+)(?:\((\w+)\))? -> (\d+)$/.exec(l.text);
      return m
        ? {
            t: l.t,
            kind: m[1] as BuildingId,
            deposit: m[2] as MinedResource | undefined,
            level: Number(m[3]),
          }
        : null;
    })
    .filter((e) => e !== null);

  let next = 0;
  for (const cp of checkpoints) {
    for (; next < events.length && events[next]!.t <= cp.day * 24; next++) {
      const e = events[next]!;
      settlePlanet(p, planet, e.t * MS_PER_HOUR);
      const same = p.buildings.filter((b) => b.kind === e.kind && b.deposit === e.deposit);
      if (e.level === 1) {
        p.buildings.push({ kind: e.kind, level: 1, ...(e.deposit ? { deposit: e.deposit } : {}) });
      } else {
        // Several renewables: the model raises one of the lowest level each time.
        const target = [...same]
          .sort((a, b) => a.level - b.level)
          .find((b) => b.level === e.level - 1);
        if (target) target.level = e.level;
      }
    }
    settlePlanet(p, planet, cp.day * 24 * MS_PER_HOUR);
    samples.push({ day: cp.day, engine: p.population, model: cp.pop });
  }

  it('replays every construction of the model', () => {
    expect(events.length).toBeGreaterThan(40);
    expect(next).toBe(events.filter((e) => e.t <= checkpoints.at(-1)!.day * 24).length);
  });

  it('population follows the model within 15%', () => {
    for (const s of samples) {
      expect(
        Math.abs(s.engine - s.model) / s.model,
        `day ${s.day}: ${s.engine} vs ${s.model}`,
      ).toBeLessThan(0.15);
    }
  });

  it('mine output at the end matches the model', () => {
    // The engine pays nothing for buildings here, so its stores are full; compare the mines'
    // output with empty stores (no throttling), as the model reports it.
    const r = planetRates({ ...p, stock: {} }, planet);
    const last = checkpoints.at(-1)!;
    for (const m of ['metal', 'titanium', 'silicon', 'deuterium'] as const) {
      expect(r.made[m] ?? 0).toBeLessThanOrEqual((last.perHour[m] ?? 0) + 1e-6);
      expect(r.made[m] ?? 0).toBeGreaterThan((last.perHour[m] ?? 0) * 0.5);
    }
  });
});
