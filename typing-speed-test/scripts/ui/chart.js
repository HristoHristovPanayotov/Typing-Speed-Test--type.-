/* =============================================================
   ui/chart.js
   Chart.js wrapper for the post-test WPM line chart (spec §5.2).
   Pulls colors from the active CSS theme at render time so the
   chart matches whatever theme is currently on <html>.

   Chart.js itself is loaded via CDN in index.html (the global
   `Chart` constructor). No bundler needed.
   ============================================================= */

let chartInstance = null;

/* -------------------------------------------------------------
   renderWpmChart(canvas, wpmHistory)
   - canvas: <canvas> element to draw into
   - wpmHistory: number[] — one Net WPM sample per second
   ------------------------------------------------------------- */
export function renderWpmChart(canvas, wpmHistory) {
  if (typeof Chart === "undefined") {
    console.warn("[chart] Chart.js not loaded — skipping render");
    return;
  }
  if (!canvas || !Array.isArray(wpmHistory) || wpmHistory.length === 0) {
    return;
  }

  destroyChart();

  const ctx = canvas.getContext("2d");
  const theme = readThemeColors();

  // Gradient for the area under the line — accent fading to transparent
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 200);
  gradient.addColorStop(0, hexToRgba(theme.accent, 0.35));
  gradient.addColorStop(1, hexToRgba(theme.accent, 0));

  const labels = wpmHistory.map((_, i) => String(i + 1));
  const monoFont = { family: "JetBrains Mono, monospace", size: 11 };

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "wpm",
        data: wpmHistory,
        borderColor: theme.accent,
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: theme.accent,
        pointHoverBorderColor: theme.text,
        pointHoverBorderWidth: 2,
        fill: true,
        tension: 0.35,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 900,
        easing: "easeOutCubic",
      },
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: theme.subAlt,
          titleColor: theme.text,
          bodyColor: theme.text,
          borderColor: theme.sub,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          titleFont: monoFont,
          bodyFont: monoFont,
          callbacks: {
            title: (items) => `${items[0].label}s`,
            label: (item) => `${Math.round(item.parsed.y)} wpm`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "seconds", color: theme.sub, font: monoFont },
          ticks: { color: theme.sub, font: monoFont, maxTicksLimit: 8 },
          grid: { color: theme.subAlt, drawBorder: false },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: "wpm", color: theme.sub, font: monoFont },
          ticks: { color: theme.sub, font: monoFont },
          grid: { color: theme.subAlt, drawBorder: false },
        },
      },
    },
  });
}

export function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

/* -------------------------------------------------------------
   Helpers
   ------------------------------------------------------------- */
function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  // Fallbacks are sensible defaults so the chart still renders if a
  // variable is missing from a theme block.
  return {
    accent: (styles.getPropertyValue("--accent") || "#e6b450").trim(),
    text:   (styles.getPropertyValue("--text")   || "#d4be98").trim(),
    sub:    (styles.getPropertyValue("--sub")    || "#7c6f64").trim(),
    subAlt: (styles.getPropertyValue("--sub-alt") || "#3c3836").trim(),
    bg:     (styles.getPropertyValue("--bg")     || "#1d2021").trim(),
  };
}

/* Convert "#rrggbb" or "#rgb" to "rgba(r, g, b, a)". Used for the
   semi-transparent gradient fill under the chart line. */
function hexToRgba(hex, alpha) {
  let h = String(hex).trim().replace("#", "");
  if (h.length === 3) h = h.split("").map(c => c + c).join("");
  if (h.length !== 6) return `rgba(230, 180, 80, ${alpha})`; // safe fallback
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}