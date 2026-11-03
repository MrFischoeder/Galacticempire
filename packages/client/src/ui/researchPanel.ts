import {
  laboratoryLevel,
  RESEARCH,
  researchCost,
  researchHours,
  TECH_IDS,
  TECHS,
  techLimit,
  MS_PER_HOUR,
  type Player,
  type ResourceId,
} from '@ge/shared';
import type { PlanetView } from '../sim/protocol';
import { contextOf } from './planetPanel';
import { formatCost, formatDuration } from './format';
import { esc } from './html';

/** Research panel (spec 9.3): technologies, running jobs, start buttons for a lab planet. */
export function researchHTML(
  player: Player,
  planets: PlanetView[],
  labPlanetId: string | null,
): string {
  const lab =
    planets.find((v) => v.planet.id === labPlanetId && laboratoryLevel(v.planet) > 0) ??
    planets.find((v) => laboratoryLevel(v.planet) > 0);
  const ctx = contextOf(player);
  const jobs = planets.flatMap((v) =>
    v.planet.research.map((j) => ({ job: j, planet: v.info.name })),
  );
  const parts: string[] = ['<div class="panel-title">BADANIA</div>'];
  if (!lab)
    parts.push('<div class="dim">Brak laboratorium. Laboratorium wymaga stoczni poziomu 2.</div>');
  else
    parts.push(
      `<div class="dim">Laboratorium: ${esc(lab.info.name)} (poziom ${laboratoryLevel(lab.planet)}, badania do poziomu ${techLimit(laboratoryLevel(lab.planet))})</div>`,
    );
  for (const { job, planet } of jobs) {
    const paid = (Object.entries(job.cost) as [ResourceId, number][]).every(
      ([r, n]) => (job.paid[r] ?? 0) >= n - 1e-6,
    );
    parts.push(
      `<div class="job">${esc(TECHS[job.tech].name)} ${job.level} (${esc(planet)}): czas ${Math.round(job.progress * 100)}%${paid ? '' : ' · <span class="warn">czeka na zasoby</span>'}</div>`,
    );
  }
  const rows = TECH_IDS.map((tech) => {
    const level = player.techs[tech] ?? 0;
    const next = level + 1;
    const running = jobs.some((j) => j.job.tech === tech);
    let action = '';
    if (next > RESEARCH.maxLevel) action = '<span class="dim">maks.</span>';
    else if (running) action = '<span class="dim">trwa</span>';
    else if (lab) {
      const cost = formatCost(researchCost(tech, next, ctx));
      const time = formatDuration(
        researchHours(tech, next, laboratoryLevel(lab.planet)) * MS_PER_HOUR,
      );
      action = `<button data-action="research:${tech}:${lab.planet.id}">Badaj ${next}: ${esc(cost)} · ${time}</button>`;
    }
    return `<tr><td>${esc(TECHS[tech].name)}</td><td class="num">${level}</td><td>${action}</td></tr>`;
  }).join('');
  parts.push(`<table>${rows}</table>`);
  return parts.join('\n');
}
