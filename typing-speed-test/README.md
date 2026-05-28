# type.

A lightweight browser-based typing speed test with time and word modes, customizable letter pools, an optional virtual keyboard, theme switching, and a live WPM performance chart.

## Features

- `time` and `words` test modes
- configurable quotas for time or number of words
- adjustable letter pool via a modal with presets
- live typing area with per-letter correctness feedback
- net WPM, raw WPM, and accuracy calculations
- interactive results screen with a performance chart
- optional on-screen keyboard highlight
- theme picker with multiple color schemes
- persistent user settings via `localStorage`

## Getting Started

### Run locally

1. Open `index.html` in a modern browser.
2. Alternatively, serve the folder with a local web server to avoid module/fetch restrictions.

### Controls

- `time` / `words` mode switch
- quota buttons to choose test length
- `letters` button to customize allowed letters
- `keyboard` button to toggle the virtual keyboard
- theme dropdown to change the visual style
- `restart` button to start a new test
- keyboard shortcut: `Tab` then `Enter` to restart
- `Esc` closes the letter pool modal

## Project Structure

- `index.html` — main app shell and markup
- `data/words.txt` — dictionary used to generate test words
- `scripts/config.js` — global constants and default options
- `scripts/state.js` — shared app state and setter helpers
- `scripts/main.js` — entry point, lifecycle orchestration, and event wiring

### Core modules (`scripts/core`)

- `dictionary.js` — loads the dictionary and computes bitmask representations for fast letter-pool filtering
- `word-generator.js` — filters valid words and generates a randomized sequence
- `typing-engine.js` — typing input handling, caret movement, word state, and keystroke stats
- `timer.js` — elapsed timer, tick loop, and completion callbacks
- `stats.js` — net WPM, raw WPM, and accuracy calculations

### UI modules (`scripts/ui`)

- `navbar.js` — mode/quota controls and persisted settings
- `letter-modal.js` — letter pool selection modal and presets
- `keyboard.js` — optional on-screen keyboard with key highlighting
- `results.js` — final summary screen with metrics and chart rendering
- `theme.js` — theme selection and persistence
- `chart.js` — chart rendering powered by Chart.js

- `styles/` — component-specific styles for layout, themes, keyboard, modal, results, and typing interface

## Architecture Notes

- The app uses ES modules with an entry point at `scripts/main.js`.
- The dictionary is loaded once from `data/words.txt` and stored in memory.
- Letter pools are implemented with 26-bit masks for extremely fast word filtering.
- Accuracy is based on lifetime first-attempt keystrokes, while net WPM is based on uncorrected errors.
- `localStorage` persists theme, mode, quota, allowed letters, and virtual keyboard visibility.

## Algorithms and Formulas

### Letter pool filtering
- Each word is mapped to a 26-bit integer mask `M_word`. For each letter `c` in the word, the bit `2^{(c - 'a')}` is set.
- The allowed letter set is converted to a mask `M_allowed` in the same way.
- A word is allowed if and only if:
  - `(M_word & M_allowed) = M_word`
- In set notation, this means:
  - `Letters(word) \subseteq AllowedLetters`
- Because both masks are integers, this membership test is computed with a single bitwise AND operation per word.

### Word generation
- The generator builds a filtered pool `P = { w | (M_w & M_allowed) = M_w }`.
- It then produces `n` samples with replacement from `P`, where `n` is the requested word count.
- When `|P|` is large enough, the generator adds a light variety constraint to avoid the immediately previous word, but the sampling remains with replacement.

### Typing statistics
- Define:
  - `C = correct` keystrokes
  - `I = incorrect` keystrokes
  - `E = extra` keystrokes
  - `T = elapsedSeconds`
  - `m = T / 60` (elapsed minutes)
- Gross keystrokes-per-minute is:
  - `grossWPM = ((C + I + E) / 5) / m`
- Uncorrected errors are:
  - `U = I + E`
- Net WPM is then:
  - `netWPM = grossWPM - (U / m)`
- Accuracy uses lifetime counts that are not decremented by backspace:
  - `accuracy = (lifetimeCorrect / (lifetimeCorrect + lifetimeIncorrect)) * 100`
- This gives a percentage of first-pass correctness, where corrections do not inflate the score.

### Timer and sampling
- The app samples WPM once per second using `CONFIG.WPM_SAMPLE_INTERVAL_MS`.
- In `time` mode, the test terminates when `elapsedSeconds >= quota`.
- In `words` mode, the final completion time is computed with a high-resolution timestamp from `performance.now()`, so the result is not artificially rounded to the nearest second.

## Customization

- Add or update themes in `styles/themes.css` and `scripts/config.js`.
- Adjust time/word quotas in `scripts/config.js` under `CONFIG.QUOTAS`.
- Change the dictionary source path in `scripts/config.js` via `CONFIG.DICTIONARY_PATH`.

## Notes

- This project depends on `Chart.js` via CDN in `index.html`.
- Opening `index.html` directly in the browser should work in most cases, but using a local server is recommended for reliable ES module and fetch behavior.
