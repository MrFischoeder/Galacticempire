import { generateGalaxy } from '@ge/shared';
import { describe, expect, it } from 'vitest';
import { flightText, formatLy, scenePosition, systemSummary } from '../src/map/layout';

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

  it('formats route lengths and describes a system in English', () => {
    expect(formatLy(8.25)).toBe('8.3 LY');
    expect(formatLy(22.4)).toBe('22 LY');
    const start = galaxy.startSlots[0]!;
    const summary = systemSummary(galaxy, start);
    expect(summary.title).toBe(galaxy.systems[start]!.name);
    expect(summary.lines).toContain('Start position');
    expect(summary.lines.some((l) => l.startsWith('Nearest system: '))).toBe(true);
    expect(summary.lines.some((l) => l.includes('16 fields') && l.endsWith('start'))).toBe(true);
  });
});
