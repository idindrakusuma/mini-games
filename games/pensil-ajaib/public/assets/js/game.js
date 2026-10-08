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
const MARGIN = 15;                // ruang di atas garis atas & di bawah ekor bawah (satuan kotak)
const REENTRY = 6;                // masuk lagi ke jalur hanya di dekat titik hijau (12 satuan ke depan)
// Dibaca setiap kali dipakai, jadi pengaturan "kurangi gerakan" yang diubah di tengah sesi langsung berlaku.
const motionMQ = matchMedia('(prefers-reduced-motion: reduce)'), reducedMotion = () => motionMQ.matches;

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
// Satu tempat untuk menentukan kelompok karakter: 'besar', 'kecil', atau 'angka'.
const setOf = ch => /\d/.test(ch) ? 'angka' : ch === ch.toUpperCase() ? 'besar' : 'kecil';
function info(ch){
  if (/\d/.test(ch)) {
    const n = +ch;
    return { ask: `Ayo tulis angka ${NUMS[n]}!`, done: `Hebat! ${cap(NUMS[n])}!`,
             label: `${ch}, ${NUMS[n]}!`, pic: NUM_PICS[n].repeat(n) };
  }
  const [say, word, pic] = WORDS[ch.toUpperCase()];
  const size = setOf(ch);
  return { ask: `Ayo tulis huruf ${say} ${size}!`,
           done: word ? `Hebat! ${say}. ${word}!` : `Hebat! Huruf ${say}!`,
           label: word ? `${ch} · ${word}` : `${ch} · Hebat!`, pic: word ? pic : '⭐' };
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
function hush(){ clearTimeout(speakTimer); speakTimer = 0; if (clip) { clip.pause(); clip = null; } if ('speechSynthesis' in window) speechSynthesis.cancel(); }
let speakTimer = 0;
function say(key, text){
  // "Sibuk" juga kalau ucapan sebelumnya masih menunggu jeda (speakTimer), bukan hanya yang sedang berbunyi.
  const busy = speakTimer !== 0 || ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending));
  hush();
  if (RECORDINGS[key]) { clip = new Audio(RECORDINGS[key]); clip.play().catch(() => {}); return; }
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = .85; u.pitch = 1.15;
  // Beberapa browser membuang ucapan yang dipanggil di task yang sama dengan cancel(): beri jeda
  // singkat kalau masih ada yang diucapkan. Ucapan pertama (tanpa cancel) tetap langsung, karena
  // iOS mewajibkannya terjadi di dalam ketukan pengguna.
  if (busy) speakTimer = setTimeout(() => { speakTimer = 0; speechSynthesis.speak(u); }, 60); else speechSynthesis.speak(u);
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
// Bintang dari 5 karakter BERBEDA yang selesai: mengulang huruf yang sama dalam satu putaran
// bintang tidak menambah hitungan. Setelah bintang didapat, hitungan mulai lagi dari nol.
// Isi localStorage bisa rusak/beda bentuk: validasi tipe sebelum dipakai.
const loadNum = (k, d) => { const v = load(k, d); return Number.isInteger(v) && v >= 0 ? v : d; };
const loadArr = k => { const v = load(k, []); return Array.isArray(v) ? v.filter(x => typeof x === 'string') : []; };
const loadObj = k => { const v = load(k, {}); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; };
let stars = loadNum('stars', 0), pending = new Set(loadArr('pending'));
const done = loadObj('done');        // { 'A': 1, 'a': 1, ... } — kunci peka huruf besar/kecil
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Jalur → titik ---------- */
const measure = $('#measure'), NS = 'http://www.w3.org/2000/svg';
const parseDot = d => { const [, x, y] = d.split(' ').map(Number); return { x, y }; };   // "dot X Y"
const cache = {};
function strokesOf(ch){
  if (cache[ch]) return cache[ch];
  return cache[ch] = STROKES[ch].map(d => {
    if (d.startsWith('dot')) return { dot: true, d, pts: [parseDot(d)] };
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
    ? (({ x, y }) => `<circle cx="${x}" cy="${y}" r="4" fill="currentColor" stroke-width="5"/>`)(parseDot(d))
    : `<path d="${d}" fill="none" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  return `<svg viewBox="0 10 120 165" aria-hidden="true">${parts}</svg>`;
}
// Label untuk pembaca layar: bedakan huruf besar/kecil ("A besar", "a kecil", "angka 3").
const labelOf = ch => setOf(ch) === 'angka' ? `angka ${ch}` : `${ch} ${setOf(ch)}`;
// Tambahkan tanda ✓ ke tombol yang baru selesai, tanpa membangun ulang seluruh grid.
function markDone(){
  document.querySelectorAll('#grid .ch').forEach(b => {
    if (done[b.dataset.ch] && !b.querySelector('.ok')) b.insertAdjacentHTML('beforeend', '<span class="ok" aria-hidden="true">✓</span>');
  });
}
function renderGrid(){
  document.querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.set === tab;
    t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1;   // pola tab ARIA: hanya tab aktif di urutan Tab
    if (on) $('#grid').setAttribute('aria-labelledby', t.id);
  });
  $('#grid').innerHTML = SETS[tab].map(ch =>
    `<button class="ch" data-ch="${ch}" aria-label="${labelOf(ch)}">${glyphSvg(ch)}${done[ch] ? '<span class="ok" aria-hidden="true">✓</span>' : ''}</button>`).join('');
}
const tabs = [...document.querySelectorAll('.tab')];
tabs.forEach(t => t.addEventListener('click', () => { tab = t.dataset.set; renderGrid(); }));
// Panah kiri/kanan (dan Home/End) berpindah tab, sesuai pola tab ARIA.
$('.tabs').addEventListener('keydown', e => {
  const i = tabs.findIndex(t => t.dataset.set === tab);
  const j = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
  if (j === undefined) return;
  e.preventDefault();
  const t = tabs[(j + tabs.length) % tabs.length]; tab = t.dataset.set; renderGrid(); t.focus();
});
$('#grid').addEventListener('click', e => { const b = e.target.closest('.ch'); if (b) { audio(); open(b.dataset.ch); } });
renderGrid();

/* ---------- Papan menulis ---------- */
const play = $('#play'), pad = $('#pad'), ctx = pad.getContext('2d');
let T = null;          // { ch, strokes, si (goresan aktif), k (titik terjauh), finished, onTrack }
let view = { s: 1, ox: 0, oy: 0 }, raf = 0;
// Warna diambil dari token CSS saat menggambar, jadi selalu sama dengan tema halaman.
const token = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
let colors = null;   // di-cache; dikosongkan saat tema berganti
const readColors = () => ({ lane: token('--card', '#FFFDF7'), accent: token('--accent', '#B98CFF') });

function resize(){
  const dpr = Math.min(2, devicePixelRatio || 1), W = pad.clientWidth, H = pad.clientHeight;
  const bw = Math.round(W * dpr), bh = Math.round(H * dpr);
  if (pad.width !== bw || pad.height !== bh) { pad.width = bw; pad.height = bh; }   // hindari alokasi ulang yang tidak perlu
  // Area yang ditampilkan: dari 15 satuan di atas garis atas sampai 15 satuan di bawah ekor bawah.
  const top = BOX.top - MARGIN, span = BOX.desc + MARGIN - top;
  const s = Math.min(W / BOX.w, H / span) * .96;
  view = { s, dpr, ox: (W - BOX.w * s) / 2, oy: (H - span * s) / 2 - top * s };
}
// Ukur ulang setiap kali ukuran papan berubah (rotasi layar, teks di atasnya berganti baris, font termuat).
// Gambar langsung (bukan di frame berikutnya) supaya papan tidak berkedip kosong.
new ResizeObserver(() => { if (T) { resize(); drawNow(); } }).observe(pad);
// Zoom browser / pindah ke layar lain mengubah devicePixelRatio tanpa mengubah ukuran CSS.
(function watchDpr(){
  matchMedia(`(resolution: ${devicePixelRatio}dppx)`).addEventListener?.('change', () => {
    if (T) { resize(); drawNow(); }
    watchDpr();
  }, { once: true });
})();

// Mode gelap: ikuti pengaturan perangkat (sama seperti CSS).
const darkMQ = matchMedia('(prefers-color-scheme: dark)');
const isDark = () => darkMQ.matches;
darkMQ.addEventListener?.('change', () => { colors = null; invalidate(); });

// Gambar hanya saat ada yang berubah. Loop animasi hanya berjalan selama titik hijau berdenyut.
function redraw(){ if (T && !raf) raf = requestAnimationFrame(draw); }
function drawNow(){ cancelAnimationFrame(raf); raf = 0; dirty = true; draw(performance.now()); }

function open(ch){
  T = { ch, strokes: strokesOf(ch), si: 0, k: 0, finished: false, onTrack: false };
  pointer = null;
  const i = info(ch);
  $('#chip').textContent = ch;
  $('#say').textContent = 'Ikuti titik hijau, ya!';
  $('#nextBtn').classList.remove('ready');
  const opening = !play.classList.contains('on');
  // Grid di belakang dibuat inert (tetap tampil & posisi scroll terjaga, tapi tidak bisa difokus/diklik).
  play.classList.add('on'); $('#home').inert = true; fxReset(); resize();
  // Baru dibuka dari grid: fokus ke area main (bukan tombol), jadi Enter tidak memicu apa-apa.
  // Dari ▶/↺ di dalam papan, fokus dibiarkan di tombol itu.
  if (opening) play.focus({ preventScroll: true });
  say(`tulis-${ch}`, i.ask);
  lastInput = performance.now(); drawNow();
}
function close(){
  const ch = T?.ch;
  T = null; cancelAnimationFrame(raf); raf = 0; pointer = null; hush(); fxReset();
  $('#toast').classList.remove('on');
  play.classList.remove('on'); $('#home').inert = false; markDone(); showStars();
  if (ch) document.querySelector(`.ch[data-ch="${ch}"]`)?.focus();   // kembali ke huruf terakhir (scroll ke sana kalau perlu)
}
function nextChar(){
  const list = SETS[setOf(T.ch)];
  open(list[(list.indexOf(T.ch) + 1) % list.length]);
}

// Lapisan statis (garis bantu, jalur, goresan, panah) digambar ke canvas cadangan hanya saat
// ada perubahan. Tiap frame animasi cukup menyalin lapisan itu lalu menggambar titik hijau.
const bg = document.createElement('canvas'), bctx = bg.getContext('2d');
let lastInput = performance.now();
let dirty = true;
function invalidate(){ dirty = true; redraw(); }
// Ada sentuhan/gerakan: catat waktunya dan nyalakan lagi denyut titik hijau kalau sempat berhenti.
function wake(){ lastInput = performance.now(); redraw(); }
// Tinta baru saja (dari titik a ke b) langsung ke lapisan statis, tanpa menggambar ulang semuanya.
function inkSegment(st, a, b){
  if (dirty) return redraw();   // gambar ulang penuh sudah dijadwalkan dan akan mencakup tinta ini
  const c = bctx; c.strokeStyle = (colors ||= readColors()).accent; c.lineWidth = 15;
  c.beginPath(); c.moveTo(st.pts[a].x, st.pts[a].y);
  for (let j = a + 1; j <= b; j++) c.lineTo(st.pts[j].x, st.pts[j].y);
  c.stroke(); redraw();
}

function paintStatic(){
  const { s, dpr, ox, oy } = view, c = bctx;
  if (bg.width !== pad.width || bg.height !== pad.height) { bg.width = pad.width; bg.height = pad.height; }
  c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, bg.width, bg.height);
  c.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const dark = isDark(), { lane, accent } = (colors ||= readColors());

  // Garis bantu: atas, tengah, dasar
  c.lineWidth = 1.2 / s * 2;
  for (const [y, solid] of [[BOX.top, 0], [BOX.mid, 0], [BOX.base, 1]]) {
    c.strokeStyle = dark ? 'rgba(255,255,255,.18)' : 'rgba(27,42,107,.14)';
    c.setLineDash(solid ? [] : [6, 6]);
    c.beginPath(); c.moveTo(-40, y); c.lineTo(BOX.w + 40, y); c.stroke();
  }
  c.setLineDash([]);

  // Huruf samar = "jalan" putih dengan pinggiran tipis, supaya jelas ke mana jari bergerak
  for (const [w, col] of [[30, dark ? 'rgba(255,255,255,.28)' : 'rgba(27,42,107,.16)'], [26, lane]]) {
    c.strokeStyle = c.fillStyle = col; c.lineWidth = w;
    for (const st of T.strokes) {
      if (st.dot) { c.beginPath(); c.arc(st.pts[0].x, st.pts[0].y, w / 2, 0, 7); c.fill(); }
      else c.stroke(st.path);
    }
  }

  // Goresan yang sudah ditulis
  const ink = T.finished ? (rainbowGrad ||= rainbow()) : accent;
  c.strokeStyle = c.fillStyle = ink; c.lineWidth = 15;
  T.strokes.forEach((st, i) => {
    if (i > T.si && !T.finished) return;
    const upto = (i < T.si || T.finished) ? st.pts.length - 1 : T.k;
    if (st.dot) { if (i < T.si || T.finished) { c.beginPath(); c.arc(st.pts[0].x, st.pts[0].y, 9, 0, 7); c.fill(); } return; }
    if (upto < 1) return;
    c.beginPath(); c.moveTo(st.pts[0].x, st.pts[0].y);
    for (let j = 1; j <= upto; j++) c.lineTo(st.pts[j].x, st.pts[j].y);
    c.stroke();
  });

  // Panah arah di sisa jalur goresan aktif
  const st = T.strokes[T.si];
  if (!T.finished && !st.dot) {
    c.strokeStyle = dark ? 'rgba(255,255,255,.55)' : 'rgba(123,74,214,.55)'; c.lineWidth = 3.2;
    const gap = Math.round(22 / STEP);
    // Posisi panah tetap di sepanjang goresan (bukan relatif ke pensil), jadi tinta bertahap
    // dan gambar ulang penuh menghasilkan gambar yang sama.
    for (let j = gap; j < st.pts.length - 2; j += gap) {
      if (j <= T.k) continue;
      const a = st.pts[j - 2], b = st.pts[Math.min(j + 2, st.pts.length - 1)], m = st.pts[j];
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      c.beginPath();
      c.moveTo(m.x - 6 * Math.cos(ang - .7), m.y - 6 * Math.sin(ang - .7));
      c.lineTo(m.x, m.y);
      c.lineTo(m.x - 6 * Math.cos(ang + .7), m.y - 6 * Math.sin(ang + .7));
      c.stroke();
    }
  }
  dirty = false;
}

function draw(now){
  raf = 0;
  if (!T) return;
  if (dirty) paintStatic();
  const { s, dpr, ox, oy } = view;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, pad.width, pad.height);
  ctx.drawImage(bg, 0, 0);
  if (T.finished) return;
  // Titik hijau berdenyut = posisi pensil sekarang
  const p = T.strokes[T.si].pts[T.k];
  ctx.setTransform(s * dpr, 0, 0, s * dpr, ox * dpr, oy * dpr);
  // Denyut berhenti setelah 6 detik tanpa sentuhan (hemat baterai); sentuhan berikutnya menyalakannya lagi.
  const idle = now - lastInput > 6000, pulse = reducedMotion() || idle ? 0 : (Math.sin(now / 250) + 1) / 2;
  ctx.fillStyle = 'rgba(63,191,98,.25)'; ctx.beginPath(); ctx.arc(p.x, p.y, 13 + pulse * 7, 0, 7); ctx.fill();
  ctx.fillStyle = '#3FBF62'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p.x, p.y, 3.5, 0, 7); ctx.fill();
  if (!reducedMotion() && !idle) redraw();   // titik berdenyut: lanjutkan animasi (hanya menyalin lapisan statis)
}
let rainbowGrad = null;   // dibuat sekali, dipakai ulang setiap gambar
function rainbow(){
  const g = bctx.createLinearGradient(0, BOX.top, BOX.w, BOX.desc);
  ['#FF5D8F','#FF9F1C','#FFD23F','#3FBF62','#47C9E5','#8B5CF6'].forEach((c, i, a) => g.addColorStop(i / (a.length - 1), c));
  return g;
}

/* Jari → titik di kotak 120x180 */
function toBox(e, r = pad.getBoundingClientRect()){
  return { x: (e.clientX - r.left - view.ox) / view.s, y: (e.clientY - r.top - view.oy) / view.s };
}
function follow(q){
  // Setelah satu goresan selesai, jari harus diangkat dulu: sisa gerakan yang sama tidak boleh
  // langsung "masuk" ke goresan berikutnya walau awalnya dekat (misalnya kaki R dan K).
  if (!T || T.finished || T.needLift) return;
  const st = T.strokes[T.si];
  if (st.dot) {
    if (Math.hypot(q.x - st.pts[0].x, q.y - st.pts[0].y) < TOL) strokeDone();
    return;
  }
  // Cari titik terdekat di depan posisi sekarang (tidak mundur, tidak melompat jauh).
  // Jari harus menelusuri jalur secara menyambung: kalau keluar jalur, progres berhenti,
  // dan baru lanjut lagi saat jari kembali di dekat titik hijau. Coretan asal tidak ikut menulis.
  // Saat keluar jalur, masuk lagi hanya boleh di dekat titik hijau (jendela REENTRY), bukan sejauh AHEAD.
  let best = -1, bestD = TOL;
  const end = Math.min(st.pts.length - 1, T.k + (T.onTrack ? AHEAD : REENTRY));
  for (let j = T.k; j <= end; j++) {
    const d = Math.hypot(q.x - st.pts[j].x, q.y - st.pts[j].y);
    if (d < bestD) { bestD = d; best = j; }
  }
  // Masuk lagi setelah keluar jalur: jari harus dekat titik hijau itu sendiri.
  const tip = st.pts[T.k];
  if (best < 0 || (!T.onTrack && Math.hypot(q.x - tip.x, q.y - tip.y) > TOL)) { T.onTrack = false; return; }
  T.onTrack = true;
  if (best > T.k) { const from = T.k; T.k = best; sTick(); inkSegment(st, from, best); }
  if (T.k >= st.pts.length - 1 - Math.round(8 / STEP)) strokeDone();
}
function strokeDone(){
  T.si++; T.k = 0; T.onTrack = false; T.needLift = true; sStroke(); invalidate();
  if (T.si < T.strokes.length) return;
  // Selesai satu karakter
  T.finished = true; T.si = T.strokes.length - 1;
  const i = info(T.ch);
  done[T.ch] = 1; save('done', done);
  pending.add(T.ch); save('pending', [...pending]);
  // Gambar (emoji, bisa berulang untuk angka) disembunyikan dari pembaca layar; teksnya tetap dibacakan.
  $('#say').textContent = i.label + ' ';
  if (i.pic) { const pic = document.createElement('span'); pic.setAttribute('aria-hidden', 'true'); pic.textContent = i.pic; $('#say').append(pic); }
  $('#nextBtn').classList.add('ready');
  sWin();
  const r = pad.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, 70);
  say(`hebat-${T.ch}`, i.done);
  if (pending.size >= PER_STAR) {
    pending.clear(); save('pending', []);
    stars++; save('stars', stars);
    // Sengaja tidak dibatalkan saat ▶/↺: hadiah tetap terlihat ~2 detik walau anak langsung lanjut.
    toast('⭐ +1 bintang!');
  }
}

// Hanya satu jari yang menulis. Sentuhan lain (telapak tangan, jari kedua) diabaikan.
let pointer = null, pointerType = '';
pad.addEventListener('pointerdown', e => {
  // Hanya tombol utama (klik kiri / sentuhan / pena).
  if (!T || e.button !== 0) return;
  // Sentuhan seukuran telapak tangan diabaikan (jika browser melaporkan ukuran sentuhan).
  // Tolak kalau LUAS kontak > 60x60 (3600px², telapak tangan) ATAU salah satu sisi > 90px (sisi tangan
  // yang tipis-panjang, mis. 130x27). Jari balita yang ditekan rata dan agak lonjong (mis. 65x35)
  // tetap diterima. Browser yang tidak melaporkan ukuran memberi 1x1, jadi selalu diterima.
  if (e.pointerType === 'touch' && (e.width * e.height > 3600 || Math.max(e.width, e.height) > 90)) return;
  // Pointer utama baru boleh mengambil alih kunci (supaya tidak macet kalau pointerup hilang),
  // tapi sentuhan tidak boleh merebut dari pena (telapak tangan saat menulis dengan stylus).
  // Pena yang masih menempel (walau diam) tetap memegang kunci; kunci pena dilepas begitu pena
  // terdeteksi terangkat (lihat pointermove & lostpointercapture di bawah), bukan dengan timer.
  if (pointer !== null && (!e.isPrimary || (pointerType === 'pen' && e.pointerType !== 'pen'))) return;
  pointerType = e.pointerType;
  pointer = e.pointerId; T.onTrack = false; T.needLift = false; wake();
  try { pad.setPointerCapture(e.pointerId); } catch (err) { /* pointer sudah tidak aktif: abaikan */ }
  follow(toBox(e));
});
// Pointerup pena bisa hilang. Pena yang melayang tanpa menekan (buttons === 0) atau keluar dari papan
// berarti sudah terangkat: lepaskan kuncinya supaya jari bisa menulis lagi.
// Diperlakukan seperti pointerup lewat lift(), jadi aturan "angkat dekat ujung = selesai" tetap berlaku.
// Ujung pena dianggap terangkat kalau bit tombol utama (tip) tidak aktif DAN tekanannya 0 (beberapa
// driver mengirim buttons=0 saat pena masih menempel, tapi tetap dengan tekanan > 0).
const penLifted = e => e.pointerType === 'pen' && e.pointerId === pointer && !(e.buttons & 1) && !e.pressure;
pad.addEventListener('pointermove', e => {
  if (penLifted(e)) { lift(e); return; }
  if (e.pointerId !== pointer) return;
  wake();
  const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e], r = pad.getBoundingClientRect();   // ukur sekali per event
  for (const ev of (evs.length ? evs : [e])) follow(toBox(ev, r));
});
// Angkat jari di dekat ujung goresan juga dihitung selesai: sisa paling banyak 20 satuan
// DAN paling banyak 25% panjang goresan (supaya goresan pendek tidak selesai setengah jalan).
const lift = e => {
  if (e.pointerId !== pointer) return;
  pointer = null;
  if (!T || T.finished) return;
  const st = T.strokes[T.si];
  const left = st.pts.length - 1 - T.k;
  if (!st.dot && T.k > 0 && left * STEP <= 20 && left <= (st.pts.length - 1) * .25) strokeDone();
};
// Didengarkan di window: tetap tertangkap walau jari/mouse dilepas di luar papan atau capture gagal.
// pointercancel (gestur sistem, notifikasi) hanya melepas kunci; progres tidak dihitung selesai.
addEventListener('pointerup', lift);
addEventListener('pointercancel', e => { if (e.pointerId === pointer) pointer = null; });
// Kalau browser melepas capture tanpa pointerup (misalnya gestur sistem), lepaskan kunci satu jari.
pad.addEventListener('lostpointercapture', e => { if (e.pointerId === pointer) lift(e); });   // aturan "dekat ujung" tetap berlaku

/* ---------- Konfeti & toast ---------- */
const fx = $('#fx'), fctx = fx.getContext('2d');
let parts = [], fxRaf = 0;
function fxClear(){ fctx.save(); fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0, 0, fx.width, fx.height); fctx.restore(); }
function fxReset(){ parts = []; cancelAnimationFrame(fxRaf); fxRaf = 0; fxClear(); }
function burst(x, y, n = 36){
  if (reducedMotion()) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const fw = Math.round(fx.clientWidth * dpr), fh = Math.round(fx.clientHeight * dpr);
  if (fx.width !== fw || fx.height !== fh) { fx.width = fw; fx.height = fh; fctx.setTransform(dpr,0,0,dpr,0,0); }
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

// Untuk scripts/test-trace.mjs (hanya aktif dengan ?test di URL): ubah koordinat kotak ke koordinat layar.
if (new URLSearchParams(location.search).has('test')) window.pensilAjaibTest = { toScreen: (x, y) => { const r = pad.getBoundingClientRect(); return { x: r.left + view.ox + x * view.s, y: r.top + view.oy + y * view.s, s: view.s }; } };

/* ---------- Tombol ---------- */
$('#homeBtn').addEventListener('click', close);
$('#speakBtn').addEventListener('click', () => { if (T) { const i = info(T.ch); T.finished ? say(`hebat-${T.ch}`, i.done) : say(`tulis-${T.ch}`, i.ask); } });
$('#redoBtn').addEventListener('click', () => { if (T) open(T.ch); });
$('#nextBtn').addEventListener('click', () => { if (T) nextChar(); });

})();
