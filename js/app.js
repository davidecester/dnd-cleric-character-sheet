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
  function loadState(){
    return Promise.resolve()
      .then(function(){ return storage.get(STORAGE_KEY); })
      .then(function(res){
        if (res && res.value) {
          try { state = Object.assign(clone(DEFAULT_DATA), JSON.parse(res.value)); }
          catch(e){ state = clone(DEFAULT_DATA); }
        } else { state = clone(DEFAULT_DATA); }
        fillBlankAttacks();
      })
      .catch(function(){ state = clone(DEFAULT_DATA); });
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
      del.className = "row-del"; del.setAttribute("aria-label", "Remove"); del.textContent = "✕";
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
    var balBonus = (state.balance && state.balance.active) ? Math.max(0, wis) : 0;
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
    updateBalanceUI();
    renderFeatsView();
  }

  // ---------------- Balance domain power ----------------
  function updateBalanceUI(){
    var b = state.balance, lvl = num(state.level), bonus = Math.max(0, abilityMod("wis"));
    var block = document.getElementById("balanceBlock");
    if (!block) return;
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
  function skillTotal(s){
    var ranks = num(s.ranks);
    var acp = Math.min(0, num(state.skillAcp)) * num(s.acp);
    return Math.floor(ranks) + abilityMod(s.ability) + num(s.misc) + acp;
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
      row.classList.toggle("cls", !!s.cls);
    });
    var budget = Math.max(1, 2 + abilityMod("int")) * (lvl + 3);
    var pts = document.getElementById("skillPoints");
    pts.textContent = spent + "/" + budget;
    pts.style.color = spent > budget ? "var(--rose)" : "";
    document.getElementById("skillMax").textContent = maxC + " / " + maxX;
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
        var tags = [];
        if (s.acp === 2) tags.push("ACP×2"); else if (s.acp) tags.push("ACP");
        if (!s.untrained) tags.push("trained");
        if (tags.length) meta.appendChild(document.createTextNode(" · " + tags.join(" · ")));
      }
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
  function bindSkills(){
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
    document.getElementById("f-class").value = state.className;
    document.getElementById("f-level").value = state.level;
    document.getElementById("f-alignment").value = state.alignment;
    renderHeaderView();
    document.getElementById("levelNo").textContent = state.level;
    document.getElementById("storyName").textContent = state.name;
    document.getElementById("storySubtitle").textContent = state.race + " · " + state.className + " " + state.level;
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
      var mod = document.createElement("div");
      mod.className = "ability-mod"; mod.textContent = signed(Math.floor((state.abilities[key]-10)/2));
      input.addEventListener("input", function(){
        state.abilities[key] = input.value === "" ? 10 : Number(input.value);
        mod.textContent = signed(Math.floor((state.abilities[key]-10)/2));
        recomputeDerived(); scheduleSave();
      });
      cell.appendChild(lbl); cell.appendChild(input); cell.appendChild(mod);
      grid.appendChild(cell);
    });
  }

  function updateHpBar(){
    var cur = num(state.hp.current), max = num(state.hp.max) || 1;
    var pct = Math.max(0, Math.min(100, (cur / max) * 100));
    document.getElementById("hpBarFill").style.width = pct + "%";
  }

  function renderCoreStats(){
    bindField("hp-current", function(){ return state.hp.current; }, function(v){ state.hp.current = v; updateHpBar(); }, true);
    bindField("hp-max", function(){ return state.hp.max; }, function(v){ state.hp.max = v; updateHpBar(); }, true);
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

    bindField("bab", function(){ return state.bab; }, function(v){ state.bab = v; recomputeDerived(); }, true);

    // AC breakdown
    ["armor","shield","dex","size","natural","deflection","misc"].forEach(function(k){
      bindField("ac-" + k, function(){ return state.ac[k]; }, function(v){ state.ac[k] = v; recomputeDerived(); }, true);
    });
    // Save breakdowns
    ["fort","ref","will"].forEach(function(s){
      ["base","magic","misc","temp"].forEach(function(k){
        bindField("save-" + s + "-" + k, function(){ return state.saves[s][k]; }, function(v){ state.saves[s][k] = v; recomputeDerived(); }, true);
      });
    });
    bindField("grapple-size", function(){ return state.grapple.size; }, function(v){ state.grapple.size = v; recomputeDerived(); }, true);
    bindField("grapple-misc", function(){ return state.grapple.misc; }, function(v){ state.grapple.misc = v; recomputeDerived(); }, true);
    bindField("speed", function(){ return state.speed; }, function(v){ state.speed = v; }, true);
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
    bindField("domainBalance", function(){ return state.domains.balance; }, function(v){ state.domains.balance = v; });
    bindField("domainMagic", function(){ return state.domains.magic; }, function(v){ state.domains.magic = v; });
  }

  var ATTACK_FIELDS = [
    { field:"name", placeholder:"Weapon", className:"col-name" },
    { field:"bonus", placeholder:"Atk", className:"col-small" },
    { field:"damage", placeholder:"Dmg", className:"col-small" },
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

  function renderAttacks(){ renderList("attacksList", state.attacks, ATTACK_FIELDS, renderCombatFeats); renderCombatFeats(); }
  function renderFeats(){ renderList("featsList", state.feats, FEAT_FIELDS, renderCombatFeats); renderFeatsView(); }

  // Extra line computed from the current sheet, for feats whose numbers depend on it.
  function featLiveNote(name){
    if (name === "Power Attack") {
      var bab = Math.max(0, num(state.bab));
      return "Now: up to −" + bab + " attack → +" + bab + " dmg (+" + (bab * 2) + " two-handed).";
    }
    if (name === "Divine Metamagic" || name === "Divine Might" || name === "Divine Vigor") {
      return "Turn attempts/day: " + (3 + abilityMod("cha")) + " (3 + Cha " + signed(abilityMod("cha")) + ").";
    }
    return "";
  }

  function featEntry(title, hit, note){
    var el = document.createElement("div");
    el.className = "feat-entry";
    var head = document.createElement("div");
    head.className = "feat-name";
    head.textContent = title;
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
    var live = hit ? featLiveNote(hit.name) : "";
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
      view.innerHTML = '<div class="hint">No feats yet — tap ✎ Edit to add one.</div>';
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

  function bindFeatsEditToggle(){
    var btn = document.getElementById("featsEditBtn");
    var view = document.getElementById("featsView");
    var edit = document.getElementById("featsEdit");
    btn.addEventListener("click", function(){
      var editing = edit.hidden;
      edit.hidden = !editing;
      view.hidden = editing;
      btn.setAttribute("aria-pressed", String(editing));
      btn.textContent = editing ? "✓ Done" : "✎ Edit";
      if (!editing) renderFeatsView();
    });
  }
  function renderRacial(){ renderList("racialList", state.racialTraits, RACIAL_FIELDS); }
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

      head.appendChild(bdField("Lvl", "level"));
      head.appendChild(bdField("DC", "dc"));
      head.appendChild(bdField("Total", "total"));
      head.appendChild(bdField("Left", "remaining"));

      var delLevel = document.createElement("button");
      delLevel.className = "row-del small"; delLevel.setAttribute("aria-label","Remove level"); delLevel.textContent = "✕";
      delLevel.addEventListener("click", function(){
        state.spellLevels.splice(idx, 1);
        renderSpellLevels(); scheduleSave();
      });
      head.appendChild(delLevel);
      block.appendChild(head);

      var spellsWrap = document.createElement("div");
      spellsWrap.className = "slvl-spells";
      var spellsListId = "slvl-spells-" + idx;
      spellsWrap.id = spellsListId;
      block.appendChild(spellsWrap);

      var addSpellBtn = document.createElement("button");
      addSpellBtn.className = "add-row-btn small";
      addSpellBtn.textContent = "+ Add spell";
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
    safe(renderEquipment, "renderEquipment");
    safe(renderMountGear, "renderMountGear");
    safe(renderLedger, "renderLedger");
  }

  function renderHeaderView(){
    document.getElementById("v-name").textContent = state.name;
    var parts = [state.race, (state.className + " " + state.level).trim(), state.alignment];
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
    var view = document.getElementById("headerView");
    var edit = document.getElementById("headerEdit");
    btn.addEventListener("click", function(){
      var editing = edit.hidden;
      edit.hidden = !editing;
      view.hidden = editing;
      btn.setAttribute("aria-pressed", String(editing));
      btn.textContent = editing ? "✓ Done" : "✎ Edit";
      if (editing) document.getElementById("f-name").focus();
      else renderHeaderView();
    });
  }

  function syncStoryCaption(){
    document.getElementById("storyName").textContent = state.name;
    document.getElementById("storySubtitle").textContent = state.race + " · " + state.className + " " + state.level;
  }

  function bindHeaderFields(){
    document.getElementById("f-name").addEventListener("input", function(e){ state.name = e.target.value; syncStoryCaption(); scheduleSave(); });
    document.getElementById("f-race").addEventListener("input", function(e){ state.race = e.target.value; syncStoryCaption(); scheduleSave(); });
    document.getElementById("f-class").addEventListener("input", function(e){ state.className = e.target.value; syncStoryCaption(); scheduleSave(); });
    document.getElementById("f-level").addEventListener("input", function(e){
      state.level = e.target.value === "" ? "" : Number(e.target.value);
      document.getElementById("levelNo").textContent = state.level || "";
      syncStoryCaption();
      recomputeDerived();
      scheduleSave();
    });
    document.getElementById("f-alignment").addEventListener("input", function(e){ state.alignment = e.target.value; scheduleSave(); });
  }

  function bindAddButtons(){
    document.getElementById("addAttack").addEventListener("click", function(){ addAndReveal("attacksList", state.attacks, { name:"", bonus:"", damage:"", notes:"" }, ATTACK_FIELDS, renderCombatFeats); });
    document.getElementById("addFeat").addEventListener("click", function(){ addAndReveal("featsList", state.feats, { name:"", notes:"" }, FEAT_FIELDS, renderCombatFeats); });
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
      renderAll();
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
  function setupImagePicker(opts){
    var fileInput = document.getElementById(opts.fileInputId);
    var imgEl = document.getElementById(opts.imgId);
    var placeholderEl = document.getElementById(opts.placeholderId);
    var triggerEl = document.getElementById(opts.triggerId);
    var editBtn = opts.editBtnId ? document.getElementById(opts.editBtnId) : null;

    function showImage(dataUrl){
      imgEl.src = dataUrl;
      imgEl.style.display = "block";
      placeholderEl.style.display = "none";
    }
    function showPlaceholder(){
      imgEl.style.display = "none";
      placeholderEl.style.display = "flex";
    }

    function openPicker(e){ if (e) e.stopPropagation(); fileInput.click(); }
    triggerEl.addEventListener("click", openPicker);
    if (editBtn) editBtn.addEventListener("click", openPicker);

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

  function initImagePickers(){
    setupImagePicker({
      fileInputId:"bgFileInput", imgId:"bgImage", placeholderId:"bgPlaceholder",
      triggerId:"bgTrigger", editBtnId:"bgEditBtn",
      storageKey:BG_IMAGE_KEY, maxDim:1600, quality:0.82
    });
    setupImagePicker({
      fileInputId:"portraitFileInput", imgId:"portraitImage", placeholderId:"portraitPlaceholder",
      triggerId:"portraitTrigger", editBtnId:"portraitEditBtn",
      storageKey:PORTRAIT_IMAGE_KEY, maxDim:900, quality:0.85
    });
  }

  loadState().then(function(){
    renderAll();
    safe(bindHeaderFields, "bindHeaderFields");
    safe(bindHeaderEditToggle, "bindHeaderEditToggle");
    safe(bindFeatsEditToggle, "bindFeatsEditToggle");
    safe(bindPowerAttack, "bindPowerAttack");
    safe(bindAddButtons, "bindAddButtons");
    safe(bindReset, "bindReset");
    safe(bindTabs, "bindTabs");
    safe(bindBalance, "bindBalance");
    safe(bindSkills, "bindSkills");
    safe(recomputeDerived, "recomputeDerived");
    safe(initImagePickers, "initImagePickers");
  });

})();
