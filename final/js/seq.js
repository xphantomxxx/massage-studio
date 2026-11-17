(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function init() {
    document.querySelectorAll('canvas[data-seq]').forEach(cv => {
      const host = cv.closest('[data-seq-pin]').parentElement;
      if (reduce || !window.gsap || !window.ScrollTrigger) { host.classList.add('seq-static'); return; }
      gsap.registerPlugin(ScrollTrigger);
      const n = +cv.dataset.count, land = Math.round((n - 1) * .52), base = cv.dataset.seq, ctx = cv.getContext('2d'), frames = [];
      let cur = -1;
      const draw = i => {
        let k = Math.max(0, Math.min(n - 1, i));
        while (k > 0 && !(frames[k] && frames[k].complete && frames[k].naturalWidth)) k--;
        if (!(frames[k] && frames[k].complete) || k === cur) return;
        cur = k; ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(frames[k], 0, 0, cv.width, cv.height);
      };
      new IntersectionObserver(([e], o) => {
        if (!e.isIntersecting) return; o.disconnect();
        for (let i = 0; i < n; i++) {
          const im = new Image(); im.decoding = 'async';
          im.onload = () => { if (cur < 0) draw(0); };
          im.src = `${base}${String(i + 1).padStart(2, '0')}.webp`; frames[i] = im;
        }
      }, { rootMargin: '100% 0px' }).observe(host);
      const st = { f: 0 }, show = () => draw(Math.round(st.f));
      let state = 'together', tl;
      const explode = () => {
        state = host.dataset.state = 'apart'; tl && tl.kill();
        tl = gsap.timeline();
        if (st.f < land) tl.to(st, { f: land, duration: .53 * (land - st.f) / land, ease: 'none', onUpdate: show });
        tl.to(st, { f: n - 1, duration: 6, ease: 'sine.out', onUpdate: show });
      };
      const assemble = () => {
        state = host.dataset.state = 'together'; tl && tl.kill();
        const from = st.f;
        tl = gsap.timeline({ delay: .3 });
        if (from > 1) tl.to(st, { f: 1, duration: .62, ease: 'none', onUpdate: show });
        tl.to(st, { f: 0, duration: .10, ease: 'power4.in', onUpdate: show });
      };
      ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', refreshPriority: -1, onUpdate: s => {
        const p = s.progress;
        host.style.setProperty('--seq', p.toFixed(3));
        host.dataset.phase = Math.min(3, Math.floor(p * 4));
        if (state === 'together' && p > .15 && p < .85) explode();
        else if (state === 'apart' && (p >= .85 || p < .10)) assemble();
      } });
    });
  }
  document.readyState === 'loading' ? addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
