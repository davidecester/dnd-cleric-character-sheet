/* =========================================================
   App logic — rendering, calculations (3.5e rules), events
   Load order: storage.js → data.js → feats.js → app.js
   ========================================================= */
(function(){
  "use strict";

  var CF = window.CaseFile;
  var storage = CF.storage;
  var STORAGE_KEY = CF.STORAGE_KEY;
  var BG_IMAGE_KEY = CF.BG_IMAGE_KEY;
  var PORTRAIT_IMAGE_KEY = CF.PORTRAIT_IMAGE_KEY;
  var DEFAULT_DATA = CF.DEFAULT_DATA;

  var state = null;
  var saveTimer = null;

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function num(v){ var n = Number(v); return isNaN(n) ? 0 : n; }
  function signed(n){ return (n >= 0 ? "+" : "") + n; }
  function abilityMod(key){ return Math.floor((num(state.abilities[key]) - 10) / 2); }
  function safe(fn, label){ try { fn(); } catch(e){ console.error("Error in " + label + ":", e); } }

  // Button icons (inline SVG, drawn in the button's text colour).
  function svgIcon(paths){
    return '<svg class="btn-icon" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  var ICONS = {
    edit: svgIcon('<path d="M10.8 2.7l2.5 2.5-7.6 7.6-3.2.7.7-3.2z"/><path d="M9.3 4.2l2.5 2.5"/>'),
    done: svgIcon('<path d="M3.2 8.6l3.1 3.1 6.5-6.9"/>'),
    levelUp: svgIcon('<path d="M3.5 8.5L8 4l4.5 4.5"/><path d="M3.5 12.5L8 8l4.5 4.5"/>'),
    remove: svgIcon('<path d="M4.5 4.5l7 7M11.5 4.5l-7 7"/>'),
    plus: svgIcon('<path d="M8 3.5v9M3.5 8h9"/>'),
    minus: svgIcon('<path d="M3.5 8h9"/>'),
    trash: svgIcon('<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/>')
  };
  // Label an Edit/Done toggle; the header's toggle also opens the build, so it says so.
  function paintToggle(btn, editing, idleLabel, idleIcon){
    btn.innerHTML = (editing ? ICONS.done : (idleIcon || ICONS.edit)) + "<span>" + (editing ? "Done" : (idleLabel || "Edit")) + "</span>";
  }

  // ---------------- Storage ----------------
  function scheduleSave(){
    clearTimeout(saveTimer);
    var statusEl = document.getElementById("saveStatus");
    statusEl.textContent = "Saving…";
    statusEl.classList.add("show");
    saveTimer = setTimeout(saveState, 500);
  }
  function saveState(){
    var statusEl = document.getElementById("saveStatus");
    var json = JSON.stringify(state);
    Promise.resolve()
      .then(function(){ return storage.set(STORAGE_KEY, json); })
      .then(function(){
        statusEl.textContent = "Saved";
        setTimeout(function(){ statusEl.classList.remove("show"); }, 1200);
      })
      .catch(function(err){ console.error("Save failed:", err); statusEl.textContent = "Save failed"; });
  }
  var migrated = false;
  function loadState(){
    return Promise.resolve()
      .then(function(){ return storage.get(STORAGE_KEY); })
      .then(function(res){
        var saved = null;
        if (res && res.value) {
          try { saved = JSON.parse(res.value); state = Object.assign(clone(DEFAULT_DATA), saved); }
          catch(e){ saved = null; state = clone(DEFAULT_DATA); }
        } else { state = clone(DEFAULT_DATA); }
        fillBlankAttacks();
        fixRacialTraits();
        if (saved) toMetric(saved);
        if (saved && levelUpTo6(saved)) migrated = true;
        if (saved && setLevel6Ranks(saved)) migrated = true;
        if (saved && migrateBuild(saved)) migrated = true;
        if (saved && addLedgerEntries(saved)) migrated = true;
        if (saved && trimDomainNotes(saved)) migrated = true;
        if (saved && fillStory(saved)) migrated = true;
        (state.featPlan || []).forEach(function(p){
          if (num(p.level) !== 18) return;
          if (p.name === "Combat Reflexes") p.name = "";
          if (!p.name && !p.options) p.options = clone(DEFAULT_DATA.featPlan.filter(function(d){ return num(d.level) === 18; })[0].options || []);
        });
        computeBuild(false);
      })
      .catch(function(){ state = clone(DEFAULT_DATA); });
  }

  // Earlier defaults listed the racial spell-like ability as Light; it is Daylight.
  // Only the untouched old wording is replaced, so the user's own edits stay.
  var OLD_RACIAL = {
    "Racial Light ability": "Daylight 1/day (spell-like ability)",
    "Light does not normally need to be prepared as a Cleric spell": "Daylight does not need to be prepared as a Cleric spell — use the racial ability",
    "Darkvision 60 ft.": "Darkvision 18 m (see Senses on the Skills tab)",
    "Resistance to acid 5, cold 5 and electricity 5": "Resistance to acid 5, cold 5 and electricity 5 (shown under Vitality)"
  };
  function fixRacialTraits(){
    state.racialTraits = state.racialTraits || [];
    state.racialTraits.forEach(function(t){
      if (OLD_RACIAL.hasOwnProperty(t.text)) t.text = OLD_RACIAL[t.text];
    });
    // Add aasimar traits that older saved sheets are missing (matched by keyword).
    var have = state.racialTraits.map(function(t){ return String(t.text || "").toLowerCase(); }).join("\n");
    [["darkvision", 3], ["resistance", 4], ["listen", 5]].forEach(function(pair){
      if (have.indexOf(pair[0]) === -1) state.racialTraits.push(clone(DEFAULT_DATA.racialTraits[pair[1]]));
    });
    // Racial +2 on Listen and Spot, unless it was already typed into Misc.
    (state.skills || []).forEach(function(sk){
      if ((sk.name === "Listen" || sk.name === "Spot") && sk.racial === undefined) sk.racial = num(sk.misc) >= 2 ? 0 : 2;
    });
  }

  // The sheet uses metres (3.5 metric convention: 5 ft = 1.5 m). Saved sheets from
  // before the switch still hold feet, so convert them once.
  function ftToM(ft){ return Math.round(num(ft) / 5 * 1.5 * 2) / 2; }
  function ftTextToM(text){
    return String(text || "").replace(/(\d+(?:\.\d+)?)\s*(?:ft\.?|feet|foot)(?![a-z])/gi, function(_, n){ return ftToM(n) + " m"; });
  }
  // Only values that came from the saved sheet are converted; defaults are already metric.
  function toMetric(saved){
    if (saved.units === "m") return;
    if (saved.speed !== "" && saved.speed !== undefined) state.speed = ftToM(saved.speed);
    if (saved.darkvision !== "" && saved.darkvision !== undefined) state.darkvision = ftToM(saved.darkvision);
    (state.attacks || []).forEach(function(a){ a.notes = ftTextToM(a.notes); });
    (state.racialTraits || []).forEach(function(t){ t.text = ftTextToM(t.text); });
    state.units = "m";
  }

  // Level 6 (cleric 6): applied once to a sheet saved at level 5. Everything is added on
  // top of the saved values, so the user's own edits (skill ranks above all) are kept.
  // Cleric 6: BAB +1, all base saves +1, hp 7 (d8 roll) + 3 Con, feat Persistent Spell,
  // 2 skill points (1 Concentration, 1 Diplomacy), one more 2nd- and 3rd-level slot.
  function levelUpTo6(saved){
    if (num(saved.level) !== 5) return false;
    var hpGain = 7 + abilityMod("con");
    state.level = 6;
    state.bab = num(state.bab) + 1;
    ["fort","ref","will"].forEach(function(k){ state.saves[k].base = num(state.saves[k].base) + 1; });
    state.hp.max = num(state.hp.max) + hpGain;
    state.hp.current = num(state.hp.current) + hpGain;
    (state.attacks || []).forEach(function(a){
      var b = String(a.bonus || "").trim();
      if (/^[+-]?\d+$/.test(b)) { var n = Number(b) + 1; a.bonus = (n >= 0 ? "+" : "") + n; }
    });
    var hasFeat = (state.feats || []).some(function(f){ return String(f.name || "").toLowerCase() === "persistent spell"; });
    if (!hasFeat) state.feats.push({ name:"Persistent Spell", notes:"" });
    (state.skills || []).forEach(function(sk){
      if (sk.name === "Concentration" || sk.name === "Diplomacy") sk.ranks = num(sk.ranks) + 1;
      if (sk.name === "Heal") sk.misc = num(sk.misc) + 2;
    });
    var gear = (state.equipment || []).map(function(e){ return String(e.name || "").toLowerCase(); }).join("\n");
    if (gear.indexOf("healer") === -1) state.equipment.push({ name:"Healer's kit (+2 Heal, in Misc)" });
    (state.spellLevels || []).forEach(function(l){
      if ((num(l.level) === 2 || num(l.level) === 3) && num(l.total) > 0) { l.total = num(l.total) + 1; l.remaining = num(l.remaining) + 1; }
    });
    if (state.domains && state.domains.balance) state.domains.balance = state.domains.balance.replace("for 5 rounds", "for 6 rounds");
    return true;
  }

  // Skill ranks at level 6 as the user listed them (18 points: cleric 2 + Int 0, ×4 at 1st).
  // Set once, after which the sheet's own edits win.
  var LEVEL6_RANKS = { "Concentration":9, "Knowledge (religion)":8, "Diplomacy":1 };
  function setLevel6Ranks(saved){
    if (num(saved.ranksRev) >= 1) return false;
    (state.skills || []).forEach(function(sk){
      if (LEVEL6_RANKS.hasOwnProperty(sk.name)) sk.ranks = LEVEL6_RANKS[sk.name];
    });
    state.ranksRev = 1;
    return true;
  }

  // ---------------- Build: class levels, ability scores, hp rolls ----------------
  var ABILS = ["str","dex","con","int","wis","cha"];
  var ABIL_LABEL = { str:"STR", dex:"DEX", con:"CON", int:"INT", wis:"WIS", cha:"CHA" };

  function buildClasses(){
    return (state.classes || []).filter(function(c){ return CF.CLASSES[c.name] && num(c.level) > 0; });
  }
  function classLabel(){
    var list = buildClasses();
    if (!list.length) return (state.className + " " + state.level).trim();
    return list.map(function(c){ return c.name + " " + num(c.level); }).join(" / ");
  }
  // Ability increases taken so far (one at every 4th character level).
  function increaseCount(key, lvl){
    var inc = state.abilityIncreases || {}, n = 0;
    Object.keys(inc).forEach(function(l){ if (num(l) <= lvl && inc[l] === key) n++; });
    return n;
  }
  function featCount(name){
    return (state.feats || []).filter(function(f){ return String(f.name || "").trim().toLowerCase() === name.toLowerCase(); }).length;
  }

  // Works out everything that follows from class levels and the ability build:
  // total level, ability totals, base attack, base saves, max hp, attacks, spells per day.
  // With adjustCurrent, current hp (and spells left) move by the same amount as their max.
  function computeBuild(adjustCurrent){
    var list = buildClasses();
    if (!list.length) return;
    var lvl = list.reduce(function(sum, c){ return sum + num(c.level); }, 0);
    state.level = lvl;
    state.className = list.map(function(c){ return c.name; }).join(" / ");
    ABILS.forEach(function(k){
      state.abilities[k] = num((state.abilityBase || {})[k]) + num((state.abilityRacial || {})[k]) +
        num((state.abilityItems || {})[k]) + increaseCount(k, lvl);
    });
    state.bab = list.reduce(function(sum, c){ return sum + CF.classBab(CF.CLASSES[c.name].bab, num(c.level)); }, 0);
    ["fort","ref","will"].forEach(function(k){
      state.saves[k].base = list.reduce(function(sum, c){ return sum + CF.classSave(CF.CLASSES[c.name].saves[k], num(c.level)); }, 0);
    });
    state.hpRolls = state.hpRolls || [];
    while (state.hpRolls.length < lvl) state.hpRolls.push("");
    var con = abilityMod("con"), max = 3 * featCount("Toughness");
    for (var i = 0; i < lvl; i++) max += Math.max(1, num(state.hpRolls[i]) + con);
    if (adjustCurrent) state.hp.current = num(state.hp.current) + (max - num(state.hp.max));
    state.hp.max = max;
    (state.attacks || []).forEach(computeAttack);
    computeSpells(adjustCurrent);
  }

  // Attack and damage from base attack, Str and the weapon's enhancement bonus.
  // Two-handed weapons (see notes) add 1½ × Str to damage.
  function computeAttack(a){
    if (!String(a.dice || "").trim()) return;
    var str = abilityMod("str"), enh = num(a.enh);
    var strDmg = isTwoHanded(a) && str > 0 ? Math.floor(str * 1.5) : str;
    a.bonus = signed(num(state.bab) + str + enh + num(a.atkMisc));
    var dmg = strDmg + enh + num(a.dmgMisc);
    a.damage = String(a.dice).trim() + (dmg ? signed(dmg) : "");
  }

  // Spells per day = class table + bonus spells from the casting ability + 1 domain slot (1st level up).
  function computeSpells(adjustLeft){
    state.spellLevels = state.spellLevels || [];
    buildClasses().forEach(function(c){
      var cls = CF.CLASSES[c.name].caster;
      if (!cls) return;
      var row = cls.perDay[Math.min(20, num(c.level)) - 1] || [];
      var score = num(state.abilities[cls.ability]), mod = abilityMod(cls.ability);
      row.forEach(function(base, sl){
        var canCast = score >= 10 + sl;
        var bonus = canCast ? CF.bonusSpells(mod, sl) : 0;
        var dom = cls.domains && sl >= 1 ? 1 : 0;
        if (!canCast) { base = 0; dom = 0; }
        var entry = state.spellLevels.filter(function(l){ return num(l.level) === sl; })[0];
        if (!entry) { entry = { level:sl, dc:0, total:0, remaining:0, spells:[] }; state.spellLevels.push(entry); }
        var total = base + bonus + dom;
        if (adjustLeft && entry.auto) entry.remaining = Math.max(0, num(entry.remaining) + total - num(entry.total));
        entry.auto = true;
        entry.dc = 10 + sl + mod;
        entry.total = total;
        entry.breakdown = base + " " + c.name.toLowerCase() + (bonus ? " + " + bonus + " " + ABIL_LABEL[cls.ability] : "") + (dom ? " + 1 domain" : "");
      });
    });
    // Spell levels the class can no longer cast (after lowering the level) drop out,
    // unless spells were written in them.
    var reach = 0;
    buildClasses().forEach(function(c){
      var cls = CF.CLASSES[c.name].caster;
      if (cls) reach = Math.max(reach, (cls.perDay[Math.min(20, num(c.level)) - 1] || []).length);
    });
    state.spellLevels = state.spellLevels.filter(function(l){
      if (!l.auto || num(l.level) < reach) return true;
      if ((l.spells || []).some(function(sp){ return String(sp.name || "").trim(); })) { l.total = 0; l.breakdown = "not castable at this level"; return true; }
      return false;
    });
    state.spellLevels.sort(function(a, b){ return num(a.level) - num(b.level); });
  }

  function skillBudget(){
    var list = buildClasses(), int = abilityMod("int");
    if (!list.length) return Math.max(1, 2 + int) * (num(state.level) + 3);
    return list.reduce(function(sum, c, i){
      var per = Math.max(1, CF.CLASSES[c.name].skillPoints + int);
      return sum + per * (num(c.level) + (i === 0 ? 3 : 0)); // ×4 at 1st level, from the first class
    }, 0);
  }

  // Sheets saved before the build existed: keep their numbers by working the build back
  // from them (base scores from the totals, hp rolls from max hp, attack extras as misc).
  function migrateBuild(saved){
    if (num(saved.buildRev) >= 1) return false;
    var lvl = Math.max(1, num(state.level));
    state.classes = [{ name:"Cleric", level:lvl }];
    state.abilityBase = {};
    ABILS.forEach(function(k){
      state.abilityBase[k] = num(state.abilities[k]) - num(state.abilityRacial[k]) - num(state.abilityItems[k]) - increaseCount(k, lvl);
    });
    var con = abilityMod("con"), rest = num(state.hp.max) - con * lvl - 8;
    state.hpRolls = [8];
    for (var i = 1; i < lvl; i++) state.hpRolls.push(Math.floor(rest / (lvl - 1)) + (i <= rest % (lvl - 1) ? 1 : 0));
    var bab = CF.classBab("medium", lvl), str = abilityMod("str");
    (state.attacks || []).forEach(function(a){
      var dmg = parseDamage(a.damage), atk = parseBonus(a.bonus);
      if (a.dice || !dmg || atk === null) return;
      var m = String(a.name || "").match(/^\+(\d+)/);
      a.dice = dmg.dice; a.enh = m ? Number(m[1]) : 0;
      var strDmg = isTwoHanded(a) && str > 0 ? Math.floor(str * 1.5) : str;
      a.atkMisc = atk - (bab + str + a.enh);
      a.dmgMisc = dmg.mod - (strDmg + a.enh);
    });
    state.buildRev = 1;
    return true;
  }

  // Gold since level 6: quest reward, paid information, stable.
  function addLedgerEntries(saved){
    if (num(saved.ledgerRev) >= 1 || !saved.ledger) return false;
    DEFAULT_DATA.ledger.slice(-3).forEach(function(e){ state.ledger.push(clone(e)); });
    state.ledgerRev = 1;
    return true;
  }

  // The domain notes used to repeat the granted power, which the Domains card now shows from
  // the rules data. Untouched old default notes become the shorter ones; edited notes stay.
  function trimDomainNotes(saved){
    if (num(saved.domainsRev) >= 1) return false;
    var d = state.domains || (state.domains = {});
    var oldBalance = /^Once per day, as a free action, add your Wisdom modifier to AC for 1 round per cleric level \(currently \+\d+ AC for \d+ rounds\)\. /;
    if (oldBalance.test(d.balance || "")) d.balance = String(d.balance).replace(oldBalance, "");
    if (d.magic === "Can use certain Wizard spell-completion and spell-trigger items as a Wizard of half his Cleric level. Grants access to useful utility and anti-magic domain spells.") d.magic = DEFAULT_DATA.domains.magic;
    state.domainsRev = 1;
    return true;
  }

  // Story texts from Caelian's profile document: filled in once, only where the box is still empty.
  function fillStory(saved){
    if (num(saved.storyRev) >= 1) return false;
    ["appearance", "backstory", "ideal"].forEach(function(k){
      if (!String(state[k] || "").trim()) state[k] = DEFAULT_DATA[k];
    });
    state.storyRev = 1;
    return true;
  }

  // Saved sheets from before an attack's stats were filled in (e.g. the Morningstar)
  // pick up the default numbers, as long as the user hasn't typed any yet.
  function fillBlankAttacks(){
    DEFAULT_DATA.attacks.forEach(function(def){
      state.attacks.forEach(function(a){
        if (a.name !== def.name || String(a.bonus || "") !== "" || String(a.damage || "") !== "") return;
        a.bonus = def.bonus; a.damage = def.damage; a.notes = def.notes;
      });
    });
  }

  // ---------------- Generic list renderer ----------------
  function renderList(containerId, data, fields, onChange){
    var el = document.getElementById(containerId);
    el.innerHTML = "";
    data.forEach(function(item, idx){
      var row = document.createElement("div");
      row.className = "list-row";
      fields.forEach(function(f){
        var input;
        if (f.type === "checkbox") {
          input = document.createElement("input");
          input.type = "checkbox"; input.className = "row-check";
          input.checked = !!item[f.field];
          input.addEventListener("change", function(){ item[f.field] = input.checked; if (onChange) onChange(); scheduleSave(); });
        } else {
          input = document.createElement("input");
          input.type = f.type || "text";
          input.value = (item[f.field] !== undefined && item[f.field] !== null) ? item[f.field] : "";
          input.placeholder = f.placeholder || "";
          input.className = f.className || "col-name";
          input.addEventListener("input", function(){
            item[f.field] = f.type === "number" ? (input.value === "" ? "" : Number(input.value)) : input.value;
            if (onChange) onChange(); scheduleSave();
          });
        }
        row.appendChild(input);
      });
      var del = document.createElement("button");
      del.className = "row-del"; del.setAttribute("aria-label", "Remove"); del.innerHTML = ICONS.remove;
      del.addEventListener("click", function(){
        data.splice(idx, 1);
        renderList(containerId, data, fields, onChange);
        if (onChange) onChange(); scheduleSave();
      });
      row.appendChild(del);
      el.appendChild(row);
    });
  }

  function addAndReveal(containerId, data, newItem, fields, onChange){
    data.push(newItem);
    renderList(containerId, data, fields, onChange);
    if (onChange) onChange(); scheduleSave();
    requestAnimationFrame(function(){
      var el = document.getElementById(containerId);
      var lastRow = el.lastElementChild;
      if (!lastRow) return;
      lastRow.scrollIntoView({ behavior: "smooth", block: "center" });
      var focusable = lastRow.querySelector('input[type="text"], input:not([type="checkbox"])');
      if (focusable) focusable.focus({ preventScroll: true });
    });
  }

  function bindField(id, getter, setter, isNumber){
    var el = document.getElementById(id);
    el.value = getter();
    el.addEventListener("input", function(){
      setter(isNumber ? (el.value === "" ? "" : Number(el.value)) : el.value);
      scheduleSave();
    });
  }

  // ---------------- Derived / computed stats ----------------
  function recomputeDerived(){
    var dex = abilityMod("dex"), con = abilityMod("con"), wis = abilityMod("wis"), str = abilityMod("str");

    var ac = state.ac;
    var acDex = num(ac.dex);
    var acTotal = 10 + num(ac.armor) + num(ac.shield) + acDex + num(ac.size) + num(ac.natural) + num(ac.deflection) + num(ac.misc);
    var acTouch = 10 + acDex + num(ac.size) + num(ac.deflection) + num(ac.misc);
    var acFF = acDex > 0 ? acTotal - acDex : acTotal;
    var balBonus = (hasDomain("Balance") && state.balance && state.balance.active) ? Math.max(0, wis) : 0;
    acTotal += balBonus; acTouch += balBonus; acFF += balBonus;
    ["out-ac-total","out-ac-touch","out-ac-ff"].forEach(function(id){
      document.getElementById(id).parentNode.classList.toggle("buffed", balBonus > 0);
    });
    document.getElementById("out-ac-total").textContent = acTotal;
    document.getElementById("out-ac-touch").textContent = acTouch;
    document.getElementById("out-ac-ff").textContent = acFF;

    document.getElementById("auto-save-fort").textContent = signed(con);
    document.getElementById("auto-save-ref").textContent = signed(dex);
    document.getElementById("auto-save-will").textContent = signed(wis);

    var fort = num(state.saves.fort.base) + con + num(state.saves.fort.magic) + num(state.saves.fort.misc) + num(state.saves.fort.temp);
    var ref  = num(state.saves.ref.base)  + dex + num(state.saves.ref.magic)  + num(state.saves.ref.misc)  + num(state.saves.ref.temp);
    var will = num(state.saves.will.base) + wis + num(state.saves.will.magic) + num(state.saves.will.misc) + num(state.saves.will.temp);
    document.getElementById("out-save-fort").textContent = signed(fort);
    document.getElementById("out-save-ref").textContent = signed(ref);
    document.getElementById("out-save-will").textContent = signed(will);

    var grapple = num(state.bab) + str + num(state.grapple.size) + num(state.grapple.misc);
    document.getElementById("out-grapple").textContent = signed(grapple);

    var init = dex + num(state.initiative.misc);
    document.getElementById("out-init").textContent = signed(init);

    updateSkillTotals();
    updateTurnUndead();
    updateBalanceUI();
    renderFeatsView();
  }

  // ---------------- Turn undead ----------------
  // 3 + Cha attempts a day (+4 per Extra Turning); turning check 1d20 + Cha (+2 with 5 ranks of
  // Knowledge (religion)); turning damage 2d6 + turning level + Cha.
  // Extra Turning adds 4 uses to each turning ability (undead and any domain one, PHB).
  function turnAttempts(){ return Math.max(0, 3 + abilityMod("cha") + 4 * featCount("Extra Turning")); }
  function turningLevel(){
    return buildClasses().filter(function(c){ return CF.CLASSES[c.name].turnsUndead; })
      .reduce(function(sum, c){ return sum + num(c.level); }, 0) + featCount("Improved Turning");
  }
  function updateTurnUndead(){
    var out = document.getElementById("turnAttempts");
    if (!out) return;
    var lvl = turningLevel();
    var cha = abilityMod("cha");
    var kr = (state.skills || []).filter(function(s){ return s.name === "Knowledge (religion)"; })[0];
    var syn = kr && num(kr.ranks) >= 5 ? 2 : 0;
    out.textContent = turnAttempts();
    document.getElementById("turnCheck").textContent = "1d20" + signed(cha + syn);
    document.getElementById("turnDamage").textContent = "2d6" + signed(lvl + cha);
    document.getElementById("turnLevel").textContent = lvl;
    updateTurnTracker();
    renderDomainTurning();
  }

  // Turn attempts used today: a log of uses, each costing 1 (turn undead) or 1 + the metamagic
  // feat's slot increase (Divine Metamagic, Complete Divine). Undo takes back the last one.
  function turnLog(){
    state.turning = state.turning || { log:[] };
    state.turning.log = state.turning.log || [];
    return state.turning.log;
  }
  function turnUsed(){ return turnLog().reduce(function(sum, u){ return sum + num(u.cost); }, 0); }
  // Divine Metamagic is taken once per metamagic feat, e.g. "Divine Metamagic (Persistent Spell)".
  // Without a named feat it covers every metamagic feat the character has.
  function divineMetamagicOptions(){
    var names = [];
    (state.feats || []).forEach(function(f){
      var n = String(f.name || "").trim();
      if (!/^divine metamagic\b/i.test(n)) return;
      var inner = (n.match(/\(([^)]+)\)/) || [])[1];
      if (inner) {
        var hit = CF.findFeat(inner) || CF.findFeat(inner + " Spell");
        if (hit && hit.rules.levels) names.push(hit.name);
      } else {
        (state.feats || []).forEach(function(g){
          var h = CF.findFeat(g.name);
          if (h && h.rules.levels) names.push(h.name);
        });
      }
    });
    return names.filter(function(n, i){ return names.indexOf(n) === i; }).map(function(n){
      return { name:n, cost:1 + CF.FEAT_RULES[n].levels };
    });
  }
  function updateTurnTracker(){
    var leftEl = document.getElementById("turnLeft");
    if (!leftEl) return;
    var max = turnAttempts(), used = turnUsed(), left = Math.max(0, max - used);
    leftEl.textContent = left + "/" + max + " left";
    var counts = {}, order = [];
    turnLog().forEach(function(u){ if (!counts[u.what]) { counts[u.what] = 0; order.push(u.what); } counts[u.what]++; });
    document.getElementById("turnLog").textContent = order.length
      ? "Used: " + order.map(function(w){ return w + (counts[w] > 1 ? " ×" + counts[w] : ""); }).join(" · ")
      : "None used yet.";
    document.getElementById("turnUse").disabled = left < 1;
    document.getElementById("turnUndo").disabled = !turnLog().length;
    var box = document.getElementById("turnMetamagic"), note = document.getElementById("turnMetaNote");
    box.innerHTML = "";
    var opts = divineMetamagicOptions(), short = [];
    opts.forEach(function(o){
      var b = el("button", "power-btn", o.name.replace(/ Spell$/, "") + " · " + o.cost);
      b.type = "button";
      b.setAttribute("aria-label", "Divine Metamagic: " + o.name + ", costs " + o.cost + " turn attempts");
      b.disabled = left < o.cost;
      b.addEventListener("click", function(){ spendTurn(o.name + " (" + o.cost + ")", o.cost); });
      box.appendChild(b);
      if (o.cost > max) short.push(o.name + " needs " + o.cost);
    });
    note.hidden = !opts.length;
    note.textContent = opts.length ? "Divine Metamagic: spend 1 + the feat's level cost in turn attempts, cast in the normal slot." +
      (short.length ? " " + short.join(", ") + " — more than your " + max + " per day." : "") : "";
  }
  function spendTurn(what, cost){
    if (turnAttempts() - turnUsed() < cost) return;
    turnLog().push({ what:what, cost:cost });
    updateTurnTracker(); scheduleSave();
  }

  // Domain turning powers (Earth, Nature): their own uses per day, 3 + Cha (+4 per Extra Turning),
  // turning level = cleric level. Only shown while that domain is chosen.
  function renderDomainTurning(){
    var box = document.getElementById("domainTurnList");
    if (!box) return;
    box.innerHTML = "";
    state.domainTurning = state.domainTurning || {};
    var max = turnAttempts(), cha = abilityMod("cha"), lvl = turningLevel();
    chosenDomains().filter(function(d){ return d.turning; }).forEach(function(d){
      var key = domainKey(d.name), used = num(state.domainTurning[key]), left = Math.max(0, max - used);
      var block = el("div", "power-block");
      var head = el("div", "power-head"), txt = el("div");
      txt.appendChild(el("div", "power-title", d.name + " Domain · " + d.turning.title));
      txt.appendChild(el("div", "power-desc", d.turning.desc));
      head.appendChild(txt);
      head.appendChild(el("div", "power-uses", left + "/" + max + " left"));
      block.appendChild(head);
      var stats = el("div", "turn-stats");
      stats.innerHTML = "<span>Check <b>1d20" + signed(cha) + "</b></span><span>Damage <b>2d6" + signed(lvl + cha) + "</b></span><span>Level <b>" + lvl + "</b></span>";
      block.appendChild(stats);
      var acts = el("div", "power-actions");
      acts.style.marginTop = "10px";
      var use = el("button", "power-btn primary", "Use"), undo = el("button", "power-btn", "Undo");
      use.type = undo.type = "button";
      use.disabled = left < 1; undo.disabled = used < 1;
      use.addEventListener("click", function(){ state.domainTurning[key] = used + 1; renderDomainTurning(); scheduleSave(); });
      undo.addEventListener("click", function(){ state.domainTurning[key] = Math.max(0, used - 1); renderDomainTurning(); scheduleSave(); });
      acts.appendChild(use); acts.appendChild(undo);
      block.appendChild(acts);
      box.appendChild(block);
    });
  }
  function bindTurning(){
    document.getElementById("turnUse").addEventListener("click", function(){ spendTurn("Turn undead", 1); });
    document.getElementById("turnUndo").addEventListener("click", function(){ turnLog().pop(); updateTurnTracker(); scheduleSave(); });
    document.getElementById("turnReset").addEventListener("click", function(){
      state.turning = { log:[] }; state.domainTurning = {};
      updateTurnTracker(); renderDomainTurning(); scheduleSave();
    });
  }

  // ---------------- Domains ----------------
  // The two chosen domains (state.domainChoice) pick the rules shown on the Domains card,
  // the domain slot's options on the Spells card, and powers the sheet works out (Balance → AC).
  function chosenDomains(){
    return (state.domainChoice || []).map(CF.findDomain).filter(Boolean);
  }
  function hasDomain(name){ return (state.domainChoice || []).indexOf(name) !== -1; }
  function domainKey(name){ return String(name).toLowerCase(); }
  // Highest spell level the cleric can cast now (0 if none).
  function maxSpellLevel(){
    return state.spellLevels.reduce(function(m, l){ return l.auto && num(l.total) > 0 ? Math.max(m, num(l.level)) : m; }, 0);
  }

  function renderDomains(){
    var box = document.getElementById("domainsList");
    if (!box) return;
    box.innerHTML = "";
    var btn = box.closest(".card").querySelector(".text-edit-btn");
    var editing = btn && btn.getAttribute("aria-pressed") === "true";
    var top = maxSpellLevel();
    state.domains = state.domains || {};
    chosenDomains().forEach(function(d){
      var block = el("div", "domain-block");
      block.appendChild(el("span", "domain-name", d.name));
      block.appendChild(el("div", "domain-src", d.source));
      if (d.pending) {
        block.appendChild(el("p", "domain-power pending", d.pending));
      } else {
        var power = el("p", "domain-power");
        power.appendChild(el("span", "domain-label", "Granted power"));
        power.appendChild(document.createTextNode(d.power));
        block.appendChild(power);
        var list = el("ol", "domain-spells");
        d.spells.forEach(function(sp, i){
          var li = el("li", i + 1 > top ? "later" : "");
          li.appendChild(el("span", "ds-lvl", String(i + 1)));
          var txt = el("span", "ds-txt");
          txt.appendChild(el("span", "ds-name", sp[0]));
          txt.appendChild(document.createTextNode(" " + sp[1]));
          li.appendChild(txt);
          list.appendChild(li);
        });
        block.appendChild(list);
        if (top < 9) {
          var more = el("button", "more-link", "Show all 9 spells"); more.type = "button";
          more.addEventListener("click", function(){
            var open = list.classList.toggle("open");
            more.textContent = open ? "Show fewer" : "Show all 9 spells";
          });
          block.appendChild(more);
        } else list.classList.add("open");
      }
      var key = domainKey(d.name);
      var ta = el("textarea", "text-block");
      ta.setAttribute("data-clamp", "3");
      ta.setAttribute("aria-label", d.name + " domain notes");
      ta.value = state.domains[key] || "";
      ta.addEventListener("input", function(){ state.domains[key] = ta.value; scheduleSave(); });
      block.appendChild(ta);
      box.appendChild(block);
      setupLongText(ta, "No notes yet — tap Edit.");
      if (editing) ta._setEditing(true);
    });
  }

  // Character Build: pick the two domains (deity's or ascension), no domain twice.
  function renderDomainPicker(){
    var box = document.getElementById("buildDomains");
    if (!box) return;
    box.innerHTML = "";
    state.domainChoice = state.domainChoice || [];
    [0, 1].forEach(function(i){
      var wrap = el("label", "build-inc");
      wrap.appendChild(el("span", "", "Domain " + (i + 1)));
      var sel = el("select");
      [["deity", "Deity's domains"], ["ascension", "Ascension concept"]].forEach(function(g){
        var og = el("optgroup"); og.label = g[1];
        CF.DOMAIN_OPTIONS.filter(function(d){ return d.group === g[0]; }).forEach(function(d){
          var opt = el("option", "", d.name); opt.value = d.name;
          opt.disabled = d.name === state.domainChoice[1 - i];
          og.appendChild(opt);
        });
        sel.appendChild(og);
      });
      sel.value = state.domainChoice[i] || "";
      sel.addEventListener("change", function(){
        state.domainChoice[i] = sel.value;
        onDomainsChange();
      });
      wrap.appendChild(sel);
      box.appendChild(wrap);
    });
  }
  function onDomainsChange(){
    renderDomainPicker();
    renderDomains();
    renderSpellLevels();
    recomputeDerived();
    scheduleSave();
  }

  // Domain spells for one spell level, e.g. "Make Whole (Balance) or Nystul's Magic Aura (Magic)".
  function domainSlotText(level){
    var opts = chosenDomains().filter(function(d){ return d.spells; }).map(function(d){ return d.spells[level - 1][0] + " (" + d.name + ")"; });
    return opts.join(" or ");
  }

  // ---------------- Balance domain power ----------------
  function updateBalanceUI(){
    var b = state.balance, lvl = num(state.level), bonus = Math.max(0, abilityMod("wis"));
    var block = document.getElementById("balanceBlock");
    if (!block) return;
    block.hidden = !hasDomain("Balance");
    block.classList.toggle("active", !!b.active);
    document.getElementById("balanceUses").textContent = (b.used ? 0 : 1) + "/1 today";
    var status;
    if (b.active) status = "Active · +" + bonus + " AC · " + b.rounds + (b.rounds === 1 ? " round" : " rounds") + " left";
    else if (b.used) status = "Used today";
    else status = "Ready · +" + bonus + " AC for " + lvl + " rounds";
    document.getElementById("balanceStatus").textContent = status;
    document.getElementById("balanceActivate").disabled = !!b.active || !!b.used;
    document.getElementById("balanceTick").disabled = !b.active;
    document.getElementById("balanceEnd").disabled = !b.active;
  }

  function bindBalance(){
    document.getElementById("balanceActivate").addEventListener("click", function(){
      if (state.balance.active || state.balance.used) return;
      state.balance = { active:true, rounds:Math.max(1, num(state.level)), used:1 };
      recomputeDerived(); scheduleSave();
    });
    document.getElementById("balanceTick").addEventListener("click", function(){
      if (!state.balance.active) return;
      state.balance.rounds -= 1;
      if (state.balance.rounds <= 0) { state.balance.active = false; state.balance.rounds = 0; }
      recomputeDerived(); scheduleSave();
    });
    document.getElementById("balanceEnd").addEventListener("click", function(){
      state.balance.active = false; state.balance.rounds = 0;
      recomputeDerived(); scheduleSave();
    });
    document.getElementById("balanceReset").addEventListener("click", function(){
      state.balance = { active:false, rounds:0, used:0 };
      recomputeDerived(); scheduleSave();
    });
  }

  // ---------------- Skills ----------------
  var ABILS = ["str","dex","con","int","wis","cha"];
  // Always computed so every skill shows a usable number. Trained-only skills
  // with no ranks are flagged (dimmed in the UI) rather than hidden.
  function skillLocked(s){ return !s.untrained && num(s.ranks) <= 0; }

  // 3.5 skill synergies (PHB table 4-5): 5+ ranks in the source skill give +2 on the target.
  // Entries with "when" only apply in that situation, so they are noted, not added to the total.
  var SYNERGIES = [
    { from:"Bluff", to:"Diplomacy" }, { from:"Bluff", to:"Intimidate" }, { from:"Bluff", to:"Sleight of Hand" },
    { from:"Bluff", to:"Disguise", when:"acting in character" },
    { from:"Craft", to:"Appraise", when:"items related to your Craft" },
    { from:"Decipher Script", to:"Use Magic Device", when:"scrolls" },
    { from:"Escape Artist", to:"Use Rope", when:"binding someone" },
    { from:"Handle Animal", to:"Ride" },
    { from:"Jump", to:"Tumble" },
    { from:"Knowledge (arcana)", to:"Spellcraft" },
    { from:"Knowledge (architecture and engineering)", to:"Search", when:"secret doors and compartments" },
    { from:"Knowledge (dungeoneering)", to:"Survival", when:"underground" },
    { from:"Knowledge (geography)", to:"Survival", when:"avoiding getting lost or hazards" },
    { from:"Knowledge (local)", to:"Gather Information" },
    { from:"Knowledge (nature)", to:"Survival", when:"above ground in natural environments" },
    { from:"Knowledge (nobility and royalty)", to:"Diplomacy" },
    { from:"Knowledge (religion)", to:"Turn undead", when:"turning checks" },
    { from:"Knowledge (the planes)", to:"Survival", when:"on other planes" },
    { from:"Search", to:"Survival", when:"following tracks" },
    { from:"Sense Motive", to:"Diplomacy" },
    { from:"Spellcraft", to:"Use Magic Device", when:"scrolls" },
    { from:"Survival", to:"Knowledge (nature)" },
    { from:"Tumble", to:"Balance" }, { from:"Tumble", to:"Jump" },
    { from:"Use Magic Device", to:"Spellcraft", when:"deciphering scrolls" },
    { from:"Use Rope", to:"Climb", when:"climbing a rope" },
    { from:"Use Rope", to:"Escape Artist", when:"escaping rope bonds" }
  ];
  function skillKey(name){
    var n = String(name || "").toLowerCase().trim();
    return /^craft\b/.test(n) ? "craft" : n;
  }
  // Active synergies for a skill (as target, or as source for non-skill targets like turning).
  function skillSynergies(s){
    var key = skillKey(s.name), out = [];
    SYNERGIES.forEach(function(syn){
      var hit = syn.to.toLowerCase() === key || (syn.to === "Turn undead" && skillKey(syn.from) === key);
      if (!hit) return;
      var fromKey = skillKey(syn.from);
      var active = state.skills.some(function(src){ return skillKey(src.name) === fromKey && num(src.ranks) >= 5; });
      if (active) out.push(syn);
    });
    return out;
  }
  function synergyBonus(s){
    return skillSynergies(s).filter(function(syn){ return !syn.when; }).length * 2;
  }
  function skillTotal(s){
    var ranks = num(s.ranks);
    var acp = Math.min(0, num(state.skillAcp)) * num(s.acp);
    return Math.floor(ranks) + abilityMod(s.ability) + num(s.racial) + synergyBonus(s) + num(s.misc) + acp;
  }
  function updateSkillTotals(){
    var list = document.getElementById("skillsList");
    if (!list || !state.skills) return;
    var lvl = num(state.level), maxC = lvl + 3, maxX = maxC / 2;
    var spent = 0;
    state.skills.forEach(function(s, i){
      spent += s.cls ? num(s.ranks) : num(s.ranks) * 2;
      var row = list.children[i];
      if (!row) return;
      var locked = skillLocked(s), out = row.querySelector(".skill-total");
      out.textContent = signed(skillTotal(s));
      out.classList.toggle("na", locked);
      out.title = locked ? "Trained only: needs at least 1 rank to use" : "";
      var ab = row.querySelector(".ab-mod");
      if (ab) ab.textContent = (ab.classList.contains("ab-mod-only") ? "" : s.ability.toUpperCase() + " ") + signed(abilityMod(s.ability));
      row.querySelector(".rk").classList.toggle("over", num(s.ranks) > (s.cls ? maxC : maxX));
      var info = row.querySelector(".skill-info");
      if (info) {
        var notes = skillNotes(s);
        info._notes = notes;
        info.hidden = !notes.length;
        info.classList.toggle("boost", synergyBonus(s) > 0);
      }
      row.classList.toggle("cls", !!s.cls);
    });
    var budget = skillBudget();
    var pts = document.getElementById("skillPoints");
    pts.textContent = spent + "/" + budget;
    pts.style.color = spent > budget ? "var(--rose)" : "";
    document.getElementById("skillMax").textContent = maxC + " / " + maxX;
    updateSenses();
  }

  // Senses card: Listen and Spot totals mirror the skill list.
  function updateSenses(){
    [["Listen", "senseListen"], ["Spot", "senseSpot"]].forEach(function(pair){
      var out = document.getElementById(pair[1]);
      var s = state.skills.filter(function(sk){ return sk.name === pair[0]; })[0];
      if (out) out.textContent = s ? signed(skillTotal(s)) : "—";
    });
  }
  // Notes behind the (i) button on each skill row: armor penalty, trained only,
  // racial bonus and synergies. Kept out of the row itself so rows stay short.
  function skillNotes(s){
    var notes = [];
    if (s.acp === 2) notes.push("Armor check penalty applies twice");
    else if (s.acp) notes.push("Armor check penalty applies");
    if (!s.untrained) notes.push("Trained only: needs at least 1 rank to use");
    if (num(s.racial)) notes.push("Racial " + signed(num(s.racial)) + " (included)");
    skillSynergies(s).forEach(function(x){
      if (x.to === "Turn undead") notes.push("Synergy: gives +2 on turning checks");
      else if (x.when) notes.push("Synergy +2 from " + x.from + " when " + x.when + " (situational, not included)");
      else notes.push("Synergy +2 from " + x.from + " (included)");
    });
    return notes;
  }
  var INFO_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="4.9" r="1" fill="currentColor"/><rect x="7.25" y="6.9" width="1.5" height="4.8" rx=".75" fill="currentColor"/></svg>';
  var skillTip = null, skillTipFor = null;
  function hideSkillTip(){
    if (skillTip) skillTip.hidden = true;
    skillTipFor = null;
  }
  function toggleSkillTip(btn, title){
    if (skillTipFor === btn) { hideSkillTip(); return; }
    if (!skillTip) {
      skillTip = document.createElement("div");
      skillTip.className = "skill-tip"; skillTip.setAttribute("role", "tooltip");
      document.body.appendChild(skillTip);
      document.addEventListener("click", function(e){ if (skillTip && !skillTip.contains(e.target)) hideSkillTip(); });
      window.addEventListener("scroll", hideSkillTip, { passive:true });
      window.addEventListener("resize", hideSkillTip);
      document.addEventListener("keydown", function(e){ if (e.key === "Escape") hideSkillTip(); });
    }
    skillTip.innerHTML = "";
    var h = document.createElement("div"); h.className = "skill-tip-title"; h.textContent = title;
    var ul = document.createElement("ul");
    (btn._notes || []).forEach(function(n){ var li = document.createElement("li"); li.textContent = n; ul.appendChild(li); });
    skillTip.appendChild(h); skillTip.appendChild(ul);
    skillTip.hidden = false;
    var r = btn.getBoundingClientRect(), w = skillTip.offsetWidth, ht = skillTip.offsetHeight;
    var left = Math.max(12, Math.min(r.left - 12, window.innerWidth - w - 12));
    var top = r.bottom + 6;
    if (top + ht > window.innerHeight - 12) top = Math.max(12, r.top - ht - 6);
    skillTip.style.left = left + "px"; skillTip.style.top = top + "px";
    skillTipFor = btn;
  }
  function renderSkills(){
    var list = document.getElementById("skillsList");
    list.innerHTML = "";
    state.skills.forEach(function(s, idx){
      var row = document.createElement("div");
      row.className = "skill-row";

      var cb = document.createElement("input");
      cb.type = "checkbox"; cb.className = "row-check"; cb.checked = !!s.cls;
      cb.setAttribute("aria-label", "Class skill");
      cb.addEventListener("change", function(){ s.cls = cb.checked; updateSkillTotals(); scheduleSave(); });

      var nameWrap = document.createElement("div"); nameWrap.className = "skill-name";
      if (s.editable) {
        var ni = document.createElement("input"); ni.type = "text"; ni.value = s.name;
        ni.addEventListener("input", function(){ s.name = ni.value; scheduleSave(); });
        nameWrap.appendChild(ni);
      } else {
        var nm = document.createElement("div"); nm.className = "nm"; nm.textContent = s.name;
        nameWrap.appendChild(nm);
      }
      var meta = document.createElement("div"); meta.className = "skill-meta";
      if (s.custom) {
        var sel = document.createElement("select");
        ABILS.forEach(function(a){ var o = document.createElement("option"); o.value = a; o.textContent = a.toUpperCase(); if (a === s.ability) o.selected = true; sel.appendChild(o); });
        sel.addEventListener("change", function(){ s.ability = sel.value; updateSkillTotals(); scheduleSave(); });
        meta.appendChild(sel);
        var abm = document.createElement("span"); abm.className = "ab-mod ab-mod-only";
        meta.appendChild(abm);
        var rm = document.createElement("button"); rm.className = "rm"; rm.textContent = "remove";
        rm.addEventListener("click", function(){ state.skills.splice(idx, 1); renderSkills(); scheduleSave(); });
        meta.appendChild(rm);
      } else {
        var ab = document.createElement("span"); ab.className = "ab-mod";
        meta.appendChild(ab);
      }
      var info = document.createElement("button");
      info.type = "button"; info.className = "skill-info"; info.innerHTML = INFO_ICON; info.hidden = true;
      info.setAttribute("aria-label", s.name + " notes");
      info.addEventListener("click", function(e){ e.stopPropagation(); toggleSkillTip(info, s.name); });
      meta.appendChild(info);
      nameWrap.appendChild(meta);

      var rk = document.createElement("input");
      rk.type = "number"; rk.step = "0.5"; rk.min = "0"; rk.className = "rk"; rk.value = s.ranks;
      rk.setAttribute("aria-label", "Ranks");
      rk.addEventListener("input", function(){ s.ranks = rk.value === "" ? 0 : Number(rk.value); updateSkillTotals(); scheduleSave(); });

      var mi = document.createElement("input");
      mi.type = "number"; mi.value = s.misc; mi.setAttribute("aria-label", "Misc");
      mi.addEventListener("input", function(){ s.misc = mi.value === "" ? 0 : Number(mi.value); updateSkillTotals(); scheduleSave(); });

      var tot = document.createElement("div"); tot.className = "skill-total";

      row.appendChild(cb); row.appendChild(nameWrap); row.appendChild(rk); row.appendChild(mi); row.appendChild(tot);
      list.appendChild(row);
    });
    updateSkillTotals();
  }
  // The Skills how-to hint shows one short line; "Show more" unfolds the rest, and the choice is remembered on this device.
  var NOTES_KEY = "caelian-skills-notes-open";
  function bindSkillsNotes(){
    var btn = document.getElementById("skillsNotesBtn"), notes = document.getElementById("skillsNotes");
    if (!btn || !notes) return;
    function set(open){
      notes.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      btn.textContent = open ? "Show less" : "Show more";
    }
    var open = false;
    try { open = localStorage.getItem(NOTES_KEY) === "1"; } catch(e){}
    set(open);
    btn.addEventListener("click", function(){
      var next = notes.hidden;
      set(next);
      try { localStorage.setItem(NOTES_KEY, next ? "1" : "0"); } catch(e){}
    });
  }
  function bindSkills(){
    bindSkillsNotes();
    bindField("skill-acp", function(){ return state.skillAcp; }, function(v){ state.skillAcp = v; updateSkillTotals(); }, true);
    document.getElementById("addSkill").addEventListener("click", function(){
      state.skills.push({ name:"New skill", ability:"int", untrained:true, acp:0, cls:false, ranks:0, misc:0, editable:true, custom:true });
      renderSkills(); scheduleSave();
      requestAnimationFrame(function(){
        var last = document.getElementById("skillsList").lastElementChild;
        if (last) { last.scrollIntoView({ behavior:"smooth", block:"center" }); var i = last.querySelector('input[type="text"]'); if (i) { i.focus({preventScroll:true}); i.select(); } }
      });
    });
  }

  // ---------------- Render everything ----------------
  function renderHeader(){
    document.getElementById("f-name").value = state.name;
    document.getElementById("f-race").value = state.race;
    document.getElementById("f-alignment").value = state.alignment;
    renderHeaderView();
    document.getElementById("levelNo").textContent = state.level;
    document.getElementById("storyName").textContent = state.name;
    document.getElementById("storySubtitle").textContent = state.race + " · " + classLabel();
  }

  function renderAbilities(){
    var grid = document.getElementById("abilityGrid");
    grid.innerHTML = "";
    var order = [["str","STR"],["dex","DEX"],["con","CON"],["int","INT"],["wis","WIS"],["cha","CHA"]];
    order.forEach(function(pair){
      var key = pair[0], label = pair[1];
      var cell = document.createElement("div");
      cell.className = "ability-cell";
      var lbl = document.createElement("label"); lbl.textContent = label;
      var input = document.createElement("input");
      input.type = "number"; input.value = state.abilities[key];
      input.readOnly = true; input.tabIndex = -1;
      input.title = "Set under Edit & level up → Character Build";
      var mod = document.createElement("div");
      mod.className = "ability-mod"; mod.textContent = signed(Math.floor((state.abilities[key]-10)/2));
      cell.appendChild(lbl); cell.appendChild(input); cell.appendChild(mod);
      grid.appendChild(cell);
    });
  }

  function updateHpBar(){
    var cur = num(state.hp.current), max = num(state.hp.max) || 1;
    var pct = Math.max(0, Math.min(100, (cur / max) * 100));
    document.getElementById("hpBarFill").style.width = pct + "%";
    fitHpInput("hp-current"); fitHpInput("hp-max");
  }
  // Size the hit point fields to their digits (2 to 4, or a minus sign), so 3-digit hp fits
  // and Safari, which crops text at the field's edge, has room for the last digit.
  function fitHpInput(id){
    var el = document.getElementById(id);
    var chars = Math.max(2, Math.min(5, String(el.value).length));
    el.style.width = "calc(" + (chars + 0.4) + "ch + 12px)";
  }

  function renderCoreStats(){
    bindField("hp-current", function(){ return state.hp.current; }, function(v){ state.hp.current = v; updateHpBar(); }, true);
    var hpMax = document.getElementById("hp-max");
    hpMax.value = state.hp.max; hpMax.readOnly = true; hpMax.title = "Max hp: set the rolls under Edit & level up → Character Build";
    updateHpBar();
    document.querySelectorAll("[data-hp]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var delta = Number(btn.getAttribute("data-hp"));
        var max = num(state.hp.max), cur = num(state.hp.current);
        cur = Math.max(0, Math.min(max, cur + delta));
        state.hp.current = cur;
        document.getElementById("hp-current").value = cur;
        updateHpBar(); scheduleSave();
      });
    });

    var babEl = document.getElementById("bab");
    babEl.value = state.bab; babEl.readOnly = true; babEl.title = "From your class levels";

    // AC breakdown
    ["armor","shield","dex","size","natural","deflection","misc"].forEach(function(k){
      bindField("ac-" + k, function(){ return state.ac[k]; }, function(v){ state.ac[k] = v; recomputeDerived(); }, true);
    });
    // Save breakdowns
    ["fort","ref","will"].forEach(function(s){
      var baseEl = document.getElementById("save-" + s + "-base");
      baseEl.value = state.saves[s].base; baseEl.readOnly = true; baseEl.title = "From your class levels";
      ["magic","misc","temp"].forEach(function(k){
        bindField("save-" + s + "-" + k, function(){ return state.saves[s][k]; }, function(v){ state.saves[s][k] = v; recomputeDerived(); }, true);
      });
    });
    bindField("grapple-size", function(){ return state.grapple.size; }, function(v){ state.grapple.size = v; recomputeDerived(); }, true);
    bindField("grapple-misc", function(){ return state.grapple.misc; }, function(v){ state.grapple.misc = v; recomputeDerived(); }, true);
    bindField("speed", function(){ return state.speed; }, function(v){ state.speed = v; }, true);
    state.resistances = Object.assign(clone(DEFAULT_DATA.resistances), state.resistances || {});
    Object.keys(state.resistances).forEach(function(k){
      bindField("res-" + k, function(){ return state.resistances[k]; }, function(v){ state.resistances[k] = v; }, true);
    });
    bindField("darkvision", function(){ return state.darkvision; }, function(v){ state.darkvision = v; }, true);
    bindField("init-misc", function(){ return state.initiative.misc; }, function(v){ state.initiative.misc = v; recomputeDerived(); }, true);

    recomputeDerived();
  }

  function renderConceptBlocks(){
    bindField("appearance", function(){ return state.appearance; }, function(v){ state.appearance = v; });
    bindField("backstory", function(){ return state.backstory; }, function(v){ state.backstory = v; });
    bindField("ideal", function(){ return state.ideal; }, function(v){ state.ideal = v; });
    bindField("sessionNotes", function(){ return state.sessionNotes; }, function(v){ state.sessionNotes = v; });
    bindField("armor", function(){ return state.armor; }, function(v){ state.armor = v; });
    bindField("shield", function(){ return state.shield; }, function(v){ state.shield = v; });
    document.querySelectorAll("textarea.text-block").forEach(function(ta){ if (ta._renderView && ta.hidden) ta._renderView(); });
  }

  var ATTACK_FIELDS = [
    { field:"name", placeholder:"Weapon", className:"col-name" },
    { field:"dice", placeholder:"1d8", className:"col-small" },
    { field:"enh", type:"number", placeholder:"+0", className:"col-small" },
    { field:"notes", placeholder:"Notes", className:"col-mid" }
  ];
  var FEAT_FIELDS = [
    { field:"name", placeholder:"Feat", className:"col-name" },
    { field:"notes", placeholder:"Note (optional)", className:"col-mid" }
  ];
  var RACIAL_FIELDS = [{ field:"text", placeholder:"Trait", className:"col-name" }];
  var EQUIPMENT_FIELDS = [{ field:"name", placeholder:"Item", className:"col-name" }];
  var LEDGER_FIELDS = [
    { field:"desc", placeholder:"Description", className:"col-name" },
    { field:"amount", type:"number", placeholder:"gp", className:"col-small" }
  ];
  var LEVEL_SPELL_FIELDS = [
    { field:"cast", type:"checkbox" },
    { field:"name", placeholder:"Spell name", className:"col-name" }
  ];

  function onAttacksChange(){ (state.attacks || []).forEach(computeAttack); renderCombatFeats(); renderAttacksView(); }
  function renderAttacks(){ renderList("attacksList", state.attacks, ATTACK_FIELDS, onAttacksChange); onAttacksChange(); }

  function renderAttacksView(){
    var view = document.getElementById("attacksView");
    view.innerHTML = "";
    state.attacks.forEach(function(a){
      if (!String(a.name || "").trim() && !a.bonus && !a.damage) return;
      var el = document.createElement("div");
      el.className = "attack-entry";
      var top = document.createElement("div");
      top.className = "attack-top";
      var name = document.createElement("span");
      name.className = "attack-name"; name.textContent = a.name || "Attack";
      var nums = document.createElement("span");
      nums.className = "attack-nums";
      nums.textContent = [a.bonus, a.damage].filter(function(x){ return String(x || "").trim(); }).join(" · ") || "—";
      top.appendChild(name); top.appendChild(nums);
      el.appendChild(top);
      if (String(a.notes || "").trim()) {
        var notes = document.createElement("div");
        notes.className = "attack-notes"; notes.textContent = a.notes;
        el.appendChild(notes);
      }
      view.appendChild(el);
    });
    if (!view.firstChild) view.innerHTML = '<div class="hint">No attacks yet — tap Edit to add one.</div>';
  }
  function onFeatsChange(){ renderCombatFeats(); if (featCount("Toughness") !== lastToughness) rebuild(); }
  var lastToughness = -1;
  function renderFeats(){ lastToughness = featCount("Toughness"); renderList("featsList", state.feats, FEAT_FIELDS, onFeatsChange); renderFeatsView(); }

  // Extra line computed from the current sheet, for feats whose numbers depend on it.
  function featLiveNote(name, title){
    if (name === "Power Attack") {
      var bab = Math.max(0, num(state.bab));
      return "Now: up to −" + bab + " attack → +" + bab + " dmg (+" + (bab * 2) + " two-handed).";
    }
    if (name === "Divine Metamagic" || name === "Divine Might" || name === "Divine Vigor") {
      var et = featCount("Extra Turning");
      var line = "Turn attempts/day: " + turnAttempts() + " (3 + Cha " + signed(abilityMod("cha")) + (et ? " + " + 4 * et + " Extra Turning" : "") + ").";
      // Divine Metamagic (X): costs 1 + X's slot increase in turn attempts.
      var m = name === "Divine Metamagic" && String(title || "").match(/\(([^)]+)\)/);
      var mm = m ? CF.findFeat(m[1]) : null;
      var up = mm ? String(mm.rules.summary).match(/slot \+(\d+)/) : null;
      if (up) line += " " + mm.name + " costs " + (1 + Number(up[1])) + " attempts.";
      return line;
    }
    return "";
  }

  function featEntry(title, hit, note){
    var el = document.createElement("div");
    el.className = "feat-entry";
    var head = document.createElement("div");
    head.className = "feat-name";
    var nameEl = document.createElement("span");
    nameEl.className = "feat-title";
    nameEl.textContent = title;
    head.appendChild(nameEl);
    if (hit) {
      var tag = document.createElement("span");
      tag.className = "feat-type";
      tag.textContent = hit.rules.type + (hit.rules.source ? " · " + hit.rules.source : "");
      head.appendChild(tag);
    }
    el.appendChild(head);
    var sum = document.createElement("div");
    if (hit) {
      sum.className = "feat-summary";
      sum.textContent = hit.rules.summary;
      if (hit.rules.prereq) sum.title = "Prerequisites: " + hit.rules.prereq;
    } else if (!note) {
      sum.className = "feat-summary feat-unknown";
      sum.textContent = "No summary on file — add one as a note in edit mode.";
    }
    if (sum.textContent) el.appendChild(sum);
    var live = hit ? featLiveNote(hit.name, title) : "";
    if (live) {
      var l = document.createElement("div");
      l.className = "feat-live"; l.textContent = live;
      el.appendChild(l);
    }
    if (note) {
      var n = document.createElement("div");
      n.className = "feat-note"; n.textContent = note;
      el.appendChild(n);
    }
    return el;
  }

  function renderFeatsView(){
    var view = document.getElementById("featsView");
    view.innerHTML = "";
    state.feats.forEach(function(f){
      if (!String(f.name || "").trim() && !String(f.notes || "").trim()) return;
      view.appendChild(featEntry(f.name || "Unnamed feat", CF.findFeat(f.name), f.notes));
    });
    if (!view.firstChild) {
      view.innerHTML = '<div class="hint">No feats yet — tap Edit to add one.</div>';
    }
    renderCombatFeats();
  }

  // ---------------- Combat tab: feats that change attacks ----------------
  function paAmount(){ return Math.max(0, Math.min(num(state.powerAttack), Math.max(0, num(state.bab)))); }

  // "+8" → 8, "1d8+7" → { dice:"1d8", mod:7 }; null when the text isn't in that shape.
  function parseBonus(txt){ var m = String(txt || "").trim().match(/^([+-]?\d+)/); return m ? Number(m[1]) : null; }
  function parseDamage(txt){
    var m = String(txt || "").replace(/\s+/g, "").match(/^(\d*d\d+)([+-]\d+)?$/i);
    return m ? { dice:m[1], mod:m[2] ? Number(m[2]) : 0 } : null;
  }
  function isTwoHanded(a){ return /two[- ]?hand/i.test((a.notes || "") + " " + (a.name || "")); }

  function renderCombatFeats(){
    var card = document.getElementById("combatFeatsCard");
    var list = document.getElementById("combatFeats");
    if (!card || !list) return;
    list.innerHTML = "";
    var hasPA = false;
    state.feats.forEach(function(f){
      var hit = CF.findFeat(f.name);
      if (!hit || !hit.rules.combat) return;
      if (hit.name === "Power Attack") { hasPA = true; return; } // has its own calculator
      list.appendChild(featEntry(f.name, hit, ""));
    });
    card.hidden = !list.firstChild && !hasPA;
    var pa = document.getElementById("paBlock");
    pa.hidden = !hasPA;
    if (hasPA) renderPowerAttack();
  }

  function renderPowerAttack(){
    var n = paAmount();
    document.getElementById("paSummary").textContent = CF.FEAT_RULES["Power Attack"].summary;
    document.getElementById("paValue").textContent = n ? "−" + n : "Off";
    document.getElementById("paMinus").disabled = n <= 0;
    document.getElementById("paPlus").disabled = n >= Math.max(0, num(state.bab));
    var out = document.getElementById("paAttacks");
    out.innerHTML = "";
    state.attacks.forEach(function(a){
      var atk = parseBonus(a.bonus), dmg = parseDamage(a.damage);
      if (atk === null || !dmg) return;
      var two = isTwoHanded(a);
      var row = document.createElement("div");
      row.className = "pa-row";
      var name = document.createElement("span");
      name.className = "pa-name";
      name.textContent = (a.name || "Attack") + (two ? " (2H)" : "");
      var val = document.createElement("span");
      val.className = "pa-val";
      var mod = dmg.mod + n * (two ? 2 : 1);
      val.textContent = signed(atk - n) + " · " + dmg.dice + (mod ? signed(mod) : "");
      row.appendChild(name); row.appendChild(val);
      out.appendChild(row);
    });
    if (!out.firstChild) out.innerHTML = '<div class="hint">Give an attack a bonus like "+8" and damage like "1d8+7" to see it adjusted here.</div>';
  }

  function bindPowerAttack(){
    function step(d){
      state.powerAttack = Math.max(0, Math.min(paAmount() + d, Math.max(0, num(state.bab))));
      renderPowerAttack(); scheduleSave();
    }
    document.getElementById("paMinus").addEventListener("click", function(){ step(-1); });
    document.getElementById("paPlus").addEventListener("click", function(){ step(1); });
  }

  // Edit / Done toggle for a card: "<key>EditBtn" swaps "<key>View" and "<key>Edit";
  // the view is re-rendered on Done.
  function bindSectionToggle(key, renderView){
    var btn = document.getElementById(key + "EditBtn");
    paintToggle(btn, false);
    var view = document.getElementById(key + "View");
    var edit = document.getElementById(key + "Edit");
    btn.addEventListener("click", function(){
      var editing = edit.hidden;
      edit.hidden = !editing;
      view.hidden = editing;
      btn.setAttribute("aria-pressed", String(editing));
      paintToggle(btn, editing);
      if (!editing) renderView();
    });
  }
  // ---------------- Character Build card (shown with the header's Edit & level up) ----------------
  // Refresh everything that comes from the build after a change.
  function rebuild(){
    computeBuild(true);
    renderAbilities();
    document.getElementById("bab").value = state.bab;
    ["fort","ref","will"].forEach(function(k){ document.getElementById("save-" + k + "-base").value = state.saves[k].base; });
    document.getElementById("hp-max").value = state.hp.max;
    document.getElementById("hp-current").value = state.hp.current;
    updateHpBar();
    renderAttacksView();
    renderSpellLevels();
    renderDomains();
    renderHeaderView();
    syncStoryCaption();
    document.getElementById("levelNo").textContent = state.level;
    recomputeDerived();
    updateBuildReadouts();
    scheduleSave();
  }

  function el(tag, cls, text){
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function numInput(value, onInput, label){
    var i = el("input");
    i.type = "number"; i.inputMode = "numeric"; i.value = value; i.setAttribute("aria-label", label);
    i.addEventListener("input", function(){ onInput(i.value === "" ? "" : Number(i.value)); rebuild(); });
    return i;
  }

  function renderBuild(){
    var card = document.getElementById("buildCard");
    if (!card || card.hidden) return;
    var lvl = num(state.level);

    // Class levels
    var cls = document.getElementById("buildClasses");
    cls.innerHTML = "";
    state.classes.forEach(function(c){
      var row = el("div", "build-class");
      row.appendChild(el("span", "build-class-name", c.name));
      var step = el("div", "pa-stepper");
      var minus = el("button"), val = el("span", "", String(num(c.level))), plus = el("button");
      minus.innerHTML = ICONS.minus; plus.innerHTML = ICONS.plus;
      minus.type = plus.type = "button";
      minus.setAttribute("aria-label", "One " + c.name + " level less");
      plus.setAttribute("aria-label", "One " + c.name + " level more");
      minus.disabled = num(c.level) <= 1;
      plus.disabled = lvl >= 20;
      minus.addEventListener("click", function(){ c.level = Math.max(1, num(c.level) - 1); rebuild(); renderBuild(); });
      plus.addEventListener("click", function(){ c.level = num(c.level) + 1; rebuild(); renderBuild(); });
      step.appendChild(minus); step.appendChild(val); step.appendChild(plus);
      row.appendChild(step);
      cls.appendChild(row);
    });

    // Ability scores: base + race + level increases + items
    var ab = document.getElementById("buildAbilities");
    ab.innerHTML = "";
    ["", "Base", "Race", "Lvl", "Items", "Total"].forEach(function(h){ ab.appendChild(el("span", "bg-head", h)); });
    ABILS.forEach(function(k){
      ab.appendChild(el("span", "bg-label", ABIL_LABEL[k]));
      ab.appendChild(numInput(state.abilityBase[k], function(v){ state.abilityBase[k] = v; }, ABIL_LABEL[k] + " base"));
      ab.appendChild(numInput(state.abilityRacial[k], function(v){ state.abilityRacial[k] = v; }, ABIL_LABEL[k] + " racial"));
      ab.appendChild(el("span", "auto-readout bg-inc", "+0")).setAttribute("data-inc", k);
      ab.appendChild(numInput(state.abilityItems[k], function(v){ state.abilityItems[k] = v; }, ABIL_LABEL[k] + " items"));
      ab.appendChild(el("span", "auto-readout bg-total", "")).setAttribute("data-total", k);
    });

    // Ability increases, one per 4 levels
    var inc = document.getElementById("buildIncreases");
    inc.innerHTML = "";
    for (var L = 4; L <= lvl; L += 4) (function(L){
      var wrap = el("label", "build-inc");
      wrap.appendChild(el("span", "", "Level " + L));
      var sel = el("select");
      [["", "—"]].concat(ABILS.map(function(k){ return [k, ABIL_LABEL[k]]; })).forEach(function(o){
        var opt = el("option", "", o[1]); opt.value = o[0]; sel.appendChild(opt);
      });
      sel.value = (state.abilityIncreases || {})[L] || "";
      sel.addEventListener("change", function(){
        state.abilityIncreases = state.abilityIncreases || {};
        if (sel.value) state.abilityIncreases[L] = sel.value; else delete state.abilityIncreases[L];
        rebuild();
      });
      wrap.appendChild(sel);
      inc.appendChild(wrap);
    })(L);
    if (!inc.firstChild) inc.appendChild(el("div", "hint", "First +1 at level 4."));

    // Hit point rolls, one per level
    var hp = document.getElementById("buildHp");
    hp.innerHTML = "";
    var rolls = el("div", "build-rolls");
    for (var i = 0; i < lvl; i++) (function(i){
      var cell = el("label", "build-roll");
      cell.appendChild(el("span", "", "L" + (i + 1)));
      var input = numInput(state.hpRolls[i], function(v){ state.hpRolls[i] = v; }, "Level " + (i + 1) + " hit die roll");
      input.placeholder = "d" + hitDieFor(i);
      cell.appendChild(input);
      rolls.appendChild(cell);
    })(i);
    hp.appendChild(rolls);
    hp.appendChild(el("div", "build-sum", "")).id = "buildHpSum";

    renderDomainPicker();
    renderFeatPlan();
    renderLevelUpLaunch();
    updateBuildReadouts();
  }

  // ---------------- Guided level-up ----------------
  // Steps: hit die → ability +1 (every 4th level) → skill points → feat (1, 3, 6, 9…) → summary.
  // Confirm applies it on top of the Build; the last level-up can be undone (state.lastLevelUp).
  var lu = null;
  function luClassName(){ return (buildClasses()[0] || { name:"Cleric" }).name; }
  function luSteps(){
    var lvl = num(state.level) + 1, steps = [["hp", "Hit die"]];
    if (CF.isAbilityLevel(lvl)) steps.push(["ability", "Ability"]);
    steps.push(["skills", "Skills"]);
    if (CF.isFeatLevel(lvl)) steps.push(["feat", "Feat"]);
    steps.push(["summary", "Summary"]);
    return steps;
  }
  function luPlan(lvl){ return (state.featPlan || []).filter(function(p){ return num(p.level) === lvl; })[0] || null; }
  function startLevelUp(){
    if (num(state.level) >= 20) return;
    var lvl = num(state.level) + 1, plan = luPlan(lvl);
    lu = { cls:luClassName(), step:0, roll:"", ability:"", skills:{}, feat:plan && plan.name ? plan.name : "", other:"" };
    document.getElementById("buildCard").hidden = true;
    document.getElementById("levelUpCard").hidden = false;
    renderLevelUp();
    document.getElementById("levelUpCard").scrollIntoView({ behavior:"smooth", block:"start" });
  }
  function closeLevelUp(){
    lu = null;
    document.getElementById("levelUpCard").hidden = true;
    var editing = document.getElementById("headerEditBtn").getAttribute("aria-pressed") === "true";
    document.getElementById("buildCard").hidden = !editing;
    if (editing) renderBuild();
  }
  // Skill points for the new level: class points + Int modifier after this level's increase (min 1).
  function luSkillBudget(){
    var int = num(state.abilities.int) + (lu.ability === "int" ? 1 : 0);
    return Math.max(1, CF.CLASSES[lu.cls].skillPoints + Math.floor((int - 10) / 2));
  }
  function luSpent(){
    return Object.keys(lu.skills).reduce(function(sum, name){
      var s = state.skills.filter(function(x){ return x.name === name; })[0];
      return sum + (s && s.cls ? 1 : 2) * num(lu.skills[name]);
    }, 0);
  }
  function luFeatName(){ return lu.feat === "__other" ? lu.other.trim() : lu.feat; }
  function luStepOk(key){
    if (key === "hp") { var r = num(lu.roll), d = CF.CLASSES[lu.cls].hitDie; return lu.roll !== "" && r >= 1 && r <= d; }
    if (key === "ability") return !!lu.ability;
    if (key === "skills") return luSpent() <= luSkillBudget();
    if (key === "feat") return !!luFeatName();
    return true;
  }

  // Apply the level-up to the current state (also used on a copy for the summary preview).
  function applyLevelUp(){
    var c = (state.classes || []).filter(function(x){ return x.name === lu.cls; })[0], added = false;
    if (!c) { c = { name:lu.cls, level:0 }; state.classes.push(c); added = true; }
    c.level = num(c.level) + 1;
    var lvl = buildClasses().reduce(function(sum, x){ return sum + num(x.level); }, 0);
    state.hpRolls = state.hpRolls || [];
    while (state.hpRolls.length < lvl) state.hpRolls.push("");
    state.hpRolls[lvl - 1] = num(lu.roll);
    var rec = { level:lvl, cls:lu.cls, added:added, ability:"", skills:{}, feat:"", planSet:false };
    if (lu.ability) {
      state.abilityIncreases = state.abilityIncreases || {};
      state.abilityIncreases[lvl] = lu.ability; rec.ability = lu.ability;
    }
    Object.keys(lu.skills).forEach(function(name){
      var add = num(lu.skills[name]);
      if (!add) return;
      state.skills.forEach(function(s){ if (s.name === name) s.ranks = num(s.ranks) + add; });
      rec.skills[name] = add;
    });
    var feat = CF.isFeatLevel(lvl) ? luFeatName() : "";
    if (feat) {
      state.feats.push({ name:feat, notes:"" }); rec.feat = feat;
      var plan = luPlan(lvl);
      if (plan && !String(plan.name || "").trim()) { plan.name = feat; rec.planSet = true; }
    }
    state.lastLevelUp = rec;
  }
  function undoLevelUp(){
    var rec = state.lastLevelUp;
    if (!rec || num(state.level) !== rec.level) return;
    var c = (state.classes || []).filter(function(x){ return x.name === rec.cls; })[0];
    if (!c) return;
    c.level = num(c.level) - 1;
    if (c.level <= 0 && rec.added) state.classes.splice(state.classes.indexOf(c), 1);
    state.hpRolls[rec.level - 1] = "";
    if (rec.ability && state.abilityIncreases) delete state.abilityIncreases[rec.level];
    Object.keys(rec.skills).forEach(function(name){
      state.skills.forEach(function(s){ if (s.name === name) s.ranks = Math.max(0, num(s.ranks) - num(rec.skills[name])); });
    });
    if (rec.feat) {
      for (var i = state.feats.length - 1; i >= 0; i--) {
        if (String(state.feats[i].name || "").trim().toLowerCase() === rec.feat.toLowerCase()) { state.feats.splice(i, 1); break; }
      }
      var plan = luPlan(rec.level);
      if (rec.planSet && plan) plan.name = "";
    }
    state.lastLevelUp = null;
    afterLevelChange();
  }
  function afterLevelChange(){
    rebuild();
    renderSkills();
    renderFeats();
    renderCombatFeats();
    renderBuild();
  }

  // Numbers before and after, worked out on a copy of the sheet.
  function luSnapshot(){
    var spells = {};
    (state.spellLevels || []).forEach(function(l){ if (l.auto) spells[num(l.level)] = num(l.total); });
    return {
      level: num(state.level), bab: num(state.bab), hp: num(state.hp.max),
      saves: ["fort","ref","will"].map(function(k){ return num(state.saves[k].base); }),
      abilities: clone(state.abilities), spells: spells, turns: turnAttempts()
    };
  }
  function luPreview(){
    var real = state, before = luSnapshot(), after;
    state = clone(real);
    try { applyLevelUp(); computeBuild(false); after = luSnapshot(); }
    finally { state = real; }
    return { before:before, after:after };
  }

  function renderLevelUpLaunch(){
    var box = document.getElementById("luLaunch");
    if (!box) return;
    box.innerHTML = "";
    var lvl = num(state.level);
    var go = el("button", "power-btn primary"); go.type = "button";
    go.innerHTML = ICONS.levelUp + "<span>Level up to " + (lvl + 1) + "</span>";
    go.disabled = lvl >= 20;
    go.addEventListener("click", startLevelUp);
    box.appendChild(go);
    var rec = state.lastLevelUp;
    if (rec && rec.level === lvl) {
      var undo = el("button", "power-btn"); undo.type = "button";
      undo.innerHTML = ICONS.minus + "<span>Undo level " + lvl + "</span>";
      undo.addEventListener("click", function(){
        if (!window.confirm("Undo the level-up to level " + lvl + "? The hit die roll, skill ranks" + (rec.feat ? ", feat (" + rec.feat + ")" : "") + (rec.ability ? ", ability +1" : "") + " from it are removed.")) return;
        undoLevelUp();
      });
      box.appendChild(undo);
    }
  }

  function renderLevelUp(){
    if (!lu) return;
    var steps = luSteps(), key = steps[lu.step][0], lvl = num(state.level) + 1;
    var cls = CF.CLASSES[lu.cls];
    document.getElementById("luTitle").textContent = "Level up · " + lu.cls + " " + (((state.classes || []).filter(function(x){ return x.name === lu.cls; })[0] || { level:0 }).level * 1 + 1);
    var bar = document.getElementById("luSteps");
    bar.innerHTML = "";
    steps.forEach(function(s, i){ bar.appendChild(el("li", i < lu.step ? "done" : (i === lu.step ? "now" : ""), s[1])); });
    var body = document.getElementById("luBody");
    body.innerHTML = "";
    var next = document.getElementById("luNext");

    if (key === "hp") {
      body.appendChild(el("p", "lu-lead", "Roll your hit die (d" + cls.hitDie + ") and enter the result, or let the sheet roll it."));
      var row = el("div", "lu-row");
      var input = el("input"); input.type = "number"; input.inputMode = "numeric"; input.min = 1; input.max = cls.hitDie;
      input.value = lu.roll; input.setAttribute("aria-label", "Hit die roll");
      var out = el("span", "lu-out");
      function show(){
        var r = num(lu.roll);
        out.textContent = lu.roll === "" ? "" : (r < 1 || r > cls.hitDie ? "1–" + cls.hitDie + " only" : "+" + Math.max(1, r + abilityMod("con")) + " hp (roll " + r + " " + signed(abilityMod("con")) + " Con)");
        next.disabled = !luStepOk("hp");
      }
      input.addEventListener("input", function(){ lu.roll = input.value === "" ? "" : Number(input.value); show(); });
      var roll = el("button", "power-btn", "Roll d" + cls.hitDie); roll.type = "button";
      roll.addEventListener("click", function(){ lu.roll = 1 + Math.floor(Math.random() * cls.hitDie); input.value = lu.roll; show(); });
      row.appendChild(input); row.appendChild(roll); row.appendChild(out);
      body.appendChild(row);
      show();
    }

    if (key === "ability") {
      body.appendChild(el("p", "lu-lead", "Level " + lvl + ": +1 to one ability score."));
      var arow = el("div", "lu-row");
      var sel = el("select"); sel.setAttribute("aria-label", "Ability to raise");
      [["", "Choose…"]].concat(ABILS.map(function(k){ return [k, ABIL_LABEL[k] + " " + state.abilities[k] + " → " + (num(state.abilities[k]) + 1)]; })).forEach(function(o){
        var opt = el("option", "", o[1]); opt.value = o[0]; sel.appendChild(opt);
      });
      sel.value = lu.ability;
      sel.addEventListener("change", function(){ lu.ability = sel.value; next.disabled = !luStepOk("ability"); });
      arow.appendChild(sel);
      body.appendChild(arow);
      body.appendChild(el("div", "hint", "A Con increase also raises hp for every level; Int raises this level's skill points."));
    }

    if (key === "skills") {
      var budget = luSkillBudget(), maxC = lvl + 3, maxX = maxC / 2;
      body.appendChild(el("p", "lu-lead", "Spend " + budget + " skill points. Class skills: 1 point per rank, max " + maxC + ". Cross-class: 1 point per ½ rank, max " + maxX + "."));
      var pts = el("div", "lu-pts");
      body.appendChild(pts);
      function paintPts(){
        var spent = luSpent();
        pts.textContent = (budget - spent) + " of " + budget + " points left";
        pts.classList.toggle("over", spent > budget);
        next.disabled = !luStepOk("skills");
      }
      function skillRow(s){
        var row = el("div", "lu-skill");
        var name = el("div", "lu-skill-name", s.name);
        var sub = el("span", "lu-skill-sub");
        name.appendChild(sub);
        row.appendChild(name);
        var step = el("div", "pa-stepper");
        var minus = el("button"), val = el("span"), plus = el("button");
        minus.type = plus.type = "button"; minus.innerHTML = ICONS.minus; plus.innerHTML = ICONS.plus;
        minus.setAttribute("aria-label", "One rank less in " + s.name); plus.setAttribute("aria-label", "One rank more in " + s.name);
        var inc = s.cls ? 1 : 0.5, cap = s.cls ? maxC : maxX;
        function paint(){
          var add = num(lu.skills[s.name]), now = num(s.ranks) + add;
          val.textContent = (add ? "+" : "") + add;
          sub.textContent = "Ranks " + num(s.ranks) + (add ? " → " + now : "") + " · max " + cap;
          row.classList.toggle("added", add > 0);
          minus.disabled = add <= 0;
          plus.disabled = now + inc > cap || luSpent() + 1 > budget;
        }
        minus.addEventListener("click", function(){ lu.skills[s.name] = Math.max(0, num(lu.skills[s.name]) - inc); repaint(); });
        plus.addEventListener("click", function(){ lu.skills[s.name] = num(lu.skills[s.name]) + inc; repaint(); });
        step.appendChild(minus); step.appendChild(val); step.appendChild(plus);
        row.appendChild(step);
        row._paint = paint;
        return row;
      }
      var rows = [];
      function repaint(){ rows.forEach(function(r){ r._paint(); }); paintPts(); }
      var clsList = el("div"), xList = el("div");
      state.skills.forEach(function(s){
        var r = skillRow(s); rows.push(r);
        (s.cls ? clsList : xList).appendChild(r);
      });
      body.appendChild(el("div", "bd-title", "Class skills"));
      body.appendChild(clsList);
      var xHasRanks = Object.keys(lu.skills).some(function(n){ return num(lu.skills[n]) && state.skills.some(function(s){ return s.name === n && !s.cls; }); });
      xList.hidden = !xHasRanks;
      var more = el("button", "more-link", xHasRanks ? "Hide cross-class skills" : "Show cross-class skills"); more.type = "button";
      more.addEventListener("click", function(){ xList.hidden = !xList.hidden; more.textContent = xList.hidden ? "Show cross-class skills" : "Hide cross-class skills"; });
      body.appendChild(more);
      body.appendChild(xList);
      repaint();
    }

    if (key === "feat") {
      var plan = luPlan(lvl);
      body.appendChild(el("p", "lu-lead", "Level " + lvl + " gives a feat." + (plan && plan.name ? " Your plan says " + plan.name + "." : "")));
      var choices = [];
      if (plan && plan.name) choices.push({ name:plan.name, why:"" });
      ((plan && !plan.name && plan.options) || []).forEach(function(o){ choices.push(o); });
      var group = "luFeat";
      function choice(value, title, sumText, extra){
        var lab = el("label", "lu-choice");
        var radio = el("input"); radio.type = "radio"; radio.name = group; radio.value = value;
        radio.checked = lu.feat === value;
        radio.addEventListener("change", function(){ lu.feat = value; next.disabled = !luStepOk("feat"); if (extra && value === "__other") extra.focus(); });
        lab.appendChild(radio);
        var txt = el("div");
        txt.appendChild(el("div", "plan-opt-name", title));
        if (sumText) txt.appendChild(el("div", "plan-sum", sumText));
        if (extra) txt.appendChild(extra);
        lab.appendChild(txt);
        body.appendChild(lab);
      }
      choices.forEach(function(o){
        var hit = CF.findFeat(o.name);
        var sumText = o.why || (hit ? hit.rules.summary + (hit.rules.prereq ? " Prerequisite: " + hit.rules.prereq + "." : "") : "");
        choice(o.name, o.name, sumText);
      });
      var other = el("input"); other.type = "text"; other.placeholder = "Feat name"; other.value = lu.other;
      other.setAttribute("aria-label", "Another feat");
      other.addEventListener("input", function(){ lu.other = other.value; if (other.value.trim()) { lu.feat = "__other"; body.querySelector('input[value="__other"]').checked = true; } next.disabled = !luStepOk("feat"); });
      choice("__other", choices.length ? "Something else" : "Feat", "Any feat from your allowed books whose prerequisites you meet.", other);
    }

    if (key === "summary") {
      var p = luPreview(), b = p.before, a = p.after;
      body.appendChild(el("p", "lu-lead", "Check the changes, then confirm."));
      var list = el("ul", "lu-sum-list");
      function line(label, value){ var li = el("li"); li.appendChild(el("span", "", label)); li.appendChild(el("b", "", value)); list.appendChild(li); }
      line("Level", b.level + " → " + a.level);
      line("Hit points", b.hp + " → " + a.hp + " max (" + signed(a.hp - b.hp) + ")");
      if (a.bab !== b.bab) line("Base attack", signed(b.bab) + " → " + signed(a.bab));
      ["Fort", "Ref", "Will"].forEach(function(n, i){ if (a.saves[i] !== b.saves[i]) line(n + " base", signed(b.saves[i]) + " → " + signed(a.saves[i])); });
      ABILS.forEach(function(k){ if (a.abilities[k] !== b.abilities[k]) line(ABIL_LABEL[k], b.abilities[k] + " → " + a.abilities[k]); });
      var sp = [];
      Object.keys(a.spells).forEach(function(sl){ if (a.spells[sl] !== (b.spells[sl] || 0)) sp.push("L" + sl + " " + (b.spells[sl] || 0) + "→" + a.spells[sl]); });
      if (sp.length) line("Spells per day", sp.join(" · "));
      if (a.turns !== b.turns) line("Turn attempts", b.turns + " → " + a.turns);
      var sk = Object.keys(lu.skills).filter(function(n){ return num(lu.skills[n]); }).map(function(n){ return n + " +" + lu.skills[n]; });
      line("Skills", sk.length ? sk.join(", ") : "none");
      var left = luSkillBudget() - luSpent();
      if (CF.isFeatLevel(lvl)) line("Feat", luFeatName());
      body.appendChild(list);
      if (left > 0) body.appendChild(el("p", "lu-warn", left + " skill point" + (left === 1 ? "" : "s") + " not spent."));
    }

    document.getElementById("luBack").disabled = lu.step === 0;
    next.textContent = key === "summary" ? "Confirm level " + lvl : "Next";
    if (key !== "hp" && key !== "skills") next.disabled = !luStepOk(key);
  }
  function bindLevelUp(){
    paintToggle(document.getElementById("luCancel"), false, "Cancel", ICONS.remove);
    document.getElementById("luCancel").addEventListener("click", closeLevelUp);
    document.getElementById("luBack").addEventListener("click", function(){ if (lu && lu.step > 0) { lu.step--; renderLevelUp(); } });
    document.getElementById("luNext").addEventListener("click", function(){
      if (!lu) return;
      var steps = luSteps(), key = steps[lu.step][0];
      if (!luStepOk(key)) return;
      if (key === "summary") {
        applyLevelUp();
        closeLevelUp();
        afterLevelChange();
        return;
      }
      lu.step++;
      renderLevelUp();
      document.getElementById("levelUpCard").scrollIntoView({ behavior:"smooth", block:"start" });
    });
  }

  // Feat plan: one row per feat level. A planned feat counts as taken once the feats list has it
  // (as many times as it is planned so far, e.g. Extra Turning twice); a due one gets a Take button.
  function featPlanStatus(){
    var lvl = num(state.level), seen = {};
    return (state.featPlan || []).slice().sort(function(a, b){ return num(a.level) - num(b.level); }).map(function(p){
      var key = String(p.name || "").trim().toLowerCase();
      if (!key) return { plan:p, status:"open" };
      seen[key] = (seen[key] || 0) + 1;
      var have = (state.feats || []).filter(function(f){ return String(f.name || "").trim().toLowerCase() === key; }).length;
      var status = have >= seen[key] ? "taken" : (num(p.level) <= lvl ? "due" : "planned");
      return { plan:p, status:status };
    });
  }
  function renderFeatPlan(){
    var box = document.getElementById("buildFeats");
    if (!box) return;
    box.innerHTML = "";
    featPlanStatus().forEach(function(row){
      var p = row.plan, hit = CF.findFeat(p.name);
      var item = el("div", "plan-row " + row.status);
      item.appendChild(el("span", "plan-lvl", "L" + num(p.level)));
      var body = el("div", "plan-body");
      body.appendChild(el("div", "plan-name", p.name || "Feat to choose"));
      if (hit) body.appendChild(el("div", "plan-sum", hit.rules.summary));
      else if (row.status === "open") {
        body.appendChild(el("div", "plan-sum", "You get a feat at this level: still to choose" + ((p.options || []).length ? ". Options:" : ".")));
        (p.options || []).forEach(function(o){
          var opt = el("div", "plan-opt");
          var txt = el("div", "plan-opt-txt");
          txt.appendChild(el("div", "plan-opt-name", o.name));
          txt.appendChild(el("div", "plan-sum", o.why || ((CF.findFeat(o.name) || {}).rules || {}).summary || ""));
          opt.appendChild(txt);
          var pick = el("button", "plan-take"); pick.type = "button";
          pick.innerHTML = ICONS.done + "<span>Choose</span>";
          pick.setAttribute("aria-label", "Choose " + o.name + " for level " + num(p.level));
          pick.addEventListener("click", function(){ p.name = o.name; renderFeatPlan(); updateBuildReadouts(); scheduleSave(); });
          opt.appendChild(pick);
          body.appendChild(opt);
        });
        // Any other feat from the allowed books
        var other = el("div", "plan-opt plan-other");
        var txt2 = el("div", "plan-opt-txt");
        var input = el("input", "plan-other-input");
        input.type = "text"; input.placeholder = "Feat name";
        input.setAttribute("aria-label", "Another feat for level " + num(p.level));
        txt2.appendChild(el("div", "plan-opt-name", "Something else"));
        txt2.appendChild(input);
        txt2.appendChild(el("div", "plan-sum", "Any feat from your allowed books whose prerequisites you meet."));
        other.appendChild(txt2);
        var pickOther = el("button", "plan-take"); pickOther.type = "button";
        pickOther.innerHTML = ICONS.done + "<span>Choose</span>";
        pickOther.setAttribute("aria-label", "Choose the typed feat for level " + num(p.level));
        function chooseOther(){
          var name = input.value.trim();
          if (!name) { input.focus(); return; }
          p.name = name; renderFeatPlan(); updateBuildReadouts(); scheduleSave();
        }
        pickOther.addEventListener("click", chooseOther);
        input.addEventListener("keydown", function(e){ if (e.key === "Enter") chooseOther(); });
        other.appendChild(pickOther);
        body.appendChild(other);
      }
      item.appendChild(body);
      if ((p.options || []).length && p.name && row.status !== "taken") {
        var change = el("button", "more-link plan-change", "Change choice"); change.type = "button";
        change.addEventListener("click", function(){ p.name = ""; renderFeatPlan(); updateBuildReadouts(); scheduleSave(); });
        body.appendChild(change);
      }
      if (row.status === "taken") {
        var ok = el("span", "plan-state"); ok.innerHTML = ICONS.done; ok.setAttribute("aria-label", "Taken");
        item.appendChild(ok);
      } else if (row.status === "due") {
        var take = el("button", "plan-take"); take.type = "button";
        take.innerHTML = ICONS.plus + "<span>Take</span>";
        take.addEventListener("click", function(){
          state.feats.push({ name:p.name, notes:"" });
          renderFeats(); rebuild(); renderFeatPlan();
        });
        item.appendChild(take);
      }
      box.appendChild(item);
    });
    if (!box.firstChild) box.appendChild(el("div", "hint", "No feats planned."));
  }
  // Hit die for the n-th character level (0-based): classes in list order.
  function hitDieFor(n){
    var list = buildClasses(), seen = 0;
    for (var i = 0; i < list.length; i++) { seen += num(list[i].level); if (n < seen) return CF.CLASSES[list[i].name].hitDie; }
    return 8;
  }

  function planName(level){
    var p = (state.featPlan || []).filter(function(x){ return num(x.level) === level; })[0];
    return p ? " (" + (p.name || "feat to choose") + ")" : "";
  }
  function updateBuildReadouts(){
    var card = document.getElementById("buildCard");
    if (!card || card.hidden) return;
    var lvl = num(state.level);
    card.querySelectorAll("[data-inc]").forEach(function(o){ o.textContent = signed(increaseCount(o.getAttribute("data-inc"), lvl)); });
    card.querySelectorAll("[data-total]").forEach(function(o){
      var k = o.getAttribute("data-total");
      o.textContent = state.abilities[k] + " (" + signed(abilityMod(k)) + ")";
    });
    var con = abilityMod("con"), sum = 0, missing = [];
    for (var i = 0; i < lvl; i++) { sum += num(state.hpRolls[i]); if (state.hpRolls[i] === "" || state.hpRolls[i] === undefined) missing.push(i + 1); }
    var tough = featCount("Toughness");
    var txt = "Rolls " + sum + " + Con " + signed(con) + " × " + lvl + (tough ? " + Toughness " + 3 * tough : "") + " = " + state.hp.max + " max hp";
    if (missing.length) txt += " · enter the roll for level " + missing.join(", ");
    var sumEl = document.getElementById("buildHpSum");
    if (sumEl) { sumEl.textContent = txt; sumEl.classList.toggle("warn", missing.length > 0); }
    // What the next levels bring
    var nextFeat = lvl + 1; while (!CF.isFeatLevel(nextFeat)) nextFeat++;
    var nextAbility = lvl + 1; while (!CF.isAbilityLevel(nextAbility)) nextAbility++;
    var owed = 0;
    for (var L = 1; L <= lvl; L++) if (CF.isFeatLevel(L)) owed++;
    var have = (state.feats || []).filter(function(f){ return String(f.name || "").trim(); }).length;
    var next = document.getElementById("buildNext");
    next.textContent = "Level " + lvl + " · BAB " + signed(state.bab) + " · base saves " + [state.saves.fort.base, state.saves.ref.base, state.saves.will.base].map(signed).join(" / ") +
      " · feats " + have + " of " + owed + " · next feat at level " + nextFeat + planName(nextFeat) + " · next ability +1 at level " + nextAbility + ".";
  }

  // ---------------- Long text (domains, story) ----------------
  // In view mode a long text shows as plain wrapped text, cut to a few lines with
  // Show more; the card's Edit swaps in the textarea, grown to fit the whole text.
  function growTextarea(ta){ ta.style.height = "auto"; ta.style.height = (ta.scrollHeight + 2) + "px"; }
  function setupLongText(ta, emptyText){
    if (ta._renderView) return;
    var view = document.createElement("div");
    view.className = "text-view";
    var more = document.createElement("button");
    more.type = "button"; more.className = "more-link text-view-more"; more.hidden = true;
    ta.parentNode.insertBefore(view, ta);
    ta.parentNode.insertBefore(more, ta);
    ta.hidden = true;
    var lines = Number(ta.getAttribute("data-clamp")) || 6, open = false;
    function measure(){
      if (open || !view.offsetHeight) return;
      more.hidden = view.scrollHeight <= view.clientHeight + 1;
    }
    function render(){
      var text = String(ta.value || "").trim();
      view.textContent = text || emptyText || "Nothing written yet — tap Edit.";
      view.classList.toggle("empty", !text);
      view.classList.toggle("clamped", !open);
      view.style.webkitLineClamp = open ? "" : String(lines);
      more.textContent = open ? "Show less" : "Show more";
      more.hidden = !open;
      measure();
    }
    more.addEventListener("click", function(){ open = !open; render(); });
    ta.addEventListener("input", function(){ growTextarea(ta); });
    // Panels start hidden, so check for overflow again once the text is on screen.
    if (window.ResizeObserver) new ResizeObserver(measure).observe(view);
    window.addEventListener("resize", measure);
    ta._renderView = render;
    ta._setEditing = function(editing){
      ta.hidden = !editing; view.hidden = editing;
      if (editing) { more.hidden = true; growTextarea(ta); } else render();
    };
    render();
  }
  function bindLongTexts(){
    document.querySelectorAll("textarea.text-block").forEach(function(ta){ setupLongText(ta); });
    document.querySelectorAll(".text-edit-btn").forEach(function(btn){
      var card = btn.closest(".card");
      paintToggle(btn, false);
      btn.addEventListener("click", function(){
        var editing = btn.getAttribute("aria-pressed") !== "true";
        btn.setAttribute("aria-pressed", String(editing));
        paintToggle(btn, editing);
        card.querySelectorAll("textarea.text-block").forEach(function(ta){ ta._setEditing(editing); });
      });
    });
  }

  function bindSectionToggles(){
    bindSectionToggle("feats", renderFeatsView);
    bindSectionToggle("attacks", renderAttacksView);
    bindSectionToggle("racial", renderRacialView);
  }

  function renderRacial(){ renderList("racialList", state.racialTraits, RACIAL_FIELDS); renderRacialView(); }
  function renderRacialView(){
    var view = document.getElementById("racialView");
    view.innerHTML = "";
    state.racialTraits.forEach(function(t){
      if (!String(t.text || "").trim()) return;
      var li = document.createElement("li");
      li.textContent = t.text;
      view.appendChild(li);
    });
    if (!view.firstChild) view.innerHTML = '<li class="hint">No traits yet — tap Edit to add one.</li>';
  }
  function renderEquipment(){ renderList("equipmentList", state.equipment, EQUIPMENT_FIELDS); }
  function renderMountGear(){ renderList("mountList", state.mountGear, EQUIPMENT_FIELDS); }

  function computeLedgerTotal(){
    var total = state.ledger.reduce(function(sum, entry){ return sum + num(entry.amount); }, 0);
    document.getElementById("ledgerTotal").textContent = total + " gp";
  }
  function renderLedger(){ renderList("ledgerList", state.ledger, LEDGER_FIELDS, computeLedgerTotal); computeLedgerTotal(); }

  // ---------------- Spell levels (nested) ----------------
  function renderSpellLevels(){
    var container = document.getElementById("spellLevelsList");
    container.innerHTML = "";
    state.spellLevels.forEach(function(lvl, idx){
      var block = document.createElement("div");
      block.className = "spell-level-block";

      var head = document.createElement("div");
      head.className = "slvl-head";

      function bdField(labelText, key, isLevel){
        var wrap = document.createElement("div");
        wrap.className = "bd-field";
        var lbl = document.createElement("label"); lbl.textContent = labelText;
        var input = document.createElement("input");
        input.type = "number";
        input.value = lvl[key];
        input.addEventListener("input", function(){
          lvl[key] = input.value === "" ? "" : Number(input.value);
          scheduleSave();
        });
        wrap.appendChild(lbl); wrap.appendChild(input);
        return wrap;
      }

      function readout(labelText, value){
        var wrap = document.createElement("div");
        wrap.className = "bd-field";
        var lbl = document.createElement("label"); lbl.textContent = labelText;
        var out = document.createElement("div"); out.className = "auto-readout"; out.textContent = value;
        wrap.appendChild(lbl); wrap.appendChild(out);
        return wrap;
      }
      if (lvl.auto) {
        head.appendChild(readout("Lvl", lvl.level));
        head.appendChild(readout("DC", lvl.dc));
        head.appendChild(readout("Per day", lvl.total));
      } else {
        head.appendChild(bdField("Lvl", "level"));
        head.appendChild(bdField("DC", "dc"));
        head.appendChild(bdField("Total", "total"));
      }
      head.appendChild(bdField("Left", "remaining"));

      var delLevel = document.createElement("button");
      delLevel.className = "row-del small"; delLevel.setAttribute("aria-label","Remove level"); delLevel.innerHTML = ICONS.remove;
      delLevel.addEventListener("click", function(){
        state.spellLevels.splice(idx, 1);
        renderSpellLevels(); scheduleSave();
      });
      if (!lvl.auto) head.appendChild(delLevel);
      block.appendChild(head);
      if (lvl.auto && lvl.breakdown) {
        var bd = document.createElement("div");
        bd.className = "slvl-bd"; bd.textContent = "Per day: " + lvl.breakdown;
        block.appendChild(bd);
        var slot = /domain/.test(lvl.breakdown) ? domainSlotText(num(lvl.level)) : "";
        if (slot) block.appendChild(el("div", "slvl-bd slvl-domain", "Domain slot: " + slot));
      }

      var spellsWrap = document.createElement("div");
      spellsWrap.className = "slvl-spells";
      var spellsListId = "slvl-spells-" + idx;
      spellsWrap.id = spellsListId;
      block.appendChild(spellsWrap);

      var addSpellBtn = document.createElement("button");
      addSpellBtn.className = "add-row-btn small";
      addSpellBtn.innerHTML = ICONS.plus + "<span>Add spell</span>";
      addSpellBtn.addEventListener("click", function(){
        addAndReveal(spellsListId, lvl.spells, { name:"", cast:false }, LEVEL_SPELL_FIELDS);
      });
      block.appendChild(addSpellBtn);

      container.appendChild(block);
      renderList(spellsListId, lvl.spells, LEVEL_SPELL_FIELDS);
    });
  }

  function renderAll(){
    safe(renderSkills, "renderSkills");
    safe(renderHeader, "renderHeader");
    safe(renderAbilities, "renderAbilities");
    safe(renderCoreStats, "renderCoreStats");
    safe(renderConceptBlocks, "renderConceptBlocks");
    safe(renderAttacks, "renderAttacks");
    safe(renderFeats, "renderFeats");
    safe(renderRacial, "renderRacial");
    safe(renderSpellLevels, "renderSpellLevels");
    safe(renderDomains, "renderDomains");
    safe(renderEquipment, "renderEquipment");
    safe(renderMountGear, "renderMountGear");
    safe(renderLedger, "renderLedger");
  }

  function renderHeaderView(){
    document.getElementById("v-name").textContent = state.name;
    var parts = [state.race, classLabel(), state.alignment];
    var sub = document.getElementById("v-sub");
    sub.textContent = "";
    parts.filter(function(p){ return String(p).trim() !== ""; }).forEach(function(p, i){
      if (i > 0) {
        var sep = document.createElement("span");
        sep.className = "sub-sep"; sep.textContent = "·";
        sub.appendChild(sep);
      }
      var span = document.createElement("span");
      span.className = "sub-part"; span.textContent = p;
      sub.appendChild(span);
    });
  }

  function bindHeaderEditToggle(){
    var btn = document.getElementById("headerEditBtn");
    paintToggle(btn, false, "Edit & level up", ICONS.levelUp);
    var view = document.getElementById("headerView");
    var edit = document.getElementById("headerEdit");
    btn.addEventListener("click", function(){
      var editing = edit.hidden;
      edit.hidden = !editing;
      view.hidden = editing;
      btn.setAttribute("aria-pressed", String(editing));
      paintToggle(btn, editing, "Edit & level up", ICONS.levelUp);
      var build = document.getElementById("buildCard");
      build.hidden = !editing;
      if (editing) {
        var overviewTab = document.querySelector('.tab-btn[data-tab="overview"]');
        if (overviewTab && !overviewTab.classList.contains("active")) overviewTab.click();
        renderBuild();
        document.getElementById("f-name").focus({ preventScroll:true });
      } else renderHeaderView();
    });
  }

  function syncStoryCaption(){
    document.getElementById("storyName").textContent = state.name;
    document.getElementById("storySubtitle").textContent = state.race + " · " + classLabel();
  }

  function bindHeaderFields(){
    document.getElementById("f-name").addEventListener("input", function(e){ state.name = e.target.value; syncStoryCaption(); scheduleSave(); });
    document.getElementById("f-race").addEventListener("input", function(e){ state.race = e.target.value; syncStoryCaption(); scheduleSave(); });
    document.getElementById("f-alignment").addEventListener("input", function(e){ state.alignment = e.target.value; scheduleSave(); });
  }

  function bindAddButtons(){
    document.querySelectorAll(".add-row-btn").forEach(function(b){ if (!b.querySelector("svg")) b.insertAdjacentHTML("afterbegin", ICONS.plus); });
    document.getElementById("addAttack").addEventListener("click", function(){ addAndReveal("attacksList", state.attacks, { name:"", dice:"", enh:0, bonus:"", damage:"", notes:"" }, ATTACK_FIELDS, onAttacksChange); });
    document.getElementById("addFeat").addEventListener("click", function(){ addAndReveal("featsList", state.feats, { name:"", notes:"" }, FEAT_FIELDS, onFeatsChange); });
    document.getElementById("addRacial").addEventListener("click", function(){ addAndReveal("racialList", state.racialTraits, { text:"" }, RACIAL_FIELDS); });
    document.getElementById("addEquipment").addEventListener("click", function(){ addAndReveal("equipmentList", state.equipment, { name:"" }, EQUIPMENT_FIELDS); });
    document.getElementById("addMount").addEventListener("click", function(){ addAndReveal("mountList", state.mountGear, { name:"" }, EQUIPMENT_FIELDS); });
    document.getElementById("addLedger").addEventListener("click", function(){ addAndReveal("ledgerList", state.ledger, { desc:"", amount:0 }, LEDGER_FIELDS, computeLedgerTotal); });
    document.getElementById("addSpellLevel").addEventListener("click", function(){
      var nextLevel = state.spellLevels.length ? Math.max.apply(null, state.spellLevels.map(function(l){ return num(l.level); })) + 1 : 0;
      var wis = abilityMod("wis");
      state.spellLevels.push({ level: nextLevel, dc: 10 + nextLevel + wis, total: 0, remaining: 0, spells: [] });
      renderSpellLevels(); scheduleSave();
      requestAnimationFrame(function(){
        var container = document.getElementById("spellLevelsList");
        var lastBlock = container.lastElementChild;
        if (lastBlock) lastBlock.scrollIntoView({ behavior:"smooth", block:"center" });
      });
    });
  }

  function bindReset(){
    document.getElementById("resetBtn").addEventListener("click", function(){
      var confirmed = window.confirm("Restore the character sheet to Caelian's original stats? This erases any changes you've made.");
      if (!confirmed) return;
      state = clone(DEFAULT_DATA);
      computeBuild(false);
      renderAll();
      renderBuild();
      saveState();
    });
  }

  function bindTabs(){
    var buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(function(btn){
      btn.addEventListener("click", function(){
        var tab = btn.getAttribute("data-tab");
        buttons.forEach(function(b){ b.classList.remove("active"); });
        btn.classList.add("active");
        document.querySelectorAll(".panel").forEach(function(p){ p.classList.remove("active"); });
        document.getElementById("panel-" + tab).classList.add("active");
        window.scrollTo(0, 0);
      });
    });
  }

  // ---------------- Story images (stored separately from character data — large binary blobs) ----------------
  // Empty: tapping the spot opens the photo picker. With an image: tapping opens it in the
  // lightbox, where it can be changed or removed.
  var lightboxTarget = null;
  function setupImagePicker(opts){
    var fileInput = document.getElementById(opts.fileInputId);
    var imgEl = document.getElementById(opts.imgId);
    var placeholderEl = document.getElementById(opts.placeholderId);
    var triggerEl = document.getElementById(opts.triggerId);
    var picker = { title: opts.title, hasImage: false, img: imgEl };

    function showImage(dataUrl){
      imgEl.src = dataUrl;
      imgEl.style.display = "block";
      placeholderEl.style.display = "none";
      picker.hasImage = true;
    }
    function showPlaceholder(){
      imgEl.removeAttribute("src");
      imgEl.style.display = "none";
      placeholderEl.style.display = "flex";
      picker.hasImage = false;
    }
    picker.pick = function(){ fileInput.value = ""; fileInput.click(); };
    picker.remove = function(){
      showPlaceholder();
      Promise.resolve()
        .then(function(){ return storage.set(opts.storageKey, ""); })
        .catch(function(err){ console.error("Image remove failed:", err); });
    };

    function open(){ if (picker.hasImage) openLightbox(picker); else picker.pick(); }
    triggerEl.addEventListener("click", open);
    triggerEl.addEventListener("keydown", function(e){ if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });

    fileInput.addEventListener("change", function(){
      var file = fileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e){
        var img = new Image();
        img.onload = function(){
          var canvas = document.createElement("canvas");
          var scale = Math.min(1, opts.maxDim / Math.max(img.width, img.height));
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          var dataUrl = canvas.toDataURL("image/jpeg", opts.quality);
          showImage(dataUrl);
          if (lightboxTarget === picker) document.getElementById("lightboxImg").src = dataUrl;
          Promise.resolve()
            .then(function(){ return storage.set(opts.storageKey, dataUrl); })
            .catch(function(err){ console.error("Image save failed:", err); });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });

    Promise.resolve()
      .then(function(){ return storage.get(opts.storageKey); })
      .then(function(res){ if (res && res.value) showImage(res.value); else showPlaceholder(); })
      .catch(function(){ showPlaceholder(); });
  }

  function openLightbox(picker){
    lightboxTarget = picker;
    var box = document.getElementById("lightbox");
    document.getElementById("lightboxTitle").textContent = picker.title;
    document.getElementById("lightboxImg").src = picker.img.src;
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    document.getElementById("lightboxClose").focus();
  }
  function closeLightbox(){
    var box = document.getElementById("lightbox");
    if (box.hidden) return;
    box.hidden = true;
    document.body.classList.remove("lightbox-open");
    lightboxTarget = null;
  }
  function bindLightbox(){
    var box = document.getElementById("lightbox");
    document.getElementById("lightboxClose").innerHTML = ICONS.remove;
    document.getElementById("lightboxChange").innerHTML = ICONS.edit + "<span>Change</span>";
    document.getElementById("lightboxRemove").innerHTML = ICONS.trash + "<span>Remove</span>";
    document.getElementById("lightboxClose").addEventListener("click", closeLightbox);
    box.addEventListener("click", function(e){ if (e.target === box) closeLightbox(); });
    document.addEventListener("keydown", function(e){ if (e.key === "Escape") closeLightbox(); });
    document.getElementById("lightboxChange").addEventListener("click", function(){ if (lightboxTarget) lightboxTarget.pick(); });
    document.getElementById("lightboxRemove").addEventListener("click", function(){
      if (!lightboxTarget) return;
      if (!window.confirm("Remove this image?")) return;
      lightboxTarget.remove();
      closeLightbox();
    });
  }

  function initImagePickers(){
    bindLightbox();
    setupImagePicker({
      title:"Background", fileInputId:"bgFileInput", imgId:"bgImage", placeholderId:"bgPlaceholder",
      triggerId:"bgTrigger", storageKey:BG_IMAGE_KEY, maxDim:1600, quality:0.82
    });
    setupImagePicker({
      title:"Portrait", fileInputId:"portraitFileInput", imgId:"portraitImage", placeholderId:"portraitPlaceholder",
      triggerId:"portraitTrigger", storageKey:PORTRAIT_IMAGE_KEY, maxDim:900, quality:0.85
    });
  }

  loadState().then(function(){
    renderAll();
    safe(bindHeaderFields, "bindHeaderFields");
    safe(bindHeaderEditToggle, "bindHeaderEditToggle");
    safe(bindSectionToggles, "bindSectionToggles");
    safe(bindPowerAttack, "bindPowerAttack");
    safe(bindAddButtons, "bindAddButtons");
    safe(bindReset, "bindReset");
    safe(bindTabs, "bindTabs");
    safe(bindLongTexts, "bindLongTexts");
    safe(renderBuild, "renderBuild");
    safe(bindBalance, "bindBalance");
    safe(bindTurning, "bindTurning");
    safe(bindLevelUp, "bindLevelUp");
    safe(bindSkills, "bindSkills");
    safe(recomputeDerived, "recomputeDerived");
    safe(initImagePickers, "initImagePickers");
    if (migrated) scheduleSave();
  });

})();
