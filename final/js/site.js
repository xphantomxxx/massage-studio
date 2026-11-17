(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) html.classList.add('motion');

  const wall = $('.wall-a');
  const go = () => {
    if (!reduce && performance.now() < 1200) html.classList.add('intro');
    html.classList.add('ready');
  };
  wall && wall.decode ? wall.decode().then(go, go) : go();

  const top = $('[data-top]'), hero = $('.hero');
  new IntersectionObserver(([e]) => top.classList.toggle('is-solid', !e.isIntersecting), { rootMargin: `-${top.offsetHeight}px 0px 0px 0px` }).observe(hero);
  const navLinks = $$('.nav a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    navLinks.forEach(a => a.setAttribute('aria-current', String(a.hash === '#' + e.target.id)));
  }), { rootMargin: '-50% 0px -50% 0px' });
  ['ceny', 'vizit', 'mastera', 'sertifikat', 'kontakty'].forEach(id => { const el = document.getElementById(id); el && io.observe(el); });

  const menu = $('#menu'), menuBtn = $('.menu-btn'), bar = $('[data-bar]');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    bar && bar.classList.toggle('is-hidden', open || barHidden);
    html.style.overflow = open ? 'hidden' : '';
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(() => { menu.classList.add('is-open'); $('a', menu).focus(); });
    } else {
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, reduce ? 0 : 200);
      menuBtn.focus();
    }
  }
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  $('.menu-close').addEventListener('click', () => setMenu(false));
  menuBtn.hidden = false;
  menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  menu.addEventListener('keydown', e => {
    if (e.key === 'Escape') return setMenu(false);
    if (e.key !== 'Tab') return;
    const f = $$('a, button', menu), first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  let barHidden = false;
  const afBook = $('#af-book');
  if (bar && afBook) new IntersectionObserver(([e]) => {
    barHidden = e.isIntersecting && afBook.getClientRects().length > 0;
    bar.classList.toggle('is-hidden', barHidden || menuBtn.getAttribute('aria-expanded') === 'true');
  }, { threshold: 1 }).observe(afBook);

  $$('[data-open]').forEach(a => a.addEventListener('click', () => {
    const g = document.getElementById(a.dataset.open);
    if (g) { if (g.hidden) $('[data-goal="all"]')?.click(); g.open = true; }
  }));

  const rv = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    rv.unobserve(e.target);
    setTimeout(() => e.target.classList.add('is-in'), 350);
  }), { rootMargin: '0px 0px -45% 0px' });
  $$('.reveal').forEach(el => rv.observe(el));

  const scale = $('.scale'), vizit = $('#vizit');
  if (scale && vizit) {
    new IntersectionObserver(([e]) => scale.classList.toggle('is-on', e.isIntersecting), { rootMargin: '-40% 0px -40% 0px' }).observe(vizit);
    const sio = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) $$('span', scale).forEach(s => s.classList.toggle('is-cur', s.dataset.step === e.target.dataset.step));
    }), { rootMargin: '-50% 0px -50% 0px' });
    $$('.step[data-step]').forEach(s => sio.observe(s));
  }

  const night = $('[data-night]');
  if (night) new IntersectionObserver(([e]) => night.classList.toggle('is-night', e.isIntersecting), { rootMargin: '-50% 0px -50% 0px' }).observe(night);

  $$('video[data-src]').forEach(v => {
    if (reduce) {
      v.preload = 'none';
      const b = document.createElement('button');
      b.className = 'a-btn a-btn-ghost vid-play'; b.type = 'button'; b.textContent = 'Смотреть';
      b.addEventListener('click', () => { v.src ||= v.dataset.src; v.play(); b.remove(); });
      v.after(b);
      return;
    }
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { v.src = v.dataset.src; o.disconnect(); } }, { rootMargin: '50% 0px' }).observe(v);
    let done = false;
    v.addEventListener('ended', () => { done = true; v.poster = v.dataset.last; });
    new IntersectionObserver(([e]) => {
      if (done) return;
      if (e.intersectionRatio >= .5) v.play().catch(() => { v.poster = v.dataset.last; });
      else v.pause();
    }, { threshold: [0, .5] }).observe(v);
  });

  const card = $('[data-sert]');
  $$('.sert-toggle button').forEach(b => b.addEventListener('click', () => {
    const face = b.dataset.side === 'face';
    card.dataset.sert = b.dataset.side;
    $('.sert-face', card).setAttribute('aria-hidden', String(!face));
    $('.sert-back', card).setAttribute('aria-hidden', String(face));
    $$('.sert-toggle button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  }));

  const rvG = $('[data-gen="reviews"]'), rvN = $('.otz-n'), rvM = rvG && rvG.textContent.match(/^(\d+)\s+(.+)$/);
  if (rvM && rvN) {
    const sr = document.createElement('span');
    sr.className = 'sr'; sr.textContent = rvM[1] + ' ';
    rvN.textContent = rvM[1]; rvG.replaceChildren(sr, rvM[2]);
  }

  const af = $('[data-afisha]');
  if (af) new IntersectionObserver(([e], o) => {
    if (e.intersectionRatio < .6) return;
    o.disconnect();
    setTimeout(() => af.classList.add('is-mark'), reduce ? 0 : 1600);
    setTimeout(() => af.classList.add('is-light'), reduce ? 0 : 2800);
  }, { threshold: .6 }).observe(af);

  function scenes() {
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.config({ autoSleep: 30 });
    ScrollTrigger.config({ ignoreMobileResize: true });
    const mm = gsap.matchMedia();

    gsap.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true } })
      .to('.ly-wall', { y: () => hero.offsetHeight * .68, ease: 'none' }, 0)
      .to('.ly-word', { y: () => hero.offsetHeight * .45, ease: 'none' }, 0)
      .to('.ly-irina', { y: () => -hero.offsetHeight * .10, ease: 'none' }, 0);

    mm.add({ desk: '(min-width: 768px)', mob: '(max-width: 767px)' }, ctx => {
      const from = ctx.conditions.desk ? 'inset(0% 6.25% 0% 6.25% round 16px)' : 'inset(0% 16px 0% 16px round 16px)';
      gsap.timeline({ scrollTrigger: { trigger: '.step-par', start: 'top bottom', end: 'top top', scrub: true } })
        .fromTo('.win-frame', { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' }, 0)
        .fromTo('.win-img', { scale: 1.12 }, { scale: 1, ease: 'none' }, 0);
    });

    $$('.giant').forEach(g => {
      gsap.set(g, { clipPath: 'inset(0 0 0 0)' });
      const n = $('.g-num', g);
      gsap.fromTo(n, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .46, delay: .12, ease: 'power2.out',
        scrollTrigger: { trigger: g, start: 'top 80%', once: true } });
    });

    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', scenes, { once: true }) : scenes();
})();
