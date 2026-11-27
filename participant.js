/**
 * RN Awards 2026 — Virtual Exhibition participants (study members)
 * ----------------------------------------------------------------
 * Procedural three.js versions of the seven member characters from the
 * reference sheet: soft clay look, big friendly heads, each with their
 * own hair, outfit and a phone showing their app's icon.
 * No external model files; geometry, textures and materials are shared.
 *
 *   import { createParticipant, MEMBERS } from './participant.js';
 *   const p = createParticipant(MEMBERS[0], { name: 'Study Member 01' });
 *   scene.add(p.object);
 *   p.setState('wave');          // 'idle' | 'walk' | 'wave' | 'clap'
 *   p.update(dt);                // every frame
 *
 * ~1.6 world units tall at scale 1, feet at y = 0, facing +Z.
 */
import * as THREE from 'three';

/* ---------- caches ---------- */
const _m = new Map(), _g = new Map(), _t = new Map();
const once = (map, k, make) => { if (!map.has(k)) map.set(k, make()); return map.get(k); };

const SKIN = 0xf7d6c3, BLUSH = 0xf09c95, EYE = 0x231a16, LIP = 0x9a4a40;

const clay = (color, rough = 0.78, map = null, key = '') => once(_m, 'c' + color + rough + key, () => new THREE.MeshPhysicalMaterial({
  color, map, roughness: rough, metalness: 0, sheen: 0.35, sheenRoughness: 0.8, sheenColor: new THREE.Color(0xffffff),
}));
const skinMat = () => once(_m, 'skin', () => new THREE.MeshPhysicalMaterial({ color: SKIN, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.6, sheen: 0.4, sheenColor: new THREE.Color(0xffd9c8) }));
const hairMat = (c) => once(_m, 'h' + c, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.5, sheen: 0.7, sheenRoughness: 0.4, sheenColor: new THREE.Color(c).lerp(new THREE.Color(0xffffff), 0.45), side: THREE.DoubleSide }));
const hairMatF = (c) => once(_m, 'hf' + c, () => { const mm = hairMat(c).clone(); mm.side = THREE.FrontSide; return mm; });
const flat = (c, opts = {}) => once(_m, 'f' + c + JSON.stringify(opts), () => new THREE.MeshBasicMaterial({ color: c, ...opts }));
const gloss = (c) => once(_m, 'g' + c, () => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));

/* ---------- procedural fabric textures ---------- */
function canvasTex(key, w, h, draw, repeat = [1, 1]) {
  return once(_t, key, () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 4;
    return t;
  });
}
const css = (n) => '#' + n.toString(16).padStart(6, '0');
const stripes = (a, b, n) => canvasTex(`str${a}${b}${n}`, 8, 256, (g, w, h) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = css(i % 2 ? b : a); g.fillRect(0, (h / 8) * i, w, h / 8); }
}, [1, n]);
const plaid = () => canvasTex('plaid', 256, 256, (g, w, h) => {
  g.fillStyle = '#c96a5c'; g.fillRect(0, 0, w, h);
  const band = (x, y, bw, col, a) => { g.globalAlpha = a; g.fillStyle = col; if (x != null) g.fillRect(x, 0, bw, h); if (y != null) g.fillRect(0, y, w, bw); };
  [[0, 70, '#2c3350', 0.75], [128, 70, '#2c3350', 0.75], [90, 10, '#f3e6d6', 0.7], [218, 10, '#f3e6d6', 0.7], [40, 6, '#7a2a2a', 0.6], [168, 6, '#7a2a2a', 0.6]]
    .forEach(([p, bw, col, a]) => { band(p, null, bw, col, a); band(null, p, bw, col, a); });
  g.globalAlpha = 1;
}, [3, 3]);
const knit = () => canvasTex('knit', 128, 128, (g, w, h) => {
  g.fillStyle = '#efe2c6'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(150,120,80,.28)'; g.lineWidth = 6;
  for (let x = 16; x < w; x += 32) for (let y = -16; y < h + 16; y += 32) {
    g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x, y + 8, x + 9, y + 16); g.stroke();
    g.beginPath(); g.moveTo(x + 9, y); g.quadraticCurveTo(x, y + 8, x - 9, y + 16); g.stroke();
  }
  g.strokeStyle = 'rgba(150,120,80,.18)'; g.lineWidth = 3;
  for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
}, [6, 3]);
const denim = (base) => canvasTex('den' + base, 128, 128, (g, w, h) => {
  g.fillStyle = css(base); g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); }
}, [4, 4]);

/* ---------- geometry helpers ---------- */
const v2 = (x, y) => new THREE.Vector2(x, y);
const lathe = (k, pts, seg = 32, fz = 1) => once(_g, 'l' + k, () => { const g = new THREE.LatheGeometry(pts.map(([x, y]) => v2(x, y)), seg); if (fz !== 1) g.scale(1, 1, fz); g.computeVertexNormals(); return g; });
const capsule = (r, l) => once(_g, `c${r}_${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 16));
const sphere = (r, w = 32, h = 20) => once(_g, `s${r}_${w}`, () => new THREE.SphereGeometry(r, w, h));
function mesh(geo, mat, parent, pos, rot, scale) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  if (pos) m.position.set(...pos); if (rot) m.rotation.set(...rot); if (scale) m.scale.set(...scale);
  parent.add(m); return m;
}
const pivot = (parent, pos) => { const g = new THREE.Group(); if (pos) g.position.set(...pos); parent.add(g); return g; };

/* ---------- proportions ---------- */
const HIP_Y = 0.74;
const HR = 0.2;                       // head radius
const SH = [0.165, 0.42];               // shoulder x, y (from hips)
const TORSO = [[0.001, -0.05], [0.15, -0.045], [0.16, 0.05], [0.152, 0.2], [0.16, 0.33], [0.172, 0.41], [0.142, 0.465], [0.06, 0.492], [0.001, 0.5]];
const TORSO_LONG = [[0.001, -0.14], [0.165, -0.13], [0.165, 0.0], [0.155, 0.2], [0.162, 0.33], [0.174, 0.41], [0.144, 0.465], [0.06, 0.492], [0.001, 0.5]];
const PANT = [[0.001, 0.035], [0.09, 0.03], [0.094, -0.12], [0.102, -0.42], [0.114, -0.64], [0.115, -0.668], [0.001, -0.672]];

/* ---------- phone screens ---------- */
const ICON_DRAW = {
  leaf: (g) => { g.fillStyle = '#4c9a5b'; g.beginPath(); g.moveTo(-40, 40); g.bezierCurveTo(-50, -20, 0, -60, 50, -50); g.bezierCurveTo(50, 10, 10, 50, -40, 40); g.fill(); g.strokeStyle = '#e9f5ea'; g.lineWidth = 6; g.beginPath(); g.moveTo(-36, 36); g.lineTo(32, -32); g.stroke(); },
  code: (g) => { g.strokeStyle = '#f2f2f4'; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-26, -24); g.lineTo(-50, 0); g.lineTo(-26, 24); g.moveTo(26, -24); g.lineTo(50, 0); g.lineTo(26, 24); g.moveTo(10, -36); g.lineTo(-10, 36); g.stroke(); },
  check: (g) => { g.strokeStyle = '#3f6fd8'; g.lineWidth = 14; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-40, 0); g.lineTo(-10, 30); g.lineTo(44, -30); g.stroke(); },
  image: (g) => { g.fillStyle = '#4f7fe0'; g.beginPath(); g.roundRect(-50, -40, 100, 80, 12); g.fill(); g.fillStyle = '#cfe0ff'; g.beginPath(); g.moveTo(-40, 30); g.lineTo(-8, -6); g.lineTo(14, 16); g.lineTo(26, 4); g.lineTo(42, 30); g.fill(); g.beginPath(); g.arc(22, -18, 9, 0, Math.PI * 2); g.fill(); },
  heart: (g) => { g.fillStyle = '#ee5a8c'; g.beginPath(); g.moveTo(0, 40); g.bezierCurveTo(-70, -6, -34, -64, 0, -26); g.bezierCurveTo(34, -64, 70, -6, 0, 40); g.fill(); },
  bars: (g) => { g.fillStyle = '#7b61e6'; [[-44, 10, 22, 34], [-12, -12, 22, 56], [20, -40, 22, 84]].forEach(([x, y, w, h]) => { g.beginPath(); g.roundRect(x, y, w, h, 5); g.fill(); }); },
  moon: (g) => { g.fillStyle = '#ef8a3c'; g.beginPath(); g.arc(0, 0, 44, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffeec8'; g.beginPath(); g.arc(22, -16, 38, 0, Math.PI * 2); g.fill(); },
};
const screenTex = (icon, bg) => canvasTex('scr' + icon + bg, 160, 320, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, bg[0]); grd.addColorStop(1, bg[1]);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(0,0,0,.85)'; g.beginPath(); g.roundRect(w / 2 - 22, 12, 44, 12, 6); g.fill();
  g.save(); g.translate(w / 2, h / 2); (ICON_DRAW[icon] || ICON_DRAW.check)(g); g.restore();
});

/* ---------- the seven members (from the character sheet) ---------- */
export const MEMBERS = [
  { id: 'm1', hair: 'bowl',  hairColor: 0x1d1a1a, top: 'sweat',  topColor: 0x232225, pants: 0xebe3d3, cargo: true,  free: 'pocket', icon: 'leaf',  screen: ['#eef5ec', '#d9ebd8'] },
  { id: 'm2', hair: 'curlyPerm', hairColor: 0x221c1a, top: 'cable',  topColor: 0xefe2c6, pants: 0x2c3140, denim: true,  free: 'thumb',  icon: 'code',  screen: ['#2a2a30', '#1b1b20'] },
  { id: 'm3', hair: 'bun',   hairColor: 0x1e1a1a, top: 'track',  topColor: 0x1f1e20, pants: 0x262426, glasses: true, free: 'hold', icon: 'check', screen: ['#e6f0ff', '#cfe0ff'] },
  { id: 'm4', hair: 'bob',   hairColor: 0x7b4b33, top: 'stripe', topColor: 0x2b3352, stripe: 0xf0e6cf, pants: 0xa8b7c9, denim: true, free: 'hold', icon: 'image', screen: ['#e9f0ff', '#d4e2ff'] },
  { id: 'm5', hair: 'straight', hairColor: 0x1e1b1d, top: 'raglan', topColor: 0xf2efe9, sleeve: 0x2d3349, pants: 0x262426, cargo: true, free: 'pocket', icon: 'heart', screen: ['#fbeaf2', '#f6d6e6'], shoeAccent: 0x7a2730 },
  { id: 'm6', hair: 'wavy',  hairColor: 0x6f4530, top: 'flannel', topColor: 0xffffff, pants: 0x313a52, denim: true, belt: true, free: 'hold', icon: 'bars', screen: ['#f0ebff', '#e0d6ff'] },
  { id: 'm7', hair: 'wavyDark', hairColor: 0x2b2231, top: 'hoodie', topColor: 0xf2b8c6, skirt: 0xf7f4ee, pants: 0xf7f4ee, free: 'pocket', icon: 'moon', screen: ['#fff3d6', '#ffe6b0'] },
];

/* ---------- head: face, ears, hair ---------- */
const HEAD_S = [1, 0.96, 0.95];
function onFace(x, y, off = 0.002) {
  const yy = y / HEAD_S[1];
  const z = HEAD_S[2] * Math.sqrt(Math.max(0, HR * HR - x * x - yy * yy));
  return new THREE.Vector3(x, y, z + off);
}
function faceNormal(p) { return new THREE.Vector3(p.x / (HEAD_S[0] ** 2), p.y / (HEAD_S[1] ** 2), p.z / (HEAD_S[2] ** 2)).normalize(); }
const Z = new THREE.Vector3(0, 0, 1);

function buildFace(head, def) {
  const eyes = [];
  [-1, 1].forEach((s) => {
    const p = onFace(s * 0.072, -0.034, -0.004);
    const e = mesh(sphere(0.024, 20, 14), flat(EYE), head, [p.x, p.y, p.z], null, [0.82, 1.18, 0.5]); e.castShadow = false;
    const hl = mesh(sphere(0.0065, 10, 8), flat(0xffffff), e, [0.0075, 0.009, 0.019]); hl.castShadow = false;
    eyes.push(e);
    const bp = onFace(s * 0.074, 0.028, 0.0);
    const brow = mesh(capsule(0.0045, 0.026), flat(def.hairColor), head, [bp.x, bp.y, bp.z], [0, 0, Math.PI / 2 + s * 0.12]); brow.castShadow = false;
    const ch = onFace(s * 0.112, -0.08, 0.003);
    const blush = mesh(once(_g, 'blush', () => new THREE.CircleGeometry(0.03, 24)), flat(BLUSH, { transparent: true, opacity: 0.38, depthWrite: false }), head, [ch.x, ch.y, ch.z]);
    blush.quaternion.setFromUnitVectors(Z, faceNormal(ch)); blush.castShadow = false;
    mesh(sphere(0.034, 18, 12), skinMat(), head, [s * HR * 0.97, -0.02, -0.005], null, [0.55, 1, 0.8]);
  });
  const np = onFace(0, -0.062, -0.004);
  mesh(sphere(0.012, 12, 8), skinMat(), head, [np.x, np.y, np.z], null, [1.1, 0.8, 0.8]);
  const mp = onFace(0, -0.1, -0.002);
  const mouth = mesh(once(_g, 'smile', () => new THREE.TorusGeometry(0.02, 0.0042, 6, 18, Math.PI)), flat(LIP), head, [mp.x, mp.y, mp.z], [0, 0, Math.PI]);
  mouth.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(Z, faceNormal(mp))); mouth.castShadow = false;
  if (def.glasses) {
    const ring = once(_g, 'lens', () => new THREE.TorusGeometry(0.041, 0.005, 8, 28));
    [-1, 1].forEach((s) => { const p = onFace(s * 0.072, -0.032, 0.016); const r = mesh(ring, gloss(0x191818), head, [p.x, p.y, p.z]); r.quaternion.setFromUnitVectors(Z, faceNormal(onFace(s * 0.035, -0.032))); });
    const bp = onFace(0, -0.024, 0.018); mesh(capsule(0.004, 0.034), gloss(0x191818), head, [bp.x, bp.y, bp.z], [0, 0, Math.PI / 2]);
    [-1, 1].forEach((s) => mesh(capsule(0.0035, 0.13), gloss(0x191818), head, [s * HR * 0.99, -0.015, 0.05], [Math.PI / 2, 0, 0]));
  }
  return eyes;
}

// sphere cap on top of the head
const capG = (r, theta, k) => once(_g, 'cap' + k, () => new THREE.SphereGeometry(r, 44, 26, 0, Math.PI * 2, 0, theta));
// side/back shell that leaves the face open
const shellG = (r, t0, tl, gap, k) => once(_g, 'shell' + k, () => new THREE.SphereGeometry(r, 44, 20, Math.PI / 2 + gap, Math.PI * 2 - gap * 2, t0, tl));
// hanging hair, open at the front, optional waves
function curtainG(k, top, bot, len, gap, wave, freq = 9) {
  return once(_g, 'cur' + k, () => {
    const g = new THREE.CylinderGeometry(top, bot, len, 48, 24, true, gap, Math.PI * 2 - gap * 2);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const ang = Math.atan2(v.x, v.z), down = (len / 2 - v.y) / len;
      const r = Math.hypot(v.x, v.z) + wave * Math.sin(down * freq + ang * 4) * down;
      p.setXYZ(i, Math.sin(ang) * r, v.y - len / 2, Math.cos(ang) * r);
    }
    g.computeVertexNormals();
    return g;
  });
}

// hair falling from the head: the open front widens toward the bottom so the lower part sits behind the
// shoulders, and the hem is cut into uneven, thinning tips (layers)
function fallG(k, top, bot, len, gapTop, gapBot, jag, wave = 0, freq = 3) {
  return once(_g, 'fall' + k, () => {
    const g = new THREE.CylinderGeometry(top, bot, len, 56, 30, true, gapTop, Math.PI * 2 - gapTop * 2);
    const p = g.attributes.position, v = new THREE.Vector3(), span0 = Math.PI * 2 - gapTop * 2;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = Math.min(1, Math.max(0, (len / 2 - v.y) / len)); // 0 top, 1 bottom
      let a = Math.atan2(v.x, v.z); if (a < 0) a += Math.PI * 2;
      const gap = gapTop + (gapBot - gapTop) * Math.pow(t, 0.8);
      const a2 = gap + (a - gapTop) * ((Math.PI * 2 - gap * 2) / span0);
      let r = Math.hypot(v.x, v.z) * (1 - 0.06 * t);
      const tipT = Math.pow(t, 5);
      const cut = jag * tipT * (0.55 + 0.45 * Math.sin(a2 * 9.0) * Math.sin(a2 * 3.7 + 1.3));
      r *= 1 - 0.25 * tipT;                                     // thin the ends
      if (wave) r += wave * Math.sin(t * freq * Math.PI * 2 + a2 * 2.0) * Math.min(1, t * 2.2); // S-waves, calmer near the roots
      p.setXYZ(i, Math.sin(a2) * r, v.y - len / 2 + cut, Math.cos(a2) * r * 0.86);
    }
    g.computeVertexNormals();
    return g;
  });
}

// a sphere segment whose lower edge is cut into tapered strands (fringes, layered ends)
function jaggedG(k, r, phiStart, phiLen, t0, tl, jag, count, flare, wave = 0, wp = 5, wt = 4, edge = 0) {
  return once(_g, 'jag' + k, () => {
    const g = new THREE.SphereGeometry(r, 72, 26, phiStart, phiLen, t0, tl);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const rr = v.length(); if (!rr) continue;
      let th = Math.acos(Math.max(-1, Math.min(1, v.y / rr)));
      let ph = Math.atan2(v.z, -v.x); while (ph < phiStart - 1e-6) ph += Math.PI * 2;
      const u = Math.min(1, Math.max(0, (th - t0) / tl)), w = Math.min(1, Math.max(0, (ph - phiStart) / phiLen));
      const strand = 0.5 + 0.5 * Math.cos(w * count * Math.PI * 2);          // 1 at strand centres, 0 in the gaps
      const s = Math.max(0, (u - 0.45) / 0.55), ease = s * s * (3 - 2 * s);
      th -= (jag / r) * Math.pow(1 - strand, 1.4) * ease;                       // lift the gaps -> pointed tips
      if (edge) { const e = 1 - Math.min(1, Math.min(w, 1 - w) / 0.16); th -= edge * e * e * u; }  // curve the open edges up toward the temples
      const R2 = r * (1 + (flare - 1) * u * u) * (1 + wave * Math.sin(ph * wp + th * wt) * (0.35 + 0.65 * u));
      v.set(-R2 * Math.cos(ph) * Math.sin(th), R2 * Math.cos(th), R2 * Math.sin(ph) * Math.sin(th));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    return g;
  });
}

// a thick curl: a tapered lock whose centre line winds in a loose helix (reads as an S-curl, not a bump)
function curlG(len, w, amp, turns) {
  return once(_g, `curl${len.toFixed(3)}_${w}_${amp}_${turns}`, () => {
    const g = new THREE.CapsuleGeometry(w, len, 8, 18);
    const p = g.attributes.position, v = new THREE.Vector3(), half = len / 2 + w;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = Math.min(1, Math.max(0, (half - v.y) / (2 * half)));
      const a = t * turns * Math.PI * 2, k = amp * (0.25 + 0.75 * t);
      const taper = 1 - 0.32 * t * t;   // rounded ends, not points
      p.setXYZ(i, v.x * taper + Math.sin(a) * k, v.y, v.z * taper * 0.85 + (Math.cos(a) - 1) * k * 0.85);
    }
    g.computeVertexNormals();
    return g;
  });
}
// hang a curl from a point on the head (theta from the crown, phi from the front), following the surface downwards
const _dn = new THREE.Vector3(0, -1, 0);
function hangCurl(H, mat, r, th, ph, len, w, amp, freq, sweep = 0, out = 0.04, flip = 1, helix = false) {
  const pos = new THREE.Vector3(r * Math.sin(th) * Math.sin(ph), r * Math.cos(th), r * Math.sin(th) * Math.cos(ph));
  const nrm = pos.clone().normalize();
  const tan = new THREE.Vector3(Math.cos(th) * Math.sin(ph), -Math.sin(th), Math.cos(th) * Math.cos(ph)).normalize();
  const side = new THREE.Vector3().crossVectors(nrm, tan).normalize();
  const dir = tan.clone().addScaledVector(nrm, out).addScaledVector(side, sweep).normalize();
  // lay the flat S-ribbon on the surface: local -Y along the fall, local Z facing out of the head
  const Y = dir.clone().negate(), Z = nrm.clone().addScaledVector(Y, -nrm.dot(Y)).normalize(), X = new THREE.Vector3().crossVectors(Y, Z);
  const m = new THREE.Mesh(helix ? curlG(len, w, amp, freq) : waveLockG(len, w, amp, freq), mat); m.castShadow = true; m.receiveShadow = true;
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X.multiplyScalar(flip), Y, Z.multiplyScalar(flip)));
  m.position.copy(pos).addScaledVector(dir, len / 2);
  H.add(m); return m;
}

// a tapered, flattened lock of hair with a slight outward flick at the tip
function lockG(len, w) {
  return once(_g, `lock${len.toFixed(3)}_${w}`, () => {
    const g = new THREE.CapsuleGeometry(w, len, 6, 14);
    const p = g.attributes.position, v = new THREE.Vector3(), half = len / 2 + w;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = (half - v.y) / (2 * half);            // 0 at top, 1 at tip
      const taper = 1 - 0.55 * t * t;
      p.setXYZ(i, v.x * taper + 0.02 * t * t * t, v.y, v.z * taper * 0.42);
    }
    g.computeVertexNormals();
    return g;
  });
}

// a lock with S-waves along its length (for wavy styles)
function waveLockG(len, w, amp, freq) {
  return once(_g, `wlock${len.toFixed(3)}_${w}_${amp}_${freq}`, () => {
    const g = new THREE.CapsuleGeometry(w, len, 8, 20);
    const p = g.attributes.position, v = new THREE.Vector3(), half = len / 2 + w;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const t = Math.min(1, Math.max(0, (half - v.y) / (2 * half)));
      const taper = 1 - 0.5 * t * t;
      const off = amp * Math.sin(t * freq * Math.PI * 2) * Math.min(1, t * 3);
      p.setXYZ(i, v.x * taper + off, v.y, v.z * taper * 0.5 + off * 0.35);
    }
    g.computeVertexNormals();
    return g;
  });
}

function buildHair(head, def) {
  const m = hairMat(def.hairColor), R = HR;
  const H = pivot(head); H.scale.set(...HEAD_S);
  switch (def.hair) {
    case 'bowl':
      mesh(capG(R * 1.09, Math.PI * 0.5, 'bowl'), m, H, [0, 0.004, -0.006], [0.06, 0, 0]);
      mesh(shellG(R * 1.09, Math.PI * 0.45, Math.PI * 0.16, 1.0, 'bowlside'), m, H, [0, 0.004, -0.006]);
      break;
    case 'curlyPerm': {
      // full curly perm after the reference: big volume, hair over the ears to the jaw and nape,
      // a long fringe swept to one side, and thick S-curls all over (long twisted locks, no small bumps)
      const D = R * 1.12;
      mesh(jaggedG('cpCrown', R * 1.14, 0, Math.PI * 2, 0, Math.PI * 0.44, 0, 1, 1.0, 0.04, 4, 4), m, H, [0, R * 0.06, -R * 0.04], [-0.05, 0, 0]);
      mesh(jaggedG('cpBack', R * 1.18, Math.PI / 2 + 0.62, Math.PI * 2 - 1.24, Math.PI * 0.05, Math.PI * 0.7, R * 0.3, 11, 1.12, 0.05, 4, 4, 0.7), m, H, [0, 0, -0.012]);
      const fr = mesh(jaggedG('cpFringe', R * 1.16, Math.PI / 2 - 1.2, 2.4, Math.PI * 0.12, Math.PI * 0.38, R * 0.24, 5, 1.08, 0.05, 4, 4), m, H, [0, 0, -0.004]);
      fr.rotation.set(0.02, -0.08, -0.24);
      let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
      // four overlapping rings of round corkscrew curls lying on the head (each ring skips the face)
      [[0.2, 11, 0.7, 0.46, 1.03], [0.3, 14, 0.85, 0.52, 1.06], [0.41, 15, 1.0, 0.56, 1.09], [0.52, 15, 1.15, 0.6, 1.12]].forEach(([t, n, gap, len, rr], ring) => {
        for (let i = 0; i < n; i++) {
          const ph = gap + (i + (ring % 2) * 0.5) / n * (Math.PI * 2 - gap * 2);
          hangCurl(H, m, D * rr, Math.PI * t, ph, R * (len + (rnd() - 0.5) * 0.1), 0.046, 0.032, 1.5 + rnd() * 0.5, (rnd() - 0.5) * 0.35, 0.1, i % 2 ? 1 : -1, true);
        }
      });
      // fringe curls swept across the forehead to one side, ending at the brow
      [[-0.6, 0.5], [-0.32, 0.55], [-0.05, 0.6], [0.22, 0.66], [0.48, 0.74]].forEach(([ph, sw], j) =>
        hangCurl(H, m, D * 1.05, Math.PI * 0.22, ph, R * (0.54 + j * 0.03), 0.042, 0.028, 1.4, sw, 0.1, j % 2 ? 1 : -1, true));
      break;
    }
    case 'perm': {
      // voluminous wavy perm: rolled crown, side-swept wavy bangs, waves over the ears down to the nape.
      // Curls are large, smooth waves in the surface (no clusters of small bumps).
      mesh(jaggedG('permcrown2', R * 1.13, 0, Math.PI * 2, 0, Math.PI * 0.42, 0, 1, 1.0, 0.045, 4, 4), m, H, [0, R * 0.05, -R * 0.03], [-0.05, 0, 0]);
      // side-swept fringe, longer on the right, wavy
      const fr = mesh(jaggedG('permfringe2', R * 1.15, Math.PI / 2 - 1.2, 2.4, Math.PI * 0.12, Math.PI * 0.37, R * 0.24, 6, 1.08, 0.05, 4, 4), m, H, [0, 0, -0.004]);
      fr.rotation.set(0.02, -0.06, -0.15);
      // sides and back: full waves to the ear lobes and nape
      mesh(jaggedG('permback3', R * 1.165, Math.PI / 2 + 0.7, Math.PI * 2 - 1.4, Math.PI * 0.06, Math.PI * 0.62, R * 0.28, 10, 1.1, 0.055, 4, 4, 0.75), m, H, [0, 0, -0.012]);
      break;
    }
    case 'shag': {
      // soft, tousled medium cut: airy crown, see-through bangs to the brows, sides over the ear tops, layered nape
      mesh(capG(R * 1.06, Math.PI * 0.4, 'shagcap3'), m, H, [0, R * 0.02, -0.006], [-0.04, 0, 0], [1.0, 1.06, 1.0]);
      mesh(sphere(0.1, 28, 18), m, H, [0, R * 0.88, -R * 0.1], [0.15, 0, 0], [1.25, 0.45, 1.1]);
      // fringe: a sheet over the forehead whose edge is cut into thin strands with gaps
      mesh(jaggedG('shagfringe3', R * 1.1, Math.PI / 2 - 1.05, 2.1, Math.PI * 0.1, Math.PI * 0.375, R * 0.2, 7, 1.07), m, H, [0, 0, -0.004]);
      // sides and back down to the ear tops and nape, ends cut into layers
      mesh(jaggedG('shagback3', R * 1.105, Math.PI / 2 + 0.86, Math.PI * 2 - 1.72, Math.PI * 0.06, Math.PI * 0.54, R * 0.2, 13, 1.04), m, H, [0, 0, -0.006]);
      break;
    }
    case 'curly': {
      mesh(capG(R * 1.03, Math.PI * 0.5, 'curlbase'), m, H, [0, 0, -0.004], [-0.1, 0, 0]);
      let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 70; i++) {
        const th = rnd() * Math.PI * 0.56, ph = rnd() * Math.PI * 2;
        const front = Math.cos(ph) > 0.55 && th > Math.PI * 0.33; if (front) continue;
        const r = R * (0.2 + rnd() * 0.1), d = R * 1.03;
        mesh(sphere(+(r.toFixed(3)), 14, 10), m, H, [d * Math.sin(th) * Math.sin(ph), d * Math.cos(th) - 0.005, d * Math.sin(th) * Math.cos(ph) - 0.008]);
      }
      break;
    }
    case 'bun':
      // crown, a little further forward so the hairline is soft rather than slicked back
      mesh(capG(R * 1.06, Math.PI * 0.5, 'bun'), m, H, [0, 0, -0.006], [-0.2, 0, 0]);
      // sides and nape gathered up toward the bun, hugging the head (open at the face)
      mesh(shellG(R * 1.05, Math.PI * 0.38, Math.PI * 0.3, 1.02, 'bunback'), m, H, [0, 0, -0.008]);
      // centre-parted curtain bangs sweeping out to each temple
      [-1, 1].forEach((sd) => {
        mesh(sphere(0.1, 28, 18), m, H, [sd * R * 0.3, R * 0.56, R * 0.76], [0.95, sd * -0.2, sd * -0.42], [1.05, 0.26, 0.5]);
        mesh(sphere(0.075, 24, 16), m, H, [sd * R * 0.7, R * 0.22, R * 0.62], [0.6, sd * -0.6, sd * -0.9], [0.95, 0.3, 0.55]);
        // wisps framing the face
        mesh(capsule(0.022, 0.11), m, H, [sd * R * 0.86, -R * 0.24, R * 0.4], [0.1, 0, sd * -0.08], [1, 1, 0.7]);
      });
      // fuller, higher bun with a tie
      mesh(sphere(0.074, 26, 18), m, H, [0, R * 0.92, -R * 0.62]);
      mesh(once(_g, 'buntie', () => new THREE.TorusGeometry(0.048, 0.011, 8, 24)), hairMat(def.tie ?? 0x7a2730), H, [0, R * 0.8, -R * 0.55], [-0.9, 0, 0]);
      break;
    case 'bob':
      mesh(capG(R * 1.09, Math.PI * 0.5, 'bobcap'), m, H, [0, 0.004, -0.004], [0.1, 0, 0]);
      mesh(curtainG('bob', R * 1.1, R * 1.3, R * 1.35, 0.88, R * 0.07, 8), m, H, [0, R * 0.3, -0.01]);
      break;
    case 'straight':
      mesh(capG(R * 1.08, Math.PI * 0.5, 'strcap'), m, H, [0, 0.004, -0.004], [0.12, 0, 0]);
      mesh(shellG(R * 1.072, Math.PI * 0.28, Math.PI * 0.4, 0.98, 'strside'), hairMatF(def.hairColor), H, [0, 0.002, -0.006]);
      mesh(curtainG('straight3', R * 1.062, R * 1.16, R * 3.36, 0.98, R * 0.012, 6), m, H, [0, R * 0.05, -0.01]);
      break;
    case 'wavy':
      // centre part with a soft lift at the roots, sides covering the ears
      mesh(capG(R * 1.08, Math.PI * 0.5, 'wavycap'), m, H, [0, 0, -0.004], [-0.16, 0, 0]);
      mesh(shellG(R * 1.082, Math.PI * 0.26, Math.PI * 0.42, 0.98, 'wavyside3'), hairMatF(def.hairColor), H, [0, 0.002, -0.006]);
      // curtain bangs: parted in the middle, curving out to each temple with a soft wave
      [-1, 1].forEach((sd) => {
        mesh(sphere(0.1, 28, 18), m, H, [sd * R * 0.28, R * 0.54, R * 0.78], [0.98, sd * -0.18, sd * -0.4], [1.08, 0.27, 0.5]);
        mesh(sphere(0.08, 26, 16), m, H, [sd * R * 0.66, R * 0.24, R * 0.68], [0.7, sd * -0.55, sd * -0.85], [1.05, 0.3, 0.55]);
      });
      // full, wavy lengths to mid-chest with volume toward the ends
      mesh(fallG('wavyLong3', R * 1.065, R * 1.32, R * 3.77, 1.05, 1.75, R * 0.5, R * 0.11, 2.0), m, H, [0, R * 0.05, -0.02]);
      mesh(fallG('wavyMid3', R * 1.072, R * 1.28, R * 2.58, 1.08, 1.55, R * 0.4, R * 0.09, 1.5), m, H, [0, R * 0.08, -0.012]);
      // wavy face-framing locks over the shoulders
      [-1, 1].forEach((sd) => {
        mesh(waveLockG(R * 2.4, 0.032, 0.026, 1.6), m, H, [sd * R * 0.9, -R * 1.25, R * 0.36], [0.2, sd * 0.55, sd * 0.06], [sd, 1, 0.8]);
        mesh(waveLockG(R * 2.8, 0.036, 0.03, 1.8), m, H, [sd * R * 0.98, -R * 1.45, R * 0.12], [0.16, sd * 0.85, sd * 0.07], [sd, 1, 0.8]);
      });
      break;
    case 'wavyDark':
      // crown parted on one side; the cap stops above the brows
      mesh(capG(R * 1.08, Math.PI * 0.46, 'wdcap'), m, H, [0, 0, -0.006], [-0.08, 0, 0]);
      // soft side-swept fringe from the part toward the left temple
      mesh(sphere(0.1, 28, 18), m, H, [-R * 0.12, R * 0.5, R * 0.8], [0.95, 0.15, 0.42], [1.25, 0.26, 0.5]);
      mesh(sphere(0.08, 24, 16), m, H, [-R * 0.58, R * 0.32, R * 0.72], [0.75, 0.55, 0.7], [1.05, 0.28, 0.55]);
      // one continuous outer shell: crown, temples and ears down to the jaw (open only at the face)
      mesh(shellG(R * 1.07, Math.PI * 0.3, Math.PI * 0.4, 0.98, 'wdside2'), hairMatF(def.hairColor), H, [0, 0, -0.008]);
      // long layered cut: sleek lengths starting at the crown, falling behind the shoulders, uneven tips
      mesh(fallG('layerLong4', R * 1.055, R * 1.02, R * 4.12, 1.12, 2.0, R * 0.55), m, H, [0, R * 0.05, -0.02]);
      mesh(fallG('layerMid4', R * 1.062, R * 1.1, R * 2.83, 1.15, 1.7, R * 0.45), m, H, [0, R * 0.08, -0.012]);
      // face-framing layers that grow out of the side hair at the temple and fall to the chest
      [-1, 1].forEach((sd) => {
        mesh(lockG(R * 1.15, 0.028), m, H, [sd * R * 0.88, -R * 0.62, R * 0.42], [0.1, sd * 0.45, sd * 0.04], [1, 1, 0.75]);
        mesh(lockG(R * 1.95, 0.032), m, H, [sd * R * 0.95, -R * 1.02, R * 0.3], [0.24, sd * 0.55, sd * 0.05], [1, 1, 0.75]);
        mesh(lockG(R * 2.25, 0.034), m, H, [sd * R * 0.99, -R * 1.17, R * 0.08], [0.18, sd * 0.85, sd * 0.04], [1, 1, 0.75]);
      });
      break;
    case 'short':
      mesh(capG(R * 1.07, Math.PI * 0.47, 'short'), m, H, [0, 0.002, -0.008], [-0.22, 0, 0]);
      mesh(shellG(R * 1.07, Math.PI * 0.42, Math.PI * 0.14, 1.05, 'shortside'), m, H, [0, 0.002, -0.008]);
      mesh(sphere(0.07, 20, 14), m, H, [0.04, R * 0.92, R * 0.42], [0.5, 0, -0.3], [1.3, 0.5, 0.8]);
      break;
    case 'pony':
      mesh(capG(R * 1.06, Math.PI * 0.5, 'pony'), m, H, [0, 0, -0.006], [-0.36, 0, 0]);
      mesh(shellG(R * 1.07, Math.PI * 0.42, Math.PI * 0.18, 0.98, 'ponyside'), m, H, [0, 0, -0.006]);
      mesh(sphere(0.026, 14, 10), hairMat(def.tie ?? 0x7a2730), H, [0, R * 0.42, -R * 1.02]);
      mesh(capsule(0.05, 0.2), m, H, [0, R * -0.18, -R * 1.12], [-0.25, 0, 0], [1, 1, 0.8]);
      break;
  }
}

/* ---------- body ---------- */
function buildTop(torso, def) {
  const c = def.topColor;
  let body, sleeve, sleeveFore;
  switch (def.top) {
    case 'cable': body = sleeve = clay(0xffffff, 0.95, knit(), 'knit'); break;
    case 'stripe': body = sleeve = clay(0xffffff, 0.85, stripes(def.topColor, def.stripe, 2.2), 'stripe'); break;
    case 'flannel': body = sleeve = clay(0xffffff, 0.88, plaid(), 'plaid'); break;
    case 'raglan': body = clay(c, 0.82); sleeve = clay(def.sleeve, 0.82); break;
    case 'tee': body = clay(c, 0.82); sleeve = clay(c, 0.82); sleeveFore = skinMat(); break;
    case 'coat': body = sleeve = clay(c, 0.92); break;
    case 'hoodie': body = sleeve = clay(c, 0.92); break;
    default: body = sleeve = clay(c, def.top === 'track' ? 0.55 : 0.86);
  }
  const long = def.top === 'flannel' || def.top === 'sweat' || def.top === 'cable' || def.top === 'stripe' || def.top === 'coat';
  mesh(lathe(long ? 'torsoLong' : 'torso', long ? TORSO_LONG : TORSO, 40, 0.74), body, torso);
  // necklines and details
  if (def.top === 'stripe') {
    [-1, 1].forEach((s) => mesh(once(_g, 'collar', () => { const g = new THREE.ConeGeometry(0.05, 0.07, 3); g.rotateX(-Math.PI / 2); return g; }), clay(0xfaf6ee, 0.7), torso, [s * 0.04, 0.47, 0.072], [0.5, 0, s * 0.9]));
  } else if (def.top === 'track') {
    mesh(once(_g, 'tcol', () => new THREE.CylinderGeometry(0.062, 0.07, 0.07, 28, 1, true)), clay(c, 0.55), torso, [0, 0.505, 0]).material.side = THREE.DoubleSide;
    mesh(once(_g, 'zip', () => new THREE.BoxGeometry(0.008, 0.5, 0.006)), clay(0xe9e6e2, 0.4), torso, [0, 0.22, 0.123]);
  } else if (def.top === 'coat') {
    const sk = mesh(lathe('coatskirt', [[0.166, -0.12], [0.176, -0.3], [0.196, -0.52], [0.194, -0.535]], 36, 0.8), clay(c, 0.92, null, 'coat'), torso);
    sk.material = once(_m, 'coatD' + c, () => { const mm = clay(c, 0.92).clone(); mm.side = THREE.DoubleSide; return mm; });
    const sc = clay(def.scarf ?? 0x7a2730, 0.95);
    mesh(once(_g, 'scarf', () => { const g = new THREE.TorusGeometry(0.07, 0.032, 12, 28); g.rotateX(Math.PI / 2); return g; }), sc, torso, [0, 0.49, 0.006]);
    mesh(capsule(0.03, 0.16), sc, torso, [0.05, 0.36, 0.12], [0.15, 0, 0.08], [1, 1, 0.5]);
    mesh(once(_g, 'cbtn', () => new THREE.CylinderGeometry(0.011, 0.011, 0.006, 12).rotateX(Math.PI / 2)), gloss(0x2a221c), torso, [0, 0.16, 0.124]);
    mesh(once(_g, 'cbtn', () => new THREE.CylinderGeometry(0.011, 0.011, 0.006, 12).rotateX(Math.PI / 2)), gloss(0x2a221c), torso, [0, 0.04, 0.125]);
  } else if (def.top === 'hoodie') {
    // lowered hood resting on the back of the neck, drawstrings, kangaroo pocket
    mesh(sphere(0.11, 28, 18), body, torso, [0, 0.47, -0.08], [0.35, 0, 0], [1.3, 0.62, 0.78]);
    mesh(once(_g, 'hoodrim', () => { const g = new THREE.TorusGeometry(0.07, 0.022, 10, 28); g.rotateX(Math.PI / 2); return g; }), body, torso, [0, 0.49, -0.004]);
    [-1, 1].forEach((sd) => {
      mesh(capsule(0.0055, 0.1), clay(0xfaf7f2, 0.6), torso, [sd * 0.026, 0.4, 0.118], [0.12, 0, 0]);
      mesh(sphere(0.009, 10, 8), clay(0xfaf7f2, 0.6), torso, [sd * 0.026, 0.33, 0.123]);
    });
    mesh(once(_g, 'kpocket', () => { const g = new THREE.CapsuleGeometry(0.045, 0.1, 6, 12); g.rotateZ(Math.PI / 2); g.scale(1, 1, 0.3); return g; }), body, torso, [0, 0.085, 0.114]);
    mesh(once(_g, 'hhem2', () => { const g = new THREE.TorusGeometry(0.152, 0.016, 8, 40); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.76); return g; }), body, torso, [0, -0.04, 0]);
  } else if (def.top === 'flannel') {
    mesh(sphere(0.1, 24, 16), clay(0xf6f3ee, 0.8), torso, [0, 0.33, 0.07], null, [0.42, 1.45, 0.6]);
    [-1, 1].forEach((s) => mesh(once(_g, 'fcol', () => { const g = new THREE.ConeGeometry(0.05, 0.08, 3); g.rotateX(-Math.PI / 2); return g; }), body, torso, [s * 0.045, 0.462, 0.07], [0.6, 0, s * 0.9]));
  } else {
    mesh(once(_g, 'rib', () => { const g = new THREE.TorusGeometry(0.058, 0.012, 8, 28); g.rotateX(Math.PI / 2); return g; }), def.top === 'raglan' ? clay(def.sleeve, 0.8) : body, torso, [0, 0.49, 0]);
  }
  if (def.top === 'sweat' || def.top === 'cable') mesh(once(_g, 'hem', () => { const g = new THREE.TorusGeometry(0.162, 0.016, 8, 40); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.74); return g; }), body, torso, [0, -0.12, 0]);
  if (def.lanyard) {
    const cord = clay(def.lanyard, 0.7);
    [-1, 1].forEach((s) => mesh(capsule(0.006, 0.17), cord, torso, [s * 0.045, 0.38, 0.105], [0.2, 0, s * -0.32]));
    mesh(once(_g, 'card', () => new THREE.BoxGeometry(0.07, 0.09, 0.006)), clay(0xf7f1e4, 0.5), torso, [0, 0.26, 0.128], [-0.08, 0, 0]);
    mesh(once(_g, 'cardband', () => new THREE.BoxGeometry(0.07, 0.022, 0.007)), clay(def.lanyard, 0.6), torso, [0, 0.288, 0.129], [-0.08, 0, 0]);
  }
  return { sleeve, sleeveFore: sleeveFore || sleeve, track: def.top === 'track' };
}

function buildArm(torso, side, mats, kind) {
  const shoulder = pivot(torso, [side * SH[0], SH[1], 0]);
  mesh(capsule(0.05, 0.16), mats.sleeve, shoulder, [0, -0.1, 0]);
  if (mats.track) mesh(capsule(0.0055, 0.15), clay(0xf2f0ec, 0.5), shoulder, [side * 0.049, -0.1, 0]);
  const elbow = pivot(shoulder, [0, -0.215, 0]);
  mesh(capsule(0.045, 0.14), mats.sleeveFore, elbow, [0, -0.085, 0]);
  if (mats.track) mesh(capsule(0.005, 0.13), clay(0xf2f0ec, 0.5), elbow, [side * 0.044, -0.085, 0]);
  const hand = pivot(elbow, [0, -0.195, 0]);
  const palm = mesh(sphere(0.046, 20, 14), skinMat(), hand, [0, 0, 0.004], null, [0.85, 1.05, 0.8]);
  if (kind === 'thumb') mesh(capsule(0.014, 0.03), skinMat(), hand, [side * -0.012, 0.045, 0.02], [0, 0, side * 0.2]);
  return { shoulder, elbow, hand, palm };
}

function buildLeg(hips, side, def) {
  const hip = pivot(hips, [side * 0.078, 0, 0]);
  const pm = def.denim ? clay(0xffffff, 0.9, denim(def.pants), 'den') : clay(def.pants, 0.85);
  if (def.skirt) mesh(once(_g, 'ankle', () => new THREE.CylinderGeometry(0.036, 0.04, 0.1, 14)), skinMat(), hip, [0, -0.64, 0.01]);
  else mesh(lathe('pant', PANT, 28, 0.92), pm, hip);
  if (def.cargo && !def.skirt) mesh(once(_g, 'pocket', () => new THREE.BoxGeometry(0.02, 0.1, 0.085)), pm, hip, [side * 0.1, -0.33, 0]);
  const shoe = pivot(hip, [0, -0.69, 0.035]);
  mesh(once(_g, 'shoeUp', () => { const g = new THREE.CapsuleGeometry(0.056, 0.1, 6, 16); g.rotateX(Math.PI / 2); g.scale(1, 0.7, 1); return g; }), clay(0xf6f3ee, 0.6), shoe, [0, 0.008, 0]);
  mesh(once(_g, 'sole', () => new THREE.BoxGeometry(0.12, 0.026, 0.23)), clay(0xe7e2da, 0.7), shoe, [0, -0.034, 0.002]);
  if (def.shoeAccent) mesh(once(_g, 'heel', () => new THREE.BoxGeometry(0.121, 0.03, 0.05)), clay(def.shoeAccent, 0.6), shoe, [0, -0.005, -0.09]);
  return { hip };
}

const _loader = new THREE.TextureLoader();
/** Fit an image texture to the 74:156 screen like CSS object-fit: cover. */
function coverFit(tex) {
  const img = tex.image; if (!img || !img.width) return;
  const screen = 0.074 / 0.156, ar = img.width / img.height;
  tex.repeat.set(1, 1); tex.offset.set(0, 0);
  if (ar > screen) { tex.repeat.x = screen / ar; tex.offset.x = (1 - tex.repeat.x) / 2; }
  else { tex.repeat.y = ar / screen; tex.offset.y = 1 - tex.repeat.y; }   // keep the top of a screenshot
}
function imageTex(src) {
  const tex = typeof src === 'string' ? _loader.load(src, (t) => { coverFit(t); t.needsUpdate = true; }) : new THREE.CanvasTexture(src);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  if (typeof src !== 'string') coverFit(tex);
  return tex;
}
function buildPhone(def) {
  const g = new THREE.Group();
  mesh(once(_g, 'phone', () => new THREE.BoxGeometry(0.084, 0.168, 0.012)), gloss(0x1b1b1f), g);
  const map = def.screenImage ? imageTex(def.screenImage) : screenTex(def.icon || 'check', def.screen || ['#eef0f6', '#dfe3ee']);
  const scr = new THREE.Mesh(once(_g, 'screen', () => new THREE.PlaneGeometry(0.074, 0.156)), new THREE.MeshBasicMaterial({ map, toneMapped: false }));
  scr.position.z = 0.0065; scr.name = 'screen'; g.add(scr);
  return g;
}

/**
 * @param {object} def   one of MEMBERS (or your own definition with the same fields)
 * @param {object} [o]
 * @param {string} [o.name]    floating name plate
 * @param {number} [o.scale]
 * @param {number} [o.seed]    animation phase offset
 * @param {boolean} [o.phone]  show the phone (default true)
 * @param {boolean} [o.contactShadow] default true
 */
export function createParticipant(def, o = {}) {
  const root = new THREE.Group(); root.name = 'Participant-' + (def.id || '');
  const body = pivot(root), hips = pivot(body, [0, HIP_Y, 0]), torso = pivot(hips);
  const tops = buildTop(torso, def);
  if (def.belt) mesh(once(_g, 'belt', () => { const g = new THREE.TorusGeometry(0.157, 0.014, 8, 40); g.rotateX(Math.PI / 2); g.scale(1, 1, 0.76); return g; }), gloss(0x1a1918), hips, [0, 0.03, 0]);

  let skirtMesh = null;
  if (def.skirt) {
    const skMat = once(_m, 'skirt' + def.skirt, () => { const mm = clay(def.skirt, 0.9).clone(); mm.side = THREE.DoubleSide; return mm; });
    skirtMesh = mesh(lathe('longskirt3', [[0.14, -0.01], [0.155, -0.08], [0.168, -0.16], [0.19, -0.3], [0.225, -0.5], [0.252, -0.63], [0.256, -0.655]], 44, 0.88), skMat, hips);
  }
  const neck = pivot(torso, [0, 0.49, 0]);
  mesh(once(_g, 'neck', () => new THREE.CylinderGeometry(0.04, 0.045, 0.06, 16)), skinMat(), neck, [0, 0.02, 0]);
  const head = pivot(neck, [0, 0.03 + HR * 0.93, 0]);
  mesh(sphere(HR, 48, 32), skinMat(), head, null, null, HEAD_S);
  const eyes = buildFace(head, def);
  buildHair(head, def);

  const free = def.free || 'pocket';
  const hasPhone = o.phone !== false && def.phone !== false;
  const freeR = hasPhone ? 'hold' : (def.freeR || 'relaxed');
  const armR = buildArm(torso, -1, tops, freeR);
  const armL = buildArm(torso, 1, tops, free);
  const legL = buildLeg(hips, 1, def), legR = buildLeg(hips, -1, def);

  // phone sits in the right hand, screen toward the viewer
  const phone = buildPhone(def);
  armR.hand.add(phone);
  phone.scale.setScalar(1.55);
  phone.position.set(0.012, -0.02, 0.125);
  phone.rotation.set(1.62, 0.12, -0.1);
  if (!hasPhone) phone.visible = false;

  if (o.contactShadow !== false) {
    const blob = new THREE.Mesh(once(_g, 'blob', () => new THREE.CircleGeometry(0.32, 32).rotateX(-Math.PI / 2)), contactMat());
    blob.position.y = 0.003; root.add(blob);
  }
  let plate = null;
  if (o.name) { plate = makeNamePlate(o.name); plate.position.set(0, 1.92, 0); root.add(plate); }
  if (o.scale) root.scale.setScalar(o.scale);

  /* poses (radians). R = phone hand, L = free hand */
  const LEFT = {
    pocket: { aLx: 0.12, aLz: 0.02, eL: -0.38 },
    thumb: { aLx: -0.55, aLz: -0.12, eL: -1.75 },
    hold: { aLx: -0.58, aLz: -0.36, eL: -1.32 },
    relaxed: { aLx: 0.04, aLz: 0.08, eL: -0.16 },
  };
  const FREE_L = LEFT[free] || LEFT.relaxed;
  const RIGHT = {
    hold: { aRx: -0.62, aRz: 0.32, eR: -1.38 },
    pocket: { aRx: 0.12, aRz: -0.02, eR: -0.38 },
    relaxed: { aRx: 0.04, aRz: -0.08, eR: -0.16 },
  };
  const HOLD_R = RIGHT[freeR] || RIGHT.relaxed;
  const lookTarget = new THREE.Vector3(), tmp = new THREE.Vector3();
  let hasLook = false, appearT = 1, appearDelay = 0;

  const phase = (o.seed ?? Math.random() * 1000) % 1000;
  let state = 'idle', t = phase, blinkAt = t + 2 + Math.random() * 3;
  const zero = { aLx: 0, aLz: 0.06, eL: -0.1, aRx: 0, aRz: -0.06, eR: -0.1, legL: 0, legR: 0, hy: 0, hx: 0, hz: 0, bob: 0, sway: 0, tx: 0, wave: 0 };
  const cur = { ...zero, ...HOLD_R, ...FREE_L }, tgt = { ...cur };

  function pose(dt) {
    const s = Math.sin, k = t;
    Object.assign(tgt, zero, HOLD_R, FREE_L);
    tgt.sway = 0.02 * s(k * 0.6);
    tgt.hz = 0.06 * s(k * 0.45) - tgt.sway; tgt.hy = 0.18 * s(k * 0.27); tgt.hx = -0.04 + 0.03 * s(k * 0.5);
    if (state === 'walk') {
      const f = k * 5.6, w = s(f);
      tgt.legL = 0.4 * w; tgt.legR = -0.4 * w; tgt.bob = 0.02 * Math.abs(Math.cos(f)); tgt.sway = 0.025 * w; tgt.tx = 0.04;
      if (free === 'pocket') tgt.aLx = 0.12 - 0.05 * w; else { tgt.aLx = -0.3 * w; tgt.aLz = 0.06; tgt.eL = -0.3; }
      if (!hasPhone) { if (freeR === 'pocket') tgt.aRx = 0.12 + 0.05 * w; else { tgt.aRx = 0.3 * w; tgt.aRz = -0.06; tgt.eR = -0.3; } }
      tgt.hy = 0.08 * s(k * 0.5);
    } else if (state === 'wave') {
      tgt.aLx = -0.15; tgt.aLz = 2.75; tgt.eL = -0.35; tgt.wave = s(k * 9) * 0.4;
      tgt.hz = 0.12; tgt.hy = 0.1;
    } else if (state === 'look') {
      // hands clasped behind the back, head turned to the work
      tgt.aLx = 0.32; tgt.aRx = 0.32; tgt.aLz = -0.08; tgt.aRz = 0.08; tgt.eL = -0.55; tgt.eR = -0.55; tgt.tx = -0.03;
      if (hasLook) { root.updateMatrixWorld(); tmp.copy(lookTarget); root.worldToLocal(tmp); tgt.hy = THREE.MathUtils.clamp(Math.atan2(tmp.x, tmp.z), -0.9, 0.9); tgt.hx = -0.1; }
    } else if (state === 'clap') {
      const c = Math.abs(s(k * 8.5));
      tgt.aLx = -0.9; tgt.aRx = -0.9; tgt.aLz = -0.22 - 0.15 * c; tgt.aRz = 0.22 + 0.15 * c; tgt.eL = -1.0; tgt.eR = -1.0; tgt.bob = 0.008 * c; tgt.hx = -0.02;
    }
    const a = 1 - Math.exp(-dt * (state === 'idle' ? 7 : 13));
    for (const key in cur) cur[key] += (tgt[key] - cur[key]) * a;
    phone.visible = hasPhone && state !== 'clap' && state !== 'look';
    const handsOut = state === 'wave' || state === 'clap' || state === 'look';
    if (free === 'pocket') armL.palm.visible = handsOut;
    if (freeR === 'pocket') armR.palm.visible = state === 'clap' || state === 'look';
  }
  function apply() {
    if (appearT < 1) {
      const e = Math.max(0, appearT), k2 = 1 + 2.2 * Math.pow(e - 1, 3) + 1.2 * Math.pow(e - 1, 2); // ease-out-back
      const sc = (o.scale || 1) * Math.max(0.001, k2);
      root.scale.setScalar(sc);
    }
    torso.scale.set(1 + 0.006 * Math.sin(t * 1.8), 1 + 0.008 * Math.sin(t * 1.8), 1);
    body.position.y = cur.bob; hips.rotation.z = cur.sway; torso.rotation.set(cur.tx, 0, -cur.sway * 0.6);
    head.rotation.set(cur.hx, cur.hy, cur.hz);
    armL.shoulder.rotation.set(cur.aLx, 0, cur.aLz); armR.shoulder.rotation.set(cur.aRx, 0, cur.aRz);
    armL.elbow.rotation.set(cur.eL, 0, cur.wave); armR.elbow.rotation.x = cur.eR;
    legL.hip.rotation.x = cur.legL; legR.hip.rotation.x = cur.legR;
    if (skirtMesh) skirtMesh.rotation.x = (cur.legL - cur.legR) * 0.07;
    // blink
    const closing = t > blinkAt && t < blinkAt + 0.13;
    eyes.forEach((e) => { e.scale.y = closing ? 0.15 : 1.18; });
    if (t > blinkAt + 0.13) blinkAt = t + 2.2 + Math.random() * 3.5;
  }
  pose(0); apply();

  return {
    object: root, plate, phone,
    get state() { return state; },
    /** 'idle' | 'walk' | 'wave' | 'clap' | 'look' */
    setState(next) { state = next; },
    /**
     * Change what the phone shows.
     * setScreen('assets/morrow.png')          image URL (screenshot or app icon; fills the screen, top kept)
     * setScreen(canvasOrImageElement)         anything three.js can use as a texture source
     * setScreen({ icon: 'heart', screen: ['#fbeaf2', '#f6d6e6'] })   one of the built-in icons
     */
    setScreen(src) {
      const scr = phone.getObjectByName('screen');
      const old = scr.material.map;
      scr.material.map = (src && typeof src === 'object' && 'icon' in src) ? screenTex(src.icon, src.screen || ['#eef0f6', '#dfe3ee']) : imageTex(src);
      scr.material.needsUpdate = true;
      if (old && ![..._t.values()].includes(old)) old.dispose();
    },
    /** Turn the head toward a world position while in 'look' (null to clear). */
    lookAt(v) { if (v) { lookTarget.copy(v); hasLook = true; } else hasLook = false; },
    /** Pop in on entry: scale up with a small overshoot after an optional delay (seconds). */
    appear(delay = 0) { appearDelay = delay; appearT = 0; root.scale.setScalar(0.001); },
    setName(text) {
      if (plate) { root.remove(plate); plate.material.map.dispose(); plate.material.dispose(); }
      plate = text ? makeNamePlate(text) : null;
      if (plate) { plate.position.set(0, 1.92, 0); root.add(plate); }
    },
    update(dt) { const d = Math.min(dt, 0.1); t += d; if (appearT < 1) { if (appearDelay > 0) appearDelay -= d; else appearT = Math.min(1, appearT + d / 0.55); } pose(d); apply(); if (appearT >= 1 && root.scale.x !== (o.scale || 1)) root.scale.setScalar(o.scale || 1); },
  };
}

/* ---------- shared bits ---------- */
function makeNamePlate(text) {
  const c = document.createElement('canvas'), ctx = c.getContext('2d');
  const font = "700 44px 'Gothic A1', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif";
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 96, h = 92; c.width = w; c.height = h; ctx.font = font;
  ctx.beginPath(); ctx.roundRect(4, 4, w - 8, h - 8, h / 2 - 4);
  ctx.fillStyle = 'rgba(10,9,8,0.78)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(226,200,148,0.7)'; ctx.stroke();
  ctx.save(); ctx.translate(40, h / 2); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#E2C894'; ctx.fillRect(-6, -6, 12, 12); ctx.restore();
  ctx.fillStyle = '#FFF4DC'; ctx.textBaseline = 'middle'; ctx.fillText(text, 62, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(0.13 * (w / h), 0.13, 1); sp.renderOrder = 10; return sp;
}
let _contact;
function contactMat() {
  if (_contact) return _contact;
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.5)'); grd.addColorStop(0.55, 'rgba(0,0,0,0.2)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return (_contact = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
}

/* ---------- visitors: random people drawn in the same style ---------- */
const V_HAIR = ['bowl', 'shag', 'bun', 'bob', 'straight', 'wavy', 'wavyDark', 'short', 'pony'];
const V_HAIRCOL = [0x1d1a1a, 0x2b211c, 0x4a3226, 0x6f4530, 0x8a6a4a, 0x2b2231, 0x3a2a22];
const V_TOP = ['sweat', 'cable', 'stripe', 'raglan', 'tee', 'flannel', 'coat', 'coat', 'track'];
const V_PLAIN = [0xebe5da, 0xdfe3ea, 0xbfc8b4, 0xe9d8c4, 0x2f3445, 0x7a2f35, 0xd2cbe6, 0xc9b49a];
const V_STRIPE = [[0x2b3352, 0xf0e6cf], [0x7a2f35, 0xf2e8d6], [0x3f5a48, 0xefe6d2]];
const V_COAT = [0xa9855a, 0x3a3634, 0x283149, 0xcfc4b2];
const V_SCARF = [0x7a2730, 0xe9dcc4, 0x2f4a3c, 0xc9a96e];
const V_PANTS = [[0x3b3633], [0x2c3140, true], [0xa8b7c9, true], [0xe8e0cf], [0x5a4c42], [0x2b2927]];

/** A random visitor definition (same fields as MEMBERS). Same seed, same person. */
export function randomVisitorDef(seed = Math.floor(Math.random() * 2147483646) + 1) {
  let s = Math.floor(seed) % 2147483647 || 1;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const top = pick(V_TOP), [pants, isDenim] = pick(V_PANTS);
  const def = {
    id: 'v' + seed, hair: pick(V_HAIR), hairColor: pick(V_HAIRCOL), top, pants, denim: !!isDenim,
    topColor: pick(V_PLAIN), cargo: r() < 0.3, belt: r() < 0.3, glasses: r() < 0.22,
    free: pick(['pocket', 'relaxed', 'relaxed']), freeR: pick(['pocket', 'relaxed', 'relaxed']),
    phone: false, lanyard: 0xc9a96e, tie: pick([0x7a2730, 0xc9a96e, 0x2f3445]),
  };
  if (top === 'stripe') { const [a, b] = pick(V_STRIPE); def.topColor = a; def.stripe = b; }
  if (top === 'raglan') { def.topColor = 0xf2efe9; def.sleeve = pick([0x2d3349, 0x7a2f35, 0x3a3634]); }
  if (top === 'tee') def.topColor = pick([0xf4f1ec, 0x2b2927, 0xd2cbe6]);
  if (top === 'coat') { def.topColor = pick(V_COAT); def.scarf = pick(V_SCARF); def.lanyard = 0; }
  if (top === 'track') def.topColor = pick([0x1f1e20, 0x283149, 0x5a1f28]);
  if (def.lanyard === 0) delete def.lanyard;
  if (r() < 0.2) def.shoeAccent = pick([0x7a2730, 0x2f3445]);
  return def;
}

/** One random visitor figure (no phone, gold visitor lanyard). */
export function createRandomVisitor(o = {}) {
  const seed = o.seed ?? Math.floor(Math.random() * 2147483646) + 1;
  return createParticipant(randomVisitorDef(seed), { ...o, seed, phone: false });
}

/**
 * A crowd for one entry into the hall: n visitors with no two alike in hair + top.
 * Call it again on every entry for a fresh, random set.
 */
export function randomCrowd(n = 6, o = {}) {
  const seen = new Set(), out = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 20) {
    const seed = Math.floor(Math.random() * 2147483646) + 1, def = randomVisitorDef(seed);
    const k = def.hair + '/' + def.top;
    if (seen.has(k)) continue; seen.add(k);
    out.push(createParticipant(def, { ...o, seed, phone: false, name: o.name ? o.name(out.length) : undefined }));
  }
  return out;
}
