import { enqueue } from '../core/queue';
import type { GameState } from '../core/state';
import { galaxyPlanet, ownerContext } from './access';
import { planetRates } from './planet';
import { etaHours, STALLED_RECHECK } from './research';
import { MS_PER_HOUR } from '../config/time';

/**
 * Schedules the next look at a research job: at its expected end at the current speed, or
 * after STALLED_RECHECK while it cannot pay. The planet must be settled to state.time.
 */
export function scheduleResearchCheck(state: GameState, planetId: string, jobId: string): void {
  const p = state.planets[planetId];
  const job = p?.research.find((j) => j.id === jobId);
  if (!p || !job) return;
  const rates = planetRates(p, galaxyPlanet(state, planetId), ownerContext(state, p));
  const eta = etaHours(job, rates.research[jobId] ?? 0);
  const at =
    state.time +
    (Number.isFinite(eta) ? Math.max(1, Math.ceil(eta * MS_PER_HOUR)) : STALLED_RECHECK);
  job.checkAt = at;
  enqueue(state.events, at, { type: 'ResearchCheck', planetId, jobId });
}
