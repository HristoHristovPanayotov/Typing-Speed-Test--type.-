/* =============================================================
   core/typing-engine.js
   Owns the typing area DOM, keydown handling, per-word state,
   caret positioning, and keystroke statistics.

   Two sets of counters:
     Snapshot  — current state of each word (including corrections).
                 Used for uncorrected-error WPM (spec §2.1).
     Lifetime  — cumulative first-attempt keystrokes, never decremented.
                 Used for accuracy so backspacing to fix errors doesn't
                 inflate the accuracy number.
   ============================================================= */

/* -------------------------------------------------------------
   Module state
   ------------------------------------------------------------- */
let words = [];
let wordStates = [];
let letterRefs = [];
let extraRefs = [];
let wordRefs = [];

let wordIndex = 0;
let started = false;

// Lifetime counters — increment on every keypress, never on backspace
let lifetimeCorrect = 0;
let lifetimeIncorrect = 0;

let callbacks = {
  onFirstKeypress: null,
  onProgress: null,
  onWordsExhausted: null,
};

let typingArea = null;
let wordsContainer = null;
let caret = null;

const MAX_EXTRAS = 8;

/* -------------------------------------------------------------
   Public API
   ------------------------------------------------------------- */
export function initTypingEngine(cbs = {}) {
  callbacks = { ...callbacks, ...cbs };

  typingArea    = document.getElementById("typing-area");
  wordsContainer = document.getElementById("words");
  caret          = document.getElementById("caret");

  if (!typingArea || !wordsContainer || !caret) {
    console.warn("[typing-engine] missing DOM nodes");
    return;
  }

  document.addEventListener("keydown", handleKeydown);
  typingArea.addEventListener("click", () => typingArea.focus());
  window.addEventListener("resize", () => requestAnimationFrame(updateCaret));
}

export function loadWords(newWords) {
  words      = Array.isArray(newWords) ? newWords : [];
  wordStates = words.map(() => ({ typed: [], passed: false }));
  letterRefs = [];
  extraRefs  = [];
  wordRefs   = [];
  wordIndex  = 0;
  started    = false;
  lifetimeCorrect   = 0;
  lifetimeIncorrect = 0;

  wordsContainer.innerHTML = "";
  wordsContainer.style.transform = "translateY(0)";

  if (words.length === 0) {
    const empty = document.createElement("div");
    empty.className = "words-empty";
    empty.textContent = "no matching words — try expanding your letter pool";
    wordsContainer.appendChild(empty);
    caret.style.opacity = "0";
    return;
  }

  caret.style.opacity = "1";

  const frag = document.createDocumentFragment();
  for (let i = 0; i < words.length; i++) {
    const wordDiv = document.createElement("div");
    wordDiv.className = "word" + (i === 0 ? " is-active" : "");
    wordDiv.dataset.index = String(i);

    const letterEls = [];
    for (let j = 0; j < words[i].length; j++) {
      const span = document.createElement("span");
      span.className = "letter";
      span.textContent = words[i][j];
      wordDiv.appendChild(span);
      letterEls.push(span);
    }

    letterRefs.push(letterEls);
    extraRefs.push([]);
    wordRefs.push(wordDiv);
    frag.appendChild(wordDiv);
  }

  // FIX: caret is now INSIDE .words so it inherits the translateY scroll
  // and stays correctly positioned when lines scroll out of view.
  wordsContainer.appendChild(frag);
  wordsContainer.appendChild(caret);

  requestAnimationFrame(() => {
    updateCaret();
    updateScroll();
  });
}

/* getKeystrokeStats — returns both snapshot (for WPM) and lifetime
   (for accuracy) counts so each metric uses the right source. */
export function getKeystrokeStats() {
  // Snapshot: what's currently wrong in the words the user passed through
  let correct = 0, incorrect = 0, extra = 0, missed = 0;
  let wordsCompleted = 0;

  for (let i = 0; i < wordStates.length; i++) {
    const ws   = wordStates[i];
    const word = words[i];
    let nonExtraTyped = 0;

    for (const t of ws.typed) {
      if (t.extra) {
        extra++;
      } else {
        if (t.correct) correct++; else incorrect++;
        nonExtraTyped++;
      }
    }

    if (ws.passed) {
      wordsCompleted++;
      if (nonExtraTyped < word.length) missed += word.length - nonExtraTyped;
    }
  }

  return {
    // Snapshot counts (for uncorrected-error WPM)
    correct, incorrect, extra, missed,
    wordsCompleted,
    // Lifetime counts (for accuracy — never decremented by backspace)
    lifetimeCorrect,
    lifetimeIncorrect,
  };
}

/* -------------------------------------------------------------
   Keyboard handler
   ------------------------------------------------------------- */
function handleKeydown(e) {
  if (document.body.dataset.modalOpen === "true") return;
  const tag = (document.activeElement?.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return;
  if (e.key === "Tab") return;
  if (words.length === 0) return;

  if (e.key === "Backspace") {
    e.preventDefault();
    if (e.ctrlKey || e.altKey) handleCtrlBackspace();
    else handleBackspace();
    afterInputUpdate();
    return;
  }

  if (e.key === " " || e.key === "Spacebar") {
    e.preventDefault();
    if (wordStates[wordIndex].typed.length === 0) return;
    handleSpace();
    afterInputUpdate();
    return;
  }

  if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    e.preventDefault();
    handleCharacter(e.key);
    afterInputUpdate();
  }
}

function afterInputUpdate() {
  if (!started) {
    started = true;
    callbacks.onFirstKeypress?.();
  }
  callbacks.onProgress?.();
  updateCaret();
  updateScroll();
}

/* -------------------------------------------------------------
   Per-key handlers
   ------------------------------------------------------------- */
function handleCharacter(ch) {
  const ws      = wordStates[wordIndex];
  const word    = words[wordIndex];
  const wordEl  = wordRefs[wordIndex];
  const nonExtraCount = countNonExtra(ws);

  if (nonExtraCount < word.length) {
    const expected  = word[nonExtraCount];
    const isCorrect = ch === expected;

    ws.typed.push({ char: ch, correct: isCorrect, extra: false });

    // Lifetime accuracy counters — always increment, never decrement
    if (isCorrect) lifetimeCorrect++;
    else lifetimeIncorrect++;

    const letterEl = letterRefs[wordIndex][nonExtraCount];
    letterEl.classList.add(isCorrect ? "is-correct" : "is-incorrect");
    if (!isCorrect) letterEl.dataset.typed = ch;
  } else {
    const extraCount = ws.typed.filter(t => t.extra).length;
    if (extraCount >= MAX_EXTRAS) return;

    ws.typed.push({ char: ch, correct: false, extra: true });
    lifetimeIncorrect++; // extra chars always count as incorrect

    const extraEl = document.createElement("span");
    extraEl.className = "letter is-extra";
    extraEl.textContent = ch;
    wordEl.insertBefore(extraEl, caret.parentNode === wordEl ? caret : null);
    extraRefs[wordIndex].push(extraEl);
  }
}

function handleBackspace() {
  const ws = wordStates[wordIndex];

  if (ws.typed.length > 0) {
    const removed = ws.typed.pop();
    // NOTE: we do NOT decrement lifetime counters here — that's the whole
    // point. Accuracy reflects first-attempt keystrokes only.
    if (removed.extra) {
      const extraEl = extraRefs[wordIndex].pop();
      if (extraEl) extraEl.remove();
    } else {
      const nonExtraCount = countNonExtra(ws);
      const letterEl = letterRefs[wordIndex][nonExtraCount];
      if (letterEl) {
        letterEl.classList.remove("is-correct", "is-incorrect");
        delete letterEl.dataset.typed;
      }
    }
    return;
  }

  // Back into previous word if it had errors
  if (wordIndex > 0) {
    const prev     = wordStates[wordIndex - 1];
    const prevWord = words[wordIndex - 1];
    const prevNonExtra = countNonExtra(prev);
    const prevHasErrors =
      prev.typed.some(t => (!t.extra && !t.correct) || t.extra) ||
      prevNonExtra < prevWord.length;

    if (prevHasErrors) {
      wordRefs[wordIndex].classList.remove("is-active");
      wordIndex--;
      prev.passed = false;
      wordRefs[wordIndex].classList.remove("has-errors");
      wordRefs[wordIndex].classList.add("is-active");
    }
  }
}

function handleCtrlBackspace() {
  const ws = wordStates[wordIndex];
  if (ws.typed.length === 0) { handleBackspace(); return; }

  for (const el of letterRefs[wordIndex]) {
    el.classList.remove("is-correct", "is-incorrect");
    delete el.dataset.typed;
  }
  for (const el of extraRefs[wordIndex]) el.remove();
  extraRefs[wordIndex] = [];
  ws.typed = [];
}

function handleSpace() {
  const ws   = wordStates[wordIndex];
  const word = words[wordIndex];
  const nonExtraCount = countNonExtra(ws);

  ws.passed = true;

  const hasIncorrect = ws.typed.some(t => !t.extra && !t.correct);
  const hasExtras    = ws.typed.some(t => t.extra);
  const isShort      = nonExtraCount < word.length;
  if (hasIncorrect || hasExtras || isShort) {
    wordRefs[wordIndex].classList.add("has-errors");
  }

  wordRefs[wordIndex].classList.remove("is-active");
  wordIndex++;

  if (wordIndex >= words.length) {
    callbacks.onWordsExhausted?.();
    return;
  }
  wordRefs[wordIndex].classList.add("is-active");
}

/* -------------------------------------------------------------
   Caret
   The caret lives inside .words (appended in loadWords) so it
   inherits the translateY scroll transform automatically.
   ------------------------------------------------------------- */
function updateCaret() {
  if (wordIndex >= wordRefs.length) { caret.style.opacity = "0"; return; }
  caret.style.opacity = "1";

  const ws          = wordStates[wordIndex];
  const wordLetters = letterRefs[wordIndex];
  const extras      = extraRefs[wordIndex];
  const containerRect = wordsContainer.getBoundingClientRect();

  let x, y, h;

  if (extras.length > 0) {
    const r = extras[extras.length - 1].getBoundingClientRect();
    x = r.right; y = r.top; h = r.height;
  } else {
    const nonExtraCount = countNonExtra(ws);
    if (nonExtraCount < wordLetters.length) {
      const r = wordLetters[nonExtraCount].getBoundingClientRect();
      x = r.left; y = r.top; h = r.height;
    } else if (wordLetters.length > 0) {
      const r = wordLetters[wordLetters.length - 1].getBoundingClientRect();
      x = r.right; y = r.top; h = r.height;
    } else {
      return;
    }
  }

  // Position relative to .words container (which carries the transform)
  caret.style.left   = `${x - containerRect.left}px`;
  caret.style.top    = `${y - containerRect.top}px`;
  caret.style.height = `${h}px`;
}

/* Scroll so the active word sits on the second visible line */
function updateScroll() {
  if (!wordRefs[wordIndex] || !wordRefs[0]) return;

  const activeTop  = wordRefs[wordIndex].offsetTop;
  const baseTop    = wordRefs[0].offsetTop;
  const lineHeight = wordRefs[wordIndex].offsetHeight || 40;

  const linesDown       = Math.round((activeTop - baseTop) / lineHeight);
  const linesToShiftUp  = Math.max(0, linesDown - 1);
  wordsContainer.style.transform = `translateY(${-linesToShiftUp * lineHeight}px)`;
}

function countNonExtra(ws) {
  let n = 0;
  for (const t of ws.typed) if (!t.extra) n++;
  return n;
}