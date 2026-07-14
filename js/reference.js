'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'reference', label: 'Reference', desc: 'Morse & audio, phonetic, knots, radio frequencies',
  icon: '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><path d="M9 7h7M9 11h5"/></svg>',
  render(view) {
    let tab = 'morse';
    view.innerHTML = `<div class="view-wrap">
      <div class="tabs">
        <button class="tab" data-t="morse">Morse</button><button class="tab" data-t="phon">Phonetic</button>
        <button class="tab" data-t="knots">Knots</button><button class="tab" data-t="radio">Radio</button>
        <button class="tab" data-t="radiation">Radiation</button></div>
      <div id="rf-body"></div></div>`;
    const body = view.querySelector('#rf-body');
    view.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.t; view.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b)); draw(); });

    function toMorse(t) { return t.toUpperCase().split('').map(c => MORSE[c] != null ? MORSE[c] : '').join(' ').replace(/\s+/g, ' ').trim(); }

    async function playMorse(morse, unit = 70) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = new AC(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = 620; gain.gain.value = 0; osc.connect(gain); gain.connect(ctx.destination); osc.start();
      let t = ctx.currentTime + 0.05; const U = unit / 1000;
      const on = (dur) => { gain.gain.setValueAtTime(0.28, t); t += dur; gain.gain.setValueAtTime(0, t); t += U; };
      for (const ch of morse) {
        if (ch === '.') on(U); else if (ch === '-') on(3 * U); else if (ch === ' ') t += 2 * U; else if (ch === '/') t += 4 * U;
      }
      osc.stop(t + 0.05); setTimeout(() => ctx.close(), (t - ctx.currentTime + 0.2) * 1000);
    }

    function drawMorse() {
      body.innerHTML = `<div class="card" style="margin-bottom:14px">
        <div class="eyebrow">Text → Morse</div>
        <input id="m-in" placeholder="Type a message… e.g. SOS  HELP" value="SOS">
        <div id="m-out" class="mono" style="font-size:18px;letter-spacing:2px;color:var(--amber-2);margin:14px 2px;word-break:break-word;min-height:26px"></div>
        <div class="row"><button class="btn primary sm" id="m-play"><svg viewBox="0 0 24 24"><path d="M6 4l14 8-14 8z"/></svg>Play tone</button>
          <button class="btn sm" id="m-sos">SOS</button>
          <span class="dim" style="font-size:12px">·=dot &nbsp;–=dash &nbsp;/=word gap</span></div></div>
      <div class="card"><div class="eyebrow">Chart</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:6px 12px">
        ${Object.entries(MORSE).filter(([k]) => k !== ' ').map(([k, v]) => `<div class="mono" style="font-size:13px"><b style="color:var(--t1)">${k === ' ' ? '␣' : EMBER.esc(k)}</b> <span style="color:var(--amber-2)">${v}</span></div>`).join('')}</div></div>`;
      const inp = body.querySelector('#m-in'), out = body.querySelector('#m-out');
      const upd = () => out.textContent = toMorse(inp.value) || '—';
      inp.oninput = upd; upd();
      body.querySelector('#m-play').onclick = () => playMorse(toMorse(inp.value));
      body.querySelector('#m-sos').onclick = () => { inp.value = 'SOS'; upd(); playMorse(toMorse('SOS')); };
    }

    function drawPhon() {
      const map = Object.fromEntries(PHONETIC);
      body.innerHTML = `<div class="card" style="margin-bottom:14px"><div class="eyebrow">Spell it out (NATO)</div>
        <input id="p-in" placeholder="Type letters/numbers to spell… e.g. K7QZ">
        <div id="p-out" style="margin-top:12px;font-size:15px;color:var(--t1);line-height:1.8"></div></div>
      <div class="card"><div class="eyebrow">Alphabet</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:6px 14px">
        ${PHONETIC.map(([k, w]) => `<div style="font-size:13.5px"><b class="mono" style="color:var(--amber-2)">${k}</b> &nbsp;${w}</div>`).join('')}</div></div>`;
      const inp = body.querySelector('#p-in'), out = body.querySelector('#p-out');
      inp.oninput = () => out.textContent = inp.value.toUpperCase().split('').map(c => map[c] || (c === ' ' ? '·' : c)).join('  ') || '—';
    }

    function drawKnots() {
      body.innerHTML = KNOTS.map(k => `<div class="card knot-card" style="margin-bottom:12px">
        <div class="knot-svg">${k.svg || ''}</div>
        <div style="flex:1;min-width:0">
          <b style="font-size:15px">${EMBER.esc(k.name)}</b>
          <p class="muted" style="font-size:13px;margin:4px 0 8px">${EMBER.esc(k.use)}</p>
          <ol style="margin-left:18px;font-size:13.5px;line-height:1.7">${k.steps.map(s => `<li>${EMBER.esc(s)}</li>`).join('')}</ol>
        </div></div>`).join('');
    }

    function drawRadiation() {
      const rows = (arr) => arr.map(r => `<div class="kv"><span>${EMBER.esc(r[0])}</span><b><span class="pill ${r[2]}" style="font-weight:600">${EMBER.esc(r[1])}</span></b></div>`).join('');
      const fmtRate = (v) => v >= 1000 ? (v / 1000).toFixed(2) + ' mSv/h' : v >= 1 ? v.toFixed(1) + ' µSv/h' : v.toFixed(2) + ' µSv/h';
      const fmtHrs = (h) => !isFinite(h) || h < 0 ? '—' : h < 1 ? Math.round(h * 60) + ' min' : h < 48 ? h.toFixed(1) + ' h' : (h / 24).toFixed(1) + ' days';
      body.innerHTML = `
        <div class="callout danger" style="margin-bottom:14px">General civil-defence reference, not official instructions or a real dosimeter reading. If any emergency broadcast still exists, follow it. ${EMBER.esc(RADIATION.mantra)}</div>
        <div class="card" style="margin-bottom:12px"><div class="eyebrow">Fallout shelter-time calculator</div>
          <div class="grid g3">
            <div><label>Meter reading now</label><input id="rd-rate" type="number" value="50" step="any">
              <select id="rd-unit" style="margin-top:6px"><option value="1">µSv/h</option><option value="1000">mSv/h</option></select></div>
            <div><label>Hours since the blast</label><input id="rd-t" type="number" value="1" step="0.5" min="0.1"></div>
            <div><label>"Safe enough" rate (µSv/h)</label><input id="rd-target" type="number" value="10" step="any"></div>
          </div>
          <div id="rd-head" style="margin-top:12px"></div>
          <div class="grid g4" id="rd-proj" style="margin-top:10px"></div>
          <div class="dim" style="font-size:11.5px;margin-top:8px">Model: Way–Wigner decay, dose rate ∝ time⁻¹·² (single burst; ignores weather/wash-out). A planning guide, not a guarantee — trust a real meter and official guidance if they exist.</div>
        </div>
        <div class="card" style="margin-bottom:12px"><div class="eyebrow">Acute whole-body dose → effect</div>
          <div class="dim" style="font-size:12px;margin-bottom:8px">For scale, normal background is only ~2–3 mSv (0.002–0.003 Sv) per YEAR.</div>
          ${rows(RADIATION.doses)}</div>
        <div class="card" style="margin-bottom:12px"><div class="eyebrow">Dose-rate meter (Geiger) — what a reading means</div>${rows(RADIATION.rateScale)}</div>
        <div class="card" style="margin-bottom:12px"><div class="eyebrow">Fallout decay</div><p style="font-size:13.5px;line-height:1.6">${EMBER.esc(RADIATION.decay)}</p></div>
        <div class="grid g3" style="margin-bottom:12px">${RADIATION.tds.map(t => `<div class="card"><div class="eyebrow">${EMBER.esc(t[0])}</div><div style="font-size:13px;line-height:1.55">${EMBER.esc(t[1])}</div></div>`).join('')}</div>
        <div class="grid g2">
          <div class="card"><div class="eyebrow">Sheltering</div><ul style="margin-left:16px;font-size:13.5px;line-height:1.6">${RADIATION.shelter.map(x => `<li>${EMBER.esc(x)}</li>`).join('')}</ul></div>
          <div class="card"><div class="eyebrow">Decontamination</div><ul style="margin-left:16px;font-size:13.5px;line-height:1.6">${RADIATION.decon.map(x => `<li>${EMBER.esc(x)}</li>`).join('')}</ul></div>
        </div>
        <div class="callout" style="margin-top:12px"><b>Potassium iodide (KI):</b> ${EMBER.esc(RADIATION.ki)}</div>`;

      const calc = () => {
        const rate = Math.max(0, EMBER.num(body.querySelector('#rd-rate').value, 0)) * EMBER.num(body.querySelector('#rd-unit').value, 1); // µSv/h
        const t = Math.max(0.1, EMBER.num(body.querySelector('#rd-t').value, 1));
        const target = Math.max(0.01, EMBER.num(body.querySelector('#rd-target').value, 10));
        const R1 = rate * Math.pow(t, 1.2);                 // normalised to 1 h after blast
        const at = (h) => R1 * Math.pow(h, -1.2);           // rate at h hours after blast
        const tTarget = Math.pow(R1 / target, 1 / 1.2);     // hours after blast to reach target
        const more = tTarget - t;                           // more hours from NOW
        const head = body.querySelector('#rd-head'), proj = body.querySelector('#rd-proj');
        const cls = more <= 0 ? 'go' : more <= 48 ? 'warn' : 'danger';
        head.innerHTML = more <= 0
          ? `<div class="callout"><b>Already at or below your ${fmtRate(target)} threshold.</b> Exposure is still cumulative — keep time outside short.</div>`
          : `<div class="callout ${cls === 'go' ? '' : cls === 'danger' ? 'danger' : ''}" style="${cls === 'warn' ? 'border-color:var(--warn);background:rgba(251,191,36,.09)' : ''}">
              Drops to <b>${fmtRate(target)}</b> at about <b>${fmtHrs(tTarget)}</b> after the blast — roughly <b>${fmtHrs(more)}</b> more of sheltering from now.</div>`;
        proj.innerHTML = [['Now', t], ['+6 h', t + 6], ['+24 h', t + 24], ['+48 h', t + 48]]
          .map(([lbl, h]) => `<div class="card"><div class="eyebrow">${lbl}</div><div class="stat-sm">${fmtRate(at(h))}</div></div>`).join('');
      };
      ['rd-rate', 'rd-unit', 'rd-t', 'rd-target'].forEach(id => body.querySelector('#' + id).addEventListener('input', calc));
      calc();
    }

    function drawRadio() {
      body.innerHTML = `<div class="callout info" style="margin-bottom:14px">Reference only. Most bands require a licence in normal times; monitor freely, and know your local rules. In a true life-or-death emergency, any means to call for help is justified.</div>` +
        FREQS.map(g => `<div class="card" style="margin-bottom:12px"><div class="eyebrow">${EMBER.esc(g.band)}</div>
          ${g.rows.map(r => `<div class="kv"><span><b>${EMBER.esc(r[0])}</b><br><span class="dim" style="font-size:12px">${EMBER.esc(r[2])}</span></span><b class="mono" style="color:var(--amber-2)">${EMBER.esc(r[1])}</b></div>`).join('')}</div>`).join('');
    }

    function draw() { ({ morse: drawMorse, phon: drawPhon, knots: drawKnots, radio: drawRadio, radiation: drawRadiation })[tab](); }
    if (!document.getElementById('rf-style')) {
      const st = document.createElement('style'); st.id = 'rf-style';
      st.textContent = `
      .knot-card{display:flex;gap:16px;align-items:flex-start}
      .knot-svg{width:120px;height:80px;flex:0 0 auto;background:var(--bg-2);border-radius:10px;border:1px solid var(--line);padding:6px}
      .knot-svg svg{width:100%;height:100%}
      .knot-svg .r{fill:none;stroke:var(--amber-2);stroke-width:6;stroke-linecap:round;stroke-linejoin:round}
      .knot-svg .r2{fill:none;stroke:#facc7a;stroke-width:6;stroke-linecap:round;stroke-linejoin:round;opacity:.9}
      .knot-svg .p{fill:none;stroke:var(--t3);stroke-width:5;stroke-linecap:round}
      @media(max-width:600px){.knot-card{flex-direction:column}.knot-svg{width:100%;height:110px}}`;
      document.head.appendChild(st);
    }
    view.querySelector('[data-t="morse"]').classList.add('on'); draw();
  }
});
