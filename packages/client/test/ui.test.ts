import { describe, expect, it } from 'vitest';
import { buildSnapshot, createWorkerState, handleMessage } from '../src/sim/handler';
import { formatCost, formatDuration, formatGameTime, formatRate } from '../src/ui/format';
import { buildOptions, contextOf, ownedPlanetHTML } from '../src/ui/planetPanel';
import { researchHTML } from '../src/ui/researchPanel';

describe('formatting (Polish UI)', () => {
  it('game time, durations, rates and costs', () => {
    expect(formatGameTime(0)).toBe('Dzień 1, 00:00');
    expect(formatGameTime(26 * 3_600_000 + 5 * 60_000)).toBe('Dzień 2, 02:05');
    expect(formatDuration(45_000)).toBe('45 s');
    expect(formatDuration(12 * 60_000)).toBe('12 min');
    expect(formatDuration(125 * 60_000)).toBe('2 h 05 min');
    expect(formatDuration(75 * 3_600_000)).toBe('3 d 3 h');
    expect(formatRate(12.5)).toBe('+12,5/h');
    expect(formatRate(-3)).toBe('−3/h');
    expect(formatCost({ metal: 25, titanium: 20 })).toBe('25 metal · 20 tytan');
  });
});

describe('planet and research panels (step 1.8)', () => {
  const state = createWorkerState();
  handleMessage(state, { type: 'newGame', seed: 'ui', systems: 60, race: 'merchants' });
  handleMessage(state, { type: 'skip', hours: 2 });
  const snap = buildSnapshot(state)!;
  const view = snap.planets[0]!;

  it('lists what can be built, hiding what does not belong on this planet', () => {
    const options = buildOptions(view, contextOf(snap.player));
    expect(options.some((o) => o.kind === 'renewable' && o.ok)).toBe(true);
    expect(
      options
        .filter((o) => o.kind === 'mine')
        .map((o) => o.deposit)
        .sort(),
    ).toEqual(['deuterium', 'metal', 'silicon', 'titanium']);
    const lab = options.find((o) => o.kind === 'laboratory');
    expect(lab?.ok).toBe(false);
    expect(lab?.reason).toContain('Wymaga');
    expect(options.some((o) => o.kind === 'housing')).toBe(true);
  });

  it('renders the owned planet in Polish with action buttons', () => {
    const html = ownedPlanetHTML(view, snap.player, snap.time);
    for (const text of [
      'Zasoby',
      'Energia',
      'Ludność',
      'Nowy budynek',
      'Złoża',
      'Mieszkańcy 10',
      'data-action="build:renewable:"',
    ]) {
      expect(html).toContain(text);
    }
  });

  it('research panel asks for a laboratory first', () => {
    expect(researchHTML(snap.player, snap.planets, view.planet.id)).toContain('Brak laboratorium');
  });
});
