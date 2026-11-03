import type { Command, Galaxy, Result } from '@ge/shared';
import type { FromWorker, ToWorker } from './protocol';

/** The page's handle on the simulation worker. */
export class SimClient {
  private readonly worker: Worker;
  private nextId = 1;
  private readonly pending = new Map<number, (r: Result) => void>();
  private worldWaiter: ((w: { galaxy: Galaxy; seed: string }) => void) | null = null;
  onError: (message: string) => void = (m) => console.error(m);

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.receive(e.data);
  }

  private send(msg: ToWorker): void {
    this.worker.postMessage(msg);
  }

  private receive(msg: FromWorker): void {
    if (msg.type === 'world') {
      this.worldWaiter?.({ galaxy: msg.galaxy, seed: msg.seed });
      this.worldWaiter = null;
    } else if (msg.type === 'result') {
      this.pending.get(msg.id)?.(msg.result);
      this.pending.delete(msg.id);
    } else {
      this.onError(msg.message);
    }
  }

  newGame(seed: string, systems: number): Promise<{ galaxy: Galaxy; seed: string }> {
    return new Promise((resolve) => {
      this.worldWaiter = resolve;
      this.send({ type: 'newGame', seed, systems });
    });
  }

  command(command: Command, time: number): Promise<Result> {
    const id = this.nextId++;
    return new Promise((resolve) => {
      this.pending.set(id, resolve);
      this.send({ type: 'command', id, command, time });
    });
  }
}
