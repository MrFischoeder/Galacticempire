import { BUILDING_IDS, PLANET_TYPES, slotsOf, type PlanetTypeId } from '@ge/shared';
import { describe, expect, it } from 'vitest';
import { buildSnapshot, createWorkerState, handleMessage } from '../src/sim/handler';
import { buildingModel } from '../src/surface/buildingModels';
import { HEX_SIZE, hexSpiral, sceneryRandom, spiralRadius } from '../src/surface/hexes';
import { THEMES } from '../src/surface/themes';
import { surfacePanelHTML } from '../src/ui/planetPanel';

describe('planet surface (step 1.8a)', () => {
  it('lays out hex fields in a spiral without overlaps', () => {
    for (const n of [8, 14, 16]) {
      const hexes = hexSpiral(n);
      expect(hexes).toHaveLength(n);
      expect(hexes[0]).toMatchObject({ q: 0, r: 0 });
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const d = Math.hypot(hexes[i]!.x - hexes[j]!.x, hexes[i]!.z - hexes[j]!.z);
          expect(d).toBeGreaterThan(HEX_SIZE * Math.sqrt(3) - 1e-6);
        }
      }
      expect(spiralRadius(n)).toBeGreaterThan(HEX_SIZE);
    }
  });

  it('every planet type has its own scenery and every building a model', () => {
    for (const t of Object.keys(PLANET_TYPES) as PlanetTypeId[]) {
      const scene = THEMES[t].scenery(sceneryRandom(t), 10);
      expect(scene.children.length, t).toBeGreaterThan(0);
    }
    const looks = new Set(Object.values(THEMES).map((t) => t.tile));
    expect(looks.size).toBeGreaterThanOrEqual(8);
    for (const kind of BUILDING_IDS)
      expect(buildingModel(kind, 'wind').children.length, kind).toBeGreaterThan(0);
  });

  it('scenery is the same for the same planet every time', () => {
    const a = sceneryRandom('3-1');
    const b = sceneryRandom('3-1');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('the field panel offers buildings for an empty field and an upgrade for a built one', () => {
    const state = createWorkerState();
    const [world] = handleMessage(state, {
      type: 'newGame',
      seed: 'surf',
      systems: 60,
      race: 'merchants',
    });
    if (world?.type !== 'world') throw new Error('no world');
    handleMessage(state, { type: 'skip', hours: 2 });
    handleMessage(state, {
      type: 'command',
      id: 1,
      command: {
        type: 'StartBuilding',
        playerId: 'p1',
        planetId: world.homePlanet,
        kind: 'renewable',
        slot: 5,
      },
    });
    handleMessage(state, { type: 'skip', hours: 1 });
    const snap = buildSnapshot(state)!;
    const view = snap.planets[0]!;
    const slots = slotsOf(view.planet, view.info.fields);
    const empty = surfacePanelHTML(view, snap.player, snap.time, slots, 0);
    expect(empty).toContain('Field 1');
    expect(empty).toContain('data-action="build:farm::0"');
    const built = surfacePanelHTML(view, snap.player, snap.time, slots, 5);
    expect(built).toContain('Renewable power plant');
    expect(built).toContain('Upgrade to level 2');
    expect(surfacePanelHTML(view, snap.player, snap.time, slots, null)).toContain(
      'Click a hex field',
    );
  });
});
