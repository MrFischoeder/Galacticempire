/// <reference lib="webworker" />
import { buildSnapshot, createWorkerState, handleMessage } from './handler';
import type { FromWorker, ToWorker } from './protocol';

const state = createWorkerState();
const post = (m: FromWorker) => self.postMessage(m);

self.onmessage = (event: MessageEvent<ToWorker>) => {
  for (const reply of handleMessage(state, event.data)) post(reply);
  if (event.data.type !== 'tick') sendSnapshot();
};

function sendSnapshot(): void {
  const snapshot = buildSnapshot(state);
  if (snapshot) post({ type: 'snapshot', snapshot });
}

// The game clock runs here (spec 23.2): real time in, game time out, 10 times a second.
let last = performance.now();
setInterval(() => {
  const now = performance.now();
  handleMessage(state, { type: 'tick', realMs: now - last });
  last = now;
}, 100);
setInterval(sendSnapshot, 250);
