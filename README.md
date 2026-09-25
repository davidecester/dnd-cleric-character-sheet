# Caelian Vàel — Case File

A single-page, mobile-friendly character sheet for **Caelian Vàel**, a Lesser Aasimar Cleric 5 (D&D 3.5e). Built as one self-contained HTML file — no build step, no dependencies, no backend.

## What it does

- Ability scores, HP tracker, Armor Class, Saving Throws, Attack/Grapple, and Initiative — with the math (AC breakdown, save components, grapple, initiative) computed from the 3.5e SRD rules, not just typed-in totals
- Spells organized by level, each with its own save DC, spells-per-day total, and prepared-spell list
- Combat, Domains, Gear (equipment, mount gear, coin ledger), and Notes tabs
- A Story tab for a background image, portrait, appearance, backstory, and ideal
- Every field is editable and saves automatically as you play

## Project structure

```
dnd-caelian-cleric-character-sheet/
├── index.html        Page layout: header, tabs, and every card
├── css/
│   └── styles.css    All styling (Liquid Glass look, colors, spacing)
├── js/
│   ├── storage.js    Where edits are saved (browser local storage)
│   ├── data.js       Caelian's default stats, gear, skills, spells
│   └── app.js        Rules math, rendering, buttons, and events
├── README.md
├── LICENSE
└── .gitignore
```

The scripts load in this order: `storage.js` → `data.js` → `app.js`. Keep that order in `index.html`.

## Where to make common edits

| I want to… | Edit |
|---|---|
| Change a baseline stat, item, or skill | `js/data.js` |
| Change colors, fonts, or spacing | `css/styles.css` (color variables are at the top, under `:root`) |
| Add or rename a card or section | `index.html` |
| Change how a number is calculated | `js/app.js` (look for `recomputeDerived` and `updateSkillTotals`) |

Changes to `data.js` only show up after pressing **Restore original case file** (Story tab), because edits you've already made in the browser take priority.

## How saving works

This page saves your edits in the browser's **local storage** — meaning:

- Your changes persist as long as you keep using the *same browser on the same device* and don't clear its site data
- Edits do **not** sync across different browsers or devices (no account, no server — it's just a static file)
- Clearing your browser's cache/site data for this page will erase your saved edits, so avoid that if you want to keep your progress

If you ever want cross-device sync, that would need a small backend — out of scope for this simple version, but worth knowing as a limitation.

## Running it locally

No installation needed. Just open `index.html` in any browser, or serve the folder with any static file server, e.g.:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Disclaimer

This is an unofficial, personal fan tool for tracking one character in home games. It isn't affiliated with or endorsed by Wizards of the Coast. Dungeons & Dragons and D&D are trademarks of Wizards of the Coast LLC.
