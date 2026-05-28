/* =============================================================
   ui/navbar.js
   Mode + quota toggle buttons. Each click handler calls
   syncNavbarToState() at the end so the visual active state
   always matches the real state — fixes both-highlighted bug.
   ============================================================= */

import { state } from "../state.js";
import { CONFIG } from "../config.js";

const KEY_MODE  = CONFIG.STORAGE_KEYS.mode;
const KEY_QUOTA = CONFIG.STORAGE_KEYS.quota;

let callbacks = {};
let modeBtns  = [];
let quotaGroup = null;

export function initNavbar(cbs = {}) {
  callbacks = cbs;

  restorePersistedSettings();

  modeBtns = Array.from(document.querySelectorAll(".control-btn[data-mode]"));
  modeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const newMode = btn.dataset.mode;
      if (newMode === state.mode) return;
      savePersisted(KEY_MODE, newMode);
      callbacks.onModeChange?.(newMode);
      // Sync after the callback so state has already been updated
      syncNavbarToState();
    });
  });

  quotaGroup = document.getElementById("quota-group");
  rebuildQuotaButtons(state.mode);

  // Sync once on load to clear any stale is-active from the HTML
  syncNavbarToState();
}

export function updateQuotaOptions(mode) {
  rebuildQuotaButtons(mode);
  syncNavbarToState();
}

export function syncNavbarToState() {
  // Mode buttons
  modeBtns.forEach(btn => {
    const active = btn.dataset.mode === state.mode;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", String(active));
  });

  // Quota buttons (may have been rebuilt, so re-query each time)
  if (!quotaGroup) return;
  quotaGroup.querySelectorAll(".control-btn[data-quota]").forEach(btn => {
    const active = Number(btn.dataset.quota) === state.quota;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-checked", String(active));
  });
}

/* -------------------------------------------------------------
   Internals
   ------------------------------------------------------------- */
function rebuildQuotaButtons(mode) {
  if (!quotaGroup) return;
  const options = CONFIG.QUOTAS[mode] || [];

  if (!options.includes(state.quota)) {
    state.quota = options[1] ?? options[0];
  }

  quotaGroup.innerHTML = options
    .map(q => `
      <button class="control-btn"
              data-quota="${q}"
              role="radio"
              aria-checked="false">${q}</button>
    `)
    .join("");

  // Bind clicks on the freshly created nodes
  quotaGroup.querySelectorAll(".control-btn[data-quota]").forEach(btn => {
    btn.addEventListener("click", () => {
      const newQuota = Number(btn.dataset.quota);
      if (newQuota === state.quota) return;
      savePersisted(KEY_QUOTA, newQuota);
      callbacks.onQuotaChange?.(newQuota);
      // Sync after callback so state is already updated
      syncNavbarToState();
    });
  });
}

function restorePersistedSettings() {
  try {
    const savedMode = localStorage.getItem(KEY_MODE);
    if (savedMode === "time" || savedMode === "words") state.mode = savedMode;

    const savedQuota = localStorage.getItem(KEY_QUOTA);
    if (savedQuota !== null) {
      const num = Number(savedQuota);
      if (CONFIG.QUOTAS[state.mode]?.includes(num)) state.quota = num;
    }
  } catch (_) {}
}

function savePersisted(key, value) {
  try { localStorage.setItem(key, String(value)); } catch (_) {}
}