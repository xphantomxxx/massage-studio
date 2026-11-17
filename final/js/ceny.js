(() => {
  const root = document.querySelector('[data-ceny]');
  if (!root) return;
  const tabs = [...root.querySelectorAll('.goal')];
  const groups = [...root.querySelectorAll('.grp')];
  const status = root.querySelector('[data-ceny-status]');
  const empty = root.querySelector('[data-ceny-empty]');
  const total = root.querySelectorAll('.grp .row').length;
  const initialOpen = new Map(groups.map(g => [g, g.open]));
  const NB = ' ';
  const fmt = n => n.toLocaleString('ru-RU').replace(/\s/g, NB);
  const plural = (n, a, b, c) => n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c;

  function apply(goal, keep) {
    if (!tabs.some(t => t.dataset.goal === goal)) goal = 'all';
    let shown = 0;
    for (const g of groups) {
      const rows = [...g.querySelectorAll('.row')];
      for (const r of rows) r.hidden = goal !== 'all' && !r.dataset.goals.split(' ').includes(goal);
      const vis = rows.filter(r => !r.hidden);
      shown += vis.length;
      g.hidden = !vis.length;
      g.open = goal === 'all' ? initialOpen.get(g) : vis.length > 0;
      if (!vis.length) continue;
      const lo = Math.min(...vis.map(r => +r.dataset.min)), hi = Math.max(...vis.map(r => +r.dataset.max));
      g.querySelector('.grp-n').textContent = vis.length + NB + plural(vis.length, 'услуга', 'услуги', 'услуг');
      g.querySelector('.grp-r').textContent = (lo === hi ? fmt(lo) : fmt(lo) + '–' + fmt(hi)) + NB + '₽';
    }
    for (const t of tabs) t.setAttribute('aria-pressed', String(t.dataset.goal === goal));
    if (status) status.textContent = goal === 'all' ? '' : `Показано ${shown} из ${total}`;
    if (empty) empty.hidden = shown > 0;
    if (keep) {
      const u = new URL(location.href);
      goal === 'all' ? u.searchParams.delete('for') : u.searchParams.set('for', goal);
      history.replaceState(null, '', u.pathname + u.search + '#ceny');
    }
    root.dispatchEvent(new CustomEvent('ceny:filter', { detail: { goal, shown }, bubbles: true }));
  }

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-goal]');
    if (b && root.contains(b)) apply(b.dataset.goal, true);
  });
  const start = new URLSearchParams(location.search).get('for');
  if (start) apply(start, false);
})();
