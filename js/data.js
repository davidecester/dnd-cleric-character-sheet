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
    level: 5,
    alignment: "Neutral Good",
    abilities: { str:18, dex:10, con:16, int:10, wis:23, cha:14 },
    hp: { current:51, max:51 },
    bab: 3,
    ac: { armor:8, shield:0, dex:0, size:0, natural:0, deflection:0, misc:0 },
    saves: {
      fort: { base:4, magic:1, misc:0, temp:0 },
      ref:  { base:1, magic:1, misc:0, temp:0 },
      will: { base:4, magic:1, misc:0, temp:0 }
    },
    grapple: { size:0, misc:0 },
    speed: 20,
    balance: { active:false, rounds:0, used:0 },
    skillAcp: -6,
    skills: [
      { name:"Appraise", ability:"int", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Balance", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Bluff", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Climb", ability:"str", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Concentration", ability:"con", untrained:true, acp:0, cls:true, ranks:0, misc:0, editable:false },
      { name:"Craft ( )", ability:"int", untrained:true, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Decipher Script", ability:"int", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Diplomacy", ability:"cha", untrained:true, acp:0, cls:true, ranks:0, misc:0, editable:false },
      { name:"Disable Device", ability:"int", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Disguise", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Escape Artist", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Forgery", ability:"int", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Gather Information", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Handle Animal", ability:"cha", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Heal", ability:"wis", untrained:true, acp:0, cls:true, ranks:0, misc:0, editable:false },
      { name:"Hide", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Intimidate", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Jump", ability:"str", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Knowledge (arcana)", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Knowledge (history)", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Knowledge (religion)", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Knowledge (the planes)", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Listen", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Move Silently", ability:"dex", untrained:true, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Open Lock", ability:"dex", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Perform ( )", ability:"cha", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:true },
      { name:"Profession ( )", ability:"wis", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:true },
      { name:"Ride", ability:"dex", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Search", ability:"int", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Sense Motive", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Sleight of Hand", ability:"dex", untrained:false, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Spellcraft", ability:"int", untrained:false, acp:0, cls:true, ranks:0, misc:0, editable:false },
      { name:"Spot", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Survival", ability:"wis", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Swim", ability:"str", untrained:true, acp:2, cls:false, ranks:0, misc:0, editable:false },
      { name:"Tumble", ability:"dex", untrained:false, acp:1, cls:false, ranks:0, misc:0, editable:false },
      { name:"Use Magic Device", ability:"cha", untrained:false, acp:0, cls:false, ranks:0, misc:0, editable:false },
      { name:"Use Rope", ability:"dex", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:false }
    ],
    initiative: { misc:0 },
    attacks: [
      { name:"+1 Longspear", bonus:"+8", damage:"1d8+7", notes:"Crit ×3 · Piercing · Reach 10 ft · Two-handed · Main melee weapon" },
      { name:"Morningstar", bonus:"+7", damage:"1d8+4", notes:"Crit ×2 · Bludgeoning & piercing · One-handed · Backup vs foes inside longspear reach" }
    ],
    armor: "Full Plate",
    shield: "",
    feats: [
      { name:"Power Attack", notes:"" },
      { name:"Extend Spell", notes:"" }
    ],
    powerAttack: 0,
    domains: {
      balance: "Once per day, as a free action, add your Wisdom modifier to AC for 1 round per cleric level (currently +6 AC for 5 rounds). Reflects Caelian's pursuit of equilibrium — weighing extremes rather than favoring either side.",
      magic: "Can use certain Wizard spell-completion and spell-trigger items as a Wizard of half his Cleric level. Grants access to useful utility and anti-magic domain spells."
    },
    racialTraits: [
      { text:"Celestial heritage" },
      { text:"Racial Light ability" },
      { text:"Light does not normally need to be prepared as a Cleric spell" }
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
      { name:"Silver holy symbol" }, { name:"Spell component pouch" }, { name:"Standard adventuring equipment" }
    ],
    mountGear: [
      { name:"Light Horse" }, { name:"Riding Saddle" }, { name:"Bit and Bridle" }, { name:"40 days trail rations" }
    ],
    ledger: [
      { desc:"Previous funds", amount:25 }, { desc:"Additional funds received", amount:400 },
      { desc:"Light Horse", amount:-75 }, { desc:"Riding Saddle", amount:-10 },
      { desc:"Bit and Bridle", amount:-2 }, { desc:"40 Trail Rations", amount:-20 }
    ],
    appearance: "",
    backstory: "",
    ideal: "",
    sessionNotes: ""
  };

  window.CaseFile.DEFAULT_DATA = DEFAULT_DATA;
})();
