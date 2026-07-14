'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'home', label: 'Home', desc: 'Overview & status',
  icon: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 21v-6h6v6"/></svg>',
  render(view) {
    const s = window.EMBER.llmStatus || { online: false, model: '' };
    const tiles = window.EMBER.modules.filter(m => m.id !== 'home').map(m => `
      <button class="tile" data-go="${m.id}">
        <div class="ti-ic">${m.icon}</div>
        <b>${m.label}</b><p>${EMBER.esc(m.desc || '')}</p>
      </button>`).join('');

    view.innerHTML = `<div class="view-wrap">
      <div class="grid g3" style="margin-bottom:22px">
        <div class="card"><div class="eyebrow">Local LLM</div>
          <div class="stat-sm" style="color:${s.online ? 'var(--go)' : 'var(--danger)'}">${s.online ? 'ONLINE' : 'OFFLINE'}</div>
          <div class="dim mono" style="font-size:12px;margin-top:4px">${s.online ? EMBER.esc(s.model || 'ready') : 'start Ollama to enable'}</div></div>
        <div class="card"><div class="eyebrow">On-device data</div>
          <div class="stat-sm">${Store.fmtBytes(Store.usage())}</div>
          <div class="dim mono" style="font-size:12px;margin-top:4px">${KB.length} guides · ${window.EMBER.modules.length} modules</div></div>
        <div class="card"><div class="eyebrow">Status</div>
          <div class="stat-sm" style="color:var(--go)">SELF-CONTAINED</div>
          <div class="dim mono" style="font-size:12px;margin-top:4px">runs with the grid down</div></div>
      </div>

      <div class="callout" style="margin-bottom:22px">
        <b>EMBER runs entirely on this laptop.</b> No internet, no cloud — every guide, tool, and the AI advisor
        work offline on solar power. Keep the console open; nothing here reaches out to a network except the
        <em>local</em> LLM at localhost.
      </div>

      <div class="section-title">Modules</div>
      <div class="tiles">${tiles}</div>

      <div class="section-title">Fast reference — the Rule of 3s</div>
      <div class="grid g4">
        ${[['3 MIN', 'without air / with severe bleeding'], ['3 HRS', 'without shelter in harsh conditions'], ['3 DAYS', 'without water'], ['3 WKS', 'without food']]
        .map(([a, b]) => `<div class="card"><div class="stat">${a}</div><div class="dim" style="font-size:12.5px;margin-top:2px">${b}</div></div>`).join('')}
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn" data-go="survival">Open survival guides</button>
        <button class="btn" data-go="advisor">Ask the advisor</button>
      </div>
    </div>`;

    view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => EMBER.go(b.dataset.go));
  }
});
