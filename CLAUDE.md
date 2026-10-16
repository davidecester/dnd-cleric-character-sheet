# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project

Mobile-first D&D 3.5 cleric character sheet. Plain static site, no build step:

- `index.html` — markup for all tabs (Overview, Combat, Skills, Magic, Gear, Story)
- `css/styles.css` — all styles ("liquid glass" dark theme, design tokens on `:root`)
- `js/storage.js` → `js/data.js` → `js/feats.js` → `js/classes.js` → `js/app.js` — load in that order
  - `data.js` holds `DEFAULT_DATA` (the character's baseline stats, restored by "Restore original")
  - `feats.js` holds `FEAT_RULES`, short 3.5 feat summaries shown on the Skills and Combat tabs
  - `classes.js` holds `CLASSES`, the 3.5 class tables (BAB, saves, hit die, skill points, spells per day);
    prestige classes go there in the same shape
  - `app.js` handles rendering, 3.5e rules math and autosave to local storage
  - The Character Build (header "Edit & level up") holds class levels, ability base/racial/items/increases and hp rolls;
    `computeBuild()` derives level, abilities, BAB, saves, max hp, attacks and spells per day from them

Open `index.html` directly in a browser to run it. The owner mainly uses it on iPhone Safari,
so check changes at phone width (~360px) and keep Safari quirks in mind (safe-area insets,
overscroll background).
Tablet (≥768px, 2 columns) and desktop (≥1280px, 3 columns) layouts live in the media queries
at the end of `styles.css`; check those widths too when adding or reordering cards.

## Workflow

- Commit every update to the session's working branch, push it, and **open a pull request
  against `main`** without waiting to be asked. If an open PR already exists for the branch,
  push to it instead of opening a new one.
- If the branch's previous PR has already been merged, bring the branch up to date with `main`
  (fast-forward or merge) before starting new work, and open a new PR for the new work.
- Don't rewrite history on pushed branches (no force-push); use merge commits instead.

## Conventions

- Table rulings that override the books:
  - Alignment domains are allowed whatever the cleric's alignment (Law is open to Caelian, Neutral Good).
    `IGNORE_DOMAIN_ALIGNMENT` in `classes.js`; don't block or warn on it.
  - Allowed domains are in `DOMAIN_OPTIONS` in `classes.js` (deity: Nature, Magic, Balance, Earth;
    ascension concept: Law, Good, Protection, Inquisition).
- Never use Pathfinder material (rules, wording, sources), even where it copies 3.5; only D&D 3.5 sources.
- Rules follow D&D 3.5 official sources. Books allowed at the owner's table (use only these for feats,
  spells, prestige classes and rules data):
  - Core: Player's Handbook, Dungeon Master's Guide
  - The Complete series (Arcane, Divine, Warrior, Adventurer, Champion, Mage, Psionic, Scoundrel)
  - Tome of Battle, Spell Compendium
  - Forgotten Realms: Forgotten Realms Campaign Setting, Races of Faerûn, and the Faerûn books tied to the
    character's race (lesser aasimar: Player's Guide to Faerûn)
- Distances are metric (3.5 convention: 5 ft = 1.5 m, so 30 ft = 9 m, 60 ft = 18 m). Don't add feet.
- Match the existing style: vanilla JS in an IIFE, ES5-style (`var`, `function`), no frameworks.
- Text that the user reads in view mode should wrap, not be clipped by fixed-width inputs.
  The header uses a view/edit toggle (Edit / Done, SVG icons from `ICONS` via `paintToggle()`); reuse that pattern for
  other sections that need editing.
