import {
  BUILDING_IDS,
  BUILDINGS,
  biomassCapacity,
  buildingCost,
  buildingTime,
  canStartBuilding,
  canStartUpgrade,
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
} from '@ge/shared';
import type { PlanetView } from '../sim/protocol';
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
export function buildOptions(view: PlanetView, ctx: ModifierContext): BuildOption[] {
  const out: BuildOption[] = [];
  for (const kind of BUILDING_IDS) {
    const deposits: (MinedResource | undefined)[] =
      BUILDINGS[kind].effect.kind === 'mine'
        ? view.info.deposits.map((d) => d.resource)
        : [undefined];
    for (const deposit of deposits) {
      const check = canStartBuilding(view.planet, view.info, kind, deposit, ctx);
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
    `żyzność ${info.fertility}`,
    info.renewable
      ? `energia: ${{ solar: 'słoneczna', wind: 'wiatrowa', geothermal: 'geotermalna' }[info.renewable]}`
      : 'bez energii odnawialnej',
  ];
  return facts.join(' · ');
}

function depositRows(info: Planet): string {
  return info.deposits
    .map((d) => {
      const cls = { poor: 'ubogie', average: 'średnie', rich: 'bogate' }[d.class];
      return `<tr><td>${esc(resourceName(d.resource))}</td><td>${cls}</td><td class="num">${formatAmount(d.pool)} / ${formatAmount(d.initial)}</td></tr>`;
    })
    .join('');
}

/** A planet that is not ours: what is known about it. */
export function foreignPlanetHTML(info: Planet): string {
  return `<div class="panel-title">${esc(info.name)}</div>
<div class="dim">${esc(planetFacts(info))} · ${info.fields} pól</div>
<div class="section">Złoża</div><table>${depositRows(info)}</table>`;
}

/** The full panel of an owned planet (step 1.8). Actions use data-action attributes. */
export function ownedPlanetHTML(view: PlanetView, player: Player, now: number): string {
  const { planet: p, info, rates } = view;
  const ctx = contextOf(player);
  const cap = resourceCapacity(p);
  const parts: string[] = [];
  parts.push(`<div class="panel-title">${esc(info.name)}</div>
<div class="dim">${esc(planetFacts(info))} · pola ${fieldsUsed(p)}/${info.fields}</div>`);

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
  parts.push(`<div class="section">Zasoby</div><table>${rows}</table>`);

  // Energy and people
  const energyNet = rates.energyMade - rates.energyUsed;
  parts.push(`<div class="section">Energia</div>
<div>Produkcja ${formatAmount(rates.energyMade)}/h · zużycie ${formatAmount(rates.energyUsed)}/h · <span class="${energyNet < 0 ? 'bad' : 'good'}">${formatRate(energyNet)}</span></div>
<div>Zapas ${formatAmount(p.energy)} / ${formatAmount(energyCapacity(p))}${rates.efficiency < 1 ? ` · <span class="bad">wydajność ${Math.round(rates.efficiency * 100)}%</span>` : ''}</div>`);
  const workers = view.planet.buildings.reduce((s, b) => s + BUILDINGS[b.kind].workers, 0);
  parts.push(`<div class="section">Ludność</div>
<div>Mieszkańcy ${p.population} / ${rates.housing}${rates.growth !== 0 ? ` · <span class="${rates.growth < 0 ? 'bad' : 'good'}">${formatRate(rates.growth)}</span>` : ''} · robotnicy potrzebni ${workers}${rates.starving ? ' · <span class="bad">GŁÓD</span>' : ''}</div>`);

  // Construction
  if (p.construction) {
    const c = p.construction;
    parts.push(`<div class="section">Budowa</div>
<div class="row-line"><span>${esc(BUILDINGS[c.kind].name)} → poziom ${c.level} · zostało ${formatDuration(c.endsAt - now)}</span><button data-action="cancel">Anuluj</button></div>`);
  }

  // Buildings
  const list = p.buildings
    .map((b, i) => {
      const crew = rates.staffing[i] ?? 1;
      const up = b.uid !== undefined ? canStartUpgrade(p, b.uid, ctx) : null;
      const next = b.level + 1;
      const maxed = next > BUILDINGS[b.kind].maxLevel;
      const name = `${BUILDINGS[b.kind].name}${b.deposit ? ` (${SHORT[b.deposit]})` : ''}`;
      const button = maxed
        ? '<span class="dim">maks.</span>'
        : `<button data-action="upgrade:${b.uid}" ${up?.ok ? '' : 'disabled'} title="${esc(up && !up.ok ? up.error.message : '')}">↑ ${esc(formatCost(buildingCost(b.kind, next, ctx)))} · ${formatDuration(buildingTime(b.kind, next))}</button>`;
      return `<tr><td>${esc(name)}</td><td class="num">poz. ${b.level}</td><td class="num ${crew < 1 ? 'bad' : 'dim'}">${BUILDINGS[b.kind].workers > 0 ? `${Math.round(crew * 100)}%` : ''}</td><td>${button}</td></tr>`;
    })
    .join('');
  parts.push(
    `<div class="section">Budynki</div>${list ? `<table>${list}</table>` : '<div class="dim">Brak budynków. Rdzeń planety zbiera powoli surowce.</div>'}`,
  );

  // New buildings
  const options = buildOptions(view, ctx)
    .map(
      (o) =>
        `<tr class="${o.ok ? '' : 'dim'}"><td>${esc(o.label)}</td><td class="small">${esc(o.cost)} · ${esc(o.time)}</td><td><button data-action="build:${o.kind}:${o.deposit ?? ''}" ${o.ok ? '' : 'disabled'} title="${esc(o.reason)}">Buduj</button></td></tr>`,
    )
    .join('');
  parts.push(`<div class="section">Nowy budynek</div><table>${options}</table>`);
  parts.push(`<div class="section">Złoża</div><table>${depositRows(info)}</table>`);
  return parts.join('\n');
}
