import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  RESOURCES,
  type ResourceAmounts,
  type ResourceId,
} from '@ge/shared';

/** Formatting for the Polish interface (pure, tested). */

/** "Dzień 3, 14:05" (day 1 starts at game time 0). */
export function formatGameTime(ms: number): string {
  const day = Math.floor(ms / MS_PER_DAY) + 1;
  const h = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const m = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  return `Dzień ${day}, ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** A duration: "45 s", "12 min", "2 h 05 min", "3 d 4 h". */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms)) return '∞';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h} h ${String(min % 60).padStart(2, '0')} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

export function formatAmount(n: number): string {
  const v = Math.floor(n + 1e-6);
  return v.toLocaleString('pl-PL');
}

/** "+12,5/h", "−3/h". */
export function formatRate(perHour: number): string {
  const abs = Math.abs(perHour);
  const text =
    abs >= 100
      ? Math.round(abs).toLocaleString('pl-PL')
      : abs.toLocaleString('pl-PL', { maximumFractionDigits: 1 });
  return `${perHour < 0 ? '−' : '+'}${text}/h`;
}

export const SHORT: Record<ResourceId, string> = {
  metal: 'metal',
  deuterium: 'lód',
  titanium: 'tytan',
  silicon: 'krzem',
  biomass: 'biomasa',
  fissile: 'rozpad.',
  crystalite: 'krystalit',
  helium3: 'hel-3',
  exotic: 'egzot.',
  fuel: 'paliwo',
  alloy: 'stopy',
  components: 'komp.',
};

/** "25 metal · 20 tytan · 15 krzem". */
export function formatCost(cost: ResourceAmounts): string {
  return (Object.entries(cost) as [ResourceId, number][])
    .filter(([, n]) => n > 0)
    .map(([r, n]) => `${formatAmount(n)} ${SHORT[r]}`)
    .join(' · ');
}

export const resourceName = (r: ResourceId) => RESOURCES[r].name;
