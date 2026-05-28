/* =============================================================
   core/stats.js
   Pure typing-metric functions. No DOM, no state.

   Accuracy uses lifetime counters (never decremented by backspace)
   so correcting errors doesn't inflate the accuracy number.
   WPM uses uncorrected-error snapshot per spec §2.1.
   ============================================================= */

export function computeNetWpm(keystrokes, elapsedSeconds) {
  const minutes = elapsedSeconds / 60;
  if (minutes <= 0) return 0;

  const totalKeystrokes =
    keystrokes.correct + keystrokes.incorrect + keystrokes.extra;
  const grossWpm = (totalKeystrokes / 5) / minutes;
  const uncorrectedErrors = keystrokes.incorrect + keystrokes.extra;
  return Math.max(0, grossWpm - uncorrectedErrors / minutes);
}

export function computeRawWpm(keystrokes, elapsedSeconds) {
  const minutes = elapsedSeconds / 60;
  if (minutes <= 0) return 0;
  const totalKeystrokes =
    keystrokes.correct + keystrokes.incorrect + keystrokes.extra;
  return (totalKeystrokes / 5) / minutes;
}

/* Accuracy uses the lifetime counters, not the snapshot.
   lifetimeCorrect + lifetimeIncorrect = every key ever pressed. */
export function computeAccuracy(keystrokes) {
  const total = keystrokes.lifetimeCorrect + keystrokes.lifetimeIncorrect;
  if (total === 0) return 0;
  return (keystrokes.lifetimeCorrect / total) * 100;
}

export function computeFinalStats({ keystrokes, elapsedSeconds, wpmHistory }) {
  const safeElapsed = Math.max(elapsedSeconds, 1);
  return {
    netWpm:    computeNetWpm(keystrokes, safeElapsed),
    rawWpm:    computeRawWpm(keystrokes, safeElapsed),
    accuracy:  computeAccuracy(keystrokes),
    correct:   keystrokes.correct,
    incorrect: keystrokes.incorrect,
    extra:     keystrokes.extra,
    missed:    keystrokes.missed,
    elapsedSeconds: safeElapsed,
    wpmHistory: [...wpmHistory],
  };
}