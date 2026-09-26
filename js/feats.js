/* =========================================================
   Feat reference — D&D 3.5 rules summaries
   Looked up by feat name (case-insensitive) to show what each
   feat does. Add entries here for feats not yet covered.
   Fields: type, prereq, benefit, source (omit for the core SRD).
   ========================================================= */
window.CaseFile = window.CaseFile || {};
(function(){
  "use strict";

  var FEAT_RULES = {
    // ---------- Combat ----------
    "Power Attack": {
      type:"Fighter", prereq:"Str 13",
      benefit:"Before making attack rolls on your turn, choose a number up to your base attack bonus. Subtract it from all melee attack rolls and add it to melee damage rolls until your next turn. With a two-handed weapon (or a one-handed weapon used in two hands) add twice the number to damage; with a light weapon you get no extra damage."
    },
    "Cleave": {
      type:"Fighter", prereq:"Str 13, Power Attack",
      benefit:"If you deal enough damage to drop a creature (usually below 0 hp or kill it), you get an immediate extra melee attack against another creature within reach, at the same attack bonus. Once per round."
    },
    "Great Cleave": {
      type:"Fighter", prereq:"Str 13, Power Attack, Cleave, BAB +4",
      benefit:"As Cleave, but with no limit on the number of extra attacks per round."
    },
    "Combat Reflexes": {
      type:"Fighter",
      benefit:"You can make a number of extra attacks of opportunity per round equal to your Dex bonus, and you can make attacks of opportunity while flat-footed. Great with a reach weapon like a longspear."
    },
    "Improved Initiative": {
      type:"Fighter",
      benefit:"+4 bonus on initiative checks."
    },
    "Weapon Focus": {
      type:"Fighter", prereq:"Proficiency with the chosen weapon, BAB +1",
      benefit:"+1 bonus on all attack rolls with the chosen weapon type."
    },
    "Martial Weapon Proficiency": {
      type:"General",
      benefit:"Choose a martial weapon: you make attack rolls with it normally, without the −4 non-proficiency penalty."
    },
    "Dodge": {
      type:"Fighter", prereq:"Dex 13",
      benefit:"On your turn, designate one opponent: you gain a +1 dodge bonus to AC against that opponent's attacks."
    },
    "Mobility": {
      type:"Fighter", prereq:"Dex 13, Dodge",
      benefit:"+4 dodge bonus to AC against attacks of opportunity provoked by moving out of or within a threatened area."
    },
    "Combat Expertise": {
      type:"Fighter", prereq:"Int 13",
      benefit:"When attacking, take a penalty of up to −5 (max your BAB) on attack rolls and gain the same number as a dodge bonus to AC until your next turn."
    },
    "Mounted Combat": {
      type:"Fighter", prereq:"Ride 1 rank",
      benefit:"Once per round when your mount is hit, make a Ride check; if it beats the attack roll, the hit is negated."
    },
    "Ride-By Attack": {
      type:"Fighter", prereq:"Ride 1 rank, Mounted Combat",
      benefit:"When mounted and charging, you can move, attack, and keep moving (total move up to double your mount's speed) without provoking an attack of opportunity from the target."
    },
    "Spirited Charge": {
      type:"Fighter", prereq:"Ride 1 rank, Mounted Combat, Ride-By Attack",
      benefit:"When mounted and charging, deal double damage with a melee weapon (triple with a lance)."
    },
    "Toughness": {
      type:"General",
      benefit:"+3 hit points. Can be taken multiple times."
    },
    // ---------- Saves & general ----------
    "Great Fortitude": { type:"General", benefit:"+2 bonus on Fortitude saves." },
    "Iron Will": { type:"General", benefit:"+2 bonus on Will saves." },
    "Lightning Reflexes": { type:"General", benefit:"+2 bonus on Reflex saves." },
    "Alertness": { type:"General", benefit:"+2 bonus on Listen and Spot checks." },
    "Endurance": {
      type:"General",
      benefit:"+4 on checks and saves to resist nonlethal damage, running, forced march, starvation, thirst, suffocation and hot or cold environments. You can sleep in light or medium armor without becoming fatigued."
    },
    "Skill Focus": { type:"General", benefit:"+3 bonus on all checks with the chosen skill." },
    "Negotiator": { type:"General", benefit:"+2 bonus on Diplomacy and Sense Motive checks." },
    "Persuasive": { type:"General", benefit:"+2 bonus on Bluff and Intimidate checks." },
    // ---------- Spellcasting ----------
    "Combat Casting": {
      type:"General",
      benefit:"+4 bonus on Concentration checks to cast defensively or while grappling or pinned."
    },
    "Spell Focus": {
      type:"General",
      benefit:"Choose a school of magic: +1 to the save DC of your spells from that school."
    },
    "Spell Penetration": {
      type:"General",
      benefit:"+2 bonus on caster level checks to beat a creature's spell resistance."
    },
    "Greater Spell Penetration": {
      type:"General", prereq:"Spell Penetration",
      benefit:"An additional +2 on caster level checks to beat spell resistance (stacks with Spell Penetration)."
    },
    // ---------- Metamagic ----------
    "Extend Spell": {
      type:"Metamagic",
      benefit:"An extended spell lasts twice as long as normal. Spells with concentration, instantaneous or permanent duration are not affected. Uses a spell slot one level higher than normal."
    },
    "Empower Spell": {
      type:"Metamagic",
      benefit:"All variable, numeric effects of the spell (damage, healing, number of targets…) are increased by half. Saves and opposed rolls are not affected. Uses a spell slot two levels higher."
    },
    "Enlarge Spell": {
      type:"Metamagic",
      benefit:"Doubles the range of a spell with close, medium or long range. Uses a spell slot one level higher."
    },
    "Maximize Spell": {
      type:"Metamagic",
      benefit:"All variable, numeric effects of the spell are maximized (no rolling). Saves and opposed rolls are not affected. Uses a spell slot three levels higher."
    },
    "Quicken Spell": {
      type:"Metamagic",
      benefit:"Cast the spell as a free action (one quickened spell per round) without provoking attacks of opportunity. Spells with a casting time over 1 full round can't be quickened. Uses a spell slot four levels higher."
    },
    "Silent Spell": {
      type:"Metamagic",
      benefit:"Cast the spell without verbal components. Uses a spell slot one level higher."
    },
    "Still Spell": {
      type:"Metamagic",
      benefit:"Cast the spell without somatic components (armor spell failure doesn't apply). Uses a spell slot one level higher."
    },
    "Widen Spell": {
      type:"Metamagic",
      benefit:"Doubles the area of a burst, emanation, line or spread spell. Uses a spell slot three levels higher."
    },
    "Persistent Spell": {
      type:"Metamagic", prereq:"Extend Spell", source:"Complete Arcane",
      benefit:"A spell with a fixed or personal range and a duration of at least 1 round lasts 24 hours. Uses a spell slot six levels higher."
    },
    // ---------- Divine ----------
    "Extra Turning": {
      type:"General", prereq:"Ability to turn or rebuke undead",
      benefit:"You can turn or rebuke undead 4 more times per day. Can be taken multiple times."
    },
    "Improved Turning": {
      type:"General", prereq:"Ability to turn or rebuke undead",
      benefit:"You turn or rebuke undead as if you were one level higher."
    },
    "Divine Metamagic": {
      type:"Divine", prereq:"Ability to turn or rebuke undead, the chosen metamagic feat", source:"Complete Divine",
      benefit:"Choose a metamagic feat you know. When you cast a divine spell, you can apply it by spending turn or rebuke undead attempts equal to 1 + the feat's level adjustment, instead of using a higher-level spell slot (e.g. Extend Spell costs 2 attempts). Can be taken multiple times, once per metamagic feat."
    },
    "Divine Might": {
      type:"Divine", prereq:"Str 13, Power Attack, ability to turn or rebuke undead", source:"Complete Warrior",
      benefit:"As a free action, spend a turn or rebuke attempt to add your Cha bonus to weapon damage for 1 round."
    },
    "Divine Vigor": {
      type:"Divine", prereq:"Ability to turn or rebuke undead", source:"Complete Warrior",
      benefit:"As a standard action, spend a turn or rebuke attempt: +10 ft. base speed and +2 temporary hp per character level for minutes equal to your Cha modifier."
    }
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

  // Known feat names mentioned anywhere in free text (for the planned progression notes).
  function featsMentioned(text){
    var lower = String(text || "").toLowerCase();
    return Object.keys(FEAT_RULES).filter(function(name){
      return lower.indexOf(name.toLowerCase()) !== -1;
    });
  }

  window.CaseFile.FEAT_RULES = FEAT_RULES;
  window.CaseFile.findFeat = findFeat;
  window.CaseFile.featsMentioned = featsMentioned;
})();
