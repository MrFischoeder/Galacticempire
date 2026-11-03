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
