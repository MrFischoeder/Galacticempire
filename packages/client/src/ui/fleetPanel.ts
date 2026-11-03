import {
  canRecallFleet,
  canSendFleet,
  countUnits,
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
export function planetFleetHTML(view: PlanetView): string {
  const p = view.planet;
  const here = unitsAt(p);
  const canDock = countUnits(dockable(p)) > 0;
  const canLaunch = countUnits(p.units) > 0;
  return `<div class="section">FLEET</div>
<table>
<tr><td>In hangars</td><td class="num">${esc(unitsText(p.units))}</td></tr>
<tr><td>In orbit</td><td class="num">${esc(unitsText(p.orbit))}</td></tr>
<tr><td>Hangar places</td><td class="num">${placesOf(p.units)} / ${hangarPlaces(p)}</td></tr>
<tr><td>Fuel</td><td class="num">${formatAmount(p.stock[FLIGHT.fuel] ?? 0)}</td></tr>
</table>
<div class="dim small">Hangars hide units from attacks from above; moving between hangars and orbit is free.</div>
<div class="row"><button data-action="dock:hangar" ${canDock ? '' : 'disabled'}>Into hangars</button><button data-action="dock:orbit" ${canLaunch ? '' : 'disabled'}>All to orbit</button></div>
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
<div>Target: ${target}</div>
${picking ? '<div class="pick">Pick the target: open a system (galaxy map) and click a planet.</div>' : ''}
<div class="row"><button data-action="fleetPick">${picking ? 'Picking…' : 'Pick target'}</button><button data-action="fleetClose">Close</button></div>`;
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
  const have = views.find((v) => v.planet.id === draft.from)?.planet.stock[FLIGHT.fuel] ?? 0;
  const lines = [
    `${formatLy(plan.ly)} ${plan.interstellar ? '(between systems, +3 min hyperspace entry)' : '(inside the system)'}`,
    `Speed ${plan.speed.toFixed(0)} LY/h (slowest: ${UNITS[plan.slowest].name})`,
    `Time ${formatDuration(plan.duration)}${MISSIONS[draft.mission].roundTrip ? ` each way, back ${formatGameTime(time + 2 * plan.duration)}` : `, arrives ${formatGameTime(time + plan.duration)}`}`,
    `Fuel ${plan.free ? '0 (your system)' : `${formatAmount(Math.ceil(plan.fuel))} of ${formatAmount(have)}`}`,
  ];
  if (!check.ok) lines.push(`⚠ ${check.error.message}`);
  return { text: lines.join('\n'), ok: check.ok };
}

const PHASE: Record<Fleet['phase'], string> = {
  out: 'on its way',
  back: 'coming home',
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
        f.phase === 'out'
          ? `<button data-action="fleetRecall:${f.id}" ${recall.ok ? '' : `disabled title="${esc(recall.ok ? '' : recall.error.message)}"`}>Recall${recall.ok ? ` (+${formatAmount(Math.max(0, recallLeftover(f, time)))} fuel)` : ''}</button>`
          : '';
      return `<tr><td><b>${f.id}</b> ${esc(MISSIONS[f.mission].name)}, ${PHASE[f.phase]}<br><span class="small">${esc(unitsText(f.units))}</span><br><span class="small dim">${where}</span></td><td>${button}</td></tr>`;
    })
    .join('');
  return `<div class="section">YOUR FLEETS</div><table>${rows}</table>`;
}
