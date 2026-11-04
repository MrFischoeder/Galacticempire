import {
  canOrderUnits,
  CREW,
  freeResidents,
  unitLeft,
  shipyardLevel,
  shipyardUnits,
  unitOrderSpec,
  UNITS,
  type Player,
} from '@ge/shared';
import type { PlanetView } from '../sim/protocol';
import { formatCost, formatDuration } from './format';
import { esc } from './html';
import { contextOf } from './planetPanel';

/** The shipyard section of a planet (step 1.10a): order units and see the queue. */
export function shipyardHTML(view: PlanetView, player: Player): string {
  const p = view.planet;
  const ctx = contextOf(player);
  const level = shipyardLevel(p);
  const queue = p.shipyard
    .map((o, i) => {
      const ms = unitLeft(p, view.rates);
      const left =
        i > 0
          ? 'waiting'
          : Number.isFinite(ms)
            ? `${formatDuration(ms)} to the next`
            : 'stalled: no energy or crew';
      return `<tr><td>${esc(UNITS[o.unit].name)} ${o.built}/${o.count}</td><td class="small dim">${left}</td><td><button data-action="ordercancel:${o.id}">Cancel</button></td></tr>`;
    })
    .join('');
  const rows = shipyardUnits()
    .filter((u) => UNITS[u].shipyardLevel <= level + 1)
    .map((u) => {
      const spec = unitOrderSpec(u, ctx);
      const one = canOrderUnits(p, u, 1, ctx);
      const five = canOrderUnits(p, u, 5, ctx);
      const why = one.ok ? '' : one.error.message;
      return `<tr class="${one.ok ? '' : 'dim'}"><td>${esc(UNITS[u].name)}<div class="small dim">${esc(formatCost(spec.cost))} · crew ${CREW[u]} · ${formatDuration(spec.ms)}</div></td><td><button data-action="order:${u}:1" ${one.ok ? '' : 'disabled'} title="${esc(why)}">+1</button></td><td><button data-action="order:${u}:5" ${five.ok ? '' : 'disabled'} title="${esc(five.ok ? '' : five.error.message)}">+5</button></td></tr>`;
    })
    .join('');
  return `<div class="section">SHIPYARD</div>
${queue ? `<table>${queue}</table>` : '<div class="dim">Nothing is being built.</div>'}
<div class="dim small">Paid in full when ordered; the crew leaves the residents for good (it is part of the cost). Built one after another at the pace of the energy and the shipyard's crew. Free residents: ${freeResidents(p)}.</div>
<table>${rows}</table>`;
}
