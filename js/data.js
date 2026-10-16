/* =========================================================
   Character defaults
   Edit this file to change Caelian's baseline stats. These are the
   values restored by the "Restore original character sheet" button.
   ========================================================= */
window.CaseFile = window.CaseFile || {};
(function(){
  "use strict";
  var DEFAULT_DATA = {
    name: "Caelian Vàel",
    race: "Lesser Aasimar",
    className: "Cleric",
    level: 6,
    alignment: "Neutral Good",
    // Class levels and ability build: the sheet works out level-based numbers from these
    // (base attack, saves, max hp, spells per day, skill points). Edit them under Edit & level up.
    classes: [ { name:"Cleric", level:6 } ],
    abilityBase:   { str:18, dex:10, con:16, int:10, wis:18, cha:12 },
    abilityRacial: { str:0, dex:0, con:0, int:0, wis:2, cha:2 },
    abilityItems:  { str:0, dex:0, con:0, int:0, wis:2, cha:0 },
    abilityIncreases: { "4":"wis" },
    hpRolls: [8, 7, 7, 7, 7, 7],
    // Planned feat progression (feat levels 1, 3, 6, 9…); the build card offers each one when it's due.
    featPlan: [
      { level:1,  name:"Power Attack" },
      { level:3,  name:"Extend Spell" },
      { level:6,  name:"Persistent Spell" },
      { level:9,  name:"Divine Metamagic (Persistent Spell)" },
      { level:12, name:"Extra Turning" },
      { level:15, name:"Extra Turning" },
      { level:18, name:"", options:[
        { name:"Quicken Spell", why:"Emergency spell and still attack in the same round (slot 4 levels higher)." },
        { name:"Martial Study (Devoted Spirit)", why:"A Devoted Spirit maneuver for extra melee tricks." },
        { name:"Extra Turning", why:"A third one, if Cha hasn't been raised by items or tomes." }
      ] }
    ],
    buildRev: 1,
    abilities: { str:18, dex:10, con:16, int:10, wis:23, cha:14 },
    hp: { current:61, max:61 },
    bab: 4,
    ac: { armor:8, shield:0, dex:0, size:0, natural:0, deflection:0, misc:0 },
    saves: {
      fort: { base:5, magic:1, misc:0, temp:0 },
      ref:  { base:2, magic:1, misc:0, temp:0 },
      will: { base:5, magic:1, misc:0, temp:0 }
    },
    grapple: { size:0, misc:0 },
    speed: 6,
    balance: { active:false, rounds:0, used:0 },
    skillAcp: -6,
    skills: [
      { name:"Appraise", ability:"int", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Balance", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Bluff", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Climb", ability:"str", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Concentration", ability:"con", untrained:true, acp:0, cls:true, ranks:9, misc:0, editable:false },
      { name:"Craft ( )", ability:"int", untrained:true, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Decipher Script", ability:"int", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Diplomacy", ability:"cha", untrained:true, acp:0, cls:true, ranks:1, misc:0, editable:false },
      { name:"Disable Device", ability:"int", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Disguise", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Escape Artist", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Forgery", ability:"int", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Gather Information", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Handle Animal", ability:"cha", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Heal", ability:"wis", untrained:true, acp:0, cls:true, ranks:0, misc:2, editable:false },
      { name:"Hide", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Intimidate", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Jump", ability:"str", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Knowledge (arcana)", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Knowledge (history)", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Knowledge (religion)", ability:"int", untrained:false, acp:0, cls:true, ranks:8, misc:0, editable:true },
      { name:"Knowledge (the planes)", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Listen", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, racial:2, editable:false },
      { name:"Move Silently", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Open Lock", ability:"dex", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Perform ( )", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:true },
      { name:"Profession ( )", ability:"wis", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Ride", ability:"dex", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Search", ability:"int", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Sense Motive", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Sleight of Hand", ability:"dex", untrained:false, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Spellcraft", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:false },
      { name:"Spot", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, racial:2, editable:false },
      { name:"Survival", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Swim", ability:"str", untrained:true, acp:2, cls:false, ranks:0, misc:0, editable:false },
      { name:"Tumble", ability:"dex", untrained:false, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Use Magic Device", ability:"cha", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Use Rope", ability:"dex", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false }
    ],
    initiative: { misc:0 },
    attacks: [
      { name:"+1 Longspear", dice:"1d8", enh:1, bonus:"+9", damage:"1d8+7", notes:"Crit ×3 · Piercing · Reach 3 m · Two-handed · Main melee weapon" },
      { name:"Morningstar", dice:"1d8", enh:0, bonus:"+8", damage:"1d8+4", notes:"Crit ×2 · Bludgeoning & piercing · One-handed · Backup vs foes inside longspear reach" }
    ],
    armor: "Full Plate",
    shield: "",
    feats: [
      { name:"Power Attack", notes:"" },
      { name:"Extend Spell", notes:"" },
      { name:"Persistent Spell", notes:"" }
    ],
    powerAttack: 0,
    resistances: { acid:5, cold:5, electricity:5, fire:0, sonic:0 },
    darkvision: 18,
    units: "m",
    ranksRev: 1,
    domainChoice: ["Balance", "Magic"],
    turning: { log:[] },
    domainTurning: {},
    domains: {
      balance: "Reflects Caelian's pursuit of equilibrium — weighing extremes rather than favoring either side.",
      magic: "Useful utility and anti-magic domain spells."
    },
    domainsRev: 1,
    racialTraits: [
      { text:"Celestial heritage" },
      { text:"Daylight 1/day (spell-like ability)" },
      { text:"Daylight does not need to be prepared as a Cleric spell — use the racial ability" },
      { text:"Darkvision 18 m (see Senses on the Skills tab)" },
      { text:"Resistance to acid 5, cold 5 and electricity 5 (shown under Vitality)" },
      { text:"+2 racial bonus on Listen and Spot (already added on the Skills tab)" }
    ],
    spellLevels: [
      { level:0, dc:16, total:0, remaining:0, spells:[] },
      { level:1, dc:17, total:0, remaining:0, spells:[] },
      { level:2, dc:18, total:0, remaining:0, spells:[] },
      { level:3, dc:19, total:0, remaining:0, spells:[] }
    ],
    equipment: [
      { name:"+1 Longspear" }, { name:"Morningstar" }, { name:"Full Plate" },
      { name:"Periapt of Wisdom +2" }, { name:"Cloak of Resistance +1" },
      { name:"Silver holy symbol" }, { name:"Healer's kit (+2 Heal, in Misc)" }, { name:"Spell component pouch" }, { name:"Standard adventuring equipment" }
    ],
    mountGear: [
      { name:"Light Horse" }, { name:"Riding Saddle" }, { name:"Bit and Bridle" }, { name:"40 days trail rations" }
    ],
    ledger: [
      { desc:"Previous funds", amount:25 }, { desc:"Additional funds received", amount:400 },
      { desc:"Light Horse", amount:-75 }, { desc:"Riding Saddle", amount:-10 },
      { desc:"Bit and Bridle", amount:-2 }, { desc:"40 Trail Rations", amount:-20 },
      { desc:"Quest reward", amount:550 }, { desc:"Information and access to a source", amount:-250 },
      { desc:"Stable for the horse", amount:-1 }
    ],
    ledgerRev: 1,
    appearance: "",
    backstory: "",
    ideal: "",
    sessionNotes: ""
  };

  window.CaseFile.DEFAULT_DATA = DEFAULT_DATA;
})();
