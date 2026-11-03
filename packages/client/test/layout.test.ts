import { generateGalaxy } from '@ge/shared';
import { describe, expect, it } from 'vitest';
import { flightText, formatLy, scenePosition, systemSummary } from '../src/map/layout';
import { handleMessage } from '../src/sim/handler';
import type { WorkerState } from '../src/sim/protocol';

const galaxy = generateGalaxy('map-test');

describe('galaxy map layout (step 1.7)', () => {
  it('places systems on the disk plane with a small, stable height', () => {
    for (const s of galaxy.systems) {
      const [x, y, z] = scenePosition(galaxy, s.id);
      expect([x, z]).toEqual([s.x, s.y]);
      expect(Math.abs(y)).toBeLessThanOrEqual(3);
      expect(scenePosition(galaxy, s.id)).toEqual([x, y, z]);
    }
  });

  it('describes a straight flight between any two systems', () => {
    const text = flightText(galaxy, 0, 5);
    expect(text).toMatch(/→ .+: \d+(\.\d)? LY$/);
  });

  it('formats route lengths and describes a system in Polish', () => {
    expect(formatLy(8.25)).toBe('8.3 LY');
    expect(formatLy(22.4)).toBe('22 LY');
    const start = galaxy.startSlots[0]!;
    const summary = systemSummary(galaxy, start);
    expect(summary.title).toBe(galaxy.systems[start]!.name);
    expect(summary.lines).toContain('Pozycja startowa');
    expect(summary.lines.some((l) => l.startsWith('Najbliższy układ: '))).toBe(true);
    expect(summary.lines.some((l) => l.includes('16 pól') && l.endsWith('start'))).toBe(true);
  });
});

describe('simulation worker logic (step 1.7)', () => {
  it('creates a world, runs commands and reports errors without throwing', () => {
    const state: WorkerState = { game: null };
    expect(
      handleMessage(state, {
        type: 'command',
        id: 1,
        command: { type: 'AddPlayer', playerId: 'p', name: 'X' },
        time: 0,
      })[0]?.type,
    ).toBe('error');
    const [world] = handleMessage(state, { type: 'newGame', seed: 'w', systems: 60 });
    expect(world?.type).toBe('world');
    const [res] = handleMessage(state, {
      type: 'command',
      id: 2,
      command: { type: 'AddPlayer', playerId: 'p', name: 'X' },
      time: 0,
    });
    expect(res).toMatchObject({ type: 'result', id: 2, result: { ok: true } });
    const [bad] = handleMessage(state, {
      type: 'command',
      id: 3,
      command: { type: 'AddPlayer', playerId: 'p', name: 'X' },
      time: 0,
    });
    expect(bad).toMatchObject({ type: 'result', id: 3, result: { ok: false } });
  });
});
