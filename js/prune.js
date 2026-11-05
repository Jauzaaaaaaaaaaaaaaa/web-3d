import { THREE, clamp, lerp, seg, track, rr, canvasTex, studioEnv, makeRenderer, dampedScroll, loop } from './studio.js';

await document.fonts.load('800 60px "Inter Tight"');

history.scrollRestoration = 'manual'; scrollTo(0, 0);

/* ---------- Warna halaman mengikuti rasa yang melewati tengah layar ---------- */
const root = document.documentElement;
const obs = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) root.dataset.flavour = ['tag', 'hero'].includes(e.target.id) ? 'base' : e.target.id;
}), { rootMargin: '-50% 0px -50% 0px' });
document.querySelectorAll('main section').forEach(s => obs.observe(s));

/* ---------- Pengaturan pembuat gambar ---------- */
const frontCanvas = document.getElementById('front'), backCanvas = document.getElementById('back');
const renderer = makeRenderer(frontCanvas);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;
const backCtx = backCanvas.getContext('2d');

const scene = new THREE.Scene();
const view = new THREE.PerspectiveCamera(30, 1, .1, 40);
view.position.z = 6;
const LAYER_BACK = 1, LAYER_FRONT = 2;
scene.environment = studioEnv(renderer, {
  top: '#ffffff', mid: '#f4ece4', bottom: '#b9a99c',
  panels: [
    { w: 10, h: 10, pos: [-10, 8, 8], color: '#ffffff', power: 5.5 },
    { w: 3, h: 16, pos: [12, 2, 5], color: '#fff4ea', power: 6 },
    { w: 1.6, h: 14, pos: [-3, 2, 15], color: '#ffffff', power: 5 },
    { w: 14, h: 4, pos: [0, -10, 4], color: '#ffe3cf', power: 1.4 },
  ],
});
scene.environmentIntensity = .72;
const sun = new THREE.DirectionalLight('#fff4e8', 1.5);
sun.position.set(-3.5, 4.5, 7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 5, bottom: -5, near: 1, far: 22 });
sun.shadow.radius = 14; sun.shadow.blurSamples = 20; sun.shadow.bias = -.0006;
scene.add(sun);
sun.layers.enableAll();
const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 20), new THREE.ShadowMaterial({ opacity: .12, color: 0x2a140c }));
wall.position.z = -1.1; wall.receiveShadow = true; wall.layers.set(LAYER_FRONT); scene.add(wall);

const setLayer = (o, l) => o.traverse(c => c.layers.set(l));
const shadow = o => o.traverse(c => { if (c.isMesh) c.castShadow = true; });

/* ---------- Tabung lip tint: dipres pipih di ujung, membulat ke nosel ---------- */
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const tubeGeo = (() => {
  const R = 72, H = 72, L = .66, pos = [], uv = [], idx = [];
  for (let j = 0; j <= H; j++) {
    const v = j / H, y = lerp(-L, L, v);
    const flat = sstep(.14, 1, v);
    const a = lerp(.122, .192, flat), b = lerp(.122, .007, flat * flat * (3 - 2 * flat));
    const shoulder = sstep(0, .1, v);
    for (let i = 0; i <= R; i++) {
      const th = i / R * Math.PI * 2;
      pos.push(Math.cos(th) * a * lerp(.5, 1, shoulder), y, Math.sin(th) * b * lerp(.5, 1, shoulder));
      uv.push(1 - i / R, v);
    }
  }
  for (let j = 0; j < H; j++) for (let i = 0; i < R; i++) {
    const a = j * (R + 1) + i, b = a + 1, c = a + R + 1, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
})();

function makeTube(color, textColor) {
  const map = canvasTex(1024, 2048, (x, W, H) => {
    x.fillStyle = color; x.fillRect(0, 0, W, H);
    x.save(); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, 0, W, 34); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(0, 34, W, 3); x.restore(); // sambungan press
    for (const cx of [W * .25, W * .75]) {
      x.save(); x.translate(cx, H * .55); x.rotate(Math.PI / 2);
      x.fillStyle = textColor; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = '700 290px "Inter Tight"'; x.letterSpacing = '-14px'; x.scale(.94, 1);
      x.fillText('prune', 0, 0);
      x.restore();
      x.save(); x.translate(cx, H * .8); x.fillStyle = textColor; x.globalAlpha = .75; x.textAlign = 'center'; x.font = '600 30px "Inter Tight"';
      x.fillText('LIP TINT', 0, 0); x.fillText('12 ML', 0, 42); x.restore();
    }
  });
  const body = new THREE.Mesh(tubeGeo, new THREE.MeshPhysicalMaterial({ map, roughness: .42, metalness: 0, clearcoat: .55, clearcoatRoughness: .28, side: THREE.DoubleSide }));
  const capMat = new THREE.MeshPhysicalMaterial({ color, roughness: .22, clearcoat: 1, clearcoatRoughness: .1 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.062, .05, .05, 40), new THREE.MeshStandardMaterial({ color: 0xd9b476, metalness: 1, roughness: .22 }));
  neck.position.y = -.685;
  const cap = new THREE.Mesh(new THREE.CapsuleGeometry(.056, .15, 12, 40), capMat);
  cap.position.y = -.81;
  const g = new THREE.Group(); g.add(body, neck, cap);
  shadow(g); setLayer(g, LAYER_FRONT); scene.add(g);
  return g;
}
const tubeBrown = makeTube('#3f2116', '#e9d8c5');
const tubeNude = makeTube('#c98a6e', '#3a1c11');
const tubeRed = makeTube('#b3122f', '#ffe9ea');

/* ---------- Label gantung ---------- */
const tag = new THREE.Group();
{
  const face = canvasTex(1024, 1640, (x, W, H) => {
    x.fillStyle = '#35190f'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#ecdfcf'; x.textAlign = 'center';
    x.font = '700 250px "Inter Tight"'; x.letterSpacing = '-14px'; x.fillText('prune', W / 2, H * .42);
    x.letterSpacing = '6px'; x.font = '600 34px "Inter Tight"'; x.fillText('LIP TINT THAT MELTS', W / 2, H * .5);
    x.fillText('CACAO · PÊCHE · FRAMBOISE', W / 2, H * .54);
    x.font = '600 28px "Inter Tight"'; x.fillText('EST. MMXXVI', W / 2, H * .92);
    x.fillStyle = '#d9b476'; x.beginPath(); x.arc(W / 2, H * .06, 36, 0, 7); x.fill(); x.fillStyle = '#17080a'; x.beginPath(); x.arc(W / 2, H * .06, 22, 0, 7); x.fill();
  });
  const m = new THREE.MeshStandardMaterial({ map: face, roughness: .62 });
  const side = new THREE.MeshStandardMaterial({ color: 0x2a130b, roughness: .7 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(.72, 1.15, .014), [side, side, side, side, m, m]);
  tag.add(slab);
  const line = new THREE.MeshStandardMaterial({ color: 0x4a4a48, roughness: .6 });
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.0028, .0028, 6, 6), line);
    c.position.set(s * .012, .5 + 3, 0); c.rotation.z = s * .012; tag.add(c);
  }
  shadow(tag); setLayer(tag, LAYER_FRONT); scene.add(tag);
}

/* ---------- Bahan: cokelat, persik, raspberry ---------- */
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function noise(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = x - i, v = y - j, w = z - k;
  const f = t => t * t * (3 - 2 * t), a = f(u), b = f(v), c = f(w);
  const L = (d, e, g) => hash(i + d, j + e, k + g);
  return lerp(lerp(lerp(L(0, 0, 0), L(1, 0, 0), a), lerp(L(0, 1, 0), L(1, 1, 0), a), b), lerp(lerp(L(0, 0, 1), L(1, 0, 1), a), lerp(L(0, 1, 1), L(1, 1, 1), a), b), c);
}
const fbm = (x, y, z) => noise(x, y, z) * .55 + noise(x * 2.1, y * 2.1, z * 2.1) * .3 + noise(x * 4.4, y * 4.4, z * 4.4) * .15;

const chocMat = new THREE.MeshPhysicalMaterial({ color: 0x3c1a0d, roughness: .4, clearcoat: .22, clearcoatRoughness: .34, sheen: .25, sheenColor: new THREE.Color(0x8a4f2c) });
function chocGeo(seedN) {
  // Patahan cokelat: balok dengan alur batang di satu sisi dan tepi patah yang kasar.
  const g = new THREE.BoxGeometry(1, 1, .42, 34, 34, 10), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const ex = Math.abs(v.x) * 2, ey = Math.abs(v.y) * 2;
    const edge = Math.max(ex, ey), rough = fbm(v.x * 3 + seedN, v.y * 3, v.z * 3 + seedN) - .5;
    const broken = sstep(.72, 1, edge) * rough * .42;
    v.x *= 1 + broken; v.y *= 1 + broken * .8;
    const rx = 1 - Math.max(0, ex - .85) * 2, ry = 1 - Math.max(0, ey - .85) * 2;
    if (v.z > 0) { v.z *= clamp(rx * ry, .3, 1); v.z -= .07 * (Math.exp(-((v.x * 18) ** 2)) + Math.exp(-((v.y * 18) ** 2))); }
    v.z += rough * .03 * sstep(.6, 1, edge);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}
const chocs = [chocGeo(1), chocGeo(7), chocGeo(13)];
const fleckGeo = new THREE.IcosahedronGeometry(.5, 0);

const peachGeo = (() => {
  const g = new THREE.SphereGeometry(.5, 96, 64), p = g.attributes.position, col = [];
  const v = new THREE.Vector3(), a = new THREE.Color('#f4b56a'), b = new THREE.Color('#ea7a4c'), c = new THREE.Color('#b93a3c');
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const groove = Math.exp(-((v.x * 12) ** 2)) * (v.z > 0 ? 1 : .35);
    const n = v.clone().normalize();
    v.multiplyScalar(1 - groove * .055 + (n.y > 0 ? n.y ** 4 * -.07 : 0));
    p.setXYZ(i, v.x, v.y, v.z);
    const blush = clamp(.42 + n.x * .42 + n.y * .2 + (noise(n.x * 1.4 + 4, n.y * 1.4, n.z * 1.4) - .5) * .4);
    const k = a.clone().lerp(b, sstep(.15, .6, blush)).lerp(c, sstep(.55, .95, blush));
    col.push(k.r, k.g, k.b);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
})();
const peachMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .66, sheen: 1, sheenRoughness: .5, sheenColor: new THREE.Color(0xffd9c4) });

function makeRaspberry() {
  const N = 210, m = new THREE.InstancedMesh(new THREE.SphereGeometry(.082, 18, 14),
    new THREE.MeshPhysicalMaterial({ color: 0x8d0822, roughness: .26, clearcoat: .7, clearcoatRoughness: .18, sheen: .5, sheenColor: new THREE.Color(0xff5a7a) }), N);
  const o = new THREE.Object3D(), gold = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 1.9, r = Math.sqrt(1 - y * y), th = i * gold;
    const stretch = y > 0 ? 1 : lerp(1, .78, -y);
    o.position.set(Math.cos(th) * r * .42 * stretch, y * .5, Math.sin(th) * r * .42 * stretch);
    const s = .9 + hash(i, 2, 3) * .22; o.scale.setScalar(s);
    o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(.4, 24, 16), new THREE.MeshStandardMaterial({ color: 0x4e0617, roughness: .8 }));
  core.scale.set(1, 1.2, 1);
  const g = new THREE.Group(); g.add(core, m);
  return g;
}

/* Bahan melayang, tiap benda punya kecepatan parallax sendiri. Kecil lambat dan kabur, besar cepat dan tajam. */
const floats = [];
function floatObj(obj, u0, u1, x, y, z, s, speed, front) {
  shadow(obj); setLayer(obj, front ? LAYER_FRONT : LAYER_BACK); scene.add(obj);
  const spin = [hash(x, y, 1) - .5, hash(x, y, 2) - .5, hash(x, y, 3) - .5];
  floats.push({ obj, u0, u1, x, y, z, s, speed, front, spin, base: [hash(x, 1, y) * 6, hash(x, 2, y) * 6, hash(x, 3, y) * 6] });
}
const M = (g, m) => new THREE.Mesh(g, m);
// Cacao
[[.1, .62, -.2, .34, .5, 0, 1], [.36, .5, .3, .5, .55, 2, 1], [.9, -.1, .25, .46, .6, 1, 1], [-.08, -.5, .1, .3, .42, 2, 1], [.72, -.72, .5, .75, .85, 0, 1], [-.34, .78, .15, .36, .5, 1, 1], [.2, -.86, .2, .4, .62, 2, 1], [.58, .86, .05, .3, .45, 2, 1],
 [-.62, .55, -.8, .3, .25, 1, 0], [-.9, -.15, -.8, .34, .25, 2, 0], [.66, .78, -.8, .24, .2, 0, 0], [-.2, .85, -.9, .2, .2, 1, 0]]
  .forEach(([x, y, z, s, sp, gi, f]) => floatObj(M(chocs[gi], chocMat), 1.72, 3.1, x, y, z, s, sp, f));
for (let i = 0; i < 26; i++) floatObj(M(fleckGeo, chocMat), 1.72, 3.1, hash(i, 1, 9) * 2 - 1, hash(i, 2, 9) * 2 - 1, -.3 + hash(i, 3, 9) * .4, .018 + hash(i, 4, 9) * .05, .2 + hash(i, 5, 9) * .3, hash(i, 6, 9) > .4);
// Peche
[[.08, .26, -.1, .78, .36, 1], [-.82, -.55, .1, .55, .6, 1], [.86, .55, .1, .5, .55, 1], [-.08, -.92, .3, .4, .7, 1], [.42, -.7, -.7, .3, .3, 0], [-.72, .66, -.8, .3, .22, 0], [.5, .8, .1, .42, .5, 1], [-.5, .1, -.7, .34, .24, 0], [.72, -.3, -.6, .28, .26, 0]]
  .forEach(([x, y, z, s, sp, f]) => floatObj(M(peachGeo, peachMat), 2.92, 4.1, x, y, z, s, sp, f));
// Framboise
[[-.3, .56, .1, .48, .32, 1], [.84, .36, .1, .6, .55, 1], [-.5, -.72, .2, .42, .6, 1], [.36, -.8, .7, .85, 1.25, 1], [-.84, .35, -.7, .3, .2, 0], [.55, .75, -.8, .26, .22, 0], [-.92, -.4, -.8, .3, .25, 0], [.1, .88, .2, .36, .5, 1], [-.72, -.86, .3, .34, .55, 1]]
  .forEach(([x, y, z, s, sp, f]) => floatObj(makeRaspberry(), 3.92, 5.08, x, y, z, s, sp, f));

/* ---------- Tas kertas dengan tali ---------- */
const bag = new THREE.Group();
{
  const W = 1.3, H = 1.42, D = .46;
  const front = canvasTex(1024, 1120, (x, w, h) => {
    x.fillStyle = '#200e08'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,240,225,.035)'; for (let i = 0; i < h; i += 3) x.fillRect(0, i, w, 1);
    x.fillStyle = '#e5d3bd'; x.textAlign = 'center'; x.font = '700 240px "Inter Tight"'; x.letterSpacing = '-14px'; x.fillText('prune', w / 2, h * .62);
    x.letterSpacing = '8px'; x.font = '600 26px "Inter Tight"'; x.fillText('LIP TINT THAT MELTS', w / 2, h * .7);
  });
  const paper = new THREE.MeshStandardMaterial({ color: 0x1f0d07, roughness: .62 });
  const faceMat = new THREE.MeshStandardMaterial({ map: front, roughness: .58 });
  const fr = new THREE.Mesh(new THREE.BoxGeometry(W, H, .012), [paper, paper, paper, paper, faceMat, paper]); fr.position.z = D / 2;
  const bk = new THREE.Mesh(new THREE.BoxGeometry(W, H, .012), paper); bk.position.z = -D / 2;
  const inner = new THREE.MeshStandardMaterial({ color: 0x170905, roughness: .8 });
  const bt = new THREE.Mesh(new THREE.BoxGeometry(W, .012, D), inner); bt.position.y = -H / 2;
  bag.add(fr, bk, bt);
  // sisi dengan lipatan ke dalam
  for (const s of [-1, 1]) {
    for (const k of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(.012, H, D * .54), paper);
      p.position.set(s * (W / 2 - .06), 0, k * D * .25); p.rotation.y = -s * k * .46; bag.add(p);
    }
  }
  // tali dan mata tali
  const rope = new THREE.MeshStandardMaterial({ color: 0xe9dcc5, roughness: .9 });
  const eye = new THREE.MeshStandardMaterial({ color: 0xd8b070, roughness: .28, metalness: 1 });
  for (const z of [D / 2 + .012, -D / 2 - .012]) {
    const c = new THREE.CatmullRomCurve3([[-.3, .5], [-.3, .62], [-.26, .86], [-.1, 1.02], [.1, 1.02], [.26, .86], [.3, .62], [.3, .5]].map(([x, y]) => new THREE.Vector3(x, y, z)));
    bag.add(new THREE.Mesh(new THREE.TubeGeometry(c, 80, .017, 12), rope));
    for (const x of [-.3, .3]) { const t = new THREE.Mesh(new THREE.TorusGeometry(.03, .009, 10, 28), eye); t.position.set(x, .5, z); bag.add(t); }
  }
  shadow(bag); setLayer(bag, LAYER_FRONT); scene.add(bag);
}

/* ---------- Struk: dicetak dari atas, bergelombang seperti kertas termal ---------- */
const RW = .92, RH = 4.2;
const receiptTex = canvasTex(920, 4200, (x, W, H) => {
  x.clearRect(0, 0, W, H);
  // tepi bergerigi atas dan bawah
  const teeth = (y, dir) => { x.lineTo(W, y); for (let i = W; i > 0; i -= 30) { x.lineTo(i - 15, y + dir * 16); x.lineTo(i - 30, y); } };
  x.fillStyle = '#fbfaf6'; x.beginPath(); x.moveTo(0, 14); for (let i = 0; i < W; i += 30) { x.lineTo(i + 15, 0); x.lineTo(i + 30, 14); } x.lineTo(W, H - 18); teeth(H - 18, 16); x.closePath(); x.fill();
  const ink = '#201712'; x.fillStyle = ink; x.textAlign = 'left';
  const T = (t, xx, y, s, w = 600, a = 'left') => { x.textAlign = a; x.font = `${w} ${s}px "Inter Tight"`; x.fillText(t, xx, y); };
  // ilustrasi tiga tabung
  const g = x.createLinearGradient(0, 80, 0, 900); g.addColorStop(0, '#ecd4c4'); g.addColorStop(1, '#f6e5da');
  x.fillStyle = g; x.fillRect(70, 110, W - 140, 760);
  [['#c98a6e', 280, -.3], ['#3f2116', 460, 0], ['#b3122f', 640, .3]].forEach(([c, cx, r]) => {
    x.save(); x.translate(cx, 500); x.rotate(r); x.fillStyle = c; x.beginPath(); x.moveTo(-58, -300); x.lineTo(58, -300); x.lineTo(38, 170); x.lineTo(16, 200); x.lineTo(16, 320); x.lineTo(-16, 320); x.lineTo(-16, 200); x.lineTo(-38, 170); x.closePath(); x.fill(); x.restore();
  });
  x.fillStyle = ink;
  T('prune', W / 2, 1040, 120, 700, 'center');
  T('ORDER #2610 · 16:00', W / 2, 1110, 30, 600, 'center');
  const row = (y, a, b) => { T(a, 80, y, 40, 500); T(b, W - 80, y, 40, 500, 'right'); };
  row(1270, 'Cacao Lip Tint', '€24.00'); row(1350, 'Pêche Lip Tint', '€24.00'); row(1430, 'Framboise Lip Tint', '€24.00');
  x.fillRect(80, 1490, W - 160, 3);
  row(1570, 'Subtotal', '€72.00'); row(1650, 'Trio saving', '−€10.00'); row(1730, 'Shipping', 'Free');
  x.setLineDash([12, 10]); x.lineWidth = 3; x.strokeStyle = ink; x.beginPath(); x.moveTo(80, 1800); x.lineTo(W - 80, 1800); x.stroke(); x.setLineDash([]);
  T('Total', 80, 1920, 78, 700); T('€62.00', W - 80, 1920, 78, 700, 'right');
  x.fillRect(80, 1970, W - 160, 3);
  let bx = 130; let s = 21; const bars = () => (s = (s * 16807) % 2147483647) / 2147483647;
  while (bx < W - 130) { const w = 3 + bars() * 13; x.fillRect(bx, 2360, w, 300); bx += w + 4 + bars() * 10; }
  T('0 4 8 2 6 1 0  9 6 3 5 7 1', W / 2, 2720, 34, 600, 'center');
  T('Thank you, dear.', W / 2, 2860, 54, 500, 'center');
  x.setLineDash([12, 10]); x.beginPath(); x.moveTo(40, 3000); x.lineTo(W - 40, 3000); x.stroke(); x.setLineDash([]);
  T('−15%', 90, 3300, 170, 800);
  x.beginPath(); x.arc(760, 3240, 70, 0, 7); x.lineWidth = 6; x.stroke(); T('p', 760, 3265, 76, 700, 'center');
  T('ON YOUR NEXT ORDER', 90, 3380, 34, 600);
  x.beginPath(); x.roundRect(90, 3440, 420, 86, 43); x.fill(); x.fillStyle = '#fff'; T('MELT15', 300, 3498, 44, 700, 'center');
  x.fillStyle = ink; T('Valid for 30 days', 90, 3620, 30, 500);
});
const receiptGeo = new THREE.PlaneGeometry(RW, RH, 18, 110);
const receipt = new THREE.Mesh(receiptGeo, new THREE.MeshStandardMaterial({ map: receiptTex, transparent: true, alphaTest: .4, roughness: .78, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: receiptTex, emissiveIntensity: .32 }));
const rBase = receiptGeo.attributes.position.array.slice();
setLayer(receipt, LAYER_FRONT); scene.add(receipt);

/* ---------- Timeline. u = indeks bagian + pecahan scroll di dalam bagian ---------- */
// [u, x, y, z, rx, ry, rz, s] dengan x,y pecahan setengah layar
const K = {
  tag: [[0, .14, .56, 0, 0, .22, 0, 1], [.22, .15, .1, 0, .02, .7, -.03, 1.05], [.48, .16, -.32, 0, 0, 1.5, .03, 1.05], [.7, .17, -1.5, 0, 0, 2.6, 0, 1.05], [1, .17, -1.5, 0, 0, 2.6, 0, 1.05]],
  brown: [[1.05, .04, 1.65, 0, .1, .9, -.1, 1.2], [1.28, .05, .24, .2, 0, .28, -.1, 1.2], [1.62, .05, .22, .2, 0, .2, -.1, 1.2], [1.86, .09, -.2, .35, 0, .14, -.12, 1.16],
    [2.1, .42, -.04, .4, 0, -.2, -.82, 1.1], [2.86, .42, -.04, .4, .05, .42, -.72, 1.1], [3.06, 1.5, .6, .4, 0, 1, -1.1, 1], [5.1, 1.5, .6, .4, 0, 1, -1.1, 1], [5.11, .6, 1.8, .1, 0, .3, -.2, .86], [5.22, .6, 1.8, .1, 0, .3, -.2, .86], [5.36, .6, .1, 0, 0, .3, -.12, .86], [5.48, .6, -.22, 0, 0, .3, -.1, .86], [6, .6, -.22, 0, 0, .3, -.1, .86]],
  nude: [[1.08, -.28, 1.7, 0, .1, .9, .42, 1.2], [1.3, -.27, .26, .1, 0, .28, .44, 1.2], [1.62, -.26, .25, .1, 0, .2, .44, 1.2], [1.88, -.36, 1.7, 0, 0, .1, .6, 1.2],
    [2.9, -.2, 1.7, .3, 0, .8, .4, 1.2], [3.14, -.03, -.03, .4, 0, -.12, .4, 1.22], [3.86, -.03, -.03, .4, .05, .36, .34, 1.22], [4.06, -1.4, .3, .4, 0, 1, .8, 1.1], [5.2, -1.4, .3, .4, 0, 1, .8, 1.1], [5.21, .64, 1.8, .1, 0, -.2, -.1, .86], [5.46, .64, 1.8, .1, 0, -.2, -.1, .86], [5.6, .64, .04, 0, 0, -.1, -.08, .86], [5.72, .645, -.28, 0, 0, -.1, -.1, .86], [6, .645, -.28, 0, 0, -.1, -.1, .86]],
  red: [[1.11, .36, 1.7, 0, .1, .9, -.36, 1], [1.33, .34, .23, 0, 0, .28, -.36, 1], [1.62, .34, .22, 0, 0, .2, -.36, 1], [1.88, .54, 1.7, 0, 0, .1, -.5, 1],
    [3.9, .2, 1.7, .4, 0, 1, 1.2, 1.2], [4.14, .01, -.1, .55, 0, .2, 1.18, 1.2], [4.82, .01, -.1, .55, .05, -.2, 1.1, 1.2], [5.04, 1.5, -.5, .4, 0, 1, 1, 1], [5.4, 1.5, -.5, .4, 0, 1, 1, 1], [5.41, .7, 1.8, .1, 0, .2, -.34, .86], [5.68, .7, 1.8, .1, 0, .2, -.34, .86], [5.84, .69, .22, 0, 0, .1, -.3, .86], [5.94, .69, -.12, 0, 0, .1, -.34, .86], [6, .69, -.12, 0, 0, .1, -.34, .86]],
  bag: [[4.76, .55, -2.3, 0, .05, -.62, .1, 1], [5.05, .62, -.58, 0, .06, -.34, -.06, 1.08], [6, .62, -.58, 0, .1, -.22, -.03, 1.08]],
};

const sections = [...document.querySelectorAll('main section')];
let tops = [];
const measure = () => { tops = sections.map(s => [s.offsetTop, s.offsetHeight - innerHeight]); };
function uOf(y) {
  for (let i = sections.length - 1; i >= 0; i--) if (y >= tops[i][0]) return i + clamp((y - tops[i][0]) / tops[i][1]);
  return 0;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  backCanvas.width = Math.round(w / 2); backCanvas.height = Math.round(h / 2);
  view.aspect = w / h; view.updateProjectionMatrix();
  measure();
}
addEventListener('resize', resize); resize();
addEventListener('load', measure);

const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
const giant = q('.giant'), fog = q('#fog');
const fxItems = qa('.stage .fx').map(el => ({ el, i: sections.indexOf(el.closest('section')), keep: !!el.closest('#bag') }));
const fxHero = qa('.fx-h');
const heartEl = q('#heartTop'), posts = qa('.post').map(el => ({ el, i: sections.indexOf(el.closest('section')) }));
const scroll = dampedScroll(6);
let backDirty = true, tmp = [], pmx = 0, mx = 0;
addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; });

function place(o, keys, u, HW, HH, sMul, narrow) {
  track(u, keys, tmp);
  const x = narrow ? tmp[0] * .6 : tmp[0], y = narrow ? tmp[1] * .55 + .28 : tmp[1];
  o.position.set(x * HW, y * HH, tmp[2]);
  o.rotation.set(tmp[3], tmp[4], tmp[5]);
  o.scale.setScalar(tmp[6] * sMul);
}

loop((dt, time) => {
  const y = scroll.update(dt), u = uOf(y);
  pmx += (mx - pmx) * .06;
  const HH = Math.tan(view.fov * Math.PI / 360) * view.position.z, HW = HH * view.aspect;
  const narrow = view.aspect < .95, sMul = narrow ? .5 : Math.min(1, view.aspect / 1.55);

  place(tag, K.tag, u, HW, HH, sMul, narrow);
  tag.rotation.z += Math.sin(time * 1.1) * .012; tag.visible = u < 1;
  place(tubeBrown, K.brown, u, HW, HH, sMul, narrow);
  place(tubeNude, K.nude, u, HW, HH, sMul, narrow);
  place(tubeRed, K.red, u, HW, HH, sMul, narrow);
  for (const t of [tubeBrown, tubeNude, tubeRed]) { t.rotation.y += pmx * .25 + Math.sin(time * .6) * .04; t.position.y += Math.sin(time * .9) * .012; t.visible = u > 1; }
  place(bag, K.bag, u, HW, HH, sMul, narrow);
  bag.visible = u > 4.7; bag.rotation.y += pmx * .12;

  let anyBack = false;
  for (const f of floats) {
    const on = u > f.u0 && u < f.u1 && !(narrow && f.y < -.25);
    f.obj.visible = on;
    if (!on) continue;
    if (!f.front) anyBack = true;
    f.obj.scale.setScalar(f.s * (narrow ? .6 : 1));
    const local = (u - f.u0) / (f.u1 - f.u0) - .5;
    const x = narrow ? f.x * .7 : f.x;
    f.obj.position.set(x * HW, (f.y + local * f.speed * 3.1) * HH, f.z);
    f.obj.rotation.set(f.base[0] + time * f.spin[0] * .22 + u * f.spin[1] * 2, f.base[1] + time * f.spin[1] * .22 + u * f.spin[2] * 2, f.base[2] + u * f.spin[0]);
  }

  // Struk turun mengikuti scroll, kertasnya bergelombang
  const pr = seg(u, 5.03, 5.98);
  receipt.visible = u > 5;
  const px = narrow ? -.5 : -.68;
  receipt.position.set(px * HW + Math.sin(pr * 3) * .05, HH + RH / 2 - pr * (RH + HH * .08) * sMul - .02, .15);
  receipt.scale.setScalar(sMul);
  receipt.rotation.set(.03 + Math.sin(pr * 5) * .05, .2 + Math.sin(time * .4) * .04 + Math.sin(pr * 4) * .1, .025 + Math.sin(pr * 3.4) * .06);
  if (receipt.visible) {
    const P = receiptGeo.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const bx = rBase[i * 3], by = rBase[i * 3 + 1];
      const depth = sstep(RH / 2, RH / 2 - 1.1, by); // bagian dekat celah tetap kencang
      const wy = by * 1.9 + pr * 7 + time * .35;
      P.setZ(i, (Math.sin(wy) * .11 + Math.sin(wy * 2.1 + bx * 2) * .03) * depth + Math.cos(bx * 3 + by) * .025 * depth);
      P.setX(i, bx + Math.sin(by * 1.1 + pr * 3) * .05 * depth);
    }
    P.needsUpdate = true; receiptGeo.computeVertexNormals();
  }

  // Dua lintasan render: benda belakang kabur di balik teks, benda depan tajam di atas teks.
  if (anyBack || backDirty) {
    view.layers.set(LAYER_BACK); sun.castShadow = false; wall.visible = false;
    renderer.render(scene, view);
    backCtx.clearRect(0, 0, backCanvas.width, backCanvas.height);
    backCtx.drawImage(frontCanvas, 0, 0, backCanvas.width, backCanvas.height);
    backDirty = anyBack;
  }
  view.layers.set(LAYER_FRONT); sun.castShadow = true; wall.visible = true;
  renderer.render(scene, view);

  // Kata raksasa naik dari bawah, menggelap, lalu kabur dan hilang.
  const h = u - 1;
  const rise = seg(h, .08, .32), up = seg(h, .55, .86), fade = seg(h, .82, 1);
  const gtxt = 1 - rise;
  giant.style.transform = `translateY(${lerp(58, 0, rise) - up * 22}%)`;
  giant.style.opacity = (u < 2 ? lerp(.14, 1, rise) * (1 - fade) : 0);
  giant.style.filter = (gtxt > .01 || fade > .01) ? `blur(${gtxt * 8 + fade * 22}px)` : 'none';
  const hv = seg(h, .22, .34) * (1 - seg(h, .55, .7));
  fxHero.forEach(el => { el.style.opacity = hv; });

  // Teks tiap bagian: masuk dari kabur, keluar ke kabur.
  for (const { el, i, keep } of fxItems) {
    const p = u - i;
    const v = seg(p, .02, .18) * (keep ? 1 : 1 - seg(p, .84, .97));
    el.style.opacity = v;
    el.style.filter = v > .98 ? 'none' : `blur(${(1 - v) * 16}px)`;
    el.style.visibility = v < .01 ? 'hidden' : 'visible';
  }
  let shown = 0;
  for (const { el, i } of posts) {
    const p = u - i, pop = seg(p, .34, .42) * (1 - seg(p, .52, .62));
    if (pop > 0) {
      const r = el.getBoundingClientRect();
      heartEl.style.left = (r.left + r.width / 2) + 'px'; heartEl.style.top = (r.top + r.height * .5) + 'px';
      heartEl.style.transform = `scale(${.4 + pop * .9 + seg(p, .42, .62) * .3}) rotate(${(1 - pop) * -12}deg)`;
      shown = pop;
    }
  }
  heartEl.style.opacity = shown;

  // Kabut putih sekejap saat pindah bagian, seperti kilatan pada video.
  let f = 0;
  for (const b of [1, 2, 3, 4, 5]) f = Math.max(f, 1 - Math.abs(u - b + (b === 1 ? .02 : .02)) / .085);
  fog.style.opacity = clamp(f) * .78;
});
