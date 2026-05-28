/* =============================================================
   config.js
   Single source of truth for constants. Anything that might
   reasonably be tweaked lives here so we never hunt through
   the codebase for magic numbers.
   ============================================================= */

export const CONFIG = {
  /* ---------- Dictionary ---------- */
  // Relative to index.html (the page the browser loads)
  DICTIONARY_PATH: "./data/words.txt",

  // 'time' mode doesn't know how many words the user will type, so
  // we pre-generate a generous buffer. The typing engine can request
  // more if somehow exhausted (it won't be — 500 short words ≈ 100 WPM
  // for 5+ minutes).
  TIME_MODE_WORD_BUFFER: 500,

  /* ---------- Test defaults ---------- */
  DEFAULT_MODE: "time",      // 'time' | 'words'
  DEFAULT_QUOTA: 30,

  // Options shown in the navbar quota toggle, per mode
  QUOTAS: {
    time:  [15, 30, 60, 120],
    words: [10, 25, 50, 100],
  },

  // Default letter pool = full alphabet
  DEFAULT_ALLOWED_LETTERS: "abcdefghijklmnopqrstuvwxyz".split(""),

  /* ---------- Timing ---------- */
  WPM_SAMPLE_INTERVAL_MS: 1000,   // how often the timer samples Net WPM
  FADE_MS: 220,                   // must match --dur-base in main.css

  /* ---------- Theming ---------- */
  // Each entry must correspond to a [data-theme="..."] block in themes.css
  THEMES: ["charcoal", "bone", "midnight", "forest"],
  DEFAULT_THEME: "charcoal",

  /* ---------- Persistence ---------- */
  // Namespaced under "type." so they're easy to spot in DevTools
  STORAGE_KEYS: {
    theme:           "type.theme",
    allowedLetters:  "type.allowedLetters",
    mode:            "type.mode",
    quota:           "type.quota",
    keyboardVisible: "type.keyboardVisible",
  },
};