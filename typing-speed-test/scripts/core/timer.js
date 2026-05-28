/* =============================================================
   core/timer.js
   The 1-second sample loop. Owns the wall-clock for an active
   test and reports per-tick {elapsedSeconds, remainingSeconds,
   currentWpm} to main.js via the onTick callback.
   ============================================================= */

import { CONFIG } from "../config.js";
import { getKeystrokeStats } from "./typing-engine.js";
import { computeNetWpm } from "./stats.js";

let intervalId = null;
let startMs = 0;
let mode = "time";
let quota = 30;
let onTick = null;
let onComplete = null;

export function startTimer({ mode: m, quota: q, onTick: tickCb, onComplete: doneCb }) {
  stopTimer();
  mode = m;
  quota = q;
  onTick = tickCb;
  onComplete = doneCb;

  startMs = performance.now();
  intervalId = setInterval(tick, CONFIG.WPM_SAMPLE_INTERVAL_MS);
  if (mode === "time") tick();
}

export function stopTimer() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function resetTimer() {
  stopTimer();
  startMs = 0;
  onTick = null;
  onComplete = null;
}

/* getElapsed — returns the precise elapsed seconds at the exact
   moment it's called. Used by endTest() in words mode so the
   displayed completion time isn't rounded to the last tick. */
export function getElapsed() {
  if (startMs === 0) return 0;
  return (performance.now() - startMs) / 1000;
}

function tick() {
  const elapsedMs = performance.now() - startMs;
  const elapsedSeconds = Math.max(0, Math.round(elapsedMs / 1000));

  const ks = getKeystrokeStats();
  const currentWpm = computeNetWpm(ks, Math.max(elapsedSeconds, 1));

  const remainingSeconds = mode === "time"
    ? Math.max(0, quota - elapsedSeconds)
    : Infinity;

  onTick?.({ elapsedSeconds, remainingSeconds, currentWpm });

  if (mode === "time" && elapsedSeconds >= quota) {
    stopTimer();
    onComplete?.();
  }
}