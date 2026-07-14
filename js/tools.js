'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'tools', label: 'Tools', desc: 'Calculator, unit converter & key constants',
  icon: '<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h3M8 18h3M14 14h2v4h-2z"/></svg>',
  render(view) {
    let tab = 'calc';
    view.innerHTML = `<div class="view-wrap">
      <div class="tabs"><button class="tab" data-t="calc">Calculator</button>
        <button class="tab" data-t="conv">Converter</button><button class="tab" data-t="ref">Constants</button></div>
      <div id="tl-body"></div></div>`;
    const body = view.querySelector('#tl-body');
    view.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.t; view.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === b)); draw(); });

    // ── safe recursive-descent math parser (no eval) ──
    function evaluate(src, degMode) {
      let i = 0; const s = src.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi');
      const peek = () => s[i];
      const FN = { sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ln: Math.log, log: x => Math.log10(x), exp: Math.exp,
        sin: trig(Math.sin), cos: trig(Math.cos), tan: trig(Math.tan),
        asin: itrig(Math.asin), acos: itrig(Math.acos), atan: itrig(Math.atan), round: Math.round, floor: Math.floor, ceil: Math.ceil };
      function trig(f) { return x => f(degMode ? x * Math.PI / 180 : x); }
      function itrig(f) { return x => { const r = f(x); return degMode ? r * 180 / Math.PI : r; }; }
      function num() {
        if (peek() === '(') { i++; const v = expr(); if (peek() === ')') i++; return v; }
        // identifier (function or constant)
        let m = /^[a-z]+/.exec(s.slice(i));
        if (m) {
          const id = m[0]; i += id.length;
          if (id === 'pi') return Math.PI; if (id === 'e') return Math.E;
          if (FN[id]) { if (peek() === '(') { i++; const arg = expr(); if (peek() === ')') i++; return FN[id](arg); } return FN[id](num()); }
          throw new Error('unknown: ' + id);
        }
        m = /^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?/.exec(s.slice(i));
        if (!m) throw new Error('syntax');
        i += m[0].length; return parseFloat(m[0]);
      }
      function unary() { if (peek() === '-') { i++; return -unary(); } if (peek() === '+') { i++; return unary(); } return num(); }
      function pow() { let a = unary(); while (peek() === '^') { i++; a = Math.pow(a, unary()); } return a; }
      function term() { let a = pow(); while (peek() === '*' || peek() === '/' || peek() === '%') { const op = s[i++]; const b = pow(); a = op === '*' ? a * b : op === '/' ? a / b : a % b; } return a; }
      function expr() { let a = term(); while (peek() === '+' || peek() === '-') { const op = s[i++]; const b = term(); a = op === '+' ? a + b : a - b; } return a; }
      const v = expr(); if (i < s.length) throw new Error('syntax'); return v;
    }

    function drawCalc() {
      const keys = ['sin', 'cos', 'tan', 'DEG', 'C',
        '7', '8', '9', '/', '(', ')',
        '4', '5', '6', '*', 'sqrt(', '^',
        '1', '2', '3', '-', 'pi', 'ln(',
        '0', '.', 'e', '+', 'log(', '='];
      body.innerHTML = `<div class="card" style="max-width:460px">
        <input id="cl-disp" placeholder="0" style="font-family:var(--f-mono);font-size:20px;text-align:right;height:52px">
        <div id="cl-res" class="mono" style="text-align:right;color:var(--amber-2);font-size:15px;min-height:22px;margin:8px 2px"></div>
        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px">
          ${keys.map(k => `<button class="btn sm" data-k="${k}" style="${k === '=' ? 'background:linear-gradient(180deg,var(--amber-2),var(--amber));color:#2a1607;border:none' : ''}${/^(sin|cos|tan|DEG|C)$/.test(k) ? 'color:var(--t2)' : ''}">${k === 'sqrt(' ? '√' : k === 'DEG' ? '<span id="cl-deg">DEG</span>' : k}</button>`).join('')}
        </div></div>`;
      const disp = body.querySelector('#cl-disp'), res = body.querySelector('#cl-res');
      let deg = Store.get('calc.deg', true);
      const setDegLbl = () => { const el = body.querySelector('#cl-deg'); if (el) el.textContent = deg ? 'DEG' : 'RAD'; };
      setDegLbl();
      const compute = () => { try { const v = evaluate(disp.value, deg); res.textContent = disp.value ? '= ' + (+v.toPrecision(12)) : ''; return v; } catch (e) { res.textContent = disp.value ? '…' : ''; return null; } };
      body.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
        const k = b.dataset.k;
        if (k === 'C') { disp.value = ''; res.textContent = ''; }
        else if (k === 'DEG') { deg = !deg; Store.set('calc.deg', deg); setDegLbl(); compute(); }
        else if (k === '=') { const v = compute(); if (v != null) { disp.value = String(+v.toPrecision(12)); res.textContent = ''; } }
        else if (['sin', 'cos', 'tan'].includes(k)) { disp.value += k + '('; compute(); }
        else { disp.value += k; compute(); }
        disp.focus();
      });
      disp.addEventListener('input', compute);
      disp.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = compute(); if (v != null) disp.value = String(+v.toPrecision(12)); } });
    }

    function drawConv() {
      const cats = Object.keys(CONV);
      let cat = 'length';
      body.innerHTML = `<div class="card" style="max-width:560px">
        <label>Quantity</label><select id="cv-cat">${cats.map(c => `<option>${c}</option>`).join('')}</select>
        <div class="grid g2" style="margin-top:14px">
          <div><label>From</label><input id="cv-in" type="number" value="1" step="any"><select id="cv-from" style="margin-top:8px"></select></div>
          <div><label>To</label><input id="cv-out" readonly><select id="cv-to" style="margin-top:8px"></select></div>
        </div></div>`;
      const catSel = body.querySelector('#cv-cat'), fromSel = body.querySelector('#cv-from'), toSel = body.querySelector('#cv-to');
      const inp = body.querySelector('#cv-in'), outp = body.querySelector('#cv-out');
      function unitList() {
        if (cat === 'temperature') return ['°C', '°F', 'K'];
        return Object.keys(CONV[cat].units);
      }
      function fillUnits() {
        const u = unitList();
        fromSel.innerHTML = u.map(x => `<option>${x}</option>`).join('');
        toSel.innerHTML = u.map((x, i) => `<option ${i === 1 ? 'selected' : ''}>${x}</option>`).join('');
      }
      function temp(v, from, to) {
        let c = from === '°C' ? v : from === '°F' ? (v - 32) * 5 / 9 : v - 273.15;
        return to === '°C' ? c : to === '°F' ? c * 9 / 5 + 32 : c + 273.15;
      }
      function conv() {
        const v = EMBER.num(inp.value, 0);
        let r;
        if (cat === 'temperature') r = temp(v, fromSel.value, toSel.value);
        else { const U = CONV[cat].units; r = v * U[fromSel.value] / U[toSel.value]; }
        outp.value = isFinite(r) ? +r.toPrecision(8) : '—';
      }
      catSel.onchange = () => { cat = catSel.value; fillUnits(); conv(); };
      [inp, fromSel, toSel].forEach(el => el.addEventListener('input', conv));
      fillUnits(); conv();
    }

    function drawRef() {
      body.innerHTML = `<div class="card"><div class="eyebrow">Field constants & rules of thumb</div>
        ${CONSTANTS.map(([k, v]) => `<div class="kv"><span>${EMBER.esc(k)}</span><b>${EMBER.esc(v)}</b></div>`).join('')}</div>`;
    }

    function draw() { tab === 'calc' ? drawCalc() : tab === 'conv' ? drawConv() : drawRef(); }
    view.querySelector('[data-t="calc"]').classList.add('on'); draw();
  }
});
