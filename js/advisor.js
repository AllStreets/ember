'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'advisor', label: 'Advisor', desc: 'Ask the local AI — survival, medical, how-to',
  icon: '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2z"/><path d="M8 10h8M8 13h5"/></svg>',
  render(view) {
    const SYS = { role: 'system', content:
      "You are EMBER, an offline survival and practical-skills advisor running locally on the user's laptop during a grid-down emergency: no internet, no phones, solar power only. Give clear, prioritized, concrete, actionable guidance a stressed non-expert can follow. Prefer numbered steps. Be concise but complete. Assume limited supplies and improvisation. For medical or dangerous topics, give best-effort first-aid steps AND tell them to get trained/professional help the moment it's available, and to stop if a step is beyond them. Never invent facts; if unsure, say so and give the safest general approach." };

    const QUICK = ['How do I purify this water safely?', 'Treat a deep bleeding wound', 'Which wild plants are safe to eat?',
      'Start a fire without a lighter', 'Signs of hypothermia and what to do', 'Build a warm shelter tonight',
      'Ration water for 4 people, 3 days', 'Teach me long division step by step'];

    let msgs = Store.get('advisor.msgs', []);
    const s = window.EMBER.llmStatus || { online: false, models: [], model: '' };

    const fmt = (t) => EMBER.esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    view.innerHTML = `<div class="view-wrap" style="height:100%">
      <div class="row" style="justify-content:space-between;margin-bottom:12px">
        <div class="row">
          <select id="ad-model" style="width:auto;min-width:180px"></select>
          <span class="pill ${s.online ? 'go' : 'danger'}" id="ad-state">${s.online ? 'local · ready' : 'ollama offline'}</span>
        </div>
        <button class="btn ghost sm" id="ad-clear">Clear</button>
      </div>
      <div class="chat">
        <div class="chat-scroll" id="ad-scroll"></div>
        <div class="chat-quick" id="ad-quick">${QUICK.map(q => `<button class="q">${EMBER.esc(q)}</button>`).join('')}</div>
        <div class="chat-input">
          <textarea id="ad-input" placeholder="Ask anything — survival, first aid, repairs, math, navigation…" rows="1"></textarea>
          <button class="btn primary" id="ad-send"><svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg></button>
        </div>
      </div>
    </div>`;

    const scroll = view.querySelector('#ad-scroll');
    const input = view.querySelector('#ad-input');
    const modelSel = view.querySelector('#ad-model');
    const state = view.querySelector('#ad-state');

    modelSel.innerHTML = (s.models.length ? s.models : ['— no model —']).map(m => `<option ${m === s.model ? 'selected' : ''}>${EMBER.esc(m)}</option>`).join('');
    modelSel.onchange = () => { LLM.setModel(modelSel.value); window.EMBER.pollLLM(); };

    function setupGuide() {
      return `<div class="card" style="max-width:640px;margin:20px auto">
        <div class="eyebrow">Local AI — one-time setup</div>
        <p class="muted" style="margin-bottom:12px">The advisor runs a model <b>on this machine</b> (no internet). Install it once now while you still can, and it works forever offline:</p>
        <ol style="margin-left:18px;line-height:1.9;font-size:14px">
          <li>Install <b>Ollama</b> — a single app that runs local LLMs (ollama.com).</li>
          <li>In a terminal, pull a small capable model:<br><code>ollama pull llama3.2</code> &nbsp;(or <code>qwen2.5:7b</code>, <code>gemma2:9b</code>)</li>
          <li>Ollama then serves at <code>http://localhost:11434</code> automatically. Reload this page.</li>
        </ol>
        <div class="callout info" style="margin-top:12px">If it's running but still shows offline, allow this origin:
          set <code>OLLAMA_ORIGINS=*</code> in Ollama's environment and restart it.</div>
        <div class="row" style="margin-top:14px">
          <input id="ad-host" value="${EMBER.esc(LLM.HOST())}" style="max-width:280px">
          <button class="btn sm" id="ad-host-save">Save host</button>
          <button class="btn sm" id="ad-retry">Retry</button>
        </div>
      </div>`;
    }

    function draw() {
      if (!msgs.length) {
        scroll.innerHTML = (window.EMBER.llmStatus && window.EMBER.llmStatus.online)
          ? `<div class="empty"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/><path d="M12 8v4l3 2"/></svg>
              <div>Ask the local advisor anything. It runs on this laptop — no network needed.</div></div>`
          : setupGuide();
      } else {
        scroll.innerHTML = msgs.map(m => `
          <div class="msg ${m.role}"><div class="av ${m.role === 'user' ? 'u' : 'a'}">${m.role === 'user' ? 'YOU' : 'AI'}</div>
          <div class="bubble">${fmt(m.content)}</div></div>`).join('');
      }
      wireGuide();
      scroll.scrollTop = scroll.scrollHeight;
    }
    function wireGuide() {
      const hs = scroll.querySelector('#ad-host-save'); if (hs) hs.onclick = () => { LLM.setHost(scroll.querySelector('#ad-host').value); window.EMBER.pollLLM().then(() => draw()); };
      const rt = scroll.querySelector('#ad-retry'); if (rt) rt.onclick = () => window.EMBER.pollLLM().then(() => draw());
    }

    let busy = false;
    async function send(text) {
      text = (text || input.value).trim();
      if (!text || busy) return;
      if (!(window.EMBER.llmStatus && window.EMBER.llmStatus.online)) { await window.EMBER.pollLLM(); if (!window.EMBER.llmStatus.online) { draw(); return; } }
      busy = true; input.value = ''; input.style.height = 'auto';
      msgs.push({ role: 'user', content: text });
      msgs.push({ role: 'assistant', content: '' });
      draw();
      const bubble = scroll.querySelectorAll('.msg.assistant .bubble'); const target = bubble[bubble.length - 1];
      target.classList.add('cursor-blink');
      try {
        await LLM.chat([SYS, ...msgs.slice(0, -1)], (tok) => {
          msgs[msgs.length - 1].content += tok;
          target.innerHTML = fmt(msgs[msgs.length - 1].content);
          scroll.scrollTop = scroll.scrollHeight;
        });
      } catch (e) {
        msgs[msgs.length - 1].content = (e.offline ? '⚠ Local LLM went offline. ' : '⚠ ') + e.message;
        target.innerHTML = fmt(msgs[msgs.length - 1].content);
        if (e.offline) window.EMBER.pollLLM();
      }
      target.classList.remove('cursor-blink');
      Store.set('advisor.msgs', msgs.slice(-40)); window.EMBER.updStore();
      busy = false;
    }

    view.querySelector('#ad-send').onclick = () => send();
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; });
    view.querySelectorAll('#ad-quick .q').forEach(b => b.onclick = () => send(b.textContent));
    view.querySelector('#ad-clear').onclick = () => { msgs = []; Store.del('advisor.msgs'); draw(); };
    draw();
  }
});
