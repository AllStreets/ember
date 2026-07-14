'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'fieldguide', label: 'Field Guide', desc: 'Edible/toxic plants, mushrooms & a medication reference',
  icon: '<svg viewBox="0 0 24 24"><path d="M11 20A7 7 0 0 1 4 13V4h4a7 7 0 0 1 7 7"/><path d="M11 20a7 7 0 0 0 7-7V6h-3"/><path d="M11 20v-8"/></svg>',
  render(view) {
    let tab = 'plants', q = '';
    const badge = (st) => {
      const m = { edible: ['EDIBLE', 'go'], caution: ['CAUTION', 'warn'], toxic: ['TOXIC', 'danger'], deadly: ['DEADLY', 'danger'] }[st] || ['—', ''];
      return `<span class="pill ${m[1]}" style="${st === 'deadly' ? 'background:rgba(248,113,113,.18);color:#ff9a9a' : ''}">${m[0]}</span>`;
    };
    view.innerHTML = `<div class="view-wrap">
      <div class="tabs"><button class="tab" data-t="plants">Plants</button>
        <button class="tab" data-t="mushrooms">Mushrooms</button><button class="tab" data-t="meds">Medications</button></div>
      <div class="callout danger" style="margin-bottom:14px" id="fgd-warn"></div>
      <div class="kb-search"><input id="fgd-q" placeholder="Search…" autocomplete="off">
        <button class="btn sm ghost" id="fgd-print" title="Print or save this reference as a PDF for a paper backup">Print / PDF</button></div>
      <div class="print-head"><b>EMBER</b><small id="fgd-print-sub">Field guide — printed offline backup</small></div>
      <div id="fgd-list"></div></div>`;
    view.querySelector('#fgd-print').onclick = () => window.print();
    const listEl = view.querySelector('#fgd-list');
    const warnEl = view.querySelector('#fgd-warn');
    const qEl = view.querySelector('#fgd-q');
    qEl.oninput = () => { q = qEl.value.toLowerCase(); draw(); };
    view.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.t; q = ''; qEl.value = ''; view.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b)); draw(); });

    function organism(list) {
      warnEl.textContent = tab === 'mushrooms'
        ? 'No reliable field test exists for mushrooms — cooking does not destroy the deadliest toxins, and symptoms can be delayed for hours. Never eat one you cannot identify with 100% certainty.'
        : 'Schematic sketches + descriptions only — NOT photos. Misidentification can be fatal, especially with white-flowered umbels and shiny single berries. Confirm every wild food against a trusted regional guide before eating.';
      const items = list.filter(e => !q || (e.name + ' ' + e.id_ + ' ' + e.eat + ' ' + (e.region || '') + ' ' + e.status).toLowerCase().includes(q));
      if (!items.length) { listEl.innerHTML = `<div class="empty">Nothing matches "${EMBER.esc(q)}".</div>`; return; }
      listEl.innerHTML = items.map(e => `
        <div class="fgd-card ${e.status}">
          <div class="fgd-ic">${GS[e.type] || GS.leaf}</div>
          <div class="fgd-body">
            <div class="row" style="justify-content:space-between;align-items:flex-start">
              <b style="font-size:15.5px">${EMBER.esc(e.name)}</b>${badge(e.status)}</div>
            <div class="dim mono" style="font-size:11px;margin:2px 0 8px">${EMBER.esc(e.region || '')}</div>
            <div style="font-size:13.5px;line-height:1.55"><b class="fgd-lbl">Identify</b> ${EMBER.esc(e.id_)}</div>
            <div style="font-size:13.5px;line-height:1.55;margin-top:6px"><b class="fgd-lbl">${e.status === 'edible' || e.status === 'caution' ? 'Use' : 'Do not eat'}</b> ${EMBER.esc(e.eat)}</div>
            <div style="font-size:13px;line-height:1.5;margin-top:6px;color:var(--t2)"><b class="fgd-lbl warn">Look-alikes</b> ${EMBER.esc(e.lookalike)}</div>
          </div></div>`).join('');
    }

    function meds() {
      warnEl.textContent = 'General reference for common over-the-counter medicines. Doses are typical ADULT guidance — always check the actual product label, watch for allergies and interactions, and get professional care when it exists. Not medical advice.';
      const items = MEDS.filter(m => !q || (m.name + ' ' + m.use + ' ' + m.caution).toLowerCase().includes(q));
      listEl.innerHTML = items.map(m => `
        <div class="card" style="margin-bottom:10px">
          <b style="font-size:15px">${EMBER.esc(m.name)}</b>
          <div class="dim" style="font-size:13px;margin:2px 0 8px">${EMBER.esc(m.use)}</div>
          <div class="kv"><span class="fgd-lbl">Typical adult dose</span><b class="mono" style="text-align:right;max-width:60%">${EMBER.esc(m.dose)}</b></div>
          <div style="font-size:13px;line-height:1.55;margin-top:8px;color:#f7c3c3"><b class="fgd-lbl warn">Caution</b> ${EMBER.esc(m.caution)}</div>
        </div>`).join('') || `<div class="empty">Nothing matches "${EMBER.esc(q)}".</div>`;
    }

    function draw() {
      const sub = view.querySelector('#fgd-print-sub');
      if (sub) sub.textContent = 'Field guide · ' + (tab === 'plants' ? 'Plants' : tab === 'mushrooms' ? 'Mushrooms' : 'Medications') + ' — printed offline backup';
      tab === 'plants' ? organism(PLANTS) : tab === 'mushrooms' ? organism(MUSHROOMS) : meds();
    }

    if (!document.getElementById('fgd-style')) {
      const s = document.createElement('style'); s.id = 'fgd-style';
      s.textContent = `
      .fgd-card{display:flex;gap:14px;background:var(--panel);border:1px solid var(--line);border-left:3px solid var(--t3);border-radius:12px;padding:14px 16px;margin-bottom:10px}
      .fgd-card.edible{border-left-color:var(--go)} .fgd-card.caution{border-left-color:var(--warn)}
      .fgd-card.toxic{border-left-color:var(--danger)} .fgd-card.deadly{border-left-color:#dc2626;background:linear-gradient(90deg,rgba(220,38,38,.06),var(--panel))}
      .fgd-ic{width:56px;height:56px;flex:0 0 auto;border-radius:10px;background:var(--bg-2);display:flex;align-items:center;justify-content:center;color:var(--amber-2)}
      .fgd-ic svg{width:34px;height:34px;stroke-width:1.5}
      .fgd-card.edible .fgd-ic{color:var(--go)} .fgd-card.deadly .fgd-ic,.fgd-card.toxic .fgd-ic{color:var(--danger)}
      .fgd-body{flex:1;min-width:0}
      .fgd-lbl{font-family:var(--f-mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--amber);margin-right:6px}
      .fgd-lbl.warn{color:var(--warn)}`;
      document.head.appendChild(s);
    }
    view.querySelector('[data-t="plants"]').classList.add('on'); draw();
  }
});
