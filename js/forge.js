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
        alert('The folder picker is blocked here because EMBER was opened as a file, not served.\n\nClose this, double-click serve.command, and open http://localhost:8787 — then Connect will work. (Tip: maximise the browser window first so the folder dialog isn\'t hidden off-screen.)');
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
      if (!st || !st.online) { alert('Local LLM is offline — start Ollama (see Advisor).'); return; }
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
      if (!steps.length) { alert('Select at least one step to build.'); return; }
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
      // apply only the files the user has TICKED (and that pass validation)
      const chosen = (agent.results || []).filter(r => r.include && r.status === 'done' && r.text);
      const good = chosen.filter(r => !r.v || r.v.ok);
      const blockedSel = chosen.filter(r => r.v && !r.v.ok);
      if (!good.length) { alert('Nothing selected to save.\n\nTick the file(s) you want to apply. Failing files must be fixed with “Redo / fix” before they can be saved.'); return; }
      if (blockedSel.length && !confirm(`${good.length} selected file(s) will be SAVED.\n\n${blockedSel.length} selected file(s) still fail validation and will be SKIPPED (not written) so they can't break EMBER:\n${blockedSel.map(b => '• ' + b.path).join('\n')}\n\nSave the ${good.length} good file(s) now?`)) return;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      for (const r of good) {
        try {
          if (r.action === 'edit') {
            const bdir = await dir.getDirectoryHandle('_forge_backups', { create: true });
            const bh = await bdir.getFileHandle(stamp + '__' + r.path.replace(/\//g, '__'), { create: true });
            const bw = await bh.createWritable(); await bw.write(r.base || ''); await bw.close();
          }
        } catch (e) { /* backup best-effort */ }
        const fh = await fileHandle(r.path, true);
        const w = await fh.createWritable(); await w.write(scrubFences(r.text)); await w.close();
      }
      const hist = Store.get('forge.hist', []);
      good.forEach(r => hist.unshift({ t: new Date().toLocaleString([], { hour12: false }), path: r.path, note: (r.action === 'create' ? 'created · ' : 'agent · ') + agent.goal.slice(0, 46) }));
      Store.set('forge.hist', hist.slice(0, 40));
      files = await listFiles();
      const n = good.length;
      const savedPaths = new Set(good.map(r => r.path));
      agent.results = agent.results.filter(r => !savedPaths.has(r.path));   // applied files leave the review
      const remaining = agent.results.length;
      if (!remaining) {
        agent = null; draw();
        setTimeout(() => { if (confirm(`Saved ${n} file(s). Reload EMBER now to run the changes?`)) location.reload(); }, 50);
      } else {
        agent.savedNote = `Saved ${n} file(s) to disk. ${remaining} still here to redo — reload EMBER when you're done to run everything.`;
        draw();
      }
    }

    async function generate(reqText, fix) {
      if (!cur) return;
      const st = window.EMBER.llmStatus;
      if (!st || !st.online) { alert('Local LLM is offline — start Ollama (see Advisor).'); return; }
      // Content-add requests belong in the DATA file, not the renderer. Editing the
      // renderer for content is what produced broken/duplicated "sections" before.
      const target = DATA_FOR[cur];
      if (!fix && target && files.includes(target) && CONTENT_RE.test(reqText)) {
        if (confirm(`This looks like a CONTENT change (adding information / sections).\n\nThat content lives in ${target} — ${cur} only renders it. Editing ${cur} usually produces broken or duplicated results.\n\nSwitch to ${target} and add the content there?  (Recommended)`)) {
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
        const label = v.stage === 'render' ? 'RUNTIME check FAILED — this code crashes when it runs:\n' : v.stage === 'html' ? 'SHELL check FAILED:\n' : 'SYNTAX check FAILED:\n';
        if (!confirm(label + v.msg + '\n\nApply anyway? A broken file can stop that page (or all of EMBER) from loading. You can restore from _forge_backups/ or the Revert button.')) return;
      }
      // 1) back up the current file to _forge_backups/ on disk
      try {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-');
        const bakName = stamp + '__' + cur.replace(/\//g, '__');
        const bdir = await dir.getDirectoryHandle('_forge_backups', { create: true });
        const bh = await bdir.getFileHandle(bakName, { create: true });
        const bw = await bh.createWritable(); await bw.write(curText); await bw.close();
      } catch (e) { if (!confirm('Could not write a backup (' + e.message + '). Apply without a backup?')) return; }
      // 2) write the new content (scrub any stray code fence as a last guard)
      const fh = await fileHandle(cur, true);
      const w = await fh.createWritable(); await w.write(scrubFences(proposal.text)); await w.close();
      // 3) log
      const hist = Store.get('forge.hist', []);
      hist.unshift({ t: new Date().toLocaleString([], { hour12: false }), path: cur, note: proposal.note || '' });
      Store.set('forge.hist', hist.slice(0, 40));
      curText = proposal.text; proposal = null;
      draw();
      setTimeout(() => { if (confirm('Saved ' + cur + '. Reload EMBER now to run the change?')) location.reload(); }, 50);
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
      const diff = makeDiff(curText, proposal.text);
      const pill = v.ok ? (v.skipped ? 'syntax ok' : 'syntax + render ok')
        : (v.stage === 'syntax' ? 'syntax error' : v.stage === 'html' ? 'would blank the app' : 'runtime error — would break this page');
      out.innerHTML = `<div class="card">
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <div class="eyebrow" style="margin:0">Proposed change · ${EMBER.esc(cur)}</div>
          <span class="pill ${v.ok ? 'go' : 'danger'}">${pill}</span>
        </div>
        ${v.ok ? '' : `<div class="callout danger" style="margin-bottom:8px"><b>${v.stage === 'render' ? 'This code loads but crashes when it runs' : v.stage === 'html' ? 'This would blank the whole app' : 'Broken syntax'}:</b> ${EMBER.esc(v.msg)}<br><span style="font-size:12px;opacity:.85">Use “Regenerate &amp; fix errors”, or Discard. Don’t apply — it would break ${EMBER.esc(cur)}.</span></div>`}
        <div class="fg-diff">${diff}</div>
        <div class="row" style="margin-top:12px;flex-wrap:wrap">
          <button class="btn primary sm" id="fg-apply"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>Apply & save to disk</button>
          ${v.ok ? '' : `<button class="btn sm ghost" id="fg-regen" title="Send the error back to the model and ask it to fix the code">Regenerate &amp; fix errors</button>`}
          <button class="btn sm ghost" id="fg-discard">Discard</button>
          <span class="dim" style="font-size:12px">${v.ok ? 'backs up to _forge_backups/ first' : 'do not apply broken code — regenerate or discard'}</span>
        </div></div>`;
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
        const okCount = agent.results.filter(r => r.v && r.v.ok).length;
        const selCount = agent.results.filter(r => r.include).length;
        return `<div class="card ag-card"><div class="row" style="justify-content:space-between">
            <div class="eyebrow" style="margin:0">Review · ${EMBER.esc(agent.goal)}</div>
            <span class="dim" style="font-size:12px">${okCount}/${agent.results.length} pass · <span class="mono" style="font-size:11px">${EMBER.esc(Store.get('forge.model', ''))}</span></span></div>
          ${agent.savedNote ? `<div class="callout" style="margin:8px 0;font-size:12.5px">${EMBER.esc(agent.savedNote)}</div>` : ''}
          <div class="dim" style="font-size:12px;margin:8px 0 4px">Tick the files to save. Redo any file to regenerate just that one.</div>
          <div style="margin-top:6px">${agent.results.map((r, i) => agentReviewCard(r, i)).join('')}</div>
          <div class="row" style="margin-top:12px;flex-wrap:wrap;align-items:center">
            <button class="btn primary sm" id="ag-apply"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>Apply selected (${selCount})</button>
            <button class="btn sm ghost" id="ag-cancel">Discard all</button>
            <span class="dim" style="font-size:12px">edited files are backed up to _forge_backups/ first</span></div></div>`;
      }
      return '';
    }
    function agentReviewCard(r, i) {
      if (r.status === 'error') return `<div class="ag-rev"><div class="row" style="justify-content:space-between"><b class="mono">${EMBER.esc(r.path)}</b><span class="pill danger">failed</span></div><div class="callout danger" style="margin-top:6px">${EMBER.esc(r.err || 'generation failed')}</div>
        <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-agregen="${i}">Redo this file</button></div></div>`;
      if (r.status === 'working') return `<div class="ag-rev"><div class="row" style="justify-content:space-between"><b class="mono">${EMBER.esc(r.path)}</b><span class="dim" style="font-size:12px">redoing…</span></div><pre class="fg-code" id="ag-stream-${i}" style="max-height:60px;margin-top:6px">${EMBER.esc(r.stream || '')}</pre></div>`;
      const v = r.v || { ok: true, skipped: true };
      const ok = v.ok && !r.stepFails;
      const pill = !v.ok ? (v.stage === 'syntax' ? 'syntax error' : v.stage === 'html' ? 'would blank app' : 'runtime error') : (r.stepFails ? r.stepFails + ' step' + (r.stepFails === 1 ? '' : 's') + ' failed' : 'ok');
      const diff = makeDiff(r.base || '', r.text || '');
      const nSteps = (r.steps && r.steps.length) || 0;
      return `<div class="ag-rev ${r.include ? 'sel' : ''}">
        <div class="row" style="justify-content:space-between;align-items:center">
          <label class="ag-pick"><input type="checkbox" data-apply="${i}" ${r.include ? 'checked' : ''} ${ok ? '' : 'disabled'}>
            <b class="mono">${EMBER.esc(r.path)} <span class="dim" style="font-weight:400">· ${r.action}${nSteps > 1 ? ' · ' + nSteps + ' steps' : ''}</span></b></label>
          <span class="pill ${ok ? 'go' : 'danger'}">${pill}</span></div>
        ${v.ok ? '' : `<div class="callout danger" style="margin:6px 0"><b>${v.stage === 'render' ? 'crashes when it runs' : v.stage === 'html' ? 'would blank the app' : 'broken syntax'}:</b> ${EMBER.esc(v.msg)}</div>`}
        ${v.ok && r.stepFails ? `<div class="callout danger" style="margin:6px 0">${r.stepFails} of ${nSteps} step(s) didn't apply. Redo re-runs all steps for this file.</div>` : ''}
        <details style="margin-top:6px"><summary class="dim" style="font-size:12px;cursor:pointer">show diff</summary><div class="fg-diff" style="margin-top:6px">${diff}</div></details>
        <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-agregen="${i}">${ok ? 'Redo this file' : 'Redo / fix'}</button></div></div>`;
    }
    async function revertLast() {
      try {
        const bdir = await dir.getDirectoryHandle('_forge_backups');
        const entries = [];
        for await (const [name, h] of bdir.entries()) entries.push([name, h]);
        if (!entries.length) return alert('No backups yet — nothing to revert.');
        entries.sort((a, b) => a[0] < b[0] ? 1 : -1);                 // newest first
        const newestStamp = entries[0][0].split('__')[0];
        const batch = entries.filter(([n]) => n.split('__')[0] === newestStamp);
        const paths = batch.map(([n]) => n.split('__').slice(1).join('/'));
        if (!confirm(`Revert ${paths.length} file(s) to the backup from ${newestStamp.replace(/-/g, ':').replace('T', ' ').slice(0, 19)}?\n\n${paths.join('\n')}`)) return;
        for (const [name, h] of batch) {
          const path = name.split('__').slice(1).join('/');
          const text = await (await h.getFile()).text();
          const fh = await fileHandle(path, true); const w = await fh.createWritable(); await w.write(text); await w.close();
        }
        files = await listFiles(); if (cur && paths.includes(cur)) curText = await readFileText(cur);
        draw();
        setTimeout(() => { if (confirm(`Reverted ${paths.length} file(s). Reload EMBER now?`)) location.reload(); }, 50);
      } catch (e) {
        if (e && e.name === 'NotFoundError') return alert('No backups yet — nothing to revert.');
        alert('Revert failed: ' + (e && e.message ? e.message : e));
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
      const cancel = root.querySelector('#ag-cancel'); if (cancel) cancel.onclick = () => { agent = null; draw(); };
      const build = root.querySelector('#ag-build'); if (build) build.onclick = agentBuild;
      const apply = root.querySelector('#ag-apply'); if (apply) apply.onclick = agentApplyAll;
      root.querySelectorAll('[data-step]').forEach(cb => cb.onchange = () => {
        agent.steps[+cb.dataset.step].include = cb.checked;
        const bb = root.querySelector('#ag-build'); const n = agent.steps.filter(s => s.include).length;
        if (bb) bb.textContent = 'Build ' + n + ' step' + (n === 1 ? '' : 's');
      });
      root.querySelectorAll('[data-apply]').forEach(cb => cb.onchange = () => {
        agent.results[+cb.dataset.apply].include = cb.checked;
        const ap = root.querySelector('#ag-apply'); const n = agent.results.filter(r => r.include).length;
        if (ap) ap.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>Apply selected (${n})`;
        cb.closest('.ag-rev')?.classList.toggle('sel', cb.checked);
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
      const name = prompt('New file path (relative to EMBER folder), e.g. js/mymod.js or data/extra.js:');
      if (!name) return;
      try { const fh = await fileHandle(name, true); const w = await fh.createWritable(); await w.write('// ' + name + '\n'); await w.close(); files = await listFiles(); openFile(name); }
      catch (e) { alert('Could not create: ' + e.message); }
    }

    async function revert() {
      try {
        const bdir = await dir.getDirectoryHandle('_forge_backups');
        const flat = cur.replace(/\//g, '__');
        let newest = null, newestName = '';
        for await (const [name, h] of bdir.entries()) { if (name.endsWith('__' + flat) && name > newestName) { newestName = name; newest = h; } }
        if (!newest) return alert('No backup found for ' + cur);
        const text = await (await newest.getFile()).text();
        if (!confirm('Restore ' + cur + ' from backup ' + newestName.split('__')[0] + '?')) return;
        const fh = await fileHandle(cur, true); const w = await fh.createWritable(); await w.write(text); await w.close();
        curText = text; proposal = null; draw();
        setTimeout(() => { if (confirm('Restored. Reload EMBER?')) location.reload(); }, 50);
      } catch (e) { alert('Revert failed: ' + e.message); }
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
      @media(max-width:820px){.fg-grid{grid-template-columns:1fr}.fg-side{position:static;max-height:none}}`;
      document.head.appendChild(s);
    }
    draw();        // show the connect screen immediately
    tryRestore();  // then reconnect a previously-granted folder, if any
  }
});
