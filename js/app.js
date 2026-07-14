'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// EMBER shell — registry, sidebar, routing, live status. Loads last.
// Modules register into window.EMBER_MODULES = [{id,label,icon,render}] (order
// = load order in index.html).
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  const MODULES = window.EMBER_MODULES || [];
  const byId = Object.fromEntries(MODULES.map(m => [m.id, m]));
  const nav = document.getElementById('nav');
  const view = document.getElementById('view');
  const titleEl = document.getElementById('view-title');

  // shared helpers exposed to modules
  window.EMBER = {
    modules: MODULES,
    go: (id) => { location.hash = '#' + id; },
    esc: (s) => { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; },
    el: (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; },
    num: (v, d = 0) => { const n = parseFloat(v); return isFinite(n) ? n : d; },
  };

  // sidebar
  nav.innerHTML = MODULES.map(m =>
    `<button class="nav-item" data-id="${m.id}"><span class="ni-ic">${m.icon}</span><span class="ni-lbl">${m.label}</span></button>`
  ).join('');
  nav.querySelectorAll('.nav-item').forEach(b => b.onclick = () => { EMBER.go(b.dataset.id); closeSidebar(); });

  function route() {
    let id = (location.hash || '').replace('#', '') || MODULES[0].id;
    if (!byId[id]) id = MODULES[0].id;
    nav.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
    const m = byId[id];
    titleEl.textContent = m.label;
    view.scrollTop = 0;
    view.innerHTML = '';
    try { m.render(view); } catch (e) { view.innerHTML = `<div class="callout danger">Module error: ${EMBER.esc(e.message)}</div>`; }
  }
  window.addEventListener('hashchange', route);

  // mobile sidebar
  const sidebar = document.getElementById('sidebar');
  const closeSidebar = () => sidebar.classList.remove('open');
  document.getElementById('menu-btn').onclick = () => sidebar.classList.toggle('open');

  // clock
  const clock = document.getElementById('clock');
  const tick = () => { const d = new Date(); clock.textContent = d.toLocaleTimeString([], { hour12: false }) + '  ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' }); };
  tick(); setInterval(tick, 1000);

  // storage chip
  const storeTxt = document.getElementById('store-chip-txt');
  const updStore = () => { storeTxt.textContent = Store.fmtBytes(Store.usage()) + ' local'; };
  updStore(); setInterval(updStore, 5000);
  window.EMBER.updStore = updStore;

  // LLM chip — poll local Ollama
  const chip = document.getElementById('llm-chip'), chipTxt = document.getElementById('llm-chip-txt');
  let _lastLLM = null;
  async function pollLLM() {
    const s = await LLM.status();
    chip.classList.toggle('ok', s.online);
    chip.classList.toggle('bad', !s.online);
    chipTxt.textContent = s.online ? ('LLM ' + (s.model ? s.model.split(':')[0].slice(0, 12) : 'ready')) : 'LLM offline';
    window.EMBER.llmStatus = s;
    // keep the Home status card fresh when connectivity flips (without churn)
    const cur = (location.hash || '').replace('#', '') || MODULES[0].id;
    if (cur === 'home' && _lastLLM !== s.online) route();
    _lastLLM = s.online;
  }
  pollLLM(); setInterval(pollLLM, 8000);
  window.EMBER.pollLLM = pollLLM;

  // offline PWA cache (only when served over http/https on localhost — not file://)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // boot
  document.getElementById('boot').remove();
  document.getElementById('app').hidden = false;
  route();
})();
