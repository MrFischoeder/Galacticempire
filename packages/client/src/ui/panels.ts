import type { Galaxy, SystemId } from '@ge/shared';
import { systemSummary } from '../map/layout';

/** Plain DOM panels in the terminal style (spec 18). */
export function renderSystemPanel(
  el: HTMLElement,
  galaxy: Galaxy | null,
  id: SystemId | null,
): void {
  if (!galaxy || id === null) {
    el.hidden = true;
    return;
  }
  const { title, lines } = systemSummary(galaxy, id);
  el.hidden = false;
  el.replaceChildren();
  const h = document.createElement('div');
  h.className = 'panel-title';
  h.textContent = title;
  el.appendChild(h);
  for (const line of lines) {
    const row = document.createElement('div');
    row.textContent = line;
    el.appendChild(row);
  }
}

export function renderStats(el: HTMLElement, galaxy: Galaxy | null, fps: number): void {
  if (!galaxy) return;
  el.textContent = `Układy: ${galaxy.systems.length} · Planety: ${Object.keys(galaxy.planets).length} · ${Math.round(fps)} FPS`;
}
