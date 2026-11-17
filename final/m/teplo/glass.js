(() => {
  const hero = document.querySelector('.hero'), cv = hero && hero.querySelector('.hero-glass');
  if (!cv) return;
  const tog = hero.querySelector('[data-vid-toggle]'), pic = hero.querySelector('.hero-still img');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phone = matchMedia('(max-width: 767px)').matches;
  const CELL = 4, REGROW = 3.2, REGROW_DEMO = 6, SPREAD = 1.6, R = phone ? 40 : 58;
  const DEMO = phone ? [[.44, .62], [.70, .36], [.98, .10]] : [[.38, .84], [.62, .50], [.93, .16]];
  const DROPS = phone ? { n: 4, r0: 5, r1: 13 } : { n: 7, r0: 6, r1: 16 };

  const gl = cv.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false });
  const still = () => { hero.classList.remove('is-glass'); hero.classList.add('is-still'); };
  if (!gl) { still(); return; }

  const VS = `#version 300 es
in vec2 p; out vec2 vUv;
void main(){ vUv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;
  const FS_DOWN = `#version 300 es
precision mediump float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec4 uCover;
void main(){ vec2 s = vec2(vUv.x, 1. - vUv.y); o = vec4(texture(uSrc, s * uCover.xy + uCover.zw).rgb, 1.); }`;
  const FS_BLUR = `#version 300 es
precision mediump float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc; uniform vec2 uDir;
void main(){
  vec3 c = texture(uSrc, vUv).rgb * .227027;
  c += (texture(uSrc, vUv + uDir * 1.384615).rgb + texture(uSrc, vUv - uDir * 1.384615).rgb) * .316216;
  c += (texture(uSrc, vUv + uDir * 3.230769).rgb + texture(uSrc, vUv - uDir * 3.230769).rgb) * .070270;
  o = vec4(c, 1.);
}`;
  const FS_GLASS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uSrc, uBlur, uMask;
uniform vec4 uCover;        // экран (y вниз) → кадр
uniform vec2 uCss, uImg;    // холст и кадр на экране, CSS px
uniform float uDpr, uTime, uGlow, uPhone;
uniform vec4 uDrop[10];     // капли: x, y, радиус CSS px, видимость
float h1(vec2 p){ vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h1(i), h1(i + vec2(1, 0)), f.x), mix(h1(i + vec2(0, 1)), h1(i + 1.), f.x), f.y); }
void main(){
  vec2 s = vec2(vUv.x, 1. - vUv.y), c = s * uCss, t = s * uCover.xy + uCover.zw;
  vec3 sharp = texture(uSrc, t).rgb, blur = texture(uBlur, vUv).rgb;
  // за стеклом над камнями поднимается тёплый пар
  float w = vn(c / vec2(60., 120.) + vec2(0., uTime * .45)) * vn(c / vec2(150., 260.) + vec2(uTime * .04, uTime * .16));
  float steam = smoothstep(.22, .55, w) * smoothstep(.4, .65, s.x) * smoothstep(.0, .25, s.y) * (1. - smoothstep(.5, .75, s.y));
  sharp += steam * vec3(.10, .09, .08); blur += steam * vec3(.07, .065, .06);
  float lf = vn(c / 420. + vec2(uTime * .015, 0.)) * .6 + vn(c / 140. + 7.3 - vec2(0., uTime * .025)) * .4;   // пар лежит пятнами и дышит
  float g = h1(floor(gl_FragCoord.xy)), mc = h1(floor(c / 2.) + 17.);   // зерно экрана и микрокапли ~2 CSS px
  vec4 mk = texture(uMask, s);
  float x = mk.r + (lf - .5) * .26 + (g - .5) * .1;
  float clr = smoothstep(.16, .7, x);                                     // протёрто; край 22–28 px, отрастает пятнами
  // со стороны текста (слева и внизу на столе, внизу на телефоне, под шапкой) пар тоньше и темнее: кремовый текст держит контраст
  float side = uPhone > .5 ? 1. - smoothstep(.42, .78, s.y) : min(smoothstep(.42, .8, s.x), 1. - smoothstep(.8, .97, s.y));
  side = min(side, smoothstep(.02, .16, s.y));                          // и под шапкой
  // пар: контраст сцены сжат вдвое, сверху светлая молочная вуаль
  vec3 bl = mix(vec3(.42, .36, .30), blur, mix(1., .55, side));
  vec3 fog = mix(bl, vec3(.86, .80, .72), (.46 + .16 * lf) * mix(.38, 1., side)) + bl * bl * .18 + (g - .5) * .035 + (mc - .5) * .035 * (.6 + lf);
  // в стёртом остаётся плёнка 6–10 % полосами вдоль мазка (шум 1 : 14 по направлению)
  vec2 o2 = mk.gb * 2. - 1.; float th = .5 * atan(o2.y, o2.x + 1e-5); vec2 dv = vec2(cos(th), sin(th));
  float film = clr * (.06 + .04 * vn(vec2(dot(c, dv), dot(c, vec2(-dv.y, dv.x))) / vec2(84., 6.)));
  // капли-линзы: светлые, с бликом; в капле резкий перевёрнутый кадр, вокруг пар тоньше
  vec3 dcol = vec3(0.); float dcov = 0., halo = 0.;
  for (int i = 0; i < 10; i++) {
    vec4 D = uDrop[i];
    if (D.w <= 0.) continue;
    vec2 rel = c - D.xy; float d = length(rel), rad = D.z;
    halo = max(halo, D.w * (1. - smoothstep(rad, rad * 1.6, d)));
    float cov = D.w * (1. - smoothstep(rad - .8 / uDpr, rad + .4 / uDpr, d));
    if (cov <= 0.) continue;
    vec2 q = rel / rad; float r = length(q), z = sqrt(max(0., 1. - r * r));
    vec3 dc = mix(texture(uSrc, t - q * rad * 3. / uImg).rgb, fog, .6);
    dc *= (.85 + .15 * z) * (1. - .15 * smoothstep(.7, 1., r));
    dc += .8 * (1. - smoothstep(0., .3, length(q - vec2(-.28, -.34))));
    dc += .22 * smoothstep(.5, .95, r) * smoothstep(.15, .9, q.y);
    dcol = dc; dcov = cov;
  }
  float dens = (1. - clr) * mix(.84, 1., lf) * (1. - .3 * halo) + film;
  vec3 col = mix(sharp * (1. + .15 * uGlow), fog, dens);
  col += smoothstep(.04, .16, x) * (1. - smoothstep(.16, .3, x)) * vec3(.30, .27, .23);   // мокрый край 5–7 px
  o = vec4(mix(col, dcol, dcov * (1. - clr)), 1.);
}`;

  let pDown, pBlur, pGlass, vao, tSrc, tMask, tA, tB, fA, fB;
  function program(fs) {
    const p = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('glass: ' + gl.getProgramInfoLog(p));
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const name = gl.getActiveUniform(p, i).name; u[name] = gl.getUniformLocation(p, name); }
    return { p, u };
  }
  function texture(mip) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function setup() {
    pDown = program(FS_DOWN); pBlur = program(FS_BLUR); pGlass = program(FS_GLASS);
    gl.useProgram(pGlass.p); gl.uniform1i(pGlass.u.uSrc, 0); gl.uniform1i(pGlass.u.uBlur, 1); gl.uniform1i(pGlass.u.uMask, 2);
    vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    tSrc = texture(true); tMask = texture(); tA = texture(); tB = texture();
    fA = gl.createFramebuffer(); fB = gl.createFramebuffer();
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  }

  let cw = 0, ch = 0, bw = 0, bh = 0, lw = 0, lh = 0, gw = 0, gh = 0, M, RT, OC, OS, U8, srcW = 0, srcH = 0, blurOk = false;
  const cover = [1, 1, 0, 0], img = [1, 1];
  function fitCover() {
    if (!srcW || !cw) return;
    const st = getComputedStyle(hero), px = parseFloat(st.getPropertyValue('--fx')) / 100, py = parseFloat(st.getPropertyValue('--fy')) / 100;
    const z = parseFloat(st.getPropertyValue('--zoom')) || 1;
    const sc = Math.max(cw / srcW, ch / srcH), dw = srcW * sc, dh = srcH * sc;
    cover[0] = cw / (z * dw); cover[1] = ch / (z * dh);
    cover[2] = cw / 2 * (1 - 1 / z) / dw + (dw - cw) * px / dw; cover[3] = ch / 2 * (1 - 1 / z) / dh + (dh - ch) * py / dh;
    img[0] = dw * z; img[1] = dh * z;
    blurOk = false;
  }
  function resize() {
    const w = cv.clientWidth, h = cv.clientHeight;
    if (!w || !h || (w === cw && h === ch)) return false;
    cw = w; ch = h;
    const dpr = Math.min(devicePixelRatio || 1, phone ? 2 : 1.5);
    bw = cv.width = Math.round(cw * dpr); bh = cv.height = Math.round(ch * dpr);
    lw = Math.max(8, Math.round(cw / 6)); lh = Math.max(8, Math.round(ch / 6));
    for (const [t, f] of [[tA, fA], [tB, fB]]) {
      gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, lw, lh, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    }
    gw = Math.ceil(cw / CELL); gh = Math.ceil(ch / CELL);
    M = new Float32Array(gw * gh); RT = new Float32Array(gw * gh); OC = new Float32Array(gw * gh); OS = new Float32Array(gw * gh); U8 = new Uint8Array(gw * gh * 3);
    for (let i = 0; i < gw * gh; i++) { U8[i * 3 + 1] = 255; U8[i * 3 + 2] = 128; }
    gl.bindTexture(gl.TEXTURE_2D, tMask); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB8, gw, gh, 0, gl.RGB, gl.UNSIGNED_BYTE, U8);
    fitCover(); seedDrops();
    return true;
  }
  function upload(el, w, h) {
    gl.bindTexture(gl.TEXTURE_2D, tSrc);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, el); srcW = w; srcH = h;
    gl.generateMipmap(gl.TEXTURE_2D);
    fitCover();
  }

  let live = false;
  function stamp(x, y, r, dx, dy, rate, soft) {
    const cx = x / CELL, cy = y / CELL, cr = Math.max(1.2, r / CELL);
    const i0 = Math.max(0, Math.floor(cx - cr)), i1 = Math.min(gw - 1, Math.ceil(cx + cr)), j0 = Math.max(0, Math.floor(cy - cr)), j1 = Math.min(gh - 1, Math.ceil(cy + cr));
    const l = Math.hypot(dx, dy), c2 = l ? (dx * dx - dy * dy) / (l * l) : 1, s2 = l ? 2 * dx * dy / (l * l) : 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(i + .5 - cx, j + .5 - cy) / cr;
      if (d >= 1) continue;
      const e = soft ? 0 : .5, u = d < e ? 0 : (d - e) / (1 - e), v = 1 - u * u * (3 - 2 * u);
      const k = j * gw + i;
      if (v > M[k]) { M[k] = v; RT[k] = rate; if (l) { OC[k] = c2; OS[k] = s2; } }
    }
    live = true;
  }
  const noise1 = x => { const i = Math.floor(x), f = x - i, h = n => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); }; return h(i) + (h(i + 1) - h(i)) * f * f * (3 - 2 * f); };
  let pathLen = 0, nextDrip = 220;
  function stroke(a, b, r, rate) {
    if (!a) return stamp(b[0], b[1], r * (.78 + .44 * noise1(pathLen / 90)), 0, 0, rate);
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / (r * .25)));
    for (let s = 1; s <= n; s++) {
      const x = a[0] + (b[0] - a[0]) * s / n, y = a[1] + (b[1] - a[1]) * s / n, rr = r * (.78 + .44 * noise1((pathLen + L * s / n) / 90));
      stamp(x, y, rr, b[0] - a[0], b[1] - a[1], rate);
      if (pathLen + L * s / n > nextDrip) { drip(x, y + rr * .78); nextDrip += 200 + Math.random() * 120; }
    }
    pathLen += L;
  }
  function decay(dt) {
    let any = false;
    for (let i = 0, n = M.length; i < n; i++) {
      const v = M[i];
      if (v > 0) {
        const m = v - dt / RT[i];
        if (m > 0) { M[i] = m; any = true; } else M[i] = 0;
        U8[i * 3] = M[i] * 255 + .5 | 0; U8[i * 3 + 1] = OC[i] * 127.5 + 127.5 | 0; U8[i * 3 + 2] = OS[i] * 127.5 + 127.5 | 0;
      }
    }
    gl.bindTexture(gl.TEXTURE_2D, tMask); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gw, gh, gl.RGB, gl.UNSIGNED_BYTE, U8);
    return any;
  }

  const drips = [];
  function drip(x, y) {
    if (drips.length >= 8 || y > ch - 8) return;
    const L = 40 + Math.random() * 100, v0 = 30 + Math.random() * 30;
    drips.push({ x, y, y0: y, t: 0, T: 2 * L / v0, v0, w: 4 + Math.random() * 3 });
  }
  function stepDrips(dt) {
    for (let i = drips.length - 1; i >= 0; i--) {
      const d = drips[i]; d.t = Math.min(d.T, d.t + dt);
      const y = d.y0 + d.v0 * d.t - d.v0 * d.t * d.t / (2 * d.T);
      for (let yy = d.y; yy <= y; yy += 2) stamp(d.x, yy, d.w / 2, 0, 1, REGROW, true);
      d.y = y;
      if (d.t >= d.T) drips.splice(i, 1);
    }
  }

  const drops = [], U_DROP = new Float32Array(40);
  let nextSlide = 4;
  const place = () => ({ x: cw * (.06 + .88 * Math.random()), y: ch * (.06 + .8 * Math.random()), r: DROPS.r0 + (DROPS.r1 - DROPS.r0) * Math.random() ** 1.6, a: 1, s: null });
  function seedDrops() { drops.length = 0; for (let i = 0; i < DROPS.n; i++) drops.push(place()); }
  function stepDrops(dt, time) {
    if (time > nextSlide) {
      const c = drops.filter(d => !d.s && d.a === 1 && d.r > (DROPS.r0 + DROPS.r1) / 2 - 2 && d.y < ch * .62);
      if (c.length) { const d = c[Math.random() * c.length | 0]; d.s = { t: 0, T: 1.2 + Math.random() * .6, y0: d.y, L: 80 + Math.random() * 140, rest: 0 }; }
      nextSlide = time + 6 + Math.random() * 4;
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i], s = d.s;
      if (d.a < 1 && !s) d.a = Math.min(1, d.a + dt / 1.5);
      if (!s) continue;
      if (s.t < s.T) {
        s.t = Math.min(s.T, s.t + dt);
        const u = s.t / s.T, y = s.y0 + s.L * (1 - Math.cos(Math.PI * u)) / 2;
        for (let yy = d.y; yy <= y; yy += 2) stamp(d.x, yy, Math.min(4, Math.max(2.5, d.r * .3)), 0, 1, REGROW, true);
        d.y = y;
      } else if ((s.rest += dt) > 2.6) {
        d.a -= dt / 1.5;
        if (d.a <= 0) { drops.splice(i, 1); drops.push(Object.assign(place(), { a: .01 })); }
      }
    }
    for (let i = 0; i < 10; i++) {
      const d = drops[i];
      U_DROP.set(d ? [d.x, d.y, d.r, Math.max(0, d.a)] : [0, 0, 0, 0], i * 4);
    }
  }

  let glow = 0;
  function draw(time) {
    gl.bindVertexArray(vao);
    if (!blurOk) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fA); gl.viewport(0, 0, lw, lh);
      gl.useProgram(pDown.p); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tSrc);
      gl.uniform1i(pDown.u.uSrc, 0); gl.uniform4fv(pDown.u.uCover, cover); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(pBlur.p); gl.uniform1i(pBlur.u.uSrc, 0);
      for (let i = 0; i < 2; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fB); gl.bindTexture(gl.TEXTURE_2D, tA); gl.uniform2f(pBlur.u.uDir, SPREAD / lw, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, fA); gl.bindTexture(gl.TEXTURE_2D, tB); gl.uniform2f(pBlur.u.uDir, 0, SPREAD / lh); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      blurOk = true;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, bw, bh);
    gl.useProgram(pGlass.p);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tSrc);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tA);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, tMask);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform4fv(pGlass.u.uCover, cover); gl.uniform2f(pGlass.u.uCss, cw, ch); gl.uniform2fv(pGlass.u.uImg, img); gl.uniform1f(pGlass.u.uDpr, bw / cw);
    gl.uniform1f(pGlass.u.uTime, time); gl.uniform1f(pGlass.u.uGlow, glow); gl.uniform1f(pGlass.u.uPhone, phone ? 1 : 0); gl.uniform4fv(pGlass.u['uDrop[0]'], U_DROP);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  const ease = (x1, y1, x2, y2) => u => {
    let lo = 0, hi = 1, t = u;
    for (let i = 0; i < 20; i++) { t = (lo + hi) / 2; const x = 3 * (1 - t) ** 2 * t * x1 + 3 * (1 - t) * t * t * x2 + t ** 3; x < u ? lo = t : hi = t; }
    return 3 * (1 - t) ** 2 * t * y1 + 3 * (1 - t) * t * t * y2 + t ** 3;
  };
  const demoEase = ease(.625, .05, 0, 1);
  let demoT0 = -1, demoP = null, glowT0 = -1;
  function demoStep(now) {
    const u = Math.min(1, (now - demoT0) / 1100), e = demoEase(u), a = 1 - e;
    const p = [0, 1].map(i => (a * a * DEMO[0][i] + 2 * a * e * DEMO[1][i] + e * e * DEMO[2][i]) * (i ? ch : cw));
    stroke(demoP, p, R * (phone ? 1.55 : 1.8) * (.88 + .12 * Math.sin(Math.PI * u)), REGROW_DEMO);
    demoP = p;
    if (u >= 1) { demoT0 = -1; glowT0 = now; }
  }
  function stepGlow(now) {
    if (glowT0 < 0) return false;
    const t = (now - glowT0) / 1000;
    glow = t < .6 ? Math.sin(t / .6 * Math.PI / 2) : t < 2.2 ? .5 + .5 * Math.cos((t - .6) / 1.6 * Math.PI) : 0;
    if (t >= 2.2) glowT0 = -1;
    return true;
  }

  let started = false, onScreen = true, paused = reduce, raf = 0, last = 0, lastDraw = 0, time = 0;
  const wake = () => { if (started && onScreen && !raf) raf = requestAnimationFrame(tick); };
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(.1, (now - last) / 1000) : 1 / 60; last = now;
    if (!paused) { time += dt; stepDrops(dt, time); }
    if (demoT0 >= 0) demoStep(now);
    const glowing = stepGlow(now);
    if (drips.length) stepDrips(dt);
    if (live) live = decay(dt);
    const busy = live || drips.length || demoT0 >= 0 || glowing;
    if (busy || now - lastDraw > 30) { draw(time); lastDraw = now; }
    if (!hero.classList.contains('is-glass')) hero.classList.add('is-glass');
    if (busy || !paused) wake(); else last = 0;
  }
  function start(demo) {
    if (started) return;
    try { setup(); } catch (err) { console.warn(err); still(); return; }
    started = true;
    hero.classList.remove('is-still');
    resize();
    upload(pic, pic.naturalWidth, pic.naturalHeight);
    wake();
    if (demo) setTimeout(() => { demoT0 = performance.now(); demoP = null; pathLen = 0; nextDrip = 160; wake(); }, 900);
    tog.hidden = false;
  }

  const at = (x, y) => { const r = cv.getBoundingClientRect(); return [(x - r.left) * cw / r.width, (y - r.top) * ch / r.height]; };
  let mp = null, tp = null;
  hero.addEventListener('pointermove', e => {
    if (!started || e.pointerType === 'touch') return;
    const p = at(e.clientX, e.clientY); stroke(mp, p, R, REGROW); mp = p; wake();
  }, { passive: true });
  hero.addEventListener('pointerleave', () => { mp = null; });
  hero.addEventListener('touchstart', e => { if (!started) return; tp = at(e.touches[0].clientX, e.touches[0].clientY); stroke(null, tp, R, REGROW); wake(); }, { passive: true });
  hero.addEventListener('touchmove', e => { if (!started || !tp) return; const p = at(e.touches[0].clientX, e.touches[0].clientY); stroke(tp, p, R, REGROW); tp = p; wake(); }, { passive: true });
  hero.addEventListener('touchend', () => { tp = null; }, { passive: true });

  const setTog = () => { tog.textContent = paused ? 'Смотреть' : 'Пауза'; tog.classList.toggle('is-paused', paused); };
  tog.addEventListener('click', () => {
    if (!started) { paused = false; start(false); }
    else { paused = !paused; wake(); }
    setTog();
  });
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (!onScreen && raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    else wake();
  }).observe(hero);
  new ResizeObserver(() => { if (started && resize()) draw(time); }).observe(cv);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); started = false; if (raf) cancelAnimationFrame(raf); raf = 0; still(); tog.hidden = true; });

  if (reduce) { still(); tog.hidden = false; setTog(); return; }
  const go = () => start(true);
  pic.complete && pic.naturalWidth ? go() : pic.addEventListener('load', go, { once: true });
})();
