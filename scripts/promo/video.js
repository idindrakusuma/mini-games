/* Taman Bermain · video promo Threads (vertikal 1080×1920).
   video.html?v=<id> memilih salah satu VIDEOS di bawah. render(t) menggambar frame pada detik t (boleh acak urutannya),
   memakai rekaman gameplay asli dari promo/.cache/<klip>/ (dibuat oleh capture.mjs).
   window.SFX berisi jadwal efek suara untuk disintesis oleh render.mjs. */
const W = 1080, H = 1920;
const cv = document.getElementById('v'), ctx = cv.getContext('2d');
const FONT = '"Baloo 2", "Noto Color Emoji", sans-serif';
const INK = '#1B2A6B', MUTED = '#3F5A92', CARD = '#FFFDF7', SUN = '#FFD23F', SOAP = '#FF8FB8', WATER = '#47C9E5', LEAF = '#7BD88F', GRAPE = '#B98CFF';
const SITE = 'mini-games.indrakusuma.dev';

/* ---------- utils ---------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const easeOut = x => 1 - Math.pow(1 - x, 3);
const easeInOut = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const back = x => { const c1 = 1.9, c3 = c1 + 1; return x <= 0 ? 0 : x >= 1 ? 1 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
// muncul (pop) di a, hilang di b: skala & alpha
const popIn = (t, a, d = .45) => back(prog(t, a, a + d));
const fade = (t, a, b, d = .3) => Math.min(prog(t, a, a + d), 1 - prog(t, b - d, b));

function text(str, x, y, size, o = {}) {
  const { color = INK, weight = 800, align = 'center', alpha = 1, scale = 1, shadow = 'rgba(255,255,255,.85)', rot = 0, maxW = 0 } = o;
  if (alpha <= 0 || scale <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.font = `${weight} ${size}px ${FONT}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (maxW) { const w = ctx.measureText(str).width; if (w > maxW) ctx.scale(maxW / w, maxW / w); }
  if (shadow) { ctx.fillStyle = shadow; ctx.fillText(str, 0, size * .07); }
  ctx.fillStyle = color; ctx.fillText(str, 0, 0); ctx.restore();
}
function measure(str, size, weight = 800) { ctx.save(); ctx.font = `${weight} ${size}px ${FONT}`; const w = ctx.measureText(str).width; ctx.restore(); return w; }
function card(x, y, w, h, r, fill, off = 10) {
  ctx.fillStyle = 'rgba(27,42,107,.22)'; rr(x, y + off, w, h, r); ctx.fill();
  ctx.fillStyle = fill; rr(x, y, w, h, r); ctx.fill();
}
// pil berwarna berisi teks, berpusat di (x, y)
function pill(str, x, y, size, fill, o = {}) {
  const { scale = 1, alpha = 1, rot = 0, color = INK } = o;
  if (scale <= 0 || alpha <= 0) return;
  const w = measure(str, size) + size * 1.1, h = size * 1.55;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
  card(-w / 2, -h / 2, w, h, h / 2, fill, size * .16);
  ctx.restore();
  text(str, x, y + size * .04, size, { scale, alpha, rot, shadow: null, color });
}
function star(x, y, r, rot, fill = SUN) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, q = i % 2 ? r * .45 : r; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); }
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = 'rgba(224,155,0,.9)'; ctx.lineWidth = r * .14; ctx.stroke(); ctx.restore();
}
// hujan bintang/konfeti deterministik mulai detik a
function confetti(t, a, n = 26, x0 = W / 2, y0 = H * .45) {
  const k = t - a; if (k < 0 || k > 1.6) return;
  for (let i = 0; i < n; i++) {
    const ang = hash(i) * Math.PI * 2, v = 500 + hash(i + 9) * 700;
    const x = x0 + Math.cos(ang) * v * k, y = y0 + Math.sin(ang) * v * k * .8 + 900 * k * k;
    ctx.save(); ctx.globalAlpha = clamp(1.6 - k); star(x, y, 14 + hash(i + 3) * 16, k * 6 + i); ctx.restore();
  }
}

/* ---------- latar ---------- */
const BUBS = [...Array(18)].map((_, i) => ({ x: hash(i) * W, y: hash(i + 40) * (H + 300), r: 14 + hash(i + 80) * 50, v: 40 + hash(i + 120) * 80, a: .25 + hash(i + 160) * .3 }));
function bg(t, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const b of BUBS) {
    const y = (((b.y - t * b.v) % (H + 300)) + H + 300) % (H + 300) - 150;
    ctx.fillStyle = `rgba(255,255,255,${b.a})`; ctx.beginPath(); ctx.arc(b.x + Math.sin(t + b.r) * 20, y, b.r, 0, 7); ctx.fill();
  }
}

/* ---------- rekaman gameplay ---------- */
const CLIPS = {}, IMG = new Map();
async function loadClip(name) {
  if (CLIPS[name]) return CLIPS[name];
  const base = `../../promo/.cache/${name}/`;
  const [f, e] = await Promise.all([fetch(base + 'frames.json').then(r => r.json()), fetch(base + 'events.json').then(r => r.json())]);
  return CLIPS[name] = { base, fps: f.fps, css: f.css, frames: f.frames, events: e, dur: f.frames.at(-1).t };
}
const mark = (clip, name) => (CLIPS[clip].events.find(e => e.type === 'mark' && e.name === name) || { t: 0 }).t;
function frameAt(c, ct) { return c.frames[clamp(Math.round(ct * c.fps) - 1, 0, c.frames.length - 1)]; }
async function img(src) {
  if (IMG.has(src)) return IMG.get(src);
  const im = new Image(); im.src = src; await im.decode();
  IMG.set(src, im); if (IMG.size > 40) IMG.delete(IMG.keys().next().value);
  return im;
}
// Bingkai HP berisi rekaman `clip` pada detik ct. (cx, top) = tengah atas HP, w = lebar layar.
async function phone(clipName, ct, cx, top, w, o = {}) {
  const c = CLIPS[clipName], fr = frameAt(c, ct), im = await img(c.base + fr.file);
  const h = w * im.height / im.width, bz = w * .045, s = w / c.css;
  const { alpha = 1, scale = 1, rot = 0 } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(cx, top + h / 2); ctx.rotate(rot); ctx.scale(scale, scale); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = 'rgba(27,42,107,.25)'; rr(-bz + 14, -bz + 26, w + bz * 2, h + bz * 2, w * .14); ctx.fill();
  ctx.fillStyle = INK; rr(-bz, -bz, w + bz * 2, h + bz * 2, w * .14); ctx.fill();
  ctx.save(); rr(0, 0, w, h, w * .1); ctx.clip(); ctx.drawImage(im, 0, 0, w, h);
  // jari: lingkaran sentuh di posisi terakhir yang ditekan
  const fe = c.events.filter(e => e.type === 'finger' && e.t <= ct + 1e-6);
  const last = fe.at(-1);
  if (last && last.down) {
    const downAt = [...fe].reverse().find((e, i, a) => e.down && (!a[i + 1] || !a[i + 1].down))?.t ?? last.t;
    const k = easeOut(prog(ct, downAt, downAt + .15));
    ctx.fillStyle = `rgba(255,255,255,${.45 * k})`; ctx.strokeStyle = `rgba(27,42,107,${.55 * k})`; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(last.x * s, last.y * s, 34 * (1.3 - .3 * k), 0, 7); ctx.fill(); ctx.stroke();
  } else if (last) {
    // riak kecil setelah jari diangkat
    const prev = [...fe].reverse().find(e => e.down); const k = prog(ct, last.t, last.t + .35);
    if (prev && k < 1) { ctx.strokeStyle = `rgba(255,255,255,${.8 * (1 - k)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(prev.x * s, prev.y * s, 34 + 40 * k, 0, 7); ctx.stroke(); }
  }
  ctx.restore();
  ctx.fillStyle = INK; rr(w / 2 - w * .15, -bz * .35, w * .3, bz * .9, bz); ctx.fill();   // poni kamera
  ctx.restore();
  return h;
}
// Klip yang terdiri dari beberapa potongan: segs = [{from, to, speed}], dipetakan ke waktu video mulai t0.
function segTime(segs, t) {
  let acc = 0;
  for (const s of segs) {
    const len = (s.to - s.from) / (s.speed || 1);
    if (t < acc + len || s === segs.at(-1)) return s.from + clamp(t - acc, 0, len) * (s.speed || 1);
    acc += len;
  }
}
const segLen = segs => segs.reduce((a, s) => a + (s.to - s.from) / (s.speed || 1), 0);
// jadwal suara dari kejadian di klip (benar, salah, menang, ...), dipetakan ke waktu video
function clipSfx(clip, segs, t0) {
  let acc = 0;
  for (const s of segs) {
    for (const e of CLIPS[clip].events) if (e.type !== 'finger' && e.type !== 'mark' && e.t >= s.from && e.t < s.to)
      SFX.push({ type: e.type, t: t0 + acc + (e.t - s.from) / (s.speed || 1) + (e.at || 0) });
    acc += (s.to - s.from) / (s.speed || 1);
  }
}

/* ---------- ikon game & karakter ---------- */
const ICON = {};
const GAMES = {
  'pemburu-kuman': { name: 'Pemburu Kuman', tag: 'Usir kuman sambil cuci tangan & sikat gigi', color: SOAP, bg: ['#D4F6FD', '#A6E4F4'] },
  'huruf-angka': { name: 'Huruf & Angka', tag: 'Yuk kenalan sama huruf & angka!', color: SUN, bg: ['#FFF6D6', '#FFE79A'] },
  'pensil-ajaib': { name: 'Pensil Ajaib', tag: 'Tulis huruf, lihat keajaibannya!', color: GRAPE, bg: ['#F1E8FF', '#D9C6FF'] },
  'cocok-bentuk': { name: 'Cocok Bentuk', tag: 'Yuk, pasangkan bentuk & warna!', color: LEAF, bg: ['#E6FAEA', '#BDEFC7'] },
};
function icon(slug, x, y, size, o = {}) {
  const { scale = 1, alpha = 1, rot = 0 } = o; if (scale <= 0 || alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(27,42,107,.22)'; rr(-size / 2, -size / 2 + size * .06, size, size, size * .26); ctx.fill();
  ctx.save(); rr(-size / 2, -size / 2, size, size, size * .26); ctx.clip(); ctx.drawImage(ICON[slug], -size / 2, -size / 2, size, size); ctx.restore();
  ctx.lineWidth = size * .04; ctx.strokeStyle = GAMES[slug].color; rr(-size / 2, -size / 2, size, size, size * .26); ctx.stroke();
  ctx.restore();
}
function sun(x, y, r, t) {
  ctx.save(); ctx.translate(x, y);
  ctx.save(); ctx.rotate(t * .4); ctx.fillStyle = '#FFB938';
  for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); rr(-r * .1, -r * 1.42, r * .2, r * .36, r * .1); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = SUN; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,143,184,.6)'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * .55, r * .22, r * .17, r * .11, 0, 0, 7); ctx.fill(); }
  const blink = (t % 3.4) > 3.25 ? .15 : 1;
  ctx.fillStyle = INK; for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * r * .33, -r * .15, r * .1, r * .15 * blink, 0, 0, 7); ctx.fill(); }
  ctx.strokeStyle = INK; ctx.lineWidth = r * .08; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, r * .22, r * .32, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
  ctx.restore();
}

/* ---------- potongan adegan yang dipakai bersama ---------- */
// Judul game di atas: ikon + nama + tagline, muncul bergantian mulai detik a.
function header(slug, t, a, y = 250, alpha = 1) {
  const g = GAMES[slug];
  icon(slug, W / 2, y - 40, 170, { scale: popIn(t, a), alpha, rot: Math.sin(t * 2) * .04 });
  text(g.name, W / 2, y + 115, 96, { scale: popIn(t, a + .12), alpha });
  text(g.tag, W / 2, y + 200, 44, { color: MUTED, weight: 700, alpha: alpha * prog(t, a + .3, a + .6), maxW: W - 120 });
}
// Keterangan pendek di bawah HP. caps = [[mulai, selesai, teks, warna]]
function captions(t, caps, y = 1770) {
  for (const [a, b, str, col] of caps) {
    if (t < a || t > b) continue;
    const out = prog(t, b - .2, b);
    pill(str, W / 2, y, 54, col, { scale: popIn(t, a, .4) * (1 - out * .3), alpha: 1 - out, rot: -.02 });
  }
}
// Kartu penutup: gratis, tanpa iklan, tanpa install + URL.
function endCard(t, a, url, color, y = 1180) {
  const k = popIn(t, a);
  text('Gratis · Tanpa iklan · Tanpa install', W / 2, y, 54, { scale: k, color: INK });
  const us = 58 * Math.min(1, (W - 140) / (measure(url, 58) + 64));   // URL panjang dikecilkan supaya muat
  pill(url, W / 2, y + 150, us, color, { scale: popIn(t, a + .2), rot: Math.sin(t * 3) * .015 });
  text('Langsung main di browser HP 📱', W / 2, y + 290, 42, { alpha: prog(t, a + .5, a + .8), color: MUTED, weight: 700 });
}

/* ---------- video ---------- */
const SFX = []; window.SFX = SFX;
// Klip per game: header di atas, HP berisi rekaman, keterangan di bawah, lalu kartu penutup.
function gameVideo(slug, clip, segs, caps, extra = {}) {
  const intro = .5, play = segLen(segs), endA = intro + play + .2, dur = endA + 2.6;
  return {
    clips: [clip], dur,
    setup() {
      SFX.push({ type: 'whoosh', t: .15 }, { type: 'pop', t: .2 }, { type: 'blip', t: .35 }, { type: 'whoosh', t: endA - .1 }, { type: 'ding', t: endA + .25 });
      clipSfx(clip, segs, intro);
    },
    async draw(t) {
      const g = GAMES[slug];
      bg(t, ...g.bg);
      const out = easeInOut(prog(t, endA - .3, endA + .3));   // HP turun & mengecil di akhir
      header(slug, t, .1, 250 + out * 420);
      const top = 590 + (1 - easeOut(prog(t, .2, .8))) * 1300;
      if (out < 1) await phone(clip, segTime(segs, t - intro), W / 2, top + out * 900, 510, { alpha: 1 - out, scale: 1 - out * .3 });
      if (out < .5) captions(t - intro, caps.map(([a, b, s, c]) => [a, Math.min(b, play), s, c || g.color]));
      if (extra.confettiAt != null) confetti(t, intro + extra.confettiAt);
      if (t > endA) endCard(t, endA + .1, `${SITE}/${slug}`, g.color);
    },
  };
}

const VIDEOS = {
  // Video utama untuk post pertama: cerita "Mana kumannya?", Pemburu Kuman, lalu semua game.
  utama: {
    clips: ['pemburu-kuman-tangan', 'huruf-angka', 'pensil-ajaib', 'cocok-bentuk'],
    dur: 0,
    setup() {
      const pk = mark('pemburu-kuman-tangan', 'play');
      this.pk = [{ from: pk + .2, to: pk + 2.6 }, { from: pk + 2.6, to: CLIPS['pemburu-kuman-tangan'].dur - .6, speed: 1.8 }];
      this.others = [
        ['huruf-angka', [{ from: 1.9, to: 5.6, speed: 1.25 }]],
        ['pensil-ajaib', [{ from: 1.2, to: 6.4, speed: 1.6 }]],
        ['cocok-bentuk', [{ from: 2.4, to: 8.2, speed: 1.7 }]],
      ];
      const S = this.S = {};
      S.hook = 0; S.pk = 3.6; S.pkPlay = S.pk + .9; S.pkEnd = S.pkPlay + segLen(this.pk);
      S.more = S.pkEnd + .2; S.games = S.more + 2.2;
      let t = S.games; this.slots = this.others.map(([c, segs]) => { const s = { clip: c, segs, a: t, b: t + segLen(segs) + .5 }; t = s.b; return s; });
      S.end = t; this.dur = S.end + 4.2;
      SFX.push({ type: 'pop', t: .35 }, { type: 'boing', t: 1.3 }, { type: 'pop', t: 2.3 }, { type: 'whoosh', t: S.pk - .1 }, { type: 'ding', t: S.pk + .2 });
      clipSfx('pemburu-kuman-tangan', this.pk, S.pkPlay);
      this.pkWin = SFX.find(e => e.type === 'win' && e.t > S.pkPlay).t - S.pkPlay;
      SFX.push({ type: 'whoosh', t: S.more - .05 }, { type: 'blip', t: S.more + .3 }, { type: 'blip', t: S.more + .6 }, { type: 'blip', t: S.more + .9 });
      for (const s of this.slots) { SFX.push({ type: 'whoosh', t: s.a - .05 }); clipSfx(s.clip, s.segs, s.a + .3); }
      SFX.push({ type: 'whoosh', t: S.end - .05 }, { type: 'win', t: S.end + .3 }, { type: 'ding', t: S.end + 1.6 });
    },
    async draw(t) {
      const S = this.S;
      if (t < S.pk) {   // 1. hook
        bg(t, '#D4F6FD', '#A6E4F4');
        const out = prog(t, S.pk - .3, S.pk);
        text('Tiap disuruh cuci tangan', W / 2, 520, 62, { alpha: prog(t, .1, .4) * (1 - out), weight: 700, color: MUTED });
        text('& sikat gigi, anakku nanya:', W / 2, 600, 62, { alpha: prog(t, .25, .55) * (1 - out), weight: 700, color: MUTED });
        const k = popIn(t, .35) * (1 - out);
        ctx.save(); ctx.translate(W / 2, 850); ctx.scale(k, k); ctx.rotate(-.03 + Math.sin(t * 3) * .015);
        card(-380, -130, 760, 230, 70, CARD, 14);
        ctx.fillStyle = CARD; ctx.beginPath(); ctx.moveTo(-170, 95); ctx.lineTo(-250, 190); ctx.lineTo(-60, 95); ctx.fill();
        ctx.restore();
        text('“Mana kumannya?” 🤔', W / 2, 838, 82, { scale: k, shadow: null });
        // kuman mengintip dari bawah sambil cekikikan
        [[250, GRAPE, 1.2], [540, LEAF, 1.45], [830, SOAP, 1.7]].forEach(([x, col, a], i) => {
          const up = easeOut(prog(t, a, a + .5)) * (1 - out);
          drawGerm(ctx, x, H + 120 - up * 430 + Math.sin(t * 5 + i) * 10, 120, COLORS[i * 2 % COLORS.length], t, i);
        });
        text('hihi~', 700, 1360, 52, { alpha: prog(t, 2.1, 2.3) * (1 - out), rot: .1, color: MUTED });
        text('…padahal kumannya nggak kelihatan 😅', W / 2, 1120, 52, { alpha: prog(t, 2.3, 2.6) * (1 - out), weight: 700 });
        return;
      }
      if (t < S.more) {   // 2. Pemburu Kuman
        bg(t, '#D4F6FD', '#A6E4F4');
        const out = prog(t, S.more - .3, S.more);
        text('Jadi aku bikin game:', W / 2, 150, 56, { alpha: prog(t, S.pk, S.pk + .3) * (1 - out), weight: 700, color: MUTED });
        header('pemburu-kuman', t, S.pk + .1, 300, 1 - out);
        const top = 700 + (1 - easeOut(prog(t, S.pk + .3, S.pk + .9))) * 1300 + out * 1200;
        await phone('pemburu-kuman-tangan', segTime(this.pk, t - S.pkPlay), W / 2, top, 460);
        const won = this.pkWin;
        captions(t - S.pkPlay, [[0, 2.3, 'Kumannya muncul di tangan 🦠', SOAP], [2.4, won - .1, 'Digosok… kumannya kabur! 🧼', WATER], [won, segLen(this.pk), 'Bersih! Dapat bintang ⭐', LEAF]], 1800);
        return;
      }
      if (t < S.games) {   // 3. "Terus kepikiran game lain…"
        bg(t, '#FFF6D6', '#FFE79A');
        const out = prog(t, S.games - .3, S.games);
        text('Terus kepikiran', W / 2, 760, 96, { scale: popIn(t, S.more + .05), alpha: 1 - out });
        text('game lain… 💡', W / 2, 880, 96, { scale: popIn(t, S.more + .2), alpha: 1 - out });
        ['huruf-angka', 'pensil-ajaib', 'cocok-bentuk'].forEach((g, i) => icon(g, W / 2 + (i - 1) * 260, 1140, 200, { scale: popIn(t, S.more + .3 + i * .3), alpha: 1 - out, rot: Math.sin(t * 2 + i) * .06 }));
        text('ya sudah, bikin satu-satu deh 😄', W / 2, 1360, 52, { alpha: prog(t, S.more + 1.2, S.more + 1.5) * (1 - out), weight: 700, color: MUTED });
        return;
      }
      const slot = this.slots.find(s => t < s.b);
      if (slot) {   // 4. cuplikan game lain, bergantian
        const g = GAMES[slot.clip]; bg(t, ...g.bg);
        const inK = easeOut(prog(t, slot.a, slot.a + .35)), out = prog(t, slot.b - .25, slot.b);
        header(slot.clip, t, slot.a, 230, 1 - out);
        await phone(slot.clip, segTime(slot.segs, t - slot.a - .3), W / 2 + (1 - inK) * 900 - out * 900, 620, 470, { rot: (1 - inK) * .12 });
        return;
      }
      // 5. penutup: Taman Bermain
      bg(t, '#D4F6FD', '#A6E4F4');
      const a = S.end;
      sun(W / 2, 420 - (1 - popIn(t, a)) * 300, 130, t);
      text('Taman Bermain', W / 2, 700, 112, { scale: popIn(t, a + .15) });
      text('4 game kecil untuk anak 3–10 tahun', W / 2, 800, 48, { alpha: prog(t, a + .35, a + .65), color: MUTED, weight: 700 });
      Object.keys(GAMES).forEach((s, i) => icon(s, 175 + i * 243, 1030, 190, { scale: popIn(t, a + .5 + i * .12), rot: Math.sin(t * 2 + i) * .05 }));
      ['Pemburu', 'Huruf', 'Pensil', 'Cocok'].forEach((s, i) => text(s, 175 + i * 243, 1165, 38, { alpha: prog(t, a + .7 + i * .12, a + 1 + i * .12), weight: 700 }));
      confetti(t, a + .3, 30, W / 2, 500);
      endCard(t, a + 1.4, SITE, SUN, 1420);
    },
  },

  'pemburu-kuman': {
    clips: ['pemburu-kuman-tangan', 'pemburu-kuman-gigi'], dur: 0,
    setup() {
      const a = mark('pemburu-kuman-tangan', 'play'), b = mark('pemburu-kuman-gigi', 'play');
      const gigi = CLIPS['pemburu-kuman-gigi'], shine = gigi.events.find(e => e.type === 'cling').t;
      this.parts = [
        { clip: 'pemburu-kuman-tangan', segs: [{ from: a + .2, to: a + 3 }, { from: a + 3, to: CLIPS['pemburu-kuman-tangan'].dur - 1.6, speed: 2.4 }] },
        { clip: 'pemburu-kuman-gigi', segs: [{ from: b + .4, to: b + 2.2 }, { from: shine - .5, to: shine + 3.2 }] },
      ];
      this.intro = .5; let t = this.intro;
      for (const p of this.parts) { p.a = t; t += segLen(p.segs); p.b = t; }
      this.endA = t + .2; this.dur = this.endA + 2.6; this.shine = this.parts[1].a + segLen([this.parts[1].segs[0]]) + .5;
      SFX.push({ type: 'whoosh', t: .15 }, { type: 'pop', t: .2 }, { type: 'whoosh', t: this.parts[1].a - .05 }, { type: 'whoosh', t: this.endA - .1 }, { type: 'ding', t: this.endA + .25 });
      for (const p of this.parts) clipSfx(p.clip, p.segs, p.a);
    },
    async draw(t) {
      const g = GAMES['pemburu-kuman']; bg(t, ...g.bg);
      const out = easeInOut(prog(t, this.endA - .3, this.endA + .3));
      header('pemburu-kuman', t, .1, 250 + out * 420);
      const p = this.parts.find(p => t < p.b) || this.parts.at(-1);
      const swap = p === this.parts[1] ? easeOut(prog(t, p.a - .15, p.a + .25)) : 1;
      const top = 590 + (1 - easeOut(prog(t, .2, .8))) * 1300;
      if (out < 1) await phone(p.clip, segTime(p.segs, t - p.a), W / 2 + (1 - swap) * 900, top + out * 900, 510, { alpha: 1 - out, scale: 1 - out * .3 });
      if (out < .5) captions(t, [
        [this.parts[0].a, this.parts[0].a + 2.6, 'Kuman muncul di tangan 🖐️', SOAP],
        [this.parts[0].a + 2.7, this.parts[0].b, 'Gosok-gosok… kabur! 🧼', WATER],
        [this.parts[1].a, this.shine - .1, 'Sikat gigi juga bisa 🦷', SOAP],
        [this.shine, this.parts[1].b, 'Tombol ✨ untuk ortu: kinclong!', WATER],
      ]);
      if (t > this.endA) endCard(t, this.endA + .1, `${SITE}/pemburu-kuman`, g.color);
    },
  },

  'huruf-angka': gameVideo('huruf-angka', 'huruf-angka', [{ from: .3, to: 1.9, speed: 1.3 }, { from: 1.9, to: 11.6 }], [
    [0, 1.2, 'Pilih huruf atau angka 🔤', SUN],
    [1.3, 1.9, 'Dengar, lalu cari 👂', WATER],
    [2.0, 3.0, 'Salah? Coba lagi 😊', SOAP],
    [3.1, 5.8, 'Benar! Ada gambar & suaranya 🔊', LEAF],
    [5.9, 10.8, 'Hurufnya acak, 5 soal per ronde ⭐', SUN],
  ]),
  'pensil-ajaib': gameVideo('pensil-ajaib', 'pensil-ajaib', [{ from: .2, to: 14.6 }], [
    [0, 1.0, 'Pilih hurufnya ✏️', GRAPE],
    [1.1, 3.9, 'Ikuti titik hijau 🟢', LEAF],
    [4.0, 6.3, 'Jadi pelangi! 🌈', SUN],
    [6.4, 13.2, 'Lanjut huruf berikutnya ▶', WATER],
  ]),
  'cocok-bentuk': gameVideo('cocok-bentuk', 'cocok-bentuk', [{ from: .3, to: 7.6 }, { from: 7.6, to: 14, speed: 2 }, { from: 14, to: 20.8 }], [
    [0, 2.6, 'Seret bentuk ke rumahnya 👆', LEAF],
    [2.7, 4.2, 'Nggak muat? Balik lagi 😄', SOAP],
    [4.3, 7.2, 'Pas! Namanya disebut 🔊', SUN],
    [7.3, 10.4, 'Makin banyak bentuk ⭐', WATER],
    [10.5, 14.8, 'Lalu cocokkan warnanya 🎨', SOAP],
    [14.9, 17.3, 'Hore! Dapat bintang ⭐', WATER],
  ]),
};

/* ---------- setup & render ---------- */
const V = VIDEOS[new URLSearchParams(location.search).get('v') || 'utama'];
window.ready = (async () => {
  await document.fonts.load(`800 40px "Baloo 2"`); await document.fonts.load(`700 40px "Baloo 2"`);
  await Promise.all(Object.keys(GAMES).map(async s => { ICON[s] = await img(`../../games/${s}/public/assets/icons/icon-512.png`); }));
  for (const c of V.clips) await loadClip(c);
  V.setup(); SFX.sort((a, b) => a.t - b.t);
  window.DURATION = V.dur;
})();
window.render = async t => { ctx.clearRect(0, 0, W, H); await V.draw(t); };
