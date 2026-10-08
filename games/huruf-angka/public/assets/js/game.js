/* Huruf & Angka · flash card untuk balita.
   Dua mode: Tebak (dengar lalu ketuk kartu yang benar) dan Urutkan (ketuk kartu
   sesuai urutan). Saat soal tampilan dibuat tenang; kemeriahan hanya saat benar. */
(() => {
const $ = s => document.querySelector(s);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a).slice(0, n);
const STORE = 'hurufAngka';
const ROUND = 5;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Data ---------- */
// [huruf, cara baca, kata, gambar]
const LETTERS = [
  ['A','a','Apel','🍎'], ['B','be','Bola','⚽'], ['C','ce','Cicak','🦎'], ['D','de','Domba','🐑'],
  ['E','e','Es krim','🍦'], ['F','ef','Foto','📷'], ['G','ge','Gajah','🐘'], ['H','ha','Harimau','🐯'],
  ['I','i','Ikan','🐟'], ['J','je','Jeruk','🍊'], ['K','ka','Kucing','🐱'], ['L','el','Lebah','🐝'],
  ['M','em','Mobil','🚗'], ['N','en','Nanas','🍍'], ['O','o','Ombak','🌊'], ['P','pe','Pisang','🍌'],
  ['Q','ki','','⭐'], ['R','er','Roti','🍞'], ['S','es','Sapi','🐄'], ['T','te','Tomat','🍅'],
  ['U','u','Ular','🐍'], ['V','ve','Vas bunga','🌷'], ['W','we','Wortel','🥕'], ['X','eks','Xilofon','🎶'],
  ['Y','ye','Yoyo','🪀'], ['Z','zet','Zebra','🦓'],
].map(([glyph, say, word, pic]) => ({
  glyph, say, pic,
  // Q tidak punya kata benda sehari-hari yang akrab untuk balita: cukup sebut hurufnya.
  reveal: glyph === 'Q' ? `${say}! Pintar!` : `${say}. ${word}!`,
  label: glyph === 'Q' ? 'Pintar!' : `${glyph}, ${word}!`,
}));
const COUNT_PICS = ['🐥','🍎','⭐','🐟','🎈','🍓','🐞','🌸','🍪','🚗'];
const NUM_WORDS = ['satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh'];
const NUMBERS = NUM_WORDS.map((w, i) => ({
  glyph: String(i + 1), say: w, pic: COUNT_PICS[i].repeat(i + 1), count: i + 1,
  reveal: `${w[0].toUpperCase() + w.slice(1)}!`, label: `${i + 1}, ${w}!`,
}));
const SETS = { huruf: LETTERS, angka: NUMBERS };

/* ---------- Suara ----------
   Semua ucapan lewat say(key, teks). Untuk memakai rekaman suara asli nanti,
   isi RECORDINGS dengan key yang sama, misalnya:
     'mana-huruf-B': 'assets/audio/mana-huruf-b.mp3'
   Key yang dipakai: mana-<set>-<glyph>, benar-<set>-<glyph>, nama-<set>-<glyph>,
   urut-<set>-<glyph pertama>-<jumlah kartu>, urutkan, coba-lagi, hore. */
const RECORDINGS = {};
let voice = null, clip = null;
function pickVoice(){
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find(v => /^id([-_]|$)/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
function hush(){
  if (clip) { clip.pause(); clip = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function say(key, text){
  hush();
  if (RECORDINGS[key]) { clip = new Audio(RECORDINGS[key]); clip.play().catch(() => {}); return; }
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID'; if (voice) u.voice = voice;
  u.rate = .85; u.pitch = 1.15;
  speechSynthesis.speak(u);
}

/* Efek suara (Web Audio, tanpa file) */
let ac = null;
function audio(){ if(!ac){ try{ ac = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac && ac.state==='suspended') ac.resume(); return ac; }
function tone(f1,f2,dur,type='sine',vol=.18,delay=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.02);
}
const sRight = () => { tone(660,990,.12,'triangle',.16); tone(990,1320,.16,'triangle',.12,.1); };
const sWrong = () => tone(330,260,.18,'sine',.1);
const sWin = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.16,i*.12));

/* ---------- Bintang & tingkat kesulitan (per perangkat) ---------- */
const load = (k, d) => { try { const v = localStorage.getItem(`${STORE}.${k}`); return v == null ? d : JSON.parse(v); } catch(e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(`${STORE}.${k}`, JSON.stringify(v)); } catch(e) {} };
// Isi localStorage bisa rusak/beda bentuk: validasi tipe sebelum dipakai.
const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
const loadNum = (k, d) => { const v = load(k, d); return Number.isFinite(v) && v >= 0 ? v : d; };
const loadObj = k => { const v = load(k, {}); return isObj(v) ? v : {}; };
let stars = loadNum('stars', 0);
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

// Tebak: jumlah kartu pilihan. Urutkan: jumlah kartu yang diurutkan.
const LEVELS = { tebak: [2, 3, 4], urut: [3, 4, 5] };
const progress = loadObj('level');   // { 'huruf-tebak': { lv, streak }, ... }
const prog = key => (isObj(progress[key]) ? progress[key] : (progress[key] = { lv: 0, streak: 0 }));
// Level dari localStorage bisa rusak atau lebih besar dari daftar level: batasi ke rentang yang ada.
const levelOf = (key, game) => { const lv = Math.trunc(prog(key).lv) || 0; return Math.max(0, Math.min(LEVELS[game].length - 1, lv)); };
function adapt(key, game, mistakes){
  const p = prog(key), max = LEVELS[game].length - 1;
  p.lv = levelOf(key, game); p.streak = Math.trunc(p.streak) || 0;   // normalkan nilai lama/rusak dulu
  if (mistakes <= 1) { if (++p.streak >= 2 && p.lv < max) { p.lv++; p.streak = 0; } }
  else if (mistakes >= 4) { p.lv = Math.max(0, p.lv - 1); p.streak = 0; }
  else p.streak = 0;
  save('level', progress);
}

/* ---------- Tata letak kartu ---------- */
// Cari susunan kolom yang membuat kartu (rasio 3:4) sebesar mungkin di ruang yang ada.
// Hanya susunan seimbang: setiap baris terisi penuh kecuali baris terakhir yang kurang paling banyak
// satu kartu (4 → 4 atau 2×2, 5 → 5 atau 3+2, 3 → 3 atau 2+1). Susunan 4 → 3+1 ditolak.
function fit(n, W, H, max, gap){
  let best = { size: 0, cols: n };
  for (let rows = 1; rows <= n; rows++) {
    const cols = Math.ceil(n / rows);
    if (Math.ceil(n / cols) !== rows) continue;
    const w = Math.min(max, (W - (cols - 1) * gap) / cols, ((H - (rows - 1) * gap) / rows) * 3 / 4);
    // Baris lebih sedikit lebih enak dilihat; tambah baris hanya kalau kartu jadi jauh lebih besar.
    if (w > best.size * 1.25) best = { size: Math.floor(w), cols };
  }
  return best;
}
// Batasi lebar wadah agar kartu benar-benar membungkus sesuai jumlah kolom pilihan fit().
// Jarak antarkartu dibaca dari CSS (.cards gap), bukan disalin ke sini.
const gapOf = el => parseFloat(getComputedStyle(el).columnGap) || 0;
function layout(n, W, H, max){
  const gap = gapOf(cardsEl), { size, cols } = fit(n, W, H, max, gap);
  cardsEl.style.maxWidth = (cols * size + (cols - 1) * gap) + 'px';
  return size;
}
function makeCard(item){
  const b = document.createElement('button');
  b.className = 'card';
  b.innerHTML = `<span class="glyph"></span><span class="pic" aria-hidden="true"></span>`;
  b.querySelector('.glyph').textContent = item.glyph;
  const pic = b.querySelector('.pic');
  pic.textContent = item.pic;
  if (item.count > 3) { pic.style.fontSize = `calc(var(--size) * ${item.count > 6 ? .13 : .17})`; pic.style.maxWidth = '92%'; pic.style.whiteSpace = 'normal'; pic.style.wordBreak = 'break-all'; }
  b.setAttribute('aria-label', item.glyph);
  return b;
}

/* ---------- Konfeti (hanya saat benar) ---------- */
const fx = $('#fx'), fctx = fx.getContext('2d');
let parts = [], fxRaf = 0;
// Hapus pakai ukuran piksel canvas (bukan clientWidth, yang 0 saat layar main disembunyikan).
function fxClear(){ fctx.save(); fctx.setTransform(1,0,0,1,0,0); fctx.clearRect(0, 0, fx.width, fx.height); fctx.restore(); }
function fxReset(){ parts = []; cancelAnimationFrame(fxRaf); fxRaf = 0; fxClear(); }
function burst(x, y, n = 36){
  if (reducedMotion) return;
  const dpr = Math.min(2, devicePixelRatio || 1);
  const fw = Math.round(fx.clientWidth * dpr), fh = Math.round(fx.clientHeight * dpr);
  if (fx.width !== fw || fx.height !== fh) { fx.width = fw; fx.height = fh; fctx.setTransform(dpr,0,0,dpr,0,0); }
  const cols = ['#FFD23F','#FF8FB8','#47C9E5','#7BD88F','#B98CFF'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = 160 + Math.random() * 260;
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, r: 4 + Math.random() * 5, c: pick(cols), life: 1, rot: Math.random() * 6 });
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
const centerOf = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

/* ---------- Ronde ---------- */
const play = $('#play'), cardsEl = $('#cards'), slotsEl = $('#slots'), askEl = $('#ask');
let S = null;        // state ronde: { set, game, key, n, q, mistakes, targets, ... }
let timer = 0;
const later = (fn, ms) => { clearTimeout(timer); timer = setTimeout(fn, ms); };

// Kenalan: 5 kartu berurutan per sesi, lanjut dari posisi terakhir (A–E, F–J, ...).
const kenal = loadObj('kenal');
const kenalPos = set => { const v = Math.trunc(kenal[set]); return Number.isFinite(v) && v >= 0 ? v : 0; };

function start(set, game){
  const key = `${set}-${game}`, items = SETS[set];
  const n = game === 'kenal' ? 1 : LEVELS[game][levelOf(key, game)];
  S = { set, game, key, n, q: 0, mistakes: 0, items };
  if (game === 'kenal') {
    const from = kenalPos(set) % items.length;
    S.targets = Array.from({ length: ROUND }, (_, i) => items[(from + i) % items.length]);
  }
  else if (game === 'tebak') S.targets = sample(items, ROUND);
  else {
    const starts = shuffle([...Array(items.length - n + 1).keys()]);
    S.targets = Array.from({ length: ROUND }, (_, i) => starts[i % starts.length]);
  }
  $('#winSheet').classList.remove('on'); fxReset();
  play.classList.add('on');
  question();
}

function dots(){
  $('#dots').innerHTML = Array.from({ length: ROUND }, (_, i) => `<i class="${i < S.q ? 'done' : i === S.q ? 'now' : ''}"></i>`).join('');
}

// Ukuran kartu (dan slot) dari ruang yang tersedia: tinggi papan dikurangi teks soal,
// jarak antarbaris (22px) dan padding. Dipanggil saat soal dibuat dan saat ukuran papan berubah.
function sizes(){
  const board = $('.board'), cs = getComputedStyle(board), rowGap = parseFloat(cs.rowGap) || 0;
  const W = Math.min(board.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), 640);
  let H = board.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - askEl.offsetHeight - rowGap;
  if (S.game === 'kenal') return { size: layout(1, W, H - $('#nav').offsetHeight - rowGap, 260) };
  if (S.game === 'tebak') return { size: layout(S.n, W, H, 180) };
  const slotGap = gapOf(slotsEl);
  const slotSize = Math.floor(Math.min(110, (W - (S.n - 1) * slotGap) / S.n, H * .22 * 3 / 4));
  H -= slotSize * 4 / 3 + rowGap;
  return { size: layout(S.n, W, H, 160), slotSize };
}
// Rotasi layar / bilah alamat menyusut: ukur ulang kartu yang sedang tampil tanpa mengganti soal.
new ResizeObserver(() => {
  if (!S || !play.classList.contains('on')) return;
  const { size, slotSize } = sizes();
  cardsEl.querySelectorAll('.card').forEach(c => c.style.setProperty('--size', size + 'px'));
  if (slotSize) slotsEl.querySelectorAll('.slot').forEach(s => s.style.setProperty('--size', slotSize + 'px'));
}).observe($('.board'));

function question(){
  clearTimeout(timer); dots();
  cardsEl.innerHTML = ''; slotsEl.innerHTML = ''; S.locked = false; S.wrong = 0;
  $('#nav').hidden = S.game !== 'kenal';
  askEl.textContent = S.game === 'kenal' ? S.targets[S.q].label
    : S.game === 'tebak' ? `🔊 Mana ${S.set}nya?`
    : S.set === 'angka' ? 'Urutkan dari yang terkecil!' : 'Urutkan dari yang pertama!';
  const { size, slotSize } = sizes();
  if (S.game === 'kenal') {
    const item = S.targets[S.q];
    const c = makeCard(item); c.style.setProperty('--size', size + 'px'); c.classList.add('show');
    c.addEventListener('click', () => { if (swiped) { swiped = false; return; } if (!S.locked) ask(); });
    cardsEl.append(c);
    $('#prevBtn').disabled = S.q === 0;
  } else if (S.game === 'tebak') {
    const target = S.targets[S.q];
    const others = sample(S.items.filter(i => i !== target), S.n - 1);
    S.target = target; S.choices = shuffle([target, ...others]);
    for (const item of S.choices) {
      const c = makeCard(item); c.style.setProperty('--size', size + 'px');
      c.addEventListener('click', () => tapGuess(c, item));
      cardsEl.append(c);
    }
  } else {
    const seq = S.items.slice(S.targets[S.q], S.targets[S.q] + S.n);
    let order; do { order = shuffle(seq); } while (order.every((x, i) => x === seq[i]));
    S.seq = seq; S.step = 0;
    for (let i = 0; i < S.n; i++) { const s = document.createElement('div'); s.className = 'slot'; s.style.setProperty('--size', slotSize + 'px'); slotsEl.append(s); }
    for (const item of order) {
      const c = makeCard(item); c.style.setProperty('--size', size + 'px');
      c.addEventListener('click', () => tapOrder(c, item));
      cardsEl.append(c);
    }
  }
  ask();
}

function ask(){
  if (S.game === 'kenal') { const it = S.targets[S.q]; say(`benar-${S.set}-${it.glyph}`, it.reveal); }
  else if (S.game === 'tebak') say(`mana-${S.set}-${S.target.glyph}`, `Mana ${S.set} ${S.target.say}?`);
  else say('urutkan', S.set === 'angka' ? 'Urutkan angkanya, dari yang paling kecil!' : 'Urutkan hurufnya, dari yang pertama!');
}

function miss(card, correctCard){
  S.mistakes++; S.wrong++; sWrong();
  card.classList.remove('wrong'); void card.offsetWidth; card.classList.add('wrong');
  say('coba-lagi', 'Hmm, coba lagi ya!');
  if (S.wrong >= 2) correctCard.classList.add('hint');
}

function tapGuess(card, item){
  if (S.locked || card.dataset.tapped) return;
  if (item !== S.target) {
    card.dataset.tapped = '1';   // ketukan ganda pada kartu salah dihitung sekali
    miss(card, [...cardsEl.children][S.choices.indexOf(S.target)]);
    setTimeout(() => card.classList.add('gone'), 450);
    return;
  }
  S.locked = true; sRight();
  [...cardsEl.children].forEach(c => { if (c !== card) c.classList.add('gone'); });
  card.classList.remove('hint'); card.classList.add('right', 'pic-on');
  burst(...centerOf(card));
  askEl.textContent = item.label;
  say(`benar-${S.set}-${item.glyph}`, item.reveal);
  later(next, 2400);
}

function tapOrder(card, item){
  if (S.locked || card.classList.contains('used')) return;
  const want = S.seq[S.step];
  if (item !== want) {
    if (card.dataset.missedAt === String(S.step)) return;   // ketukan ganda pada kartu salah dihitung sekali
    card.dataset.missedAt = S.step;
    miss(card, [...cardsEl.children].find(c => c.querySelector('.glyph').textContent === want.glyph));
    return;
  }
  S.wrong = 0; sRight();
  const slot = slotsEl.children[S.step];
  slot.textContent = item.glyph; slot.classList.add('filled');
  card.classList.remove('hint'); card.style.visibility = 'hidden'; card.classList.add('used');
  S.step++;
  if (S.step < S.n) { say(`nama-${S.set}-${item.glyph}`, item.say); return; }
  S.locked = true;
  burst(...centerOf(slotsEl));
  askEl.textContent = S.seq.map(i => i.glyph).join(' ') + ' 🎉';
  say(`urut-${S.set}-${S.seq[0].glyph}-${S.n}`, S.seq.map(i => i.say).join(', ') + '. Hebat!');
  later(next, 2200 + S.n * 450);
}

function next(){
  S.q++;
  if (S.q < ROUND) { question(); return; }
  dots();
  if (S.game === 'kenal') {
    kenal[S.set] = (kenalPos(S.set) + ROUND) % S.items.length; save('kenal', kenal);
    const first = S.targets[0].glyph, last = S.targets[ROUND - 1].glyph;
    $('#winText').textContent = `Kamu sudah kenalan dengan ${first} sampai ${last}. Dapat 1 bintang!`;
  } else {
    adapt(S.key, S.game, S.mistakes);
    $('#winText').textContent = 'Kamu dapat 1 bintang!';
  }
  stars++; save('stars', stars); sWin();
  const c = $('.board').getBoundingClientRect();
  burst(c.left + c.width / 2, c.top + c.height / 3, 80);
  say('hore', 'Hore! Kamu hebat! Dapat satu bintang!');
  later(() => $('#winSheet').classList.add('on'), 700);
}

function stop(){
  clearTimeout(timer); hush(); fxReset(); S = null;
  play.classList.remove('on'); $('#winSheet').classList.remove('on');
  showStars();
}

/* ---------- Kenalan: maju/mundur ---------- */
function step(d){
  if (!S || S.game !== 'kenal' || S.locked) return;
  if (d < 0 && S.q > 0) { S.q--; question(); }
  else if (d > 0) {
    if (S.q < ROUND - 1) { S.q++; question(); }
    else { S.locked = true; next(); }
  }
}
$('#prevBtn').addEventListener('click', () => step(-1));
$('#nextBtn').addEventListener('click', () => step(1));
// Geser kartu ke kiri/kanan
// Geser juga memicu "click" setelah pointerup; tandai supaya kartu tidak ikut membacakan ulang.
// Penanda dibersihkan di tugas berikutnya, jadi ketukan/Enter sesudahnya tetap membacakan kartu.
// Hanya jari yang memulai geseran yang dihitung (#cards memakai touch-action: pan-y).
let sx = null, sid = null, swiped = false;
// Jari pertama (pointer utama) selalu memulai geseran baru, jadi pelacakan tidak bisa macet
// kalau pointerup sebelumnya hilang (misalnya dilepas di luar jendela). Jari tambahan diabaikan.
cardsEl.addEventListener('pointerdown', e => { if (sid !== null && !e.isPrimary) return; sx = e.clientX; sid = e.pointerId; swiped = false; });
// pointerup/pointercancel didengarkan di window: jari bisa dilepas di luar kartu.
addEventListener('pointerup', e => {
  if (e.pointerId !== sid) return; const dx = e.clientX - sx; sx = sid = null;
  if (Math.abs(dx) > 60) { swiped = true; setTimeout(() => { swiped = false; }, 0); step(dx < 0 ? 1 : -1); }
});
addEventListener('pointercancel', e => { if (e.pointerId === sid) sx = sid = null; });

/* ---------- Layar: awal → menu (Huruf/Angka) → main ---------- */
const NAMES = { huruf: ['Huruf', 'A'], angka: ['Angka', '1'] };
let curSet = 'huruf', lastGame = null;
function showMenu(set){
  curSet = set;
  $('#menuTitle').textContent = NAMES[set][0];
  $('#menuGlyph').textContent = NAMES[set][1];
  $('#menu').hidden = false; $('#home').hidden = true;   // satu <main> yang tampil
}
document.querySelectorAll('#home .mode').forEach(b => b.addEventListener('click', () => { audio(); showMenu(b.dataset.set); }));
document.querySelectorAll('#menu .mode').forEach(b => b.addEventListener('click', () => {
  audio(); lastGame = b.dataset.game; start(curSet, lastGame);
}));
$('#menuBack').addEventListener('click', () => { $('#menu').hidden = true; $('#home').hidden = false; });
$('#speakBtn').addEventListener('click', () => { if (S && !S.locked) ask(); });
$('#homeBtn').addEventListener('click', stop);
$('#againBtn').addEventListener('click', () => start(curSet, lastGame));
$('#doneBtn').addEventListener('click', stop);
})();
