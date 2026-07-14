'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'log', label: 'Log', desc: 'Journal, supply inventory & ration planner',
  icon: '<svg viewBox="0 0 24 24"><path d="M4 4a2 2 0 0 1 2-2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  render(view) {
    let tab = 'journal';
    view.innerHTML = `<div class="view-wrap">
      <div class="tabs"><button class="tab" data-t="journal">Journal</button>
        <button class="tab" data-t="supplies">Supplies</button><button class="tab" data-t="ration">Rationing</button>
        <button class="tab" data-t="weather">Weather</button></div>
      <div id="lg-body"></div></div>`;
    const body = view.querySelector('#lg-body');
    view.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.t; view.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b)); draw(); });

    function drawJournal() {
      const notes = Store.get('log.notes', []);
      body.innerHTML = `<div class="card" style="margin-bottom:14px">
        <textarea id="j-in" placeholder="Log an entry — what happened, decisions, weather, supplies used, plans…" rows="3"></textarea>
        <div class="row" style="margin-top:10px"><button class="btn primary sm" id="j-add">Add entry</button>
          <span class="dim" style="font-size:12px">${notes.length} entries · saved on this device</span></div></div>
      <div id="j-list">${notes.length ? notes.map((n, i) => `
        <div class="card" style="margin-bottom:10px"><div class="row" style="justify-content:space-between">
          <span class="mono dim" style="font-size:11px">${EMBER.esc(n.t)}</span>
          <button class="btn sm ghost danger" data-del="${i}" style="padding:2px 8px">×</button></div>
          <div style="white-space:pre-wrap;margin-top:6px;font-size:14px">${EMBER.esc(n.body)}</div></div>`).join('')
          : '<div class="empty">No entries yet. Keeping a log holds morale and helps you think clearly.</div>'}</div>`;
      body.querySelector('#j-add').onclick = () => {
        const v = body.querySelector('#j-in').value.trim(); if (!v) return;
        notes.unshift({ t: new Date().toLocaleString([], { hour12: false }), body: v });
        Store.set('log.notes', notes); window.EMBER.updStore(); drawJournal();
      };
      body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { notes.splice(+b.dataset.del, 1); Store.set('log.notes', notes); window.EMBER.updStore(); drawJournal(); });
    }

    function drawSupplies() {
      const items = Store.get('log.supplies', []);
      const CATS = ['Water', 'Food', 'Medical', 'Fuel', 'Tools', 'Power', 'Other'];
      body.innerHTML = `<div class="card" style="margin-bottom:14px"><div class="eyebrow">Add supply</div>
        <div class="grid g4">
          <div style="grid-column:span 2"><label>Item</label><input id="s-name" placeholder="e.g. Bottled water"></div>
          <div><label>Qty</label><input id="s-qty" type="number" value="1" step="any"></div>
          <div><label>Category</label><select id="s-cat">${CATS.map(c => `<option>${c}</option>`).join('')}</select></div></div>
        <button class="btn primary sm" id="s-add" style="margin-top:12px">Add</button></div>
      ${CATS.filter(c => items.some(i => i.cat === c)).map(c => `
        <div class="section-title">${c}</div>
        ${items.map((it, idx) => ({ it, idx })).filter(o => o.it.cat === c).map(({ it, idx }) => `
          <div class="kv"><span><b>${EMBER.esc(it.name)}</b></span>
            <span class="row">
              <button class="btn sm ghost" data-dec="${idx}">−</button>
              <b class="mono" style="min-width:44px;text-align:center">${it.qty}</b>
              <button class="btn sm ghost" data-inc="${idx}">+</button>
              <button class="btn sm ghost danger" data-del="${idx}">remove</button></span></div>`).join('')}`).join('')
        || '<div class="empty">No supplies logged. Track what you have so you can ration it (see Rationing tab).</div>'}`;
      const save = () => { Store.set('log.supplies', items); window.EMBER.updStore(); drawSupplies(); };
      body.querySelector('#s-add').onclick = () => {
        const name = body.querySelector('#s-name').value.trim(); if (!name) return;
        items.push({ name, qty: EMBER.num(body.querySelector('#s-qty').value, 1), cat: body.querySelector('#s-cat').value }); save();
      };
      body.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => { items[+b.dataset.inc].qty = +(items[+b.dataset.inc].qty + 1).toFixed(2); save(); });
      body.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => { items[+b.dataset.dec].qty = +Math.max(0, items[+b.dataset.dec].qty - 1).toFixed(2); save(); });
      body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { items.splice(+b.dataset.del, 1); save(); });
    }

    function drawRation() {
      const st = Store.get('log.ration', { people: 2, water: 20, foodCal: 12000, wPer: 3, cPer: 2000 });
      body.innerHTML = `<div class="grid g2">
        <div class="card"><div class="eyebrow">On hand</div>
          <label>People</label><input id="r-people" type="number" value="${st.people}" min="1">
          <label style="margin-top:10px">Drinking water (litres)</label><input id="r-water" type="number" value="${st.water}" step="any">
          <label style="margin-top:10px">Food (total calories)</label><input id="r-food" type="number" value="${st.foodCal}" step="any"></div>
        <div class="card"><div class="eyebrow">Daily need per person</div>
          <label>Water (L/day)</label><input id="r-wper" type="number" value="${st.wPer}" step="0.5">
          <label style="margin-top:10px">Calories (/day)</label><input id="r-cper" type="number" value="${st.cPer}" step="100">
          <div class="dim" style="font-size:12px;margin-top:10px">Temperate rest: ~2–3 L & ~2,000 kcal. Heat, cold, or hard work raise both a lot.</div></div></div>
      <div class="grid g2" id="r-out" style="margin-top:14px"></div>`;
      const ids = ['people', 'water', 'food', 'wper', 'cper'];
      const calc = () => {
        const people = EMBER.num(body.querySelector('#r-people').value, 1) || 1;
        const water = EMBER.num(body.querySelector('#r-water').value, 0);
        const food = EMBER.num(body.querySelector('#r-food').value, 0);
        const wPer = EMBER.num(body.querySelector('#r-wper').value, 3) || 3;
        const cPer = EMBER.num(body.querySelector('#r-cper').value, 2000) || 2000;
        Store.set('log.ration', { people, water, foodCal: food, wPer, cPer });
        const wDays = water / (people * wPer), cDays = food / (people * cPer);
        const min = Math.min(wDays, cDays); const lim = wDays <= cDays ? 'water' : 'food';
        const cls = min >= 7 ? 'go' : min >= 3 ? 'warn' : 'danger';
        body.querySelector('#r-out').innerHTML = `
          <div class="card"><div class="eyebrow">Water lasts</div><div class="stat">${isFinite(wDays) ? wDays.toFixed(1) : '∞'}</div><div class="dim">days for ${people} at ${wPer} L/day</div></div>
          <div class="card"><div class="eyebrow">Food lasts</div><div class="stat">${isFinite(cDays) ? cDays.toFixed(1) : '∞'}</div><div class="dim">days for ${people} at ${cPer} kcal/day</div></div>
          <div class="card" style="grid-column:1/-1"><div class="eyebrow">Bottom line</div>
            <div class="row" style="justify-content:space-between"><div><span class="stat-sm">${isFinite(min) ? min.toFixed(1) + ' days' : 'sufficient'}</span>
            <span class="pill ${cls}" style="margin-left:10px">${lim} is the limit</span></div></div>
            <div class="dim" style="font-size:12.5px;margin-top:8px">Stretch it: prioritise water, reduce exertion, keep cool/warm to lower needs, and secure a resupply before you hit zero.</div></div>`;
      };
      ['r-people', 'r-water', 'r-food', 'r-wper', 'r-cper'].forEach(id => body.querySelector('#' + id).addEventListener('input', calc));
      calc();
    }

    function drawWeather() {
      const log = Store.get('log.baro', []);
      body.innerHTML = `
        <div class="card" style="margin-bottom:14px"><div class="eyebrow">Log a barometer reading</div>
          <div class="grid g3">
            <div><label>Pressure</label><input id="bw-p" type="number" step="any" placeholder="1013"></div>
            <div><label>Unit</label><select id="bw-u"><option value="hpa">hPa / mb</option><option value="inhg">inHg</option></select></div>
            <div><label>Note (optional)</label><input id="bw-n" placeholder="sky, wind…"></div></div>
          <button class="btn primary sm" id="bw-add" style="margin-top:12px">Add reading</button>
          <div class="dim" style="font-size:12px;margin-top:8px">A phone/watch barometer, a real aneroid gauge, or even boiling-point altitude tricks work. Log every few hours — the <b>trend</b> matters more than the number.</div></div>
        <div id="bw-trend"></div>
        <div class="section-title">History (${log.length})</div>
        <div id="bw-list"></div>`;
      const toHpa = (v, u) => u === 'inhg' ? v * 33.8639 : v;
      const add = () => {
        const p = EMBER.num(body.querySelector('#bw-p').value, NaN);
        if (!isFinite(p)) return;
        const hpa = toHpa(p, body.querySelector('#bw-u').value);
        log.unshift({ ts: Date.now(), t: new Date().toLocaleString([], { hour12: false }), hpa: +hpa.toFixed(1), note: body.querySelector('#bw-n').value.trim() });
        Store.set('log.baro', log.slice(0, 60)); window.EMBER.updStore(); drawWeather();
      };
      body.querySelector('#bw-add').onclick = add;
      const listEl = body.querySelector('#bw-list');
      listEl.innerHTML = log.length ? log.map((r, i) => `<div class="kv"><span><b class="mono">${r.hpa} hPa</b> <span class="dim" style="font-size:12px">${EMBER.esc(r.t)}${r.note ? ' · ' + EMBER.esc(r.note) : ''}</span></span>
        <button class="btn sm ghost danger" data-del="${i}" style="padding:2px 8px">×</button></div>`).join('') : '<div class="dim">No readings yet.</div>';
      listEl.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { log.splice(+b.dataset.del, 1); Store.set('log.baro', log); window.EMBER.updStore(); drawWeather(); });
      // trend from the two most recent
      const tEl = body.querySelector('#bw-trend');
      if (log.length >= 2) {
        const a = log[0], b = log[1];
        const dh = Math.max(0.25, (a.ts - b.ts) / 3.6e6);       // hours between
        const rate3 = (a.hpa - b.hpa) / dh * 3;                 // hPa per 3h
        let msg, cls;
        if (rate3 <= -3) { msg = 'Pressure FALLING fast — storm and strong wind likely within hours. Secure gear, get to shelter, avoid exposed high ground and water.'; cls = 'danger'; }
        else if (rate3 <= -1) { msg = 'Pressure falling — unsettled, rain or wind likely later today.'; cls = 'warn'; }
        else if (rate3 < 1) { msg = 'Pressure steady — little change expected in the next several hours.'; cls = ''; }
        else if (rate3 < 3) { msg = 'Pressure RISING — clearing and improving weather.'; cls = 'go'; }
        else { msg = 'Pressure rising fast — rapid clearing, often with gusty cold wind behind a front.'; cls = 'go'; }
        const absNote = a.hpa >= 1022 ? ' Current reading is high — generally fair.' : a.hpa <= 1000 ? ' Current reading is low — generally unsettled/stormy.' : '';
        tEl.innerHTML = `<div class="grid g2" style="margin-bottom:6px">
            <div class="card"><div class="eyebrow">Trend</div><div class="stat-sm" style="color:${rate3 <= -1 ? 'var(--danger)' : rate3 >= 1 ? 'var(--go)' : 'var(--t1)'}">${rate3 > 0 ? '+' : ''}${rate3.toFixed(1)} hPa/3h</div><div class="dim">${a.hpa} → now, from ${b.hpa}</div></div>
            <div class="card"><div class="eyebrow">Current</div><div class="stat-sm">${a.hpa} hPa</div><div class="dim">${(a.hpa / 33.8639).toFixed(2)} inHg</div></div></div>
          <div class="callout ${cls === 'danger' ? 'danger' : ''}" style="${cls === 'warn' ? 'border-color:var(--warn);background:rgba(251,191,36,.09)' : cls === 'go' ? 'border-color:var(--go);background:rgba(74,222,128,.08)' : ''}">${msg}${absNote}</div>`;
      } else tEl.innerHTML = `<div class="callout">Add a second reading a few hours apart to see the trend and forecast.</div>`;
    }

    function draw() { ({ journal: drawJournal, supplies: drawSupplies, ration: drawRation, weather: drawWeather })[tab](); }
    view.querySelector('[data-t="journal"]').classList.add('on'); draw();
  }
});
