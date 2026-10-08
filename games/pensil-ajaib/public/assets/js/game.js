/* Pensil Ajaib · tracing huruf & angka dengan jari.
   Jalur goresan ada di strokes.js. Setiap goresan diubah jadi deretan titik;
   jari dianggap "di jalur" kalau dekat dengan titik di depan posisi terakhir,
   jadi anak tidak bisa melompat ke goresan lain tapi juga tidak dihukum kalau melenceng. */
(() => {
const $ = s => document.querySelector(s);
const STORE = 'pensilAjaib';
const PER_STAR = 5;               // tiap 5 huruf selesai = 1 bintang
const STEP = 2;                   // jarak antar titik sampel (satuan kotak 120x180)
const TOL = 30;                   // toleransi jarak jari ke jalur (lebar, untuk balita)
const AHEAD = 20;                 // berapa titik ke depan yang boleh "dikejar" jari (40 satuan)
const REENTRY = 6;                // masuk lagi ke jalur hanya di dekat titik hijau (12 satuan ke depan)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Data ---------- */
const SETS = {
  besar: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  kecil: 'abcdefghijklmnopqrstuvwxyz'.split(''),
  angka: '0123456789'.split(''),
};
// [cara baca, kata, gambar]
const WORDS = {
  A:['a','Apel','🍎'], B:['be','Bola','⚽'], C:['ce','Cicak','🦎'], D:['de','Domba','🐑'], E:['e','Es krim','🍦'],
  F:['ef','Foto','📷'], G:['ge','Gajah','🐘'], H:['ha','Harimau','🐯'], I:['i','Ikan','🐟'], J:['je','Jeruk','🍊'],
  K:['ka','Kucing','🐱'], L:['el','Lebah','🐝'], M:['em','Mobil','🚗'], N:['en','Nanas','🍍'], O:['o','Ombak','🌊'],
  P:['pe','Pisang','🍌'], Q:['ki','',''], R:['er','Roti','🍞'], S:['es','Sapi','🐄'], T:['te','Tomat','🍅'],
  U:['u','Ular','🐍'], V:['ve','Vas bunga','🌷'], W:['we','Wortel','🥕'], X:['eks','Xilofon','🎶'], Y:['ye','Yoyo','🪀'], Z:['zet','Zebra','🦓'],
};
const NUMS = ['nol','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan'];
const NUM_PICS = ['','🐥','🍎','⭐','🐟','🎈','🍓','🐞','🌸','🍪'];
const cap = w => w[0].toUpperCase() + w.slice(1);
function info(ch){
  if (/\d/.test(ch)) {
    const n = +ch;
    return { kind: 'angka', say: NUMS[n], ask: `Ayo tulis angka ${NUMS[n]}!`, done: `Hebat! ${cap(NUMS[n])}!`,
             label: `${ch}, ${NUMS[n]}! ${NUM_PICS[n].repeat(n)}`.trim() };
  }
  const [say, word, pic] = WORDS[ch.toUpperCase()];
  const size = ch === ch.toUpperCase() ? 'besar' : 'kecil';
  return { kind: 'huruf', say, ask: `Ayo tulis huruf ${say} ${size}!`,
           done: word ? `Hebat! ${say}. ${word}!` : `Hebat! Huruf ${say}!`,
           label: word ? `${ch} · ${word} ${pic}` : `${ch} · Hebat! ⭐`, pic };
}

/* ---------- Suara ----------
   Semua ucapan lewat say(key, teks). Rekaman suara asli bisa didaftarkan di RECORDINGS
   dengan key yang sama, misalnya 'tulis-A': 'assets/audio/tulis-a-besar.mp3'.
   Key: tulis-<ch>, hebat-<ch>. */
const RECORDINGS = {};
let voice = null, clip = null;
function pickVoice(){
  if (!('speechSynthesis' in window)) return;
  voice = speechSynthesis.getVoices().find(v => /^id([-_]|$)/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
function hush(){ if (clip) { clip.pause(); clip = null; } if ('speechSynthesis' in window) speechSynthesis.cancel(); }
function say(key, text){
  hush();
  if (RECORDINGS[key]) { clip = new Audio(RECORDINGS[key]); clip.play().catch(() => {}); return; }
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = .85; u.pitch = 1.15;
  speechSynthesis.speak(u);
}
let ac = null;
function audio(){ if(!ac){ try{ ac = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac && ac.state==='suspended') ac.resume(); return ac; }
function tone(f1,f2,dur,type='sine',vol=.16,delay=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.02);
}
const sStroke = () => tone(700, 1050, .12, 'triangle', .12);
const sWin = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.16,i*.12));
let lastTick = 0;
const sTick = () => { const n = performance.now(); if (n - lastTick < 90) return; lastTick = n; tone(1200, 1500, .03, 'sine', .025); };

/* ---------- Simpanan (per perangkat) ---------- */
const load = (k, d) => { try { const v = localStorage.getItem(`${STORE}.${k}`); return v == null ? d : JSON.parse(v); } catch(e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(`${STORE}.${k}`, JSON.stringify(v)); } catch(e) {} };
let stars = load('stars', 0), count = load('count', 0);
const done = load('done', {});        // { 'A': 1, 'a': 1, ... } — kunci peka huruf besar/kecil
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Jalur → titik ---------- */
const measure = $('#measure'), NS = 'http://www.w3.org/2000/svg';
const cache = {};
function strokesOf(ch){
  if (cache[ch]) return cache[ch];
  return cache[ch] = STROKES[ch].map(d => {
    if (d.startsWith('dot')) { const [, x, y] = d.split(' ').map(Number); return { dot: true, d, pts: [{ x, y }] }; }
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); measure.append(p);
    const len = p.getTotalLength(), pts = [];
    for (let t = 0; t < len; t += STEP) { const q = p.getPointAtLength(t); pts.push({ x: q.x, y: q.y }); }
    const e = p.getPointAtLength(len); pts.push({ x: e.x, y: e.y });
    p.remove();
    return { dot: false, d, pts, path: new Path2D(d) };
  });
}

/* ---------- Grid pilihan ---------- */
let tab = 'besar';
function glyphSvg(ch){
  const parts = STROKES[ch].map(d => d.startsWith('dot')
    ? `<circle cx="${d.split(' ')[1]}" cy="${d.split(' ')[2]}" r="4" fill="currentColor" stroke-width="5"/>`
    : `<path d="${d}" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg viewBox="0 10 120 165" aria-hidden="true">${parts}</svg>`;
}
function renderGrid(){
  document.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.set === tab)));
  $('#grid').innerHTML = SETS[tab].map(ch =>
    `<button class="ch" data-ch="${ch}" aria-label="${ch}">${glyphSvg(ch)}${done[ch] ? '<span class="ok" aria-hidden="true">✓</span>' : ''}</button>`).join('');
}
document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => { tab = t.dataset.set; renderGrid(); }));
$('#grid').addEventListener('click', e => { const b = e.target.closest('.ch'); if (b) { audio(); open(b.dataset.ch); } });
renderGrid();

/* ---------- Papan menulis ---------- */
const play = $('#play'), pad = $('#pad'), ctx = pad.getContext('2d');
let T = null;          // { ch, strokes, si (goresan aktif), k (titik terjauh), finished, onTrack }
let view = { s: 1, ox: 0, oy: 0 }, raf = 0;
const ACCENT = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#B98CFF';

function resize(){
  const dpr = Math.min(2, devicePixelRatio || 1), W = pad.clientWidth, H = pad.clientHeight;
  pad.width = Math.round(W * dpr); pad.height = Math.round(H * dpr);
  const s = Math.min(W / BOX.w, H / (BOX.desc + 15 - (BOX.top - 15))) * .96;
  view = { s, dpr, ox: (W - BOX.w * s) / 2, oy: (H - (BOX.desc + 15 - (BOX.top - 15)) * s) / 2 - (BOX.top - 15) * s };
}
// Ukur ulang setiap kali ukuran papan berubah (rotasi layar, teks di atasnya berganti baris, font termuat).
new ResizeObserver(() => { if (T) { resize(); redraw(); } }).observe(pad);

// Mode gelap: ikuti data-theme kalau ada, kalau tidak ikuti pengaturan perangkat (sama seperti CSS).
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => { const t = document.documentElement.dataset.theme; return t ? t === 'dark' : darkMQ.matches; };
darkMQ.addEventListener?.('change', () => redraw());

// Gambar hanya saat ada yang berubah. Loop animasi hanya berjalan selama titik hijau berdenyut.
function redraw(){ if (T && !raf) raf = requestAnimationFrame(draw); }

function open(ch){
  T = { ch, strokes: strokesOf(ch), si: 0, k: 0, finished: false, onTrack: false };
  pointer = null; clearTimeout(starTimer); $('#toast').classList.remove('on');
  const i = info(ch);
  $('#chip').textContent = ch;
  $('#say').textContent = 'Ikuti titik hijau, ya!';
  $('#nextBtn').classList.remove('ready');
  play.classList.add('on'); fxReset(); resize();
  say(`tulis-${ch}`, i.ask);
  cancelAnimationFrame(raf); raf = 0; redraw();
}
function close(){
  T = null; cancelAnimationFrame(raf); raf = 0; pointer = null; hush(); fxReset();
  clearTimeout(starTimer); $('#toast').classList.remove('on');
  play.classList.remove('on'); renderGrid(); showStars();
}
function nextChar(){
  const list = SETS[/\d/.test(T.ch) ? 'angka' : T.ch === T.ch.toUpperCase() ? 'besar' : 'kecil'];
  open(list[(list.indexOf(T.ch) + 1) % list.length]);
}

function draw(now){
  raf = 0;
  if (!T) return;
  const { s, dpr, ox, oy } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pad.width, pad.height);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const dark = isDark();

  // Garis bantu: atas, tengah, dasar
  ctx.lineWidth = 1.2 / s * 2;
  for (const [y, solid] of [[BOX.top, 0], [BOX.mid, 0], [BOX.base, 1]]) {
    ctx.strokeStyle = dark ? 'rgba(255,255,255,.18)' : 'rgba(27,42,107,.14)';
    ctx.setLineDash(solid ? [] : [6, 6]);
    ctx.beginPath(); ctx.moveTo(-40, y); ctx.lineTo(BOX.w + 40, y); ctx.stroke();
  }
  ctx.setLineDash([]);

  // Huruf samar = "jalan" putih dengan pinggiran tipis, supaya jelas ke mana jari bergerak
  for (const [w, col] of [[30, dark ? 'rgba(255,255,255,.28)' : 'rgba(27,42,107,.16)'], [26, dark ? '#1B4D7E' : '#FFFDF7']]) {
    ctx.strokeStyle = ctx.fillStyle = col; ctx.lineWidth = w;
    for (const st of T.strokes) {
      if (st.dot) { ctx.beginPath(); ctx.arc(st.pts[0].x, st.pts[0].y, w / 2, 0, 7); ctx.fill(); }
      else ctx.stroke(st.path);
    }
  }

  // Goresan yang sudah ditulis
  const ink = T.finished ? (rainbowGrad ||= rainbow()) : ACCENT;
  ctx.strokeStyle = ctx.fillStyle = ink; ctx.lineWidth = 15;
  T.strokes.forEach((st, i) => {
    if (i > T.si && !T.finished) return;
    const upto = (i < T.si || T.finished) ? st.pts.length - 1 : T.k;
    if (st.dot) { if (i < T.si || T.finished) { ctx.beginPath(); ctx.arc(st.pts[0].x, st.pts[0].y, 9, 0, 7); ctx.fill(); } return; }
    if (upto < 1) return;
    ctx.beginPath(); ctx.moveTo(st.pts[0].x, st.pts[0].y);
    for (let j = 1; j <= upto; j++) ctx.lineTo(st.pts[j].x, st.pts[j].y);
    ctx.stroke();
  });

  if (!T.finished) {
    const st = T.strokes[T.si], p = st.pts[T.k];
    // Panah arah di sisa jalur goresan aktif
    if (!st.dot) {
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.55)' : 'rgba(123,74,214,.55)'; ctx.lineWidth = 3.2;
      const gap = Math.round(22 / STEP);
      for (let j = T.k + gap; j < st.pts.length - 2; j += gap) {
        const a = st.pts[j - 2], b = st.pts[Math.min(j + 2, st.pts.length - 1)], c = st.pts[j];
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.beginPath();
        ctx.moveTo(c.x - 6 * Math.cos(ang - .7), c.y - 6 * Math.sin(ang - .7));
        ctx.lineTo(c.x, c.y);
        ctx.lineTo(c.x - 6 * Math.cos(ang + .7), c.y - 6 * Math.sin(ang + .7));
        ctx.stroke();
      }
    }
    // Titik hijau berdenyut = posisi pensil sekarang
    const pulse = reducedMotion ? 0 : (Math.sin(now / 250) + 1) / 2;
    ctx.fillStyle = 'rgba(63,191,98,.25)'; ctx.beginPath(); ctx.arc(p.x, p.y, 13 + pulse * 7, 0, 7); ctx.fill();
    ctx.fillStyle = '#3FBF62'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill();
    if (!reducedMotion) redraw();   // titik berdenyut: lanjutkan animasi
  }
}
let rainbowGrad = null;   // dibuat sekali, dipakai ulang setiap gambar
function rainbow(){
  const g = ctx.createLinearGradient(0, BOX.top, BOX.w, BOX.desc);
  ['#FF5D8F','#FF9F1C','#FFD23F','#3FBF62','#47C9E5','#8B5CF6'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
  return g;
}

/* Jari → titik di kotak 120x180 */
function toBox(e){
  const r = pad.getBoundingClientRect();
  return { x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s };
}
function follow(q){
  if (!T || T.finished) return;
  const st = T.strokes[T.si];
  if (st.dot) {
    if (Math.hypot(q.x - st.pts[0].x, q.y - st.pts[0].y) < TOL) strokeDone();
    return;
  }
  // Cari titik terdekat di depan posisi sekarang (tidak mundur, tidak melompat jauh).
  // Jari harus menelusuri jalur secara menyambung: kalau keluar jalur, progres berhenti,
  // dan baru lanjut lagi saat jari kembali di dekat titik hijau. Coretan asal tidak ikut menulis.
  let best = -1, bestD = TOL;
  const end = Math.min(st.pts.length - 1, T.k + AHEAD);
  for (let j = T.k; j <= end; j++) {
    const d = Math.hypot(q.x - st.pts[j].x, q.y - st.pts[j].y);
    if (d < bestD) { bestD = d; best = j; }
  }
  const tip = st.pts[T.k], nearTip = Math.hypot(q.x - tip.x, q.y - tip.y) < TOL * 1.2;
  if (best < 0 || (!T.onTrack && !nearTip && best - T.k > REENTRY)) { T.onTrack = false; return; }
  T.onTrack = true;
  if (best > T.k) { T.k = best; sTick(); redraw(); }
  if (T.k >= st.pts.length - 1 - Math.round(8 / STEP)) strokeDone();
}
function strokeDone(){
  T.si++; T.k = 0; T.onTrack = false; sStroke(); redraw();
  if (T.si < T.strokes.length) return;
  // Selesai satu karakter
  T.finished = true; T.si = T.strokes.length - 1;
  const i = info(T.ch);
  done[T.ch] = 1; save('done', done);
  count++; save('count', count);
  $('#say').textContent = i.label;
  $('#nextBtn').classList.add('ready');
  sWin();
  const r = pad.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 70);
  say(`hebat-${T.ch}`, i.done);
  if (count % PER_STAR === 0) {
    stars++; save('stars', stars);
    starTimer = setTimeout(() => toast('⭐ +1 bintang!'), 900);
  }
}

// Hanya satu jari yang menulis. Sentuhan lain (telapak tangan, jari kedua) diabaikan.
let pointer = null, starTimer = 0;
pad.addEventListener('pointerdown', e => {
  if (!T || pointer !== null) return;
  pointer = e.pointerId; T.onTrack = false; pad.setPointerCapture?.(e.pointerId); follow(toBox(e));
});
pad.addEventListener('pointermove', e => {
  if (e.pointerId !== pointer) return;
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ev of (evs.length ? evs : [e])) follow(toBox(ev));
});
// Angkat jari di dekat ujung goresan (sisa paling banyak 20 satuan) juga dihitung selesai.
const lift = e => {
  if (e.pointerId !== pointer) return;
  pointer = null;
  if (!T || T.finished) return;
  const st = T.strokes[T.si];
  if (!st.dot && T.k > 0 && (st.pts.length - 1 - T.k) * STEP <= 20) strokeDone();
};
pad.addEventListener('pointerup', lift); pad.addEventListener('pointercancel', lift);

/* ---------- Konfeti & toast ---------- */
const fx = $('#fx'), fctx = fx.getContext('2d');
let parts = [], fxRaf = 0;
function fxClear(){ fctx.save(); fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0, 0, fx.width, fx.height); fctx.restore(); }
function fxReset(){ parts = []; cancelAnimationFrame(fxRaf); fxRaf = 0; fxClear(); }
function burst(x, y, n = 36){
  if (reducedMotion) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (fx.width !== fx.clientWidth * dpr) { fx.width = fx.clientWidth * dpr; fx.height = fx.clientHeight * dpr; fctx.setTransform(dpr,0,0,dpr,0,0); }
  const cols = ['#FFD23F','#FF8FB8','#47C9E5','#7BD88F','#B98CFF'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 260;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, r: 4 + Math.random() * 5, c: cols[i % cols.length], life: 1, rot: Math.random() * 6 });
  }
  if (!fxRaf) { let last = performance.now(); const step = now => {
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    fxClear();
    for (const p of parts) {
      p.vy += 700 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * .9; p.rot += dt * 8;
      fctx.save(); fctx.globalAlpha = Math.max(0, p.life); fctx.translate(p.x, p.y); fctx.rotate(p.rot);
      fctx.fillStyle = p.c; fctx.fillRect(-p.r, -p.r * .6, p.r * 2, p.r * 1.2); fctx.restore();
    }
    parts = parts.filter(p => p.life > 0);
    fxRaf = parts.length ? requestAnimationFrame(step) : 0;
    if (!fxRaf) fxClear();
  }; fxRaf = requestAnimationFrame(step); }
}
let toastTimer = 0;
function toast(text){
  const t = $('#toast'); t.textContent = text; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

// Untuk scripts/test-trace.mjs: ubah koordinat kotak 120x180 ke koordinat layar.
window.pensilAjaibTest = { toScreen: (x, y) => { const r = pad.getBoundingClientRect(); return { x: r.left + view.ox + x * view.s, y: r.top + view.oy + y * view.s, s: view.s }; } };

/* ---------- Tombol ---------- */
$('#homeBtn').addEventListener('click', close);
$('#speakBtn').addEventListener('click', () => { if (T) { const i = info(T.ch); T.finished ? say(`hebat-${T.ch}`, i.done) : say(`tulis-${T.ch}`, i.ask); } });
$('#redoBtn').addEventListener('click', () => { if (T) open(T.ch); });
$('#nextBtn').addEventListener('click', () => { if (T) nextChar(); });
})();
