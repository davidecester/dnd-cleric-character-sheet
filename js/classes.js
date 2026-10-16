/* =========================================================
   Class tables — D&D 3.5 rules (Player's Handbook)
   Everything that grows with class level: base attack, base saves,
   hit die, skill points and spells per day. Prestige classes go here
   too, in the same shape (add casterOf to advance an existing
   class's spellcasting).
   ========================================================= */
window.CaseFile = window.CaseFile || {};
(function(){
  "use strict";

  // Spells per day by class level (row 0 = level 1), one entry per spell level 0–9.
  // Bonus spells for a high ability and the domain slot are added by the sheet.
  var CLERIC_SPELLS = [
    [3,1], [4,2], [4,2,1], [5,3,2], [5,3,2,1],
    [5,3,3,2], [6,4,3,2,1], [6,4,3,3,2], [6,4,4,3,2,1], [6,4,4,3,3,2],
    [6,5,4,4,3,2,1], [6,5,4,4,3,3,2], [6,5,5,4,4,3,2,1], [6,5,5,4,4,3,3,2], [6,5,5,5,4,4,3,2,1],
    [6,5,5,5,4,4,3,3,2], [6,5,5,5,5,4,4,3,2,1], [6,5,5,5,5,4,4,3,3,2], [6,5,5,5,5,5,4,4,3,3], [6,5,5,5,5,5,4,4,4,4]
  ];

  var CLASSES = {
    "Cleric": {
      hitDie: 8, skillPoints: 2, bab: "medium",
      saves: { fort: "good", ref: "poor", will: "good" },
      caster: { ability: "wis", domains: true, perDay: CLERIC_SPELLS },
      turnsUndead: true
    }
  };

  // Domains Caelian may choose (two at a time). "deity" = his deity's domains; "ascension" =
  // domains of his own divine concept (the god-shards storyline). Each has its granted power and
  // domain spells 1–9 (name + one-line summary, distances in metres), from the source named.
  // Book rule (PHB, cleric): an alignment domain (Chaos, Evil, Good, Law) needs a matching
  // alignment. Table ruling: allowed whatever the alignment, so Law is open to Caelian (Neutral Good).
  var DOMAIN_OPTIONS = [
    // Nature comes from Oriental Adventures (shaman domain, as listed on realmshelps.net). Not on the book
    // list, but the owner allows this domain by table ruling.
    { name:"Nature", group:"deity", source:"Oriental Adventures (shaman domain), allowed by table ruling",
      turning:{ title:"Rebuke animals · plants", desc:"Rebuke or command normal animals or plant creatures, as an evil cleric rebukes undead." },
      power:"Rebuke or command normal animals or plant creatures as an evil cleric rebukes or commands undead. 3 + Charisma modifier times per day.",
      spells:[
        ["Trance", "Meditate to learn about nearby spirits."],
        ["Commune with Lesser Spirit", "Lesser spirit creature answers one question/two levels."],
        ["Possess Animal", "You possess a normal animal."],
        ["Elemental Ward", "Drives elementals away."],
        ["Commune with Greater Spirit", "Any spirit creature answers one question/level."],
        ["Transport via Plants", "Move instantly from one plant to another of the same kind."],
        ["Control Weather", "Changes weather in local area."],
        ["Animal Shapes", "One ally/level polymorphs into chosen animal."],
        ["Shapechange", "Transforms you into any creature, and change forms once per round."]
      ] },
    { name:"Magic", group:"deity", source:"Player's Handbook",
      power:"Use scrolls, wands and other spell-completion or spell-trigger items as a wizard of half your cleric level (at least 1st).",
      spells:[
        ["Nystul's Magic Aura", "Alters an object's magic aura."],
        ["Identify", "Determines properties of a magic item."],
        ["Dispel Magic", "Cancels magical spells and effects."],
        ["Imbue with Spell Ability", "Transfer spells to subject."],
        ["Spell Resistance", "Subject gains SR 12 + level."],
        ["Antimagic Field", "Negates magic within 3 m."],
        ["Spell Turning", "Reflect 1d4+6 spell levels back at caster."],
        ["Protection from Spells", "Confers +8 resistance bonus."],
        ["Mordenkainen's Disjunction", "Dispels magic, disenchants magic items."]
      ] },
    { name:"Balance", group:"deity", source:"Spell Compendium p. 271",
      power:"Once per day, as a free action, add your Wisdom modifier to your Armor Class for 1 round per cleric level.",
      spells:[
        ["Make Whole", "Repairs an object."],
        ["Calm Emotions", "Calms creatures, negating emotion effects."],
        ["Clarity of Mind", "+4 on saves against mind-affecting spells and abilities; reroll concealment miss chance."],
        ["Dismissal", "Forces a creature to return to its native plane."],
        ["Sanctuary, Mass", "One creature/level can't be attacked, and can't attack."],
        ["Banishment", "Banishes 2 HD/level of extraplanar creatures."],
        ["Word of Balance", "Kills, paralyzes, weakens or nauseates nonneutral creatures."],
        ["Protection from Spells", "Confers +8 resistance bonus."],
        ["Weighed in the Balance", "Harms or heals creatures within 9 m of you."]
      ] },
    { name:"Earth", group:"deity", source:"Player's Handbook",
      turning:{ title:"Turn air · rebuke earth", desc:"Turn or destroy air creatures; rebuke, command or bolster earth creatures." },
      power:"Turn or destroy air creatures as a good cleric turns undead; rebuke, command or bolster earth creatures as an evil cleric rebukes undead. 3 + Charisma modifier times per day (supernatural).",
      spells:[
        ["Magic Stone", "Three stones become +1 projectiles, 1d6+1 damage."],
        ["Soften Earth and Stone", "Turns stone to clay or dirt to sand or mud."],
        ["Stone Shape", "Sculpts stone into any shape."],
        ["Spike Stones", "Creatures in area take 1d8 damage, may be slowed."],
        ["Wall of Stone", "Creates a stone wall that can be shaped."],
        ["Stoneskin", "Ignore 10 points of damage per attack."],
        ["Earthquake", "Intense tremor shakes a 24 m radius."],
        ["Iron Body", "Your body becomes living iron."],
        ["Elemental Swarm", "Summons multiple elementals (earth spell only)."]
      ] },
    { name:"Law", group:"ascension", source:"Player's Handbook", alignment:"lawful",
      power:"You cast law spells at +1 caster level.",
      spells:[
        ["Protection from Chaos", "+2 to AC and saves, counter mind control, hedge out elementals and outsiders."],
        ["Calm Emotions", "Calms creatures, negating emotion effects."],
        ["Magic Circle against Chaos", "As protection spells, but 3 m radius and 10 min./level."],
        ["Order's Wrath", "Damages and dazes chaotic creatures."],
        ["Dispel Chaos", "+4 bonus against attacks by chaotic creatures."],
        ["Hold Monster", "As hold person, but any creature."],
        ["Dictum", "Kills, paralyzes, slows or deafens nonlawful subjects."],
        ["Shield of Law", "+4 to AC, +4 resistance, and SR 25 against chaotic spells."],
        ["Summon Monster IX", "Calls extraplanar creature to fight for you (law spell only)."]
      ] },
    { name:"Good", group:"ascension", source:"Player's Handbook", alignment:"good",
      power:"You cast good spells at +1 caster level.",
      spells:[
        ["Protection from Evil", "+2 to AC and saves, counter mind control, hedge out elementals and outsiders."],
        ["Aid", "+1 on attack rolls and saves against fear, 1d8 temporary hp +1/level (max +10)."],
        ["Magic Circle against Evil", "As protection spells, but 3 m radius and 10 min./level."],
        ["Holy Smite", "Damages and blinds evil creatures."],
        ["Dispel Evil", "+4 bonus against attacks by evil creatures."],
        ["Blade Barrier", "Wall of blades deals 1d6/level damage."],
        ["Holy Word", "Kills, paralyzes, blinds or deafens nongood subjects."],
        ["Holy Aura", "+4 to AC, +4 resistance, and SR 25 against evil spells."],
        ["Summon Monster IX", "Calls extraplanar creature to fight for you (good spell only)."]
      ] },
    { name:"Protection", group:"ascension", source:"Player's Handbook",
      power:"Once per day, as a standard action, touch someone to give a resistance bonus equal to your cleric level on their next saving throw (abjuration, lasts 1 hour; supernatural).",
      spells:[
        ["Sanctuary", "Opponents can't attack you, and you can't attack."],
        ["Shield Other", "You take half of subject's damage."],
        ["Protection from Energy", "Absorb 12 points/level of damage from one kind of energy."],
        ["Spell Immunity", "Subject is immune to one spell per four levels."],
        ["Spell Resistance", "Subject gains SR 12 + level."],
        ["Antimagic Field", "Negates magic within 3 m."],
        ["Repulsion", "Creatures can't approach you."],
        ["Mind Blank", "Subject is immune to mental/emotional magic and scrying."],
        ["Prismatic Sphere", "As prismatic wall, but surrounds on all sides."]
      ] },
    { name:"Inquisition", group:"ascension", source:"Spell Compendium p. 275",
      power:"+4 bonus on dispel checks.",
      spells:[
        ["Detect Chaos", "Reveals chaotic creatures, spells or objects."],
        ["Zone of Truth", "Subjects within range cannot lie."],
        ["Detect Thoughts", "Allows \u201clistening\u201d to surface thoughts."],
        ["Discern Lies", "Reveals deliberate falsehoods."],
        ["True Seeing", "Lets you see all things as they really are."],
        ["Geas/Quest", "As lesser geas, plus it affects any creature."],
        ["Dictum", "Kills, paralyzes, slows or deafens nonlawful subjects."],
        ["Shield of Law", "+4 to AC, +4 resistance, and SR 25 against chaotic spells."],
        ["Imprisonment", "Entombs subject beneath the earth."]
      ] }
  ];
  var IGNORE_DOMAIN_ALIGNMENT = true;

  // Base attack: good = level, medium = ¾ level, poor = ½ level.
  function classBab(prog, lvl){
    if (prog === "good") return lvl;
    if (prog === "medium") return Math.floor(lvl * 3 / 4);
    return Math.floor(lvl / 2);
  }
  // Base save: good = 2 + ½ level, poor = ⅓ level.
  function classSave(prog, lvl){ return prog === "good" ? 2 + Math.floor(lvl / 2) : Math.floor(lvl / 3); }
  // Bonus spells per day for a spell level from the casting ability modifier (PHB Table 1-1).
  function bonusSpells(mod, spellLevel){
    if (spellLevel < 1 || mod < spellLevel) return 0;
    return Math.floor((mod - spellLevel) / 4) + 1;
  }
  // Character levels that grant a feat (1, 3, 6, 9…) and an ability increase (4, 8, 12…).
  function isFeatLevel(lvl){ return lvl === 1 || lvl % 3 === 0; }
  function isAbilityLevel(lvl){ return lvl % 4 === 0; }

  window.CaseFile.CLASSES = CLASSES;
  window.CaseFile.DOMAIN_OPTIONS = DOMAIN_OPTIONS;
  window.CaseFile.IGNORE_DOMAIN_ALIGNMENT = IGNORE_DOMAIN_ALIGNMENT;
  window.CaseFile.findDomain = function(name){
    return DOMAIN_OPTIONS.filter(function(d){ return d.name === name; })[0] || null;
  };
  window.CaseFile.classBab = classBab;
  window.CaseFile.classSave = classSave;
  window.CaseFile.bonusSpells = bonusSpells;
  window.CaseFile.isFeatLevel = isFeatLevel;
  window.CaseFile.isAbilityLevel = isAbilityLevel;
})();
