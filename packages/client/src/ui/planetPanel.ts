import {
  BUILDING_IDS,
  BUILDINGS,
  biomassCapacity,
  buildingCost,
  buildingTime,
  canStartBuilding,
  canStartUpgrade,
  constructionLeft,
  energyCapacity,
  fieldsUsed,
  PLANET_TYPES,
  resourceCapacity,
  STORED_RESOURCES,
  type BuildingId,
  type MinedResource,
  type ModifierContext,
  type Planet,
  type Player,
  type ResourceId,
  type SlotContent,
} from '@ge/shared';
import type { PlanetView } from '../sim/protocol';
import { shipyardHTML } from './shipyardPanel';
import { esc } from './html';
import {
  formatAmount,
  formatCost,
  formatDuration,
  formatRate,
  resourceName,
  SHORT,
} from './format';

/** Errors that only say "this building does not belong here": such options are not listed. */
const HIDDEN = new Set(['UNIQUE', 'MAX_COUNT', 'GAS_GIANT', 'NO_RENEWABLE', 'NO_DEPOSIT']);

export interface BuildOption {
  readonly kind: BuildingId;
  readonly deposit?: MinedResource;
  readonly label: string;
  readonly cost: string;
  readonly time: string;
  readonly ok: boolean;
  readonly reason: string;
}

export const contextOf = (player: Player): ModifierContext => ({
  ...(player.race ? { race: player.race } : {}),
  techs: player.techs,
});

/** What can be put up on the planet now (with the reason when not). */
export function buildOptions(view: PlanetView, ctx: ModifierContext, slot?: number): BuildOption[] {
  const out: BuildOption[] = [];
  for (const kind of BUILDING_IDS) {
    const deposits: (MinedResource | undefined)[] =
      BUILDINGS[kind].effect.kind === 'mine'
        ? view.info.deposits.map((d) => d.resource)
        : [undefined];
    for (const deposit of deposits) {
      const check = canStartBuilding(view.planet, view.info, kind, deposit, ctx, slot);
      if (!check.ok && HIDDEN.has(check.error.code)) continue;
      out.push({
        kind,
        ...(deposit ? { deposit } : {}),
        label: deposit
          ? `${BUILDINGS[kind].name}: ${resourceName(deposit).toLowerCase()}`
          : BUILDINGS[kind].name,
        cost: formatCost(buildingCost(kind, 1, ctx)),
        time: formatDuration(buildingTime(kind, 1)),
        ok: check.ok,
        reason: check.ok ? '' : check.error.message,
      });
    }
  }
  return out;
}

function planetFacts(info: Planet): string {
  const t = PLANET_TYPES[info.type];
  const facts = [
    t.name,
    `fertility ${info.fertility}`,
    info.renewable
      ? `energy: ${{ solar: 'solar', wind: 'wind', geothermal: 'geothermal' }[info.renewable]}`
      : 'no renewable energy',
  ];
  return facts.join(' · ');
}

function depositRows(info: Planet): string {
  return info.deposits
    .map((d) => {
      const cls = { poor: 'poor', average: 'average', rich: 'rich' }[d.class];
      return `<tr><td>${esc(resourceName(d.resource))}</td><td>${cls}</td><td class="num">${formatAmount(d.pool)} / ${formatAmount(d.initial)}</td></tr>`;
    })
    .join('');
}

/** A planet that is not ours: what is known about it. */
export function foreignPlanetHTML(info: Planet): string {
  return `<div class="panel-title">${esc(info.name)}</div>
<div class="dim">${esc(planetFacts(info))} · ${info.fields} fields</div>
<div class="section">Deposits</div><table>${depositRows(info)}</table>`;
}

/** Resources, energy, people and the construction going on (top of the planet panels). */
export function planetStatusHTML(view: PlanetView): string {
  const { planet: p, info, rates } = view;
  const cap = resourceCapacity(p);
  const parts: string[] = [];
  parts.push(`<div class="panel-title">${esc(info.name)}</div>
<div class="dim">${esc(planetFacts(info))} · fields ${fieldsUsed(p)}/${info.fields}</div>`);

  // Resources
  const rows = [...STORED_RESOURCES, 'biomass' as ResourceId]
    .filter((r) => (p.stock[r] ?? 0) > 0.5 || Math.abs(rates.net[r] ?? 0) > 1e-6 || r === 'biomass')
    .map((r) => {
      const net = rates.net[r] ?? 0;
      const c = r === 'biomass' ? biomassCapacity(p) : cap;
      const full = (p.stock[r] ?? 0) >= c - 0.5;
      return `<tr><td>${esc(resourceName(r))}</td><td class="num ${full ? 'warn' : 'res'}">${formatAmount(p.stock[r] ?? 0)} / ${formatAmount(c)}</td><td class="num ${net < 0 ? 'bad' : 'good'}">${net === 0 ? '' : formatRate(net)}</td></tr>`;
    })
    .join('');
  parts.push(`<div class="section">Resources</div><table>${rows}</table>`);

  // Energy and people
  const energyNet = rates.energyMade - rates.energyUsed;
  parts.push(`<div class="section">Energy</div>
<div>Production ${formatAmount(rates.energyMade)}/h · use ${formatAmount(rates.energyUsed)}/h · <span class="${energyNet < 0 ? 'bad' : 'good'}">${formatRate(energyNet)}</span></div>
<div>Stored ${formatAmount(p.energy)} / ${formatAmount(energyCapacity(p))}${rates.efficiency < 1 ? ` · <span class="bad">efficiency ${Math.round(rates.efficiency * 100)}%</span>` : ''}</div>`);
  const workers = view.planet.buildings.reduce((s, b) => s + BUILDINGS[b.kind].workers, 0);
  parts.push(`<div class="section">Population</div>
<div>Residents ${p.population}${rates.crews > 0 ? ` + crews ${rates.crews}` : ''} / housing ${rates.housing}${rates.growth !== 0 ? ` · <span class="${rates.growth < 0 ? 'bad' : 'good'}">${formatRate(rates.growth)}</span>` : ''} · workers needed ${workers}${rates.starving ? ' · <span class="bad">STARVING</span>' : ''}</div>`);

  // Construction
  if (p.construction) {
    const c = p.construction;
    parts.push(`<div class="section">Construction</div>
<div class="row-line"><span>${esc(BUILDINGS[c.kind].name)} → level ${c.level} · ${leftText(view)}</span><button data-action="cancel">Cancel</button></div>`);
  }

  return parts.join('\n');
}

/** The full panel of an owned planet (step 1.8). Actions use data-action attributes. */
export function ownedPlanetHTML(view: PlanetView, player: Player): string {
  const { planet: p, info, rates } = view;
  const ctx = contextOf(player);
  const parts: string[] = [planetStatusHTML(view)];

  // Buildings
  const list = p.buildings
    .map((b, i) => {
      const crew = rates.staffing[i] ?? 1;
      const up = b.uid !== undefined ? canStartUpgrade(p, b.uid, ctx) : null;
      const next = b.level + 1;
      const maxed = next > BUILDINGS[b.kind].maxLevel;
      const name = `${BUILDINGS[b.kind].name}${b.deposit ? ` (${SHORT[b.deposit]})` : ''}`;
      const button = maxed
        ? '<span class="dim">max</span>'
        : `<button data-action="upgrade:${b.uid}" ${up?.ok ? '' : 'disabled'} title="${esc(up && !up.ok ? up.error.message : '')}">↑ ${esc(formatCost(buildingCost(b.kind, next, ctx)))} · ${formatDuration(buildingTime(b.kind, next))}</button>`;
      return `<tr><td>${esc(name)}</td><td class="num">lvl ${b.level}</td><td class="num ${crew < 1 ? 'bad' : 'dim'}">${BUILDINGS[b.kind].workers > 0 ? `${Math.round(crew * 100)}%` : ''}</td><td>${button}</td></tr>`;
    })
    .join('');
  parts.push(
    `<div class="section">Buildings</div>${list ? `<table>${list}</table>` : '<div class="dim">No buildings. The planet core slowly gathers minerals.</div>'}`,
  );

  // New buildings
  const options = buildOptions(view, ctx)
    .map(
      (o) =>
        `<tr class="${o.ok ? '' : 'dim'}"><td>${esc(o.label)}</td><td class="small">${esc(o.cost)} · ${esc(o.time)}</td><td><button data-action="build:${o.kind}:${o.deposit ?? ''}" ${o.ok ? '' : 'disabled'} title="${esc(o.reason)}">Build</button></td></tr>`,
    )
    .join('');
  parts.push(`<div class="section">New building</div><table>${options}</table>`);
  parts.push(`<div class="section">Deposits</div><table>${depositRows(info)}</table>`);
  return parts.join('\n');
}

/** Time left of the construction, or why it is stalled (owner 4.11.2026: energy sets the pace). */
function leftText(view: PlanetView): string {
  const ms = constructionLeft(view.planet, view.rates);
  if (!Number.isFinite(ms)) return '<span class="bad">stalled: no energy</span>';
  const slow = view.rates.efficiency < 1 ? ' <span class="bad">(slowed: energy short)</span>' : '';
  return `${formatDuration(ms)} left${slow}`;
}

/** Upgrade button of a building (or "max"). */
function upgradeButton(view: PlanetView, uid: number | undefined, ctx: ModifierContext): string {
  const b = view.planet.buildings.find((x) => x.uid === uid);
  if (!b || b.uid === undefined) return '';
  const next = b.level + 1;
  if (next > BUILDINGS[b.kind].maxLevel) return '<span class="dim">max level</span>';
  const up = canStartUpgrade(view.planet, b.uid, ctx);
  return `<button data-action="upgrade:${b.uid}" ${up.ok ? '' : 'disabled'} title="${esc(up.ok ? '' : up.error.message)}">Upgrade to level ${next}: ${esc(formatCost(buildingCost(b.kind, next, ctx)))} · ${formatDuration(buildingTime(b.kind, next))}</button>${up.ok ? '' : `<div class="dim small">${esc(up.error.message)}</div>`}`;
}

/**
 * Planet surface panel (owner's request, step 1.8a): the planet's status and the selected hex
 * field: what can be built there, or the building standing on it.
 */
export function surfacePanelHTML(
  view: PlanetView,
  player: Player,
  now: number,
  slots: SlotContent[],
  slot: number | null,
): string {
  const ctx = contextOf(player);
  const parts: string[] = [planetStatusHTML(view)];
  if (slot === null || slot >= slots.length) {
    parts.push(
      '<div class="section">Fields</div><div class="dim">Click a hex field to build on it or to see its building.</div>',
    );
    return parts.join('\n');
  }
  const content = slots[slot] ?? null;
  parts.push(`<div class="section">Field ${slot + 1}</div>`);
  if (content === null) {
    const options = buildOptions(view, ctx, slot)
      .map(
        (o) =>
          `<tr class="${o.ok ? '' : 'dim'}"><td>${esc(o.label)}</td><td class="small">${esc(o.cost)} · ${esc(o.time)}</td><td><button data-action="build:${o.kind}:${o.deposit ?? ''}:${slot}" ${o.ok ? '' : 'disabled'} title="${esc(o.reason)}">Build</button></td></tr>`,
      )
      .join('');
    parts.push(`<div class="dim">Empty field. Choose a building:</div><table>${options}</table>`);
  } else if ('construction' in content) {
    const c = view.planet.construction;
    if (c)
      parts.push(
        `<div class="row-line"><span>${esc(BUILDINGS[c.kind].name)} under construction · ${leftText(view)}</span><button data-action="cancel">Cancel</button></div>`,
      );
  } else {
    const b = content.building;
    const i = view.planet.buildings.indexOf(b);
    const crew = view.rates.staffing[i] ?? 1;
    const spec = BUILDINGS[b.kind];
    parts.push(
      `<div><b>${esc(spec.name)}${b.deposit ? ` (${esc(resourceName(b.deposit).toLowerCase())})` : ''}</b> · level ${b.level}</div>`,
    );
    if (spec.workers > 0)
      parts.push(
        `<div class="${crew < 1 ? 'bad' : 'dim'}">Crew ${Math.round(crew * spec.workers)} / ${spec.workers}</div>`,
      );
    const c = view.planet.construction;
    if (c && c.uid === b.uid) {
      parts.push(
        `<div class="row-line"><span>Upgrading to level ${c.level} · ${leftText(view)}</span><button data-action="cancel">Cancel</button></div>`,
      );
    } else {
      parts.push(upgradeButton(view, b.uid, ctx));
    }
    if (spec.effect.kind === 'shipyard') parts.push(shipyardHTML(view, player));
  }
  return parts.join('\n');
}
