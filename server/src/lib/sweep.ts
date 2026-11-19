import { runExpirySweep } from './expiry.js';
let last = 0;
let running: Promise<unknown> | null = null;
/** Run the expiry sweep at most every 10 seconds when data is read. */
export async function maybeSweep() {
  if (running) return running;
  if (Date.now() - last < 10_000) return;
  last = Date.now();
  running = runExpirySweep().catch((e) => console.error('sweep failed', e)).finally(() => { running = null; });
  return running;
}
