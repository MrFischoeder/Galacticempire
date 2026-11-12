import { BATTLE } from '../config/combat';
import { RACES, type RaceId } from '../config/races';
import { UNITS, type SizeClass, type UnitId } from '../config/units';
import { Rng, rngStream } from '../core/rng';
import { effectiveUnit, type EffectiveUnit, type ModifierContext } from '../rules/modifiers';

/**
 * The battle engine (spec 11.1-11.2, step 2.1): a pure function of the two sides and a seed.
 * damage = A × A / (A + P) × class multiplier; each unit fires at `targets` random enemies per
 * round; excess damage is lost; both sides fire at once (except the Fortress's Bastion:
 * defences fire first); 8 rounds, then the attacker withdraws. Race mechanics: Wave (Swarm),
 * Flagship (Colossi), Bastion (Fortress); a starving home planet cuts the attack (ctx).
 */
import type { UnitCounts } from '../fleet/fleet';

export interface Combatant {
  readonly units: UnitCounts;
  readonly ctx: ModifierContext;
  /** Swarm: fleets that arrived within the wave window, 1 = this one alone (spec 3). */
  readonly waves?: number;
  /** Defending planet: structures that fire first with the Fortress's Bastion. */
  readonly defender?: boolean;
}

export interface Loss {
  readonly unit: UnitId;
  readonly count: number;
}

export interface RoundReport {
  readonly round: number;
  readonly attackerLosses: Loss[];
  readonly defenderLosses: Loss[];
}

export type BattleOutcome = 'attacker' | 'defender' | 'draw';

export interface BattleReport {
  readonly seed: string;
  readonly attacker: {
    readonly before: UnitCounts;
    readonly after: UnitCounts;
    readonly lost: UnitCounts;
  };
  readonly defender: {
    readonly before: UnitCounts;
    readonly after: UnitCounts;
    readonly lost: UnitCounts;
  };
  readonly rounds: RoundReport[];
  /** attacker: the defender is wiped out; defender: the attacker is; draw: both stand after 8 rounds (the attacker withdraws). */
  readonly outcome: BattleOutcome;
  /** Structure the repair ships restored after the battle, per side (spec 10.2). */
  readonly repaired: { readonly attacker: number; readonly defender: number };
}

/** One ship (or squad) in the fight. */
interface Ship {
  readonly unit: UnitId;
  readonly size: SizeClass;
  readonly maxHp: number;
  hp: number;
  readonly attack: number;
  readonly armor: number;
  readonly targets: number;
  readonly mult: Partial<Record<SizeClass | 'planet', number>>;
  readonly flagship: boolean;
  /** Fires before the others (Bastion). */
  readonly first: boolean;
}

interface Side {
  ships: Ship[];
  /** Multiplier on every shot (wave bonus, lost flagship). */
  attackMult: number;
  readonly race?: RaceId;
  readonly defender: boolean;
  flagLost?: boolean;
}

/** Damage of one shot (spec 11.1): never zero, armour cuts it. */
export function shotDamage(attack: number, armor: number, mult = 1): number {
  const a = attack * mult;
  if (a <= 0) return 0;
  return (a * a) / (a + Math.max(0, armor));
}

function buildSide(c: Combatant, mech: ReturnType<typeof mechanicOf>): Side {
  const race = c.ctx.race;
  const ships: Ship[] = [];
  const stats = new Map<UnitId, EffectiveUnit>();
  for (const [u, n] of Object.entries(c.units) as [UnitId, number][]) {
    if (!(n > 0)) continue;
    const e = effectiveUnit(u, c.ctx);
    stats.set(u, e);
    const spec = UNITS[u];
    for (let i = 0; i < n; i++)
      ships.push({
        unit: u,
        size: spec.size,
        maxHp: e.structure,
        hp: e.structure,
        attack: e.attack,
        armor: e.armor,
        targets: e.targets,
        mult: e.multipliers,
        flagship: false,
        first: c.defender === true && mech?.kind === 'bastion' && spec.category === 'defense',
      });
  }
  // Colossi flagship: the most valuable unit of the fleet, +50% structure and attack.
  if (mech?.kind === 'flagship' && ships.length > 0) {
    let best = ships[0] as Ship;
    for (const s of ships) if (UNITS[s.unit].value > UNITS[best.unit].value) best = s;
    const i = ships.indexOf(best);
    ships[i] = {
      ...best,
      maxHp: best.maxHp * (1 + mech.structureBonus),
      hp: best.maxHp * (1 + mech.structureBonus),
      attack: best.attack * (1 + mech.attackBonus),
      flagship: true,
    };
  }
  let attackMult = 1;
  if (mech?.kind === 'wave' && (c.waves ?? 1) > 1)
    attackMult *= 1 + Math.min(mech.maxBonus, mech.attackPerWave * ((c.waves ?? 1) - 1));
  return { ships, attackMult, ...(race ? { race } : {}), defender: c.defender === true };
}

function mechanicOf(ctx: ModifierContext) {
  return ctx.race ? RACES[ctx.race].mechanic : undefined;
}

function count(ships: readonly Ship[]): UnitCounts {
  const out: UnitCounts = {};
  for (const s of ships) if (s.hp > 0) out[s.unit] = (out[s.unit] ?? 0) + 1;
  return out;
}

function diff(before: UnitCounts, after: UnitCounts): UnitCounts {
  const out: UnitCounts = {};
  for (const [u, n] of Object.entries(before) as [UnitId, number][]) {
    const lost = n - (after[u] ?? 0);
    if (lost > 0) out[u] = lost;
  }
  return out;
}

/** Shots of one side at the other: damage is dealt at once (simultaneous volleys are summed first). */
function volley(from: Side, to: Side, rng: Rng, only: (s: Ship) => boolean): number[] {
  const alive = to.ships.filter((s) => s.hp > 0);
  const dmg = new Array<number>(to.ships.length).fill(0);
  if (alive.length === 0) return dmg;
  for (const s of from.ships) {
    if (s.hp <= 0 || !only(s) || s.attack <= 0) continue;
    for (let k = 0; k < s.targets; k++) {
      const t = rng.pick(alive);
      const m = s.mult[t.size] ?? 1;
      dmg[to.ships.indexOf(t)] =
        (dmg[to.ships.indexOf(t)] ?? 0) + shotDamage(s.attack * from.attackMult, t.armor, m);
    }
  }
  return dmg;
}

function apply(side: Side, dmg: number[]): void {
  side.ships.forEach((s, i) => {
    if (s.hp > 0 && (dmg[i] ?? 0) > 0) s.hp = Math.max(0, s.hp - (dmg[i] as number)); // excess is lost
  });
}

/** Colossi: the flagship is down, the rest lose attack for the rest of the battle. */
function checkFlagship(side: Side): void {
  const mech = side.race ? RACES[side.race].mechanic : undefined;
  if (mech?.kind !== 'flagship') return;
  const f = side.ships.find((s) => s.flagship);
  if (f && f.hp <= 0 && !side.flagLost) {
    side.flagLost = true;
    side.attackMult *= 1 - mech.lossAttackPenalty;
  }
}

/** Repair ships after the battle: 25% of the lost structure of the survivors (spec 10.2). */
function repair(side: Side): number {
  const ships = side.ships.filter((s) => s.hp > 0);
  if (!ships.some((s) => s.unit === 'repairShip')) return 0;
  let total = 0;
  for (const s of ships) {
    const back = (s.maxHp - s.hp) * BATTLE.repairAfterBattle;
    s.hp += back;
    total += back;
  }
  return total;
}

export function resolveBattle(
  attacker: Combatant,
  defender: Combatant,
  seed: string,
): BattleReport {
  const rng = rngStream(seed, 'battle');
  const a = buildSide(attacker, mechanicOf(attacker.ctx));
  const d = buildSide({ ...defender, defender: true }, mechanicOf(defender.ctx));
  const before = { a: count(a.ships), d: count(d.ships) };
  const rounds: RoundReport[] = [];
  const alive = (s: Side) => s.ships.some((x) => x.hp > 0);
  for (let r = 1; r <= BATTLE.rounds && alive(a) && alive(d); r++) {
    const aBefore = count(a.ships);
    const dBefore = count(d.ships);
    // Bastion: the defender's structures fire first and their kills do not fire back.
    const firstDmg = volley(d, a, rng, (s) => s.first);
    apply(a, firstDmg);
    const toD = volley(a, d, rng, () => true);
    const toA = volley(d, a, rng, (s) => !s.first);
    apply(d, toD);
    apply(a, toA);
    checkFlagship(a);
    checkFlagship(d);
    const aAfter = count(a.ships);
    const dAfter = count(d.ships);
    rounds.push({
      round: r,
      attackerLosses: (Object.entries(diff(aBefore, aAfter)) as [UnitId, number][]).map(
        ([unit, n]) => ({ unit, count: n }),
      ),
      defenderLosses: (Object.entries(diff(dBefore, dAfter)) as [UnitId, number][]).map(
        ([unit, n]) => ({ unit, count: n }),
      ),
    });
  }
  const outcome: BattleOutcome =
    !alive(d) && alive(a)
      ? 'attacker'
      : !alive(a) && alive(d)
        ? 'defender'
        : !alive(a) && !alive(d)
          ? 'draw'
          : 'draw';
  const repaired = { attacker: repair(a), defender: repair(d) };
  const after = { a: count(a.ships), d: count(d.ships) };
  return {
    seed,
    attacker: { before: before.a, after: after.a, lost: diff(before.a, after.a) },
    defender: { before: before.d, after: after.d, lost: diff(before.d, after.d) },
    rounds,
    outcome,
    repaired,
  };
}

/** Balance value of a fleet (spec 10.0), for tournaments and reports. */
export function fleetValue(units: UnitCounts): number {
  return (Object.entries(units) as [UnitId, number][]).reduce(
    (s, [u, n]) => s + UNITS[u].value * n,
    0,
  );
}

/**
 * Score of a battle from the attacker's point of view in -1..+1 (spec 10.6): the share of
 * value the defender lost minus the share the attacker lost.
 */
export function battleScore(r: BattleReport): number {
  const share = (side: BattleReport['attacker']) => {
    const v = fleetValue(side.before);
    return v > 0 ? fleetValue(side.lost) / v : 0;
  };
  return share(r.defender) - share(r.attacker);
}
