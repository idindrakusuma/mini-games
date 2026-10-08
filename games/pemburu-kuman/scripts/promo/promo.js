/* Pemburu Kuman · video promo vertikal 1080×1920.
   render(t) menggambar satu frame pada detik t. Harus dipanggil berurutan (partikel & SFX disimpan per frame).
   Event suara dikumpulkan di window.SFX untuk disintesis oleh scripts/generate-promo.mjs. */
const W = 1080, H = 1920, DURATION = 18.5;
const cv = document.getElementById('v'), ctx = cv.getContext('2d');
const FONT = '"Baloo 2", "Noto Color Emoji", sans-serif';
const INK = '#1B2A6B', MUTED = '#3F5A92', CARD = '#FFFDF7', SUN = '#FFD23F', SOAP = '#FF8FB8', WATER = '#47C9E5';

/* ---------- utils ---------- */
let seed = 11;
const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const R = (a, b) => a + rand() * (b - a);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeIn = x => x * x * x;
const easeInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c1 = 1.9, c3 = c1 + 1; return x <= 0 ? 0 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

const SFX = []; window.SFX = SFX;
let T = 0, PT = -1;
const cross = te => PT < te && T >= te;
const sfx = (type, t = T) => SFX.push({ type, t });

function text(str, x, y, size, o = {}) {
  const { color = INK, weight = 800, align = 'center', alpha = 1, scale = 1, shadow = true, rot = 0 } = o;
  if (alpha <= 0 || scale <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (shadow) { ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillText(str, 0, size * .07); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0); ctx.restore();
}
function measure(str, size, weight = 800) { ctx.save(); ctx.font = `${weight} ${size}px ${FONT}`; const w = ctx.measureText(str).width; ctx.restore(); return w; }
function card(x, y, w, h, r, fill, off = 10) {
  ctx.fillStyle = 'rgba(27,42,107,.22)'; rr(x, y + off, w, h, r); ctx.fill();
  ctx.fillStyle = fill; rr(x, y, w, h, r); ctx.fill();
}
function star(c, x, y, r, rot) {
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * .45 : r; c.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  c.closePath(); c.fillStyle = SUN; c.fill(); c.strokeStyle = '#E09B00'; c.lineWidth = r * .15; c.stroke(); c.restore();
}

/* ---------- particles ---------- */
const P = [], SP = []; // P: koordinat video, SP: koordinat layar HP
function bubble(arr, x, y, burst) {
  arr.push({ type: 'bubble', x, y, vx: burst ? R(-260, 260) : R(-50, 50), vy: burst ? R(-380, -80) : R(-170, -60), g: 0,
    r: R(10, burst ? 30 : 22), life: 0, max: R(.7, 1.2) });
}
function burst(arr, x, y) {
  for (let i = 0; i < 12; i++) bubble(arr, x, y, true);
  for (let i = 0; i < 8; i++) arr.push({ type: 'star', x, y, vx: R(-380, 380), vy: R(-620, -200), g: 1300, r: R(14, 24), life: 0, max: R(.8, 1.1), rot: R(0, 6), vr: R(-8, 8) });
}
function stepDraw(arr, dt) {
  for (const p of arr) {
    p.life += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.vr) p.rot += p.vr * dt;
    const a = 1 - p.life / p.max; if (a <= 0) continue;
    ctx.save(); ctx.globalAlpha = Math.min(1, a * 1.5);
    if (p.type === 'bubble') {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x - p.r * .35, p.y - p.r * .35, p.r * .22, 0, 7); ctx.fillStyle = '#fff'; ctx.fill();
    } else star(ctx, p.x, p.y, p.r, p.rot);
    ctx.restore();
  }
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i].life >= arr[i].max) arr.splice(i, 1);
}

/* ---------- background ---------- */
const BUBS = [...Array(16)].map(() => ({ x: R(0, W), y: R(0, H + 300), r: R(14, 60), v: R(40, 120), a: R(.25, .55) }));
function bg(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#CFF5FC'); g.addColorStop(1, '#A6E4F4');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const b of BUBS) {
    const y = (((b.y - t * b.v) % (H + 300)) + H + 300) % (H + 300) - 150;
    ctx.fillStyle = `rgba(255,255,255,${b.a})`; ctx.beginPath(); ctx.arc(b.x + Math.sin(t + b.r) * 20, y, b.r, 0, 7); ctx.fill();
  }
}

/* ---------- cartoon tangan & mulut (sama dengan mode tanpa kamera di game) ---------- */
function cartoon(mode) {
  const el = document.createElement('canvas'); el.width = 480; el.height = 360; const c = el.getContext('2d');
  c.fillStyle = '#BDEBF5'; c.fillRect(0, 0, 480, 360);
  c.strokeStyle = '#E6F7FB'; c.lineWidth = 3;
  for (let x = 0; x < 480; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 360); c.stroke(); }
  for (let y = 0; y < 360; y += 60) { c.beginPath(); c.moveTo(0, y); c.lineTo(480, y); c.stroke(); }
  c.fillStyle = '#E8B48A';
  if (mode === 'hands') {
    const Q = (x, y, w, h, r) => { c.beginPath(); c.roundRect(x, y, w, h, r); c.fill(); };
    Q(150, 70, 40, 140, 20); Q(200, 48, 42, 160, 21); Q(252, 56, 40, 150, 20); Q(300, 86, 36, 120, 18);
    c.save(); c.translate(150, 215); c.rotate(-.75); Q(-20, -90, 40, 110, 20); c.restore();
    c.beginPath(); c.ellipse(244, 230, 100, 92, 0, 0, 7); c.fill();
    Q(196, 280, 96, 80, 10);
  } else {
    c.beginPath(); c.ellipse(240, 190, 190, 170, 0, 0, 7); c.fill();
    c.fillStyle = '#D9607A'; c.beginPath(); c.ellipse(240, 230, 118, 72, 0, 0, 7); c.fill();
    c.fillStyle = '#5A1424'; c.beginPath(); c.ellipse(240, 230, 100, 56, 0, 0, 7); c.fill();
    c.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) { c.beginPath(); c.roundRect(170 + i * 24, 178, 22, 30, 6); c.fill(); }
    for (let i = 0; i < 5; i++) { c.beginPath(); c.roundRect(182 + i * 24, 256, 22, 26, 6); c.fill(); }
    c.fillStyle = INK; c.beginPath(); c.arc(180, 110, 14, 0, 7); c.fill(); c.beginPath(); c.arc(300, 110, 14, 0, 7); c.fill();
  }
  return el;
}
const HAND = cartoon('hands'), MOUTH = cartoon('teeth');

/* ---------- HP ---------- */
const PW = 700, PH = 1180, PX = (W - PW) / 2, SW = 660, SH = 1140;
const S = Math.max(SW / 480, SH / 360), OX = (SW - 480 * S) / 2;
const map = (x, y) => [OX + x * S, y * S];
const PHONE_Y = 560;
function phoneY(t) {
  if (t < 3.2) return H + 60;
  if (t < 15) return H + 60 + (PHONE_Y - H - 60) * back(prog(t, 3.2, 3.85));
  return PHONE_Y + (H + 120 - PHONE_Y) * easeIn(prog(t, 15, 15.45));
}

const HAND_GERMS = [
  { p: [215, 112], c: 0, r: 76, in: 4.1, pop: 6.9, say: 'Aku suka tangan kotor!', sayFrom: 4.3, sayTo: 5.9, ouch: 'Aaah, busa!' },
  { p: [272, 150], c: 1, r: 70, in: 4.4, pop: 7.7, ouch: 'Kabuuur!' },
  { p: [236, 252], c: 4, r: 74, in: 4.7, pop: 8.5, ouch: 'Licin banget!' },
  { p: [170, 168], c: 2, r: 64, in: 5.0, pop: 9.2, ouch: 'Ampun sabun!' },
];
const TEETH_GERMS = [
  { p: [198, 190], c: 3, r: 58, in: 10.0, pop: 11.0, say: 'Nyam, sisa permen!', sayFrom: 10.2, sayTo: 10.9, ouch: 'Aaah, odol!' },
  { p: [272, 192], c: 1, r: 56, in: 10.15, pop: 11.6, ouch: 'Mint, pedes!' },
  { p: [234, 268], c: 4, r: 58, in: 10.3, pop: 12.2, ouch: 'Kabuuur!' },
];
const SCRUB = .75;

function speech(str, x, y, fs, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.font = `700 ${fs}px ${FONT}`;
  const w = ctx.measureText(str).width + fs * 1.1, h = fs * 1.75;
  const bx = clamp(x - w / 2, 14, SW - w - 14), by = Math.max(150, y - h);
  ctx.fillStyle = CARD; ctx.strokeStyle = INK; ctx.lineWidth = 4;
  rr(bx, by, w, h, h / 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, bx + w / 2, by + h / 2 + 2);
  ctx.restore();
}
function drawGerms(list, t) {
  for (const g of list) {
    if (t < g.in) continue;
    const [x, y] = map(...g.p), ph = g.c * 1.7;
    if (t < g.pop) {
      const scrub = prog(t, g.pop - SCRUB, g.pop);
      drawGerm(ctx, x, y, g.r, COLORS[g.c], t, ph, { scale: back(prog(t, g.in, g.in + .4)) * (1 - scrub * .4), hurt: scrub > 0 });
      if (g.say && t > g.sayFrom && t < g.sayTo) speech(g.say, x, y - g.r * 1.55, 38, Math.min(prog(t, g.sayFrom, g.sayFrom + .15), prog(t, g.sayTo, g.sayTo - .2)));
    } else {
      const k = prog(t, g.pop, g.pop + .35);
      if (k < 1) drawGerm(ctx, x, y, g.r, COLORS[g.c], t, ph, { alpha: 1 - k, hurt: true, scale: 1 + k * .6 });
      if (t < g.pop + .9) speech(g.ouch, x, y - g.r * 1.55, 38, prog(t, g.pop + .9, g.pop + .7));
    }
  }
}
// posisi alat (sabun/sikat) yang menggosok kuman berurutan
function toolPos(list, t, enter, amp) {
  for (let i = 0; i < list.length; i++) {
    const g = list[i], start = i ? list[i - 1].pop + .05 : enter;
    if (t <= g.pop + .05 || i === list.length - 1) {
      const [x, y] = map(...g.p);
      const from = i ? map(...list[i - 1].p) : [SW + 150, SH - 200];
      const k = easeInOut(prog(t, start, start + .2));
      return [from[0] + (x - from[0]) * k + amp[0](t) * k, from[1] + (y - from[1]) * k + amp[1](t) * k, t > g.pop - SCRUB && t < g.pop];
    }
  }
}
function drawBrush(x, y, rot) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = WATER; ctx.strokeStyle = INK; ctx.lineWidth = 6;
  rr(40, -22, 380, 44, 22); ctx.fill(); ctx.stroke();
  rr(-70, -26, 130, 52, 20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#fff'; rr(-62, -72, 114, 50, 10); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#9ADCEB'; ctx.lineWidth = 4;
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(-48 + i * 18, -66); ctx.lineTo(-48 + i * 18, -28); ctx.stroke(); }
  ctx.restore();
}
let lastSquish = -1;
function tools(t) {
  // sabun
  if (t > 6 && t < 9.7) {
    const [x, y, scrubbing] = toolPos(HAND_GERMS, t, 6.0, [t => Math.cos(t * 17) * 55, t => Math.sin(t * 17) * 38]);
    const ex = easeIn(prog(t, 9.25, 9.65));
    const sx = x + ex * 500, sy = y + ex * 600;
    text('🧼', sx + 30, sy + 40, 150, { shadow: false, rot: Math.sin(t * 17) * .25, weight: 400 });
    if (scrubbing) { for (let i = 0; i < 2; i++) bubble(SP, sx + R(-60, 60), sy + R(-40, 40)); if (t - lastSquish > .15) { lastSquish = t; sfx('squish'); } }
  }
  // sikat gigi
  if (t > 10.3 && t < 12.7) {
    const [x, y, scrubbing] = toolPos(TEETH_GERMS, t, 10.3, [t => Math.sin(t * 22) * 48, t => 0]);
    const ex = easeIn(prog(t, 12.25, 12.6));
    drawBrush(x + 10 + ex * 700, y + 85 + ex * 200, -.12);
    if (scrubbing) { for (let i = 0; i < 2; i++) bubble(SP, x + R(-60, 60), y + R(-10, 40)); if (t - lastSquish > .15) { lastSquish = t; sfx('squish'); } }
  }
}
function events(t) {
  for (const [list, dx] of [[HAND_GERMS, 0], [TEETH_GERMS, 0]]) for (const g of list) {
    if (cross(g.in)) sfx('blip');
    if (cross(g.pop)) { const [x, y] = map(...g.p); burst(SP, x + dx, y); sfx('pop'); }
  }
}
function hud(t) {
  ctx.fillStyle = CARD; ctx.beginPath(); ctx.arc(76, 104, 44, 0, 7); ctx.fill();
  text('🏠', 76, 106, 44, { shadow: false, weight: 400 });
  const teeth = t >= 9.8, list = teeth ? TEETH_GERMS : HAND_GERMS;
  const popped = list.filter(g => t >= g.pop), n = list.length - popped.length;
  const lastChange = popped.length ? popped[popped.length - 1].pop : (teeth ? 9.8 : 0);
  const label = n ? `🦠 ${n} kuman` : '✨ Bersih!';
  const s = 1 + .25 * (1 - easeOut(prog(t, lastChange, lastChange + .35)));
  const w = measure(label, 44) + 60;
  ctx.save(); ctx.translate(SW / 2, 104); ctx.scale(s, s); card(-w / 2, -36, w, 72, 36, CARD, 6); ctx.restore();
  text(label, SW / 2, 106, 44, { shadow: false, scale: s });
}
function tip(t) {
  let s = '';
  if (t < 4.1) s = 'Tunjukkan tanganmu 🖐️';
  else if (t < 6) s = 'Hihi, kumannya ngumpet di sini!';
  else if (t < 9.6) s = 'Gosok-gosok tanganmu! 🧼';
  else if (t < 12.6) s = 'Sikat gigimu, ayo! 🪥';
  if (!s) return;
  card(30, SH - 150, SW - 60, 100, 34, CARD, 7);
  text(s, SW / 2, SH - 98, 40, { shadow: false });
}
function winPanel(t) {
  const a = prog(t, 12.6, 12.85);
  ctx.fillStyle = `rgba(14,45,77,${.55 * a})`; ctx.fillRect(0, 0, SW, SH);
  const s = back(prog(t, 12.75, 13.2)); if (s <= 0) return;
  ctx.save(); ctx.translate(SW / 2, SH / 2); ctx.scale(s, s);
  card(-270, -250, 540, 500, 48, CARD, 12);
  text('🌟', 0, -140, 120, { shadow: false, weight: 400, rot: Math.sin(t * 4) * .12 });
  text('Hore, gigimu', 0, -10, 62, { shadow: false });
  text('kinclong!', 0, 60, 62, { shadow: false });
  card(-170, 120, 340, 84, 30, SUN, 6);
  text('+1 bintang ⭐', 0, 164, 44, { shadow: false });
  ctx.restore();
}
function screen(t, dt) {
  ctx.fillStyle = '#BDEBF5'; ctx.fillRect(0, 0, SW, SH);
  const sl = easeInOut(prog(t, 9.6, 10.0));
  if (sl < 1) { ctx.save(); ctx.translate(-sl * SW, 0); ctx.drawImage(HAND, OX, 0, 480 * S, 360 * S); drawGerms(HAND_GERMS, t); ctx.restore(); }
  if (sl > 0) { ctx.save(); ctx.translate((1 - sl) * SW, 0); ctx.drawImage(MOUTH, OX, 0, 480 * S, 360 * S); drawGerms(TEETH_GERMS, t); ctx.restore(); }
  events(t);
  tools(t);
  stepDraw(SP, dt);
  hud(t); tip(t);
  if (t > 12.6) winPanel(t);
}
function phone(t, dt) {
  const py = phoneY(t);
  if (py >= H) { stepDraw(SP, dt); return; }
  ctx.save();
  ctx.fillStyle = 'rgba(27,42,107,.28)'; rr(PX, py + 18, PW, PH, 86); ctx.fill();
  ctx.fillStyle = INK; rr(PX, py, PW, PH, 86); ctx.fill();
  ctx.translate(PX + 20, py + 20); rr(0, 0, SW, SH, 68); ctx.clip();
  screen(t, dt);
  ctx.restore();
  ctx.fillStyle = INK; rr(W / 2 - 80, py + 30, 160, 36, 18); ctx.fill();
}

/* ---------- judul tiap adegan ---------- */
const HEADLINES = [
  { from: 3.3, to: 6.0, l1: 'Sampai dia lihat', l2: 'SENDIRI! 👀', hl: SUN },
  { from: 6.0, to: 9.6, l1: 'Gosok-gosok…', l2: 'kumannya kabur! 🧼', hl: SOAP },
  { from: 9.6, to: 12.6, l1: 'Sikat gigi', l2: 'jadi seru! 🪥', hl: SUN },
  { from: 12.6, to: 15.0, l1: 'Selesai?', l2: 'Dapat bintang! ⭐', hl: SOAP },
];
function headlines(t) {
  for (const h of HEADLINES) {
    if (t < h.from || t > h.to) continue;
    const out = h.to >= 15 ? prog(t, h.to, h.to - .3) : prog(t, h.to, h.to - .2);
    const a1 = back(prog(t, h.from, h.from + .4)), a2 = back(prog(t, h.from + .12, h.from + .55));
    text(h.l1, W / 2, 250, 84, { scale: a1, alpha: out, color: MUTED });
    const fs = Math.min(112, 112 * 880 / measure(h.l2, 112)), w = measure(h.l2, fs) + 70;
    ctx.save(); ctx.globalAlpha = out; ctx.translate(W / 2, 400); ctx.scale(a2, a2); ctx.rotate(-.02);
    if (a2 > 0) card(-w / 2, -fs * .7, w, fs * 1.4, 40, h.hl, 9);
    ctx.restore();
    text(h.l2, W / 2, 402, fs, { scale: a2, alpha: out, shadow: false, rot: -.02 });
  }
}

/* ---------- adegan 1: hook ---------- */
function scene1(t) {
  if (t > 3.3) return;
  const out = 1 - easeIn(prog(t, 2.95, 3.25));
  ctx.save(); ctx.globalAlpha = out;
  const a1 = easeOut(prog(t, .1, .45));
  text('Bilang ke anak:', W / 2, 520 + (1 - a1) * 40, 66, { color: MUTED, weight: 700, alpha: a1, shadow: false });
  const s2 = back(prog(t, .35, .8));
  if (s2 > 0) {
    ctx.save(); ctx.translate(W / 2, 780); ctx.scale(s2, s2); ctx.rotate(-.03);
    card(-400, -150, 800, 300, 60, CARD, 12);
    ctx.beginPath(); ctx.moveTo(-220, 140); ctx.lineTo(-280, 230); ctx.lineTo(-140, 140); ctx.fill();
    ctx.restore();
    text('“Tanganmu ada', W / 2, 720, 92, { scale: s2, shadow: false, rot: -.03 });
    text('kumannya!”', W / 2, 830, 92, { scale: s2, shadow: false, rot: -.03 });
  }
  text('…tapi dia', W / 2, 1100, 76, { color: MUTED, scale: back(prog(t, 1.35, 1.75)) });
  text('nggak percaya.', W / 2, 1210, 112, { scale: back(prog(t, 1.5, 1.9)) });
  text('🤨', W / 2, 1420, 200, { shadow: false, weight: 400, scale: back(prog(t, 1.9, 2.3)), rot: Math.sin(t * 6) * .15 });
  [[200, 110, 0, 2.2], [540, 95, 1, 2.3], [880, 105, 4, 2.4]].forEach(([x, r, c, d]) => {
    const k = easeOut(prog(t, d, d + .45));
    drawGerm(ctx, x, H + 220 - k * 330, r, COLORS[c], t, c * 2);
  });
  if (t > 2.55) { ctx.save(); ctx.translate(0, 0); text('hihi~', 700, 1580, 56, { scale: back(prog(t, 2.55, 2.8)), rot: .1 }); ctx.restore(); }
  ctx.restore();
}

/* ---------- adegan akhir ---------- */
function sceneEnd(t) {
  if (t < 15.2) return;
  [[440, 560, 180, 0, 0, 15.3], [810, 360, 96, 1, 2, 15.45], [830, 760, 76, 4, 4, 15.6]].forEach(([x, y, r, c, ph, d]) => {
    drawGerm(ctx, x, y + Math.sin(t * 2.4 + ph) * 12, r, COLORS[c], t, ph, { scale: back(prog(t, d, d + .5)) });
  });
  text('Pemburu', W / 2, 1000, 200, { scale: back(prog(t, 15.6, 16.05)) });
  text('Kuman', W / 2, 1180, 200, { scale: back(prog(t, 15.72, 16.17)) });
  const a = easeOut(prog(t, 15.95, 16.3));
  text('Game cuci tangan & sikat gigi', W / 2, 1325 + (1 - a) * 30, 54, { color: MUTED, weight: 700, alpha: a, shadow: false });
  text('untuk anak', W / 2, 1392 + (1 - a) * 30, 54, { color: MUTED, weight: 700, alpha: a, shadow: false });
  const b = easeOut(prog(t, 16.1, 16.45));
  text('Gratis · Tanpa install · Langsung main', W / 2, 1490 + (1 - b) * 30, 44, { weight: 700, alpha: b, shadow: false });
  const s = back(prog(t, 16.3, 16.75)) * (t > 16.9 ? 1 + .03 * Math.sin((t - 16.9) * 6) : 1);
  if (s > 0) {
    const w = measure('pemburu-kuman.indrakusuma.dev', 58) + 90;
    ctx.save(); ctx.translate(W / 2, 1610); ctx.scale(s, s); card(-w / 2, -58, w, 116, 58, SUN, 10); ctx.restore();
    text('pemburu-kuman.indrakusuma.dev', W / 2, 1613, 58, { scale: s, shadow: false });
  }
  text('by Indra Kusuma', W / 2, 1745, 44, { color: MUTED, weight: 700, alpha: easeOut(prog(t, 16.6, 16.9)), shadow: false });
}

/* ---------- SFX terjadwal & partikel global ---------- */
function globalEvents(t) {
  if (cross(.35)) sfx('blip');
  if (cross(1.5)) sfx('ding');
  if (cross(1.9)) sfx('boing');
  for (const d of [2.2, 2.3, 2.4]) if (cross(d)) sfx('blip');
  for (const d of [3.2, 9.6, 15.0]) if (cross(d)) sfx('whoosh');
  for (const h of HEADLINES) if (cross(h.from + .12)) sfx('tick');
  if (cross(12.75)) {
    sfx('win');
    for (let i = 0; i < 80; i++) P.push({ type: 'star', x: R(0, W), y: R(-600, -40), vx: R(-60, 60), vy: R(500, 900), g: 300, r: R(16, 30), life: 0, max: R(2.2, 3), rot: R(0, 6), vr: R(-5, 5) });
  }
  if (cross(15.3)) sfx('pop');
  if (cross(15.6)) { sfx('blip'); for (let i = 0; i < 2; i++) burst(P, W / 2 + R(-300, 300), 1080); }
  if (cross(16.3)) sfx('ding');
}

function render(t) {
  T = t; const dt = PT < 0 ? 0 : t - PT;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  bg(t);
  globalEvents(t);
  scene1(t);
  headlines(t);
  phone(t, dt);
  sceneEnd(t);
  stepDraw(P, dt);
  PT = t;
}
window.render = render;
window.DURATION = DURATION;
