/* =========================================================
   Storage adapter
   Uses window.storage inside Claude artifacts, localStorage elsewhere
   (e.g. GitHub Pages). Saved data stays on that browser/device.
   ========================================================= */
window.CaseFile = window.CaseFile || {};
(function(){
  "use strict";
  // Works both inside a Claude artifact (window.storage, synced to your
  // Claude account) and as a plain hosted page, e.g. GitHub Pages
  // (falls back to localStorage, saved on that browser/device only).
  // Checked per-call, not cached at load, so it's safe regardless of
  // when the host environment attaches window.storage.
  var storage = {
    get: function(key){
      if (window.storage && typeof window.storage.get === "function") {
        return window.storage.get(key, false);
      }
      return new Promise(function(resolve){
        var raw;
        try { raw = localStorage.getItem(key); } catch(e){ raw = null; }
        resolve(raw !== null ? { key:key, value:raw } : null);
      });
    },
    set: function(key, value){
      if (window.storage && typeof window.storage.set === "function") {
        return window.storage.set(key, value, false);
      }
      return new Promise(function(resolve, reject){
        try { localStorage.setItem(key, value); resolve({ key:key, value:value }); }
        catch(e){ reject(e); }
      });
    }
  };

  window.CaseFile.storage = storage;
  window.CaseFile.STORAGE_KEY = "caelian-vael-character-v2";
  window.CaseFile.BG_IMAGE_KEY = "caelian-vael-bg-image";
  window.CaseFile.PORTRAIT_IMAGE_KEY = "caelian-vael-portrait-image";
})();
