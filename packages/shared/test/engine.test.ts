import { describe, expect, it } from 'vitest';
import {
  advanceTo,
  applyCommand,
  createGameState,
  MS_PER_MINUTE,
  replay,
  type Command,
  type GameState,
  type TimedCommand,
} from '../src/index';

const marker = (delay: number, label: string, extra: Partial<Command> = {}): Command =>
  ({ type: 'DebugScheduleMarker', delay, label, ...extra }) as Command;

function run(state: GameState, command: Command, at: number): GameState {
  const out = applyCommand(state, command, at);
  expect(out.result).toEqual({ ok: true });
  return out.state;
}

const labels = (s: GameState) => s.log.map((l) => `${l.at}:${l.text}`);

describe('advanceTo', () => {
  it('processes events in time order, also when scheduled out of order', () => {
    let s = createGameState('t');
    s = run(s, marker(300, 'C'), 0);
    s = run(s, marker(100, 'A'), 0);
    s = run(s, marker(200, 'B'), 0);
    s = advanceTo(s, 1000);
    expect(labels(s)).toEqual(['100:Znacznik: A', '200:Znacznik: B', '300:Znacznik: C']);
    expect(s.time).toBe(1000);
  });

  it('keeps the scheduling order for events at the same time', () => {
    let s = createGameState('t');
    for (const l of ['1', '2', '3']) s = run(s, marker(50, l), 0);
    s = advanceTo(s, 50);
    expect(labels(s)).toEqual(['50:Znacznik: 1', '50:Znacznik: 2', '50:Znacznik: 3']);
  });

  it('stops exactly at the target time and leaves later events', () => {
    let s = createGameState('t');
    s = run(s, marker(100, 'A'), 0);
    s = run(s, marker(101, 'B'), 0);
    s = advanceTo(s, 100);
    expect(labels(s)).toEqual(['100:Znacznik: A']);
    expect(s.events.items).toHaveLength(1);
  });

  it('runs events that schedule further events (chains)', () => {
    let s = createGameState('t');
    s = run(s, marker(10, 'tick', { repeatEvery: 10, repeatTimes: 3 } as Partial<Command>), 0);
    s = advanceTo(s, 1000);
    expect(s.log.map((l) => l.at)).toEqual([10, 20, 30, 40]);
  });

  it('never mutates its input', () => {
    const s = run(createGameState('t'), marker(5, 'A'), 0);
    const before = JSON.stringify(s);
    advanceTo(s, 100);
    applyCommand(s, marker(1, 'B'), 50);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('cannot go back in time', () => {
    const s = advanceTo(createGameState('t'), 100);
    expect(() => advanceTo(s, 50)).toThrow();
  });
});

describe('applyCommand', () => {
  it('advances to the command time first', () => {
    let s = run(createGameState('t'), marker(10, 'A'), 0);
    s = run(s, { type: 'AddPlayer', playerId: 'p1', name: 'Łukasz' }, 20);
    expect(s.time).toBe(20);
    expect(labels(s)).toEqual(['10:Znacznik: A']);
    expect(s.players.p1?.name).toBe('Łukasz');
  });

  it('rejects invalid commands with a Polish message and leaves the state unchanged', () => {
    let s = run(createGameState('t'), { type: 'AddPlayer', playerId: 'p1', name: 'A' }, 0);
    const out = applyCommand(s, { type: 'AddPlayer', playerId: 'p1', name: 'B' }, 5);
    expect(out.result).toEqual({
      ok: false,
      error: { code: 'PLAYER_EXISTS', message: 'Gracz o tym identyfikatorze już istnieje.' },
    });
    expect(out.state.players.p1?.name).toBe('A');
    s = out.state;
    const empty = applyCommand(s, { type: 'RenamePlayer', playerId: 'p1', name: '   ' }, 5);
    expect(empty.result.ok).toBe(false);
    if (!empty.result.ok) expect(empty.result.error.code).toBe('NAME_EMPTY');
    const missing = applyCommand(s, { type: 'RenamePlayer', playerId: 'nobody', name: 'X' }, 5);
    if (!missing.result.ok) expect(missing.result.error.message).toBe('Nie ma takiego gracza.');
    expect(applyCommand(s, marker(-1, 'x'), 5).result.ok).toBe(false);
  });

  it('rejects commands from the past', () => {
    const s = advanceTo(createGameState('t'), 100);
    const out = applyCommand(s, marker(0, 'x'), 50);
    expect(out.result.ok).toBe(false);
    if (!out.result.ok) expect(out.result.error.code).toBe('TIME_IN_PAST');
    expect(out.state).toBe(s);
  });
});

describe('determinism', () => {
  const script: TimedCommand[] = [
    { at: 0, command: { type: 'AddPlayer', playerId: 'p1', name: 'Gracz' } },
    { at: 0, command: marker(MS_PER_MINUTE, 'raz', { roll: 100 } as Partial<Command>) },
    {
      at: 1000,
      command: marker(5000, 'seria', {
        roll: 6,
        repeatEvery: 777,
        repeatTimes: 25,
      } as Partial<Command>),
    },
    { at: 3000, command: { type: 'RenamePlayer', playerId: 'p1', name: 'Nowa nazwa' } },
    { at: 4000, command: { type: 'AddPlayer', playerId: 'p1', name: 'Duplikat' } },
    { at: 9000, command: marker(0, 'teraz', { roll: 20 } as Partial<Command>) },
  ];

  it('replaying the same commands from the same state gives an identical result', () => {
    const a = replay(createGameState('seed-1'), script, 10 * MS_PER_MINUTE);
    const b = replay(createGameState('seed-1'), script, 10 * MS_PER_MINUTE);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(a.results.map((r) => r.ok)).toEqual([true, true, true, true, false, true]);
    expect(a.state.log.length).toBe(28);
  });

  it('a different seed gives different rolls', () => {
    const a = replay(createGameState('seed-1'), script, 10 * MS_PER_MINUTE);
    const b = replay(createGameState('seed-2'), script, 10 * MS_PER_MINUTE);
    expect(labels(a.state)).not.toEqual(labels(b.state));
  });

  it('advancing in many small steps equals one big step', () => {
    const start = replay(createGameState('steps'), script, 0).state;
    const big = advanceTo(start, 10 * MS_PER_MINUTE);
    let small = start;
    for (let t = start.time + 1000; t <= 10 * MS_PER_MINUTE; t += 1000) small = advanceTo(small, t);
    expect(JSON.stringify(small)).toBe(JSON.stringify(big));
  });

  it('a saved and loaded state continues identically', () => {
    const mid = replay(createGameState('save'), script.slice(0, 3), 2000).state;
    const loaded = JSON.parse(JSON.stringify(mid)) as GameState;
    const a = replay(mid, script.slice(3), 10 * MS_PER_MINUTE).state;
    const b = replay(loaded, script.slice(3), 10 * MS_PER_MINUTE).state;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
