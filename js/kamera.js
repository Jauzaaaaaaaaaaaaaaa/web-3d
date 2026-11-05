import { THREE, clamp, lerp, inOut, seg, studioEnv, makeRenderer, dampedScroll, loop, canvasTex } from './studio.js';
import { buildCamera } from './camera-model.js';

history.scrollRestoration = 'manual'; scrollTo(0, 0); // selalu mulai dari intro, seperti video

/* ---------- Pemandangan untuk layar kamera (dilukis dengan kanvas, tanpa foto) ---------- */
function paint(kind) {
  return (x, W, H) => {
    const sky = (stops) => { const g = x.createLinearGradient(0, 0, 0, H); stops.forEach(([p, c]) => g.addColorStop(p, c)); x.fillStyle = g; x.fillRect(0, 0, W, H); };
    let seed = 5 + kind; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    if (kind === 0) { // tebing lengkung saat senja
      sky([[0, '#16385c'], [.45, '#e78a3b'], [.62, '#f7c469'], [.63, '#123746'], [1, '#07202c']]);
      x.fillStyle = '#ffdf95'; x.beginPath(); x.arc(W * .62, H * .56, H * .07, 0, 7); x.fill();
      x.fillStyle = '#2a1712'; x.beginPath(); x.moveTo(W * .12, H * .72);
      x.bezierCurveTo(W * .16, H * .22, W * .5, H * .16, W * .66, H * .42); x.lineTo(W * .74, H * .72); x.lineTo(W * .6, H * .72);
      x.bezierCurveTo(W * .56, H * .46, W * .38, H * .42, W * .32, H * .72); x.closePath(); x.fill();
      x.fillStyle = 'rgba(255,200,120,.32)'; for (let i = 0; i < 26; i++) x.fillRect(W * (.48 + r() * .3), H * (.64 + r() * .3), W * .08 * r(), 2);
    } else if (kind === 1) { // lampu kota
      sky([[0, '#0b1230'], [.6, '#3b2352'], [1, '#c5563a']]);
      x.fillStyle = '#0a0c18';
      for (let i = 0; i < 16; i++) { const w = W * (.05 + r() * .06), h = H * (.2 + r() * .5); x.fillRect(i * W / 15 - 10, H - h, w, h); }
      for (let i = 0; i < 70; i++) { x.fillStyle = ['#ffcf6e', '#ff8d5c', '#7ce3f5'][i % 3]; x.globalAlpha = .25 + r() * .6; x.beginPath(); x.arc(r() * W, H * (.45 + r() * .55), 3 + r() * 16, 0, 7); x.fill(); }
      x.globalAlpha = 1;
    } else if (kind === 2) { // bukit pasir
      sky([[0, '#f4b49a'], [.5, '#e7856b'], [1, '#6e2b2e']]);
      for (let k = 0; k < 4; k++) {
        x.fillStyle = ['#b65a44', '#8d3f38', '#5f2a2c', '#34171c'][k];
        x.beginPath(); x.moveTo(0, H);
        for (let i = 0; i <= 40; i++) x.lineTo(i / 40 * W, H * (.45 + k * .13) + Math.sin(i * .35 + k * 2) * H * .06);
        x.lineTo(W, H); x.fill();
      }
    } else { // aurora
      sky([[0, '#050a1e'], [.7, '#0a2b3d'], [1, '#07141a']]);
      for (let i = 0; i < 180; i++) { x.fillStyle = `rgba(90,245,200,${r() * .1})`; const px = i / 180 * W; x.fillRect(px, H * (.08 + Math.sin(i * .05) * .08), W / 150, H * (.3 + r() * .25)); }
      x.fillStyle = '#04090f'; x.beginPath(); x.moveTo(0, H); x.lineTo(0, H * .78); x.lineTo(W * .3, H * .6); x.lineTo(W * .55, H * .8); x.lineTo(W * .8, H * .66); x.lineTo(W, H * .78); x.lineTo(W, H); x.fill();
    }
    x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, H - 34, W, 34);
    x.fillStyle = '#fff'; x.font = '800 22px "Big Shoulders Display"'; x.fillText('1/250   F5.6   ISO 400', 14, H - 10);
  };
}

/* ---------- Intro: bentuk melayang memancarkan kerucut yang membuka nama merek ---------- */
function runIntro() {
  const el = document.getElementById('intro');
  const done = () => { document.body.classList.remove('locked'); el.style.opacity = 0; setTimeout(() => el.remove(), 320); };
  if (matchMedia('(prefers-reduced-motion:reduce)').matches || scrollY > 10) return done();
  const a = el.querySelector('.a'), b = el.querySelector('.b'), beam = el.querySelector('.beam'), lines = el.querySelector('.lines');
  const T0 = performance.now(), D = 3300;
  // Lintasan bentuk: [waktu, x%, y%, rotasi]
  const pathA = [[0, 56, 42, 28], [.18, 52, 18, 90], [.36, 26, 74, 200], [.6, 38, 62, 300], [1, 8, 56, 400]];
  const pick = (p, t) => { let i = 0; while (i < p.length - 2 && t > p[i + 1][0]) i++; const k = inOut(seg(t, p[i][0], p[i + 1][0])); return p[i].slice(1).map((v, n) => lerp(v, p[i + 1][n + 1], k)); };
  let dead = false; const skip = () => { if (!dead) { dead = true; done(); } };
  addEventListener('keydown', skip, { once: true }); el.addEventListener('pointerdown', skip, { once: true });
  (function f(now) {
    if (dead) return;
    const t = clamp((now - T0) / D);
    const [x, y, r] = pick(pathA, t);
    a.style.cssText = `left:${x}%;top:${y}%;transform:rotate(${r}deg)`;
    const sb = seg(t, .16, .3), xb = lerp(52, 60, t), yb = lerp(100, 74, sb);
    b.style.cssText = `left:${xb}%;top:${yb}%;opacity:${sb && t < .8 ? 1 : 0};transform:rotate(${t * 90}deg)`;
    const open = seg(t, .28, .72), s = 2 + open * 62;
    // Kerucut cahaya dari bentuk ke tepi kanan layar
    beam.style.clipPath = t < .28 ? 'polygon(0 0,0 0,0 0)' : `polygon(${x}% ${y}%,${100 + 40 * open}% ${y - s}%,${100 + 40 * open}% ${y + s}%)`;
    lines.style.transform = `translateX(${lerp(26, -3, t)}vw) scale(${lerp(.92, 1.14, seg(t, .7, 1))})`;
    lines.style.filter = t > .86 ? `blur(${(t - .86) * 40}px)` : '';
    if (t >= 1) return skip();
    requestAnimationFrame(f);
  })(T0);
}

/* ---------- Adegan ---------- */
await Promise.all(['400 40px "Bagel Fat One"', '800 40px "Big Shoulders Display"'].map(f => document.fonts.load(f)));
const scenes = [0, 1, 2, 3].map(k => canvasTex(1024, 680, paint(k)));
document.querySelectorAll('img[data-scene]').forEach(i => { i.src = scenes[+i.dataset.scene].image.toDataURL('image/jpeg', .85); });

const canvas = document.getElementById('gl');
let renderer;
try { renderer = makeRenderer(canvas); }
catch (e) { canvas.remove(); document.getElementById('intro').remove(); document.body.classList.remove('locked'); throw e; }
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const view = new THREE.PerspectiveCamera(26, 1, .1, 60);
view.position.z = 7.6;
scene.environment = studioEnv(renderer, {
  top: '#3a1a08', mid: '#7a2c08', bottom: '#120502',
  panels: [
    { w: 3, h: 18, pos: [-14, 3, 3], color: '#5ff2ee', power: 15 },    // garis toska kiri
    { w: 3, h: 16, pos: [14, 1, 2], color: '#5ff2ee', power: 13 },     // garis toska kanan
    { w: 14, h: 3, pos: [0, 15, 3], color: '#d8fbff', power: 12 },     // strip atas
    { w: 1.2, h: 12, pos: [5, 3, 14], color: '#c9fbfb', power: 7 },    // kilau tipis depan
    { w: 12, h: 2, pos: [0, -13, 6], color: '#ff7b1c', power: 14 },    // pantulan oranye bawah
    { w: 10, h: 10, pos: [0, 3, -15], color: '#5ff2ee', power: 22 },   // cahaya pinggir belakang
  ],
});
const key = new THREE.DirectionalLight('#ffd9b0', .7); key.position.set(2, 5, 6); scene.add(key);
const rim = new THREE.DirectionalLight('#6ff4f2', 1.9); rim.position.set(-5, 2, -2); scene.add(rim);
const rim2 = new THREE.DirectionalLight('#6ff4f2', 1.4); rim2.position.set(5, 3, -3); scene.add(rim2);

const cam = buildCamera(scenes);
const model = new THREE.Group(); model.add(cam.root); scene.add(model);
scene.updateMatrixWorld(true);

/* Rumus terurai: posisi = awal + arah * explode * 1.5, dengan faktor acak dan ukuran. */
const whole = new THREE.Box3().setFromObject(cam.root);
const center = whole.getCenter(new THREE.Vector3());
const wholeSize = whole.getSize(new THREE.Vector3()).length();
let seed = 42; const rnd = (a, b) => a + ((seed = (seed * 16807) % 2147483647) / 2147483647) * (b - a);
const P = cam.parts.map(p => {
  const box = new THREE.Box3().setFromObject(p.obj);
  const c = box.getCenter(new THREE.Vector3());
  const dir = c.clone().sub(center);
  if (dir.length() < .05) dir.set(rnd(-1, 1), rnd(-1, 1), rnd(-.4, .4));
  dir.normalize();
  if (p.lens) { dir.x += rnd(-1.5, 1.5); dir.y += rnd(-1.1, 1.1); }   // cincin lensa menyebar, tidak bertumpuk pada satu sumbu
  dir.x *= 1.5; dir.y *= 1.15; dir.z *= .55;   // sebaran melebar mengikuti layar, tidak menumpuk ke arah kamera
  const size = box.getSize(new THREE.Vector3()).length() / wholeSize;
  const k = 1.5 * rnd(.7, 1.3) * clamp(1 / (size * 2.2 + .001), .55, 2);
  return { ...p, start: p.obj.position.clone(), rot0: p.obj.rotation.clone(), dir, k, spin: [rnd(-.9, .9), rnd(-.9, .9), rnd(-.9, .9)], scale0: p.obj.scale.x };
});
let meshCount = 0; cam.root.traverse(o => { if (o.isMesh) meshCount++; });
document.getElementById('partcount').textContent = meshCount;

/* ---------- Pose tiap bagian ----------
   x,y = pecahan setengah lebar/tinggi layar; s = skala; e = explode; lcd,zoom,sd,sensor,card,hide = 0..1 */
const pose = (x, y, rx, ry, rz, s, o = {}) => ({ x, y, rx, ry, rz, s, e: 0, lcd: 0, zoom: 0, sd: 0, sensor: 0, card: 0, hide: 0, red: 0, ...o });
const PI = Math.PI;
const POSES = [
  pose(.44, -.42, .16, -.62, .05, 1.34),                               // 0 pahlawan
  pose(.46, -.44, .3, -.12, .0, 2.5, { }),                              // 1 nama pada prisma
  pose(.16, -.52, .5, -.68, -.24, 4.6, { red: 1 }),                     // 2 sangat dekat, menutupi layar
  pose(.34, .06, .22, PI - .42, -.06, 2.05),                            // 3 tombol belakang
  pose(.72, -.42, .02, PI - .08, 0, 1.55, { lcd: 1 }),                  // 4 layar terbuka
  pose(.42, -.36, .08, -.42, .03, 1.42, { zoom: 1 }),                   // 5 lensa memanjang
  pose(.26, -.14, .1, 1.08, .02, 1.9, { sd: 1 }),                       // 6 kartu keluar
  pose(.26, -.08, .3, .55, .1, 1.02, { e: .7, to: { e: 1.5, ry: .95 } }),   // 7 terurai, terus melayang
  pose(.26, -.02, .34, 1.0, .1, .78, { e: 2.8, sensor: 1, to: { e: 3.2, ry: 1.1 } }),    // 8 sensor
  pose(.26, -.02, .3, 1.2, .1, .78, { e: 3.2, card: 1, to: { e: 3.5 } }),              // 9 kartu memori
  pose(.3, -.22, .2, .75, .04, .85, { e: 1.9, to: { e: .22, ry: .12, s: 1.2, y: -.34 } }),  // 10 menyatu perlahan
  pose(.06, -.36, .1, -.02, 0, 1.45),                                   // 11 tampak depan penuh
  pose(0, 0, 0, 0, 0, 2.45, { hide: 1 }),                               // 12 lensa menjadi huruf o
];

const secs = [...document.querySelectorAll('main section')];
let keys = [], docMax = 1;
function measure() {
  const vh = innerHeight; const n = secs.length;
  keys = [];
  secs.forEach((s, i) => {
    const top = s.offsetTop, hold = Math.max(top + vh * .05, top + s.offsetHeight - vh * 1.05);
    const A = POSES[i], B = A.to ? { ...A, ...A.to } : A;
    keys.push([top, A]);
    keys.push([i < n - 1 ? hold : top + s.offsetHeight * .22, B]);
  });
  keys.push([secs[n - 1].offsetTop + secs[n - 1].offsetHeight * .62, POSES[12]]);
  keys.push([1e9, POSES[12]]);
  docMax = document.documentElement.scrollHeight - vh;
}
function sample(y) {
  let i = 0; while (i < keys.length - 2 && y > keys[i + 1][0]) i++;
  const [a, A] = keys[i], [b, B] = keys[i + 1], k = inOut(seg(y, a, b));
  const o = {}; for (const f in A) if (f !== 'to') o[f] = lerp(A[f], B[f], k);
  o.segK = k; return o;
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  view.aspect = w / h; view.updateProjectionMatrix();
  measure();
}
addEventListener('resize', resize); resize();
addEventListener('load', measure);

const words = [...document.querySelectorAll('#words b')].map(el => ({ el, sec: secs[+el.dataset.at] }));
const finale = document.getElementById('finale'), [fe, fx] = finale.children;
const bgRed = document.getElementById('bgred'), railI = document.querySelector('#rail i'), rail = document.getElementById('rail');
const scroll = dampedScroll(5.5);
let mx = 0, my = 0, pmx = 0, pmy = 0;
addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });

const tmpTarget = new THREE.Vector3();
const FOCUS = {
  sensor: { pos: [.72, .05, .55], rot: [.18, -.75, .06], scale: 3.3, prop: 'sensor' },
  card: { pos: [.6, .42, .55], rot: [.12, -.5, .14], scale: 3.6, prop: 'card' },
};

loop((dt, time) => {
  const y = scroll.update(dt), S = sample(y);
  pmx += (mx - pmx) * .06; pmy += (my - pmy) * .06;
  const vh = 2 * view.position.z * Math.tan(view.fov * PI / 360), vw = vh * view.aspect;
  const narrow = view.aspect < .95;
  const sMul = narrow ? clamp(view.aspect / 1.15, .42, .8) : Math.min(1, view.aspect / 1.55);

  // Pada layar sempit kamera naik ke separuh atas, kartu teks menempati separuh bawah.
  const px = narrow ? S.x * .25 * (1 - S.hide) : S.x, py = narrow ? (S.y * .3 + .46) * (1 - S.hide) : S.y;
  model.position.set(px * vw / 2, py * vh / 2, 0);
  model.rotation.set(S.rx + pmy * .07, S.ry + pmx * .14 + Math.sin(time * .18) * .015 + S.e * Math.sin(time * .14) * .05, S.rz);
  model.scale.setScalar(S.s * sMul);
  cam.root.position.set(-center.x * (1 - S.hide) - .05 * S.hide, -center.y * (1 - S.hide) + .02 * S.hide, -.35 * (1 - S.hide) - .95 * S.hide);

  const ex = S.e, h = S.hide;
  for (const p of P) {
    const o = p.obj, e = ex * p.k + Math.max(0, ex - 1.2) * 2.4; // setelah 1,2 semua komponen menjauh agar komponen utama terlihat jelas
    o.position.copy(p.start).addScaledVector(p.dir, e);
    o.rotation.set(p.rot0.x + p.spin[0] * ex, p.rot0.y + p.spin[1] * ex, p.rot0.z + p.spin[2] * ex);
    o.scale.setScalar(p.scale0);
    o.visible = true;
    if (p.zoom) o.position.z += .17 * S.zoom;
    if (p.lcd) o.rotation.y += -PI * S.lcd;
    if (p.door) { o.position.x -= .07 * S.sd; o.position.z -= .13 * S.sd; o.rotation.y += 1.15 * S.sd; }
    if (p.sd) o.position.x -= .46 * S.sd;
    const f = p.focus && FOCUS[p.focus];
    if (f && S[f.prop] > 0) {
      const w = S[f.prop];
      tmpTarget.set(...f.pos);
      o.position.lerp(tmpTarget, w);
      o.rotation.x = lerp(o.rotation.x, f.rot[0] + Math.sin(time * .5) * .05, w);
      o.rotation.y = lerp(o.rotation.y, f.rot[1] + Math.sin(time * .37) * .09, w);
      o.rotation.z = lerp(o.rotation.z, f.rot[2], w);
      o.scale.setScalar(lerp(p.scale0, f.scale, w));
    }
    if (!p.lens && h > 0) { o.position.y -= h * h * 3.4; o.position.z -= h * 2; o.visible = h < .98; }
  }

  // Layar lipat berganti foto sepanjang bagian 4
  const s4 = secs[4], lcdP = seg(y, s4.offsetTop, s4.offsetTop + s4.offsetHeight - innerHeight);
  const idx = Math.min(3, Math.floor(lcdP * 4));
  const lit = Math.max(.09, clamp(S.lcd * 3)); // layar tertutup tetap menyimpan bayangan gambar redup
  cam.screenMats.forEach(m => { if (m.map !== scenes[idx]) { m.map = scenes[idx]; m.needsUpdate = true; } m.color.setScalar(lit); });

  renderer.render(scene, view);

  // Kata besar: masuk dari kanan, hilang ke atas
  const vhpx = innerHeight;
  for (const w of words) {
    const a = w.sec.offsetTop - vhpx * .35, b = w.sec.offsetTop + w.sec.offsetHeight - vhpx * .9;
    const inn = w.sec === secs[0] ? 1 : seg(y, a, a + vhpx * .35), out = seg(y, b, b + vhpx * .3);
    const v = inn * (1 - out);
    w.el.style.opacity = v;
    w.el.style.visibility = v < .005 ? 'hidden' : 'visible';
    w.el.style.transform = `translateX(${(1 - inn) * 9}vw) translateY(${-out * 12}vh)`;
    w.el.style.filter = v > .98 ? 'none' : `blur(${(1 - v) * 14}px)`;
  }
  bgRed.style.opacity = S.red;

  const fv = seg(h, .55, 1);
  finale.style.opacity = fv;
  fe.style.transform = `translateX(${(1 - fv) * -30}vw)`;
  fx.style.transform = `translateX(${(1 - fv) * 30}vw)`;

  railI.style.top = (clamp(y / docMax) * (rail.clientHeight - 42)) + 'px';
});

// Intro dimulai setelah model dan teksturnya siap, agar animasinya tidak tersendat.
renderer.render(scene, view);
runIntro();
