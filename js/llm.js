'use strict';
// ═══════════════════════════════════════════════════════════════════════════
// LOCAL LLM — talks ONLY to a local Ollama instance (http://localhost:11434).
// No cloud. Everything runs on this laptop, so the advisor works with the grid
// down. If Ollama isn't running, callers get a clear, offline-readable setup
// guide instead of a network error.
// ═══════════════════════════════════════════════════════════════════════════
const LLM = (() => {
  const HOST = () => Store.get('llm.host', 'http://localhost:11434');
  const setHost = (h) => Store.set('llm.host', h.replace(/\/+$/, ''));
  const model = () => Store.get('llm.model', '');
  const setModel = (m) => Store.set('llm.model', m);

  async function tags() {
    const r = await fetch(HOST() + '/api/tags', { cache: 'no-store' });
    if (!r.ok) throw new Error('tags ' + r.status);
    const d = await r.json();
    return (d.models || []).map(m => m.name);
  }

  // returns {online, models[], model}
  async function status() {
    try {
      const models = await tags();
      let m = model();
      if (!m || !models.includes(m)) { m = models[0] || ''; if (m) setModel(m); }
      return { online: true, models, model: m };
    } catch (e) {
      return { online: false, models: [], model: model(), error: e.message };
    }
  }

  // Streaming chat. messages:[{role,content}]. onToken(str) called per chunk.
  // Returns full text. Throws Error with .offline=true when host unreachable.
  async function chat(messages, onToken, opts = {}) {
    let res;
    try {
      res = await fetch(HOST() + '/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: opts.model || model(), messages, stream: true, options: {
          temperature: opts.temperature ?? 0.6,
          // Big files (e.g. rewriting a 46KB data file) overflow Ollama's default 4K
          // context and get truncated → syntax errors. Callers pass a bigger num_ctx.
          ...(opts.num_ctx ? { num_ctx: opts.num_ctx } : {}),
          ...(opts.num_predict ? { num_predict: opts.num_predict } : {}),
        } }),
      });
    } catch (e) { const err = new Error('Local LLM unreachable'); err.offline = true; throw err; }
    if (!res.ok) {
      const mdl = opts.model || model();
      if (res.status === 404) throw new Error('Model "' + mdl + '" not found. Pull it first: ollama pull ' + mdl);
      throw new Error('LLM error ' + res.status);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = '', full = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop();
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const j = JSON.parse(line);
          const tok = j.message?.content || '';
          if (tok) { full += tok; onToken && onToken(tok); }
        } catch (e) {}
      }
    }
    return full;
  }

  return { HOST, setHost, model, setModel, tags, status, chat };
})();
