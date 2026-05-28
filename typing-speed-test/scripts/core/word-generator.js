/* =============================================================
   core/word-generator.js
   Filters the dictionary by the user's allowed letter set and
   returns a random sample of `count` words.

   The filter check (per spec §2.2):
     (wordMask & allowedMask) === wordMask

   In plain English: every letter the word uses must also be
   in the allowed set. Single integer AND — ~5M ops/sec easy.
   ============================================================= */

import { getEntries, lettersToMask } from "./dictionary.js";

// Cache the matching pool for the last-used mask. Lets us
// re-sample new words on test restarts without re-filtering.
let cachedMask = -1;
let cachedPool = [];

/* -------------------------------------------------------------
   filterByMask — runs the bitwise scan exactly once per
   distinct allowedMask, then caches the result.
   ------------------------------------------------------------- */
function filterByMask(allowedMask) {
  if (allowedMask === cachedMask) return cachedPool;

  const entries = getEntries();
  const pool = [];
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    // (wordMask & allowedMask) === wordMask
    if ((e.mask & allowedMask) === e.mask) {
      pool.push(e.word);
    }
  }

  cachedMask = allowedMask;
  cachedPool = pool;
  return pool;
}

/* -------------------------------------------------------------
   generateWords(allowedLetters, count)
   - allowedLetters: array of single lowercase chars e.g. ['a','s','d']
   - count: how many words to return
   Returns an array of `count` words sampled with replacement from
   the filtered pool. Sampling with replacement is intentional —
   it makes tiny letter pools usable and matches Monkeytype.
   ------------------------------------------------------------- */
export function generateWords(allowedLetters, count) {
  const allowedMask = lettersToMask(allowedLetters);
  if (allowedMask === 0) return [];

  const pool = filterByMask(allowedMask);
  if (pool.length === 0) return [];

  const out = new Array(count);
  let last = "";
  for (let i = 0; i < count; i++) {
    // Light de-duplication: avoid the immediately previous word
    // when the pool is big enough that it costs us nothing.
    let pick;
    let tries = 0;
    do {
      pick = pool[Math.floor(Math.random() * pool.length)];
      tries++;
    } while (pick === last && pool.length > 5 && tries < 4);
    out[i] = pick;
    last = pick;
  }
  return out;
}

/* -------------------------------------------------------------
   getPoolSize(allowedLetters) — utility for the letter modal
   to show users how big their current pool is.
   ------------------------------------------------------------- */
export function getPoolSize(allowedLetters) {
  const mask = lettersToMask(allowedLetters);
  if (mask === 0) return 0;
  return filterByMask(mask).length;
}