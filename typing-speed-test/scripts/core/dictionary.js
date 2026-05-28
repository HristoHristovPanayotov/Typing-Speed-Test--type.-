/* =============================================================
   core/dictionary.js
   Loads the master word list once at startup and precomputes
   a 26-bit mask for every word. After this runs, filtering
   500k words by allowed-letters is a single bitwise AND per
   word (spec §2.2 optimization requirement).

   Letter -> bit mapping:
     'a' = bit 0  (value 1)
     'b' = bit 1  (value 2)
     ...
     'z' = bit 25 (value 33554432)

   A word's mask is the OR of the bits of all its (unique) letters.
   A word is allowed iff (wordMask & allowedMask) === wordMask,
   i.e. every bit set in the word is also set in the allowed mask.
   ============================================================= */

// Internal store. Each entry: { word: string, mask: number }
let entries = [];
let ready = false;
let loadPromise = null;

const A_CODE = "a".charCodeAt(0);
const Z_CODE = "z".charCodeAt(0);

/* -------------------------------------------------------------
   loadDictionary — fetch and process the word list.
   Idempotent: calling it twice returns the same promise.
   ------------------------------------------------------------- */
export function loadDictionary(path) {
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed to load dictionary at ${path}: ${res.status}`);
    }
    const text = await res.text();

    // Split, normalize, filter. We keep only words that are:
    //   - between 1 and 20 chars (avoids weird outliers)
    //   - lowercase a-z only (no digits, apostrophes, hyphens, accents)
    // This filtering also guarantees every char fits in our 26-bit mask.
    const lines = text.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      const word = lines[i].trim().toLowerCase();
      if (word.length === 0 || word.length > 20) continue;

      const mask = computeMask(word);
      if (mask === -1) continue; // rejected: contained a non-a-z character
      out.push({ word, mask });
    }

    entries = out;
    ready = true;
    console.info(
      `[dictionary] loaded ${entries.length.toLocaleString()} words from ${path}`
    );
  })();

  return loadPromise;
}

/* -------------------------------------------------------------
   computeMask — returns the 26-bit OR-of-letters mask for a word,
   or -1 if the word contains any non-a-z character.
   ------------------------------------------------------------- */
function computeMask(word) {
  let mask = 0;
  for (let i = 0; i < word.length; i++) {
    const code = word.charCodeAt(i);
    if (code < A_CODE || code > Z_CODE) return -1;
    mask |= (1 << (code - A_CODE));
  }
  return mask;
}

/* -------------------------------------------------------------
   lettersToMask — converts ['a','e','i','o','u'] into a mask.
   Used by word-generator.js to build the "allowed" mask once
   per call (so the inner loop stays pure bitwise).
   ------------------------------------------------------------- */
export function lettersToMask(letters) {
  let mask = 0;
  for (let i = 0; i < letters.length; i++) {
    const ch = letters[i];
    if (typeof ch !== "string" || ch.length !== 1) continue;
    const code = ch.charCodeAt(0);
    if (code < A_CODE || code > Z_CODE) continue;
    mask |= (1 << (code - A_CODE));
  }
  return mask;
}

/* -------------------------------------------------------------
   Public accessors
   ------------------------------------------------------------- */
export function isDictionaryReady() {
  return ready;
}

export function getEntries() {
  return entries;
}

export function getDictionarySize() {
  return entries.length;
}