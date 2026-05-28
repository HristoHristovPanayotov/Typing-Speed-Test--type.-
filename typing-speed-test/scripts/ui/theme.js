/* =============================================================
   ui/theme.js
   Owns the active visual theme. Reads/writes data-theme on
   <html>, so the entire CSS variable set in themes.css swaps
   over with a single attribute change.
   ============================================================= */

import { CONFIG } from "../config.js";

const STORAGE_KEY = CONFIG.STORAGE_KEYS.theme;

export function initTheme() {
  const select = document.getElementById("theme-select");

  // Apply the persisted theme (or default) before wiring the listener,
  // so the UI never flashes the wrong theme on load.
  const initial = loadTheme();
  applyTheme(initial);
  if (select) select.value = initial;

  if (select) {
    select.addEventListener("change", (e) => {
      const name = e.target.value;
      if (!CONFIG.THEMES.includes(name)) return;
      applyTheme(name);
      saveTheme(name);
    });
  }
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute("data-theme") || CONFIG.DEFAULT_THEME;
}

/* -------------------------------------------------------------
   Internals
   ------------------------------------------------------------- */
function applyTheme(name) {
  document.documentElement.setAttribute("data-theme", name);
}

function loadTheme() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && CONFIG.THEMES.includes(v)) return v;
  } catch (_) {
    // localStorage unavailable (private mode, etc) — fall through
  }
  return CONFIG.DEFAULT_THEME;
}

function saveTheme(name) {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch (_) {}
}