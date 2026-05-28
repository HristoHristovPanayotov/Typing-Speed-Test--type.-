/* =============================================================
   state.js
   Centralized state + setters.
   ============================================================= */

import { CONFIG } from "./config.js";

export const state = {
  testActive: false,
  mode: CONFIG.DEFAULT_MODE,
  quota: CONFIG.DEFAULT_QUOTA,
  difficulty: CONFIG.DEFAULT_DIFFICULTY,
  allowedLetters: [...CONFIG.DEFAULT_ALLOWED_LETTERS],
  wpmHistory: [],
  elapsedSeconds: 0,
};

export function resetState() {
  state.testActive = false;
  state.wpmHistory = [];
  state.elapsedSeconds = 0;
}

export function setMode(newMode) {
  if (newMode !== "time" && newMode !== "words") return;
  state.mode = newMode;
  const options = CONFIG.QUOTAS[newMode];
  state.quota = options[1] ?? options[0];
}

export function setQuota(newQuota) {
  const num = Number(newQuota);
  if (Number.isFinite(num) && num > 0) state.quota = num;
}

export function setDifficulty(d) {
  if (CONFIG.DIFFICULTIES.includes(d)) state.difficulty = d;
}

export function setAllowedLetters(letters) {
  if (Array.isArray(letters) && letters.length > 0) {
    state.allowedLetters = [...letters];
  }
}