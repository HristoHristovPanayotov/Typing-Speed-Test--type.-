/* =============================================================
   ui/keyboard.js
   The optional on-screen QWERTY. Owns:
     - building the rows once on init
     - the toggle button in the navbar
     - illuminating keys when the user types them (real hardware
       events are mirrored to the on-screen keys via a brief class)
   ============================================================= */

import { CONFIG } from "../config.js";

const STORAGE_KEY = CONFIG.STORAGE_KEYS.keyboardVisible;

// Standard QWERTY. The last "row" is just the spacebar.
const KEYBOARD_LAYOUT = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
  ["space"],
];

let keyboardEl = null;
let toggleBtn = null;
let isVisible = false;
const keyMap = new Map(); // 'a' -> <span>

export function initKeyboard() {
  keyboardEl = document.getElementById("virtual-keyboard");
  toggleBtn = document.getElementById("toggle-keyboard");
  if (!keyboardEl) return;

  buildKeyboard();

  // Wire the toggle and apply persisted preference
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => setKeyboardVisible(!isVisible));
  }
  setKeyboardVisible(loadVisibility());

  // Mirror physical keys to the virtual keyboard
  document.addEventListener("keydown", handleKeydown);
  document.addEventListener("keyup", handleKeyup);
}

export function setKeyboardVisible(visible) {
  isVisible = Boolean(visible);
  if (!keyboardEl) return;

  if (isVisible) {
    keyboardEl.removeAttribute("hidden");
    keyboardEl.setAttribute("aria-hidden", "false");
  } else {
    keyboardEl.setAttribute("hidden", "");
    keyboardEl.setAttribute("aria-hidden", "true");
  }

  if (toggleBtn) {
    toggleBtn.setAttribute("aria-pressed", String(isVisible));
    toggleBtn.classList.toggle("is-active", isVisible);
  }

  saveVisibility(isVisible);
}

/* -------------------------------------------------------------
   DOM construction
   ------------------------------------------------------------- */
function buildKeyboard() {
  keyboardEl.innerHTML = "";
  keyMap.clear();

  for (const row of KEYBOARD_LAYOUT) {
    const rowEl = document.createElement("div");
    rowEl.className = "vkb-row";

    for (const key of row) {
      const keyEl = document.createElement("span");
      const isSpace = key === "space";
      keyEl.className = "vkb-key" + (isSpace ? " vkb-key--space" : "");
      keyEl.dataset.key = key;
      keyEl.textContent = isSpace ? "" : key;
      rowEl.appendChild(keyEl);
      keyMap.set(key, keyEl);
    }
    keyboardEl.appendChild(rowEl);
  }
}

/* -------------------------------------------------------------
   Hardware mirroring
   ------------------------------------------------------------- */
function handleKeydown(e) {
  if (!isVisible) return;
  const k = normalizeKey(e.key);
  const el = keyMap.get(k);
  if (el) el.classList.add("is-pressed");
}

function handleKeyup(e) {
  if (!isVisible) return;
  const k = normalizeKey(e.key);
  const el = keyMap.get(k);
  if (el) el.classList.remove("is-pressed");
}

function normalizeKey(key) {
  if (key === " " || key === "Spacebar") return "space";
  return key.toLowerCase();
}

/* -------------------------------------------------------------
   Persistence
   ------------------------------------------------------------- */
function loadVisibility() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch (_) {
    return false;
  }
}

function saveVisibility(v) {
  try {
    localStorage.setItem(STORAGE_KEY, String(v));
  } catch (_) {}
}