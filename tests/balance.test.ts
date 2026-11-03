import { describe, expect, it } from 'vitest';
import { simulate } from '../tools/balance/economy';
import { standardPlan } from '../tools/balance/plan';

/** Guards the accepted pacing (docs/BALANS.md): config changes that break it fail here. */
describe('economy balance (step 1.2b)', () => {
  const r = simulate(standardPlan(), 14);
  const at = (key: string) => r.milestones[key] ?? Infinity;

  it('the first building starts within 2 hours of the empty start', () => {
    expect(at('first building started')).toBeGreaterThan(0.3);
    expect(at('first building started')).toBeLessThan(2);
  });

  it('five buildings in under 8 hours, shipyard and a fighter within 2.5 days', () => {
    expect(at('5 buildings')).toBeLessThan(8);
    expect(at('built:shipyard')).toBeLessThan(60);
    expect(at('first fighter affordable')).toBeLessThan(60);
  });

  it('all 16 fields used within 3 days, basic caps after 6-14 days', () => {
    expect(at('all fields used')).toBeLessThan(72);
    expect(at('every building at its basic cap')).toBeGreaterThan(6 * 24);
    expect(at('every building at its basic cap')).toBeLessThan(14 * 24);
  });

  it('a careful player rarely runs short of energy or hands', () => {
    expect(r.hours.energyShort).toBeLessThan(12);
    expect(r.hours.workersShort).toBeLessThan(24);
  });
});

describe('many planets (step 1.2b)', () => {
  const capWith = (imports: number) =>
    simulate(standardPlan(), 21, { colony: true, importPerHour: imports }).milestones[
      'every building at its basic cap'
    ] ?? Infinity;

  it('a colony supported by the empire develops faster, never instantly', () => {
    const alone = capWith(0);
    const two = capWith(120);
    const four = capWith(240);
    const unlimited = capWith(1e6);
    expect(two).toBeLessThan(alone * 0.75);
    expect(four).toBeLessThan(two);
    expect(unlimited).toBeLessThanOrEqual(four);
    // The one-at-a-time build queue and population growth keep a floor of about 2-4 days.
    expect(unlimited).toBeGreaterThan(2 * 24);
    expect(unlimited).toBeLessThan(4 * 24);
  });
});
