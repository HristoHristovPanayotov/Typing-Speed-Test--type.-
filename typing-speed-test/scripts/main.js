/* =============================================================
   main.js
   Entry point. Wires everything together and owns the
   test lifecycle (startNewTest, endTest).
   ============================================================= */

import { state, resetState, setMode, setQuota } from "./state.js";
import { CONFIG } from "./config.js";

import { loadDictionary, isDictionaryReady } from "./core/dictionary.js";
import { generateWords } from "./core/word-generator.js";
import { initTypingEngine, loadWords, getKeystrokeStats } from "./core/typing-engine.js";
import { startTimer, stopTimer, resetTimer, getElapsed } from "./core/timer.js";
import { computeFinalStats } from "./core/stats.js";

import { initNavbar, updateQuotaOptions, syncNavbarToState } from "./ui/navbar.js";
import { initTheme } from "./ui/theme.js";
import { initLetterModal, getAllowedLetters, formatPoolLabel } from "./ui/letter-modal.js";
import { initKeyboard, setKeyboardVisible } from "./ui/keyboard.js";
import { showResults, hideResults } from "./ui/results.js";

const dom = {
  typingView:        document.getElementById("typing-view"),
  resultsView:       document.getElementById("results-view"),
  metaPrimary:       document.getElementById("test-meta-primary"),
  metaSecondary:     document.getElementById("test-meta-secondary"),
  restartBtn:        document.getElementById("restart-btn"),
  restartBtnResults: document.getElementById("restart-btn-results"),
};

/* -------------------------------------------------------------
   Bootstrap
   ------------------------------------------------------------- */
async function init() {
  initTheme();

  await loadDictionary(CONFIG.DICTIONARY_PATH);

  initNavbar({
    onModeChange:     handleModeChange,
    onQuotaChange:    handleQuotaChange,
    onToggleKeyboard: handleKeyboardToggle,
  });
  initLetterModal({ onSave: handleLetterPoolChange });
  initKeyboard();
  initTypingEngine({
    onFirstKeypress:  handleTestStart,
    onProgress:       handleTestProgress,
    onWordsExhausted: handleQuotaReached,
  });

  document.addEventListener("keydown", handleGlobalKeys);
  dom.restartBtn.addEventListener("click", startNewTest);
  dom.restartBtnResults.addEventListener("click", startNewTest);

  syncNavbarToState();
  startNewTest();
}

/* -------------------------------------------------------------
   Test lifecycle
   ------------------------------------------------------------- */
export function startNewTest() {
  if (!isDictionaryReady()) return;

  stopTimer();
  resetTimer();
  resetState();
  hideResults();

  dom.resultsView.setAttribute("hidden", "");
  dom.typingView.removeAttribute("hidden");
  dom.typingView.classList.remove("is-fading");

  const requested = state.mode === "words"
    ? state.quota
    : CONFIG.TIME_MODE_WORD_BUFFER;

  const words = generateWords(state.allowedLetters, requested);
  loadWords(words);

  updateMetaDisplay();
}

function endTest() {
  // Capture the precise elapsed time before stopTimer() zeroes startMs
  const preciseElapsed = getElapsed();
  stopTimer();
  state.testActive = false;

  // For time mode use the quota as elapsed (timer ran to completion).
  // For words mode use the real wall-clock so the displayed duration
  // is accurate to the millisecond, not rounded to the last tick.
  const elapsedSeconds = state.mode === "time"
    ? state.quota
    : preciseElapsed;

  const ks = getKeystrokeStats();
  const finalStats = computeFinalStats({
    keystrokes: ks,
    elapsedSeconds,
    wpmHistory: state.wpmHistory,
  });

  dom.typingView.classList.add("is-fading");
  setTimeout(() => {
    dom.typingView.setAttribute("hidden", "");
    showResults({
      ...finalStats,
      mode:    state.mode,
      context: state.mode === "time"
        ? `time ${state.quota}`
        : `words ${state.quota}`,
      pool: formatPoolLabel(state.allowedLetters),
      elapsedSeconds,
    });
  }, CONFIG.FADE_MS);
}

/* -------------------------------------------------------------
   Callbacks
   ------------------------------------------------------------- */
function handleTestStart() {
  state.testActive = true;
  startTimer({
    mode:       state.mode,
    quota:      state.mode === "time" ? state.quota : Infinity,
    onTick:     handleTimerTick,
    onComplete: endTest,
  });
}

function handleTestProgress() {
  if (state.mode === "words") updateMetaDisplay();
}

function handleQuotaReached() {
  endTest();
}

function handleTimerTick({ elapsedSeconds, remainingSeconds, currentWpm }) {
  state.elapsedSeconds = elapsedSeconds;
  state.wpmHistory.push(currentWpm);
  if (state.mode === "time") {
    dom.metaPrimary.textContent = String(remainingSeconds);
  }
}

function handleModeChange(newMode) {
  setMode(newMode);
  updateQuotaOptions(newMode);
  startNewTest();
}

function handleQuotaChange(newQuota) {
  setQuota(newQuota);
  startNewTest();
}

function handleLetterPoolChange() {
  state.allowedLetters = getAllowedLetters();
  startNewTest();
}

function handleKeyboardToggle(isOn) {
  setKeyboardVisible(isOn);
}

/* -------------------------------------------------------------
   Helpers
   ------------------------------------------------------------- */
function updateMetaDisplay() {
  if (state.mode === "time") {
    dom.metaPrimary.textContent = String(state.quota);
  } else {
    const typed = getKeystrokeStats().wordsCompleted ?? 0;
    dom.metaPrimary.textContent = `${typed} / ${state.quota}`;
  }
  dom.metaSecondary.textContent = formatPoolLabel(state.allowedLetters);
}

function handleGlobalKeys(e) {
  if (e.key === "Tab") {
    e.preventDefault();
    const armed = (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        startNewTest();
      }
      document.removeEventListener("keydown", armed, true);
    };
    document.addEventListener("keydown", armed, { capture: true, once: true });
  }
}

/* -------------------------------------------------------------
   Go
   ------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", init);