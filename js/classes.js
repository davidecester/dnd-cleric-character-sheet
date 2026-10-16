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
  window.CaseFile.classBab = classBab;
  window.CaseFile.classSave = classSave;
  window.CaseFile.bonusSpells = bonusSpells;
  window.CaseFile.isFeatLevel = isFeatLevel;
  window.CaseFile.isAbilityLevel = isAbilityLevel;
})();
