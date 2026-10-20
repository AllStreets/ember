'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// FORGE — EMBER edits its own code. You describe a change in plain language; the
// LOCAL LLM rewrites the target file; you review a diff and apply it straight to
// disk (File System Access API). Every apply first copies the old file into
// _forge_backups/ on disk, so a broken edit is always recoverable without any
// tools, internet, or coding. Chromium browsers (Chrome/Edge/Brave) only.
// ═══════════════════════════════════════════════════════════════════════════
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'forge', label: 'Forge', desc: 'Let EMBER rewrite its own code from a prompt',
  icon: '<svg viewBox="0 0 24 24"><path d="M14 7l6 6M4 20l4-1 9.5-9.5a2.1 2.1 0 0 0-3-3L5 16l-1 4z"/><path d="M13.5 6.5l4 4"/></svg>',
  render(view) {
    const supported = 'showDirectoryPicker' in window;
    const ARCH = `EMBER is a static, dependency-free offline dashboard (vanilla JS, no build step, no frameworks, no external assets). Files:
- index.html loads: data/*.js, js/store.js, js/llm.js, then module files (js/home.js, advisor.js, survival.js, fieldguide.js, navigate.js, tools.js, reference.js, log.js, power.js, forge.js), then js/app.js LAST.

CONTENT vs CODE — this matters:
- data/*.js hold the CONTENT (the information shown), as plain arrays. js/*.js hold the CODE (the UI that renders that content).
- data/kb.js: the Survival module's content — an array named KB of objects { id, cat, title, tags:[...], html:\`…\` } plus KB_CATS (the category list). The "Food filter" etc. are just entries with cat:'Food'. To ADD or EDIT survival guides / information sections (e.g. more Food entries), edit data/kb.js by adding objects to the KB array — DO NOT edit survival.js for content.
- data/ref.js: reference content (MORSE, PHONETIC, KNOTS, FREQS, CONV, CONSTANTS, RADIATION).
- data/guide.js: field-guide content (GS icons, PLANTS, MUSHROOMS, MEDS arrays).
- js/survival.js only renders/search/filters the KB array; js/reference.js renders ref.js; js/fieldguide.js renders guide.js. Only edit these js files to change UI/behaviour, not to add content.

Module & helper conventions:
- Each module file registers itself: (window.EMBER_MODULES=window.EMBER_MODULES||[]).push({ id, label, desc, icon:'<svg…>', render(view){ view.innerHTML='…'; /* then wire events on elements INSIDE view */ } });
- Inside render, ALWAYS query elements from the passed 'view' (view.querySelector) AFTER setting view.innerHTML. Never call querySelector/querySelectorAll on an element id that you did not just create — that throws at runtime and breaks the page.
- app.js builds the sidebar + routes by location.hash. Helpers on window.EMBER: esc(s), num(v,d), go(id), modules, llmStatus, updStore.
- Store (js/store.js): Store.get(key,default), Store.set(key,val) — namespaced localStorage.
- LLM (js/llm.js): talks to local Ollama; LLM.chat(messages,onToken).
- Styling is in css/app.css using CSS variables (--amber, --panel, --t1/2/3, --f-mono). Reuse existing classes: card, eyebrow, btn/btn.primary, grid g2/g3/g4, kv, callout, tabs/tab, pill.
- NO external libraries, CDNs, fonts, or network calls (except the local LLM). Keep everything self-contained and offline.`;

    let dir = null;           // root directory handle
    let files = [];           // ['index.html','js/app.js', ...]
    let cur = null;           // current path
    let curText = '';         // current file content
    let proposal = null;      // { text }
    let restored = false;     // true when a saved handle exists but needs its permission re-granted
    let agent = null;         // multi-file agent state: { goal, phase, plan[], results[], ... }

    view.innerHTML = `<div class="view-wrap" id="fg-root"></div>`;
    const root = view.querySelector('#fg-root');
    let banner = null;        // { tone, title, body, actions:[{label, primary, run}] } shown above everything
    let lastApply = null;     // { stamp, edited:[path], created:[path] } so the last save can be undone

    // ── one accessible dialog for every question Forge asks ──
    // Replaces alert()/confirm()/prompt(): a real dialog, focus stays inside it,
    // Escape cancels, and focus goes back to whatever opened it. When the question
    // is risky, the safe answer has focus, so pressing Enter by reflex does no harm.
    function ask(o) {
      return new Promise((resolve) => {
        const opener = document.activeElement;
        const id = 'fgd-' + Math.random().toString(36).slice(2, 8);
        const danger = o.tone === 'danger';
        const hasCancel = o.cancel !== false;
        const list = (o.list && o.list.length) ? `<ul class="fgd-list">${o.list.map(x => `<li>${EMBER.esc(x)}</li>`).join('')}</ul>` : '';
        const input = o.input ? `<label class="fgd-field"><span>${EMBER.esc(o.input.label)}</span><input id="${id}-in" type="text" placeholder="${EMBER.esc(o.input.placeholder || '')}" value="${EMBER.esc(o.input.value || '')}" autocomplete="off" spellcheck="false"></label>` : '';
        const wrap = document.createElement('div');
        wrap.className = 'fgd-scrim';
        wrap.innerHTML = `<div class="fgd ${danger ? 'danger' : ''}" role="${danger ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="${id}-t" aria-describedby="${id}-b">
          <h2 class="fgd-title" id="${id}-t">${EMBER.esc(o.title)}</h2>
          <div class="fgd-body" id="${id}-b">${o.body || ''}${list}</div>
          ${input}
          <div class="fgd-actions">
            ${hasCancel ? `<button class="btn ghost" data-r="cancel">${EMBER.esc(o.cancel || 'Cancel')}</button>` : ''}
            <button class="btn ${danger ? 'danger' : 'primary'}" data-r="ok">${EMBER.esc(o.confirm || 'OK')}</button>
          </div></div>`;
        document.body.appendChild(wrap);
        const box = wrap.querySelector('.fgd');
        const field = wrap.querySelector('input');
        const okBtn = wrap.querySelector('[data-r="ok"]'), cancelBtn = wrap.querySelector('[data-r="cancel"]');
        const done = (val) => {
          document.removeEventListener('keydown', onKey, true);
          wrap.remove();
          if (opener && opener.focus && document.contains(opener)) opener.focus();
          resolve(val);
        };
        const ok = () => done(o.input ? (field.value.trim() || null) : true);
        const cancel = () => done(o.input ? null : false);
        okBtn.onclick = ok;
        if (cancelBtn) cancelBtn.onclick = cancel;
        wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && hasCancel) cancel(); });
        function onKey(e) {
          if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); hasCancel ? cancel() : ok(); return; }
          if (e.key === 'Enter' && field && document.activeElement === field) { e.preventDefault(); ok(); return; }
          if (e.key === 'Tab') {
            const f = [...box.querySelectorAll('button, input')];
            const i = f.indexOf(document.activeElement);
            if (i === -1) { e.preventDefault(); f[0].focus(); }
            else if (e.shiftKey && i === 0) { e.preventDefault(); f[f.length - 1].focus(); }
            else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
          }
        }
        document.addEventListener('keydown', onKey, true);
        (field || (danger && cancelBtn) || okBtn).focus();
      });
    }
    const tell = (title, body) => ask({ title, body, cancel: false, confirm: 'OK' });
    const OFFLINE = ['The local model is offline', '<p>Start Ollama, then try again. The Advisor page explains how.</p>'];

    // ── the status bar above the agent: what just happened, and what you can do about it ──
    function drawBanner() {
      if (!banner) return '';
      return `<div class="fg-banner ${banner.tone || ''}" role="status">
        <div class="fg-banner-text"><b>${EMBER.esc(banner.title)}</b>${banner.body ? `<span>${banner.body}</span>` : ''}</div>
        <div class="fg-banner-actions">${(banner.actions || []).map((a, i) => `<button class="btn sm ${a.primary ? 'primary' : 'ghost'}" data-banner="${i}">${EMBER.esc(a.label)}</button>`).join('')}
          <button class="fg-x" data-banner="x" aria-label="Dismiss">&times;</button></div></div>`;
    }
    function wireBanner() {
      root.querySelectorAll('[data-banner]').forEach(b => b.onclick = () => {
        const k = b.dataset.banner;
        if (k === 'x') { banner = null; draw(); } else banner.actions[+k].run();
      });
    }
    function savedBanner(paths, created, unbacked) {
      const n = paths.length;
      const undoable = lastApply && (lastApply.edited.length || lastApply.created.length);
      banner = { tone: 'go', title: `Saved ${n} file${n === 1 ? '' : 's'}`,
        body: `${paths.map(p => `<code>${EMBER.esc(p)}</code>`).join(' ')}. `
          + (unbacked.length ? `No backup could be made for ${unbacked.map(p => `<code>${EMBER.esc(p)}</code>`).join(' ')}, so Undo can't restore ${unbacked.length === 1 ? 'it' : 'them'}. ` : '')
          + 'Reload to run the new code.',
        actions: [{ label: 'Reload EMBER', primary: true, run: () => location.reload() }]
          .concat(undoable ? [{ label: 'Undo this save', run: undoApply }] : []) };
    }
    async function dirOf(path) {
      const parts = path.split('/'); let d = dir;
      for (let i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i]);
      return [d, parts[parts.length - 1]];
    }
    async function undoApply() {
      if (!lastApply) return;
      const { stamp, edited, created } = lastApply;
      const all = [...edited, ...created];
      const one = all.length === 1;
      const yes = await ask({ title: 'Undo the last save?',
        body: `<p>${one ? 'This file goes' : 'These files go'} back to how ${one ? 'it was' : 'they were'} before Forge wrote ${one ? 'it' : 'them'}.${created.length ? ' Files Forge created are deleted.' : ''}</p>`,
        list: all, confirm: 'Undo', cancel: 'Keep the change' });
      if (!yes) return;
      try {
        const bdir = edited.length ? await dir.getDirectoryHandle('_forge_backups') : null;
        for (const p of edited) {
          const h = await bdir.getFileHandle(stamp + '__' + p.replace(/\//g, '__'));
          const text = await (await h.getFile()).text();
          const fh = await fileHandle(p, true); const w = await fh.createWritable(); await w.write(text); await w.close();
        }
        for (const p of created) { const [d, name] = await dirOf(p); await d.removeEntry(name); }
        lastApply = null;
        files = await listFiles();
        if (cur && all.includes(cur)) { if (files.includes(cur)) curText = await readFileText(cur); else { cur = null; curText = ''; } }
        banner = { title: 'Save undone', body: `${all.length} file${one ? '' : 's'} restored. Reload to run the restored code.`,
          actions: [{ label: 'Reload EMBER', primary: true, run: () => location.reload() }] };
      } catch (e) {
        banner = { tone: 'danger', title: 'Undo failed', body: EMBER.esc(e.message || String(e)) + '. The backups are still in <code>_forge_backups/</code>.' };
      }
      draw();
    }

    // ── a real line diff: common prefix and suffix trimmed, LCS on the middle,
    // shown as hunks with three lines of context and old and new line numbers ──
    function lineDiff(a, b) {
      const A = a === '' ? [] : a.split('\n'), B = b === '' ? [] : b.split('\n');
      let p = 0; while (p < A.length && p < B.length && A[p] === B[p]) p++;
      let q = 0; while (q < A.length - p && q < B.length - p && A[A.length - 1 - q] === B[B.length - 1 - q]) q++;
      const a2 = A.slice(p, A.length - q), b2 = B.slice(p, B.length - q);
      const mid = [];
      const n = a2.length, m = b2.length;
      if (n && m && n * m <= 4e6) {
        const W = m + 1, L = new Uint32Array((n + 1) * W);
        for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
          L[i * W + j] = a2[i] === b2[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
        let i = 0, j = 0;
        while (i < n && j < m) {
          if (a2[i] === b2[j]) { mid.push(['=', i, j]); i++; j++; }
          else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) { mid.push(['-', i, -1]); i++; }
          else { mid.push(['+', -1, j]); j++; }
        }
        while (i < n) mid.push(['-', i++, -1]);
        while (j < m) mid.push(['+', -1, j++]);
      } else {
        for (let i = 0; i < n; i++) mid.push(['-', i, -1]);
        for (let j = 0; j < m; j++) mid.push(['+', -1, j]);
      }
      const ops = [];
      for (let i = 0; i < p; i++) ops.push({ t: '=', o: i + 1, n: i + 1, l: A[i] });
      for (const [t, i, j] of mid) ops.push({ t, o: i >= 0 ? p + i + 1 : 0, n: j >= 0 ? p + j + 1 : 0, l: t === '+' ? b2[j] : a2[i] });
      for (let k = 0; k < q; k++) { const oi = A.length - q + k, ni = B.length - q + k; ops.push({ t: '=', o: oi + 1, n: ni + 1, l: A[oi] }); }
      const add = ops.filter(x => x.t === '+').length, del = ops.filter(x => x.t === '-').length;
      if (!add && !del) return { add, del, html: '<p class="dim fg-nodiff">No changes.</p>' };
      // group into hunks with 3 lines of context
      const keep = new Array(ops.length).fill(false);
      ops.forEach((x, k) => { if (x.t !== '=') for (let c = Math.max(0, k - 3); c <= Math.min(ops.length - 1, k + 3); c++) keep[c] = true; });
      const rows = []; let shown = 0, hidden = 0, inHunk = false;
      ops.forEach((x, k) => {
        if (!keep[k]) { inHunk = false; return; }
        if (!inHunk) {
          const o = x.o || (ops.slice(k).find(y => y.o) || {}).o || 0, nn = x.n || (ops.slice(k).find(y => y.n) || {}).n || 0;
          rows.push(`<div class="dh">Line ${nn || o}</div>`); inHunk = true;
        }
        if (shown >= 600) { hidden++; return; }
        shown++;
        const cls = x.t === '+' ? 'add' : x.t === '-' ? 'del' : 'ctx';
        const sign = x.t === '+' ? '+' : x.t === '-' ? '&minus;' : '';
        rows.push(`<div class="dl ${cls}"><span class="ln">${x.o || ''}</span><span class="ln">${x.n || ''}</span><span class="sg">${sign}</span><span class="tx">${EMBER.esc(x.l) || ' '}</span></div>`);
      });
      if (hidden) rows.push(`<div class="dh">${hidden} more changed line${hidden === 1 ? '' : 's'} not shown</div>`);
      return { add, del, html: `<div class="fg-diff2" aria-label="Line changes: ${add} added, ${del} removed">${rows.join('')}</div>` };
    }

    // plain-language result of each check validate() ran
    const CHECK_ICON = {
      pass: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
      fail: '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>',
      skip: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
      wait: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>',
    };
    const CHECK_WORD = { pass: 'passed', fail: 'failed', skip: 'not applicable', wait: 'not run' };
    function checkRows(path, v, stepFails, nSteps) {
      v = v || { ok: true, skipped: true };
      const row = (st, name, detail) => `<li class="fg-check ${st}"><span class="fg-ci" aria-hidden="true">${CHECK_ICON[st]}</span><span class="fg-cn">${name}<span class="sr"> ${CHECK_WORD[st]}</span></span><span class="fg-cd">${detail}</span></li>`;
      const rows = [];
      const syntaxChecked = /\.(js|json|webmanifest)$/.test(path);
      if (v.stage === 'syntax') rows.push(row('fail', 'Syntax', EMBER.esc(v.msg)));
      else rows.push(syntaxChecked ? row('pass', 'Syntax', 'parses cleanly') : row('skip', 'Syntax', 'not checked for this file type'));
      if (/\.html$/.test(path)) {
        rows.push(v.stage === 'html' ? row('fail', 'App shell', EMBER.esc(v.msg))
          : v.stage === 'syntax' ? row('wait', 'App shell', 'not checked')
          : row('pass', 'App shell', 'keeps the page structure and every script it loaded'));
      }
      if (v.stage === 'syntax' || v.stage === 'html') rows.push(row('wait', 'Test render', 'not run'));
      else if (v.stage === 'render') rows.push(row('fail', 'Test render', 'crashed: ' + EMBER.esc(v.msg)));
      else if (v.skipped) rows.push(row('skip', 'Test render', 'not a screen, so there is nothing to render'));
      else rows.push(row('pass', 'Test render', 'ran on a hidden test page without errors'));
      if (stepFails) rows.push(row('fail', 'Steps', `${stepFails} of ${nSteps} didn't apply`));
      return `<ul class="fg-checks" aria-label="Checks">${rows.join('')}</ul>`;
    }

    // Cmd/Ctrl+Enter saves from the review
    document.addEventListener('keydown', function onSaveKey(e) {
      if (!document.contains(root)) { document.removeEventListener('keydown', onSaveKey); return; }
      if (agent && agent.phase === 'review' && e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !document.querySelector('.fgd-scrim')) {
        e.preventDefault(); agentApplyAll();
      }
    });

    // ── tiny IndexedDB for persisting the folder handle ──
    const idb = {
      db: null,
      open() { return new Promise((res) => { const r = indexedDB.open('ember-forge', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { this.db = r.result; res(); }; r.onerror = () => res(); }); },
      get(k) { return new Promise((res) => { if (!this.db) return res(null); const t = this.db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(null); }); },
      set(k, v) { return new Promise((res) => { if (!this.db) return res(); const t = this.db.transaction('kv', 'readwrite').objectStore('kv').put(v, k); t.oncomplete = () => res(); this.db.transaction; res(); }); },
    };

    async function fileHandle(path, create = false) {
      const parts = path.split('/'); let d = dir;
      for (let i = 0; i < parts.length - 1; i++) d = await d.getDirectoryHandle(parts[i], { create });
      return d.getFileHandle(parts[parts.length - 1], { create });
    }
    async function listFiles(d = dir, prefix = '') {
      const out = [];
      for await (const [name, h] of d.entries()) {
        if (name.startsWith('.') || name === '_forge_backups' || name === 'node_modules') continue;
        const p = prefix + name;
        if (h.kind === 'directory') out.push(...await listFiles(h, p + '/'));
        else if (/\.(js|html|css|json|md|webmanifest|svg|txt)$/.test(name)) out.push(p);
      }
      return out.sort();
    }

    function connMsg(html, danger) {
      const el = root.querySelector('#fg-connect-msg');
      if (el) el.innerHTML = html ? `<div class="callout ${danger ? 'danger' : ''}" style="margin-top:12px">${html}</div>` : '';
    }
    // Get a usable, write-granted handle: re-grant the remembered folder if we have
    // one (no re-pick needed — Chrome forgets the grant when all tabs close), else
    // open the folder picker. Throws {name:'NotAllowedError'} if write isn't granted.
    async function grantOrPick() {
      if (dir && dir.requestPermission) {
        let p = 'prompt';
        try { p = await dir.requestPermission({ mode: 'readwrite' }); } catch (e) { /* fall through to picker */ }
        if (p === 'granted') return dir;
      }
      const h = await window.showDirectoryPicker({ id: 'ember', mode: 'readwrite' });
      if (h.requestPermission) {
        const p = await h.requestPermission({ mode: 'readwrite' });
        if (p !== 'granted') throw Object.assign(new Error('write permission not granted'), { name: 'NotAllowedError' });
      }
      return h;
    }
    async function connect() {
      if (location.protocol === 'file:' || !window.isSecureContext) {
        tell('Open EMBER from localhost first', '<p>The folder picker is blocked because EMBER was opened as a file rather than served. Double-click <code>serve.command</code>, open <code>http://localhost:8787</code>, and Connect will work.</p>');
        return;
      }
      connMsg('');
      try {
        dir = await grantOrPick();                      // picker is called synchronously inside — keep the gesture
        restored = false;
        await idb.set('dir', dir);
        files = await listFiles();
        draw();
      } catch (e) {
        if (e && e.name === 'AbortError') { connMsg('No folder was chosen (the Finder dialog was dismissed). <b>Do not take a screenshot</b> while it is open — that closes it. Click the button again, and in the Finder window pick the <b>EMBER</b> folder and click <b>Open</b>. If no window appears at all, tell me — it may be a Chrome policy.'); return; }
        if (e && e.name === 'NotAllowedError') { connMsg('Access wasn\'t granted. When the folder dialog asks, choose the EMBER folder and click <b>Edit files / Allow</b> (not "View only").', true); return; }
        connMsg('Could not open the folder picker: ' + (e && e.message ? EMBER.esc(e.message) : e) + '<br>Use Chrome, Edge or Brave, opened via http://localhost (serve.command).', true);
      }
    }
    async function tryRestore() {
      try {
        await idb.open();
        const h = await idb.get('dir');
        if (h) {
          const perm = await h.queryPermission({ mode: 'readwrite' });
          dir = h;
          if (perm === 'granted') { try { files = await listFiles(); restored = false; } catch (e) { dir = null; } }
          else { restored = true; }        // handle remembered, but Chrome dropped the grant — one click re-grants it
        }
      } catch (e) { /* ignore — fall back to connect screen */ }
      draw();
    }

    async function openFile(p) {
      cur = p; proposal = null;
      const fh = await fileHandle(p); curText = await (await fh.getFile()).text();
      draw();
    }

    // map a renderer file to the data file that actually holds its content
    const DATA_FOR = { 'js/survival.js': 'data/kb.js', 'js/reference.js': 'data/ref.js', 'js/fieldguide.js': 'data/guide.js' };
    const CONTENT_RE = /\b(add|adds|more|extra|new|additional|section|sections|information|info|entry|entries|guide|guides|content|topic|topics|article|articles|note|notes|item|items|about)\b/i;

    // which model to use for code (picker if present, else stored/default best)
    // Auto-upgrade the pinned Forge model off any tiny/unavailable model to the best
    // installed coding model. A <4B non-coder (e.g. llama3.2) can't write reliable code,
    // so we never let Forge stay stuck on one. Runs on every draw; also updates the pin.
    function upgradeModelPin() {
      const st = window.EMBER.llmStatus || {};
      const models = st.models || [];
      if (!models.length) return;
      const m = Store.get('forge.model', '');
      const isCoder = /cod(er|e)/i.test(m);
      const tiny = !!m && !isCoder && !!modelParams(m) && modelParams(m) < 5;   // llama3.2:3b, etc.
      if (!m || !models.includes(m) || tiny) {
        const best = pickCodeModel(models, '');
        if (best && best !== m) Store.set('forge.model', best);
      }
    }
    function currentModel() {
      upgradeModelPin();
      const st = window.EMBER.llmStatus || {};
      const picker = root.querySelector('#fg-model');
      const pinned = Store.get('forge.model', pickCodeModel(st.models || [], st.model || ''));
      // the picker only overrides when it isn't the auto-upgraded-away tiny model
      const pv = picker && picker.value;
      if (pv && !( !/cod(er|e)/i.test(pv) && modelParams(pv) && modelParams(pv) < 5 )) return pv;
      return pinned;
    }
    // shared system prompt for any single-file rewrite (single-file mode AND agent mode)
    function buildSys(path) {
      const dataHint = /^data\//.test(path)
        ? `\n\nThis is a CONTENT/data file. To add information, APPEND new objects to the existing array, copying the exact shape of the entries already there (same fields). For data/kb.js use an existing category string for "cat" (e.g. "Weather") so it shows under that filter. Write real, specific, genuinely useful survival content — do NOT invent placeholders, headings without substance, or repeat existing text.`
        : '';
      return `You are FORGE, the code engine inside EMBER, an offline survival console. You rewrite one file at a time.\n${ARCH}\n\nRULES:\n- Output ONLY the COMPLETE, updated contents of the target file, inside a single fenced code block. No prose, no explanation, no partial snippets.\n- Preserve everything that works; make the smallest change that satisfies the request.\n- Never invent filler, duplicate existing content, or add empty/placeholder sections. Every addition must be real and useful.\n- Keep it dependency-free and offline. Match the existing code style.\n- Return the WHOLE file every time — never truncate or use "…". Balanced brackets, parens, and quotes.\n- If the request is unsafe or impossible, output the original file unchanged.${dataHint}`;
    }
    async function readFileText(p) { const fh = await fileHandle(p); return (await fh.getFile()).text(); }

    // Core single-file rewrite used by the agent: returns the full new file text.
    // Size the context window to the file: input tokens (~chars/3.3) for the current
    // file + prompt, PLUS room for the model to re-emit the whole file, +headroom.
    // Rounded to 2K, clamped to [8K, 32K]. Without this, big files silently truncate.
    function ctxFor(chars) {
      const tokens = Math.ceil((chars * 2) / 3.3) + 3000;
      return Math.min(32768, Math.max(8192, Math.ceil(tokens / 2048) * 2048));
    }
    async function llmRewrite(path, baseText, instruction, model, onToken) {
      const isNew = !baseText;
      const user = { role: 'user', content:
        `TARGET FILE: ${path}\n\n${isNew ? 'This is a NEW file to CREATE from scratch.' : 'CURRENT CONTENTS:\n```\n' + baseText + '\n```'}\n\nCHANGE REQUEST: ${instruction}\n\nReturn the full contents of ${path} as one fenced code block.` };
      const num_ctx = ctxFor((baseText || '').length + instruction.length);
      const raw = await LLM.chat([{ role: 'system', content: buildSys(path) }, user], onToken, { model, temperature: 0.2, num_ctx, num_predict: -1 });
      return extractCode(raw);
    }

    // ── APPEND MODE ───────────────────────────────────────────────────────────
    // Adding content to a big data file by regenerating the WHOLE file (46KB) is
    // unreliable on any local model — it drops or truncates something. Instead the
    // model writes ONLY the new array element(s) (~1KB) and Forge splices them into
    // the array. Deterministic insertion = no more whole-file corruption.
    function sampleEntry(text, marker) {
      let i = text.indexOf(marker); if (i < 0) return '{ … }';
      const b = text.indexOf('{', i); if (b < 0) return '{ … }';
      return text.slice(b, b + 700);
    }
    function appendConfig(path, req, baseText) {
      const r = (req || '').toLowerCase();
      const ex = (m) => sampleEntry(baseText, m);
      if (path === 'data/kb.js') return { varName: 'KB', label: 'survival guide entries', example: ex('{ id:'), cats: (baseText.match(/KB_CATS\s*=\s*\[([^\]]*)\]/) || [, ''])[1].trim() };
      if (path === 'data/guide.js') {
        if (/mushroom|fungi/.test(r)) return { varName: 'MUSHROOMS', label: 'mushroom entries', example: ex('MUSHROOMS') };
        if (/\bmed(s|ication|icine)?\b/.test(r)) return { varName: 'MEDS', label: 'medication entries', example: ex('MEDS') };
        if (/plant|forag|edible|berr/.test(r)) return { varName: 'PLANTS', label: 'plant entries', example: ex('PLANTS') };
        return null;
      }
      if (path === 'data/ref.js') {
        if (/knot/.test(r)) return { varName: 'KNOTS', label: 'knot entries', example: ex('KNOTS') };
        return null;                              // other ref arrays are ambiguous → full rewrite
      }
      return null;
    }
    async function appendEntries(path, baseText, cfg, instruction, model, onToken) {
      const sys = { role: 'system', content:
        `You are FORGE, adding ${cfg.label} to an offline survival app (${path}).\n`
        + `Output ONLY the NEW array element(s) to append to the ${cfg.varName} array: JavaScript object literal(s), each ending with a comma, matching EXACTLY the shape/fields of the existing entries.\n`
        + `NO array brackets, NO "const ${cfg.varName} =", NO code fences, NO markdown, NO prose, NO explanation — output must start with "{" and be valid to paste inside the existing array.\n`
        + `Write real, specific, genuinely useful content — never placeholders or duplicates.\n`
        + (cfg.cats ? `Valid category ("cat") values: ${cfg.cats}. Use the one that matches the request.\n` : '')
        + `Shape of an existing entry:\n${cfg.example}` };
      const user = { role: 'user', content: `TASK: ${instruction}\n\nReturn only the new ${cfg.varName} object literal(s), each comma-terminated.` };
      const raw = await LLM.chat([sys, user], onToken, { model, temperature: 0.2, num_ctx: ctxFor(cfg.example.length + instruction.length + 2500), num_predict: -1 });
      // clean the snippet down to bare comma-separated object literals
      let snip = extractCode(raw).trim();
      snip = snip.replace(/^[^[{]*/, '');                       // drop any leading prose
      snip = snip.replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '').replace(/;?\s*$/, '');
      snip = snip.replace(/^\[/, '').replace(/\]$/, '').trim();  // drop wrapping [ ] if present
      if (!snip) throw new Error('the model returned no new entries');
      if (!snip.endsWith(',')) snip += ',';
      // validate the snippet as array elements in isolation
      try { new Function('return [\n' + snip + '\n]'); }
      catch (e) { throw new Error('new entries have invalid syntax: ' + (e.message || e)); }
      // deterministic splice right after `const VAR = [`
      const m = baseText.match(new RegExp('(?:const|let|var)\\s+' + cfg.varName + '\\s*=\\s*\\['));
      if (!m) throw new Error('could not find the ' + cfg.varName + ' array to append to');
      const at = m.index + m[0].length;
      return baseText.slice(0, at) + '\n' + snip + '\n' + baseText.slice(at);
    }
    // ── SEARCH/REPLACE edit blocks ────────────────────────────────────────────
    // The general "stay in the context window" fix: for edits the model outputs only
    // the small region it's changing (not the whole file), and Forge applies it by
    // match. Tiny output = no whole-file truncation, and it works for ANY file type.
    function applyBlock(text, search, replace) {
      if (search === '') return text.replace(/\n?$/, '') + '\n' + replace + '\n';   // empty SEARCH = append
      if (text.includes(search)) return text.replace(search, replace);
      // whitespace-tolerant line match (indentation drift is the usual mismatch cause)
      const T = text.split('\n'), S = search.split('\n').map(l => l.trim());
      while (S.length && S[S.length - 1] === '') S.pop();
      while (S.length && S[0] === '') S.shift();
      if (!S.length) return null;
      for (let i = 0; i + S.length <= T.length; i++) {
        let ok = true;
        for (let j = 0; j < S.length; j++) { if (T[i + j].trim() !== S[j]) { ok = false; break; } }
        if (ok) {
          const before = T.slice(0, i), after = T.slice(i + S.length);
          return [...before, ...replace.split('\n'), ...after].join('\n');
        }
      }
      return null;
    }
    function applyEditBlocks(base, raw) {
      const re = /<{5,}\s*SEARCH\s*\r?\n([\s\S]*?)\r?\n?={5,}\s*\r?\n([\s\S]*?)\r?\n?>{5,}\s*REPLACE/g;
      const blocks = [...raw.matchAll(re)];
      if (!blocks.length) return null;                       // no blocks → caller decides fallback
      let text = base;
      for (const b of blocks) {
        const applied = applyBlock(text, b[1].replace(/\r/g, ''), b[2].replace(/\r/g, ''));
        if (applied == null) throw new Error('an edit block’s SEARCH text was not found in the file');
        text = applied;
      }
      return text;
    }
    async function editViaBlocks(path, base, instruction, model, onToken) {
      const sys = { role: 'system', content:
        `You are FORGE, editing ${path} in EMBER (a dependency-free offline app).\n${ARCH}\n\n`
        + `Make the change using SEARCH/REPLACE edit blocks — do NOT output the whole file. For each region you change, output a block in EXACTLY this format:\n`
        + `<<<<<<< SEARCH\n(a few lines copied EXACTLY from the current file — enough to be unique)\n=======\n(the replacement lines)\n>>>>>>> REPLACE\n\n`
        + `Rules:\n- Copy the SEARCH text character-for-character from the current file, indentation included.\n- Keep each block minimal. Output ONLY edit blocks — no prose, no full file, no code fences.\n- To ADD code, SEARCH a nearby unique existing line and repeat it plus your additions in REPLACE.\n- Match the existing code style. Never invent filler or duplicate content.` };
      const user = { role: 'user', content: `CURRENT ${path}:\n\`\`\`\n${base}\n\`\`\`\n\nCHANGE REQUEST: ${instruction}\n\nOutput only SEARCH/REPLACE edit blocks.` };
      const raw = await LLM.chat([sys, user], onToken, { model, temperature: 0.2, num_ctx: ctxFor(base.length + instruction.length), num_predict: -1 });
      return applyEditBlocks(base, raw);
    }

    // Build one file. Order of preference (each keeps model output small & reliable):
    //   create → full write · content-array add → append-mode · other edit → edit-blocks
    // Full rewrite is only the last-resort fallback for SMALL files.
    async function buildOne(path, action, baseText, goal, why, model, onToken) {
      const role = why ? '\n\nThis file\'s role in the goal: ' + why : '';
      if (action === 'create' || !baseText) {
        return llmRewrite(path, baseText, `GOAL: ${goal}${role}`, model, onToken);
      }
      const cfg = CONTENT_RE.test(goal) ? appendConfig(path, goal + ' ' + (why || ''), baseText) : null;
      if (cfg) return appendEntries(path, baseText, cfg, `${goal}${role}`, model, onToken);

      const instruction = `${goal}${role}`;
      let viaBlocks = null, blockErr = null;
      try { viaBlocks = await editViaBlocks(path, baseText, instruction, model, onToken); }
      catch (e) { blockErr = e; }
      if (viaBlocks != null) return viaBlocks;
      // no usable blocks: only risk a whole-file rewrite for small files; big files surface the error
      if (baseText.length > 8000) throw (blockErr || new Error('the model did not produce valid edit blocks — click Redo to try again'));
      return llmRewrite(path, baseText, instruction, model, onToken);
    }

    // ── multi-file AGENT ──────────────────────────────────────────────────────
    function repoMap() {
      return files.map(p => `- ${p}${fileRole(p) ? '  (' + fileRole(p).replace(/<[^>]+>/g, '') + ')' : ''}`).join('\n');
    }
    // Parse an ORDERED list of steps. Each step = one focused change to one file;
    // multiple steps may target the same file (split a big single-file change up).
    function parseSteps(raw) {
      let arr = null;
      const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const src = fenced ? fenced[1] : raw;
      try { arr = JSON.parse(src); } catch (e) {
        const bracket = src.match(/\[[\s\S]*\]/);
        if (bracket) { try { arr = JSON.parse(bracket[0]); } catch (e2) {} }
      }
      if (!Array.isArray(arr)) return [];
      return arr.map(x => {
        if (!x) return null;
        const file = String(x.file || x.path || '').trim().replace(/^\.?\//, '');
        if (!file) return null;
        return { file, action: (x.action === 'create' || !files.includes(file)) ? 'create' : 'edit', step: String(x.step || x.why || x.desc || 'make the change').slice(0, 240), include: true };
      }).filter(Boolean).slice(0, 10);
    }
    // Guardrail: a pure content-add is always ONE step on the right data file, no matter
    // what the model decomposed — stops content requests from spraying across files.
    function refineSteps(goal, steps) {
      const g = goal.toLowerCase();
      const wantsFeature = /\b(module|tool|tab|button|screen|page|feature|calculator|estimator|timer|tracker|map|sidebar|ui|layout|style|theme|colou?r|print|icon|animation|widget|chart|graph|wire|route|handler)\b/.test(g);
      if (CONTENT_RE.test(goal) && !wantsFeature) {
        const target = /(morse|knot|radio|frequenc|phonetic|radiation|geiger|fallout|constant)/.test(g) ? 'data/ref.js'
          : /(plant|mushroom|fungi|forag|medicat|medicine|\bmeds?\b)/.test(g) ? 'data/guide.js'
          : 'data/kb.js';
        if (files.includes(target)) return [{ file: target, action: 'edit', step: goal, include: true }];
      }
      return steps;
    }
    async function agentPlan(goal) {
      const st = window.EMBER.llmStatus;
      if (!st || !st.online) { tell(...OFFLINE); return; }
      agent = { goal, phase: 'planning', planText: '' }; draw();
      const sys = { role: 'system', content:
        `You are FORGE's planner for EMBER, an offline survival console.\n${ARCH}\n\nBreak the GOAL into an ORDERED list of small STEPS. Each step changes ONE file and does ONE focused thing. Multiple steps MAY target the SAME file — split a big single-file change into separate regional steps (e.g. add the data, then wire the handler, then add the style). Fewer steps is better; most requests are a single step.\n\nRULES:\n1. Adding/expanding INFORMATION, guides, sections, entries → ONE step on the data file (survival→data/kb.js; morse/knots/radiation→data/ref.js; plants/mushrooms/meds→data/guide.js). Never touch js/*.js for content.\n2. Changing how a screen LOOKS or BEHAVES → step(s) on that js/*.js (and css/app.css for styling).\n3. A NEW tool/module → create js/<name>.js, then edit index.html (add its <script> before js/app.js), then edit sw.js (add it to ASSETS).\n\nOutput ONLY a JSON array in a \`\`\`json code block, at most 10 items, IN EXECUTION ORDER: {"file":"...","action":"edit"|"create","step":"imperative description of this one change"}. No prose.\n\nExamples:\n- "add security info" → [{"file":"data/kb.js","action":"edit","step":"add 3 Security KB entries about OPSEC, watch rotations and de-escalation"}]\n- "add a Tides tool to the sidebar" → [{"file":"js/tides.js","action":"create","step":"create the Tides module: render() with a tide-time estimator, registered into EMBER_MODULES"},{"file":"index.html","action":"edit","step":"add <script src=\\"js/tides.js\\"> just before js/app.js"},{"file":"sw.js","action":"edit","step":"add 'js/tides.js' to the ASSETS array"}]` };
      const user = { role: 'user', content: `FILES:\n${repoMap()}\n\nGOAL: ${goal}\n\nReturn the ordered JSON steps.` };
      try {
        const raw = await LLM.chat([sys, user], (t) => {
          agent.planText = (agent.planText + t).slice(-1200);
          const e = root.querySelector('#ag-stream'); if (e) { e.textContent = agent.planText; e.scrollTop = e.scrollHeight; }
        }, { model: currentModel(), temperature: 0.1 });
        agent.steps = refineSteps(goal, parseSteps(raw));
        agent.steps.forEach(s => s.include = true);
        agent.phase = agent.steps.length ? 'plan' : 'plan-fail';
        agent.raw = raw;
      } catch (e) { agent.phase = 'plan-fail'; agent.error = e.message; }
      draw();
    }
    async function agentBuild() {
      const steps = agent.steps.filter(s => s.include);
      if (!steps.length) { tell('Nothing to build', '<p>Tick at least one step.</p>'); return; }
      const model = currentModel();
      agent.phase = 'building';
      agent.stepRuns = steps.map(s => ({ ...s, status: 'pending', stream: '' }));
      draw();
      const working = {}, orig = {}, order = [];      // per-file accumulated text
      for (let i = 0; i < agent.stepRuns.length; i++) {
        const sr = agent.stepRuns[i];
        sr.status = 'working'; draw();
        try {
          if (!(sr.file in working)) {                 // first step to touch this file
            orig[sr.file] = sr.action === 'create' ? '' : await readFileText(sr.file);
            working[sr.file] = orig[sr.file];
            order.push(sr.file);
          }
          const curBase = working[sr.file];
          const act = curBase === '' ? 'create' : 'edit';
          const text = await buildOne(sr.file, act, curBase, sr.step, agent.goal, model, (t) => {
            sr.stream = (sr.stream + t).slice(-500);
            const e = root.querySelector('#ag-stream-' + i); if (e) { e.textContent = sr.stream; e.scrollTop = e.scrollHeight; }
          });
          const v = validate(sr.file, text, orig[sr.file]);
          sr.v = v;
          if (v.ok) { working[sr.file] = text; sr.status = 'done'; }   // only advance on a valid step
          else { sr.status = 'failed'; }
        } catch (e) { sr.status = 'error'; sr.err = e.message; }
        draw();
      }
      // aggregate steps into one result per file for the select/redo review
      agent.results = order.map(file => {
        const fileSteps = agent.stepRuns.filter(s => s.file === file);
        const fails = fileSteps.filter(s => s.status !== 'done').length;
        const base = orig[file], text = working[file];
        const v = validate(file, text, base);
        return { path: file, action: base === '' ? 'create' : 'edit', base, text, v, status: 'done',
          steps: fileSteps.map(s => s.step), stepFails: fails,
          include: v.ok && fails === 0 && text !== base };
      }).filter(r => r.text !== r.base || r.action === 'create');   // drop files nothing changed
      agent.phase = 'review';
      draw();
    }
    // Redo one file = re-run ALL its steps in order against the original file.
    async function agentRegen(i) {
      const it = agent.results[i]; if (!it) return;
      agent.savedNote = '';
      it.status = 'working'; it.stream = ''; draw();
      const onTok = (t) => { it.stream = (it.stream + t).slice(-500); const e = root.querySelector('#ag-stream-' + i); if (e) e.textContent = it.stream; };
      try {
        const base = it.base != null ? it.base : (it.action === 'create' ? '' : await readFileText(it.path));
        const steps = (it.steps && it.steps.length) ? it.steps : [agent.goal];
        let working = base, fails = 0;
        for (const step of steps) {
          const act = working === '' ? 'create' : 'edit';
          try {
            const text = await buildOne(it.path, act, working, step, agent.goal, currentModel(), onTok);
            const v = validate(it.path, text, base);
            if (v.ok) working = text; else fails++;
          } catch (e) { fails++; }
        }
        it.base = base; it.text = working; it.v = validate(it.path, working, base); it.stepFails = fails; it.status = 'done';
        it.include = !!(it.v && it.v.ok) && fails === 0 && working !== base;
      } catch (e) { it.status = 'error'; it.err = e.message; }
      draw();
    }
    async function agentApplyAll() {
      // save only the ticked files, and only ones that passed every check
      const good = ((agent && agent.results) || []).filter(r => r.include && r.status === 'done' && r.text && (!r.v || r.v.ok) && !r.stepFails);
      if (!good.length) return;                      // the Save button is disabled in this case
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const edited = [], created = [], unbacked = [];
      let bdir = null;
      for (const r of good) {
        if (r.action === 'edit') {
          try {
            bdir = bdir || await dir.getDirectoryHandle('_forge_backups', { create: true });
            const bh = await bdir.getFileHandle(stamp + '__' + r.path.replace(/\//g, '__'), { create: true });
            const bw = await bh.createWritable(); await bw.write(r.base || ''); await bw.close();
            edited.push(r.path);
          } catch (e) {
            const go = await ask({ tone: 'danger', title: `Couldn't back up ${r.path}`,
              body: `<p>${EMBER.esc(e.message || String(e))}.</p><p>Without a backup, Undo can't restore this file.</p>`,
              confirm: 'Save without a backup', cancel: 'Skip this file' });
            if (!go) continue;
            unbacked.push(r.path);
          }
        } else created.push(r.path);
        const fh = await fileHandle(r.path, true);
        const w = await fh.createWritable(); await w.write(scrubFences(r.text)); await w.close();
      }
      const written = [...edited, ...created, ...unbacked];
      if (!written.length) return;
      const hist = Store.get('forge.hist', []);
      written.forEach(p => hist.unshift({ t: new Date().toLocaleString([], { hour12: false }), path: p, note: (created.includes(p) ? 'created · ' : 'agent · ') + agent.goal.slice(0, 46) }));
      Store.set('forge.hist', hist.slice(0, 40));
      lastApply = { stamp, edited, created };
      files = await listFiles();
      const savedPaths = new Set(written);
      agent.results = agent.results.filter(r => !savedPaths.has(r.path));   // saved files leave the review
      if (!agent.results.length) agent = null;
      savedBanner(written, created, unbacked);
      draw();
    }

    async function generate(reqText, fix) {
      if (!cur) return;
      const st = window.EMBER.llmStatus;
      if (!st || !st.online) { tell(...OFFLINE); return; }
      // Content-add requests belong in the DATA file, not the renderer. Editing the
      // renderer for content is what produced broken/duplicated "sections" before.
      const target = DATA_FOR[cur];
      if (!fix && target && files.includes(target) && CONTENT_RE.test(reqText)) {
        const sw = await ask({ title: 'This sounds like a content change',
          body: `<p>That information lives in <code>${EMBER.esc(target)}</code>. <code>${EMBER.esc(cur)}</code> only displays it, and editing it to add content usually breaks or duplicates things.</p>`,
          confirm: `Edit ${target} instead`, cancel: `Edit ${cur} anyway` });
        if (sw) {
          await openFile(target);            // cur/curText now point at the data file
        }
      }
      const mdl = currentModel();
      proposal = { text: '', busy: true, req: reqText }; draw();
      const sys = { role: 'system', content: buildSys(cur) };
      let userContent = `TARGET FILE: ${cur}\n\nCURRENT CONTENTS:\n\`\`\`\n${curText}\n\`\`\`\n\nCHANGE REQUEST: ${reqText}\n\nReturn the full updated ${cur} as one fenced code block.`;
      if (fix) userContent += `\n\nYour previous attempt FAILED the syntax check with this error:\n${fix.msg}\n\nHere is the broken output you produced:\n\`\`\`\n${fix.broken}\n\`\`\`\n\nReturn the COMPLETE corrected ${cur} as one fenced code block — fix the syntax error, keep the intended change, and do not truncate.`;
      const user = { role: 'user', content: userContent };
      const bodyEl = () => root.querySelector('#fg-gen');
      try {
        let raw = '';
        await LLM.chat([sys, user], (tok) => { raw += tok; const g = bodyEl(); if (g) { g.textContent = raw.slice(-1400); g.scrollTop = g.scrollHeight; } }, { model: mdl, temperature: 0.2, num_ctx: ctxFor(userContent.length), num_predict: -1 });
        proposal = { text: extractCode(raw), busy: false, req: reqText };
      } catch (e) { proposal = { text: '', busy: false, error: e.message, req: reqText }; }
      draw();
    }
    // Robustly pull file text out of a model response. Handles: a clean fenced
    // block; a block whose CLOSING fence was truncated/missing (the bug that
    // corrupted kb.js); an inner fenced block; or no fence at all. Never returns
    // a string that still starts/ends with a ``` fence.
    function extractCode(s) {
      let t = (s || '').trim();
      const open = t.match(/^```[a-zA-Z0-9]*[ \t]*\r?\n/);
      if (open) {                                   // whole output is (or starts as) a fenced block
        t = t.slice(open[0].length);
        t = t.replace(/\r?\n?```[a-zA-Z0-9]*[ \t]*$/, '');   // drop trailing fence if present
      } else {
        const inner = t.match(/```[a-zA-Z0-9]*[ \t]*\r?\n([\s\S]*?)```/);
        if (inner) t = inner[1];
      }
      // final guard: strip any stray leading/trailing fence lines left behind
      t = t.replace(/^```[a-zA-Z0-9]*[ \t]*\r?\n/, '').replace(/\r?\n?```[a-zA-Z0-9]*[ \t]*$/, '');
      return t.replace(/\s+$/, '');
    }
    // absolute last-resort guard used right before writing to disk
    function scrubFences(t) {
      return String(t == null ? '' : t)
        .replace(/^\s*```[a-zA-Z0-9]*[ \t]*\r?\n/, '')
        .replace(/\r?\n?```[a-zA-Z0-9]*[ \t]*\s*$/, '');
    }

    // parse the parameter size (in billions) from a model tag, e.g. "llama3.1:8b" -> 8
    function modelParams(name) {
      if (!name) return 0;
      const m = name.toLowerCase().match(/:(\d+(?:\.\d+)?)b\b/) || name.toLowerCase().match(/\b(\d+(?:\.\d+)?)b\b/);
      return m ? parseFloat(m[1]) : 0;
    }
    // short note about what a file is for — steers edits to the right file.
    function fileRole(path) {
      const roles = {
        'js/survival.js': 'This <b>renders</b> the Survival guides. To <b>add or edit guide content</b> (including Food info sections), edit <b>data/kb.js</b> instead — add objects to its KB array.',
        'js/reference.js': 'This renders the Reference tools. Its content (Morse, knots, radiation…) lives in <b>data/ref.js</b>.',
        'js/fieldguide.js': 'This renders the Field Guide. Its content (plants, mushrooms, meds) lives in <b>data/guide.js</b>.',
        'data/kb.js': 'Survival guide <b>content</b> — the KB array of { id, cat, title, tags, html }. Add new information sections here; use an existing category like <code>Food</code> for the filter.',
        'data/ref.js': 'Reference <b>content</b> — Morse, phonetic, knots, frequencies, constants, radiation data.',
        'data/guide.js': 'Field-guide <b>content</b> — the PLANTS, MUSHROOMS and MEDS arrays.',
      };
      return roles[path] || '';
    }
    // pick the best default model for writing code: coding-tuned first, then largest.
    function pickCodeModel(models, fallback) {
      if (!models || !models.length) return fallback || '';
      const score = (n) => {
        const s = n.toLowerCase();
        let x = modelParams(n);                                  // more params = better, roughly
        if (/cod(er|e)|deepseek|starcoder|qwen.*cod/.test(s)) x += 100;   // coding-tuned models win
        return x;
      };
      return models.slice().sort((a, b) => score(b) - score(a))[0] || fallback || '';
    }

    function checkSyntax(path, text) {
      try {
        if (path.endsWith('.js')) new Function(text);           // throws on syntax error
        else if (path.endsWith('.json') || path.endsWith('.webmanifest')) JSON.parse(text);
        return { ok: true };
      } catch (e) { return { ok: false, msg: e.message }; }
    }

    // Runtime smoke-test: actually load a proposed MODULE file into a detached,
    // invisible node and run its render() — this catches errors that a syntax
    // check cannot (e.g. querySelector on null), BEFORE anything touches disk.
    function smokeTest(path, text) {
      // only self-registering module files are safe to execute here
      if (path === 'js/app.js' || path === 'js/store.js' || path === 'js/llm.js') return { ok: true, skipped: true };
      if (!/EMBER_MODULES/.test(text)) return { ok: true, skipped: true };
      const saved = window.EMBER_MODULES;
      try {
        const probe = saved.slice();
        window.EMBER_MODULES = probe;
        const before = probe.length;
        (0, eval)(text);                                        // registers the candidate module(s)
        const added = probe.slice(before);
        if (!added.length) return { ok: true };                 // nothing registered — treat as syntax-only
        const holder = document.createElement('div');           // detached: never added to the page
        for (const m of added) { if (m && typeof m.render === 'function') m.render(holder); }
        return { ok: true };
      } catch (e) {
        return { ok: false, msg: (e && e.message) || String(e) };
      } finally {
        window.EMBER_MODULES = saved;                           // always restore the real registry
      }
    }

    // Guard the app shell: index.html must keep its structure and never DROP a
    // script it already loads (the agent once blanked the whole app by rewriting it).
    function checkHtml(text, base) {
      for (const id of ['id="app"', 'id="view"', 'id="nav"']) {
        if (!text.includes(id)) return { ok: false, msg: 'the app shell element ' + id + ' is missing — this would blank the whole app.' };
      }
      if (!/js\/app\.js/.test(text)) return { ok: false, msg: 'js/app.js (the shell that boots EMBER) is no longer loaded — this would blank the whole app.' };
      if (base) {
        const srcs = (t) => Array.from(t.matchAll(/<script[^>]*src="([^"]+)"/g)).map(m => m[1]);
        const after = new Set(srcs(text));
        const dropped = srcs(base).filter(s => !after.has(s));
        if (dropped.length) return { ok: false, msg: 'these scripts were removed: ' + dropped.join(', ') + '. index.html edits may only ADD scripts, never drop them.' };
      }
      return { ok: true };
    }

    // Full gate: syntax → html-shell → live render. Returns {ok, stage, msg, skipped}.
    function validate(path, text, base) {
      const syn = checkSyntax(path, text);
      if (!syn.ok) return { ok: false, stage: 'syntax', msg: syn.msg };
      if (/\.html$/.test(path)) { const h = checkHtml(text, base); if (!h.ok) return { ok: false, stage: 'html', msg: h.msg }; }
      const sm = smokeTest(path, text);
      if (!sm.ok) return { ok: false, stage: 'render', msg: sm.msg };
      return { ok: true, skipped: sm.skipped };
    }

    async function apply() {
      if (!proposal || !cur) return;
      const v = validate(cur, proposal.text, curText);
      if (!v.ok) {
        const what = v.stage === 'render' ? 'crashes when it runs' : v.stage === 'html' ? 'would blank the whole app' : 'has a syntax error';
        const go = await ask({ tone: 'danger', title: `This change ${what}`,
          body: `<p class="mono fgd-err">${EMBER.esc(v.msg)}</p><p>Saving it can stop this page, or all of EMBER, from loading. You could undo it afterwards, but regenerating is safer.</p>`,
          confirm: 'Save anyway', cancel: 'Keep reviewing' });
        if (!go) return;
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      let backed = true;
      try {
        const bdir = await dir.getDirectoryHandle('_forge_backups', { create: true });
        const bh = await bdir.getFileHandle(stamp + '__' + cur.replace(/\//g, '__'), { create: true });
        const bw = await bh.createWritable(); await bw.write(curText); await bw.close();
      } catch (e) {
        const go = await ask({ tone: 'danger', title: `Couldn't back up ${cur}`,
          body: `<p>${EMBER.esc(e.message || String(e))}.</p><p>Without a backup, Undo can't restore this file.</p>`,
          confirm: 'Save without a backup', cancel: 'Cancel' });
        if (!go) return;
        backed = false;
      }
      const fh = await fileHandle(cur, true);
      const w = await fh.createWritable(); await w.write(scrubFences(proposal.text)); await w.close();
      const hist = Store.get('forge.hist', []);
      hist.unshift({ t: new Date().toLocaleString([], { hour12: false }), path: cur, note: proposal.note || '' });
      Store.set('forge.hist', hist.slice(0, 40));
      lastApply = { stamp, edited: backed ? [cur] : [], created: [] };
      savedBanner([cur], [], backed ? [] : [cur]);
      curText = proposal.text; proposal = null;
      draw();
    }

    // ── views ──
    function draw() {
      upgradeModelPin();          // keep Forge on the best coding model, never a tiny one
      if (!supported) {
        root.innerHTML = `<div class="callout danger" style="max-width:640px">FORGE needs the File System Access API, which this browser doesn't support. Use <b>Chrome, Edge, or Brave</b> to let EMBER edit its own files. (Everything else in EMBER works in any browser.)</div>`;
        return;
      }
      if (!dir || !files.length) {
        root.innerHTML = `
        <div class="card" style="max-width:660px">
          <div class="eyebrow">Self-improvement</div>
          <h3 style="font-size:16px">Let EMBER rewrite its own code</h3>
          <p class="muted" style="margin:8px 0 14px">Describe a change in plain language; the <b>local LLM</b> rewrites the file; you review a diff and save it straight to disk. No coding, no internet, no external tools. Every save first copies the old file into <code>_forge_backups/</code> so you can always undo.</p>
          <button class="btn primary" id="fg-connect"><svg viewBox="0 0 24 24"><path d="M3 7h5l2-2h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/></svg>${restored ? 'Reconnect EMBER\'s folder' : 'Connect EMBER\'s folder'}</button>
          <div id="fg-connect-msg"></div>
          <div class="callout" style="margin-top:14px">${restored
            ? 'EMBER <b>remembers your folder</b> — Chrome just forgets file permission after you close all tabs. One click re-grants it (you may see a quick "Edit files?" prompt — click <b>Allow / Edit files</b>).'
            : 'Pick the <b>EMBER</b> folder itself (the one with index.html). When asked, choose <b>Edit files / Allow</b> (not "View only"). It reconnects with one click next time.'}</div>
          <div class="callout danger" style="margin-top:10px">FORGE can edit any file, including core ones. Edits from a small local model can break things — that's what the on-disk backups + Revert are for. Keep a copy of the whole folder somewhere safe too.</div>
        </div>`;
        root.querySelector('#fg-connect').onclick = connect;
        return;
      }

      const fileList = files.map(p => `<button class="fg-file ${p === cur ? 'on' : ''}" data-p="${EMBER.esc(p)}">${EMBER.esc(p)}</button>`).join('');
      const hist = Store.get('forge.hist', []);
      root.innerHTML = `
      ${drawBanner()}
      ${drawAgentPanel()}
      <details class="fg-advanced" ${cur ? 'open' : ''}>
        <summary>Advanced — browse &amp; edit one file at a time${hist.length ? ` · ${hist.length} recent edit${hist.length === 1 ? '' : 's'}` : ''}</summary>
        <div class="fg-grid">
          <div class="card fg-side">
            <div class="row" style="justify-content:space-between;margin-bottom:8px">
              <div class="eyebrow" style="margin:0">Files</div>
              <button class="btn sm ghost" id="fg-refresh" title="Rescan">↻</button>
            </div>
            <div class="fg-files">${fileList}</div>
            <div class="row" style="margin-top:10px"><button class="btn sm ghost" id="fg-new">+ New file</button></div>
            ${hist.length ? `<div class="eyebrow" style="margin:16px 0 6px">Recent edits</div>
              <div class="fg-hist">${hist.slice(0, 8).map(h => `<div class="fg-h"><b>${EMBER.esc(h.path)}</b><span class="dim">${EMBER.esc(h.t)}</span></div>`).join('')}</div>` : ''}
          </div>
          <div class="fg-main">
            ${!cur ? `<div class="empty">Pick a file to edit it directly. For most changes, use the agent above instead.</div>` : `
            <div class="card" style="margin-bottom:12px">
              <div class="row" style="justify-content:space-between;margin-bottom:8px">
                <div class="mono" style="color:var(--amber-2)">${EMBER.esc(cur)}</div>
                <span class="dim mono" style="font-size:11px">${curText.length} chars</span>
              </div>
              ${fileRole(cur) ? `<div class="callout" style="margin-bottom:10px;font-size:12.5px">${fileRole(cur)}</div>` : ''}
              <textarea id="fg-req" rows="3" placeholder="Describe the change to THIS file… e.g. 'fix the bug where…' or 'make the amber accent cooler'"></textarea>
              <div class="row" style="margin-top:10px;flex-wrap:wrap">
                <button class="btn primary sm" id="fg-gen-btn"><svg viewBox="0 0 24 24"><path d="M12 2l2.4 7.2H22l-6 4.4 2.3 7.2L12 16.4 5.7 20.8 8 13.6 2 9.2h7.6z"/></svg>Generate change</button>
                <button class="btn sm ghost" id="fg-view">View current</button>
                <button class="btn sm ghost" id="fg-revert" title="Restore the newest backup of this file">Revert last</button>
              </div>
            </div>
            <div id="fg-out"></div>`}
          </div>
        </div>
      </details>`;

      wireBanner();
      wireAgent();
      root.querySelectorAll('.fg-file').forEach(b => b.onclick = () => openFile(b.dataset.p));
      const refreshBtn = root.querySelector('#fg-refresh'); if (refreshBtn) refreshBtn.onclick = async () => { files = await listFiles(); draw(); };
      const newBtn = root.querySelector('#fg-new'); if (newBtn) newBtn.onclick = newFile;
      if (cur) {
        root.querySelector('#fg-gen-btn').onclick = () => generate(root.querySelector('#fg-req').value.trim());
        root.querySelector('#fg-view').onclick = () => { proposal = { view: true }; drawOut(); };
        root.querySelector('#fg-revert').onclick = revert;
        drawOut();
      }
    }

    function drawOut() {
      const out = root.querySelector('#fg-out'); if (!out) return;
      if (!proposal) { out.innerHTML = ''; return; }
      if (proposal.view) { out.innerHTML = `<div class="card"><div class="eyebrow">Current — ${EMBER.esc(cur)}</div><pre class="fg-code">${EMBER.esc(curText)}</pre></div>`; return; }
      if (proposal.busy) { out.innerHTML = `<div class="card"><div class="eyebrow">Generating (local model)…</div><pre class="fg-code" id="fg-gen"></pre></div>`; return; }
      if (proposal.error) { out.innerHTML = `<div class="callout danger">Generation failed: ${EMBER.esc(proposal.error)}</div>`; return; }
      const v = validate(cur, proposal.text, curText);
      const d = lineDiff(curText, proposal.text);
      out.innerHTML = `<article class="card fg-rev ${v.ok ? '' : 'bad'}">
        <header class="fg-rev-head">
          <span class="fg-path mono">${EMBER.esc(cur)}</span>
          <span class="fg-badge">proposed change</span>
          <span class="fg-stat mono"><span class="add">+${d.add}</span> <span class="del">&minus;${d.del}</span></span>
          <span class="fg-state ${v.ok ? 'go' : 'danger'}">${v.ok ? 'ready to save' : "don't save this"}</span>
        </header>
        ${checkRows(cur, v)}
        <details class="fg-diffwrap" open><summary>Changes</summary>${d.html}</details>
        <div class="fg-rev-foot">
          <button class="btn primary sm" id="fg-apply"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${v.ok ? 'Save to disk' : 'Save anyway'}</button>
          ${v.ok ? '' : `<button class="btn sm" id="fg-regen" title="Send the error back to the model and ask it to fix the code">Regenerate and fix</button>`}
          <button class="btn sm ghost" id="fg-discard">Discard</button>
          <span class="dim fg-hint">${v.ok ? 'The current file is backed up first, and you can undo the save.' : 'Regenerating sends the error back to the model.'}</span>
        </div></article>`;
      root.querySelector('#fg-apply').onclick = apply;
      root.querySelector('#fg-discard').onclick = () => { proposal = null; drawOut(); };
      const regen = root.querySelector('#fg-regen');
      if (regen) regen.onclick = () => generate(proposal.req || 'Apply the previously requested change.', { msg: v.msg, broken: proposal.text });
    }

    // ── agent UI ──
    function drawAgentPanel() {
      if (!agent) {
        const st = window.EMBER.llmStatus || {};
        const models = st.models || [];
        const selModel = Store.get('forge.model', pickCodeModel(models, st.model || ''));
        const small = modelParams(selModel) && modelParams(selModel) < 7;
        const modelSel = models.length
          ? `<label class="fg-model-wrap dim">Model <select id="fg-model" class="fg-model" title="Local model Forge uses to write code">${models.map(m => `<option ${m === selModel ? 'selected' : ''}>${EMBER.esc(m)}</option>`).join('')}</select></label>`
          : `<span class="pill danger">LLM offline</span>`;
        const viewSel = `<select id="ag-view" class="fg-model" title="View a file's current contents"><option value="">View current file…</option>${files.map(p => `<option value="${EMBER.esc(p)}">${EMBER.esc(p)}</option>`).join('')}</select>`;
        return `<div class="card ag-card ag-hero">
          <div class="eyebrow" style="margin:0">Ask Forge to change EMBER</div>
          <div class="dim" style="font-size:12.5px;margin-top:4px">Describe anything — add information, add a tool, fix a bug, change a colour. Forge finds the right files, edits them, checks them, and shows every change before it saves.</div>
          <textarea id="ag-goal" rows="3" style="margin-top:12px" placeholder="e.g. 'add extra info under Security', 'add a tide-time estimator tool to the sidebar', 'make the amber accent warmer'"></textarea>
          <div class="row" style="margin-top:12px;flex-wrap:wrap;align-items:center;gap:10px">
            <button class="btn primary" id="ag-plan"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>Plan &amp; build</button>
            ${modelSel}
          </div>
          <div class="row" style="margin-top:10px;flex-wrap:wrap;align-items:center;gap:10px">
            ${viewSel}
            <button class="btn sm ghost" id="ag-revert" title="Undo Forge's most recent change by restoring its backup">Revert last edit</button>
          </div>
          <div id="ag-view-out"></div>
          ${models.length ? `<div class="${small ? 'callout danger' : 'dim'}" style="font-size:11.5px;margin-top:10px${small ? '' : ';padding:0'}">${small ? '<b>Selected model is small (~' + modelParams(selModel) + 'B)</b> — likely to write broken code. Pick a bigger one (e.g. llama3.1:8b) above for reliable edits.' : 'Forge plans first, and never saves a file that fails its syntax + runtime checks. Bigger models (8B+) write cleaner code.'}</div>` : '<div class="callout danger" style="font-size:12px;margin-top:10px">Start Ollama and pull a model (see Advisor) — Forge needs a local model to write code.</div>'}
        </div>`;
      }
      if (agent.phase === 'planning') {
        return `<div class="card ag-card"><div class="eyebrow">Planning — ${EMBER.esc(agent.goal)}</div>
          <pre class="fg-code" id="ag-stream" style="margin-top:8px;max-height:150px">${EMBER.esc(agent.planText || '')}</pre></div>`;
      }
      if (agent.phase === 'plan-fail') {
        return `<div class="card ag-card"><div class="callout danger">Couldn't produce a plan${agent.error ? ': ' + EMBER.esc(agent.error) : ''}. Rephrase the goal, or use single-file mode below.</div>
          <div class="row" style="margin-top:10px"><button class="btn sm ghost" id="ag-cancel">Back</button></div></div>`;
      }
      if (agent.phase === 'plan') {
        const n = agent.steps.filter(s => s.include).length;
        const nFiles = new Set(agent.steps.filter(s => s.include).map(s => s.file)).size;
        return `<div class="card ag-card"><div class="row" style="justify-content:space-between"><div class="eyebrow" style="margin:0">Plan · ${EMBER.esc(agent.goal)}</div><span class="dim mono" style="font-size:11px">model: ${EMBER.esc(Store.get('forge.model', ''))}</span></div>
          <div class="dim" style="font-size:12px;margin:6px 0 10px">Ordered steps — each is applied and <b>validated on its own</b>. Uncheck any to skip. ${nFiles < agent.steps.length ? 'Some files get several small steps instead of one big rewrite.' : ''}</div>
          <div class="ag-plan">${agent.steps.map((s, i) => `
            <label class="ag-plan-row"><input type="checkbox" data-step="${i}" ${s.include ? 'checked' : ''}>
              <span class="ag-stepno">${i + 1}</span>
              <span class="pill ${s.action === 'create' ? 'go' : ''}">${s.action}</span>
              <b class="mono">${EMBER.esc(s.file)}</b>
              <span class="dim" style="font-size:12px">${EMBER.esc(s.step)}</span></label>`).join('')}</div>
          <div class="row" style="margin-top:12px;flex-wrap:wrap">
            <button class="btn primary sm" id="ag-build">Build ${n} step${n === 1 ? '' : 's'}</button>
            <button class="btn sm ghost" id="ag-cancel">Cancel</button></div></div>`;
      }
      if (agent.phase === 'building') {
        return `<div class="card ag-card"><div class="eyebrow">Building — ${EMBER.esc(agent.goal)}</div>
          <div style="margin-top:8px">${agent.stepRuns.map((s, i) => `
            <div class="ag-res ${s.status}" id="ag-res-${i}">
              <div class="row" style="justify-content:space-between;gap:8px"><b style="min-width:0"><span class="ag-stepno">${i + 1}</span> <span class="mono">${EMBER.esc(s.file)}</span> <span class="dim" style="font-weight:400">${EMBER.esc(s.step)}</span></b><span class="dim" style="font-size:12px;flex:0 0 auto">${s.status}</span></div>
              <pre class="fg-code" id="ag-stream-${i}" style="max-height:60px;margin-top:6px">${EMBER.esc(s.stream || '')}</pre></div>`).join('')}</div></div>`;
      }
      if (agent.phase === 'review') {
        const rs = agent.results;
        const ready = rs.filter(r => r.status === 'done' && r.v && r.v.ok && !r.stepFails);
        const busy = rs.filter(r => r.status === 'working').length;
        const failing = rs.length - ready.length - busy;
        const nSel = rs.filter(r => r.include).length;
        const many = rs.length !== 1;
        const summary = !rs.length ? "Forge didn't change any files."
          : failing ? `${failing} of ${rs.length} file${many ? 's' : ''} failed a check. ${failing === 1 ? 'It' : 'They'} can't be saved until you redo ${failing === 1 ? 'it' : 'them'}.`
          : busy ? 'Redoing a file…'
          : `Forge changed ${rs.length} file${many ? 's' : ''}, and ${many ? 'all of them' : 'it'} passed every check.`;
        return `<section class="card ag-card fg-review" aria-labelledby="fg-review-h">
          <div class="fg-review-head">
            <div style="min-width:0">
              <div class="eyebrow" style="margin:0">Review before saving</div>
              <h3 id="fg-review-h" class="fg-goal">${EMBER.esc(agent.goal)}</h3>
              <p class="fg-sum">${summary}</p>
            </div>
            <span class="dim mono fg-model-tag" title="Model that wrote these changes">${EMBER.esc(Store.get('forge.model', ''))}</span>
          </div>
          <div class="fg-revlist">${rs.map((r, i) => agentReviewCard(r, i)).join('')}</div>
          <div class="fg-review-foot">
            <button class="btn primary" id="ag-apply" ${nSel ? '' : 'disabled'}><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg><span id="ag-apply-l">Save ${nSel} file${nSel === 1 ? '' : 's'}</span></button>
            <button class="btn ghost" id="ag-cancel">Discard all</button>
            <span class="dim fg-hint">Edited files are backed up before anything is written, and the save can be undone. <kbd>&#8984;</kbd><kbd>&#8629;</kbd> saves.</span>
          </div></section>`;
      }
      return '';
    }
    function agentReviewCard(r, i) {
      if (r.status === 'error') return `<article class="fg-rev bad"><header class="fg-rev-head"><span class="fg-path mono">${EMBER.esc(r.path)}</span><span class="fg-state danger">failed to generate</span></header>
        <p class="fg-err">${EMBER.esc(r.err || 'The model returned nothing usable.')}</p>
        <div class="fg-rev-foot"><button class="btn sm" data-agregen="${i}">Redo this file</button></div></article>`;
      if (r.status === 'working') return `<article class="fg-rev"><header class="fg-rev-head"><span class="fg-path mono">${EMBER.esc(r.path)}</span><span class="fg-state">redoing…</span></header><pre class="fg-code" id="ag-stream-${i}" style="max-height:60px;margin-top:6px">${EMBER.esc(r.stream || '')}</pre></article>`;
      const ok = r.v && r.v.ok && !r.stepFails;
      const d = lineDiff(r.base || '', r.text || '');
      const nSteps = (r.steps && r.steps.length) || 0;
      return `<article class="fg-rev ${r.include ? 'sel' : ''} ${ok ? '' : 'bad'}">
        <header class="fg-rev-head">
          <label class="fg-pick"><input type="checkbox" data-apply="${i}" ${r.include ? 'checked' : ''} ${ok ? '' : 'disabled'} aria-describedby="fg-st-${i}">
            <span class="fg-path mono">${EMBER.esc(r.path)}</span></label>
          <span class="fg-badge">${r.action === 'create' ? 'new file' : 'edited'}${nSteps > 1 ? ' · ' + nSteps + ' steps' : ''}</span>
          <span class="fg-stat mono" aria-label="${d.add} lines added, ${d.del} removed"><span class="add">+${d.add}</span> <span class="del">&minus;${d.del}</span></span>
          <span class="fg-state ${ok ? 'go' : 'danger'}" id="fg-st-${i}">${ok ? (r.include ? 'will be saved' : 'not selected') : "can't be saved"}</span>
        </header>
        ${checkRows(r.path, r.v, r.stepFails, nSteps)}
        <details class="fg-diffwrap" ${i === 0 || d.add + d.del <= 40 ? 'open' : ''}><summary>Changes</summary>${d.html}</details>
        <div class="fg-rev-foot"><button class="btn sm ${ok ? 'ghost' : ''}" data-agregen="${i}">${ok ? 'Redo this file' : 'Redo and fix'}</button></div>
      </article>`;
    }
    async function revertLast() {
      try {
        const bdir = await dir.getDirectoryHandle('_forge_backups');
        const entries = [];
        for await (const [name, h] of bdir.entries()) entries.push([name, h]);
        if (!entries.length) return tell('Nothing to revert', '<p>Forge hasn\'t backed up any files yet.</p>');
        entries.sort((a, b) => a[0] < b[0] ? 1 : -1);                 // newest first
        const newestStamp = entries[0][0].split('__')[0];
        const batch = entries.filter(([n]) => n.split('__')[0] === newestStamp);
        const paths = batch.map(([n]) => n.split('__').slice(1).join('/'));
        const when = newestStamp.slice(0, 10) + ' ' + newestStamp.slice(11, 19).replace(/-/g, ':');
        const yes = await ask({ title: `Revert ${paths.length === 1 ? 'this file' : paths.length + ' files'}?`,
          body: `<p>Restores the backup Forge made at <b>${EMBER.esc(when)}</b> UTC, just before its last save.</p>`,
          list: paths, confirm: 'Revert', cancel: 'Cancel' });
        if (!yes) return;
        for (const [name, h] of batch) {
          const path = name.split('__').slice(1).join('/');
          const text = await (await h.getFile()).text();
          const fh = await fileHandle(path, true); const w = await fh.createWritable(); await w.write(text); await w.close();
        }
        files = await listFiles(); if (cur && paths.includes(cur)) curText = await readFileText(cur);
        lastApply = null;
        banner = { title: `Reverted ${paths.length} file${paths.length === 1 ? '' : 's'}`, body: 'Reload to run the restored code.',
          actions: [{ label: 'Reload EMBER', primary: true, run: () => location.reload() }] };
        draw();
      } catch (e) {
        if (e && e.name === 'NotFoundError') return tell('Nothing to revert', '<p>Forge hasn\'t backed up any files yet.</p>');
        tell('Revert failed', `<p>${EMBER.esc(e && e.message ? e.message : String(e))}</p>`);
      }
    }
    async function viewFileInline(path) {
      const out = root.querySelector('#ag-view-out'); if (!out) return;
      if (!path) { out.innerHTML = ''; return; }
      try {
        const text = await readFileText(path);
        out.innerHTML = `<div class="card" style="margin-top:10px"><div class="row" style="justify-content:space-between;margin-bottom:6px"><div class="eyebrow" style="margin:0">Current — ${EMBER.esc(path)}</div><span class="dim mono" style="font-size:11px">${text.length} chars</span></div><pre class="fg-code">${EMBER.esc(text)}</pre></div>`;
      } catch (e) { out.innerHTML = `<div class="callout danger" style="margin-top:10px">Couldn't read ${EMBER.esc(path)}: ${EMBER.esc(e.message || e)}</div>`; }
    }
    function wireAgent() {
      if (!agent) {
        const b = root.querySelector('#ag-plan');
        if (b) b.onclick = () => { const g = (root.querySelector('#ag-goal').value || '').trim(); if (g) agentPlan(g); };
        const ms = root.querySelector('#fg-model'); if (ms) ms.onchange = () => Store.set('forge.model', ms.value);
        const vw = root.querySelector('#ag-view'); if (vw) vw.onchange = () => viewFileInline(vw.value);
        const rv = root.querySelector('#ag-revert'); if (rv) rv.onclick = revertLast;
        return;
      }
      const cancel = root.querySelector('#ag-cancel');
      if (cancel) cancel.onclick = async () => {
        if (agent.phase === 'review' && agent.results.length) {
          const yes = await ask({ title: 'Discard these changes?', body: '<p>Nothing has been written to disk. The generated changes are thrown away.</p>', confirm: 'Discard', cancel: 'Keep reviewing' });
          if (!yes) return;
        }
        agent = null; draw();
      };
      const build = root.querySelector('#ag-build'); if (build) build.onclick = agentBuild;
      const apply = root.querySelector('#ag-apply'); if (apply) apply.onclick = agentApplyAll;
      root.querySelectorAll('[data-step]').forEach(cb => cb.onchange = () => {
        agent.steps[+cb.dataset.step].include = cb.checked;
        const bb = root.querySelector('#ag-build'); const n = agent.steps.filter(s => s.include).length;
        if (bb) bb.textContent = 'Build ' + n + ' step' + (n === 1 ? '' : 's');
      });
      root.querySelectorAll('[data-apply]').forEach(cb => cb.onchange = () => {
        const i = +cb.dataset.apply;
        agent.results[i].include = cb.checked;
        const n = agent.results.filter(r => r.include).length;
        const ap = root.querySelector('#ag-apply'), lbl = root.querySelector('#ag-apply-l');
        if (lbl) lbl.textContent = `Save ${n} file${n === 1 ? '' : 's'}`;
        if (ap) ap.disabled = !n;
        const st = root.querySelector('#fg-st-' + i); if (st) st.textContent = cb.checked ? 'will be saved' : 'not selected';
        cb.closest('.fg-rev')?.classList.toggle('sel', cb.checked);
      });
      root.querySelectorAll('[data-agregen]').forEach(b => b.onclick = () => agentRegen(+b.dataset.agregen));
    }

    // minimal line diff (LCS-lite: mark lines that differ)
    function makeDiff(a, b) {
      const A = a.split('\n'), B = b.split('\n');
      const setB = new Set(B), setA = new Set(A);
      const rows = [];
      let i = 0, j = 0;
      // naive: show removed (in A not B) and added (in B not A), keeping order of B
      const bAdded = B.map(l => ({ l, add: !setA.has(l) }));
      const aRemoved = A.filter(l => !setB.has(l));
      aRemoved.slice(0, 120).forEach(l => rows.push(`<div class="dl del">- ${EMBER.esc(l)}</div>`));
      bAdded.slice(0, 400).forEach(o => rows.push(`<div class="dl ${o.add ? 'add' : 'ctx'}">${o.add ? '+ ' : '  '}${EMBER.esc(o.l)}</div>`));
      const added = bAdded.filter(o => o.add).length;
      return `<div class="dim mono" style="font-size:11px;margin-bottom:6px">~${aRemoved.length} removed · ${added} added/changed</div>` + rows.join('');
    }

    async function newFile() {
      const name = await ask({ title: 'New file', body: '<p>A path inside the EMBER folder.</p>', input: { label: 'Path', placeholder: 'js/mymodule.js' }, confirm: 'Create', cancel: 'Cancel' });
      if (!name) return;
      try { const fh = await fileHandle(name, true); const w = await fh.createWritable(); await w.write('// ' + name + '\n'); await w.close(); files = await listFiles(); openFile(name); }
      catch (e) { tell("Couldn't create the file", `<p>${EMBER.esc(e.message)}</p>`); }
    }

    async function revert() {
      try {
        const bdir = await dir.getDirectoryHandle('_forge_backups');
        const flat = cur.replace(/\//g, '__');
        let newest = null, newestName = '';
        for await (const [name, h] of bdir.entries()) { if (name.endsWith('__' + flat) && name > newestName) { newestName = name; newest = h; } }
        if (!newest) return tell('No backup for this file', `<p>Forge hasn't saved <code>${EMBER.esc(cur)}</code> before, so there's nothing to restore.</p>`);
        const text = await (await newest.getFile()).text();
        const st = newestName.split('__')[0];
        const yes = await ask({ title: `Restore ${cur}?`, body: `<p>Puts back the version Forge backed up at <b>${EMBER.esc(st.slice(0, 10) + ' ' + st.slice(11, 19).replace(/-/g, ':'))}</b> UTC.</p>`, confirm: 'Restore', cancel: 'Cancel' });
        if (!yes) return;
        const fh = await fileHandle(cur, true); const w = await fh.createWritable(); await w.write(text); await w.close();
        curText = text; proposal = null; lastApply = null;
        banner = { title: `Restored ${cur}`, body: 'Reload to run the restored code.', actions: [{ label: 'Reload EMBER', primary: true, run: () => location.reload() }] };
        draw();
      } catch (e) { tell('Revert failed', `<p>${EMBER.esc(e.message)}</p>`); }
    }

    // styles for FORGE (injected once)
    if (!document.getElementById('fg-style')) {
      const s = document.createElement('style'); s.id = 'fg-style';
      s.textContent = `
      .fg-grid{display:grid;grid-template-columns:260px 1fr;gap:14px;align-items:start}
      .fg-side{position:sticky;top:0;max-height:calc(100vh - 82px);overflow:auto}
      .fg-files{display:flex;flex-direction:column;gap:2px;max-height:46vh;overflow:auto}
      .fg-file{text-align:left;font-family:var(--f-mono);font-size:12px;color:var(--t2);padding:6px 8px;border-radius:6px;border:none;background:none}
      .fg-file:hover{background:var(--panel-2);color:var(--t1)}
      .fg-file.on{background:var(--amber-soft);color:#FFDFA6}
      .fg-hist .fg-h{display:flex;justify-content:space-between;gap:8px;font-size:11px;padding:4px 0;border-bottom:1px solid var(--line)}
      .fg-hist .fg-h b{font-family:var(--f-mono);color:var(--t2);font-weight:500}
      .fg-code{font-family:var(--f-mono);font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;max-height:52vh;overflow:auto;color:var(--t2);background:var(--bg-2);border-radius:8px;padding:12px;margin-top:8px}
      .fg-diff{font-family:var(--f-mono);font-size:11.5px;line-height:1.55;max-height:52vh;overflow:auto;background:var(--bg-2);border-radius:8px;padding:10px}
      .fg-diff .dl{white-space:pre-wrap;word-break:break-word;padding:0 4px;border-radius:3px}
      .fg-diff .add{background:rgba(74,222,128,.12);color:#bff5cf}
      .fg-diff .del{background:rgba(248,113,113,.12);color:#f7c3c3}
      .fg-diff .ctx{color:var(--t3)}
      .fg-model{font-family:var(--f-mono);font-size:12px;padding:6px 10px;border-radius:8px;background:var(--bg-2);color:var(--t1);border:1px solid var(--line-2);max-width:210px}
      .btn.is-busy{opacity:.6;pointer-events:none}
      .ag-card{max-width:none;margin-bottom:14px;border-color:rgba(245,158,11,.3)}
      .ag-hero{border-color:rgba(245,158,11,.42);box-shadow:0 0 0 1px rgba(245,158,11,.08),0 10px 30px rgba(0,0,0,.25)}
      .ag-hero textarea{font-size:14px}
      .fg-model-wrap{display:inline-flex;align-items:center;gap:7px;font-size:12px}
      .fg-advanced{margin-top:4px}
      .fg-advanced>summary{cursor:pointer;list-style:none;font-size:12.5px;color:var(--t3);padding:8px 2px;user-select:none}
      .fg-advanced>summary::-webkit-details-marker{display:none}
      .fg-advanced>summary:before{content:'▸ ';color:var(--amber)}
      .fg-advanced[open]>summary:before{content:'▾ '}
      .fg-advanced>summary:hover{color:var(--t1)}
      .ag-plan-row{display:flex;align-items:center;gap:9px;padding:8px 4px;border-bottom:1px solid var(--line)}
      .ag-plan-row:last-child{border-bottom:none}
      .ag-plan-row input{width:16px;height:16px;flex:0 0 auto}
      .ag-stepno{flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:var(--amber-soft);color:#FFDFA6;font-family:var(--f-mono);font-size:10px;font-weight:700}
      .ag-res{border:1px solid var(--line);border-radius:8px;padding:8px 11px;margin-bottom:8px}
      .ag-res.working{border-color:var(--amber)} .ag-res.done{border-color:var(--go)} .ag-res.error{border-color:var(--danger)}
      .ag-rev{border:1px solid var(--line);border-radius:8px;padding:10px 12px;margin-bottom:8px}
      .ag-rev.sel{border-color:rgba(245,158,11,.4);background:rgba(245,158,11,.04)}
      .ag-pick{display:flex;align-items:center;gap:9px;cursor:pointer;min-width:0}
      .ag-pick input{width:16px;height:16px;flex:0 0 auto}
      .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
      /* dialog */
      .fgd-scrim{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(5,4,3,.72);backdrop-filter:blur(3px);animation:fgd-in .14s ease-out}
      .fgd{width:min(480px,100%);background:var(--panel);border:1px solid var(--line-2);border-radius:14px;padding:22px 22px 18px;box-shadow:0 30px 80px rgba(0,0,0,.55)}
      .fgd.danger{border-color:rgba(248,113,113,.35)}
      .fgd-title{font-size:17px;font-weight:600;letter-spacing:-.2px;margin:0 0 8px}
      .fgd-body{color:var(--t2);font-size:14px;line-height:1.55}
      .fgd-body p{margin:0 0 8px}
      .fgd-body code,.fg-banner code{font-family:var(--f-mono);font-size:12.5px;color:var(--t1);background:var(--bg-2);padding:1px 5px;border-radius:4px}
      .fgd-err{color:#f7c3c3;background:rgba(248,113,113,.08);border-radius:6px;padding:8px 10px;font-size:12.5px;word-break:break-word}
      .fgd-list{list-style:none;margin:6px 0 0;padding:8px 10px;background:var(--bg-2);border-radius:8px;font-family:var(--f-mono);font-size:12.5px;color:var(--t1);display:grid;gap:3px}
      .fgd-field{display:grid;gap:6px;margin-top:12px;font-size:12.5px;color:var(--t2);text-transform:none;letter-spacing:0}
      .fgd-field input{font-family:var(--f-mono)}
      .fgd-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px}
      @keyframes fgd-in{from{opacity:0}to{opacity:1}}
      /* status bar */
      .fg-banner{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:12px 14px;margin-bottom:14px;border:1px solid var(--line-2);border-radius:10px;background:var(--panel)}
      .fg-banner.go{border-color:rgba(74,222,128,.32);background:rgba(74,222,128,.05)}
      .fg-banner.danger{border-color:rgba(248,113,113,.35);background:rgba(248,113,113,.05)}
      .fg-banner-text{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:13px;color:var(--t2)}
      .fg-banner-text b{color:var(--t1);font-size:14px}
      .fg-banner-actions{display:flex;align-items:center;gap:8px}
      .fg-x{background:none;border:none;color:var(--t3);font-size:20px;line-height:1;padding:2px 6px;border-radius:6px;cursor:pointer}
      .fg-x:hover{color:var(--t1);background:var(--panel-2)}
      /* review */
      .fg-review{padding:20px}
      .fg-review-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
      .fg-goal{font-size:17px;font-weight:600;letter-spacing:-.2px;margin:6px 0 4px;overflow-wrap:anywhere}
      .fg-sum{margin:0;color:var(--t2);font-size:13.5px}
      .fg-model-tag{font-size:11px;white-space:nowrap;padding-top:2px}
      .fg-revlist{display:grid;gap:10px}
      .fg-rev{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--bg-2)}
      .card.fg-rev{background:var(--panel)}
      .fg-rev.sel{border-color:rgba(245,158,11,.38)}
      .fg-rev.bad{border-color:rgba(248,113,113,.3)}
      .fg-rev-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
      .fg-pick{display:flex;align-items:center;gap:10px;cursor:pointer;min-width:0;text-transform:none;letter-spacing:0;font-size:13px;margin:0;color:var(--t1)}
      .fg-pick input{width:16px;height:16px;flex:0 0 auto;accent-color:var(--amber)}
      .fg-pick input:disabled{cursor:not-allowed}
      .fg-path{font-size:13px;color:var(--t1);overflow-wrap:anywhere}
      .fg-badge{font-size:11px;color:var(--t3);border:1px solid var(--line-2);border-radius:999px;padding:1px 8px}
      .fg-stat{font-size:12px}
      .fg-stat .add{color:var(--go)} .fg-stat .del{color:var(--danger)}
      .fg-state{margin-left:auto;font-size:12px;color:var(--t3)}
      .fg-state.go{color:var(--go)} .fg-state.danger{color:var(--danger)}
      .fg-checks{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:4px}
      .fg-check{display:grid;grid-template-columns:18px 92px 1fr;align-items:baseline;gap:8px;font-size:12.5px}
      .fg-ci svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;transform:translateY(2px)}
      .fg-check.pass .fg-ci{color:var(--go)} .fg-check.fail .fg-ci{color:var(--danger)} .fg-check.skip .fg-ci,.fg-check.wait .fg-ci{color:var(--t3)}
      .fg-cn{color:var(--t1);font-weight:500}
      .fg-cd{color:var(--t2);overflow-wrap:anywhere}
      .fg-check.fail .fg-cd{color:#f7c3c3;font-family:var(--f-mono);font-size:12px}
      .fg-diffwrap{margin-top:10px}
      .fg-diffwrap>summary{cursor:pointer;font-size:12px;color:var(--t3);list-style:none;user-select:none;padding:2px 0}
      .fg-diffwrap>summary::-webkit-details-marker{display:none}
      .fg-diffwrap>summary:before{content:'▸ ';color:var(--amber)}
      .fg-diffwrap[open]>summary:before{content:'▾ '}
      .fg-diffwrap>summary:hover{color:var(--t1)}
      .fg-diff2{margin-top:6px;font-family:var(--f-mono);font-size:12px;line-height:1.6;max-height:46vh;overflow:auto;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:4px 0}
      .fg-diff2 .dh{color:var(--t3);font-size:11px;padding:6px 12px 2px;letter-spacing:.04em}
      .fg-diff2 .dh:not(:first-child){border-top:1px solid var(--line);margin-top:4px}
      .fg-diff2 .dl{display:grid;grid-template-columns:38px 38px 16px 1fr}
      .fg-diff2 .ln{color:var(--t3);text-align:right;padding-right:8px;user-select:none;font-size:11px;opacity:.75}
      .fg-diff2 .sg{user-select:none;text-align:center}
      .fg-diff2 .tx{white-space:pre-wrap;word-break:break-word;padding-right:12px}
      .fg-diff2 .add{background:rgba(74,222,128,.09)} .fg-diff2 .add .sg,.fg-diff2 .add .tx{color:#bff5cf}
      .fg-diff2 .del{background:rgba(248,113,113,.09)} .fg-diff2 .del .sg,.fg-diff2 .del .tx{color:#f7c3c3}
      .fg-diff2 .ctx .tx{color:var(--t3)}
      .fg-nodiff{font-size:12px;margin:6px 0 0}
      .fg-err{color:#f7c3c3;font-size:12.5px;margin:8px 0 0}
      .fg-rev-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:10px}
      .fg-review-foot{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
      .fg-hint{font-size:12px}
      .fg-hint kbd{font-family:var(--f-mono);font-size:11px;border:1px solid var(--line-2);border-bottom-width:2px;border-radius:4px;padding:0 4px;margin-left:2px;color:var(--t2)}
      .btn:disabled{opacity:.45;cursor:not-allowed;filter:none}
      @media(prefers-reduced-motion:reduce){.fgd-scrim{animation:none}}
      @media(max-width:820px){.fg-grid{grid-template-columns:1fr}.fg-side{position:static;max-height:none}.fg-state{margin-left:0;width:100%}.fg-check{grid-template-columns:18px 84px 1fr}}`;
      document.head.appendChild(s);
    }
    draw();        // show the connect screen immediately
    tryRestore();  // then reconnect a previously-granted folder, if any
  }
});
