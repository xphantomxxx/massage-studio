(() => {
  const html = document.documentElement;
  if (!html.classList.contains('glx')) return;
  const hero = document.querySelector('.hero'), box = hero && hero.querySelector('.wall-in');
  const imgA = box && box.querySelector('.wall-a'), imgB = box && box.querySelector('.wall-b');
  const irina = hero && hero.querySelector('.irina'), copy = hero && hero.querySelector('.copy');
  const ready = img => (img.decode ? img.decode() : Promise.resolve()).catch(() => {});
  const fail = () => { html.classList.remove('glx-on'); setTimeout(() => html.classList.remove('glx'), 1700); };
  if (!imgA || !imgB || !irina) return fail();

  const cv = document.createElement('canvas');
  cv.className = 'glx-cv'; cv.setAttribute('aria-hidden', 'true');
  const gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) return fail();

  const VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  const FS = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uA,uB,uM;
uniform vec2 uRes;      // холст, CSS px
uniform vec4 uRect;     // плита в CSS px
uniform vec4 uFace;     // пятно у лица: x, y, радиус, сила
uniform vec4 uCopy;     // текст первого экрана: здесь свет приглушён
uniform float uSweep,uW,uLit;
varying vec2 v;
float luma(vec3 c){return dot(c,vec3(.299,.587,.114));}
float hash(vec2 p){p=fract(p*vec2(443.897,441.423));p+=dot(p,p.yx+19.19);return fract((p.x+p.y)*p.x);}
void main(){
  vec2 p=v*uRes, t=(p-uRect.xy)/uRect.zw;
  vec3 a=texture2D(uA,t).rgb, b=texture2D(uB,t).rgb;
  float m=texture2D(uM,v).a;
  // полоса «свет приходит»: ось под 15° к вертикали, передний край резче хвоста
  float u=dot(p,vec2(.966,-.259))-uSweep, bu=u/(u>0.?.55*uW:1.6*uW);   // квадрат, не pow(): у pow с отрицательным основанием результат не определён
  float band=exp(-bu*bu);
  float passed=max(uLit,smoothstep(.4*uW,-2.5*uW,u));
  float stripe=smoothstep(.02,.14,luma(b)-luma(a));
  float fd=length(p-uFace.xy)/uFace.z, face=uFace.w*exp(-fd*fd);
  float trail=(1.-exp(-3.*m))*smoothstep(.02,.12,m);   // мягкое насыщение: край света без «диска», хвост ниже 0,03 — ноль
  vec2 c=abs(p-uCopy.xy)-uCopy.zw;
  float shield=uCopy.z>0.?1.-smoothstep(0.,90.,max(c.x,c.y)):0.;
  float hot=max(trail,.9*band);
  float rest=1.-(1.-.24*stripe*passed)*(1.-face);
  float L=1.-(1.-hot)*(1.-rest);
  L*=1.-.66*shield;
  // полутьма холоднее, свет тёплый; остывающий след краснеет, как угли
  float la=luma(a);
  vec3 cold=mix(vec3(la),a,.3)*vec3(.27,.215,.18);        // неосвещённая стена — шоколад ~#2A221C, не графит
  vec3 tint=mix(vec3(1.1,.84,.6),mix(vec3(1.02,.56,.3),vec3(1.12,.94,.74),smoothstep(.25,.95,hot)),hot/(hot+rest+.001));
  vec3 col=mix(cold,b*tint,L)+vec3(1.,.58,.28)*(.06*L*L+.12*hot*hot);
  vec2 q=v-.5; col*=1.-.5*dot(q,q);
  col+=(hash(gl_FragCoord.xy)-.5)*.05;
  gl_FragColor=vec4(col,1.);
}`;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return fail();
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(pr, n);
  const uRes = U('uRes'), uRect = U('uRect'), uFace = U('uFace'), uCopy = U('uCopy'), uSweep = U('uSweep'), uW = U('uW'), uLit = U('uLit');
  ['uA', 'uB', 'uM'].forEach((n, i) => gl.uniform1i(U(n), i));
  const tex = i => {
    const t = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, t);
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]
      .forEach(([k, val]) => gl.texParameteri(gl.TEXTURE_2D, k, val));
    return t;
  };
  const put = (i, src) => { gl.activeTexture(gl.TEXTURE0 + i); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); };
  const shrink = img => {
    const k = Math.min(1, 1600 / img.naturalWidth), c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return c;
  };
  tex(0); tex(1); tex(2);

  const mc = document.createElement('canvas'), mx = mc.getContext('2d');
  const brush = document.createElement('canvas'); brush.width = brush.height = 64;
  const bx = brush.getContext('2d'), g = bx.createRadialGradient(32, 32, 0, 32, 32, 32);
  [[0, 1], [.25, .8], [.5, .45], [.75, .14], [1, 0]].forEach(([o, a]) => g.addColorStop(o, `rgba(255,255,255,${a})`));
  bx.fillStyle = g; bx.fillRect(0, 0, 64, 64);

  const touch = matchMedia('(hover: none)').matches;
  const TAU = .5, SWEEP = 2600;
  let W = 1, H = 1, Rm = 8, face = [0, 0, 1, 0], copyBox = [0, 0, 0, 0];
  let moved = 0, t0 = 0, sweepAt = -1, lit = 0, visible = true, live = false, breathT0 = 0, breathEnd = 0, raf = 0, last = 0, fadeAcc = 0, lastIn = 0, lastPt = null, dirty = true, drawn = 0;
  const pending = [];

  function measure() {
    W = box.clientWidth || 1; H = box.clientHeight || 1;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    gl.viewport(0, 0, cv.width, cv.height);
    mc.width = touch ? 96 : 160; mc.height = Math.max(8, Math.round(mc.width * H / W)); dirty = true;
    Rm = (touch ? .2 : .09) * mc.width;
    const fx = irina.offsetLeft + irina.offsetWidth * .5, fy = irina.offsetTop + irina.offsetHeight * .3;
    face = [fx, fy, irina.offsetWidth * (touch ? .5 : .42), touch ? .24 : .26];
    copyBox = copy && copy.offsetTop < H ? [copy.offsetLeft + copy.offsetWidth / 2, copy.offsetTop + copy.offsetHeight / 2, copy.offsetWidth / 2 + 24, copy.offsetHeight / 2 + 24] : [0, 0, 0, 0];
    gl.uniform2f(uRes, W, H);
    gl.uniform4f(uRect, imgA.offsetLeft, imgA.offsetTop, imgA.offsetWidth, imgA.offsetHeight);
    gl.uniform4f(uCopy, ...copyBox);
    gl.uniform1f(uW, .06 * (W + H));
  }

  function draw(now) {
    const uw = .06 * (W + H), from = -.259 * H - 3 * uw, to = .966 * W + 3 * uw;
    let k = sweepAt < 0 ? 0 : Math.min(1, (now - sweepAt) / SWEEP);
    k = k * k * (3 - 2 * k);
    gl.uniform1f(uSweep, sweepAt < 0 ? -1e5 : from + (to - from) * k);
    gl.uniform1f(uLit, lit);
    const br = touch && now < breathEnd ? .5 - .5 * Math.cos((now - breathT0) / 7000 * 2 * Math.PI) : 0;
    gl.uniform4f(uFace, face[0], face[1], face[2], face[3] + (touch ? .18 * br - .06 : 0));
    if (dirty) { put(2, mc); dirty = false; }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    drawn = now;
  }

  function frame(now) {
    raf = 0;
    const dt = Math.min(.1, (now - (last || now)) / 1000); last = now;
    fadeAcc = lastIn > 0 ? fadeAcc + dt : 0;
    if (fadeAcc >= 1 / 30) {
      mx.globalCompositeOperation = 'destination-out';
      mx.fillStyle = `rgba(0,0,0,${1 - Math.exp(-fadeAcc / TAU)})`; mx.fillRect(0, 0, mc.width, mc.height);
      fadeAcc = 0; dirty = true;
    }
    if (pending.length) {
      mx.globalCompositeOperation = 'lighter';
      for (const [x, y, a] of pending) { mx.globalAlpha = a; mx.drawImage(brush, x - Rm, y - Rm, 2 * Rm, 2 * Rm); }
      mx.globalAlpha = 1; pending.length = 0; dirty = true;
    }
    const trail = lastIn > 0 && now - lastIn < 2000, sweeping = sweepAt >= 0 && now - sweepAt < SWEEP + 100;
    if (!trail && lastIn > 0) { mx.clearRect(0, 0, mc.width, mc.height); lastIn = 0; dirty = true; }
    const breathing = touch && now < breathEnd;
    if (trail || sweeping || dirty || !breathing || now - drawn > 32) draw(now);
    if (visible && (trail || sweeping || breathing)) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && visible && live) { last = 0; raf = requestAnimationFrame(frame); } };

  function input(cx, cy, a) {
    if (!live) return;
    const r = cv.getBoundingClientRect(), x = (cx - r.left) / r.width * mc.width, y = (cy - r.top) / r.height * mc.height;
    if (x < -Rm || y < -Rm || x > mc.width + Rm || y > mc.height + Rm) { lastPt = null; return; }
    const step = Rm / 3;
    if (lastPt) {
      const dx = x - lastPt[0], dy = y - lastPt[1], d = Math.hypot(dx, dy);
      if (d < step / 2) return;
      const n = Math.min(32, Math.ceil(d / step));
      for (let i = 1; i <= n; i++) pending.push([lastPt[0] + dx * i / n, lastPt[1] + dy * i / n, .3]);
      if ((moved += n) > 8) html.classList.add('glx-touched');
    } else pending.push([x, y, a]);
    lastPt = [x, y]; lastIn = performance.now();
    if (touch) breathEnd = breathT0 + Math.ceil((lastIn + 14000 - breathT0) / 7000) * 7000;
    kick();
  }
  hero.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') input(e.clientX, e.clientY, .3); });
  hero.addEventListener('pointerleave', () => { lastPt = null; });
  hero.addEventListener('touchstart', e => { lastPt = null; input(e.touches[0].clientX, e.touches[0].clientY, .5); }, { passive: true });
  hero.addEventListener('touchmove', e => input(e.touches[0].clientX, e.touches[0].clientY, .3), { passive: true });
  hero.addEventListener('touchend', () => { lastPt = null; }, { passive: true });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible && sweepAt < 0) lit = 1;
    if (visible && live && performance.now() > breathEnd) { breathT0 = performance.now(); breathEnd = breathT0 + 21000; }
    visible ? kick() : (cancelAnimationFrame(raf), raf = 0);
  }).observe(hero);
  new ResizeObserver(() => { if (!live) return; measure(); draw(performance.now()); kick(); }).observe(box);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); live = false; cancelAnimationFrame(raf); raf = 0; cv.remove(); fail(); });

  ready(imgA).then(() => {
    if (!html.classList.contains('glx') || !imgA.naturalWidth) return fail();
    t0 = performance.now();
    const a = shrink(imgA); put(0, a); put(1, a);
    box.appendChild(cv);
    measure(); draw(t0);
    live = true; html.classList.add('glx-on');
    breathT0 = t0; breathEnd = t0 + 21000;
    kick();
    imgB.loading = 'eager';
    ready(imgB).then(() => {
      if (!imgB.naturalWidth) return;
      put(1, shrink(imgB)); dirty = true;
      setTimeout(() => {
        if (visible) sweepAt = performance.now(); else lit = 1;
        draw(performance.now()); kick();
      }, Math.max(0, t0 + 1700 - performance.now()));
    });
  });
})();
