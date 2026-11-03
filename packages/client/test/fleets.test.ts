import { describe, expect, it } from 'vitest';
import type { Command } from '@ge/shared';
import { buildSnapshot, createWorkerState, handleMessage } from '../src/sim/handler';
import { fleetListHTML, planetFleetHTML, previewOf } from '../src/ui/fleetPanel';

function game() {
  const state = createWorkerState();
  const [world] = handleMessage(state, {
    type: 'newGame',
    seed: 'w',
    systems: 60,
    race: 'merchants',
  });
  if (world?.type !== 'world') throw new Error('no world');
  const home = world.homePlanet;
  const g = world.galaxy;
  const far = g.systems[g.startSlots[1]!]!.planets[0]!;
  const cmd = (command: Command) => {
    const [r] = handleMessage(state, { type: 'command', id: 1, command });
    if (r?.type !== 'result' || !r.result.ok) throw new Error(JSON.stringify(r));
  };
  cmd({ type: 'DebugSetBuilding', planetId: home, kind: 'spaceport', level: 1 });
  cmd({ type: 'DebugAddResources', planetId: home, amounts: { fuel: 100 } });
  cmd({ type: 'DebugAddUnits', planetId: home, units: { fighter: 3 } });
  return { state, home, far, galaxy: g, cmd };
}

describe('fleet panel (step 1.9)', () => {
  it('shows units, launch slots and a preview of time and fuel', () => {
    const { state, home, far, galaxy } = game();
    const snap = buildSnapshot(state)!;
    const view = snap.planets[0]!;
    const html = planetFleetHTML(view, snap.time);
    expect(html).toContain('3 Fighter');
    expect(html).toContain('1 / 1 free');
    const draft = { from: home, to: far, mission: 'transfer' as const, units: { fighter: 3 } };
    const p = previewOf(draft, galaxy, snap.planets, snap.player, snap.time);
    expect(p.text).toMatch(/LY .*hyperspace/);
    expect(p.text).toMatch(/Fuel \d+ of 100/);
    // The target is not the player's: a transfer is refused, a station is fine if fuel lasts.
    expect(p.ok).toBe(false);
    expect(p.text).toContain('one of your planets');
    const none = previewOf({ ...draft, to: null }, galaxy, snap.planets, snap.player, snap.time);
    expect(none.ok).toBe(false);
  });

  it('a sent fleet is in the snapshot and can be recalled', () => {
    const { state, home, far, galaxy, cmd } = game();
    cmd({
      type: 'SendFleet',
      playerId: 'p1',
      from: home,
      to: far,
      units: { fighter: 1 },
      mission: 'station',
    });
    const snap = buildSnapshot(state)!;
    expect(snap.fleets).toHaveLength(1);
    const html = fleetListHTML(snap.fleets, galaxy, snap.time);
    expect(html).toContain('fleetRecall:f1');
    expect(html).toContain('Station');
  });
});
