#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// Forge self-test — proves Forge's edit pipeline is replicable, not a one-off.
// It re-implements Forge's exact strategies (append-mode, SEARCH/REPLACE edit
// blocks, full-write) and runs a suite of diverse tasks against the REAL local
// model (Ollama), N times each, validating every result. Operates on in-memory
// copies of the real EMBER files — nothing is written to disk.
//
//   node forge-selftest.mjs                # 3 reps per task, qwen2.5-coder:7b
//   node forge-selftest.mjs 5 llama3.1:8b  # custom reps + model
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REPS = parseInt(process.argv[2] || '3', 10);
const MODEL = process.argv[3] || 'qwen2.5-coder:7b';
const HOST = 'http://localhost:11434';
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// ── Forge internals (copied verbatim from js/forge.js) ──────────────────────
function ctxFor(chars) {
  const tokens = Math.ceil((chars * 2) / 3.3) + 3000;
  return Math.min(32768, Math.max(8192, Math.ceil(tokens / 2048) * 2048));
}
function extractCode(s) {
  let t = (s || '').trim();
  const open = t.match(/^```[a-zA-Z0-9]*[ \t]*\r?\n/);
  if (open) { t = t.slice(open[0].length); t = t.replace(/\r?\n?```[a-zA-Z0-9]*[ \t]*$/, ''); }
  else { const inner = t.match(/```[a-zA-Z0-9]*[ \t]*\r?\n([\s\S]*?)```/); if (inner) t = inner[1]; }
  t = t.replace(/^```[a-zA-Z0-9]*[ \t]*\r?\n/, '').replace(/\r?\n?```[a-zA-Z0-9]*[ \t]*$/, '');
  return t.replace(/\s+$/, '');
}
function applyBlock(text, search, replace) {
  if (search === '') return text.replace(/\n?$/, '') + '\n' + replace + '\n';
  if (text.includes(search)) return text.replace(search, replace);
  const T = text.split('\n'), S = search.split('\n').map(l => l.trim());
  while (S.length && S[S.length - 1] === '') S.pop();
  while (S.length && S[0] === '') S.shift();
  if (!S.length) return null;
  for (let i = 0; i + S.length <= T.length; i++) {
    let ok = true;
    for (let j = 0; j < S.length; j++) { if (T[i + j].trim() !== S[j]) { ok = false; break; } }
    if (ok) { const before = T.slice(0, i), after = T.slice(i + S.length); return [...before, ...replace.split('\n'), ...after].join('\n'); }
  }
  return null;
}
function applyEditBlocks(base, raw) {
  const re = /<{5,}\s*SEARCH\s*\r?\n([\s\S]*?)\r?\n?={5,}\s*\r?\n([\s\S]*?)\r?\n?>{5,}\s*REPLACE/g;
  const blocks = [...raw.matchAll(re)];
  if (!blocks.length) return null;
  let text = base;
  for (const b of blocks) {
    const applied = applyBlock(text, b[1].replace(/\r/g, ''), b[2].replace(/\r/g, ''));
    if (applied == null) throw new Error('an edit block’s SEARCH text was not found in the file');
    text = applied;
  }
  return text;
}
function sampleEntry(text, marker) {
  let i = text.indexOf(marker); if (i < 0) return '{ … }';
  const b = text.indexOf('{', i); if (b < 0) return '{ … }';
  return text.slice(b, b + 700);
}

async function callOllama(system, user, num_ctx) {
  const res = await fetch(HOST + '/api/chat', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], options: { temperature: 0.2, num_ctx, num_predict: -1 } }),
  });
  if (!res.ok) throw new Error('ollama ' + res.status);
  const j = await res.json();
  return j.message?.content || '';
}

// append-mode (mirrors appendEntries)
async function runAppend(base, cfg, instruction) {
  const sys = `You are FORGE, adding ${cfg.label} to an offline survival app.\n`
    + `Output ONLY the NEW array element(s) to append to the ${cfg.varName} array: JavaScript object literal(s), each ending with a comma, matching EXACTLY the shape/fields of the existing entries.\n`
    + `NO array brackets, NO "const ${cfg.varName} =", NO code fences, NO markdown, NO prose — output must start with "{".\n`
    + `Write real, specific content — never placeholders.\n`
    + (cfg.cats ? `Valid category ("cat") values: ${cfg.cats}. Use the one that matches the request.\n` : '')
    + `Shape of an existing entry:\n${cfg.example}`;
  const user = `TASK: ${instruction}\n\nReturn only the new ${cfg.varName} object literal(s), each comma-terminated.`;
  const raw = await callOllama(sys, user, ctxFor(cfg.example.length + instruction.length + 2500));
  let snip = extractCode(raw).trim();
  snip = snip.replace(/^[^[{]*/, '').replace(/^(?:const|let|var)\s+\w+\s*=\s*/, '').replace(/;?\s*$/, '');
  snip = snip.replace(/^\[/, '').replace(/\]$/, '').trim();
  if (!snip) throw new Error('model returned no new entries');
  if (!snip.endsWith(',')) snip += ',';
  new Function('return [\n' + snip + '\n]');       // snippet must be valid
  const m = base.match(new RegExp('(?:const|let|var)\\s+' + cfg.varName + '\\s*=\\s*\\['));
  if (!m) throw new Error('array not found');
  const at = m.index + m[0].length;
  return base.slice(0, at) + '\n' + snip + '\n' + base.slice(at);
}

const ARCH = `EMBER is a static, dependency-free offline dashboard (vanilla JS). Modules register via (window.EMBER_MODULES=window.EMBER_MODULES||[]).push({id,label,desc,icon:'<svg…>',render(view){...}}). Helpers on window.EMBER: esc, num, go. Store.get/set. Styling in css/app.css with CSS vars (--amber,--panel,--t1/2/3). No external libs/CDNs/network (except local Ollama).`;

// edit-blocks (mirrors editViaBlocks)
async function runEditBlocks(path, base, instruction) {
  const sys = `You are FORGE, editing ${path} in EMBER (a dependency-free offline app).\n${ARCH}\n\n`
    + `Make the change using SEARCH/REPLACE edit blocks — do NOT output the whole file. For each region you change, output a block in EXACTLY this format:\n`
    + `<<<<<<< SEARCH\n(a few lines copied EXACTLY from the current file)\n=======\n(the replacement lines)\n>>>>>>> REPLACE\n\n`
    + `Rules: copy SEARCH character-for-character; keep blocks minimal; output ONLY edit blocks, no prose/fences; to ADD code, SEARCH a nearby unique line and repeat it plus your additions in REPLACE.`;
  const user = `CURRENT ${path}:\n\`\`\`\n${base}\n\`\`\`\n\nCHANGE REQUEST: ${instruction}\n\nOutput only SEARCH/REPLACE edit blocks.`;
  const raw = await callOllama(sys, user, ctxFor(base.length + instruction.length));
  const out = applyEditBlocks(base, raw);
  if (out == null) throw new Error('model produced no edit blocks');
  return out;
}

// full write (mirrors llmRewrite for create)
async function runCreate(path, instruction) {
  const sys = `You are FORGE, creating a NEW file ${path} for EMBER (a dependency-free offline app).\n${ARCH}\n\nOutput ONLY the complete file contents in a single fenced code block. No prose. Keep it self-contained and offline.`;
  const user = `NEW FILE: ${path}\n\nREQUEST: ${instruction}\n\nReturn the full contents of ${path} as one fenced code block.`;
  const raw = await callOllama(sys, user, ctxFor(instruction.length + 2000));
  return extractCode(raw);
}

// ── checks ──────────────────────────────────────────────────────────────────
const arrLen = (text, name) => new Function(text + '\nreturn ' + name + '.length;')();
const balancedBraces = (t) => (t.match(/{/g) || []).length === (t.match(/}/g) || []).length;

const KB = read('data/kb.js'), REF = read('data/ref.js'), GUIDE = read('data/guide.js');
const SURV = read('js/survival.js'), SW = read('sw.js'), CSS = read('css/app.css');
const KB_CATS = (KB.match(/KB_CATS\s*=\s*\[([^\]]*)\]/) || [, ''])[1].trim();

const TASKS = [
  { name: 'append KB (Repair)', kind: 'append', base: KB, file: 'data/kb.js',
    cfg: { varName: 'KB', label: 'survival guide entries', example: sampleEntry(KB, '{ id:'), cats: KB_CATS },
    instruction: 'Add 2 KB entries with cat "Repair": one on patching a leaking water container, one on repairing torn clothing/gear.',
    check: (out) => { const n0 = arrLen(KB, 'KB'), n1 = arrLen(out, 'KB'); return { ok: n1 >= n0 + 1, msg: `KB ${n0}→${n1}` }; } },

  { name: 'append KNOTS (ref)', kind: 'append', base: REF, file: 'data/ref.js',
    cfg: { varName: 'KNOTS', label: 'knot entries', example: sampleEntry(REF, 'KNOTS') },
    instruction: 'Add 1 KNOTS entry for the "bowline on a bight", matching the existing knot object shape.',
    check: (out) => { const n0 = arrLen(REF, 'KNOTS'), n1 = arrLen(out, 'KNOTS'); return { ok: n1 >= n0 + 1, msg: `KNOTS ${n0}→${n1}` }; } },

  { name: 'append PLANTS (guide)', kind: 'append', base: GUIDE, file: 'data/guide.js',
    cfg: { varName: 'PLANTS', label: 'plant entries', example: sampleEntry(GUIDE, 'PLANTS') },
    instruction: 'Add 1 PLANTS entry for common clover, matching the existing plant object shape.',
    check: (out) => { const n0 = arrLen(GUIDE, 'PLANTS'), n1 = arrLen(out, 'PLANTS'); return { ok: n1 >= n0 + 1, msg: `PLANTS ${n0}→${n1}` }; } },

  { name: 'edit-block survival.js', kind: 'edit', base: SURV, file: 'js/survival.js',
    instruction: 'In the kb-entry template, add a data-cat attribute to the outer .kb-entry div set to EMBER.esc(e.cat).',
    check: (out) => { new Function(out); return { ok: /data-cat/.test(out), msg: /data-cat/.test(out) ? 'data-cat added' : 'attr missing' }; } },

  { name: 'edit-block sw.js (ASSETS)', kind: 'edit', base: SW, file: 'sw.js',
    instruction: "Add 'js/selftest-dummy.js' to the ASSETS array.",
    check: (out) => { new Function(out); const has = out.includes('js/selftest-dummy.js'); const app = out.includes("'js/app.js'") || out.includes('js/app.js'); return { ok: has && app, msg: has ? (app ? 'added, app.js kept' : 'DROPPED app.js!') : 'not added' }; } },

  { name: 'edit-block css', kind: 'edit', base: CSS, file: 'css/app.css',
    instruction: 'Add a CSS rule: .forge-selftest { color: #22d3ee }',
    check: (out) => { const has = out.includes('.forge-selftest'); return { ok: has && balancedBraces(out), msg: has ? (balancedBraces(out) ? 'rule added, braces balanced' : 'unbalanced braces') : 'rule missing' }; } },

  { name: 'create module js/selftest.js', kind: 'create', file: 'js/selftest.js',
    instruction: "Create a module registered into window.EMBER_MODULES with id 'selftest', label 'Self Test', a desc, an inline <svg> icon, and render(view) that sets view.innerHTML to a card containing a heading. Fully self-contained.",
    check: (out) => { new Function(out); return { ok: /EMBER_MODULES/.test(out) && /selftest/.test(out) && /render/.test(out), msg: 'module registers + renders' }; } },
];

async function once(task) {
  let out;
  if (task.kind === 'append') out = await runAppend(task.base, task.cfg, task.instruction);
  else if (task.kind === 'edit') out = await runEditBlocks(task.file, task.base, task.instruction);
  else out = await runCreate(task.file, task.instruction);
  new Function(task.file.endsWith('.css') ? 'true' : out);   // whole-file syntax (skip for css)
  return task.check(out);
}

(async () => {
  console.log(`\nForge self-test · model=${MODEL} · ${REPS} reps/task · ${TASKS.length} tasks\n`);
  let totPass = 0, totRun = 0;
  for (const task of TASKS) {
    let pass = 0; const notes = [];
    for (let r = 0; r < REPS; r++) {
      totRun++;
      try { const res = await once(task); if (res.ok) { pass++; totPass++; notes.push('ok:' + res.msg); } else notes.push('FAIL:' + res.msg); }
      catch (e) { notes.push('ERR:' + (e.message || e)); }
    }
    const bar = pass === REPS ? 'PASS' : pass === 0 ? 'FAIL' : 'FLAKY';
    console.log(`[${bar}] ${pass}/${REPS}  ${task.name}`);
    notes.forEach(n => console.log('        · ' + n));
  }
  console.log(`\nTOTAL: ${totPass}/${totRun} (${Math.round(100 * totPass / totRun)}%) — ${totPass === totRun ? 'fully replicable' : 'see failures above'}\n`);
})();
