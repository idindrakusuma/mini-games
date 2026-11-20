/* Hitung Kepiting · logika game.
   Tiga mode: Hitung (ada berapa kepiting?), Tambah (kepiting datang dari laut),
   Kurang (kepiting pulang ke laut). Satu ronde = 8 soal, lalu layar "Hore" + 1 bintang.
   Jawaban selalu sama dengan jumlah kepiting yang terlihat di pasir, jadi anak bisa
   menyentuh kepiting satu per satu untuk menghitungnya. */
(() => {
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const ri = (a,b) => Math.floor(rnd(a, b + 1));   // bilangan bulat a..b
const FONT = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';
const STORE = 'hitungKepiting';   // prefix localStorage, wajib unik per game
const KATA = ['nol','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh'];
const mqDark = matchMedia('(prefers-color-scheme: dark)');
const mqCalm = matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Stars (per device) ---------- */
// Isi localStorage bisa rusak/beda bentuk: hanya terima bilangan bulat >= 0.
let stars = 0;
try { const v = JSON.parse(localStorage.getItem(STORE + '.stars') || '0'); stars = Number.isInteger(v) && v >= 0 ? v : 0; } catch(e) {}
function saveStars(){ try { localStorage.setItem(STORE + '.stars', String(stars)); } catch(e) {} }
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Suara ucapan (suara bawaan browser, Bahasa Indonesia) ---------- */
let voice = null, speakTimer = 0;
function pickVoice(){
  if (!('speechSynthesis' in window)) return;
  voice = speechSynthesis.getVoices().find(v => /^id([-_]|$)/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
function hush(){ clearTimeout(speakTimer); speakTimer = 0; if ('speechSynthesis' in window) speechSynthesis.cancel(); }
function say(text){
  if (!('speechSynthesis' in window)) return;
  const busy = speakTimer !== 0 || speechSynthesis.speaking || speechSynthesis.pending;
  hush();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID'; if (voice) u.voice = voice; u.rate = .9; u.pitch = 1.15;
  // Beberapa browser membuang ucapan yang dipanggil tepat setelah cancel(): beri jeda singkat kalau masih ada yang diucapkan.
  if (busy) speakTimer = setTimeout(() => { speakTimer = 0; speechSynthesis.speak(u); }, 60); else speechSynthesis.speak(u);
}

/* ---------- Sound (Web Audio, tanpa file) ---------- */
let ac = null;
function audio(){ if(!ac){ try{ ac = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac && ac.state==='suspended') ac.resume(); return ac; }
function tone(f1,f2,dur,type='sine',vol=.22,delay=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.02);
}
const sCount = n => { const f = 392 * Math.pow(2, (n - 1) * 2 / 12); tone(f, f * 1.02, .18, 'triangle', .25); };
const sSplash = () => { tone(900, 300, .25, 'sine', .12); tone(1400, 600, .18, 'triangle', .06, .05); };
const sYes = () => [659,784,1047].forEach((f,i)=>tone(f,f*1.01,.18,'triangle',.2,i*.09));
const sNo = () => { tone(330, 260, .22, 'sine', .2); tone(260, 220, .22, 'sine', .15, .14); };
const sWin = () => [523,659,784,1047,1319].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.18,i*.12));

/* ---------- Maskot di layar awal ---------- */
let homeRaf = 0;
function drawMascot(now){
  const m = $('#mascot'), c = m.getContext('2d');
  c.clearRect(0, 0, m.width, m.height);
  drawCrab(c, m.width / 2, m.height * .56, 70, { t: now / 1000, wave: 1, seed: 0 });
  if (!mqCalm.matches && !play.classList.contains('on')) homeRaf = requestAnimationFrame(drawMascot);
}

/* ---------- Canvas ---------- */
const play = $('#play'), cv = $('#stage'), ctx = cv.getContext('2d');
let CW = 0, CH = 0;
// Wilayah layar: laut di atas (di belakang kartu soal), pasir tempat kepiting di antara kartu soal dan tombol jawaban.
let seaY = 0, area = { top: 0, bottom: 0 };
function resize(){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  CW = cv.clientWidth; CH = cv.clientHeight;
  const bw = Math.round(CW*dpr), bh = Math.round(CH*dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }   // hindari alokasi ulang yang tidak perlu
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const cr = cv.getBoundingClientRect();
  const qb = $('.quest').getBoundingClientRect().bottom - cr.top;
  const ar = $('#answers').getBoundingClientRect();
  seaY = qb + 18;
  // Tombol jawaban di bawah (HP tegak) atau di kolom kanan (HP miring / layar pendek).
  const side = ar.left - cr.left > CW / 2;
  area = side
    ? { top: seaY + 26, bottom: CH - 12, left: 0, right: ar.left - cr.left - 8 }
    : { top: seaY + 26, bottom: ar.top - cr.top - 10, left: 0, right: CW };
}
// Ukur ulang setiap kali ukuran canvas berubah (rotasi, font termuat), lalu pindahkan kepiting ke slot barunya.
const ro = new ResizeObserver(() => { if (!running) return; resize(); relayout(); });
ro.observe(cv); ro.observe($('.quest'));

/* ---------- Kepiting ---------- */
// Slot kepiting tersusun 2 baris × 5 (seperti papan sepuluh) supaya mudah dihitung.
function slots(n){
  const aw = area.right - area.left, cx = area.left + aw / 2;
  const gw = Math.min(aw - 24, 560), colW = gw / 5;
  const ah = Math.max(80, area.bottom - area.top), rowH = Math.min(ah / 2, colW * 1.6);
  const s = Math.max(14, Math.min(colW * .26, rowH * .3, 60));
  const y0 = area.top + (ah - rowH * (n > 5 ? 2 : 1)) / 2 + rowH * .55;
  const out = [];
  for (let i = 0; i < n; i++) {
    const row = i < 5 ? 0 : 1, k = row ? n - 5 : Math.min(n, 5), col = row ? i - 5 : i;
    out.push({ x: cx + (col - (k - 1) / 2) * colW, y: y0 + row * rowH, s });
  }
  return out;
}

let crabs = [], counted = 0;
function addCrab(slot, from, color){
  const c = { x: from.x, y: from.y, tx: slot.x, ty: slot.y, s: slot.s, color, seed: rnd(0, 3),
              hop: 0, num: 0, leaving: false, alpha: from.alpha ?? 1, scale: from.scale ?? 1 };
  if (mqCalm.matches) { c.x = c.tx; c.y = c.ty; c.alpha = 1; c.scale = 1; }
  crabs.push(c); return c;
}
const onSand = () => crabs.filter(c => !c.leaving);
function relayout(){
  // Kepiting yang tersisa tetap memakai urutan slot yang sama; ukuran ikut layar.
  const stay = onSand().filter(c => !c.exit), sl = slots(layoutN);
  stay.forEach((c, i) => { const p = sl[c.slot ?? i] || sl[i]; c.tx = p.x; c.ty = p.y; c.s = p.s; if (mqCalm.matches) { c.x = c.tx; c.y = c.ty; } });
}
let layoutN = 0;

/* ---------- Gambar pantai ---------- */
const deco = Array.from({ length: 14 }, () => ({ x: Math.random(), y: Math.random(), k: ri(0, 2), r: rnd(.7, 1.2) }));
function drawBeach(now){
  const dark = mqDark.matches, t = now / 1000;
  // pasir
  ctx.fillStyle = dark ? '#5B4A3A' : '#FBE3B5'; ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = dark ? 'rgba(255,255,255,.06)' : 'rgba(214,170,104,.35)';
  for (const d of deco) {
    const x = d.x * CW, y = seaY + 40 + d.y * Math.max(0, CH - seaY - 60);
    if (d.k === 0) { ctx.beginPath(); ctx.arc(x, y, 3 * d.r, 0, 7); ctx.fill(); }
    else if (d.k === 1) { ctx.beginPath(); ctx.arc(x, y, 2 * d.r, 0, 7); ctx.arc(x + 9, y + 5, 2.4 * d.r, 0, 7); ctx.fill(); }
    else { ctx.save(); ctx.translate(x, y); ctx.fillStyle = dark ? 'rgba(255,190,160,.18)' : 'rgba(255,150,120,.45)';
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = (i % 2 ? 4 : 10) * d.r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.fill(); ctx.restore(); ctx.fillStyle = dark ? 'rgba(255,255,255,.06)' : 'rgba(214,170,104,.35)'; }
  }
  // laut dengan ombak bergerak
  const calm = mqCalm.matches ? 0 : 1;
  const wave = (x, off, amp) => seaY + Math.sin(x / 38 + t * 1.6 * calm + off) * amp;
  const grd = ctx.createLinearGradient(0, 0, 0, seaY);
  grd.addColorStop(0, dark ? '#0B2C4D' : '#47C9E5'); grd.addColorStop(1, dark ? '#1B5C8A' : '#8FE3F2');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(CW, 0);
  for (let x = CW; x > 0; x -= 8) ctx.lineTo(x, wave(x, 0, 6));
  ctx.lineTo(0, wave(0, 0, 6));
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); for (let x = 0; x <= CW; x += 8) ctx.lineTo(x, wave(x, 0, 6)); ctx.stroke();
  ctx.strokeStyle = dark ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = 3;
  ctx.beginPath(); for (let x = 0; x <= CW; x += 8) ctx.lineTo(x, wave(x, 2, 4) + 12); ctx.stroke();
}

/* ---------- Loop ---------- */
let running = false, raf = 0, last = 0;
function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  const t = now / 1000, calm = mqCalm.matches;
  ctx.clearRect(0, 0, CW, CH);
  drawBeach(now);
  for (const c of crabs) {
    const dx = c.tx - c.x, dy = c.ty - c.y, d = Math.hypot(dx, dy), sp = c.leaving ? 260 : 230;
    let walking = 0;
    if (d > 1) { const k = Math.min(1, sp * dt / d); c.x += dx * k; c.y += dy * k; walking = 1; }
    else { c.x = c.tx; c.y = c.ty; }
    // Muncul dari laut / masuk ke laut: memudar dan mengecil di dekat garis ombak.
    if (c.leaving) { if (c.y < seaY + c.s * 2) c.alpha = Math.max(0, c.alpha - dt * 2.5); }
    else { c.alpha = Math.min(1, c.alpha + dt * 2.5); c.scale = Math.min(1, c.scale + dt * 2.5); }
    if (c.hop > 0) c.hop = Math.max(0, c.hop - dt * 2.5);
    const hopY = calm ? 0 : Math.sin(c.hop * Math.PI) * c.s * .9;
    const party = cheer && !calm ? Math.abs(Math.sin(t * 7 + c.seed * 2)) * c.s * .35 : 0;
    ctx.globalAlpha = c.alpha;
    drawCrab(ctx, c.x, c.y - hopY - party, c.s * c.scale,
      { color: c.color, t: calm ? 0 : t, walk: calm ? 0 : walking, wave: (cheer || c.hop > 0) && !calm ? 1 : 0, seed: c.seed });
    // Nomor hitungan di atas kepiting yang sudah disentuh.
    if (c.num && !c.leaving) {
      const nx = c.x, ny = c.y - hopY - party - c.s * 1.85, r = Math.max(15, c.s * .62);
      ctx.fillStyle = '#FFFDF7'; ctx.strokeStyle = '#1B2A6B'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(nx, ny, r, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1B2A6B'; ctx.font = `800 ${r * 1.25}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(c.num, nx, ny + r * .1);
    }
    ctx.globalAlpha = 1;
  }
  crabs = crabs.filter(c => !(c.leaving && c.alpha <= 0) && !(c.exit && Math.hypot(c.tx - c.x, c.ty - c.y) < 2));
  if (running) raf = requestAnimationFrame(loop);
}

// Sentuh kepiting untuk menghitung: setiap kepiting mendapat nomor 1, 2, 3, ...
cv.addEventListener('pointerdown', e => {
  if (!running) return;
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = Infinity;
  for (const c of onSand()) { const d = Math.hypot(c.x - x, c.y - y); if (d < c.s * 1.7 && d < bd) { best = c; bd = d; } }
  if (!best) return;
  best.hop = 1;
  if (!best.num && counting) {
    best.num = ++counted; sCount(best.num); say(KATA[best.num] || String(best.num));
  } else sCount(best.num || 1);
});

/* ---------- Soal ---------- */
const TOTAL = 8;
let mode = 'hitung', qi = 0, answer = 0, prevKey = '', gen = 0, counting = false, cheer = false;
const wait = ms => new Promise(r => setTimeout(r, mqCalm.matches ? Math.min(ms, 350) : ms));

function makeQuestion(){
  const max = qi < 3 ? 5 : 10;
  for (let tries = 0; tries < 20; tries++) {
    let q;
    if (mode === 'hitung') { const n = ri(qi < 2 ? 1 : 2, max); q = { a: n, b: 0, ans: n }; }
    else if (mode === 'tambah') { const tot = ri(2, max), a = ri(1, tot - 1); q = { a, b: tot - a, ans: tot }; }
    else { const a = ri(2, max), b = ri(1, a - 1); q = { a, b, ans: a - b }; }
    const key = `${q.a},${q.b}`;
    if (key !== prevKey) { prevKey = key; return q; }
  }
}
function options(ans){
  const pool = [];
  for (let d = 1; d <= 3; d++) for (const v of [ans - d, ans + d]) if (v >= 1 && v <= 10) pool.push(v);
  // Ambil dua pengecoh terdekat (acak di antara jarak yang sama).
  const near = pool.sort((p, q) => Math.abs(p - ans) - Math.abs(q - ans) || Math.random() - .5).slice(0, 2);
  return [ans, ...near].sort((p, q) => p - q);
}

function setEq(html){ $('#eq').innerHTML = html; }
function setTip(text){ $('#tip').textContent = text; }
function setCounter(){ $('#counter').textContent = `🦀 ${Math.min(qi + 1, TOTAL)} / ${TOTAL}`; }
function showAnswers(list){
  const box = $('#answers'); box.innerHTML = ''; box.classList.add('wait');
  for (const v of list) {
    const b = document.createElement('button');
    b.className = 'ans'; b.textContent = v; b.setAttribute('aria-label', `Jawab ${v}`);
    b.addEventListener('click', () => pick(b, v));
    box.appendChild(b);
  }
}
const eqN = (v, cls = '') => `<span class="n ${cls}">${v}</span>`;
const eqQ = (v = '?', ok = false) => `<span class="q${ok ? ' ok' : ''}">${v}</span>`;

async function ask(){
  const my = ++gen; cheer = false; counting = false; counted = 0;
  setCounter();
  // Kepiting dari soal sebelumnya berjalan keluar lewat kanan.
  for (const c of onSand()) { c.tx = CW + 80; c.exit = true; c.num = 0; }
  const q = makeQuestion(); answer = q.ans;
  showAnswers(options(q.ans));
  if (crabs.length) await wait(500); if (my !== gen) return;
  crabs = crabs.filter(c => !c.exit);
  resize();

  if (mode === 'hitung') {
    layoutN = q.a; const sl = slots(q.a);
    setEq(`<span class="word">Ada berapa?</span> ${eqQ()}`); setTip('');
    sl.forEach((p, i) => { const fromLeft = i % 2 === 0; const c = addCrab(p, { x: fromLeft ? -60 : CW + 60, y: p.y + rnd(-20, 20) }, 'red'); c.slot = i; });
    say('Ada berapa kepiting?');
    await wait(1100); if (my !== gen) return;
    setTip('Sentuh kepitingnya untuk menghitung');
  } else {
    const tot = mode === 'tambah' ? q.a + q.b : q.a;
    layoutN = tot; const sl = slots(tot);
    setEq(eqN(q.a)); setTip(`${q.a} kepiting di pantai`);
    for (let i = 0; i < q.a; i++) { const c = addCrab(sl[i], { x: i % 2 ? CW + 60 : -60, y: sl[i].y }, 'red'); c.slot = i; }
    say(`${KATA[q.a]} kepiting.`);
    await wait(1600); if (my !== gen) return;
    if (mode === 'tambah') {
      setEq(`${eqN(q.a)} + ${eqN(q.b, 'new')}`); setTip(`Datang ${q.b} lagi dari laut!`);
      say(`Datang ${KATA[q.b]} lagi.`); sSplash();
      for (let i = q.a; i < tot; i++) { const c = addCrab(sl[i], { x: sl[i].x, y: seaY - 10, alpha: 0, scale: .4 }, 'orange'); c.slot = i; }
      await wait(1700); if (my !== gen) return;
      setEq(`${eqN(q.a)} + ${eqN(q.b, 'new')} = ${eqQ()}`); setTip('Jadi ada berapa kepiting?');
      say('Jadi ada berapa kepiting?');
    } else {
      setEq(`${eqN(q.a)} − ${eqN(q.b, 'new')}`); setTip(`${q.b} kepiting pulang ke laut`);
      say(`${KATA[q.b]} pulang ke laut.`);
      const go = onSand().slice(-q.b);
      go.forEach((c, i) => setTimeout(() => { if (my !== gen) return; c.leaving = true; c.tx = c.x; c.ty = seaY - 20; c.hop = 1; if (i === 0) sSplash(); if (mqCalm.matches) c.alpha = 0; }, i * 180));
      await wait(1900 + q.b * 180); if (my !== gen) return;
      setEq(`${eqN(q.a)} − ${eqN(q.b, 'new')} = ${eqQ()}`); setTip('Sisa berapa kepiting?');
      say('Sisa berapa kepiting?');
    }
  }
  counting = true;
  $('#answers').classList.remove('wait');
}

async function pick(btn, v){
  if ($('#answers').classList.contains('wait')) return;
  if (v !== answer) {
    btn.classList.add('no'); sNo(); say('Coba lagi, ya!');
    setTip('Coba lagi! Sentuh kepitingnya satu per satu');
    return;
  }
  const my = gen;
  $('#answers').classList.add('wait'); btn.classList.add('yes'); sYes();
  const eq = $('#eq').querySelector('.q'); if (eq) { eq.textContent = v; eq.classList.add('ok'); }
  setTip(`Betul! ${v} kepiting 🎉`); say(`Betul! ${KATA[v]}!`);
  cheer = true;
  await wait(1700); if (my !== gen) return;
  qi++;
  if (qi >= TOTAL) win(); else ask();
}

/* ---------- Layar ---------- */
function start(m){
  if (m) mode = m;
  // Layar awal dibuat inert (tetap tampil, tapi tidak bisa difokus/diklik) supaya Enter/Spasi
  // tidak menekan tombol mode lagi di tengah ronde.
  play.classList.add('on'); $('#home').inert = true; sheet(false); cancelAnimationFrame(homeRaf);
  crabs = []; qi = 0; prevKey = ''; setEq(''); setTip('');
  resize();
  running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  play.focus({ preventScroll: true });   // fokus ke area main (bukan tombol), jadi Enter tidak memicu apa-apa
  ask();
}
function stop(){
  gen++; running = false; hush(); cancelAnimationFrame(raf);
  play.classList.remove('on'); $('#home').inert = false; sheet(false); showStars();
  $(`.mode[data-mode="${mode}"]`).focus();
  homeRaf = requestAnimationFrame(drawMascot);
}

// Layar menang: HUD, kartu soal, tombol jawaban, dan canvas di belakangnya inert, fokus ke "Main lagi".
function sheet(on){
  $('#winSheet').classList.toggle('on', on);
  $('.hud').inert = cv.inert = $('#answers').inert = on;
  if (on) $('#againBtn').focus({ preventScroll: true });
}
function win(){
  gen++; stars++; saveStars(); sWin(); say('Hore! Kamu hebat!');
  cheer = true; setTip('');
  sheet(true);
  // Biarkan kepiting menari sebentar di belakang layar menang, lalu hentikan loop (hemat baterai).
  setTimeout(() => { if ($('#winSheet').classList.contains('on')) { running = false; cancelAnimationFrame(raf); } }, 2500);
}

/* ---------- Tombol ---------- */
document.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => { audio(); start(b.dataset.mode); }));
$('#homeBtn').addEventListener('click', stop);
$('#againBtn').addEventListener('click', () => start());
$('#doneBtn').addEventListener('click', stop);

homeRaf = requestAnimationFrame(drawMascot);
})();
