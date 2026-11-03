import type { Command, Galaxy, RaceId, Result, TimeMultiplier } from '@ge/shared';
import type { FromWorker, Snapshot, ToWorker } from './protocol';

export interface World {
  readonly galaxy: Galaxy;
  readonly seed: string;
  readonly playerId: string;
  readonly homePlanet: string;
}

/** The page's handle on the simulation worker. */
export class SimClient {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, (r: Result) => void>();
  private worldWaiter: ((w: World) => void) | null = null;
  onError: (message: string) => void = (m) => console.error(m);
  onSnapshot: (s: Snapshot) => void = () => {};

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.receive(e.data);
  }

  private send(msg: ToWorker): void {
    this.worker.postMessage(msg);
  }

  private receive(msg: FromWorker): void {
    if (msg.type === 'world') {
      this.worldWaiter?.(msg);
      this.worldWaiter = null;
    } else if (msg.type === 'snapshot') {
      this.onSnapshot(msg.snapshot);
    } else if (msg.type === 'result') {
      this.pending.get(msg.id)?.(msg.result);
      this.pending.delete(msg.id);
    } else {
      this.onError(msg.message);
    }
  }

  newGame(seed: string, systems: number, race: RaceId): Promise<World> {
    return new Promise((resolve) => {
      this.worldWaiter = resolve;
      this.send({ type: 'newGame', seed, systems, race });
    });
  }

  command(command: Command): Promise<Result> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.send({ type: 'command', id, command });
    });
  }

  speed(multiplier: TimeMultiplier): void {
    this.send({ type: 'speed', multiplier });
  }

  pause(paused: boolean): void {
    this.send({ type: 'pause', paused });
  }

  skip(hours: number): void {
    this.send({ type: 'skip', hours });
  }
}
