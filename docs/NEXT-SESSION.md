# Next session: hand-off notes

Context for a new Claude Code chat on this repository. Read `CLAUDE.md` first (workflow, rules,
allowed books, table rulings); this file covers what was in progress and what's still to do.

## Before starting the new chat

1. **Merge the open PR** on `claude/adoring-darwin-nu784w` (Character Build, long-text view, SVG icons,
   Story lightbox, feat plan, Law notice). A new session must start from an up-to-date `main`.
2. **Allow the rules websites** for the cloud environment. In the session's title bar, open the
   environment menu → **Edit** → **Network access** → **Limited**, and add these under **Allowed domains**
   (keep "Allow package managers" ticked). Steps: https://code.claude.com/docs/en/cloud-environments#network-access
   - `www.d20srd.org`: official 3.5 SRD (class, domain, spell rules)
   - `www.realmshelps.net`: Forgotten Realms domains (Nature domain link)
   - `dtdnd.neocities.org`: Spell Compendium PDF (Balance domain)
   - `www.enworld.org`: domain lists (only as a pointer; confirm in a D&D book)

## Starter message for the new chat

> Read `CLAUDE.md` and `docs/NEXT-SESSION.md`. The network now allows the rules sites. Start with the
> domain data: Nature https://www.realmshelps.net/deities/domain/Nature_(Shaman) and Balance in the
> Spell Compendium https://dtdnd.neocities.org/books/player/Spell%20Compendium.pdf (p. 271).

## Still to do

1. **Domains: done.** All 8 have rules; Nature is the Oriental Adventures shaman domain, allowed by table
   ruling (see `CLAUDE.md`). Two-domain picker in the Character Build; Law notice quotes the PHB rule.
2. **Turning trackers: done.** The Turn Undead card counts attempts used today (with Undo and New day),
   has Divine Metamagic buttons once a "Divine Metamagic (…)" feat is in the feats list (cost 1 + slot increase,
   from `levels` in `feats.js`), and shows Earth / Nature turning cards with their own uses when those domains are chosen.
3. **Level-up button: done.** "Level up to N" in the Character Build opens a guided card: hit die (type or roll)
   → ability +1 at 4/8/12… → skill points (budget, max ranks, cross-class half ranks) → feat if due (from the
   feat plan, or another) → summary of before/after numbers → confirm. "Undo level N" reverses the last one
   (`state.lastLevelUp`). When prestige classes exist, add a class choice as the first step (`lu.cls`).
4. **Prestige classes.** The owner plans one or two; they'll send which. Add each to `CLASSES` in
   `js/classes.js` (BAB, saves, hit die, skill points, spellcasting advance via `casterOf`).
5. **Feat plan, level 18:** still to choose (options in the Build card and in the level-up feat step: Quicken Spell,
   Martial Study (Devoted Spirit), a third Extra Turning, or something else).
6. **Check on the owner's iPhone:** hp digits no longer cropped; icon/label centring with IBM Plex Mono.

## Character facts (Caelian Vàel)

- Lesser aasimar (Faerûn, Player's Guide to Faerûn): no level adjustment, Humanoid (planetouched);
  +2 Wis, +2 Cha; darkvision 18 m; resist acid/cold/electricity 5; Daylight 1/day; +2 Listen/Spot.
- Cleric 6, Neutral Good. Base abilities 18/10/16/10/18/12; +1 Wis at level 4; Periapt of Wisdom +2.
- HP rolls 8 (max at 1st), then 7s: 61 max. Skill ranks: Concentration 9, Knowledge (religion) 8, Diplomacy 1.
- Feats: Power Attack (1), Extend Spell (3), Persistent Spell (6). Plan: Divine Metamagic (Persistent) 9,
  Extra Turning 12 and 15, level 18 open. Divine Metamagic + Persistent costs 7 turn attempts; he has
  5/day until Extra Turning at 12.
- Gear: +1 Longspear (two-handed), Morningstar, Full Plate, Periapt of Wisdom +2, Cloak of Resistance +1,
  Healer's kit (+2 Heal, in Misc). Gold 617 gp after the latest ledger lines.
- Spellbook app (linked on the Magic tab): https://dnd-caelian-spellbook.cesterdav.workers.dev/

## How the owner likes the UI

- Mobile first (iPhone Safari); check 360 px and 820 px with Playwright
  (`executablePath: '/opt/pw-browsers/chromium'`).
- Progressive disclosure: short text plus a "Show more" link (colour only, not bold or italic) rather
  than long blocks.
- Icons as inline SVG (`ICONS` in `app.js`), never text glyphs; icon and label centred together.
- Edit behind Edit / Done toggles; read view shows plain wrapped text.
- Keep rule notices short, and only from D&D 3.5 sources.
- Saved sheets live in the owner's browser (localStorage); data changes need a one-time migration in
  `loadState()` that keeps the owner's own edits.
