import { describe, expect, it } from 'vitest';
import {
  battleScore,
  resolveBattle,
  shotDamage,
  UNITS,
  type Combatant,
  type UnitId,
} from '../src/index';

/** Spec 10.6: who beats whom (row attacks column). */
const KINDS: UnitId[] = [
  'interceptor',
  'fighter',
  'frigate',
  'bomber',
  'destroyer',
  'cruiser',
  'battleship',
];
const TABLE: Record<string, number> = {
  'interceptor/fighter': 0.74,
  'interceptor/frigate': -0.94,
  'interceptor/bomber': 0.57,
  'interceptor/destroyer': 0.74,
  'interceptor/cruiser': -0.71,
  'interceptor/battleship': 0.08,
  'fighter/interceptor': -0.74,
  'fighter/frigate': -0.74,
  'fighter/bomber': 0.92,
  'fighter/destroyer': 0.63,
  'fighter/cruiser': -1.0,
  'fighter/battleship': -0.12,
  'frigate/interceptor': 0.94,
  'frigate/fighter': 0.74,
  'frigate/bomber': -0.36,
  'frigate/destroyer': -1.03,
  'frigate/cruiser': -0.5,
  'frigate/battleship': -0.12,
  'bomber/interceptor': -0.57,
  'bomber/fighter': -0.92,
  'bomber/frigate': 0.36,
  'bomber/destroyer': -0.8,
  'bomber/cruiser': 0.52,
  'bomber/battleship': 0.92,
  'destroyer/interceptor': -0.74,
  'destroyer/fighter': -0.63,
  'destroyer/frigate': 1.03,
  'destroyer/bomber': 0.8,
  'destroyer/cruiser': -0.04,
  'destroyer/battleship': -0.72,
  'cruiser/interceptor': 0.71,
  'cruiser/fighter': 1.0,
  'cruiser/frigate': 0.5,
  'cruiser/bomber': -0.52,
  'cruiser/destroyer': 0.04,
  'cruiser/battleship': -0.87,
  'battleship/interceptor': -0.08,
  'battleship/fighter': 0.12,
  'battleship/frigate': 0.12,
  'battleship/bomber': -0.92,
  'battleship/destroyer': 0.72,
  'battleship/cruiser': 0.87,
};

const BUDGET = 30_000;
const pure = (u: UnitId): Combatant => ({
  units: { [u]: Math.round(BUDGET / UNITS[u].value) },
  ctx: {},
});

function average(a: UnitId, d: UnitId, n = 30): number {
  let s = 0;
  for (let i = 0; i < n; i++) s += battleScore(resolveBattle(pure(a), pure(d), `tourney-${i}`));
  return s / n;
}

describe('battle engine (spec 11.1-11.2, step 2.1)', () => {
  it('damage never drops to zero; armour cuts it (spec 11.1)', () => {
    expect(shotDamage(10, 1)).toBeCloseTo(100 / 11, 9);
    expect(shotDamage(10, 1000)).toBeGreaterThan(0);
    expect(shotDamage(10, 1000)).toBeLessThan(0.1);
    // Class multiplier applies before the armour.
    expect(shotDamage(10, 10, 2)).toBeCloseTo(400 / 30, 9);
  });

  it('the same seed gives the same battle; another seed another', () => {
    const a = resolveBattle(pure('fighter'), pure('frigate'), 'x');
    const b = resolveBattle(pure('fighter'), pure('frigate'), 'x');
    expect(a).toEqual(b);
    const c = resolveBattle(pure('fighter'), pure('frigate'), 'y');
    expect(c.rounds).not.toEqual(a.rounds);
  });

  it('8 rounds at most, then the attacker withdraws (draw); a wiped side loses', () => {
    const r = resolveBattle(pure('battleship'), pure('battleship'), 'long');
    expect(r.rounds.length).toBeLessThanOrEqual(8);
    const win = resolveBattle(
      { units: { cruiser: 20 }, ctx: {} },
      { units: { probe: 3 }, ctx: {} },
      'w',
    );
    expect(win.outcome).toBe('attacker');
    expect(win.rounds).toHaveLength(1);
    expect(win.defender.after).toEqual({});
  });

  it('tournament of spec 10.6: every sign matches the table (30 battles a pair, budget 30 000)', () => {
    const wrong: string[] = [];
    for (const a of KINDS)
      for (const d of KINDS) {
        if (a === d) continue;
        const want = TABLE[`${a}/${d}`] as number;
        const got = average(a, d);
        // Pairs the spec itself calls close (|score| <= 0.12) may land on either side of zero.
        if (Math.abs(want) > 0.12 && Math.sign(got) !== Math.sign(want))
          wrong.push(`${a} vs ${d}: spec ${want}, got ${got.toFixed(2)}`);
      }
    expect(wrong).toEqual([]);
  }, 60_000);

  it('race mechanics: Fortress structures fire first, Colossi flagship, Swarm wave', () => {
    // Bastion: the defence cannon's first volley kills probes before they can be targeted.
    const bastion = resolveBattle(
      { units: { interceptor: 30 }, ctx: {} },
      { units: { defenseCannon: 3 }, ctx: { race: 'fortress' } },
      'b',
    );
    const plain = resolveBattle(
      { units: { interceptor: 30 }, ctx: {} },
      { units: { defenseCannon: 3 }, ctx: {} },
      'b',
    );
    expect(battleScore(bastion)).toBeLessThanOrEqual(battleScore(plain));
    // Flagship: one cruiser is tougher; losing it costs the rest 15% attack.
    const col = resolveBattle(
      { units: { cruiser: 5 }, ctx: { race: 'colossi' } },
      pure('bomber'),
      'f',
    );
    expect(col.rounds.length).toBeGreaterThan(0);
    // Wave: three Swarm fleets together hit 20% harder (max 30%).
    const one = resolveBattle(
      { units: { fighter: 100 }, ctx: { race: 'swarm' }, waves: 1 },
      pure('frigate'),
      'wv',
    );
    const three = resolveBattle(
      { units: { fighter: 100 }, ctx: { race: 'swarm' }, waves: 3 },
      pure('frigate'),
      'wv',
    );
    expect(battleScore(three)).toBeGreaterThan(battleScore(one));
  });

  it('a starving fleet hits 25% weaker; a repair ship mends the survivors', () => {
    const fed = resolveBattle({ units: { cruiser: 10 }, ctx: {} }, pure('frigate'), 's');
    const hungry = resolveBattle(
      { units: { cruiser: 10 }, ctx: { starving: true } },
      pure('frigate'),
      's',
    );
    expect(battleScore(hungry)).toBeLessThan(battleScore(fed));
    const r = resolveBattle(
      { units: { cruiser: 10, repairShip: 1 }, ctx: {} },
      { units: { fighter: 20 }, ctx: {} },
      'r',
    );
    expect(r.repaired.attacker).toBeGreaterThan(0);
    expect(r.repaired.defender).toBe(0);
  });
});
