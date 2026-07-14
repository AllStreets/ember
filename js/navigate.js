'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'navigate', label: 'Navigate', desc: 'Distance, bearing, walking time & offline waypoints',
  icon: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>',
  render(view) {
    const R = 6371000; // earth radius m
    const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
    const haversine = (a, b) => {
      const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    };
    const bearing = (a, b) => {
      const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
      const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
      return (deg(Math.atan2(y, x)) + 360) % 360;
    };
    const CARD = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const cardinal = d => CARD[Math.round(d / 22.5) % 16];
    const fmtDur = h => { if (!isFinite(h) || h <= 0) return '—'; const m = Math.round(h * 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
    const parseCoord = v => { const p = String(v).split(/[, ]+/).map(Number).filter(x => isFinite(x)); return p.length >= 2 ? { lat: p[0], lng: p[1] } : null; };

    let tab = 'dist';
    view.innerHTML = `<div class="view-wrap">
      <div class="tabs"><button class="tab" data-t="dist">Distance & ETA</button>
        <button class="tab" data-t="wp">Waypoints</button><button class="tab" data-t="map">Local map</button>
        <button class="tab" data-t="field">Convert & find north</button></div>
      <div id="nv-body"></div></div>`;
    const body = view.querySelector('#nv-body');
    const setTab = t => { tab = t; view.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.t === t)); draw(); };
    view.querySelectorAll('.tab').forEach(b => b.onclick = () => setTab(b.dataset.t));

    function wpOptions(sel) {
      const wps = Store.get('nav.waypoints', []);
      return '<option value="">— manual —</option>' + wps.map((w, i) => `<option value="${i}" ${sel === i ? 'selected' : ''}>${EMBER.esc(w.name)}</option>`).join('');
    }

    function drawDist() {
      body.innerHTML = `
      <div class="grid g2">
        <div class="card"><div class="eyebrow">Point A</div>
          <label>From waypoint</label><select id="a-wp">${wpOptions()}</select>
          <label style="margin-top:10px">or lat, lng</label><input id="a-c" placeholder="e.g. 40.7128, -74.0060"></div>
        <div class="card"><div class="eyebrow">Point B</div>
          <label>From waypoint</label><select id="b-wp">${wpOptions()}</select>
          <label style="margin-top:10px">or lat, lng</label><input id="b-c" placeholder="e.g. 40.7580, -73.9855"></div>
      </div>
      <div class="card" style="margin-top:14px">
        <div class="eyebrow">On foot</div>
        <div class="grid g3">
          <div><label>Speed (km/h)</label><input id="spd" type="number" value="4.5" step="0.5" min="0.5"></div>
          <div><label>Terrain factor</label><select id="terr">
            <option value="1">1.0 · road / trail</option><option value="1.3">1.3 · rough / hills</option>
            <option value="1.7">1.7 · dense / snow / sand</option><option value="2.4">2.4 · very slow / injured</option></select></div>
          <div><label>Total ascent (m)</label><input id="asc" type="number" value="0" step="50" min="0"></div>
        </div>
      </div>
      <div class="grid g4" id="dist-out" style="margin-top:14px"></div>
      <div class="callout info" style="margin-top:14px">Great-circle distance (as the crow flies). Real walking routes are longer — the terrain factor and ascent (Naismith) approximate that.</div>`;

      const out = body.querySelector('#dist-out');
      const getPt = (which) => {
        const wpSel = body.querySelector('#' + which + '-wp').value;
        if (wpSel !== '') return Store.get('nav.waypoints', [])[+wpSel];
        return parseCoord(body.querySelector('#' + which + '-c').value);
      };
      function calc() {
        const a = getPt('a'), b = getPt('b');
        if (!a || !b) { out.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="dim">Enter both points (waypoint or "lat, lng").</div></div>`; return; }
        const d = haversine(a, b), brg = bearing(a, b);
        const spd = EMBER.num(body.querySelector('#spd').value, 4.5);
        const terr = EMBER.num(body.querySelector('#terr').value, 1);
        const asc = EMBER.num(body.querySelector('#asc').value, 0);
        const flatH = (d / 1000) / spd * terr;
        const ascH = asc / 600; // Naismith: +1h per 600m climb
        const hrs = flatH + ascH;
        out.innerHTML = `
          <div class="card"><div class="eyebrow">Distance</div><div class="stat">${(d / 1000).toFixed(2)}</div><div class="dim">km · ${(d / 1609.344).toFixed(2)} mi · ${(d / 1852).toFixed(2)} nmi</div></div>
          <div class="card"><div class="eyebrow">Bearing</div><div class="stat">${Math.round(brg)}°</div><div class="dim">head ${cardinal(brg)} (true)</div></div>
          <div class="card"><div class="eyebrow">Walking time</div><div class="stat">${fmtDur(hrs)}</div><div class="dim">at ${spd} km/h ×${terr}${asc ? ' +' + asc + 'm' : ''}</div></div>
          <div class="card"><div class="eyebrow">Reach / hour</div><div class="stat-sm">${(spd / terr).toFixed(1)} km</div><div class="dim">effective, add rest 10 min/h</div></div>`;
      }
      body.querySelectorAll('#a-wp,#b-wp,#a-c,#b-c,#spd,#terr,#asc').forEach(el => el.addEventListener('input', calc));
      calc();
    }

    function drawWp() {
      const wps = Store.get('nav.waypoints', []);
      body.innerHTML = `
        <div class="grid g2">
          <div class="card"><div class="eyebrow">Add waypoint</div>
            <label>Name</label><input id="w-name" placeholder="e.g. River bend, Cache, Home">
            <div class="grid g2" style="margin-top:10px">
              <div><label>Latitude</label><input id="w-lat" type="number" step="any" placeholder="40.71"></div>
              <div><label>Longitude</label><input id="w-lng" type="number" step="any" placeholder="-74.00"></div></div>
            <button class="btn primary sm" id="w-add" style="margin-top:12px">Save waypoint</button>
            <div class="dim" style="font-size:12px;margin-top:8px">Saved on this device. Record coordinates from any GPS/map while you still can — they work forever offline.</div></div>
          <div class="card"><div class="eyebrow">Offline plot</div><canvas id="w-map" width="440" height="300" style="width:100%;border-radius:10px;background:#0d0b09;border:1px solid var(--line)"></canvas>
            <div class="dim" id="w-scale" style="font-size:11px;margin-top:6px;text-align:center"></div></div>
        </div>
        <div class="section-title">Saved (${wps.length})</div>
        <div id="w-list"></div>`;

      const add = () => {
        const name = body.querySelector('#w-name').value.trim() || 'WP ' + (wps.length + 1);
        const lat = parseFloat(body.querySelector('#w-lat').value), lng = parseFloat(body.querySelector('#w-lng').value);
        if (!isFinite(lat) || !isFinite(lng)) return;
        wps.push({ name, lat, lng }); Store.set('nav.waypoints', wps); window.EMBER.updStore(); drawWp();
      };
      body.querySelector('#w-add').onclick = add;

      const listEl = body.querySelector('#w-list');
      listEl.innerHTML = wps.length ? wps.map((w, i) => `
        <div class="kv"><span><b>${EMBER.esc(w.name)}</b> <span class="dim mono" style="font-size:12px">${w.lat.toFixed(4)}, ${w.lng.toFixed(4)}</span></span>
          <button class="btn sm ghost danger" data-del="${i}">Remove</button></div>`).join('')
        : '<div class="dim">No waypoints yet.</div>';
      listEl.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { wps.splice(+b.dataset.del, 1); Store.set('nav.waypoints', wps); window.EMBER.updStore(); drawWp(); });

      // plot
      const cv = body.querySelector('#w-map'), ctx = cv.getContext('2d');
      const scaleEl = body.querySelector('#w-scale');
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (wps.length) {
        let minLat = Math.min(...wps.map(w => w.lat)), maxLat = Math.max(...wps.map(w => w.lat));
        let minLng = Math.min(...wps.map(w => w.lng)), maxLng = Math.max(...wps.map(w => w.lng));
        const padLat = Math.max((maxLat - minLat) * 0.2, 0.01), padLng = Math.max((maxLng - minLng) * 0.2, 0.01);
        minLat -= padLat; maxLat += padLat; minLng -= padLng; maxLng += padLng;
        const pad = 26, W = cv.width - pad * 2, H = cv.height - pad * 2;
        const px = w => pad + (w.lng - minLng) / (maxLng - minLng) * W;
        const py = w => pad + (maxLat - w.lat) / (maxLat - minLat) * H;
        // grid
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) { const x = pad + W * i / 4, y = pad + H * i / 4; ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, pad + H); ctx.moveTo(pad, y); ctx.lineTo(pad + W, y); ctx.stroke(); }
        // north arrow
        ctx.fillStyle = '#F59E0B'; ctx.font = '10px ui-monospace,monospace'; ctx.fillText('N ↑', pad + W - 22, pad + 4);
        // points
        wps.forEach((w, i) => {
          const x = px(w), y = py(w);
          ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fillStyle = '#FB923C'; ctx.fill();
          ctx.strokeStyle = 'rgba(245,158,11,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.stroke();
          ctx.fillStyle = '#f3ede3'; ctx.font = '11px ui-sans-serif,sans-serif'; ctx.fillText(w.name.slice(0, 14), x + 11, y + 4);
        });
        const midLat = (minLat + maxLat) / 2;
        const kmPerPx = haversine({ lat: midLat, lng: minLng }, { lat: midLat, lng: maxLng }) / 1000 / W;
        scaleEl.textContent = `≈ ${(kmPerPx * W).toFixed(1)} km across · ${(kmPerPx).toFixed(2)} km/px · schematic (equirectangular), not to scale near poles`;
      } else {
        ctx.fillStyle = '#7c7360'; ctx.font = '12px ui-sans-serif,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Add waypoints to plot them', cv.width / 2, cv.height / 2); ctx.textAlign = 'left';
        scaleEl.textContent = '';
      }
    }

    function drawField() {
      body.innerHTML = `
      <div class="grid g2">
        <div class="card"><div class="eyebrow">Coordinate converter</div>
          <label>Decimal degrees (lat, lng)</label><input id="cv-dec" placeholder="40.7128, -74.0060">
          <div id="cv-out" class="mono" style="margin-top:12px;font-size:13.5px;color:var(--t2);line-height:1.9"></div></div>
        <div class="card"><div class="eyebrow">Find North without a compass</div>
          <div style="font-size:13.5px;line-height:1.6">
          <p><strong>Day (shadow stick):</strong> mark a stick's shadow tip (W), wait 15 min, mark again (E). The line is roughly West→East; stand with the first mark on your left to face North.</p>
          <p style="margin-top:8px"><strong>Night (N. Hemisphere):</strong> the two end stars of the Big Dipper's cup point to <b>Polaris</b> — that direction is North.</p>
          <p style="margin-top:8px"><strong>Night (S. Hemisphere):</strong> extend the Southern Cross's long axis ~4.5× and drop to the horizon = South.</p>
          </div><button class="btn sm ghost" id="cv-more" style="margin-top:10px">Full navigation guide</button></div>
      </div>`;
      const dec = body.querySelector('#cv-dec'), out = body.querySelector('#cv-out');
      const toDMS = (v, pos, neg) => { const h = v >= 0 ? pos : neg; v = Math.abs(v); const d = Math.floor(v); const mF = (v - d) * 60; const m = Math.floor(mF); const s = ((mF - m) * 60).toFixed(1); return `${d}° ${m}' ${s}" ${h}`; };
      const conv = () => {
        const p = parseCoord(dec.value);
        out.innerHTML = p ? `DMS lat &nbsp;${toDMS(p.lat, 'N', 'S')}<br>DMS lng ${toDMS(p.lng, 'E', 'W')}<br><span class="dim">decimal ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}</span>` : '<span class="dim">Enter "lat, lng" in decimal degrees.</span>';
      };
      dec.oninput = conv; conv();
      body.querySelector('#cv-more').onclick = () => EMBER.go('survival');
    }

    function drawMap() {
      const st = Store.get('nav.map', { img: null, cal: [], pts: [] });
      let mode = st.cal.length >= 2 ? 'measure' : 'idle';
      let imgObj = null;
      body.innerHTML = `
        <div class="card" style="margin-bottom:12px">
          <div class="row" style="justify-content:space-between">
            <div class="eyebrow" style="margin:0">Your own map image</div>
            <div class="row">
              <label class="btn sm" style="margin:0;cursor:pointer"><input type="file" id="mp-file" accept="image/*" hidden>Load image</label>
              <button class="btn sm ghost" id="mp-cal">Calibrate 2 points</button>
              <button class="btn sm ghost" id="mp-undo">Undo point</button>
              <button class="btn sm ghost danger" id="mp-clear">Clear</button></div>
          </div>
          <div class="dim" id="mp-hint" style="font-size:12.5px;margin-top:8px"></div>
        </div>
        <canvas id="mp-cv" width="900" height="560" style="width:100%;border-radius:10px;background:#0d0b09;border:1px solid var(--line);cursor:crosshair;display:block"></canvas>
        <div id="mp-out" class="card" style="margin-top:12px"></div>`;
      const cv = body.querySelector('#mp-cv'), ctx = cv.getContext('2d');
      const hint = body.querySelector('#mp-hint'), out = body.querySelector('#mp-out');
      const save = () => { try { Store.set('nav.map', st); window.EMBER.updStore(); } catch (e) {} };

      function toLL(n) {
        if (st.cal.length < 2) return null;
        const [a, b] = st.cal;
        const lng = a.lng + (n.nx - a.nx) * (b.lng - a.lng) / ((b.nx - a.nx) || 1e-9);
        const lat = a.lat + (n.ny - a.ny) * (b.lat - a.lat) / ((b.ny - a.ny) || 1e-9);
        return { lat, lng };
      }
      function paint() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        if (imgObj) ctx.drawImage(imgObj, 0, 0, cv.width, cv.height);
        else { ctx.fillStyle = '#7c7360'; ctx.font = '13px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Load a map image (screenshot, scan, or photo of a paper map)', cv.width / 2, cv.height / 2); ctx.textAlign = 'left'; }
        const mark = (n, color, txt) => {
          const x = n.nx * cv.width, y = n.ny * cv.height;
          ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.stroke();
          ctx.font = 'bold 11px ui-monospace'; ctx.fillText(txt, x + 10, y - 6);
        };
        st.cal.forEach((n, i) => mark(n, '#60A5FA', 'REF' + (i + 1)));
        st.pts.forEach((n, i) => mark(n, '#FB923C', String.fromCharCode(65 + i)));
        if (st.pts.length === 2) { ctx.strokeStyle = 'rgba(251,146,60,.6)'; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(st.pts[0].nx * cv.width, st.pts[0].ny * cv.height); ctx.lineTo(st.pts[1].nx * cv.width, st.pts[1].ny * cv.height); ctx.stroke(); ctx.setLineDash([]); }
      }
      function readout() {
        const calibrated = st.cal.length >= 2;
        if (st.pts.length === 2 && calibrated) {
          const A = toLL(st.pts[0]), B = toLL(st.pts[1]);
          const d = haversine(A, B), brg = bearing(A, B);
          out.innerHTML = `<div class="grid g3">
            <div><div class="eyebrow">Distance</div><div class="stat-sm">${(d / 1000).toFixed(2)} km</div><div class="dim">${(d / 1609.344).toFixed(2)} mi</div></div>
            <div><div class="eyebrow">Bearing A→B</div><div class="stat-sm">${Math.round(brg)}° ${cardinal(brg)}</div></div>
            <div><div class="eyebrow">Walk (4.5 km/h)</div><div class="stat-sm">${fmtDur((d / 1000) / 4.5)}</div></div></div>
          <div class="dim mono" style="font-size:11px;margin-top:8px">A ${A.lat.toFixed(4)}, ${A.lng.toFixed(4)} · B ${B.lat.toFixed(4)}, ${B.lng.toFixed(4)}</div>`;
        } else if (calibrated) {
          out.innerHTML = `<div class="dim">Calibrated. In <b>Measure</b> mode, tap two points to read distance, bearing and walking time. Tap a single point to read its coordinates.</div>`;
        } else {
          out.innerHTML = `<div class="dim">Not calibrated yet. Load a map, hit <b>Calibrate 2 points</b>, and tap two locations whose real coordinates you know (a marked town, a junction, a GPS reading). After that, every tap reads live lat/lng off your own map — fully offline.</div>`;
        }
      }
      function setHint() {
        hint.textContent = mode === 'cal' ? `Calibration: tap reference point ${st.cal.length + 1} of 2 on the map, then enter its coordinates.`
          : st.cal.length >= 2 ? 'Measure mode: tap points on the map to read coordinates / distance.'
            : 'Load a map image, then calibrate two known points to unlock coordinates.';
      }

      cv.onclick = (ev) => {
        if (!imgObj) return;
        const r = cv.getBoundingClientRect();
        const n = { nx: (ev.clientX - r.left) / r.width, ny: (ev.clientY - r.top) / r.height };
        if (mode === 'cal') {
          const v = prompt('Coordinates of REF' + (st.cal.length + 1) + ' (decimal "lat, lng"):');
          const p = parseCoord(v || ''); if (!p) return;
          st.cal.push({ ...n, lat: p.lat, lng: p.lng });
          if (st.cal.length >= 2) { mode = 'measure'; }
          save(); setHint(); paint(); readout();
        } else {
          st.pts.push(n); if (st.pts.length > 2) st.pts.shift();
          save(); paint();
          if (st.pts.length === 1 && st.cal.length >= 2) { const ll = toLL(n); out.innerHTML = `<div class="eyebrow">Point A</div><div class="stat-sm">${ll.lat.toFixed(4)}, ${ll.lng.toFixed(4)}</div><div class="dim">tap a second point to measure</div>`; }
          else readout();
        }
      };

      body.querySelector('#mp-file').onchange = (ev) => {
        const f = ev.target.files[0]; if (!f) return;
        const rd = new FileReader();
        rd.onload = () => {
          const im = new Image();
          im.onload = () => {
            // downscale for storage; keep aspect
            const max = 1500, sc = Math.min(1, max / Math.max(im.width, im.height));
            const oc = document.createElement('canvas'); oc.width = Math.round(im.width * sc); oc.height = Math.round(im.height * sc);
            oc.getContext('2d').drawImage(im, 0, 0, oc.width, oc.height);
            cv.width = oc.width; cv.height = oc.height;
            imgObj = im; st.img = oc.toDataURL('image/jpeg', 0.82); st.cal = []; st.pts = []; mode = 'idle';
            save(); setHint(); paint(); readout();
          };
          im.src = rd.result;
        };
        rd.readAsDataURL(f);
      };
      body.querySelector('#mp-cal').onclick = () => { if (!imgObj) return alert('Load a map image first.'); st.cal = []; mode = 'cal'; save(); setHint(); paint(); readout(); };
      body.querySelector('#mp-undo').onclick = () => { if (mode === 'cal' && st.cal.length) st.cal.pop(); else if (st.pts.length) st.pts.pop(); save(); paint(); readout(); };
      body.querySelector('#mp-clear').onclick = () => { Store.del('nav.map'); drawMap(); };

      // restore saved image
      if (st.img) { const im = new Image(); im.onload = () => { imgObj = im; cv.width = im.naturalWidth; cv.height = im.naturalHeight; paint(); }; im.src = st.img; }
      setHint(); paint(); readout();
    }

    function draw() { ({ dist: drawDist, wp: drawWp, map: drawMap, field: drawField })[tab](); }
    setTab('dist');
  }
});
