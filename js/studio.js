// Alat bersama kedua halaman: geometri, tekstur kanvas, lingkungan cahaya, dan timeline scroll.
import * as THREE from './vendor/three.module.min.js';
export { THREE };

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const inOut = t => (t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2); // power2.inOut
export const seg = (t, a, b) => clamp((t - a) / (b - a));

// Timeline: keys = [[t, a, b, ...], ...]. Mengembalikan nilai terinterpolasi ke out.
export function track(t, keys, out = []) {
  let i = 0;
  while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
  const A = keys[i], B = keys[i + 1] || A;
  const k = B === A ? 0 : inOut(seg(t, A[0], B[0]));
  for (let n = 1; n < A.length; n++) out[n - 1] = lerp(A[n], B[n], k);
  return out;
}

export function roundedShape(w, h, r) {
  const x = -w / 2, y = -h / 2, s = new THREE.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// Balok bersudut bulat dan bertepi halus, berpusat di titik nol.
export function rr(w, h, d, r = .02, bevel = .008, segs = 3) {
  const g = new THREE.ExtrudeGeometry(roundedShape(w - bevel * 2, h - bevel * 2, Math.max(.001, r - bevel)), {
    depth: Math.max(.0005, d - bevel * 2), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: 10,
  });
  g.translate(0, 0, -(d - bevel * 2) / 2);
  return g;
}

export function extrude(shape, depth, bevel = .02, segs = 4, curve = 24) {
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: segs, curveSegments: curve });
}

// Benda putar pada sumbu Z: pts = [[radius, z], ...]
export function lathe(pts, n = 96) {
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), n);
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// Cincin bergerigi sungguhan (bukan tekstur) untuk ring karet dan dial, sumbu Z.
export function ribbedRing(R, inner, depth, teeth, tooth = .008) {
  const s = new THREE.Shape();
  const n = teeth * 4;
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI * 2;
    const r = R - (i % 4 < 2 ? 0 : tooth);
    i ? s.lineTo(Math.cos(a) * r, Math.sin(a) * r) : s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  if (inner > 0) { const h = new THREE.Path(); h.absarc(0, 0, inner, 0, Math.PI * 2, true); s.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 48 });
  return g;
}

export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat, opts.repeat); }
  return t;
}

// Peta tonjolan kulit: titik acak yang saling menumpuk.
export function leatherBump(repeat = 6) {
  return canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = '#808080'; x.fillRect(0, 0, w, h);
    let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 9000; i++) {
      const v = 70 + rnd() * 120 | 0;
      x.fillStyle = `rgb(${v},${v},${v})`;
      x.beginPath(); x.arc(rnd() * w, rnd() * h, 1 + rnd() * 3.2, 0, 7); x.fill();
    }
  }, { data: true, repeat });
}

// Studio virtual: kubah gradasi dan panel softbox terang. Inilah sumber kilau logam dan plastik.
export function studioEnv(renderer, { top, mid, bottom, panels }) {
  const scene = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { a: { value: new THREE.Color(top) }, b: { value: new THREE.Color(mid) }, c: { value: new THREE.Color(bottom) } },
    vertexShader: 'varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 p; uniform vec3 a,b,c; void main(){ float y=p.y; vec3 col = y>0. ? mix(b,a,smoothstep(0.,.8,y)) : mix(b,c,smoothstep(0.,-.8,-(-y))); gl_FragColor=vec4(col,1.); }',
  }));
  scene.add(dome);
  for (const p of panels) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.h), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color).multiplyScalar(p.power), side: THREE.DoubleSide, toneMapped: false }));
    m.position.set(...p.pos); m.lookAt(0, 0, 0);
    scene.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(scene, 0.015);
  pm.dispose();
  return rt.texture;
}

export function makeRenderer(canvas, dprMax = 2) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  r.setClearColor(0, 0);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.setPixelRatio(Math.min(devicePixelRatio, dprMax));
  return r;
}

// Nilai scroll yang diredam: animasi tetap halus walau roda mouse melompat.
export function dampedScroll(rate = 6) {
  const s = { value: scrollY, target: scrollY, update(dt) { s.target = scrollY; s.value += (s.target - s.value) * (1 - Math.exp(-dt * rate)); return s.value; } };
  return s;
}

export function loop(fn) {
  let last = performance.now();
  const f = now => { const dt = Math.min(.25, (now - last) / 1000); last = now; fn(dt, now / 1000); requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
