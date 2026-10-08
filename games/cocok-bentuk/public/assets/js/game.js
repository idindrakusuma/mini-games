/* Cocok Bentuk · logika game: seret bentuk ke rumahnya (lubang siluet), lalu ke cipratan warna yang sama.
   Satu ronde = 3 papan. Gambar karakter ada di shapes.js. */
(() => {
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const shuffle = a => { for(let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const STORE = 'cocokBentuk';   // prefix localStorage, wajib unik per game
const calm = matchMedia('(prefers-reduced-motion: reduce)');
const darkQ = matchMedia('(prefers-color-scheme: dark)');

/* ---------- Stars (per device) ---------- */
// Isi localStorage bisa rusak/beda bentuk: hanya terima bilangan bulat >= 0.
let stars = 0;
try { const v = JSON.parse(localStorage.getItem(STORE + '.stars') || '0'); stars = Number.isInteger(v) && v >= 0 ? v : 0; } catch(e) {}
function saveStars(){ try { localStorage.setItem(STORE + '.stars', String(stars)); } catch(e) {} }
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Suara nama (suara bawaan browser, Bahasa Indonesia) ---------- */
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
const sPick  = () => tone(520,760,.08,'sine',.14);
const sPlop  = () => { tone(380,120,.12,'sine',.3); tone(900,1500,.08,'triangle',.1,.06); };
const sBoing = () => { tone(260,170,.16,'triangle',.18); tone(200,140,.16,'triangle',.12,.12); };
const sBoard = () => [659,784,988].forEach((f,i)=>tone(f,f*1.01,.18,'triangle',.16,i*.09));
const sWin   = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.18,i*.12));

/* ---------- Isi papan ---------- */
const SHAPE_COLORS = ['#FF6B6B','#47C9E5','#FFD23F','#7BD88F','#B98CFF','#FF9F45','#FF8FB8'];
const PAINTS = [ {name:'merah', c:'#F25C5C'}, {name:'biru', c:'#3D9BF0'}, {name:'kuning', c:'#FFD23F'}, {name:'hijau', c:'#5CC96E'} ];
// Papan 1–2: bentuk ke lubang. Papan 3: bentuk berwarna ke cipratan warna yang sama.
const BOARDS = [ {type:'shape', n:3}, {type:'shape', n:4}, {type:'color', n:3} ];
const TIP = { shape:'Masukkan bentuk ke rumahnya!', color:'Cocokkan dengan warnanya!' };

/* ---------- Canvas ---------- */
const play = $('#play'), cv = $('#stage'), ctx = cv.getContext('2d');
let CW = 0, CH = 0;
function resize(){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  CW = cv.clientWidth; CH = cv.clientHeight;
  const bw = Math.round(CW*dpr), bh = Math.round(CH*dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }   // hindari alokasi ulang yang tidak perlu
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
// Ukur ulang setiap kali ukuran canvas berubah (rotasi, font termuat), supaya sentuhan tetap pas dengan gambar.
new ResizeObserver(() => { if(!running) return; resize(); layout(true); }).observe(cv);

/* ---------- Gameplay ---------- */
let board = 0, items = [], targets = [], parts = [], running = false, raf = 0, last = 0;
let S = 100, trayScale = .7, tray = null, boardT = 0, busy = false, drag = null, hintT = 0, everDragged = false;
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, ms));

function safeBottom(){ return parseFloat(getComputedStyle(play).paddingBottom) || 0; }

// Menghitung posisi lubang (atas) dan rak bentuk (bawah) dari ukuran layar saat ini.
function layout(snap){
  const n = targets.length; if(!n) return;
  const tipEl = $('#tip'), hud = $('.hud').getBoundingClientRect();
  const top = Math.max(hud.bottom, tipEl.textContent ? tipEl.getBoundingClientRect().bottom : 0) + 12;
  const bottom = CH - safeBottom() - 14;
  const trayH = Math.min(190, Math.max(120, CH*.25));
  tray = {x:14, y:bottom - trayH, w:CW - 28, h:trayH};
  const areaH = tray.y - 16 - top, areaW = CW - 28;
  // Susunan lubang: satu baris kalau layar lebar, selain itu 2 kolom (3 lubang: 2 di atas, 1 di bawah).
  const rows = areaW > areaH*1.6 ? [n] : n <= 2 ? [n] : [2, n-2];
  const cellH = areaH / rows.length, cellW = areaW / Math.max(...rows);
  S = Math.max(56, Math.min(cellW*.74, cellH*.74, 160));
  let k = 0;
  rows.forEach((cols, r) => {
    for(let c = 0; c < cols; c++, k++){
      const t = targets[k], w = areaW / cols;
      t.x = 14 + w*(c+.5) + (rows.length > 1 ? (r ? 1 : -1)*Math.min(w*.08, 18) : 0);
      t.y = top + cellH*(r+.5);
    }
  });
  const slotW = tray.w / items.length;
  trayScale = Math.min(1, slotW*.78/S, trayH*.72/S);
  items.forEach(it => {
    it.hx = tray.x + slotW*(it.slot+.5); it.hy = tray.y + trayH/2;
    if(snap && it !== drag){ const g = goal(it); it.x = g.x; it.y = g.y; it.sc = g.sc; }
  });
}
function goal(it){
  // di cipratan warna sedikit lebih kecil, supaya warna cipratannya tetap kelihatan di sekeliling bentuk
  if(it.state === 'placed'){ const t = targets[it.target]; return {x:t.x, y:t.y, sc:t.paint ? .78 : 1}; }
  return {x:it.hx, y:it.hy, sc:trayScale};
}

function newBoard(){
  const B = BOARDS[board];
  items = []; targets = []; parts = []; drag = null; busy = false;
  const kinds = shuffle(SHAPE_KINDS.slice()).slice(0, B.n);
  if(B.type === 'shape'){
    const cols = shuffle(SHAPE_COLORS.slice());
    kinds.forEach((kind, i) => items.push({kind, color:cols[i], name:kind}));
    shuffle(kinds.slice()).forEach(kind => targets.push({kind}));
  } else {
    const paints = shuffle(PAINTS.slice()).slice(0, B.n);
    kinds.forEach((kind, i) => items.push({kind, color:paints[i].c, name:paints[i].name}));
    shuffle(paints.slice()).forEach(p => targets.push({paint:p.name, color:p.c, seed:rnd(0, 6)}));
  }
  // Urutan di rak diacak terpisah dari urutan lubang.
  const slots = shuffle(items.map((_, i) => i));
  items.forEach((it, i) => Object.assign(it, {slot:slots[i], state:'tray', x:0, y:0, sc:.7, shakeT:0, mood:'', moodUntil:0, ph:rnd(0, 6), jumpT:0}));
  items.forEach(it => it.target = targets.findIndex(t => B.type === 'shape' ? t.kind === it.kind : t.paint === it.name));
  $('#tip').textContent = TIP[B.type];
  setCounter(); layout(true);
  boardT = hintT = performance.now();
}
function setCounter(){ $('#counter').textContent = BOARDS.map((_, i) => i < board ? '🟢' : i === board ? '🟡' : '⚪').join(' '); }

function start(){
  // Layar awal dibuat inert (tetap tampil, tapi tidak bisa difokus/diklik) supaya Enter/Spasi
  // tidak menekan "Main!" lagi di tengah ronde.
  play.classList.add('on'); $('#home').inert = true; sheet(false); clearTimers();
  resize(); board = 0; everDragged = false; newBoard();
  say(TIP.shape);
  running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  play.focus({ preventScroll: true });   // fokus ke area main (bukan tombol), jadi Enter tidak memicu apa-apa
}
function stop(){
  running = false; clearTimers(); cancelAnimationFrame(raf); hush();
  play.classList.remove('on'); $('#home').inert = false; sheet(false); showStars();
  $('#startBtn').focus();
}
function clearTimers(){ timers.forEach(clearTimeout); timers = []; }

/* ---------- Seret & lepas ---------- */
cv.addEventListener('pointerdown', e => {
  if(!running || busy || drag) return;
  const p = pt(e);
  // Area sentuh dibuat lebih besar dari gambarnya, supaya jari kecil mudah mengambil bentuk.
  const hit = items.filter(it => it.state !== 'placed')
    .map(it => ({it, d:Math.hypot(it.x - p.x, it.y - p.y)}))
    .filter(o => o.d < Math.max(36, S*o.it.sc*.6) + 14)
    .sort((a, b) => a.d - b.d)[0];
  if(!hit) return;
  audio(); cv.setPointerCapture(e.pointerId);
  drag = hit.it; drag.state = 'drag'; drag.pid = e.pointerId;
  // Bentuk diangkat sedikit di atas jari, supaya tidak tertutup jari saat diseret.
  drag.offX = drag.x - p.x; drag.offY = drag.y - p.y - Math.min(30, S*.25);
  drag.x = p.x + drag.offX; drag.y = p.y + drag.offY;
  everDragged = true; hintT = performance.now(); sPick();
});
cv.addEventListener('pointermove', e => {
  if(!drag || e.pointerId !== drag.pid) return;
  const p = pt(e); drag.x = p.x + drag.offX; drag.y = p.y + drag.offY;
});
cv.addEventListener('pointerup', e => { if(drag && e.pointerId === drag.pid) drop(); });
cv.addEventListener('pointercancel', e => { if(drag && e.pointerId === drag.pid){ drag.state = 'tray'; drag = null; } });
function pt(e){ const r = cv.getBoundingClientRect(); return {x:e.clientX - r.left, y:e.clientY - r.top}; }

function drop(){
  const it = drag, now = performance.now(); drag = null; hintT = now;
  // Lubang terdekat yang masih kosong; jaraknya dibuat longgar supaya anak tidak harus presisi.
  let best = -1, bd = 1e9;
  targets.forEach((t, i) => { if(t.filled) return; const d = Math.hypot(t.x - it.x, t.y - it.y); if(d < bd){ bd = d; best = i; } });
  if(best < 0 || bd > S*.75){ it.state = 'tray'; return; }   // dilepas di tempat kosong: kembali pelan ke rak
  if(best === it.target){ place(it, now); return; }
  // Salah: goyang "nggak muat", lalu kembali ke rak. Tidak ada hukuman.
  it.state = 'shake'; it.shakeT = now; it.mood = 'oops'; it.moodUntil = now + 900; sBoing();
  later(() => { if(it.state === 'shake') it.state = 'tray'; }, calm.matches ? 250 : 450);
}
function place(it, now){
  const t = targets[it.target];
  t.filled = true; it.state = 'placed'; it.mood = 'happy'; it.moodUntil = Infinity; it.jumpT = now;
  sPlop(); say(it.name.charAt(0).toUpperCase() + it.name.slice(1) + '!');
  if(!calm.matches) for(let i = 0; i < 12; i++){
    const a = rnd(0, Math.PI*2), v = rnd(2, 5);
    parts.push({x:t.x, y:t.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 1, r:rnd(5, 10), col:i%2 ? '#FFD23F' : '#fff', life:0, max:rnd(500, 800), rot:rnd(0, 6)});
  }
  if(targets.every(t => t.filled)) boardDone(now);
}
function boardDone(now){
  busy = true;
  later(() => { sBoard(); items.forEach((it, i) => it.jumpT = performance.now() + i*90); }, 450);
  later(() => {
    if(board < BOARDS.length - 1){
      board++; newBoard();
      if(BOARDS[board].type !== BOARDS[board-1].type) say(TIP[BOARDS[board].type]);
    } else win();
  }, 1700);
}

/* ---------- Gambar ---------- */
function loop(now){
  const dt = Math.min(50, now - last); last = now; const t = now/1000, dark = darkQ.matches, still = calm.matches;
  ctx.clearRect(0, 0, CW, CH);
  ctx.globalAlpha = still ? 1 : Math.min(1, (now - boardT)/300);   // papan baru muncul perlahan

  // rak bentuk
  if(tray){
    ctx.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.55)';
    ctx.beginPath(); ctx.roundRect(tray.x, tray.y, tray.w, tray.h, 28); ctx.fill();
  }
  // lubang / cipratan (berkedip lembut kalau bentuk yang diseret ada di dekatnya)
  for(const tg of targets){
    const near = drag && !tg.filled && Math.hypot(tg.x - drag.x, tg.y - drag.y) < S*.75;
    if(tg.paint) drawSplash(ctx, tg.x, tg.y, S*1.15*(near ? 1.06 : 1), tg.color, tg.seed);
    else drawHole(ctx, tg.kind, tg.x, tg.y, S*(near ? 1.06 : 1), dark, near);
  }
  // bentuk: yang sudah masuk dulu, lalu di rak, lalu yang sedang diseret paling atas
  const order = items.slice().sort((a, b) => rank(a) - rank(b));
  for(const it of order){
    if(it.state !== 'drag'){
      const g = goal(it), k = still ? 1 : 1 - Math.pow(.001, dt/250);
      it.x += (g.x - it.x)*k; it.y += (g.y - it.y)*k; it.sc += (g.sc - it.sc)*k;
    } else it.sc += ((trayScale > .99 ? 1.05 : 1) - it.sc)*.3;
    let x = it.x, y = it.y, rot = 0;
    if(it.state === 'shake' && !still){ const e = (now - it.shakeT)/450; x += Math.sin(e*28)*10*(1 - e); rot = Math.sin(e*28)*.08*(1 - e); }
    else if(it.state === 'tray' && !still) y += Math.sin(t*2.2 + it.ph)*3;
    if(it.jumpT && now > it.jumpT && now - it.jumpT < 450 && !still){ const e = (now - it.jumpT)/450; y -= Math.sin(e*Math.PI)*S*.18; }
    if(now > it.moodUntil) it.mood = '';
    drawShape(ctx, it.kind, x, y, S*it.sc, it.color, {mood:it.mood, t:t + it.ph, rot, shadow:it.state === 'drag'});
  }
  ctx.globalAlpha = 1;

  // petunjuk: bayangan bentuk bergerak dari rak ke rumahnya, sampai anak mulai menyeret (atau kalau lama diam)
  if(!busy && !drag && (!everDragged || now - hintT > 8000)) drawHint(now);

  for(const p of parts){
    p.life += dt; p.x += p.vx*dt/16; p.y += p.vy*dt/16; p.vy += .1*dt/16;
    const a = 1 - p.life/p.max; if(a <= 0) continue;
    ctx.globalAlpha = a; star(p.x, p.y, p.r, p.rot += .05, p.col);
  }
  ctx.globalAlpha = 1; parts = parts.filter(p => p.life < p.max);
  if(running) raf = requestAnimationFrame(loop);
}
const rank = it => it.state === 'drag' ? 3 : it.state === 'placed' ? 0 : 1;
function drawHint(now){
  const it = items.find(i => i.state === 'tray'); if(!it) return;
  const tg = targets[it.target], cyc = 2200, e = ((now - hintT) % cyc)/cyc;
  if(e > .8) return;
  const k = calm.matches ? .5 : Math.min(1, e/.7), ease = k*k*(3 - 2*k);
  const x = it.hx + (tg.x - it.hx)*ease, y = it.hy + (tg.y - it.hy)*ease;
  drawShape(ctx, it.kind, x, y, S*(trayScale + (1 - trayScale)*ease), it.color, {alpha:.4, noFace:true});
  ctx.globalAlpha = .9; ctx.font = `${Math.max(34, S*.38)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('👆', x + S*.12, y + S*.12); ctx.globalAlpha = 1;
}
function star(x, y, r, rot, col){
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
  for(let i = 0; i < 10; i++){ const a = i*Math.PI/5 - Math.PI/2, rr = i%2 ? r*.45 : r; ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); }
  ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.restore();
}

/* ---------- Layar menang ---------- */
// HUD & canvas di belakangnya inert, fokus ke "Main lagi".
function sheet(on){
  $('#winSheet').classList.toggle('on', on);
  $('.hud').inert = cv.inert = on;
  if (on) $('#againBtn').focus({ preventScroll: true });
}
function win(){
  stars++; saveStars(); sWin(); say('Hore, hebat!');
  $('#tip').textContent = ''; $('#counter').textContent = '🟢 🟢 🟢';
  $('#winText').textContent = `Semua bentuk sudah pulang ke rumahnya. Kamu dapat 1 bintang! Sekarang ada ${stars} bintang ⭐`;
  sheet(true);
  later(() => { running = false; cancelAnimationFrame(raf); }, 900);   // hentikan loop gambar setelah animasi (hemat baterai)
}

/* ---------- Layar awal: tiga bentuk bergoyang ---------- */
const hero = $('#hero'), hctx = hero.getContext('2d');
function drawHero(now){
  if(play.classList.contains('on')){ requestAnimationFrame(drawHero); return; }
  const t = now/1000, still = calm.matches, W = 360, H = 200;
  hctx.clearRect(0, 0, W, H);
  [['segitiga','#FFD23F',70,118,96,0], ['lingkaran','#FF6B6B',180,100,112,1.3], ['kotak','#7BD88F',290,118,96,2.6]].forEach(([k, c, x, y, s, ph]) =>
    drawShape(hctx, k, x, y + (still ? 0 : Math.sin(t*2 + ph)*6), s, c, {t:t + ph, rot:still ? 0 : Math.sin(t*1.4 + ph)*.06}));
  requestAnimationFrame(drawHero);
}
(() => { const dpr = Math.min(2, window.devicePixelRatio||1); hero.width = 360*dpr; hero.height = 200*dpr; hctx.scale(dpr, dpr); })();
requestAnimationFrame(drawHero);

/* ---------- Tombol ---------- */
$('#startBtn').addEventListener('click', () => { audio(); start(); });
$('#homeBtn').addEventListener('click', stop);
$('#againBtn').addEventListener('click', start);
$('#doneBtn').addEventListener('click', stop);

})();
