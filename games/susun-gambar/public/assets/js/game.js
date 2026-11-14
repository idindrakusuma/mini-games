/* Susun Gambar · logika game.
   Puzzle 3x3: gambar ditampilkan utuh sebentar, lalu pecah jadi 9 potongan di baki.
   Anak menyeret tiap potongan ke tempatnya di papan; papan punya bayangan samar gambarnya.
   Bisa juga tap potongan lalu tap kotaknya. Salah tempat tidak dihukum: potongan kembali ke baki.
   Setelah 2 kali salah untuk potongan yang sama, kotak tujuannya bercahaya sebagai petunjuk.
   Gambar ada di pictures.js. */
(() => {
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { for(let i = a.length-1; i > 0; i--){ const j = Math.random()*(i+1)|0; [a[i],a[j]] = [a[j],a[i]]; } return a; };
const clamp = (v,a,b) => Math.min(Math.max(v,a),Math.max(a,b));
const STORE = 'susunGambar';   // prefix localStorage, wajib unik per game
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const darkMode = matchMedia('(prefers-color-scheme: dark)');

/* ---------- Stars (per device) ---------- */
// Isi localStorage bisa rusak/beda bentuk: hanya terima bilangan bulat >= 0.
let stars = 0;
try { const v = JSON.parse(localStorage.getItem(STORE + '.stars') || '0'); stars = Number.isInteger(v) && v >= 0 ? v : 0; } catch(e) {}
function saveStars(){ try { localStorage.setItem(STORE + '.stars', String(stars)); } catch(e) {} }
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Sound (Web Audio, tanpa file) & suara ucapan ---------- */
let ac = null;
function audio(){ if(!ac){ try{ ac = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac && ac.state==='suspended') ac.resume(); return ac; }
function tone(f1,f2,dur,type='sine',vol=.22,delay=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.02);
}
const sPick  = () => tone(520, 820, .07, 'sine', .14);
const sSnap  = n => { tone(1800, 900, .04, 'square', .05); tone(440 * Math.pow(1.122, n), 440 * Math.pow(1.122, n) * 1.01, .2, 'triangle', .2, .03); };
const sWrong = () => { tone(330, 220, .16, 'triangle', .14); };
const sScatter = () => { for(let i = 0; i < 6; i++) tone(rnd(500, 900), rnd(300, 500), .08, 'sine', .07, i*.05); };
const sWin   = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.18,i*.12));
function say(text){
  try{
    if(!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'id-ID'; u.rate = .95; u.pitch = 1.15;
    const v = speechSynthesis.getVoices().find(v => /^id/i.test(v.lang)); if(v) u.voice = v;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- Canvas ---------- */
const play = $('#play'), cv = $('#stage'), ctx = cv.getContext('2d');
let CW = 0, CH = 0, DPR = 1;
// Ukuran safe-area bawah dibaca lewat elemen bantu, karena canvas tidak bisa membaca env() langsung.
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;left:0;bottom:0;width:1px;height:env(safe-area-inset-bottom,0px);visibility:hidden;pointer-events:none';
document.body.append(probe);
function resize(){
  DPR = Math.min(2, window.devicePixelRatio||1);
  CW = cv.clientWidth; CH = cv.clientHeight;
  const bw = Math.round(CW*DPR), bh = Math.round(CH*DPR);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }
  ctx.setTransform(DPR,0,0,DPR,0,0);
  layout();
}
new ResizeObserver(() => { if(running) resize(); }).observe(cv);

// Papan di atas, baki potongan di bawah (portrait). Di layar lebar, baki ada di samping kanan papan.
let L = { B: 0, bx: 0, by: 0, cell: 0, ts: 0, slots: [] };
function layout(){
  const top = $('.hud').getBoundingClientRect().bottom + 14, bot = probe.offsetHeight + 16, gap = 10;
  const portrait = CH - top - bot >= CW * 1.15;
  let B, bx, by, ts, cols, rows, tx0, ty0;
  if(portrait){
    const avail = CH - top - bot;
    B = Math.min(CW - 32, 560, avail * .6);
    cols = 5; rows = 2;
    const trayTop = top + B + 22, trayH = CH - bot - trayTop;
    ts = Math.min(B/3 * .86, (CW - 32 - (cols-1)*gap) / cols, (trayH - gap) / rows);
    bx = (CW - B) / 2; by = top;
    tx0 = (CW - (cols*ts + (cols-1)*gap)) / 2; ty0 = trayTop + Math.max(0, (trayH - (rows*ts + gap)) / 2);
  } else {
    B = Math.min(CH - top - bot, CW * .55, 560);
    cols = 3; rows = 3;
    ts = Math.min(B/3 * .86, (B - 2*gap) / 3);
    const trayW = cols*ts + (cols-1)*gap, total = B + 36 + trayW;
    bx = (CW - total) / 2; by = top + Math.max(0, (CH - top - bot - B) / 2);
    tx0 = bx + B + 36; ty0 = by + (B - (rows*ts + (rows-1)*gap)) / 2;
  }
  const slots = [];
  for(let k = 0; k < 9; k++){
    const r = Math.floor(k / cols), cIdx = k % cols, inRow = Math.min(cols, 9 - r*cols);
    const rowOff = (cols - inRow) * (ts + gap) / 2;   // baris terakhir yang tidak penuh dibuat di tengah
    slots.push({ x: tx0 + rowOff + cIdx*(ts + gap) + ts/2, y: ty0 + r*(ts + gap) + ts/2 });
  }
  L = { B, bx, by, cell: B/3, ts, slots };
  if(pic) art = render(pic, B);
  for(const p of pieces) retarget(p, true);
}
const cellCenter = i => ({ x: L.bx + (i % 3 + .5) * L.cell, y: L.by + (Math.floor(i / 3) + .5) * L.cell });

/* ---------- Gambar ---------- */
let pic = null, art = null, deck = [];
function render(p, B){
  const c = document.createElement('canvas'), px = Math.round(B * DPR);
  c.width = c.height = px; drawPicture(c.getContext('2d'), p, px);
  return c;
}
function nextPicture(){
  if(!deck.length){ deck = shuffle(PICTURES.slice()); if(pic && deck[0] === pic) deck.push(deck.shift()); }
  return deck.shift();
}

/* ---------- Gameplay ---------- */
let running = false, raf = 0, last = 0, T = 0, phase = 'preview', phaseT = 0;
let pieces = [], placed = 0, drag = null, selected = null, peekT = 0, idleT = 0, hintP = null, sparks = [], winTimer = 0;

function retarget(p, snap){
  if(drag && drag.p === p) return;
  if(p.placed || phase === 'preview' || phase === 'done'){ const c = cellCenter(p.i); p.tx = c.x; p.ty = c.y; p.ts = L.cell; }
  else { const s = L.slots[p.slot]; p.tx = s.x; p.ty = s.y; p.ts = L.ts; }
  if(snap){ p.x = p.tx; p.y = p.ty; p.size = p.ts; }
}
function setCounter(){ $('#counter').textContent = `🧩 ${placed}/9`; }

function start(){
  play.classList.add('on'); $('#home').inert = true; sheet(false); clearTimeout(winTimer);
  pic = nextPicture();
  resize();
  const order = shuffle([...Array(9).keys()]);
  pieces = [...Array(9).keys()].map(i => ({ i, slot: order[i], placed: false, wrongs: 0, x: 0, y: 0, size: 0, tx: 0, ty: 0, ts: 0, shake: 0, pop: 0 }));
  placed = 0; drag = null; selected = null; peekT = 0; idleT = 0; hintP = null; sparks = [];
  phase = 'preview'; phaseT = 0;
  layout(); pieces.forEach(p => retarget(p, true));
  setCounter();
  $('#tip').textContent = `Lihat gambar ${pic.name}! 👀`;
  say(`Ini gambar ${pic.name}. Ingat, ya!`);
  running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  play.focus({ preventScroll: true });
}
function stop(){
  running = false; clearTimeout(winTimer); cancelAnimationFrame(raf);
  try{ speechSynthesis.cancel(); }catch(e){}
  play.classList.remove('on'); $('#home').inert = false; sheet(false); showStars();
  $('#startBtn').focus();
}
function scatter(){
  phase = 'play'; $('#tip').textContent = ''; sScatter();
  // potongan terbang dari papan ke baki dengan sedikit jeda supaya terlihat "pecah"
  pieces.forEach((p, k) => { p.delay = reduceMotion.matches ? 0 : k * .05; });
  pieces.forEach(p => retarget(p));
}

function place(p){
  p.placed = true; placed++; p.pop = 1; selected = null; hintP = null;
  retarget(p); sSnap(placed); setCounter();
  const c = cellCenter(p.i); burst(c.x, c.y, 8);
  if(placed === 9) complete();
}
function wrong(p){
  p.wrongs++; p.shake = .45; sWrong(); retarget(p);
}
function cellAt(x, y){
  const cx = Math.floor((x - L.bx) / L.cell), cy = Math.floor((y - L.by) / L.cell);
  return cx >= 0 && cx < 3 && cy >= 0 && cy < 3 ? cy*3 + cx : -1;
}
function drop(p, x, y){
  const c = cellCenter(p.i);
  if(Math.hypot(x - c.x, y - c.y) < L.cell * .55) return place(p);
  if(cellAt(x, y) >= 0) return wrong(p);
  retarget(p);   // dilepas di luar papan: kembali ke baki tanpa suara
}
function complete(){
  phase = 'done'; selected = null; drag = null;
  stars++; saveStars();
  setTimeout(() => { if(!running) return; sWin(); say(`Hore! Gambar ${pic.name}!`); burst(L.bx + L.B/2, L.by + L.B/2, 30); $('#tip').textContent = `Hore! Gambar ${pic.name}! 🎉`; }, 350);
  winTimer = setTimeout(() => {
    sheet(true); running = false; cancelAnimationFrame(raf);
    $('#winTitle').textContent = `Hore, ${pic.name}nya utuh!`;
    drawWinPic();
  }, 2200);
}

function burst(x, y, n){
  if(reduceMotion.matches) n = Math.min(n, 4);
  for(let k = 0; k < n; k++){
    const a = rnd(0, Math.PI*2), sp = rnd(80, 260);
    sparks.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 60, life: rnd(.5, 1), col: pick(['#FFD23F','#FF8FB8','#47C9E5','#7BD88F','#B98CFF']), r: rnd(3, 6) });
  }
}

/* ---------- Pointer: seret, atau tap potongan lalu tap kotak ---------- */
function pos(e){ const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function pieceAt(x, y){
  for(let k = pieces.length - 1; k >= 0; k--){
    const p = pieces[k]; if(p.placed) continue;
    const h = p.size/2 + 8; if(Math.abs(x - p.x) < h && Math.abs(y - p.y) < h) return p;
  }
  return null;
}
cv.addEventListener('pointerdown', e => {
  if(!running || phase !== 'play' || drag) return;
  idleT = 0; hintP = null;
  const {x, y} = pos(e), p = pieceAt(x, y);
  if(p){
    pieces.splice(pieces.indexOf(p), 1); pieces.push(p);   // yang dipegang digambar paling atas
    drag = { p, ox: p.x - x, oy: p.y - y, sx: x, sy: y, moved: false, id: e.pointerId };
    p.ts = L.cell * .96; sPick();
    try{ cv.setPointerCapture(e.pointerId); }catch(err){}
    return;
  }
  // tap kotak papan setelah memilih potongan
  if(selected){ const c = cellAt(x, y); if(c >= 0){ const s = selected; if(c === s.i) place(s); else { selected = null; wrong(s); } } }
});
cv.addEventListener('pointermove', e => {
  if(!drag || e.pointerId !== drag.id) return;
  const {x, y} = pos(e);
  if(Math.hypot(x - drag.sx, y - drag.sy) > 10) drag.moved = true;
  drag.p.x = x + drag.ox; drag.p.y = y + drag.oy; drag.p.tx = drag.p.x; drag.p.ty = drag.p.y;
});
function endDrag(e, cancel){
  if(!drag || e.pointerId !== drag.id) return;
  const {p, moved} = drag; drag = null;
  if(cancel){ retarget(p); return; }
  if(!moved){ selected = selected === p ? null : p; retarget(p); return; }   // tap: pilih potongan
  selected = null; drop(p, p.x, p.y);
}
cv.addEventListener('pointerup', e => endDrag(e, false));
cv.addEventListener('pointercancel', e => endDrag(e, true));

/* ---------- Loop & gambar ---------- */
function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt; phaseT += dt;
  if(phase === 'preview' && phaseT > 2.2) scatter();
  if(phase === 'play'){
    idleT += dt;
    // diam lama: petunjuk tangan memperlihatkan cara menyeret satu potongan
    if(idleT > (placed ? 9 : 2.5) && !hintP && !drag) hintP = pick(pieces.filter(p => !p.placed));
  }
  if(peekT > 0) peekT -= dt;
  const k = reduceMotion.matches ? 1 : 1 - Math.exp(-dt * 14);
  for(const p of pieces){
    if(p.delay > 0){ p.delay -= dt; continue; }
    if(!(drag && drag.p === p)){ p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; }
    p.size += (p.ts - p.size) * k;
    if(p.shake > 0) p.shake -= dt;
    if(p.pop > 0) p.pop = Math.max(0, p.pop - dt * 3);
  }
  for(const s of sparks){ s.life -= dt; s.x += s.vx*dt; s.y += s.vy*dt; s.vy += 400*dt; }
  sparks = sparks.filter(s => s.life > 0);
  draw();
  if(running) raf = requestAnimationFrame(loop);
}

function rr(c, x, y, w, h, r){ c.beginPath(); c.roundRect(x, y, w, h, r); }
function drawPiece(p, x, y, size, lifted){
  const i = p.i, src = art.width / 3, sx = (i % 3) * src, sy = Math.floor(i / 3) * src;
  const r = size * .12;
  ctx.save();
  if(lifted){ ctx.shadowColor = 'rgba(27,42,107,.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6; }
  ctx.fillStyle = '#FFFDF7'; rr(ctx, x - size/2 - 3, y - size/2 - 3, size + 6, size + 6, r + 3); ctx.fill();
  ctx.restore();
  ctx.save(); rr(ctx, x - size/2, y - size/2, size, size, r); ctx.clip();
  ctx.drawImage(art, sx, sy, src, src, x - size/2, y - size/2, size, size);
  ctx.restore();
}
function draw(){
  const dark = darkMode.matches, {B, bx, by, cell} = L;
  ctx.clearRect(0, 0, CW, CH);
  // papan
  ctx.save(); ctx.shadowColor = 'rgba(27,42,107,.22)'; ctx.shadowOffsetY = 6;
  ctx.fillStyle = dark ? '#1B4D7E' : '#FFFDF7'; rr(ctx, bx - 8, by - 8, B + 16, B + 16, 26); ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, bx, by, B, B, 18); ctx.clip();
  // gambar utuh saat pratinjau/selesai/👀, selain itu bayangan samar sebagai panduan
  ctx.globalAlpha = phase !== 'play' ? 1 : peekT > 0 ? Math.min(1, peekT * 3) * .95 : (dark ? .22 : .28);
  ctx.drawImage(art, bx, by, B, B);
  ctx.globalAlpha = 1;
  if(phase === 'play' && !(peekT > 0)){
    // garis kotak putus-putus
    ctx.setLineDash([8, 7]); ctx.lineWidth = 2.5; ctx.strokeStyle = dark ? 'rgba(255,255,255,.45)' : 'rgba(27,42,107,.3)';
    for(const t of [1, 2]){ ctx.beginPath(); ctx.moveTo(bx + t*cell, by); ctx.lineTo(bx + t*cell, by + B); ctx.moveTo(bx, by + t*cell); ctx.lineTo(bx + B, by + t*cell); ctx.stroke(); }
    ctx.setLineDash([]);
  }
  ctx.restore();

  // petunjuk: kotak tujuan bercahaya (setelah 2 kali salah, atau saat petunjuk diam)
  const glowP = (drag && drag.p.wrongs >= 2 && drag.p) || (selected && selected.wrongs >= 2 && selected) || hintP;
  if(phase === 'play' && glowP){
    const c = cellCenter(glowP.i), a = .5 + .5 * Math.sin(T * 6);
    ctx.strokeStyle = `rgba(255,210,63,${.5 + a*.5})`; ctx.lineWidth = 6;
    rr(ctx, c.x - cell/2 + 4, c.y - cell/2 + 4, cell - 8, cell - 8, 14); ctx.stroke();
  }

  if(phase === 'play'){
    // tempat kosong di baki
    ctx.fillStyle = dark ? 'rgba(255,255,255,.08)' : 'rgba(27,42,107,.07)';
    for(const s of L.slots){ rr(ctx, s.x - L.ts/2, s.y - L.ts/2, L.ts, L.ts, L.ts * .14); ctx.fill(); }
    // potongan yang sudah terpasang, lalu yang belum
    for(const p of pieces) if(p.placed){
      const sc = 1 + Math.sin(p.pop * Math.PI) * .08;
      ctx.save(); rr(ctx, p.x - cell*sc/2, p.y - cell*sc/2, cell*sc, cell*sc, 6); ctx.clip();
      const src = art.width / 3; ctx.drawImage(art, (p.i % 3)*src, Math.floor(p.i / 3)*src, src, src, p.x - cell*sc/2, p.y - cell*sc/2, cell*sc, cell*sc);
      ctx.restore();
    }
    for(const p of pieces) if(!p.placed){
      let x = p.x, y = p.y;
      if(p.shake > 0) x += Math.sin(p.shake * 40) * 7;
      const isSel = selected === p, isHint = hintP === p && !reduceMotion.matches;
      if(isSel) y -= 4 + Math.sin(T * 6) * 3;
      if(isHint) y -= Math.abs(Math.sin(T * 5)) * 6;
      drawPiece(p, x, y, p.size, (drag && drag.p === p) || isSel);
      if(isSel){ ctx.strokeStyle = '#FFD23F'; ctx.lineWidth = 5; rr(ctx, x - p.size/2 - 4, y - p.size/2 - 4, p.size + 8, p.size + 8, p.size * .14 + 4); ctx.stroke(); }
    }
    // tangan petunjuk: dari potongan ke kotak tujuannya
    if(hintP && !drag){
      const s = { x: hintP.x, y: hintP.y }, c = cellCenter(hintP.i);
      const u = (T * .55) % 1, e = u < .15 ? 0 : u > .8 ? 1 : (u - .15) / .65, ee = e*e*(3 - 2*e);
      const hx = s.x + (c.x - s.x) * ee, hy = s.y + (c.y - s.y) * ee;
      // jejak titik-titik lalu "jari" bulat (digambar sendiri, tidak bergantung pada font emoji)
      ctx.fillStyle = 'rgba(255,210,63,.9)';
      for(let k = 1; k < 8; k++){ const q = k/8; if(q > ee) break; ctx.beginPath(); ctx.arc(s.x + (c.x - s.x)*q, s.y + (c.y - s.y)*q, 4, 0, 7); ctx.fill(); }
      ctx.globalAlpha = u > .9 ? (1 - u) * 10 : 1;
      const press = u < .15 || u > .8 ? .82 : 1, R = L.ts * .2 * press;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.strokeStyle = '#1B2A6B'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(hx, hy, R, 0, 7); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,210,63,.9)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx, hy, R + 8 + Math.sin(T*8)*3, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else if(phase === 'preview'){
    // garis tipis yang muncul menjelang gambar pecah
    const a = clamp((phaseT - 1.3) / .8, 0, 1);
    if(a > 0){ ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 4;
      for(const t of [1, 2]){ ctx.beginPath(); ctx.moveTo(bx + t*cell, by); ctx.lineTo(bx + t*cell, by + B); ctx.moveTo(bx, by + t*cell); ctx.lineTo(bx + B, by + t*cell); ctx.stroke(); } }
  } else if(phase === 'done'){
    // kilau melintas di atas gambar yang sudah utuh
    const u = (T * .7) % 1.6;
    ctx.save(); rr(ctx, bx, by, B, B, 18); ctx.clip();
    const g = ctx.createLinearGradient(bx + (u - .4) * B * 1.6, by, bx + u * B * 1.6, by + B);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(bx, by, B, B); ctx.restore();
  }
  for(const s of sparks){ ctx.globalAlpha = Math.min(1, s.life * 2); ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
  ctx.globalAlpha = 1;
}

// Layar menang: HUD & canvas di belakangnya inert, fokus ke "Main lagi".
function sheet(on){
  $('#winSheet').classList.toggle('on', on);
  $('.hud').inert = cv.inert = on;
  if (on) $('#againBtn').focus({ preventScroll: true });
}
function drawWinPic(){
  const w = $('#winPic'), d = Math.min(2, devicePixelRatio || 1), S = w.clientWidth;
  w.width = w.height = Math.round(S * d);
  const c = w.getContext('2d'); c.save(); c.beginPath(); c.roundRect(0, 0, w.width, w.height, 22 * d); c.clip(); drawPicture(c, pic, w.width); c.restore();
}

/* ---------- Gambar di layar awal: puzzle kucing dengan satu potongan terangkat ---------- */
function drawMascot(){
  const m = $('#mascot'), d = Math.min(2, devicePixelRatio || 1), S = m.clientWidth;
  if(!S) return;
  m.width = m.height = Math.round(S * d);
  const c = m.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
  const B = S * .76, o = (S - B) / 2 - S*.02, cell = B / 3, img = document.createElement('canvas');
  img.width = img.height = Math.round(B * d); drawPicture(img.getContext('2d'), PICTURES[0], img.width);
  const src = img.width / 3;
  c.save(); c.shadowColor = 'rgba(27,42,107,.25)'; c.shadowOffsetY = 5; c.fillStyle = '#FFFDF7';
  c.beginPath(); c.roundRect(o - 6, o - 6, B + 12, B + 12, 22); c.fill(); c.restore();
  c.save(); c.beginPath(); c.roundRect(o, o, B, B, 16); c.clip();
  for(let i = 0; i < 9; i++){ if(i === 2) continue; c.drawImage(img, (i%3)*src, Math.floor(i/3)*src, src, src, o + (i%3)*cell, o + Math.floor(i/3)*cell, cell, cell); }
  c.fillStyle = 'rgba(185,140,255,.25)'; c.fillRect(o + 2*cell, o, cell, cell);
  c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 2;
  for(const t of [1, 2]){ c.beginPath(); c.moveTo(o + t*cell, o); c.lineTo(o + t*cell, o + B); c.moveTo(o, o + t*cell); c.lineTo(o + B, o + t*cell); c.stroke(); }
  c.restore();
  // potongan yang terangkat
  c.save(); c.translate(o + 2.5*cell + S*.05, o + .5*cell - S*.05); c.rotate(.16);
  c.shadowColor = 'rgba(27,42,107,.35)'; c.shadowBlur = 10; c.shadowOffsetY = 6; c.fillStyle = '#FFFDF7';
  c.beginPath(); c.roundRect(-cell/2 - 3, -cell/2 - 3, cell + 6, cell + 6, 12); c.fill(); c.shadowColor = 'transparent';
  c.beginPath(); c.roundRect(-cell/2, -cell/2, cell, cell, 10); c.clip();
  c.drawImage(img, 2*src, 0, src, src, -cell/2, -cell/2, cell, cell); c.restore();
}
drawMascot();

/* ---------- Tombol ---------- */
$('#startBtn').addEventListener('click', () => { audio(); start(); });
$('#homeBtn').addEventListener('click', stop);
$('#peekBtn').addEventListener('click', () => { if(running && phase === 'play'){ peekT = 1.6; idleT = 0; } });
$('#againBtn').addEventListener('click', start);
$('#doneBtn').addEventListener('click', stop);

})();
