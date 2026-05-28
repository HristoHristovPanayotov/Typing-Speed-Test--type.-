/* =============================================================
   ui/results.js
   Populates the results view at test end (spec §5).
   In words mode, shows the time it took to complete the quota
   as an additional stat beneath the hero metrics.
   ============================================================= */

import { renderWpmChart, destroyChart } from "./chart.js";

const dom = {
  view:    null,
  wpm:     null,
  acc:     null,
  raw:     null,
  context: null,
  pool:    null,
  chars:   null,
  canvas:  null,
  // The time stat row is only injected in words mode
  timeStat: null,
};

let cached = false;

/* -------------------------------------------------------------
   showResults(data)
   {
     netWpm, rawWpm, accuracy,
     correct, incorrect, extra, missed,
     wpmHistory,
     mode,          // 'time' | 'words'
     context,       // "time 30" | "words 50"
     pool,
     elapsedSeconds
   }
   ------------------------------------------------------------- */
export function showResults(data) {
  cacheDom();
  if (!dom.view) return;

  // Hero metrics
  dom.wpm.textContent = formatNumber(data.netWpm);
  dom.acc.textContent = `${formatNumber(data.accuracy)}%`;

  // Secondary stats
  dom.raw.textContent     = `${formatNumber(data.rawWpm)} wpm`;
  dom.context.textContent = data.context ?? "—";
  dom.pool.textContent    = data.pool ?? "—";
  dom.chars.textContent   =
    `${data.correct}/${data.incorrect}/${data.extra}/${data.missed}`;

  // Words-mode completion time — inject/update the stat row
  updateTimeStat(data);

  // Reveal
  dom.view.removeAttribute("hidden");
  dom.view.classList.add("is-fading");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => dom.view.classList.remove("is-fading"));
  });

  // Render chart after the view is in the layout
  setTimeout(() => {
    if (dom.canvas && Array.isArray(data.wpmHistory)) {
      renderWpmChart(dom.canvas, data.wpmHistory);
    }
  }, 60);
}

export function hideResults() {
  cacheDom();
  if (!dom.view) return;
  dom.view.setAttribute("hidden", "");
  dom.view.classList.remove("is-fading");
  destroyChart();
  // Reset cached so the next showResults() call re-queries the DOM
  // cleanly — particularly important for updateTimeStat injections.
  cached = false;
}

/* -------------------------------------------------------------
   Words-mode time stat
   Injects a stat block into .results-secondary showing how long
   the user took to type all the words. Hidden in time mode.
   ------------------------------------------------------------- */
function updateTimeStat(data) {
  const secondary = dom.view.querySelector(".results-secondary");
  if (!secondary) return;

  // Remove any existing time stat block first (test restart)
  const existing = secondary.querySelector(".results-stat--time");
  if (existing) existing.remove();

  if (data.mode !== "words") return;

  const elapsed = data.elapsedSeconds ?? 0;
  const formatted = formatTime(elapsed);

  const statEl = document.createElement("div");
  statEl.className = "results-stat results-stat--time";
  statEl.innerHTML = `
    <span class="results-stat-label">time</span>
    <span class="results-stat-value">${formatted}</span>
    <span class="results-stat-sub">to complete ${data.context?.split(" ")[1] ?? ""} words</span>
  `;

  // Insert as the first stat so it sits prominently top-left
  secondary.prepend(statEl);
}

/* -------------------------------------------------------------
   Helpers
   ------------------------------------------------------------- */
function cacheDom() {
  if (cached) return;
  dom.view    = document.getElementById("results-view");
  dom.wpm     = document.getElementById("result-wpm");
  dom.acc     = document.getElementById("result-acc");
  dom.raw     = document.getElementById("result-raw");
  dom.context = document.getElementById("result-context");
  dom.pool    = document.getElementById("result-pool");
  dom.chars   = document.getElementById("result-chars");
  dom.canvas  = document.getElementById("wpm-chart");
  cached = true;
}

function formatNumber(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return String(Math.round(n));
}

/* formatTime — converts seconds to a readable duration.
   < 60s  → "42s"
   >= 60s → "1:07" */
function formatTime(seconds) {
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}