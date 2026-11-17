(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 767px)').matches;
  const ready = () => html.classList.add('ready');

  const top = $('[data-top]'), hero = $('.hero');
  new IntersectionObserver(([e]) => top.classList.toggle('is-solid', !e.isIntersecting), { rootMargin: `-${top.offsetHeight}px 0px 0px 0px` }).observe(hero);
  const navLinks = $$('.nav a');
  const nio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', String(a.hash === '#' + e.target.id)));
  }), { rootMargin: '-50% 0px -50% 0px' });
  ['ritual', 'uslugi', 'ceny', 'mastera', 'sertifikat', 'kontakty'].forEach(id => { const el = document.getElementById(id); el && nio.observe(el); });
  const menu = $('#menu'), menuBtn = $('.menu-btn'), bar = $('[data-bar]');
  if (bar && phone) new IntersectionObserver(([e]) => bar.classList.toggle('is-visible', !e.isIntersecting)).observe(hero);
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    html.style.overflow = open ? 'hidden' : '';
    bar && bar.classList.toggle('is-hidden', open);
    if (open) { menu.hidden = false; requestAnimationFrame(() => { menu.classList.add('is-open'); $('a', menu).focus(); }); }
    else { menu.classList.remove('is-open'); setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 200); menuBtn.focus(); }
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $('.menu-close').addEventListener('click', () => setMenu(false));
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') return setMenu(false);
    if (e.key !== 'Tab') return;
    const f = $$('a, button', menu), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  $$('[data-open]').forEach(a => a.addEventListener('click', () => {
    const g = document.getElementById(a.dataset.open);
    if (g) { if (g.hidden) $('[data-goal="all"]')?.click(); g.open = true; }
  }));

  const bgio = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) html.dataset.bg = e.target.dataset.bgk; }), { rootMargin: '-50% 0px -50% 0px' });
  $$('[data-bgk]').forEach(s => bgio.observe(s));

  $$('video[data-src]').forEach(v => {
    if (reduce) {
      const b = document.createElement('button');
      b.className = 'a-btn a-btn-ghost vid-play'; b.type = 'button'; b.textContent = 'Смотреть';
      b.addEventListener('click', () => { v.src ||= v.dataset.src; v.play(); b.remove(); });
      v.after(b); return;
    }
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { v.src = v.dataset.src; o.disconnect(); } }, { rootMargin: '50% 0px' }).observe(v);
    let done = false;
    v.addEventListener('ended', () => { done = true; v.poster = v.dataset.last; });
    new IntersectionObserver(([e]) => { if (done) return; e.intersectionRatio >= .5 ? v.play().catch(() => {}) : v.pause(); }, { threshold: [0, .5] }).observe(v);
  });

  const lens = $('[data-lens]');
  if (lens) {
    const set = (k, v) => lens.style.setProperty(k, v);
    if (phone || reduce) {
      const b = document.createElement('button');
      b.className = 'a-btn a-btn-ghost lens-btn'; b.type = 'button'; b.textContent = 'Заглянуть внутрь'; b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        const on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Закрыть' : 'Заглянуть внутрь';
        const r = on ? Math.round(lens.offsetHeight * .9) + 'px' : '0px';
        if (window.gsap && !reduce) gsap.to(lens, { '--rad': r, duration: .6, ease: 'power3.inOut' }); else set('--rad', r);
      });
      lens.after(b);
    } else if (window.gsap) {
      const st = { x: 50, y: 46, r: 0 };
      const draw = () => { set('--x', st.x + '%'); set('--y', st.y + '%'); set('--rad', st.r + 'px'); };
      const tx = gsap.quickTo(st, 'x', { duration: .2, ease: 'power3', onUpdate: draw });
      const ty = gsap.quickTo(st, 'y', { duration: .2, ease: 'power3', onUpdate: draw });
      lens.addEventListener('pointerenter', () => gsap.to(st, { r: 130, duration: .45, ease: 'power3.out', onUpdate: draw }));
      lens.addEventListener('pointerleave', () => gsap.to(st, { r: 0, duration: .25, ease: 'power2.in', onUpdate: draw }));
      lens.addEventListener('pointermove', e => { const b = lens.getBoundingClientRect(); tx((e.clientX - b.left) / b.width * 100); ty((e.clientY - b.top) / b.height * 100); });
      new IntersectionObserver(([e], o) => {
        if (!e.isIntersecting) return; o.disconnect();
        gsap.timeline({ onUpdate: draw }).to(st, { r: 150, duration: .7, ease: 'power3.out' }).to(st, { r: 0, duration: .4, ease: 'power2.in' }, '+=1.1');
      }, { threshold: .6 }).observe(lens);
    }
  }

  const ms = $('[data-ms]');
  if (ms) {
    const items = $$('.m', ms);
    const on = m => items.forEach(x => x.classList.toggle('is-on', x === m));
    items.forEach(m => { m.addEventListener('pointerenter', () => on(m)); m.addEventListener('focusin', () => on(m)); });
    items[0] && on(items[0]);
  }

  const card = $('[data-sert]');
  $$('.sert-toggle button').forEach(b => b.addEventListener('click', () => {
    card.dataset.sert = b.dataset.side;
    $$('.sert-toggle button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));

  function scenes() {
    const ritual = $('.ritual');
    if (reduce || !window.gsap || !window.ScrollTrigger) { ritual.classList.add('static'); ready(); return; }
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    gsap.config({ autoSleep: 30 });
    ScrollTrigger.config({ ignoreMobileResize: true });

    ready();
    gsap.timeline({ defaults: { ease: 'power2.out' } })
      .from('.hero-copy .a-rule', { scaleX: 0, transformOrigin: '0 50%', duration: .9, ease: 'power3.inOut' }, 0)
      .from(['.hero-p', '.hero-acts', '.hero-addr'], { autoAlpha: 0, y: 12, duration: .7, stagger: .08 }, .25);
    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-media', { scale: 1.12, ease: 'power2.in' }, 0)
      .to('.hero-in', { yPercent: -14, autoAlpha: 0, ease: 'power1.in' }, 0);

    const sc = $$('.rt-scene'), cards = $$('.rt-card'), steps = $$('.rt-steps li');
    const door = phone ? 'inset(12% 8% 52% 46% round 2px)' : 'inset(14% 6% 46% 66% round 2px)';
    gsap.set(sc[1], { clipPath: door, zIndex: 2 }); gsap.set(sc[2], { clipPath: door, zIndex: 3, autoAlpha: 0 });
    gsap.set($$('.rt-img', sc[1]), { scale: 1.25 }); gsap.set($$('.rt-img', sc[2]), { scale: 1.25 });
    let cur = -1;
    const tickers = new Map();
    const activate = i => {
      if (i === cur) return; cur = i;
      cards.forEach((c, k) => c.classList.toggle('is-on', k === i));
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      if (i < 0) return;
      const t = $('.tick', cards[i]);
      if (t && !tickers.has(t)) {
        tickers.set(t, 1);
        const to = +t.dataset.to, o = { v: 0 };
        gsap.to(o, { v: to, duration: Math.min(1.1, .25 + to / 120), ease: 'steps(' + Math.min(to, 18) + ')', onUpdate: () => { t.textContent = Math.round(o.v); } });
      }
    };
    const pick = s => {
      const p = s.progress * tl.duration();
      activate(p < .35 + .3 ? 0 : p < .35 + .7 ? -1 : p < 1.7 + .3 ? 1 : p < 1.7 + .7 ? -1 : 2);
    };
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: ritual, start: 'top top', end: '+=260%', pin: '.rt-pin', scrub: .24,
      onUpdate: pick, onEnter: pick, onEnterBack: pick } });
    tl.to({}, { duration: .35 })
      .to(sc[0], { scale: 1.5, ease: 'power2.in', duration: 1 }, '>')
      .to(sc[1], { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, '<')
      .to($$('.rt-img', sc[1]), { scale: 1, duration: 1 }, '<')
      .set(sc[2], { autoAlpha: 1 })
      .to({}, { duration: .35 })
      .to(sc[1], { scale: 1.5, ease: 'power2.in', duration: 1 }, '>')
      .to(sc[2], { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, '<')
      .to($$('.rt-img', sc[2]), { scale: 1, duration: 1 }, '<')
      .to({}, { duration: .4 });

    gsap.fromTo('.macro-img', { xPercent: 6, scale: 1.18 }, { xPercent: -6, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.macro', start: 'top bottom', end: 'bottom top', scrub: true } });

    const sh = $('.shutter'), kam = $('#kamni'), stone = sh && $('img', sh);
    if (stone && kam) {
      const k = (+stone.getAttribute('width') || 1887) / (+stone.getAttribute('height') || 1055);
      let half = 0, base = 0;
      const fit = () => {
        const w = innerWidth, h = innerHeight, port = h > w, L = port ? h : w, S = port ? w : h;
        const long = Math.max(port ? 1.66 * h : 1.7 * w, Math.hypot(L, S * k) / .96 * 1.04);
        stone.style.width = Math.round(long) + 'px';
        base = port ? 90 : 0;
        gsap.set(stone, { xPercent: -50, yPercent: -50 });
        half = (port ? long / k : long) / 2;
      };
      fit();
      const off = () => innerWidth / 2 + half + 8, drift = () => innerWidth * .04;
      new IntersectionObserver(([e], o) => { if (e.isIntersecting) { sh.classList.add('is-on'); o.disconnect(); } }, { rootMargin: '200% 0px' }).observe(kam);
      gsap.timeline({ defaults: { ease: 'none' },
        onUpdate() { const p = this.progress(); sh.style.visibility = p > 0 && p < 1 ? 'visible' : 'hidden'; },
        scrollTrigger: { trigger: kam, start: 'top 72%', end: 'top 8%', scrub: .35, invalidateOnRefresh: true, onRefreshInit: fit } })
        .fromTo(stone, { rotation: () => base - 5, scale: 1 }, { rotation: () => base + 4, scale: 1.05, duration: 1 }, 0)
        .fromTo(stone, { x: off }, { x: drift, duration: .40, ease: 'power1.in' }, 0)
        .to(stone, { x: () => -drift(), duration: .20 }, .40)
        .to(stone, { x: () => -off(), duration: .40, ease: 'power1.out' }, .60);
    }

    if (window.SplitText) $$('[data-split]').forEach(el => {
      SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: self =>
        gsap.from(self.lines, { yPercent: 105, duration: .26, stagger: .07, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 82%', once: true } }) });
    });

    gsap.fromTo('[data-swing]', { rotation: -7 }, { rotation: 0, duration: 2.4, ease: 'elastic.out(1, 0.28)', scrollTrigger: { trigger: '[data-swing]', start: 'top 75%', once: true } });

    gsap.from('.foot-giant', { yPercent: 60, opacity: 0, duration: .7, ease: 'power2.out', scrollTrigger: { trigger: '.foot', start: 'top 85%', once: true } });

    let rt = 0;
    const refreshSoon = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 150); };
    document.addEventListener('toggle', e => { if (e.target.tagName === 'DETAILS') refreshSoon(); }, true);
    document.addEventListener('ceny:filter', refreshSoon);
    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', scenes, { once: true }) : scenes();
})();


(() => {
  const box = document.querySelector('[data-svc]');
  if (!box) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img = box.querySelector('.svc-img'), sl = box.querySelector('.svc-sl'), items = [...box.querySelectorAll('.svc-list li')];
  for (let k = 0; k < 9; k++) { const i = document.createElement('i'); i.style.setProperty('--k', k); sl.append(i); }
  const strips = [...sl.children];
  let cur = null;
  const show = li => {
    if (li === cur) return; cur = li;
    items.forEach(x => x.classList.toggle('is-on', x === li));
    const src = li.querySelector('a').dataset.img;
    if (reduce || !window.gsap) { img.src = src; return; }
    sl.style.setProperty('--img', `url(${src})`);
    gsap.fromTo(strips, { '--y': (i) => (i % 2 ? 104 : -104) + '%' }, { '--y': '0%', duration: .42, stagger: .07, ease: 'power3.out', overwrite: true,
      onComplete: () => { img.src = src; gsap.set(strips, { '--y': '104%' }); } });
  };
  items.forEach(li => { li.addEventListener('pointerenter', () => show(li)); li.addEventListener('focusin', () => show(li)); });
  items[2] && items[2].classList.add('is-on'); cur = items[2];
})();
