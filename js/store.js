'use strict';
// Tiny namespaced localStorage wrapper — all EMBER state lives on-device, so the
// console keeps working with the network dead. No cloud, no sync, no telemetry.
const Store = (() => {
  const P = 'ember.';
  const get = (k, d) => { try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
  const set = (k, v) => { try { localStorage.setItem(P + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const del = (k) => { try { localStorage.removeItem(P + k); } catch (e) {} };
  const keys = () => Object.keys(localStorage).filter(k => k.startsWith(P)).map(k => k.slice(P.length));
  const usage = () => {
    let bytes = 0;
    for (const k of Object.keys(localStorage)) if (k.startsWith(P)) bytes += (localStorage.getItem(k) || '').length + k.length;
    return bytes;
  };
  const fmtBytes = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(1) + ' KB' : (b / 1048576).toFixed(2) + ' MB';
  return { get, set, del, keys, usage, fmtBytes };
})();
