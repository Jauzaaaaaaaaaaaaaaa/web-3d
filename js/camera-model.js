// Kamera DSLR fiktif "Halden VOX 60" yang dibangun dari kode, satu mesh per komponen,
// termasuk isi dalamnya, agar tampilan terurainya memperlihatkan komponen sungguhan.
import { THREE, rr, extrude, lathe, ribbedRing, canvasTex, leatherBump, roundedShape } from './studio.js';

const LX = .05, LY = -.02; // sumbu lensa

function taper(g, fn) {
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); fn(v); p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals();
  return g;
}

function textPlane(w, h, draw, mat = {}) {
  const res = 1024, ch = Math.round(res * h / w);
  const map = canvasTex(res, ch, (x, W, H) => { x.clearRect(0, 0, W, H); draw(x, W, H); });
  return { geo: new THREE.PlaneGeometry(w, h), mat: new THREE.MeshStandardMaterial({ map, transparent: true, roughness: .4, metalness: .1, polygonOffset: true, polygonOffsetFactor: -2, ...mat }) };
}

export function buildCamera(screens) {
  const root = new THREE.Group();
  const parts = [];
  const bump = leatherBump(5);

  const M = {
    shell: new THREE.MeshPhysicalMaterial({ color: 0x0b0c0e, roughness: .42, metalness: 0, clearcoat: .45, clearcoatRoughness: .3 }),
    top: new THREE.MeshPhysicalMaterial({ color: 0x0d0e11, roughness: .3, metalness: 0, clearcoat: .7, clearcoatRoughness: .18 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x08090a, roughness: .82, metalness: 0, bumpMap: bump, bumpScale: 1.6 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x060708, roughness: .62, metalness: 0 }),
    gloss: new THREE.MeshPhysicalMaterial({ color: 0x08090b, roughness: .12, metalness: .4, clearcoat: 1, clearcoatRoughness: .05 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: .16, metalness: 1 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x74797f, roughness: .34, metalness: 1 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe0a83a, roughness: .25, metalness: 1 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb8121b, roughness: .3, metalness: .6, emissive: 0x3a0406 }),
    pcb: new THREE.MeshPhysicalMaterial({ color: 0x0d4a35, roughness: .34, metalness: .3, clearcoat: .7 }),
    chip: new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: .3, metalness: .5 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x9fd9e8, roughness: .03, metalness: 0, transparent: true, opacity: .42, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.8, envMapIntensity: 2.4, side: THREE.DoubleSide }),
    frontGlass: new THREE.MeshPhysicalMaterial({ color: 0x041318, roughness: .04, metalness: .55, clearcoat: 1, clearcoatRoughness: .02, iridescence: 1, iridescenceIOR: 1.7, iridescenceThicknessRange: [140, 520], envMapIntensity: 1.5,
      emissive: 0xffffff, emissiveMap: canvasTex(64, 1024, (x, W, H) => {
        const g = x.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0d6d86'); g.addColorStop(.3, '#04303f'); g.addColorStop(.72, '#031820'); g.addColorStop(1, '#020b10');
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        for (const [p, c] of [[.16, '#39d8e8'], [.34, '#1b8fa8'], [.52, '#2bb7a6'], [.7, '#16627a'], [.86, '#1d7d9a']]) { x.fillStyle = c; x.fillRect(0, p * H, W, 7); }
      }) }),
    mirror: new THREE.MeshStandardMaterial({ color: 0xf2f6f8, roughness: .02, metalness: 1 }),
    sensor: new THREE.MeshPhysicalMaterial({ color: 0x1a2050, roughness: .1, metalness: .7, iridescence: 1, iridescenceIOR: 2.2, iridescenceThicknessRange: [180, 820], clearcoat: 1,
      emissive: 0xffffff, emissiveIntensity: .95, emissiveMap: canvasTex(1024, 720, (x, W, H) => {
        const g = x.createLinearGradient(0, 0, W, H);
        [[0, '#1b2bd8'], [.22, '#7a20d8'], [.4, '#e0269c'], [.55, '#2fd0e8'], [.72, '#22d890'], [.86, '#3a6cf0'], [1, '#2214a8']].forEach(([p, c]) => g.addColorStop(p, c));
        x.fillStyle = g; x.fillRect(0, 0, W, H);
        x.fillStyle = 'rgba(0,0,10,.28)'; for (let i = 0; i < W; i += 6) x.fillRect(i, 0, 2, H); for (let j = 0; j < H; j += 6) x.fillRect(0, j, W, 2);
      }) }),
  };

  function add(geo, mat, pos = [0, 0, 0], rot = [0, 0, 0], opts = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos); m.rotation.set(...rot);
    root.add(m);
    parts.push({ obj: m, ...opts });
    return m;
  }
  const cyl = (r, h, n = 48, r2 = r) => new THREE.CylinderGeometry(r2, r, h, n); // sumbu Y
  const cylZ = (r, h, n = 48) => cyl(r, h, n).rotateX(Math.PI / 2);

  /* ---------- CANGKANG ---------- */
  const silhouette = () => {
    const s = new THREE.Shape();
    s.moveTo(-.66, -.5);
    s.lineTo(.64, -.5); s.quadraticCurveTo(.71, -.5, .71, -.43);
    s.lineTo(.71, .24); s.bezierCurveTo(.71, .32, .64, .36, .56, .39);
    s.lineTo(.3, .43); s.lineTo(-.3, .43); s.lineTo(-.46, .43);
    s.bezierCurveTo(-.56, .43, -.66, .4, -.7, .3);
    s.lineTo(-.72, -.43); s.quadraticCurveTo(-.72, -.5, -.66, -.5);
    return s;
  };
  // Tekstur planar cangkang: area kulit, garis panel, dan kilap dilukis pada satu peta.
  const SZ = 2048, U = x => (x + .85) / 1.7 * SZ, V = y => (1 - (y + .85) / 1.7) * SZ;
  const regions = x => {
    x.beginPath(); // kulit grip
    x.moveTo(U(-.95), V(.27)); x.lineTo(U(-.33), V(.27)); x.bezierCurveTo(U(-.3), V(.1), U(-.3), V(-.2), U(-.32), V(-.55)); x.lineTo(U(-.95), V(-.55)); x.closePath();
    x.moveTo(U(.46), V(.22)); x.lineTo(U(.95), V(.22)); x.lineTo(U(.95), V(-.55)); x.lineTo(U(.47), V(-.55)); x.bezierCurveTo(U(.5), V(-.2), U(.5), V(0), U(.46), V(.22)); x.closePath(); // kulit sisi lain
  };
  const seam = (x, col, w) => { x.strokeStyle = col; x.lineWidth = w; regions(x); x.stroke();
    x.beginPath(); x.moveTo(U(-.95), V(.3)); x.lineTo(U(.95), V(.3)); x.stroke(); };
  const speck = (x, n, a, b, r) => { let sd = 3; const R = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) { const v = a + R() * (b - a) | 0; x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.arc(R() * SZ, R() * SZ, 1 + R() * r, 0, 7); x.fill(); } };
  const shellMap = canvasTex(SZ, SZ, x => {
    x.fillStyle = '#121316'; x.fillRect(0, 0, SZ, SZ);
    x.save(); regions(x); x.clip(); x.fillStyle = '#08090a'; x.fillRect(0, 0, SZ, SZ); x.restore();
    seam(x, '#000', 5);
  });
  const shellBump = canvasTex(SZ, SZ, x => {
    x.fillStyle = '#909090'; x.fillRect(0, 0, SZ, SZ);
    x.save(); regions(x); x.clip(); x.fillStyle = '#6a6a6a'; x.fillRect(0, 0, SZ, SZ); speck(x, 90000, 50, 135, 3.4); x.restore();
    seam(x, '#000', 7);
  }, { data: true });
  const shellRough = canvasTex(SZ, SZ, x => {
    x.fillStyle = '#6c6c6c'; x.fillRect(0, 0, SZ, SZ);
    x.save(); regions(x); x.clip(); x.fillStyle = '#e4e4e4'; x.fillRect(0, 0, SZ, SZ); x.restore();
  }, { data: true });
  const shellMat = new THREE.MeshPhysicalMaterial({ map: shellMap, bumpMap: shellBump, bumpScale: 2.2, roughnessMap: shellRough, roughness: 1, metalness: 0, clearcoat: .22, clearcoatRoughness: .4, side: THREE.DoubleSide });

  const sstep = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Loft: garis tepi siluet ditarik bertahap ke lingkaran dudukan lensa, sehingga permukaannya benar-benar melengkung.
  function loft(stations, bump, R) {
    const out = silhouette().getSpacedPoints(300); out.pop();
    const N = out.length, pos = [], uv = [], idx = [];
    stations.forEach(([k, z]) => {
      for (const p of out) {
        const a = Math.atan2(p.y - LY, p.x - LX);
        const x = THREE.MathUtils.lerp(p.x, LX + Math.cos(a) * R, k), y = THREE.MathUtils.lerp(p.y, LY + Math.sin(a) * R, k);
        const zz = z + bump(x, y, z);
        pos.push(x, y, zz);
        uv.push(((x + Math.sign(x) * Math.abs(zz) * .55) + .85) / 1.7, (y + .85) / 1.7);
      }
    });
    for (let r = 0; r < stations.length - 1; r++) for (let i = 0; i < N; i++) {
      const j = (i + 1) % N, a = r * N + i, b = r * N + j, c = (r + 1) * N + i, d = (r + 1) * N + j;
      idx.push(a, b, d, a, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const frontStations = [[0, .004], [0, .19], [.004, .225], [.012, .25], [.028, .27], [.055, .283], [.1, .292], [.2, .3], [.4, .306], [.6, .31], [.8, .314], [.93, .318], [1, .322], [1, .25]];
  const gripBump = (x, y, z) => {
    const on = sstep(-.26, -.44, x);
    const dent = 1 - .17 * Math.sin(Math.PI * sstep(-.5, .3, y));
    const fadeTop = 1 - .5 * sstep(.14, .42, y);
    return on * dent * fadeTop * .29 * sstep(0, .3, z);
  };
  add(loft(frontStations, gripBump, .315), shellMat);
  const rearStations = [[0, -.004], [0, -.2], [.006, -.26], [.018, -.29], [.04, -.306], [.09, -.316], [.2, -.32], [.5, -.322], [1, -.322]];
  const thumb = (x, y, z) => .035 * sstep(-.36, -.56, x) * sstep(-.2, .05, y) * (1 - sstep(.28, .4, y)) * sstep(0, -.3, z) * -1;
  add(loft(rearStations, thumb, .001), shellMat);

  // Punuk prisma: meruncing ke atas dan kebelakang seperti pentaprisma asli.
  const humpS = new THREE.Shape();
  humpS.moveTo(-.31, .38); humpS.lineTo(.31, .38); humpS.lineTo(.21, .66); humpS.quadraticCurveTo(.2, .68, .18, .68);
  humpS.lineTo(-.18, .68); humpS.quadraticCurveTo(-.2, .68, -.21, .66); humpS.closePath();
  const hg = taper(extrude(humpS, .42, .03, 6, 16).translate(0, 0, -.21), v => { const k = (v.y - .38) / .3; v.z = v.z * (1 - k * .34) + .02; });
  add(hg, M.top);

  /* ---------- BAGIAN DEPAN ---------- */
  add(new THREE.TorusGeometry(.325, .018, 16, 96), M.chrome, [LX, LY, .315]);
  add(cylZ(.038, .03, 32), M.steel, [.42, -.17, .315]);            // pelepas lensa
  add(cylZ(.016, .02, 24), M.rubber, [.45, -.28, .315]);           // pratinjau kedalaman
  add(cylZ(.022, .014, 24), M.red, [-.27, .31, .312]);             // lampu AF
  add(rr(.1, .07, .012, .016, .004), M.gloss, [-.56, .13, .458], [-.1, -.35, 0]);
  for (const [dx, dy] of [[-.03, 0], [0, .02], [.03, 0], [0, -.02]]) add(cylZ(.005, .006, 8), M.chip, [.48 + dx, .3 + dy, .315]); // mikrofon

  {
    const p = textPlane(.36, .1, (x, W, H) => {
      x.fillStyle = '#e8f4f7'; x.font = `400 ${H * .86}px "Bagel Fat One"`; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('Halden', W / 2, H * .55);
    }, { metalness: .6, roughness: .28, emissive: 0xffffff, emissiveIntensity: .25 });
    add(p.geo, p.mat, [0, .495, .232], [-.27, 0, 0]);
    const b = textPlane(.2, .1, (x, W, H) => {
      x.fillStyle = '#d9e4e8'; x.textAlign = 'center'; x.font = `800 ${H * .42}px "Big Shoulders Display"`;
      x.fillText('VOX', W / 2, H * .44); x.fillText('60', W / 2, H * .88);
    }, { metalness: .8, roughness: .35 });
    add(b.geo, b.mat, [.58, .245, .296]);
  }

  /* ---------- PELAT ATAS ---------- */
  add(cyl(.045, .022, 40), M.rubber, [-.56, .49, .22]);                  // tombol rana
  add(new THREE.TorusGeometry(.055, .012, 12, 48).rotateX(Math.PI / 2), M.chrome, [-.56, .478, .22]);
  add(ribbedRing(.07, 0, .05, 36, .006).rotateX(Math.PI / 2).translate(0, .025, 0), M.rubber, [-.42, .465, .22]); // dial utama
  { const l = textPlane(.24, .17, (x, W, H) => {
      x.fillStyle = '#9fb7a6'; x.fillRect(0, 0, W, H); x.fillStyle = '#14201a'; x.font = `800 ${H * .32}px "Big Shoulders Display"`;
      x.fillText('1/250', W * .06, H * .42); x.fillText('F5.6', W * .55, H * .42); x.font = `800 ${H * .2}px "Big Shoulders Display"`; x.fillText('ISO 400   [ 512 ]', W * .06, H * .8);
    }, { roughness: .12, transparent: false });
    add(rr(.27, .2, .012, .02, .004).rotateX(Math.PI / 2), M.gloss, [-.47, .455, -.07]);
    add(l.geo, l.mat, [-.47, .463, -.07], [-Math.PI / 2, 0, 0]);
  }
  for (let i = 0; i < 4; i++) add(rr(.05, .024, .014, .008, .004).rotateX(Math.PI / 2), M.rubber, [-.57 + i * .065, .456, .08]);

  add(ribbedRing(.105, 0, .07, 44, .007).rotateX(Math.PI / 2).translate(0, .035, 0), M.top, [.5, .42, -.04]); // dial mode
  { const d = textPlane(.17, .17, (x, W, H) => {
      x.translate(W / 2, H / 2); x.fillStyle = '#e9f1f2'; x.font = `800 ${H * .15}px "Big Shoulders Display"`; x.textAlign = 'center'; x.textBaseline = 'middle';
      ['M', 'Av', 'Tv', 'P', 'A+', 'C', 'B', 'SCN'].forEach((t, i) => { const a = i / 8 * Math.PI * 2; x.fillText(t, Math.sin(a) * H * .39, -Math.cos(a) * H * .39); });
    }, { roughness: .5 });
    add(d.geo, d.mat, [.5, .492, -.04], [-Math.PI / 2, 0, 0]);
  }
  add(cyl(.024, .016, 24), M.chrome, [.5, .495, -.04]);
  add(rr(.24, .2, .03, .012, .005).rotateX(Math.PI / 2), M.chrome, [0, .708, -.005]);           // dudukan flash
  add(rr(.2, .15, .012, .008, .003).rotateX(Math.PI / 2), M.chip, [0, .724, -.005]);
  add(cyl(.009, .006, 16), M.gold, [0, .732, -.005]);
  for (const s of [-1, 1]) {
    add(new THREE.TorusGeometry(.036, .009, 10, 24).rotateY(Math.PI / 2), M.steel, [s * .735, .29, -.02], [0, 0, 0]);  // pengait tali
    add(rr(.05, .07, .05, .012, .005), M.top, [s * .71, .29, -.02]);
  }

  /* ---------- BAGIAN BELAKANG ---------- */
  // rongga layar yang terlihat saat layar dilipat keluar
  add(rr(.78, .55, .012, .03, .004), M.gloss, [.17, -.14, -.325]);
  add(rr(.25, .19, .07, .05, .025, 4), M.rubber, [.0, .54, -.27]);                              // eyecup
  add(cylZ(.062, .012, 40), M.frontGlass, [0, .54, -.307]);
  add(new THREE.TorusGeometry(.07, .012, 12, 40), M.rubber, [0, .54, -.305]);

  // Dial kontrol cepat dan tombol
  const DX = -.47, DY = -.2;
  add(ribbedRing(.14, .085, .03, 54, .006).rotateX(Math.PI), M.top, [DX, DY, -.325]);
  add(cylZ(.075, .022, 48), M.steel, [DX, DY, -.335]);
  add(cylZ(.03, .014, 32), M.rubber, [DX, DY, -.347]);
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + .78; add(cylZ(.012, .01, 16), M.gloss, [DX + Math.cos(a) * .054, DY + Math.sin(a) * .054, -.349]); }
  [[-.26, .05], [-.26, -.42], [-.47, -.45], [-.66, -.42], [-.61, .08], [-.45, .1], [-.33, .22], [-.5, .25], [-.64, .24]].forEach(([x, y], i) => {
    add(cylZ(i % 2 ? .034 : .028, .02, 32), i % 3 === 2 ? M.gloss : M.rubber, [x, y, -.334]);
    add(new THREE.TorusGeometry(i % 2 ? .036 : .03, .004, 8, 32), M.steel, [x, y, -.327]);
  });
  add(cylZ(.05, .05, 40), M.rubber, [-.65, .08, -.34]);                                          // joystik multi
  add(rr(.1, .05, .012, .012, .004), M.red, [-.28, -.33, -.326]);

  /* ---------- LAYAR LIPAT ---------- */
  const lcd = new THREE.Group();
  const HX = .57; // engsel
  lcd.position.set(HX, -.14, -.345);
  const mkScreen = () => new THREE.MeshBasicMaterial({ map: screens[0], toneMapped: false });
  const scrA = mkScreen(), scrB = mkScreen();
  const frame = new THREE.Mesh(rr(.78, .55, .028, .035, .01), M.gloss); frame.position.x = -.39;
  const bezelA = new THREE.Mesh(new THREE.PlaneGeometry(.7, .47), scrA); bezelA.position.set(-.39, 0, -.0155); bezelA.rotation.y = Math.PI;
  const bezelB = new THREE.Mesh(new THREE.PlaneGeometry(.7, .47), scrB); bezelB.position.set(-.39, 0, .0155);
  const hinge = new THREE.Mesh(cyl(.016, .3, 16), M.steel);
  lcd.add(frame, bezelA, bezelB, hinge);
  root.add(lcd);
  parts.push({ obj: lcd, lcd: true });

  /* ---------- PINTU KARTU & BATERAI ---------- */
  const door = add(rr(.26, .36, .02, .02, .007), M.shell, [-.74, -.14, -.07], [0, Math.PI / 2, 0], { door: true });
  door.geometry.translate(0, 0, 0);
  add(rr(.24, .08, .02, .01, .005), M.rubber, [.725, .02, -.04], [0, Math.PI / 2, 0]);          // tutup port
  add(rr(.24, .17, .02, .01, .005), M.rubber, [.725, -.2, -.04], [0, Math.PI / 2, 0]);
  add(rr(.44, .5, .02, .03, .006).rotateX(Math.PI / 2), M.shell, [-.5, -.515, -.02]);             // pintu baterai
  add(cyl(.032, .02, 24), M.steel, [LX, -.522, -.02]);                                             // soket tripod

  /* ---------- KARTU MEMORI ---------- */
  const sdLabel = canvasTex(512, 720, (x, W, H) => {
    x.fillStyle = '#10151c'; x.fillRect(0, 0, W, H);
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5fe6f5'); g.addColorStop(1, '#35a5d8');
    x.fillStyle = g; x.fillRect(40, 150, W - 80, H - 200);
    x.fillStyle = '#071018'; x.textAlign = 'center'; x.font = '800 150px "Big Shoulders Display"'; x.fillText('32 GB', W / 2, 340);
    x.font = '800 92px "Big Shoulders Display"'; x.fillText('SDHC', W / 2, 460); x.font = '800 46px "Big Shoulders Display"'; x.fillText('HALDEN  MEMORY', W / 2, 570);
    x.fillStyle = '#d8b24a'; for (let i = 0; i < 8; i++) x.fillRect(58 + i * 50, 30, 34, 90);
  });
  const sd = new THREE.Group();
  sd.position.set(-.5, -.14, -.07); sd.rotation.y = -Math.PI / 2;
  const sdBody = new THREE.Mesh(rr(.2, .28, .018, .012, .004), M.chip);
  const sdFace = new THREE.Mesh(new THREE.PlaneGeometry(.185, .262), new THREE.MeshStandardMaterial({ map: sdLabel, roughness: .4, emissive: 0xffffff, emissiveMap: sdLabel, emissiveIntensity: .55 })); sdFace.position.z = .0095;
  sd.add(sdBody, sdFace); root.add(sd);
  parts.push({ obj: sd, sd: true, focus: 'card' });

  /* ---------- ISI DALAM ---------- */
  add(rr(.62, .62, .4, .03, .008), new THREE.MeshStandardMaterial({ color: 0x1a1b1e, roughness: .5, metalness: .5 }), [LX, LY + .02, -.04]); // kotak cermin
  add(rr(.46, .32, .008, .006, .002), M.mirror, [LX, LY + .02, .08], [-.78, 0, 0]);                // cermin
  add(rr(.44, .3, .012, .006, .003), M.glass, [LX, .32, .05], [Math.PI / 2, 0, 0]);                // layar fokus
  // pentaprisma kaca
  { const s = new THREE.Shape(); s.moveTo(-.18, -.1); s.lineTo(.18, -.1); s.lineTo(.1, .12); s.lineTo(-.1, .12); s.closePath();
    add(extrude(s, .28, .006, 2).translate(0, 0, -.14), M.glass, [0, .5, -.01]); }
  add(cylZ(.1, .05, 32), M.glass, [0, .5, -.22]);

  // Sensor dengan bingkai: komponen pahlawan bagian "Light becomes possibility".
  const sens = new THREE.Group();
  sens.position.set(LX, LY, -.18);
  const ceramic = new THREE.Mesh(rr(.44, .34, .03, .018, .006), new THREE.MeshStandardMaterial({ color: 0x0e7a6b, roughness: .35, metalness: .55 }));
  const die = new THREE.Mesh(new THREE.PlaneGeometry(.31, .22), M.sensor); die.position.z = .017;
  const glassFrame = new THREE.Mesh(rr(.35, .26, .012, .012, .003), M.gold); glassFrame.position.z = .012;
  const glassFrameCut = new THREE.Mesh(new THREE.PlaneGeometry(.325, .235), new THREE.MeshStandardMaterial({ color: 0x050505, roughness: .3 })); glassFrameCut.position.z = .0185;
  die.position.z = .0195;
  sens.add(ceramic, glassFrame, glassFrameCut, die);
  for (let i = 0; i < 24; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.012, .018, .004), M.gold); const a = i / 24; const t = i % 2; s.position.set(-.2 + a * .4, t ? .17 : -.17, .016); sens.add(s); }
  root.add(sens);
  parts.push({ obj: sens, focus: 'sensor' });

  // Papan sirkuit dengan cip dan kapasitor
  const pcb = new THREE.Group(); pcb.position.set(-.05, -.08, -.235);
  pcb.add(new THREE.Mesh(rr(1.0, .68, .012, .02, .002), M.pcb));
  const rng = (() => { let s = 11; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 42; i++) {
    const w = .015 + rng() * .05, h = .015 + rng() * .05;
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, .008 + rng() * .012), rng() > .75 ? M.gold : M.chip);
    c.position.set((rng() - .5) * .92, (rng() - .5) * .6, .012); pcb.add(c);
  }
  const big = new THREE.Mesh(new THREE.BoxGeometry(.13, .13, .012), M.chip); big.position.set(.24, .1, .014); pcb.add(big);
  root.add(pcb); parts.push({ obj: pcb });

  // Pelat pelindung dan unit rana
  add(rr(.5, .42, .014, .012, .004), M.steel, [LX, LY, -.13]);
  for (let i = 0; i < 4; i++) add(rr(.42, .08, .004, .004, .001), M.chip, [LX, LY + .15 - i * .1, -.15 + i * .001]); // bilah rana

  // Baterai
  const batTex = canvasTex(512, 720, (x, W, H) => {
    x.fillStyle = '#17191d'; x.fillRect(0, 0, W, H); x.fillStyle = '#d7dde0';
    x.font = '800 90px "Big Shoulders Display"'; x.textAlign = 'center'; x.fillText('LP-E60', W / 2, 180);
    x.font = '800 44px "Big Shoulders Display"'; x.fillText('7.4V  1800mAh', W / 2, 260); x.fillStyle = '#e8560f'; x.fillRect(60, 320, W - 120, 8);
  });
  add(rr(.22, .36, .13, .02, .008), [M.chip, new THREE.MeshStandardMaterial({ map: batTex, roughness: .5 })].at(1), [-.5, -.16, .14], [0, 0, 0]);
  for (const [x, y] of [[.42, -.3], [.5, -.3], [.42, -.4], [.5, -.4]]) add(cyl(.034, .13, 20), M.steel, [x, y, -.16]);          // kapasitor
  add(rr(.08, .3, .004, .006, .001), new THREE.MeshStandardMaterial({ color: 0xc87a22, roughness: .35, metalness: .6 }), [.28, .1, -.2], [0, .3, .4]);  // kabel fleksibel
  add(rr(.08, .22, .004, .006, .001), new THREE.MeshStandardMaterial({ color: 0xc87a22, roughness: .35, metalness: .6 }), [-.2, .28, -.1], [.5, 0, -.3]);
  for (const [x, y, z] of [[-.6, -.42, .28], [.6, -.42, .28], [-.6, .3, -.3], [.6, .24, -.3], [-.62, -.44, -.3], [.62, -.44, -.3], [0, -.47, .25], [0, -.47, -.25], [.66, 0, .2], [-.3, .41, .25]])
    add(cyl(.013, .03, 12), M.steel, [x, y, z], [Math.PI / 2 * (y > .2 ? 1 : 0), 0, 0]);  // sekrup

  /* ---------- LENSA ---------- */
  const lens = o => ({ lens: true, ...o });
  const zoom = { zoom: true };
  const lp = [LX, LY, 0];
  add(lathe([[.33, .3], [.335, .31], [.335, .345], [.325, .35]]), M.chrome, lp, [0, 0, 0], lens());
  add(lathe([[.325, .35], [.345, .372], [.345, .52], [.335, .535]]), M.shell, lp, [0, 0, 0], lens());
  add(ribbedRing(.365, .3, .2, 120, .009).translate(0, 0, .535), M.rubber, lp, [0, 0, 0], lens());
  add(lathe([[.3, .535], [.352, .54], [.352, .73], [.3, .735]]), M.shell, lp, [0, 0, 0], lens());
  { const band = canvasTex(2048, 96, (x, W, H) => {
      x.fillStyle = '#121316'; x.fillRect(0, 0, W, H); x.fillStyle = '#e9eef0'; x.font = '800 44px "Big Shoulders Display"'; x.textAlign = 'center';
      ['18', '35', '50', '85', '135'].forEach((t, i) => { x.fillText(t, 160 + i * 150, 66); x.fillText(t, 1160 + i * 150, 66); });
    });
    const g = new THREE.CylinderGeometry(.347, .347, .06, 96, 1, true).rotateX(Math.PI / 2).translate(0, 0, .77);
    add(g, new THREE.MeshStandardMaterial({ map: band, roughness: .45, metalness: .2 }), lp, [0, 0, Math.PI * .35], lens());
  }
  add(new THREE.TorusGeometry(.347, .006, 10, 96), M.red, [LX, LY, .806], [0, 0, 0], lens());
  add(ribbedRing(.358, .3, .11, 90, .007).translate(0, 0, .81), M.rubber, lp, [0, 0, 0], lens(zoom));
  add(lathe([[.3, .81], [.346, .812], [.346, .92], [.3, .925]]), M.shell, lp, [0, 0, 0], lens(zoom));
  add(lathe([[.34, .92], [.352, .935], [.366, 1.03], [.37, 1.055], [.36, 1.065], [.335, 1.065], [.325, 1.04]]), M.top, lp, [0, 0, 0], lens(zoom));
  // cincin nama lensa dan baffle dalam
  { const t = canvasTex(1024, 1024, (x, W, H) => {
      x.translate(W / 2, H / 2); x.fillStyle = '#e5ecef'; x.font = '800 34px "Big Shoulders Display"'; x.textAlign = 'center';
      const s = 'HALDEN LENS   VOX 18-135mm   1:3.5-5.6   IS   Ø72mm     HALDEN LENS   ULTRASONIC     ';
      for (let i = 0; i < s.length; i++) { x.save(); x.rotate(i / s.length * Math.PI * 2); x.translate(0, -452); x.fillText(s[i], 0, 0); x.restore(); }
    });
    const g = new THREE.RingGeometry(.262, .328, 96); const uv = g.attributes.uv, p = g.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / .66 + .5, p.getY(i) / .66 + .5);
    const ringBack = new THREE.MeshStandardMaterial({ map: t, roughness: .35, metalness: .3 });
    add(g, ringBack, [LX, LY, 1.04], [0, 0, 0], lens(zoom));
  }
  add(lathe([[.264, 1.04], [.25, .99], [.244, .97], [.23, .95], [.224, .93], [.21, .91], [.204, .89]]), M.rubber, lp, [0, 0, 0], lens(zoom));
  for (const r of [.25, .233, .216]) add(new THREE.TorusGeometry(r, .002, 8, 96), M.steel, [LX, LY, .99 - (.25 - r) * 2], [0, 0, 0], lens(zoom));
  { const cap = new THREE.SphereGeometry(.34, 96, 32, 0, Math.PI * 2, 0, .72).rotateX(Math.PI / 2).translate(0, 0, -.26);
    add(cap, M.frontGlass, [LX, LY, 1.14 - .2], [0, 0, 0], lens(zoom)); }

  // Elemen lensa dan bilah diafragma di dalam barrel
  for (let i = 0; i < 6; i++) {
    const r = .2 + i * .012;
    const el = new THREE.SphereGeometry(r * 1.6, 48, 12, 0, Math.PI * 2, 0, .66).rotateX(Math.PI / 2);
    add(el, M.glass, [LX, LY, .42 + i * .075 - r * 1.2], [0, 0, 0], lens());
    add(new THREE.TorusGeometry(r + .012, .012, 10, 64), i % 2 ? M.steel : M.chip, [LX, LY, .43 + i * .075], [0, 0, 0], lens());
  }
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.09, .03, .14, .13); s.quadraticCurveTo(.05, .1, 0, .08); s.closePath();
    const a = i / 8 * Math.PI * 2;
    add(new THREE.ExtrudeGeometry(s, { depth: .002, bevelEnabled: false }), M.steel, [LX + Math.cos(a) * .1, LY + Math.sin(a) * .1, .62], [0, 0, a], lens());
  }

  return { root, parts, lcdGroup: lcd, screenMats: [scrA, scrB], materials: M };
}
