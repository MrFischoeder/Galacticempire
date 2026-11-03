/**
 * Event queue ordered by game time (spec 19). A binary min-heap stored in a plain array,
 * so it serialises with the game state. Equal times keep insertion order (by `seq`).
 */
export interface Queued<E> {
  readonly at: number;
  readonly seq: number;
  readonly event: E;
}

export interface EventQueue<E> {
  items: Queued<E>[];
  nextSeq: number;
}

export function createQueue<E>(): EventQueue<E> {
  return { items: [], nextSeq: 0 };
}

function before<E>(a: Queued<E>, b: Queued<E>): boolean {
  return a.at < b.at || (a.at === b.at && a.seq < b.seq);
}

function swap<E>(items: Queued<E>[], i: number, j: number): void {
  const t = items[i] as Queued<E>;
  items[i] = items[j] as Queued<E>;
  items[j] = t;
}

/** Adds an event (mutates the queue). Returns its sequence number. */
export function enqueue<E>(queue: EventQueue<E>, at: number, event: E): number {
  if (!Number.isFinite(at)) throw new RangeError(`Event time must be finite, got ${at}`);
  const seq = queue.nextSeq++;
  const items = queue.items;
  items.push({ at, seq, event });
  let i = items.length - 1;
  while (i > 0) {
    const parent = (i - 1) >> 1;
    if (!before(items[i] as Queued<E>, items[parent] as Queued<E>)) break;
    swap(items, i, parent);
    i = parent;
  }
  return seq;
}

export function peek<E>(queue: EventQueue<E>): Queued<E> | undefined {
  return queue.items[0];
}

/** Removes and returns the earliest event (mutates the queue). */
export function dequeue<E>(queue: EventQueue<E>): Queued<E> | undefined {
  const items = queue.items;
  const top = items[0];
  if (top === undefined) return undefined;
  const last = items.pop() as Queued<E>;
  if (items.length > 0) {
    items[0] = last;
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < items.length && before(items[l] as Queued<E>, items[m] as Queued<E>)) m = l;
      if (r < items.length && before(items[r] as Queued<E>, items[m] as Queued<E>)) m = r;
      if (m === i) break;
      swap(items, i, m);
      i = m;
    }
  }
  return top;
}

export function queueSize<E>(queue: EventQueue<E>): number {
  return queue.items.length;
}

/** Removes every event matching the predicate (mutates the queue). */
export function removeWhere<E>(queue: EventQueue<E>, match: (event: E) => boolean): number {
  const kept = queue.items.filter((q) => !match(q.event));
  const removed = queue.items.length - kept.length;
  if (removed > 0) {
    queue.items = [];
    for (const q of kept.sort((a, b) => (before(a, b) ? -1 : 1))) queue.items.push(q);
  }
  return removed;
}
