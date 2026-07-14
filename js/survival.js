'use strict';
(window.EMBER_MODULES = window.EMBER_MODULES || []).push({
  id: 'survival', label: 'Survival', desc: 'Offline guides: water, fire, shelter, first aid, food…',
  icon: '<svg viewBox="0 0 24 24"><path d="M12 2l3 6 6 .9-4.5 4.3 1 6.3L12 17l-5.5 2.8 1-6.3L3 8.9 9 8z"/></svg>',
  render(view) {
    let q = '', cat = 'All';
    view.innerHTML = `<div class="view-wrap">
      <div class="kb-search">
        <input id="kb-q" placeholder="Search guides — e.g. bleeding, water, hypothermia, fire…" autocomplete="off">
        <button class="btn sm ghost" id="kb-print" title="Print or save these guides as a PDF for a paper backup">Print / PDF</button>
      </div>
      <div class="print-head"><b>EMBER</b><small>Survival guides — printed offline backup</small></div>
      <div class="kb-cats" id="kb-cats"></div>
      <div id="kb-list"></div>
    </div>`;
    view.querySelector('#kb-print').onclick = () => window.print();
    const listEl = view.querySelector('#kb-list');
    const catsEl = view.querySelector('#kb-cats');
    const qEl = view.querySelector('#kb-q');

    function drawCats() {
      const cats = ['All', ...KB_CATS];
      catsEl.innerHTML = cats.map(c => `<button class="kb-cat ${c === cat ? 'on' : ''}" data-c="${c}">${c}</button>`).join('');
      catsEl.querySelectorAll('.kb-cat').forEach(b => b.onclick = () => { cat = b.dataset.c; drawCats(); drawList(); });
    }
    function match(e) {
      const inCat = cat === 'All' || e.cat === cat;
      if (!inCat) return false;
      if (!q) return true;
      const hay = (e.title + ' ' + e.cat + ' ' + (e.tags || []).join(' ') + ' ' + e.html).toLowerCase();
      return q.toLowerCase().split(/\s+/).every(w => hay.includes(w));
    }
    function drawList() {
      const items = KB.filter(match);
      if (!items.length) { listEl.innerHTML = `<div class="empty">No guide matches "${EMBER.esc(q)}". Try the Advisor for anything not covered here.</div>`; return; }
      listEl.innerHTML = items.map(e => `
        <div class="kb-entry" data-id="${e.id}">
          <div class="kb-head"><span class="kb-tag">${EMBER.esc(e.cat)}</span><b>${EMBER.esc(e.title)}</b>
            <svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></div>
          <div class="kb-body">${e.html}
            <div class="row" style="margin-top:14px"><button class="btn sm ghost" data-ask="${e.id}">Ask the advisor about this</button></div>
          </div>
        </div>`).join('');
      listEl.querySelectorAll('.kb-head').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));
      listEl.querySelectorAll('[data-ask]').forEach(b => b.onclick = (ev) => {
        ev.stopPropagation();
        const e = KB.find(x => x.id === b.dataset.ask);
        Store.set('advisor.seed', 'Explain and expand on: ' + e.title);
        EMBER.go('advisor');
        setTimeout(() => { const inp = document.getElementById('ad-input'); if (inp) { inp.value = Store.get('advisor.seed', ''); inp.focus(); Store.del('advisor.seed'); } }, 60);
      });
      // auto-open the first result when actively searching
      if (q && items.length) listEl.querySelector('.kb-entry')?.classList.add('open');
    }
    qEl.oninput = () => { q = qEl.value; drawList(); };
    drawCats(); drawList();
  }
});
