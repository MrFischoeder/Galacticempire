import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  createGameState,
  DEFENSE,
  defenceUnits,
  garrisonOf,
  getPlayerView,
  militia,
  MS_PER_HOUR,
  protectedUntil,
  shieldCapacity,
  shieldRegen,
  type Command,
  type GameState,
} from '../src/index';

const base = createGameState('defense');

function run(s: GameState, cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c, s.time);
    if (!r.result.ok) throw new Error(JSON.stringify(r.result));
    s = r.state;
  }
  return s;
}

/** Alice (attacker) and Bob (defender), both past the new-player protection. */
function setup(bobRace?: 'fortress') {
  let s = JSON.parse(JSON.stringify(base)) as GameState;
  const g = s.world.galaxy;
  const a = g.systems[g.startSlots[0]!]!.planets[0]!;
  const b = g.systems[g.startSlots[1]!]!.planets[0]!;
  s = run(s, [
    { type: 'AddPlayer', playerId: 'p1', name: 'Alice' },
    { type: 'AddPlayer', playerId: 'p2', name: 'Bob', ...(bobRace ? { race: bobRace } : {}) },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: a },
    { type: 'DebugGivePlanet', playerId: 'p2', planetId: b },
    { type: 'DebugSetBuilding', planetId: a, kind: 'warehouse', level: 5 },
    { type: 'DebugAddResources', planetId: a, amounts: { fuel: 3000 } },
  ]);
  s = advanceTo(s, DEFENSE.protectionMs + 1);
  return { s, a, b };
}

const attack = (from: string, to: string, units: Record<string, number>): Command => ({
  type: 'SendFleet',
  playerId: 'p1',
  from,
  to,
  units,
  mission: 'attack',
});

describe('planet defence (spec 11.3, step 2.2)', () => {
  it('layers: shield, structures (level = count), units at the planet; ground units and militia stay down', () => {
    const { s: s0, b } = setup();
    const s = run(s0, [
      { type: 'DebugSetBuilding', planetId: b, kind: 'shieldGenerator', level: 2 },
      { type: 'DebugSetBuilding', planetId: b, kind: 'defenseCannon', level: 3 },
      { type: 'DebugSetBuilding', planetId: b, kind: 'housing', level: 1 },
      { type: 'DebugSetBuilding', planetId: b, kind: 'housing', level: 1, nth: 2 },
      { type: 'DebugAddUnits', planetId: b, units: { fighter: 4, tank: 2 } },
    ]);
    const p = s.planets[b]!;
    expect(shieldCapacity(p)).toBeCloseTo(500 * 1.3, 6);
    expect(defenceUnits(p)).toEqual({ defenseCannon: 3 });
    expect(militia(p)).toBe(2);
    const g = garrisonOf(s, p);
    expect(g.units).toEqual({ defenseCannon: 3, fighter: 4 }); // tanks fight only on the ground
  });

  it('the shield regenerates 50/h, the Fortress 100/h, up to its capacity', () => {
    for (const [race, rate] of [
      [undefined, 50],
      ['fortress', 100],
    ] as const) {
      const { s: s0, b } = setup(race);
      let s = run(s0, [
        { type: 'DebugSetBuilding', planetId: b, kind: 'shieldGenerator', level: 1 },
      ]);
      expect(shieldRegen(s.planets[b]!, { ...(race ? { race } : {}) })).toBe(rate);
      s.planets[b]!.shield = 0;
      s = advanceTo(s, s.time + 2 * MS_PER_HOUR);
      expect(getPlayerView(s, 'p2')!.planets[0]!.shield).toBeCloseTo(2 * rate, 3);
      s = advanceTo(s, s.time + 48 * MS_PER_HOUR);
      expect(getPlayerView(s, 'p2')!.planets[0]!.shield).toBeCloseTo(500, 3);
    }
  });

  it('a battle starts when the enemy fleet arrives; the defender need not be there', () => {
    const { s: s0, a, b } = setup();
    let s = run(s0, [
      { type: 'DebugSetBuilding', planetId: b, kind: 'defenseCannon', level: 1 },
      { type: 'DebugAddUnits', planetId: b, units: { fighter: 5 } },
      { type: 'DebugAddUnits', planetId: a, units: { cruiser: 6 } },
      attack(a, b, { cruiser: 6 }),
    ]);
    const f = Object.values(s.fleets)[0]!;
    s = advanceTo(s, f.leg!.arriveAt);
    const bob = s.players.p2!;
    expect(bob.battles).toHaveLength(1);
    const rec = bob.battles[0]!;
    expect(rec.report.outcome).toBe('attacker');
    expect(s.planets[b]!.units).toEqual({});
    expect(s.planets[b]!.buildings.some((x) => x.kind === 'defenseCannon')).toBe(false);
    expect(s.players.p1!.battles).toHaveLength(1);
    expect(s.players.p1!.attackedAt).toBe(f.leg!.arriveAt);
    // The fleet turns home with its survivors.
    expect(s.fleets[f.id]!.phase).toBe('back');
    expect(getPlayerView(s, 'p2')!.log.some((l) => /Battle at/.test(l.text))).toBe(true);
  });

  it('units away from the planet do not defend it', () => {
    const { s: s0, a, b } = setup();
    const far = s0.world.galaxy.systems[s0.world.galaxy.startSlots[2]!]!.planets[0]!;
    let s = run(s0, [
      { type: 'DebugGivePlanet', playerId: 'p2', planetId: far },
      { type: 'DebugSetBuilding', planetId: b, kind: 'warehouse', level: 5 },
      { type: 'DebugAddResources', planetId: b, amounts: { fuel: 3000 } },
      { type: 'DebugAddUnits', planetId: b, units: { cruiser: 10 } },
      { type: 'DebugAddUnits', planetId: a, units: { fighter: 3 } },
      {
        type: 'SendFleet',
        playerId: 'p2',
        from: b,
        to: far,
        units: { cruiser: 10 },
        mission: 'transfer',
      },
      attack(a, b, { fighter: 3 }),
    ]);
    const raid = Object.values(s.fleets).find((x) => x.owner === 'p1')!;
    s = advanceTo(s, raid.leg!.arriveAt);
    const rec = s.players.p2!.battles[0]!;
    expect(rec.report.defender.before).toEqual({});
    expect(rec.report.outcome).toBe('attacker');
  });

  it('new players are protected for 48 h; attacking someone ends your own protection', () => {
    let s = JSON.parse(JSON.stringify(base)) as GameState;
    const g = s.world.galaxy;
    const a = g.systems[g.startSlots[0]!]!.planets[0]!;
    const b = g.systems[g.startSlots[1]!]!.planets[0]!;
    s = run(s, [
      { type: 'AddPlayer', playerId: 'p1', name: 'Alice' },
      { type: 'AddPlayer', playerId: 'p2', name: 'Bob' },
      { type: 'DebugGivePlanet', playerId: 'p1', planetId: a },
      { type: 'DebugGivePlanet', playerId: 'p2', planetId: b },
      { type: 'DebugSetBuilding', planetId: a, kind: 'warehouse', level: 5 },
      { type: 'DebugAddResources', planetId: a, amounts: { fuel: 3000 } },
      { type: 'DebugAddUnits', planetId: a, units: { fighter: 3 } },
    ]);
    expect(protectedUntil(s, 'p2')).toBe(DEFENSE.protectionMs);
    expect(applyCommand(s, attack(a, b, { fighter: 3 }), s.time).result).toMatchObject({
      ok: false,
      error: { code: 'PROTECTED' },
    });
    s = advanceTo(s, DEFENSE.protectionMs);
    s = run(s, [attack(a, b, { fighter: 3 })]);
    s = advanceTo(s, Object.values(s.fleets)[0]!.leg!.arriveAt);
    expect(protectedUntil(s, 'p1')).toBe(0); // Alice attacked: no more protection for her
  });

  it('an attack on an ally or a free planet is refused', () => {
    const { s: s0, a, b } = setup();
    const s = run(s0, [
      { type: 'DebugAddUnits', planetId: a, units: { fighter: 3 } },
      { type: 'CreateAlliance', playerId: 'p1', name: 'L' },
      { type: 'InviteToAlliance', playerId: 'p1', target: 'p2' },
      { type: 'AcceptAlliance', playerId: 'p2', allianceId: 'a1' },
    ]);
    expect(applyCommand(s, attack(a, b, { fighter: 3 }), s.time).result).toMatchObject({
      error: { code: 'ALLY' },
    });
    const free = s.world.galaxy.systems[s.world.galaxy.startSlots[2]!]!.planets[0]!;
    expect(applyCommand(s, attack(a, free, { fighter: 3 }), s.time).result).toMatchObject({
      error: { code: 'FREE_PLANET' },
    });
    const t = run(s, [
      { type: 'LeaveAlliance', playerId: 'p1' },
      { type: 'DebugAddUnits', planetId: a, units: { probe: 1 } },
    ]);
    expect(applyCommand(t, attack(a, b, { probe: 1 }), t.time).result).toMatchObject({
      error: { code: 'NO_WARSHIPS' },
    });
  });
});
