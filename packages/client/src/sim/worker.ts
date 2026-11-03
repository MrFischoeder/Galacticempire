/// <reference lib="webworker" />
import { handleMessage } from './handler';
import type { ToWorker, WorkerState } from './protocol';

const state: WorkerState = { game: null };

self.onmessage = (event: MessageEvent<ToWorker>) => {
  for (const reply of handleMessage(state, event.data)) self.postMessage(reply);
};
