import { describe, expect, it } from 'vitest';
import { createQueue, dequeue, enqueue, peek, queueSize, removeWhere, Rng } from '../src/index';

const drain = <E>(q: ReturnType<typeof createQueue<E>>) => {
  const out: E[] = [];
  for (let e = dequeue(q); e; e = dequeue(q)) out.push(e.event);
  return out;
};

describe('EventQueue', () => {
  it('returns events in time order', () => {
    const q = createQueue<string>();
    enqueue(q, 30, 'c');
    enqueue(q, 10, 'a');
    enqueue(q, 20, 'b');
    expect(peek(q)?.event).toBe('a');
    expect(drain(q)).toEqual(['a', 'b', 'c']);
    expect(queueSize(q)).toBe(0);
  });

  it('keeps insertion order for equal times', () => {
    const q = createQueue<string>();
    for (const name of ['first', 'second', 'third', 'fourth']) enqueue(q, 5, name);
    enqueue(q, 1, 'early');
    expect(drain(q)).toEqual(['early', 'first', 'second', 'third', 'fourth']);
  });

  it('sorts many random events stably', () => {
    const rng = Rng.fromSeed('queue');
    const q = createQueue<number>();
    const added: { at: number; id: number }[] = [];
    for (let id = 0; id < 2000; id++) {
      const at = rng.int(0, 200);
      added.push({ at, id });
      enqueue(q, at, id);
    }
    const expected = [...added].sort((a, b) => a.at - b.at || a.id - b.id).map((e) => e.id);
    expect(drain(q)).toEqual(expected);
  });

  it('survives JSON round trips', () => {
    const q = createQueue<string>();
    enqueue(q, 3, 'x');
    enqueue(q, 1, 'y');
    const copy = JSON.parse(JSON.stringify(q)) as typeof q;
    enqueue(copy, 2, 'z');
    expect(drain(copy)).toEqual(['y', 'z', 'x']);
  });

  it('removes matching events and keeps the order of the rest', () => {
    const q = createQueue<number>();
    [5, 1, 4, 2, 3].forEach((n) => enqueue(q, n, n));
    expect(removeWhere(q, (n) => n % 2 === 0)).toBe(2);
    expect(drain(q)).toEqual([1, 3, 5]);
  });

  it('rejects non-finite times', () => {
    expect(() => enqueue(createQueue<string>(), Number.NaN, 'x')).toThrow();
  });
});
