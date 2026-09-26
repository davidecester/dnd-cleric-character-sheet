/* =========================================================
   Feat reference — D&D 3.5 rules, short summaries
   Looked up by feat name (case-insensitive) to show what each
   feat gives. Add entries here for feats not yet covered.
   Fields: type, prereq, summary, combat (also listed on the
   Combat tab), source (omit for the core SRD).
   ========================================================= */
window.CaseFile = window.CaseFile || {};
(function(){
  "use strict";

  var FEAT_RULES = {
    // ---------- Combat ----------
    "Power Attack": { type:"Fighter", prereq:"Str 13", combat:true,
      summary:"Trade up to BAB in melee attack for the same in damage (×2 two-handed)." },
    "Cleave": { type:"Fighter", prereq:"Power Attack", combat:true,
      summary:"Drop a foe → one free extra melee attack on an adjacent foe, once per round." },
    "Great Cleave": { type:"Fighter", prereq:"Cleave, BAB +4", combat:true,
      summary:"Cleave with no limit per round." },
    "Combat Reflexes": { type:"Fighter", combat:true,
      summary:"Extra attacks of opportunity per round = Dex bonus; AoOs while flat-footed." },
    "Improved Initiative": { type:"Fighter", combat:true, summary:"+4 initiative." },
    "Weapon Focus": { type:"Fighter", prereq:"BAB +1", combat:true,
      summary:"+1 attack with the chosen weapon." },
    "Martial Weapon Proficiency": { type:"General", summary:"No −4 penalty with the chosen martial weapon." },
    "Dodge": { type:"Fighter", prereq:"Dex 13", combat:true,
      summary:"+1 dodge AC against one chosen opponent." },
    "Mobility": { type:"Fighter", prereq:"Dodge", combat:true,
      summary:"+4 dodge AC against attacks of opportunity from moving." },
    "Combat Expertise": { type:"Fighter", prereq:"Int 13", combat:true,
      summary:"Trade up to −5 attack (max BAB) for the same dodge AC." },
    "Mounted Combat": { type:"Fighter", prereq:"Ride 1 rank", combat:true,
      summary:"Once per round, Ride check to negate a hit on your mount." },
    "Ride-By Attack": { type:"Fighter", prereq:"Mounted Combat", combat:true,
      summary:"Mounted charge: move, attack, keep moving without provoking from the target." },
    "Spirited Charge": { type:"Fighter", prereq:"Ride-By Attack", combat:true,
      summary:"Mounted charge deals ×2 damage (×3 with a lance)." },
    "Toughness": { type:"General", summary:"+3 hit points." },
    // ---------- Saves & general ----------
    "Great Fortitude": { type:"General", summary:"+2 Fortitude saves." },
    "Iron Will": { type:"General", summary:"+2 Will saves." },
    "Lightning Reflexes": { type:"General", summary:"+2 Reflex saves." },
    "Alertness": { type:"General", summary:"+2 Listen and Spot." },
    "Endurance": { type:"General", summary:"+4 vs. exhaustion, environment and nonlethal; sleep in medium armor." },
    "Skill Focus": { type:"General", summary:"+3 to the chosen skill." },
    "Negotiator": { type:"General", summary:"+2 Diplomacy and Sense Motive." },
    "Persuasive": { type:"General", summary:"+2 Bluff and Intimidate." },
    // ---------- Spellcasting ----------
    "Combat Casting": { type:"General", summary:"+4 Concentration to cast defensively or while grappled." },
    "Spell Focus": { type:"General", summary:"+1 save DC for spells of the chosen school." },
    "Spell Penetration": { type:"General", summary:"+2 caster level checks vs. spell resistance." },
    "Greater Spell Penetration": { type:"General", prereq:"Spell Penetration",
      summary:"Another +2 vs. spell resistance (stacks)." },
    // ---------- Metamagic ----------
    "Extend Spell": { type:"Metamagic", summary:"Double duration · slot +1 level." },
    "Empower Spell": { type:"Metamagic", summary:"Variable numbers ×1.5 · slot +2 levels." },
    "Enlarge Spell": { type:"Metamagic", summary:"Double range · slot +1 level." },
    "Maximize Spell": { type:"Metamagic", summary:"Variable numbers maximized · slot +3 levels." },
    "Quicken Spell": { type:"Metamagic", summary:"Cast as a free action, 1/round · slot +4 levels." },
    "Silent Spell": { type:"Metamagic", summary:"No verbal component · slot +1 level." },
    "Still Spell": { type:"Metamagic", summary:"No somatic component · slot +1 level." },
    "Widen Spell": { type:"Metamagic", summary:"Double area · slot +3 levels." },
    "Persistent Spell": { type:"Metamagic", prereq:"Extend Spell", source:"Complete Arcane",
      summary:"Fixed/personal-range spell lasts 24 hours · slot +6 levels." },
    // ---------- Divine ----------
    "Extra Turning": { type:"General", prereq:"Turn undead", summary:"+4 turn/rebuke attempts per day." },
    "Improved Turning": { type:"General", prereq:"Turn undead", summary:"Turn undead as one level higher." },
    "Divine Metamagic": { type:"Divine", prereq:"Turn undead, the metamagic feat", source:"Complete Divine",
      summary:"Apply a metamagic feat for 1 + its level cost in turn attempts, with no higher slot." },
    "Divine Might": { type:"Divine", prereq:"Power Attack, turn undead", source:"Complete Warrior", combat:true,
      summary:"Free action, 1 turn attempt: + Cha bonus to weapon damage for 1 round." },
    "Divine Vigor": { type:"Divine", prereq:"Turn undead", source:"Complete Warrior", combat:true,
      summary:"Standard action, 1 turn attempt: +10 ft. speed, +2 temp hp/level for Cha mod minutes." }
  };

  // Case-insensitive lookup. "Weapon Focus (longspear)" falls back to "Weapon Focus".
  var INDEX = {};
  Object.keys(FEAT_RULES).forEach(function(name){ INDEX[name.toLowerCase()] = name; });

  function findFeat(name){
    var key = String(name || "").trim().toLowerCase();
    if (!key) return null;
    var hit = INDEX[key] || INDEX[key.replace(/\s*\(.*\)\s*$/, "")];
    return hit ? { name:hit, rules:FEAT_RULES[hit] } : null;
  }

  window.CaseFile.FEAT_RULES = FEAT_RULES;
  window.CaseFile.findFeat = findFeat;
})();
