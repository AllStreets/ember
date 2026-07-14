'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'power', label: 'Power', desc: 'Solar & battery budget — keep the laptop alive',
  icon: '<svg viewBox="0 0 24 24"><path d="M12 2v8M12 2L8 8h8z"/><rect x="6" y="10" width="12" height="12" rx="2"/><path d="M12 14v4"/></svg>',
  render(view) {
    const st = Store.get('power.cfg', { load: 30, hours: 5, batt: 300, panel: 100, sun: 4, eff: 0.8 });
    view.innerHTML = `<div class="view-wrap">
      <div class="grid g2">
        <div class="card"><div class="eyebrow">Consumption</div>
          <label>Device draw (watts)</label><input id="p-load" type="number" value="${st.load}" step="5">
          <div class="dim" style="font-size:12px;margin:4px 0 10px">Laptop idle ~10–20 W · working ~30–60 W · screen bright + charging more</div>
          <label>Hours used per day</label><input id="p-hours" type="number" value="${st.hours}" step="0.5"></div>
        <div class="card"><div class="eyebrow">Supply</div>
          <label>Battery / power station (Wh)</label><input id="p-batt" type="number" value="${st.batt}" step="50">
          <label style="margin-top:10px">Solar panel (watts)</label><input id="p-panel" type="number" value="${st.panel}" step="25">
          <div class="grid g2" style="margin-top:10px">
            <div><label>Good sun hrs/day</label><input id="p-sun" type="number" value="${st.sun}" step="0.5"></div>
            <div><label>System efficiency</label><input id="p-eff" type="number" value="${st.eff}" step="0.05" min="0.3" max="1"></div></div></div>
      </div>
      <div class="grid g4" id="p-out" style="margin-top:14px"></div>
      <div class="card" style="margin-top:16px"><div class="eyebrow">Stretch the charge</div>
        <ul style="margin-left:18px;line-height:1.8;font-size:14px">
          <li>Dim the screen hard, drop refresh rate, kill background apps — the display is the biggest laptop draw.</li>
          <li>Batch your work: charge to ~90% during peak sun, then run the laptop OFF battery until it's low.</li>
          <li>Keep the power station cool and out of direct heat; cold and heat both cut battery capacity.</li>
          <li>Angle the panel square to the sun and re-aim it a few times a day; even light haze cuts output sharply.</li>
          <li>Run the LLM only when you need it — inference spikes CPU/GPU draw. Read cached guides the rest of the time.</li>
          <li>One full charge cycle of a 300 Wh station ≈ 10+ hours of light laptop use. Ration it like water.</li>
        </ul></div></div>`;
    const out = view.querySelector('#p-out');
    const ids = ['p-load', 'p-hours', 'p-batt', 'p-panel', 'p-sun', 'p-eff'];
    function calc() {
      const load = EMBER.num(view.querySelector('#p-load').value, 30);
      const hours = EMBER.num(view.querySelector('#p-hours').value, 5);
      const batt = EMBER.num(view.querySelector('#p-batt').value, 300);
      const panel = EMBER.num(view.querySelector('#p-panel').value, 100);
      const sun = EMBER.num(view.querySelector('#p-sun').value, 4);
      const eff = Math.min(1, Math.max(0.3, EMBER.num(view.querySelector('#p-eff').value, 0.8)));
      Store.set('power.cfg', { load, hours, batt, panel, sun, eff });
      const useWh = load * hours;               // daily consumption
      const genWh = panel * sun * eff;          // daily solar harvest
      const net = genWh - useWh;
      const battHrs = batt / load;              // runtime on full battery, no sun
      const sustainable = net >= 0;
      const netCls = net >= 0 ? 'go' : 'danger';
      out.innerHTML = `
        <div class="card"><div class="eyebrow">Uses / day</div><div class="stat">${Math.round(useWh)}</div><div class="dim">Wh consumed</div></div>
        <div class="card"><div class="eyebrow">Solar / day</div><div class="stat">${Math.round(genWh)}</div><div class="dim">Wh harvested</div></div>
        <div class="card"><div class="eyebrow">Daily net</div><div class="stat" style="color:${net >= 0 ? 'var(--go)' : 'var(--danger)'}">${net >= 0 ? '+' : ''}${Math.round(net)}</div><div class="dim">Wh ${net >= 0 ? 'surplus' : 'deficit'}</div></div>
        <div class="card"><div class="eyebrow">Battery alone</div><div class="stat-sm">${battHrs.toFixed(1)} h</div><div class="dim">runtime with no sun</div></div>
        <div class="card" style="grid-column:1/-1"><div class="row" style="justify-content:space-between">
          <div><span class="pill ${netCls}">${sustainable ? 'SUSTAINABLE indefinitely' : 'DRAWING DOWN the battery'}</span>
          ${!sustainable ? `<span class="dim" style="margin-left:10px">battery empties in ~${(batt / -net).toFixed(1)} days at this rate</span>`
          : `<span class="dim" style="margin-left:10px">surplus tops the battery back up — cushion for cloudy days</span>`}</div></div></div>`;
    }
    ids.forEach(id => view.querySelector('#' + id).addEventListener('input', calc));
    calc();
  }
});
