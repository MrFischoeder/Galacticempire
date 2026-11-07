import { describe, expect, it } from 'vitest';
import { applyCommand, createGameState, getPlayerView } from '@ge/shared';
import { botTurn } from '../src/index';

describe('economic bot (step 1.13)', () => {
  it('reads only the player view and starts with a power plant', () => {
    let s = createGameState('bot');
    const g = s.world.galaxy;
    const home = g.systems[g.startSlots[0]!]!.planets.find((id) => g.planets[id]!.starter)!;
    s = applyCommand(s, { type: 'AddPlayer', playerId: 'p1', name: 'Bot' }, 0).state;
    s = applyCommand(s, { type: 'DebugGivePlanet', playerId: 'p1', planetId: home }, 0).state;
    // Enough minerals for the first building.
    s.planets[home]!.stock = { metal: 100, titanium: 100, silicon: 100 };
    const turn = botTurn(getPlayerView(s, 'p1')!);
    expect(turn.commands).toEqual([
      { type: 'StartBuilding', playerId: 'p1', planetId: home, kind: 'renewable' },
    ]);
    // It is a pure function of the view.
    expect(botTurn(getPlayerView(s, 'p1')!)).toEqual(turn);
  });
});
