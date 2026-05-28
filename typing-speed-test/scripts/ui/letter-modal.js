/* =============================================================
   ui/letter-modal.js
   The "letter pool" modal — spec §4.2. Builds its own DOM
   inside the empty <div id="letter-modal"> placeholder from
   index.html. Owns the working selection while open, commits
   on save, persists to localStorage.

   When open it sets document.body.dataset.modalOpen = "true"
   so the typing engine knows to ignore keystrokes.
   ============================================================= */

import { state, setAllowedLetters } from "../state.js";
import { CONFIG } from "../config.js";
import { getPoolSize } from "../core/word-generator.js";

const STORAGE_KEY = CONFIG.STORAGE_KEYS.allowedLetters;
const ALPHABET = "abcdefghijklmnopqrstuvwxyz".split("");

let modalEl = null;
let onSaveCallback = null;
let workingSelection = new Set(); // current selection while modal is open
let isOpen = false;

/* -------------------------------------------------------------
   Public API
   ------------------------------------------------------------- */
export function initLetterModal({ onSave } = {}) {
  onSaveCallback = onSave;
  modalEl = document.getElementById("letter-modal");
  if (!modalEl) return;

  // Restore persisted selection BEFORE the first test is generated
  const persisted = loadAllowedLetters();
  if (persisted) setAllowedLetters(persisted);

  buildModalContent();
  wireEvents();
}

export function getAllowedLetters() {
  return state.allowedLetters;
}

/* formatPoolLabel — used by main.js for the typing area subtitle
   and the results screen "letter pool" stat. */
export function formatPoolLabel(letters) {
  if (!letters || letters.length === 0) return "no letters";
  if (letters.length === 26) return "all letters";
  if (letters.length <= 10) return letters.join("·");
  return `${letters.length} of 26 letters`;
}

/* -------------------------------------------------------------
   DOM construction
   ------------------------------------------------------------- */
function buildModalContent() {
  modalEl.innerHTML = `
    <div class="modal" role="document">
      <header class="modal-header">
        <h2 class="modal-title">letter pool</h2>
        <p class="modal-subtitle">
          choose which letters can appear in your test words
        </p>
      </header>

      <div class="modal-presets" role="group" aria-label="Quick presets">
        <button class="modal-btn" data-preset="all">enable all</button>
        <button class="modal-btn" data-preset="none">disable all</button>
        <button class="modal-btn" data-preset="home-row">home row</button>
        <button class="modal-btn" data-preset="vowels">vowels</button>
        <button class="modal-btn" data-preset="left-hand">left hand</button>
        <button class="modal-btn" data-preset="right-hand">right hand</button>
      </div>

      <div class="letter-grid" role="group" aria-label="Alphabet">
        ${ALPHABET.map(l => `
          <button class="letter-cell" data-letter="${l}" aria-pressed="false">
            ${l}
          </button>
        `).join("")}
      </div>

      <footer class="modal-footer">
        <div class="modal-stats">
          <span class="modal-stat" id="lm-count">0 selected</span>
          <span class="modal-stat-divider">·</span>
          <span class="modal-stat" id="lm-pool-size">— words available</span>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--ghost" id="lm-cancel">cancel</button>
          <button class="modal-btn modal-btn--primary" id="lm-save">save</button>
        </div>
      </footer>
    </div>
  `;
}

function wireEvents() {
  // Open trigger lives in the navbar
  const trigger = document.getElementById("open-letter-modal");
  if (trigger) trigger.addEventListener("click", open);

  // Letter cells
  modalEl.querySelectorAll(".letter-cell").forEach(cell => {
    cell.addEventListener("click", () => toggleLetter(cell.dataset.letter));
  });

  // Presets
  modalEl.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => applyPreset(btn.dataset.preset));
  });

  // Save / cancel
  modalEl.querySelector("#lm-save").addEventListener("click", save);
  modalEl.querySelector("#lm-cancel").addEventListener("click", close);

  // Backdrop click closes
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) close();
  });

  // Esc closes
  document.addEventListener("keydown", (e) => {
    if (isOpen && e.key === "Escape") {
      e.preventDefault();
      close();
    }
  });
}

/* -------------------------------------------------------------
   Open / close
   ------------------------------------------------------------- */
function open() {
  workingSelection = new Set(state.allowedLetters);
  renderSelection();

  modalEl.removeAttribute("hidden");
  // Defer the .is-open class so CSS can transition from hidden state
  requestAnimationFrame(() => {
    modalEl.classList.add("is-open");
  });
  isOpen = true;
  document.body.dataset.modalOpen = "true";

  // Move focus inside the modal for keyboard users
  setTimeout(() => {
    const firstCell = modalEl.querySelector(".letter-cell");
    firstCell?.focus();
  }, 60);
}

function close() {
  modalEl.classList.remove("is-open");
  isOpen = false;
  document.body.dataset.modalOpen = "false";
  // Wait for transition before fully hiding
  setTimeout(() => {
    if (!isOpen) modalEl.setAttribute("hidden", "");
  }, 220);
}

/* -------------------------------------------------------------
   Selection logic
   ------------------------------------------------------------- */
function toggleLetter(letter) {
  if (workingSelection.has(letter)) workingSelection.delete(letter);
  else workingSelection.add(letter);
  renderSelection();
}

function applyPreset(name) {
  const presets = {
    "all":        ALPHABET,
    "none":       [],
    "home-row":   ["a", "s", "d", "f", "j", "k", "l"],
    "vowels":     ["a", "e", "i", "o", "u"],
    "left-hand":  ["q", "w", "e", "r", "t", "a", "s", "d", "f", "g", "z", "x", "c", "v", "b"],
    "right-hand": ["y", "u", "i", "o", "p", "h", "j", "k", "l", "n", "m"],
  };
  workingSelection = new Set(presets[name] || []);
  renderSelection();
}

function renderSelection() {
  modalEl.querySelectorAll(".letter-cell").forEach(cell => {
    const on = workingSelection.has(cell.dataset.letter);
    cell.classList.toggle("is-selected", on);
    cell.setAttribute("aria-pressed", String(on));
  });

  const count = workingSelection.size;
  const countEl = modalEl.querySelector("#lm-count");
  if (countEl) {
    countEl.textContent = `${count} of 26 selected`;
  }

  // Live pool-size readout — cheap thanks to the cache in word-generator.js
  const poolEl = modalEl.querySelector("#lm-pool-size");
  if (poolEl) {
    if (count === 0) {
      poolEl.textContent = "— no words available";
    } else {
      const size = getPoolSize([...workingSelection]);
      poolEl.textContent = `${size.toLocaleString()} words available`;
    }
  }

  // Disable save if zero selected — no test could be generated
  const saveBtn = modalEl.querySelector("#lm-save");
  if (saveBtn) saveBtn.disabled = count === 0;
}

function save() {
  if (workingSelection.size === 0) return;
  const arr = [...workingSelection].sort();
  setAllowedLetters(arr);
  saveAllowedLetters(arr);
  close();
  onSaveCallback?.();
}

/* -------------------------------------------------------------
   Persistence
   ------------------------------------------------------------- */
function loadAllowedLetters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch (_) {}
  return null;
}

function saveAllowedLetters(arr) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (_) {}
}