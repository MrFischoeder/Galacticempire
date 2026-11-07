import { describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { reportMarkdown, simulate } from '../tools/sim/simulate';

/** Step 1.13: bots play through the player view only; the economy must hold for 14 days. */
describe('headless simulation (step 1.13)', () => {
  const report = simulate({ days: 14, players: 6, seed: '1' }, () => performance.now());

  it('6 bots play 14 days without errors, NaN or negative values', () => {
    expect(report.players).toHaveLength(6);
    expect(report.problems).toEqual([]);
    expect(Object.keys(report.rejectedCodes)).toEqual([]);
    for (const p of report.players) {
      expect(p.buildingLevels).toBeGreaterThan(40);
      expect(p.population).toBeGreaterThan(30);
      expect(Number.isFinite(p.mined)).toBe(true);
      for (const v of Object.values(p.bottlenecks)) expect(v).toBeGreaterThanOrEqual(0);
    }
    // Every bot founds a colony within the two weeks.
    expect(report.players.every((p) => p.planets > 1)).toBe(true);
  }, 120_000);

  it('the same seed gives the same game', () => {
    const again = simulate({ days: 14, players: 6, seed: '1' });
    expect(again.digest).toBe(report.digest);
    expect(again.players.map((p) => p.planets)).toEqual(report.players.map((p) => p.planets));
    const other = simulate({ days: 3, players: 2, seed: '2' });
    expect(other.digest).not.toBe(report.digest);
  }, 120_000);

  it('the report gives the running time', () => {
    expect(report.ms).toBeGreaterThan(0);
    expect(reportMarkdown(report)).toMatch(/Czas wykonania: \*\*[\d.]+ s\*\*/);
  });
});
