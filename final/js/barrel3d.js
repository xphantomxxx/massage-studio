import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const roots = document.querySelectorAll('[data-b3l]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const weak = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 3;
roots.forEach(root => {
  if (reduce || weak) return root.classList.add('b3l-static');
  new IntersectionObserver(([e], o) => { if (e.isIntersecting) { o.disconnect(); init(root).catch(err => { console.warn('3D:', err); root.classList.add('b3l-static'); }); } },
    { rootMargin: '100% 0px' }).observe(root);
});

async function init(root) {
  const base = root.dataset.b3l, canvas = root.querySelector('canvas');
  const host = root.closest('[data-b3l-host]') || root;
  const labels = [...root.querySelectorAll('.b3l-labels [data-part]')];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.32;
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 60);

  const key = new THREE.DirectionalLight(0xffcf9a, 3.0);
  key.position.set(3.4, 3.2, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 5;
  key.shadow.camera.left = key.shadow.camera.bottom = -1.6;
  key.shadow.camera.right = key.shadow.camera.top = 1.6;
  scene.add(key, new THREE.HemisphereLight(0xfff1e0, 0x2e241d, 0.4));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d');
  const shadowGradient = shadowContext.createRadialGradient(64, 64, 4, 64, 64, 64);
  shadowGradient.addColorStop(0, 'rgba(0,0,0,.48)');
  shadowGradient.addColorStop(0.45, 'rgba(0,0,0,.24)');
  shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowContext.fillStyle = shadowGradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(1.65, 1.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(shadowCanvas), transparent: true, depthWrite: false })
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.y = 0.002;
  scene.add(contact);

  const [gltf, cedarMap] = await Promise.all([
    new GLTFLoader().loadAsync(base + 'models/barrel.gltf.json'),
    new THREE.TextureLoader().loadAsync(base + 'models/cedar.webp'),
  ]);
  cedarMap.colorSpace = THREE.SRGBColorSpace;
  cedarMap.wrapS = cedarMap.wrapT = THREE.RepeatWrapping;
  cedarMap.repeat.set(5, 1);
  cedarMap.anisotropy = 8;
  const mats = {
    cedar: new THREE.MeshStandardMaterial({ map: cedarMap, color: 0x8a5a38, roughness: 0.6, metalness: 0 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x4a4640, roughness: 0.48, metalness: 0.35 }),
    clay: new THREE.MeshStandardMaterial({ color: 0xc2ae94, roughness: 0.9, metalness: 0 }),
  };
  const model = gltf.scene;
  model.rotation.x = -Math.PI / 2;
  model.updateMatrixWorld(true);
  model.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingBox(); } });
  const box = new THREE.Box3().setFromObject(model);
  const H = box.max.y - box.min.y;
  model.position.y = -box.min.y;
  const meshes = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = true;
    o.userData.kind = /hardware|steel/i.test(o.material.name) ? 'steel' : 'cedar';
    if (o.userData.kind === 'cedar' && !o.geometry.attributes.uv) cylinderUV(o.geometry);
    o.material = mats.clay;
    meshes.push(o);
  });
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  const parts = Object.fromEntries(['Base', 'Body', 'Door', 'Bench', 'Lid'].map(n => [n, model.getObjectByName(n)]).filter(([, o]) => o));
  const rest = Object.fromEntries(Object.entries(parts).map(([n, o]) => [n, o.position.z]));
  const OFFSET = { Lid: 0.62, Bench: 0.30, Body: 0, Door: 0, Base: -0.18 };

  const fit = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const span = H * 1.95, dist = (span / 2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect * 1.15);
    camera.position.set(0, H * 0.62, dist);
    camera.lookAt(0, H * 0.52, 0);
    camera.updateProjectionMatrix();
    dirty();
  };

  const st = { e: 0, squeeze: 0, float: 0, spin: 0, drag: 0, turn: 0 };
  const apply = () => {
    for (const [n, o] of Object.entries(parts)) {
      const k = OFFSET[n] ?? 0;
      o.position.z = rest[n] + H * (k * st.e * (1 + st.float) - Math.sign(k) * 0.03 * st.squeeze * Math.abs(k));
    }
    pivot.rotation.y = st.spin + st.drag + st.turn;
    camera.zoom = 1.5 - st.e * 0.5;
    camera.updateProjectionMatrix();
  };

  const v = new THREE.Vector3(), pb = new THREE.Box3();
  const place = () => {
    const r = canvas.getBoundingClientRect(), rr = root.getBoundingClientRect();
    const left = r.left + r.width / 2 > innerWidth * 0.62 || (r.right + 200 > innerWidth && r.left > 200);
    root.classList.toggle('b3l-left', left);
    labels.forEach(li => {
      const o = parts[li.dataset.part];
      if (!o) return;
      pb.setFromObject(o); v.set(left ? pb.min.x : pb.max.x, (pb.min.y + pb.max.y) / 2, 0).project(camera);
      const x = r.left - rr.left + (v.x * 0.5 + 0.5) * r.width, y = r.top - rr.top + (-v.y * 0.5 + 0.5) * r.height;
      li.style.transform = left ? `translate(calc(${x.toFixed(1)}px - 100%), ${y.toFixed(1)}px)` : `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    });
    root.style.setProperty('--b3l-e', st.e.toFixed(3));
  };

  let raf = 0;
  const frame = () => { raf = 0; apply(); renderer.render(scene, camera); place(); };
  function dirty() { if (!raf) raf = requestAnimationFrame(frame); }

  let down = null, vel = 0, inertia = 0;
  canvas.style.touchAction = 'pan-y';
  canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, d: st.drag }; vel = 0; cancelAnimationFrame(inertia); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => {
    if (!down) return;
    const nd = down.d + (e.clientX - down.x) * 0.008;
    vel = nd - st.drag; st.drag = nd; dirty();
  });
  const release = () => {
    if (!down) return; down = null;
    const step = () => { vel *= 0.92; st.drag += vel; dirty(); if (Math.abs(vel) > 0.0005) inertia = requestAnimationFrame(step); };
    inertia = requestAnimationFrame(step);
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  let state = 'together', tl;
  const tick = () => dirty();
  const explode = () => {
    state = host.dataset.b3l = 'apart'; tl && tl.kill();
    tl = gsap.timeline({ onUpdate: tick })
      .to(st, { squeeze: 1, duration: 0.17, ease: 'power2.in' })
      .to(st, { squeeze: 0, e: 0.86, duration: 0.12, ease: 'none' })
      .to(st, { e: 1, duration: 0.22, ease: 'power3.out' })
      .to(st, { float: 0.015, duration: 6, ease: 'sine.out' });
  };
  const assemble = () => {
    state = host.dataset.b3l = 'together'; tl && tl.kill();
    tl = gsap.timeline({ delay: 0.3, onUpdate: tick })
      .to(st, { e: 0.06, float: 0, duration: 0.62, ease: 'none' })
      .to(st, { e: 0, duration: 0.10, ease: 'power4.in' });
  };
  ScrollTrigger.create({ trigger: host, start: 'top top', end: 'bottom bottom', refreshPriority: -1, onUpdate: s => {
    st.spin = -0.5 + s.progress * 1.1; dirty();
    if (state === 'together' && s.progress > 0.2 && s.progress < 0.8) explode();
    else if (state === 'apart' && (s.progress >= 0.8 || s.progress < 0.12)) assemble();
  } });

  new IntersectionObserver(([e], o) => {
    if (!e.isIntersecting) return; o.disconnect();
    setTimeout(() => { meshes.forEach(m => { m.material = mats[m.userData.kind]; }); root.classList.add('b3l-material'); dirty(); }, 600);
    gsap.to(st, { turn: Math.PI * 2, duration: 2.4, ease: 'power2.inOut', delay: 0.2, onUpdate: dirty });
  }, { threshold: 0.5 }).observe(root);

  new ResizeObserver(fit).observe(canvas);
  fit();
  root.classList.add('b3l-live');
}

function cylinderUV(geometry) {
  geometry.computeBoundingBox();
  const b = geometry.boundingBox, p = geometry.attributes.position, uv = new Float32Array(p.count * 2), h = (b.max.z - b.min.z) || 1;
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = Math.atan2(p.getY(i), p.getX(i)) / (Math.PI * 2) + 0.5;
    uv[i * 2 + 1] = (p.getZ(i) - b.min.z) / h;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
