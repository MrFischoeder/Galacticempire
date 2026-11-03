import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  catchUpDiscount,
  createGameState,
  MS_PER_HOUR,
  planetAt,
  planetRates,
  researchCost,
  researchHours,
  type Command,
  type GameState,
} from '../src/index';

const H = MS_PER_HOUR;

function setup(lab = 1): { s: GameState; id: string } {
  let s = createGameState('research');
  const id = s.world.galaxy.systems[s.world.galaxy.startSlots[0]!]!.planets[0]!;
  const cmds: Command[] = [
    { type: 'AddPlayer', playerId: 'p1', name: 'Gracz', race: 'merchants' },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: id },
    { type: 'DebugSetBuilding', planetId: id, kind: 'renewable', level: 1 },
    { type: 'DebugSetBuilding', planetId: id, kind: 'laboratory', level: lab },
    { type: 'DebugSetBuilding', planetId: id, kind: 'warehouse', level: 3 },
  ];
  for (const c of cmds) {
    const out = applyCommand(s, c, 0);
    expect(out.result).toEqual({ ok: true });
    s = out.state;
  }
  return { s, id };
}

function run(s: GameState, c: Command, at: number): { s: GameState; code: string } {
  const out = applyCommand(s, c, at);
  return { s: out.state, code: out.result.ok ? 'OK' : out.result.error.code };
}

describe('research costs and times (spec 9.3.3)', () => {
  it('matches the table for light weapons, with the branch resource from level 5', () => {
    expect(researchCost('lightWeapons', 1)).toEqual({ alloy: 120, components: 27 });
    expect(researchCost('lightWeapons', 3)).toEqual({ alloy: 347, components: 78 });
    expect(researchCost('lightWeapons', 5)).toMatchObject({
      alloy: 1002,
      components: 226,
      fissile: 20,
    });
    expect(researchCost('lightWeapons', 7)).toMatchObject({ alloy: 2897, components: 652 });
    const ten = researchCost('lightWeapons', 10);
    expect(ten).toMatchObject({ alloy: 14231, components: 3202 });
    expect(ten.exotic).toBeGreaterThan(0);
  });

  it('times: 30 min x 1.6 per level, -5% per laboratory level above 1', () => {
    expect(researchHours('mining', 1, 1)).toBeCloseTo(0.5);
    expect(researchHours('mining', 3, 1)).toBeCloseTo(1.28, 2);
    expect(researchHours('mining', 5, 1)).toBeCloseTo(3.28, 2);
    expect(researchHours('mining', 7, 1)).toBeCloseTo(8.39, 2);
    expect(researchHours('mining', 10, 1)).toBeCloseTo(34.4, 1);
    expect(researchHours('mining', 1, 3)).toBeCloseTo(0.45);
  });

  it('race discounts and catch-up (spec 9.3.5, 9.3.6)', () => {
    expect(researchCost('mining', 1, { race: 'merchants' }).alloy).toBe(Math.round(160 * 0.8));
    let s = createGameState('cu');
    s = applyCommand(s, { type: 'AddPlayer', playerId: 'a', name: 'A' }, 0).state;
    s = applyCommand(s, { type: 'AddPlayer', playerId: 'b', name: 'B' }, 0).state;
    s.players.b!.techs.mining = 2;
    expect(catchUpDiscount(s, 'a', 'mining')).toBe(0.3);
    expect(catchUpDiscount(s, 'b', 'mining')).toBe(0);
    s.players.b!.techs.mining = 6;
    expect(catchUpDiscount(s, 'a', 'mining')).toBe(0.5);
    expect(researchCost('mining', 1, {}, 0.5).alloy).toBe(80);
  });
});

describe('research jobs (step 1.6, owner rules 3.11.2026)', () => {
  it('takes the whole cost as soon as the planet has it and finishes when the time runs out', () => {
    const st = setup();
    const id = st.id;
    let s = st.s;
    s = run(
      s,
      { type: 'DebugAddResources', planetId: id, amounts: { alloy: 300, components: 100 } },
      0,
    ).s;
    const r = run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'mining' }, 0);
    expect(r.code).toBe('OK');
    s = r.s;
    expect(s.planets[id]!.research[0]!.cost).toEqual({ alloy: 128, components: 29 }); // Merchants: 20% off
    s = advanceTo(s, 0.25 * H);
    // Planets are settled lazily: read through planetAt.
    const mid = planetAt(s, id, s.time)!.planet;
    expect(mid.research[0]!.progress).toBeCloseTo(0.5, 3);
    expect(mid.research[0]!.paid).toEqual({ alloy: 128, components: 29 });
    expect(mid.stock.alloy).toBeCloseTo(300 - 128, 1);
    s = advanceTo(s, 0.5 * H + 1);
    expect(s.planets[id]!.research).toHaveLength(0);
    expect(s.players.p1!.techs.mining).toBe(1);
    expect(s.log.at(-1)?.text).toBe('Ukończono badanie: Technologie wydobycia poziom 1.');
  });

  it('without enough resources the time still runs; it ends once the rest is delivered', () => {
    const st = setup();
    const id = st.id;
    let s = st.s;
    s = run(
      s,
      { type: 'DebugAddResources', planetId: id, amounts: { alloy: 60, components: 100 } },
      0,
    ).s;
    s = run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'mining' }, 0).s;
    s = advanceTo(s, 3 * H);
    const waiting = planetAt(s, id, s.time)!.planet.research[0]!;
    expect(waiting.progress).toBe(1);
    expect(waiting.paid.alloy).toBeCloseTo(60, 3);
    expect(planetAt(s, id, s.time)!.planet.stock.alloy ?? 0).toBe(0);
    expect(s.players.p1!.techs.mining ?? 0).toBe(0);
    s = run(s, { type: 'DebugAddResources', planetId: id, amounts: { alloy: 100 } }, 3 * H).s;
    s = advanceTo(s, 4 * H);
    expect(s.players.p1!.techs.mining).toBe(1);
    expect(planetAt(s, id, s.time)!.planet.stock.alloy).toBeCloseTo(160 - 128, 1);
  });

  it('a researched technology changes production (mining +3%)', () => {
    const st = setup();
    const id = st.id;
    let s = st.s;
    s = run(
      s,
      { type: 'DebugSetBuilding', planetId: id, kind: 'mine', level: 1, deposit: 'metal' },
      0,
    ).s;
    const p = s.planets[id]!;
    const g = s.world.galaxy.planets[id]!;
    const base = planetRates({ ...p, stock: {} }, g, { race: 'merchants' }).made.metal!;
    const better = planetRates({ ...p, stock: {} }, g, { race: 'merchants', techs: { mining: 1 } })
      .made.metal!;
    expect(better / base).toBeCloseTo(1.03, 6);
  });

  it('rules: laboratory needed, its level limits the tech level, one slot (two from level 5)', () => {
    const st = setup(1);
    const id = st.id;
    let s = st.s;
    s = run(
      s,
      { type: 'DebugAddResources', planetId: id, amounts: { alloy: 600, components: 200 } },
      0,
    ).s;
    s = run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'drives' }, 0).s;
    expect(
      run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'drives' }, 0).code,
    ).toBe('ALREADY_RESEARCHING');
    expect(
      run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'sensors' }, 0).code,
    ).toBe('NO_SLOT');
    s = advanceTo(s, H);
    expect(s.players.p1!.techs.drives).toBe(1);
    s.players.p1!.techs.mining = 2;
    expect(
      run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'mining' }, H).code,
    ).toBe('LAB_TOO_LOW');
    s = run(s, { type: 'DebugSetBuilding', planetId: id, kind: 'laboratory', level: 5 }, H).s;
    s = run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'drives' }, H).s;
    expect(
      run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'sensors' }, H).code,
    ).toBe('OK');
  });

  it('a destroyed laboratory aborts the research and its payment is lost', () => {
    const st = setup();
    const id = st.id;
    let s = st.s;
    s = run(
      s,
      { type: 'DebugAddResources', planetId: id, amounts: { alloy: 300, components: 100 } },
      0,
    ).s;
    s = run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'mining' }, 0).s;
    s = run(
      s,
      { type: 'DebugSetBuilding', planetId: id, kind: 'laboratory', level: 0 },
      0.25 * H,
    ).s;
    expect(s.planets[id]!.research).toHaveLength(0);
    expect(s.planets[id]!.stock.alloy).toBeCloseTo(300 - 128, 1);
    expect(s.log.at(-1)?.text).toContain('Badanie przerwane');
    s = advanceTo(s, 2 * H);
    expect(s.players.p1!.techs.mining ?? 0).toBe(0);
    expect(
      run(s, { type: 'StartResearch', playerId: 'p1', planetId: id, tech: 'cargoHolds' }, 2 * H)
        .code,
    ).toBe('NO_LAB');
  });
});
