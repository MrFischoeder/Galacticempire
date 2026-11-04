import {
  canRecallFleet,
  canSendFleet,
  cargoCapacity,
  loadTime,
  countUnits,
  RESOURCES,
  STOCKED,
  type ResourceAmounts,
  type ResourceId,
  type Route,
  flightPlan,
  FLIGHT,
  hangarPlaces,
  dockable,
  MISSIONS,
  placesOf,
  recallLeftover,
  UNIT_IDS,
  UNITS,
  unitsAt,
  upkeepPerHour,
  type Fleet,
  type FleetMission,
  type Galaxy,
  type GameState,
  type PlanetId,
  type Player,
  type UnitCounts,
  type UnitId,
} from '@ge/shared';
import type { PlanetView } from '../sim/protocol';
import { formatAmount, formatDuration, formatGameTime } from './format';
import { esc } from './html';
import { contextOf } from './planetPanel';
import { formatLy } from '../map/layout';

/** Fleets in the interface (step 1.9): what is at a planet, sending, fleets on their way. */

export interface FleetDraft {
  from: PlanetId;
  to: PlanetId | null;
  mission: FleetMission;
  units: UnitCounts;
  /** Resources to carry (transport). */
  cargo: ResourceAmounts;
  /** Repeat interval for a recurring route, hours. */
  every: number;
}

const planetName = (g: Galaxy, id: PlanetId) => g.planets[id]?.name ?? id;

/** "5 Fighter · 1 Cruiser". */
export function unitsText(units: UnitCounts): string {
  const parts = (Object.entries(units) as [UnitId, number][])
    .filter(([, n]) => n > 0)
    .map(([u, n]) => `${n} ${UNITS[u].name}`);
  return parts.length ? parts.join(' · ') : 'none';
}

/** The fleet section of an owned planet's side panel. */
export function planetFleetHTML(
  view: PlanetView,
  player: Player,
  others: readonly { id: PlanetId; name: string }[] = [],
): string {
  const p = view.planet;
  const here = unitsAt(p);
  const canDock = countUnits(dockable(p)) > 0;
  const canLaunch = countUnits(p.units) > 0;
  const upkeep = upkeepPerHour(p, contextOf(player));
  return `<div class="section">FLEET</div>
<table>
<tr><td>In hangars</td><td class="num">${esc(unitsText(p.units))}</td></tr>
<tr><td>In orbit</td><td class="num">${esc(unitsText(p.orbit))}</td></tr>
<tr><td>Hangar places</td><td class="num">${placesOf(p.units)} / ${hangarPlaces(p)}</td></tr>
<tr><td>Upkeep</td><td class="num ${view.rates.upkeepFed < 1 ? 'bad' : ''}">${upkeep.toFixed(1)} biomass/h${p.upkeepFrom ? ` · fed by ${esc(others.find((o) => o.id === p.upkeepFrom)?.name ?? p.upkeepFrom)}` : view.rates.upkeepFed < 1 ? ' · STARVING' : ''}</td></tr>
${countUnits(p.away) > 0 ? `<tr><td>In flight</td><td class="num">${esc(unitsText(p.away))}</td></tr>` : ''}
<tr><td>Fuel</td><td class="num">${formatAmount(p.stock[FLIGHT.fuel] ?? 0)}</td></tr>
</table>
<div class="dim small">Hangars hide units from attacks from above; moving between hangars and orbit is free.</div>
<div class="row"><button data-action="dock:hangar" ${canDock ? '' : 'disabled'}>Into hangars</button><button data-action="dock:orbit" ${canLaunch ? '' : 'disabled'}>All to orbit</button></div>
${feedRow(p.upkeepFrom ?? null, others)}
<div class="row"><button data-action="fleetDraft" ${countUnits(here) > 0 ? '' : 'disabled title="No units at this planet."'}>Send a fleet…</button></div>`;
}

/** A state good enough for the shared checks: the player's own planets as of the snapshot. */
export function viewState(galaxy: Galaxy, views: readonly PlanetView[], time: number): GameState {
  return {
    time,
    world: { seed: '', galaxy },
    planets: Object.fromEntries(views.map((v) => [v.planet.id, v.planet])),
    players: {},
    fleets: {},
  } as unknown as GameState;
}

/** The inputs of the send form (rebuilt only when this HTML changes, so typing is kept). */
export function draftHTML(
  draft: FleetDraft,
  galaxy: Galaxy,
  views: readonly PlanetView[],
  picking: boolean,
): string {
  const view = views.find((v) => v.planet.id === draft.from);
  if (!view) return '';
  const here = unitsAt(view.planet);
  const rows = UNIT_IDS.filter((u) => (here[u] ?? 0) > 0)
    .map(
      (u) =>
        `<tr><td>${esc(UNITS[u].name)}</td><td class="num dim">${here[u]}</td><td><input class="small-input" type="number" min="0" max="${here[u]}" step="1" data-unit="${u}" value="${draft.units[u] ?? 0}" /></td><td><button data-action="fleetAll:${u}">All</button></td></tr>`,
    )
    .join('');
  const missions = (Object.keys(MISSIONS) as FleetMission[])
    .map(
      (m) =>
        `<option value="${m}" ${m === draft.mission ? 'selected' : ''} title="${esc(MISSIONS[m].text)}">${esc(MISSIONS[m].name)}</option>`,
    )
    .join('');
  const target = draft.to
    ? `${esc(planetName(galaxy, draft.to))} <span class="dim">(${esc(galaxy.systems[galaxy.planets[draft.to]?.system ?? -1]?.name ?? '')})</span>`
    : '<span class="dim">none</span>';
  return `<div class="panel-title">SEND A FLEET</div>
<div class="dim">From ${esc(planetName(galaxy, draft.from))}</div>
<table>${rows || '<tr><td class="dim">No units here.</td></tr>'}</table>
<label>Mission <select id="fleetMission">${missions}</select></label>
<div class="dim small">${esc(MISSIONS[draft.mission].text)}</div>
${draft.mission === 'transport' ? cargoHTML(draft, view) : ''}
<div>Target: ${target}</div>
${picking ? '<div class="pick">Pick the target: open a system (galaxy map) and click a planet.</div>' : ''}
<div class="row"><button data-action="fleetPick">${picking ? 'Picking…' : 'Pick target'}</button><button data-action="fleetClose">Close</button></div>`;
}

/** Cargo inputs of a transport and the recurring-route interval (spec 12.2). */
function cargoHTML(draft: FleetDraft, view: PlanetView): string {
  const rows = STOCKED.filter((r) => (view.planet.stock[r] ?? 0) >= 1)
    .map(
      (r) =>
        `<tr><td>${esc(RESOURCES[r].name)}</td><td class="num dim">${formatAmount(view.planet.stock[r] ?? 0)}</td><td><input class="small-input" type="number" min="0" step="10" data-cargo="${r}" value="${draft.cargo[r] ?? 0}" /></td></tr>`,
    )
    .join('');
  return `<div class="section">CARGO</div><table>${rows || '<tr><td class="dim">Nothing to carry.</td></tr>'}</table>
<div class="row"><label>Repeat every <input class="small-input" type="number" min="1" step="1" id="fleetEvery" value="${draft.every}" /> h</label><button data-action="routeCreate">Create route</button></div>`;
}

export interface Preview {
  readonly text: string;
  readonly ok: boolean;
}

/** Distance, time and fuel of the drafted flight, and whether it can go now. */
export function previewOf(
  draft: FleetDraft,
  galaxy: Galaxy,
  views: readonly PlanetView[],
  player: Player,
  time: number,
): Preview {
  if (!draft.to) return { text: 'Pick a target planet.', ok: false };
  const state = viewState(galaxy, views, time);
  const ctx = contextOf(player);
  const order = { playerId: player.id, ...draft, to: draft.to };
  const check = canSendFleet(state, order, ctx);
  if (countUnits(draft.units) === 0) return { text: 'Choose the units to send.', ok: false };
  if (draft.to === draft.from) return { text: check.ok ? '' : check.error.message, ok: false };
  const plan = flightPlan(state, player.id, draft.from, draft.to, draft.units, draft.mission, ctx);
  const room = cargoCapacity(draft.units, ctx);
  const fromView = views.find((v) => v.planet.id === draft.from);
  const load = draft.mission === 'transport' && fromView ? loadTime(fromView.planet) : 0;
  const have = views.find((v) => v.planet.id === draft.from)?.planet.stock[FLIGHT.fuel] ?? 0;
  const lines = [
    `${formatLy(plan.ly)} ${plan.interstellar ? '(between systems, +3 min hyperspace entry)' : '(inside the system)'}`,
    `Speed ${plan.speed.toFixed(0)} LY/h (slowest: ${UNITS[plan.slowest].name})`,
    `Time ${formatDuration(plan.duration)}${MISSIONS[draft.mission].roundTrip ? ` each way, back ${formatGameTime(time + load + 2 * plan.duration)}` : `, arrives ${formatGameTime(time + plan.duration)}`}`,
    ...(load > 0
      ? [`Loading ${formatDuration(load)} before take-off (faster with a spaceport)`]
      : []),
    `Fuel ${plan.free ? '0 (your system)' : `${formatAmount(Math.ceil(plan.fuel))} of ${formatAmount(have)}`}`,
  ];
  if (draft.mission === 'transport') {
    const load = Object.values(draft.cargo).reduce((a, n) => a + (n ?? 0), 0);
    lines.push(`Cargo ${formatAmount(load)} of ${formatAmount(room)}`);
  }
  if (!check.ok) lines.push(`⚠ ${check.error.message}`);
  return { text: lines.join('\n'), ok: check.ok };
}

const PHASE: Record<Fleet['phase'], string> = {
  out: 'on its way',
  back: 'coming home',
  waiting: 'waiting in orbit (warehouse full)',
};

/** The player's fleets away from home. */
export function fleetListHTML(fleets: readonly Fleet[], galaxy: Galaxy, time: number): string {
  if (fleets.length === 0)
    return '<div class="section">YOUR FLEETS</div><div class="dim">No fleets in flight.</div>';
  const rows = fleets
    .map((f) => {
      const where = f.leg
        ? `${esc(planetName(galaxy, f.leg.from))} → ${esc(planetName(galaxy, f.leg.to))}, ${formatDuration(f.leg.arriveAt - time)}`
        : '';
      const recall = canRecallFleet(
        { fleets: { [f.id]: f }, time } as unknown as GameState,
        f.owner,
        f.id,
      );
      const button =
        f.phase !== 'back'
          ? `<button data-action="fleetRecall:${f.id}" ${recall.ok ? '' : `disabled title="${esc(recall.ok ? '' : recall.error.message)}"`}>Recall${recall.ok ? ` (+${formatAmount(Math.max(0, recallLeftover(f, time)))} fuel)` : ''}</button>`
          : '';
      const load = Object.values(f.cargo ?? {}).reduce((a, n) => a + (n ?? 0), 0);
      return `<tr><td><b>${f.id}</b> ${esc(MISSIONS[f.mission].name)}, ${PHASE[f.phase]}<br><span class="small">${esc(unitsText(f.units))}${load > 0 ? ` · cargo ${formatAmount(load)}` : ''}</span><br><span class="small dim">${where || (f.phase === 'waiting' ? `at ${esc(planetName(galaxy, f.target))}` : '')}</span></td><td>${button}</td></tr>`;
    })
    .join('');
  return `<div class="section">YOUR FLEETS</div><table>${rows}</table>`;
}

/** Which planet feeds this planet's units (question 37): this one or another of the player's. */
function feedRow(
  current: PlanetId | null,
  others: readonly { id: PlanetId; name: string }[],
): string {
  if (others.length === 0) return '';
  const buttons = [
    `<button data-action="feed:" ${current === null ? 'disabled' : ''}>This planet</button>`,
    ...others.map(
      (o) =>
        `<button data-action="feed:${o.id}" ${current === o.id ? 'disabled' : ''}>${esc(o.name)}</button>`,
    ),
  ].join('');
  return `<div class="dim small">Units fed by:</div><div class="row">${buttons}</div>`;
}

/** The player's recurring routes (spec 12.2). */
export function routesHTML(routes: readonly Route[], galaxy: Galaxy, time: number): string {
  if (routes.length === 0) return '';
  const rows = routes
    .map((r) => {
      const cargo = (Object.entries(r.cargo) as [ResourceId, number][])
        .map(([res, n]) => `${formatAmount(n)} ${RESOURCES[res].name.toLowerCase()}`)
        .join(', ');
      return `<tr><td>${esc(planetName(galaxy, r.from))} → ${esc(planetName(galaxy, r.to))}<br><span class="small">${esc(unitsText(r.units))} · ${esc(cargo)} · every ${r.everyHours} h</span><br><span class="small dim">next in ${formatDuration(r.nextAt - time)} · ${r.trips} trips · ${esc(r.last)}</span></td><td><button data-action="routeDelete:${r.id}">Delete</button></td></tr>`;
    })
    .join('');
  return `<div class="section">ROUTES</div><table>${rows}</table>`;
}
