# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project

Mobile-first D&D 3.5 cleric character sheet. Plain static site, no build step:

- `index.html` — markup for all tabs (Overview, Combat, Skills, Magic, Gear, Story)
- `css/styles.css` — all styles ("liquid glass" dark theme, design tokens on `:root`)
- `js/storage.js` → `js/data.js` → `js/feats.js` → `js/app.js` — load in that order
  - `data.js` holds `DEFAULT_DATA` (the character's baseline stats, restored by "Restore original")
  - `feats.js` holds `FEAT_RULES`, the 3.5 feat rules summaries shown on the Skills tab
  - `app.js` handles rendering, 3.5e rules math and autosave to local storage

Open `index.html` directly in a browser to run it. The owner mainly uses it on iPhone Safari,
so check changes at phone width (~360px) and keep Safari quirks in mind (safe-area insets,
overscroll background).

## Workflow

- Commit every update to the session's working branch, push it, and **open a pull request
  against `main`** without waiting to be asked. If an open PR already exists for the branch,
  push to it instead of opening a new one.
- If the branch's previous PR has already been merged, bring the branch up to date with `main`
  (fast-forward or merge) before starting new work, and open a new PR for the new work.
- Don't rewrite history on pushed branches (no force-push); use merge commits instead.

## Conventions

- Match the existing style: vanilla JS in an IIFE, ES5-style (`var`, `function`), no frameworks.
- Text that the user reads in view mode should wrap, not be clipped by fixed-width inputs.
  The header uses a view/edit toggle (`✎ Edit` / `✓ Done`) for this; reuse that pattern for
  other sections that need editing.
