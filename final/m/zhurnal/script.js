(() => {
  const html = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const N = 9;

  const menu = $('#menu'), menuBtn = $('.menu-btn');
  function setMenu(open) {
    menuBtn.setAttribute('aria-expanded', String(open));
    html.style.overflow = open ? 'hidden' : '';
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
  const navLinks = $$('.nav a');
  const nio = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) navLinks.forEach(a => a.setAttribute('aria-current', String(a.hash === '#' + e.target.id)));
  }), { rootMargin: '-50% 0px -50% 0px' });
  ['par', 'chay', 'ceny', 'mastera', 'podarok', 'kontakty'].forEach(id => { const el = document.getElementById(id); el && nio.observe(el); });

  const cover = $('[data-breath]'), bottomBar = $('[data-bar]'), topBar = $('[data-top]');
  if (cover) new IntersectionObserver(([e]) => {
    cover.classList.toggle('is-away', !e.isIntersecting);
    if (bottomBar) bottomBar.classList.toggle('is-visible', !e.isIntersecting);
    topBar.classList.toggle('is-solid', e.intersectionRatio < .2);
  }, { threshold: [0, .2] }).observe(cover);

  const barrelHost = $('[data-b3l-host]'), barrel = $('[data-b3l]');
  if (barrelHost && barrel) {
    if (reduce) barrel.classList.add('b3l-static');
    else new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      import('../../js/barrel3d.js').catch(() => barrel.classList.add('b3l-static'));
    }, { rootMargin: '100% 0px' }).observe(barrelHost);
  }

  $$('video[data-src]').forEach(v => {
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { v.poster = v.dataset.poster; o.disconnect(); } }, { rootMargin: '50% 0px' }).observe(v);
    if (reduce) {
      const b = document.createElement('button');
      b.className = 'a-btn a-btn-s vid-play'; b.type = 'button'; b.textContent = 'Смотреть';
      b.addEventListener('click', () => { v.src ||= v.dataset.src; v.play(); b.remove(); });
      v.after(b); return;
    }
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { v.src = v.dataset.src; o.disconnect(); } }, { rootMargin: '50% 0px' }).observe(v);
    let done = false;
    v.addEventListener('ended', () => { done = true; v.poster = v.dataset.last; });
    new IntersectionObserver(([e]) => { if (done) return; e.intersectionRatio >= .5 ? v.play().catch(() => {}) : v.pause(); }, { threshold: [0, .5] }).observe(v);
  });

  const card = $('[data-sert]');
  const side = s => {
    card.dataset.sert = s;
    $('.sert-face', card).closest('picture').setAttribute('aria-hidden', String(s !== 'face'));
    $('.sert-back', card).closest('picture').setAttribute('aria-hidden', String(s !== 'back'));
    $$('.sert-toggle button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.side === s)));
  };
  $$('.sert-toggle button').forEach(b => b.addEventListener('click', () => side(b.dataset.side)));
  side('face');

  $$('[data-open]').forEach(a => a.addEventListener('click', () => { const g = document.getElementById(a.dataset.open); if (g) g.open = true; }));

  const makeSlices = (el, img) => {
    if (img) el.style.setProperty('--img', `url(${img})`);
    if (!el.children.length) for (let k = 0; k < N; k++) { const i = document.createElement('i'); i.style.setProperty('--k', k); el.append(i); }
    return [...el.children];
  };

  const ms = $('[data-ms]');
  if (ms) {
    const stage = $('.ms-stage', ms), items = $$('.m', ms);
    const src = m => { const im = $('img', m); return im && (im.currentSrc || im.src); };
    let cur = null;
    const show = m => {
      if (m === cur) return; cur = m;
      items.forEach(x => x.classList.toggle('is-on', x === m));
      const strips = makeSlices(stage, src(m));
      if (reduce || !window.gsap) return;
      gsap.fromTo(strips.map(s => s), { '--y': (i) => (i % 2 ? 4 : -4) + '%', opacity: 0 },
        { '--y': '0%', opacity: 1, duration: .32, stagger: .07, ease: 'power2.out', overwrite: true });
    };
    items.forEach(m => { m.addEventListener('pointerenter', () => show(m)); m.addEventListener('focusin', () => show(m)); });
    const first = () => items[0] && show(items[0]);
    document.readyState === 'complete' ? first() : addEventListener('load', first, { once: true });
  }

  const tocStage = $('.cover-slices'), tocCap = $('.cover-photo figcaption'), tocLinks = $$('.toc a[data-shot]');
  if (tocStage && tocLinks.length) {
    const cap0 = tocCap ? tocCap.innerHTML : '';
    let curT = null;
    const showT = a => {
      if (a === curT || getComputedStyle(tocStage).display === 'none') return;
      tocStage.style.setProperty('--prev', curT ? `url(${curT.dataset.shot})` : 'none');
      curT = a;
      const strips = makeSlices(tocStage, a.dataset.shot);
      if (tocCap) a.dataset.cap ? (tocCap.textContent = a.dataset.cap) : (tocCap.innerHTML = cap0);
      if (reduce || !window.gsap) return;
      gsap.fromTo(strips, { '--y': (i) => (i % 2 ? 4 : -4) + '%', opacity: 0 },
        { '--y': '0%', opacity: 1, duration: .32, stagger: .07, ease: 'power2.out', overwrite: true });
    };
    tocLinks.forEach(a => { a.addEventListener('pointerenter', () => showT(a)); a.addEventListener('focusin', () => showT(a)); });
    $('.toc').addEventListener('pointerenter', () => tocLinks.forEach(a => { new Image().src = a.dataset.shot; }), { once: true });
  }

  function scenes() {
    html.classList.add('ready');
    if (reduce || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (window.SplitText) gsap.registerPlugin(SplitText);
    gsap.config({ autoSleep: 30 });
    ScrollTrigger.config({ ignoreMobileResize: true });

    gsap.from('.toc li', { y: 14, opacity: 0, duration: .32, stagger: .06, ease: 'power2.out',
      scrollTrigger: { trigger: '.toc', start: 'top 84%', once: true } });

    if (window.SplitText) $$('.contents .h2, .spread .h2, .ceny .h2, .mastera .h2, .voprosy .h2, .kamni .h2, .podarok .h2, .back .h2').forEach(el =>
      SplitText.create(el, { type: 'lines', mask: 'lines', autoSplit: true, onSplit: self =>
        gsap.from(self.lines, { yPercent: 105, duration: .26, stagger: .07, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 84%', once: true } }) }));

    const red = $('[data-redact]');
    if (red && window.SplitText) {
      const text = $('.redact-text', red);
      SplitText.create(text, { type: 'lines,words', autoSplit: true, onSplit: self => {
        $$('.bar', red).forEach(b => b.remove());
        const box = red.getBoundingClientRect(), img = getComputedStyle(red).getPropertyValue('--img');
        const groups = [];
        self.lines.forEach(line => {
          let words = [];
          const flush = () => { if (words.length) groups.push({ line, words }); words = []; };
          self.words.filter(word => line.contains(word)).forEach(word => {
            if (word.closest('.redact-keep')) flush();
            else words.push(word);
          });
          flush();
        });
        const bars = groups.map(({ line, words }) => {
          const r = line.getBoundingClientRect(), first = words[0].getBoundingClientRect(), last = words.at(-1).getBoundingClientRect();
          const bar = document.createElement('span'), win = document.createElement('b');
          bar.className = 'bar';
          Object.assign(bar.style, {
            top: (r.top - box.top + r.height * .08) + 'px', left: (first.left - box.left) + 'px',
            width: (last.right - first.left) + 'px', height: (r.height * .84) + 'px'
          });
          Object.assign(win.style, { backgroundImage: img, backgroundSize: `${box.width}px auto`, backgroundPosition: `${box.left - first.left}px ${-(r.top - box.top)}px` });
          bar.append(win); red.append(bar); return bar;
        });
        const wins = bars.map(b => b.firstChild), beat = Math.min(.04, .32 / Math.max(1, bars.length - 1));
        gsap.set(bars, { scaleX: 0 });
        return gsap.timeline({ scrollTrigger: { trigger: red, start: 'top 70%', once: true } })
          .to(bars, { scaleX: 1, duration: .16, stagger: beat, ease: 'power2.inOut' })
          .to(wins, { opacity: 1, duration: .1, ease: 'none' }, '-=.1')
          .to({}, { duration: .4 })
          .to(bars, { scaleX: 0, transformOrigin: '100% 50%', duration: .16, stagger: beat, ease: 'power2.in' });
      } });
    }

    gsap.from('.big-num', { yPercent: 40, opacity: 0, duration: .46, ease: 'power2.out', scrollTrigger: { trigger: '.collage', start: 'top 70%', once: true } });
    $$('.collage figure').forEach((f, i) => gsap.fromTo(f, { yPercent: 6 + i * 3 }, { yPercent: -(4 + i * 2), ease: 'none',
      scrollTrigger: { trigger: '.collage', start: 'top bottom', end: 'bottom top', scrub: true } }));

    $$('[data-curtain]').forEach(sec => {
      const c = $('.curtain', sec);
      gsap.fromTo(c, { scaleY: 0 }, { scaleY: 1, duration: .48, ease: 'power3.inOut', scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
      gsap.from(sec.querySelectorAll('.kicker, .lead, .offer, .a-btn, .btn, .kamni-video, .sert-card, .sert-toggle'), { opacity: 0, y: 16, duration: .3, stagger: .06, delay: .35,
        ease: 'power2.out', scrollTrigger: { trigger: sec, start: 'top 75%', once: true } });
    });

    gsap.from('.back-giant', { yPercent: 70, duration: .6, ease: 'power3.out', scrollTrigger: { trigger: '.back-giant', start: 'top 95%', once: true } });

    document.fonts && document.fonts.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
  }
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', scenes, { once: true }) : scenes();
})();
