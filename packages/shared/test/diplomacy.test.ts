import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  canAttack,
  createGameState,
  DIPLOMACY,
  getPlayerView,
  MS_PER_HOUR,
  type Command,
  type GameState,
} from '../src/index';

const base = createGameState('diplomacy');

function run(s: GameState, cmds: Command[]): GameState {
  for (const c of cmds) {
    const r = applyCommand(s, c, s.time);
    if (!r.result.ok) throw new Error(JSON.stringify(r.result));
    s = r.state;
  }
  return s;
}

/** Alice and Bob in one alliance, far apart. */
function setup(ally = true) {
  let s = JSON.parse(JSON.stringify(base)) as GameState;
  const g = s.world.galaxy;
  const a = g.systems[g.startSlots[0]!]!.planets[0]!;
  const b = g.systems[g.startSlots[1]!]!.planets[0]!;
  s = run(s, [
    { type: 'AddPlayer', playerId: 'p1', name: 'Alice' },
    { type: 'AddPlayer', playerId: 'p2', name: 'Bob' },
    { type: 'AddPlayer', playerId: 'p3', name: 'Carol' },
    { type: 'DebugGivePlanet', playerId: 'p1', planetId: a },
    { type: 'DebugGivePlanet', playerId: 'p2', planetId: b },
    { type: 'DebugSetBuilding', planetId: a, kind: 'warehouse', level: 5 },
    { type: 'DebugSetBuilding', planetId: b, kind: 'hangar', level: 2 },
    { type: 'DebugSetBuilding', planetId: b, kind: 'warehouse', level: 3 },
    { type: 'DebugAddResources', planetId: a, amounts: { fuel: 2000, metal: 1000 } },
    { type: 'DebugAddUnits', planetId: a, units: { transport: 1, fighter: 3 } },
  ]);
  if (ally)
    s = run(s, [
      { type: 'CreateAlliance', playerId: 'p1', name: 'Northern League' },
      { type: 'InviteToAlliance', playerId: 'p1', target: 'p2' },
      { type: 'AcceptAlliance', playerId: 'p2', allianceId: 'a1' },
    ]);
  return { s, a, b };
}

describe('alliances (spec 16, step 1.12)', () => {
  it('create, invite, accept; at most 6 members', () => {
    const { s } = setup();
    expect(s.alliances.a1!.members).toEqual(['p1', 'p2']);
    let t = s;
    for (let i = 4; i <= 8; i++)
      t = run(t, [{ type: 'AddPlayer', playerId: `p${i}`, name: `X${i}` }]);
    t = run(t, [
      { type: 'InviteToAlliance', playerId: 'p1', target: 'p3' },
      { type: 'InviteToAlliance', playerId: 'p1', target: 'p4' },
      { type: 'InviteToAlliance', playerId: 'p1', target: 'p5' },
      { type: 'InviteToAlliance', playerId: 'p1', target: 'p6' },
    ]);
    expect(DIPLOMACY.maxMembers).toBe(6);
    const r = applyCommand(t, { type: 'InviteToAlliance', playerId: 'p1', target: 'p7' }, t.time);
    expect(r.result).toMatchObject({ ok: false, error: { code: 'ALLIANCE_FULL' } });
  });

  it('members see the planets and map of each other; after leaving they do not', () => {
    const { s: s0, a, b } = setup();
    const sysB = s0.world.galaxy.planets[b]!.system;
    let v = getPlayerView(s0, 'p1')!;
    expect(v.allyPlanets.map((p) => p.id)).toEqual([b]);
    expect(v.known).toContain(sysB);
    expect(JSON.stringify(v)).toContain(b);
    // Carol, outside the alliance, sees nothing of Bob.
    expect(JSON.stringify(getPlayerView(s0, 'p3')!)).not.toContain(`"${b}"`);
    const s = run(s0, [{ type: 'LeaveAlliance', playerId: 'p1' }]);
    v = getPlayerView(s, 'p1')!;
    expect(v.allyPlanets).toEqual([]);
    // The discovered map stays: Bob's system is still known, his planet's details are not.
    expect(v.known).toContain(sysB);
    expect(v.scans[b]).toBeUndefined();
    expect(v.chart.planets[b]!.deposits).toEqual([]);
    expect(getPlayerView(s, 'p2')!.allyPlanets).toEqual([]);
    expect(a).toBeTruthy();
  });

  it('transports to an ally unload into the stores of the ally', () => {
    const { s: s0, a, b } = setup();
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: a,
        to: b,
        units: { transport: 1 },
        mission: 'transport',
        cargo: { metal: 300 },
      },
    ]);
    const before = s.planets[b]!.stock.metal ?? 0;
    s = advanceTo(s, Object.values(s.fleets)[0]!.leg!.arriveAt);
    // The ally's core keeps gathering during the flight: at least the cargo arrived.
    expect((s.planets[b]!.stock.metal ?? 0) - before).toBeGreaterThanOrEqual(300);
    const { s: lone, a: a2, b: b2 } = setup(false);
    const r = applyCommand(
      lone,
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: a2,
        to: b2,
        units: { transport: 1 },
        mission: 'transport',
        cargo: { metal: 300 },
      },
      lone.time,
    );
    expect(r.result).toMatchObject({ ok: false, error: { code: 'NOT_YOUR_TARGET' } });
  });

  it('a defence fleet stations at the ally and goes home when the alliance ends', () => {
    const { s: s0, a, b } = setup();
    let s = run(s0, [
      {
        type: 'SendFleet',
        playerId: 'p1',
        from: a,
        to: b,
        units: { fighter: 3 },
        mission: 'defend',
      },
    ]);
    s = advanceTo(s, Object.values(s.fleets)[0]!.leg!.arriveAt);
    const f = Object.values(s.fleets)[0]!;
    expect(f.phase).toBe('stationed');
    // It is still fed by its home (spec 10.4).
    expect(s.planets[a]!.away.fighter).toBe(3);
    s = run(s, [{ type: 'LeaveAlliance', playerId: 'p2' }]);
    const g = s.fleets[f.id]!;
    expect(g.phase).toBe('back');
    s = advanceTo(s, g.leg!.arriveAt);
    expect(s.fleets).toEqual({});
    expect(s.planets[a]!.orbit.fighter).toBe(3);
    expect(s.log.some((l) => l.who === 'p1' && /alliance is over/.test(l.text))).toBe(true);
  });

  it('an attack on an ally or a pact partner is refused (ready for phase 2)', () => {
    const { s } = setup();
    expect(canAttack(s, 'p1', 'p2')).toMatchObject({ ok: false, error: { code: 'ALLY' } });
    expect(canAttack(s, 'p1', 'p3').ok).toBe(true);
  });
});

describe('non-aggression pacts (question 34)', () => {
  it('offer, accept; breaking it takes 12 h', () => {
    const { s: s0 } = setup(false);
    let s = run(s0, [
      { type: 'ProposePact', playerId: 'p1', target: 'p3' },
      { type: 'AcceptPact', playerId: 'p3', from: 'p1' },
    ]);
    expect(canAttack(s, 'p3', 'p1')).toMatchObject({ ok: false, error: { code: 'PACT' } });
    s = run(s, [{ type: 'BreakPact', playerId: 'p1', other: 'p3' }]);
    s = advanceTo(s, s.time + 12 * MS_PER_HOUR - 1);
    expect(canAttack(s, 'p3', 'p1').ok).toBe(false);
    s = advanceTo(s, s.time + 2);
    expect(canAttack(s, 'p3', 'p1').ok).toBe(true);
    expect(Object.keys(s.pacts)).toEqual([]);
  });
});

describe('colonizing next to others (question 34, spec 16)', () => {
  it('a system controlled by an ally or a pact partner can be colonized', () => {
    const { s: s0, a } = setup(false);
    let s = run(s0, [{ type: 'DebugAddUnits', planetId: a, units: { colonizer: 1 } }]);
    const g = s.world.galaxy;
    const sys = g.systems.find(
      (x) => x.planets.length >= 3 && !x.planets.some((id) => s.planets[id]),
    )!;
    const [free, ...rest] = sys.planets;
    for (const id of rest.slice(0, Math.ceil(sys.planets.length / 2)))
      s = run(s, [{ type: 'DebugGivePlanet', playerId: 'p3', planetId: id }]);
    const send = (t: GameState) =>
      applyCommand(
        t,
        {
          type: 'SendFleet',
          playerId: 'p1',
          from: a,
          to: free!,
          units: { colonizer: 1 },
          mission: 'colonize',
        },
        t.time,
      ).result;
    expect(send(s)).toMatchObject({ ok: false, error: { code: 'SYSTEM_CONTROLLED' } });
    const withPact = run(s, [
      { type: 'ProposePact', playerId: 'p1', target: 'p3' },
      { type: 'AcceptPact', playerId: 'p3', from: 'p1' },
    ]);
    expect(send(withPact).ok).toBe(true);
  });
});
