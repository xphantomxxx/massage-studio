(() => {
  'use strict';
  const doc = document;
  const root = doc.documentElement;
  const $ = (s, c) => (c || doc).querySelector(s);
  const $$ = (s, c) => [...(c || doc).querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const phone = matchMedia('(max-width: 767px)');
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const hasMotion = Boolean(gsap && ScrollTrigger);
  let LINE = 'expo.inOut';
  if (hasMotion) {
    gsap.registerPlugin(ScrollTrigger);
    if (window.CustomEase) { gsap.registerPlugin(window.CustomEase); LINE = window.CustomEase.create('aLine', '.35,0,0,1'); }
    gsap.config({ autoSleep: 30 });
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  const pick = (el, key) => el.dataset[phone.matches ? key + 'M' : key];
  const play = video => { const p = video.play(); if (p) p.catch(() => {}); };

  function menu() {
    const panel = $('[data-menu]');
    const open = $('[data-menu-open]');
    const close = $('[data-menu-close]');
    if (!panel || !open || !close) return;
    let active = false;
    let timer = 0;
    let previousOverflow = '';
    const items = () => $$('a[href],button:not([disabled])', panel).filter(el => el.getClientRects().length);
    const focus = el => {
      if (!el) return;
      try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
    };
    function show() {
      clearTimeout(timer);
      active = true;
      previousOverflow = root.style.overflow;
      panel.hidden = false;
      open.setAttribute('aria-expanded', 'true');
      root.style.overflow = 'hidden';
      $('[data-bar]')?.classList.remove('is-visible');
      requestAnimationFrame(() => {
        panel.classList.add('is-open');
        focus(close);
      });
    }
    function hide() {
      if (!active) return;
      active = false;
      panel.classList.remove('is-open');
      open.setAttribute('aria-expanded', 'false');
      root.style.overflow = previousOverflow;
      focus(open);
      timer = setTimeout(() => { if (!active) panel.hidden = true; }, reduce.matches ? 0 : 360);
    }
    open.addEventListener('click', show);
    close.addEventListener('click', hide);
    $$('.menu-nav a,.menu .a-btn,.menu .btn', panel).forEach(a => a.addEventListener('click', hide));
    doc.addEventListener('keydown', event => {
      if (!active) return;
      if (event.key === 'Escape') { event.preventDefault(); hide(); return; }
      if (event.key !== 'Tab') return;
      const list = items();
      const first = list[0], last = list[list.length - 1];
      if (!list.length) { event.preventDefault(); return; }
      if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); focus(last); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); focus(first); }
      else if (!panel.contains(doc.activeElement)) { event.preventDefault(); focus(first); }
    });
  }

  function certificate() {
    $$('[data-sert]').forEach(card => {
      const section = card.closest('section');
      $$('[data-side]', section).forEach(button => button.addEventListener('click', () => {
        const side = button.dataset.side === 'back' ? 'back' : 'face';
        card.dataset.sert = side;
        $$('[data-side]', section).forEach(b => b.setAttribute('aria-pressed', String(b === button)));
      }));
    });
  }

  function detailsLinks() {
    $$('[data-open]').forEach(link => link.addEventListener('click', () => {
      const target = doc.getElementById(link.dataset.open);
      if (!target) return;
      if (target.hidden || target.closest('[hidden]')) $('[data-goal="all"]')?.click();
      if (target.tagName === 'DETAILS') target.open = true;
    }));
  }

  function header() {
    const top = $('[data-top]'), hero = $('[data-hero]');
    if (!top || !hero) return;
    if (!('IntersectionObserver' in window)) { top.classList.add('is-solid'); return; }
    new IntersectionObserver(([e]) => top.classList.toggle('is-solid', !e.isIntersecting), { rootMargin: `-${top.offsetHeight}px 0px 0px 0px` }).observe(hero);
  }

  const blobs = new Map();
  const blobUrl = src => {
    if (!blobs.has(src)) blobs.set(src, fetch(src).then(r => { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
      .then(blob => URL.createObjectURL(blob)).catch(() => { blobs.delete(src); return ''; }));
    return blobs.get(src);
  };
  const attach = (video, key, after) => {
    if (video.getAttribute('src') || video.dataset.wait) return;
    const src = pick(video, key);
    video.dataset.wait = src;
    blobUrl(src).then(u => {
      if (video.dataset.wait !== src) return;
      delete video.dataset.wait;
      if (!u) return;
      video.preload = 'auto';
      video.src = u;
      if (after) after();
    });
  };
  const detach = video => { delete video.dataset.wait; video.pause(); video.removeAttribute('src'); video.load(); };

  function heroFilm() {
    const hero = $('[data-hero]');
    const box = $('[data-hero-media]');
    const loop = box && $('[data-loop]', box);
    const film = box && $('[data-film]', box);
    if (!hero || !box || !loop || !film) return { load() {}, progress() {} };
    const FPS = 24, LAST = 27, A = .3, B = .85;
    let started = false, inView = true, mode = 'loop', state = 'idle', t0 = 0, p = 0, pending = -1;

    function syncLoop() {
      if (!started || mode !== 'loop' || !inView || doc.hidden || reduce.matches) { loop.pause(); return; }
      if (!loop.getAttribute('src')) { attach(loop, 'loop', syncLoop); return; }
      play(loop);
    }
    loop.addEventListener('playing', () => box.classList.add('has-loop'));
    loop.addEventListener('error', () => box.classList.remove('has-loop'));

    function load() {
      if (state !== 'idle' || reduce.matches) return;
      state = 'loading';
      attach(film, 'film');
      blobUrl(pick(film, 'film')).then(u => { if (!u && state === 'loading') state = 'failed'; });
    }
    film.addEventListener('loadeddata', () => { if (state === 'loading') { state = 'ready'; progress(p); } });
    film.addEventListener('error', () => { if (state === 'loading' && film.getAttribute('src')) state = 'failed'; });

    const filmFrame = i => Math.max(0, Math.min(LAST, i <= 54 ? Math.ceil(i / 2) : LAST - Math.floor((i - 55) / 2)));
    const end = () => Math.max(0, (film.duration || 0) - .5 / FPS);
    const target = () => p <= A ? t0 : p >= B ? end() : t0 + (p - A) / (B - A) * (end() - t0);
    function seek(t) {
      if (film.seeking) { pending = t; return; }
      if (Math.abs(film.currentTime - t) > .25 / FPS) film.currentTime = t;
    }
    film.addEventListener('seeked', () => {
      if (mode === 'film') box.classList.add('is-film');
      if (pending >= 0) { const t = pending; pending = -1; seek(t); }
    });

    function progress(value) {
      p = value;
      if (p > 0) load();
      if (state !== 'ready') return;
      if (mode === 'loop' && p > .02) {
        mode = 'film';
        loop.pause();
        let i = 0;
        if (box.classList.contains('has-loop')) {
          i = Math.min(110, Math.floor(loop.currentTime * FPS + 1e-3));
          loop.currentTime = (i + .5) / FPS;
        }
        t0 = (filmFrame(i) + .5) / FPS;
        const t = target();
        if (Math.abs(film.currentTime - t) > .25 / FPS) seek(t); else box.classList.add('is-film');
      } else if (mode === 'film' && p < .005) {
        mode = 'loop';
        box.classList.remove('is-film');
        syncLoop();
      } else if (mode === 'film') seek(target());
    }

    function reset() {
      mode = 'loop'; state = 'idle'; t0 = 0; pending = -1;
      box.classList.remove('is-film', 'has-loop');
      detach(film); detach(loop);
      syncLoop();
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; syncLoop(); }).observe(hero);
    }
    doc.addEventListener('visibilitychange', syncLoop);
    reduce.addEventListener?.('change', reset);
    phone.addEventListener?.('change', reset);
    const start = () => { started = true; syncLoop(); };
    if (doc.readyState === 'complete') start(); else addEventListener('load', start, { once: true });
    return { load, progress };
  }

  function finLoop() {
    const video = $('[data-fin-loop]');
    const circle = video && video.closest('[data-fin-circle]');
    if (!video || !circle || !('IntersectionObserver' in window)) return;
    let inView = false;
    const sync = () => {
      if (!inView || doc.hidden || reduce.matches) { video.pause(); return; }
      if (!video.getAttribute('src')) { attach(video, 'loop', sync); return; }
      play(video);
    };
    video.addEventListener('playing', () => circle.classList.add('has-loop'));
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { rootMargin: '25% 0px' }).observe(circle);
    doc.addEventListener('visibilitychange', sync);
    reduce.addEventListener?.('change', sync);
    phone.addEventListener?.('change', () => { detach(video); circle.classList.remove('has-loop'); sync(); });
  }

  function mobileBar() {
    const bar = $('[data-bar]');
    const cta = $('[data-hero-book]');
    const contacts = $('#kontakty');
    if (!bar || !cta || !('IntersectionObserver' in window)) return;
    let hero = true, final = false;
    function update() { bar.classList.toggle('is-visible', !hero && !final); }
    new IntersectionObserver(([entry]) => { hero = entry.isIntersecting; update(); }, { threshold: 0.01 }).observe(cta);
    if (contacts) new IntersectionObserver(([entry]) => { final = entry.isIntersecting; update(); }, { threshold: 0.01 }).observe(contacts);
  }

  function heroScene(film) {
    const hero = $('[data-hero]'), media = $('[data-hero-media]'), frame = $('[data-hero-frame]'), ring = $('[data-hero-ring]');
    const copy = $('[data-hero-copy]'), deep = $('[data-hero-deep]'), shade = $('[data-hero-shade]');
    if (!hero || !media || !frame || !ring || !copy || !deep || !shade) return null;
    const geo = { cx: 0, cy: 0, r0: 0, r1: 0, ax: 0 }, open = { v: 0 }, prog = { v: 0 };
    const ease = typeof LINE === 'function' ? LINE : gsap.parseEase(LINE);
    const S0 = 1.08;
    const measure = () => {
      geo.cx = ring.offsetLeft; geo.cy = ring.offsetTop; geo.r0 = ring.offsetWidth / 2 - 14;
      geo.r1 = Math.hypot(Math.max(geo.cx, media.offsetWidth - geo.cx), Math.max(geo.cy, media.offsetHeight - geo.cy)) + 2;
      geo.ax = phone.matches ? geo.cx : media.offsetWidth * .445;
    };
    const clip = () => {
      const e = open.v, g = ease(Math.min(1, e / .4)), s = S0 + (1 - S0) * g, px = geo.ax + (geo.cx - geo.ax) * g;
      media.style.clipPath = `circle(${(geo.r0 + (geo.r1 - geo.r0) * ease(e)).toFixed(1)}px at ${geo.cx}px ${geo.cy}px)`;
      frame.style.transform = `translate(${(geo.cx - s * px).toFixed(2)}px,${(geo.cy - s * geo.cy).toFixed(2)}px) scale(${s.toFixed(4)})`;
    };
    measure();
    gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: hero, start: 'top top', end: 'bottom bottom', scrub: .2, invalidateOnRefresh: true,
        onRefresh: () => { measure(); clip(); },
        onUpdate: self => { if (self.progress > 0) film.load(); }
      }
    })
      .to(copy, { autoAlpha: 0, y: -16, duration: .1, ease: 'power2.in' }, 0)
      .to(ring, { autoAlpha: 0, scale: 1.1, duration: .12, ease: 'power1.in' }, 0)
      .to(open, { v: 1, duration: .3, onUpdate: clip }, 0)
      .to(shade, { opacity: 1, duration: .08 }, .79)
      .fromTo(deep, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .05, ease: 'power2.out' }, .85)
      .fromTo(prog, { v: 0 }, { v: 1, duration: 1, onUpdate: () => film.progress(prog.v) }, 0);
    return () => { media.style.clipPath = ''; frame.style.transform = ''; };
  }

  function ritualScene() {
    const section = $('[data-ritual]'), track = $('[data-ritual-track]');
    if (!section || !track) return null;
    const cards = $$('.pebble', track);
    if (cards.length !== 3) return null;
    const nums = cards.map(c => $('.minutes', c)), steps = $$('[data-ritual-step]', section), bar = $('[data-ritual-progress]', section);
    section.classList.add('is-carousel');
    const HOLD = .6, MOVE = 1, TOTAL = HOLD * 3 + MOVE * 2;
    const shift = i => -(cards[i].offsetLeft - cards[0].offsetLeft);
    const setStep = i => steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section, start: 'top top', end: () => '+=' + Math.round(innerHeight * 3.2),
        pin: '.ritual-pin', scrub: .2, invalidateOnRefresh: true, anticipatePin: 1,
        snap: { snapTo: [0, (HOLD * 1.5 + MOVE) / TOTAL, 1], inertia: false, duration: { min: .25, max: .7 }, delay: .1, ease: 'power2.inOut' },
        onUpdate: self => { const t = self.progress * TOTAL; setStep(t < HOLD + MOVE / 2 ? 0 : t < HOLD * 2 + MOVE * 1.5 ? 1 : 2); }
      }
    });
    tl.to({}, { duration: HOLD })
      .to(track, { x: () => shift(1), duration: MOVE, ease: 'power2.inOut' })
      .fromTo(nums[1], { x: 140 }, { x: 0, duration: MOVE, ease: 'power3.out' }, '<')
      .to(nums[0], { x: -50, duration: MOVE, ease: 'power2.in' }, '<')
      .to({}, { duration: HOLD })
      .to(track, { x: () => shift(2), duration: MOVE, ease: 'power2.inOut' })
      .fromTo(nums[2], { x: 140 }, { x: 0, duration: MOVE, ease: 'power3.out' }, '<')
      .to(nums[1], { x: -50, duration: MOVE, ease: 'power2.in' }, '<')
      .to({}, { duration: HOLD });
    if (bar) tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: TOTAL }, 0);
    return () => { section.classList.remove('is-carousel'); setStep(0); };
  }

  function finScene() {
    const circle = $('[data-fin-circle]'), ring = $('[data-fin-ring]');
    if (!circle || !ring) return null;
    gsap.fromTo(circle, { clipPath: 'circle(0% at 50% 50%)' }, { clipPath: 'circle(50% at 50% 50%)', ease: LINE,
      scrollTrigger: { trigger: circle, start: 'top 96%', end: 'top 56%', scrub: .2 } });
    gsap.fromTo(ring, { autoAlpha: 0, scale: .88 }, { autoAlpha: 1, scale: 1, ease: 'power2.out',
      scrollTrigger: { trigger: circle, start: 'top 84%', end: 'top 50%', scrub: .2 } });
    return null;
  }

  function rises() {
    if (!('IntersectionObserver' in window)) return null;
    const heads = $$('main h2');
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -10% 0px' });
    heads.forEach(h => { h.classList.add('rise'); io.observe(h); });
    return () => { io.disconnect(); heads.forEach(h => h.classList.remove('rise', 'in')); };
  }

  function motion(film) {
    if (!hasMotion) return;
    gsap.matchMedia().add({ motion: '(prefers-reduced-motion: no-preference)', wide: '(min-width: 900px)' }, ctx => {
      if (!ctx.conditions.motion) return;
      root.classList.add('motion');
      const offs = [heroScene(film), ctx.conditions.wide ? ritualScene() : null, finScene(), rises()];
      return () => { offs.forEach(off => off && off()); root.classList.remove('motion'); };
    });
  }

  function networkState() {
    const note = $('[data-network]');
    if (!note) return;
    const sync = () => { note.hidden = navigator.onLine; };
    addEventListener('offline', sync);
    addEventListener('online', sync);
    sync();
  }

  menu();
  certificate();
  detailsLinks();
  header();
  mobileBar();
  networkState();
  finLoop();
  motion(heroFilm());
})();
