import { BUILDINGS } from '../config/buildings';
import type { ResourceAmounts, ResourceId } from '../config/resources';
import { MS_PER_HOUR } from '../config/time';
import { RESEARCH, TECHS, type TechId } from '../config/techs';
import { fail, OK, type Result } from '../core/result';
import type { GameState, PlayerId } from '../core/state';
import { researchCostMultiplier, type ModifierContext } from '../rules/modifiers';
import type { PlanetState, ResearchJob } from './planet';

/** Research (spec 9.3), step 1.6. Jobs run on a planet with a laboratory (economy/planet.ts). */

export function laboratoryLevel(p: PlanetState): number {
  return Math.max(
    0,
    ...p.buildings
      .filter((b) => BUILDINGS[b.kind].effect.kind === 'laboratory')
      .map((b) => b.level),
  );
}

function labEffect() {
  const e = BUILDINGS.laboratory.effect;
  if (e.kind !== 'laboratory') throw new Error('laboratory effect');
  return e;
}

/** Highest technology level a laboratory allows: 2 x its level (spec 9.3.1). */
export const techLimit = (labLevel: number) =>
  Math.min(RESEARCH.maxLevel, labEffect().techLimitPerLevel * labLevel);

/** Research slots of a player: 1, or 2 with a laboratory at level 5 or more (spec 9.3.1). */
export function researchSlots(state: Readonly<GameState>, playerId: PlayerId): number {
  const best = Math.max(
    0,
    ...Object.values(state.planets)
      .filter((p) => p.owner === playerId)
      .map(laboratoryLevel),
  );
  return best >= labEffect().secondSlotLevel ? 2 : 1;
}

export function playerJobs(
  state: Readonly<GameState>,
  playerId: PlayerId,
): { planetId: string; job: ResearchJob }[] {
  const out: { planetId: string; job: ResearchJob }[] = [];
  for (const p of Object.values(state.planets)) {
    if (p.owner !== playerId) continue;
    for (const job of p.research) out.push({ planetId: p.id, job });
  }
  return out;
}

/**
 * Catch-up discount (spec 9.3.5): below the average level of the active players 30% off cost
 * and time, 3 or more levels below 50% off. In single player the average counts every faction.
 */
export function catchUpDiscount(
  state: Readonly<GameState>,
  playerId: PlayerId,
  tech: TechId,
): number {
  const players = Object.values(state.players);
  if (players.length < 2) return 0;
  const mine = state.players[playerId]?.techs[tech] ?? 0;
  const average = players.reduce((s, pl) => s + (pl.techs[tech] ?? 0), 0) / players.length;
  if (average - mine >= RESEARCH.catchUp.bigGapLevels) return RESEARCH.catchUp.bigGapDiscount;
  if (mine < average) return RESEARCH.catchUp.discount;
  return 0;
}

/** Cost of a technology level (spec 9.3.3) with the branch special resource from level 5. */
export function researchCost(
  tech: TechId,
  level: number,
  ctx: ModifierContext = {},
  discount = 0,
): ResourceAmounts {
  const k = RESEARCH.costGrowth ** (level - 1) * researchCostMultiplier(tech, ctx) * (1 - discount);
  const cost: ResourceAmounts = {};
  for (const [r, n] of Object.entries(TECHS[tech].cost) as [ResourceId, number][])
    cost[r] = Math.round(n * k);
  if (level >= RESEARCH.specialFromLevel) {
    const r = TECHS[tech].special;
    cost[r] = Math.round(
      RESEARCH.specialBase *
        RESEARCH.specialGrowth ** (level - RESEARCH.specialFromLevel) *
        (1 - discount),
    );
  }
  if (level >= RESEARCH.exoticFromLevel) {
    cost.exotic = Math.round(
      RESEARCH.exoticBase *
        RESEARCH.specialGrowth ** (level - RESEARCH.exoticFromLevel) *
        (1 - discount),
    );
  }
  return cost;
}

/** Full-speed research time in hours (spec 9.3.3): -5% per laboratory level above 1. */
export function researchHours(tech: TechId, level: number, labLevel: number, discount = 0): number {
  void tech;
  const minutes = RESEARCH.firstLevelMinutes * RESEARCH.timeGrowth ** (level - 1);
  const labCut = 1 - labEffect().timeCutPerLevel * Math.max(0, labLevel - 1);
  return (minutes * labCut * (1 - discount)) / 60;
}

export function canStartResearch(
  state: Readonly<GameState>,
  playerId: PlayerId,
  planetId: string,
  tech: TechId,
): Result {
  const p = state.planets[planetId];
  if (!p) return fail('NOT_OWNED', 'This planet has no owner.');
  if (p.owner !== playerId) return fail('NOT_YOURS', 'This is not your planet.');
  if (!TECHS[tech]) return fail('NO_TECH', 'No such technology.');
  const lab = laboratoryLevel(p);
  if (lab === 0) return fail('NO_LAB', 'Research needs a laboratory on this planet.');
  const jobs = playerJobs(state, playerId);
  if (jobs.some((j) => j.job.tech === tech))
    return fail('ALREADY_RESEARCHING', 'This technology is already being researched.');
  if (jobs.length >= researchSlots(state, playerId)) {
    return fail(
      'NO_SLOT',
      'All research slots are busy (a second one comes with a level 5 laboratory).',
    );
  }
  const level = (state.players[playerId]?.techs[tech] ?? 0) + 1;
  if (level > RESEARCH.maxLevel)
    return fail('MAX_LEVEL', 'This technology is already at its highest level.');
  if (level > techLimit(lab)) {
    return fail(
      'LAB_TOO_LOW',
      `A level ${lab} laboratory allows research up to level ${techLimit(lab)}.`,
    );
  }
  return OK;
}

/** Adds the job (validated, planet settled to `now`). */
export function startResearch(
  state: GameState,
  playerId: PlayerId,
  planetId: string,
  tech: TechId,
  now: number,
  ctx: ModifierContext,
): ResearchJob {
  const p = state.planets[planetId] as PlanetState;
  const level = (state.players[playerId]?.techs[tech] ?? 0) + 1;
  const discount = catchUpDiscount(state, playerId, tech);
  const job: ResearchJob = {
    id: `${tech}:${level}`,
    tech,
    level,
    cost: researchCost(tech, level, ctx, discount),
    hours: researchHours(tech, level, laboratoryLevel(p), discount),
    startedAt: now,
    progress: 0,
    paid: {},
  };
  p.research.push(job);
  return job;
}

/**
 * Moves finished jobs into the owner's technologies. A job whose laboratory is gone (destroyed)
 * is aborted and what it paid is lost (owner 3.11.2026). Returns the finished jobs.
 */
export function finalizeResearch(state: GameState, planetId: string): ResearchJob[] {
  const p = state.planets[planetId];
  if (!p) return [];
  if (p.research.length > 0 && laboratoryLevel(p) === 0) {
    for (const job of p.research) {
      state.log.push({
        at: state.time,
        who: p.owner,
        text: `Research aborted (no laboratory): ${TECHS[job.tech].name} level ${job.level}. The resources paid are lost.`,
      });
    }
    p.research = [];
    return [];
  }
  const done = p.research.filter((j) => j.doneAt !== undefined);
  if (done.length === 0) return done;
  p.research = p.research.filter((j) => j.doneAt === undefined);
  const player = state.players[p.owner];
  for (const job of done) {
    if (player) player.techs[job.tech] = Math.max(player.techs[job.tech] ?? 0, job.level);
    state.log.push({
      at: job.doneAt ?? state.time,
      who: p.owner,
      text: `Research complete: ${TECHS[job.tech].name} level ${job.level}.`,
    });
  }
  return done;
}

/**
 * Hours until a job is done at the current rates: its time runs out and its cost is paid
 * (Infinity while it waits for resources that do not come in).
 */
export function etaHours(
  job: ResearchJob,
  perHour: number,
  pay: Partial<Record<ResourceId, number>> = {},
): number {
  let eta = job.progress >= 1 ? 0 : perHour > 0 ? (1 - job.progress) / perHour : Infinity;
  for (const [r, n] of Object.entries(job.cost) as [ResourceId, number][]) {
    const left = n - (job.paid[r] ?? 0);
    if (left <= 1e-6) continue;
    const rate = pay[r] ?? 0;
    eta = Math.max(eta, rate > 0 ? left / rate : Infinity);
  }
  return eta;
}

/** While a job is stalled the game looks at it again after this long. */
export const STALLED_RECHECK = MS_PER_HOUR;
