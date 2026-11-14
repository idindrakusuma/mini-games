/* Berburu Cicak · logika game.
   Cicak-cicak lucu merayap di dinding rumah. Tap cicaknya: dia pusing sebentar, lalu
   pamit dan keluar lewat jendela. Kalau semua cicak sudah keluar, rumah bersih dan
   anak dapat 1 bintang. Tidak ada waktu, tidak ada kalah. Karakter ada di cicak.js. */
(() => {
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const clamp = (v,a,b) => Math.min(Math.max(v,a),Math.max(a,b));
const FONT = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';
const STORE = 'berburuCicak';   // prefix localStorage, wajib unik per game
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const darkMode = matchMedia('(prefers-color-scheme: dark)');

/* ---------- Stars (per device) ---------- */
// Isi localStorage bisa rusak/beda bentuk: hanya terima bilangan bulat >= 0.
let stars = 0;
try { const v = JSON.parse(localStorage.getItem(STORE + '.stars') || '0'); stars = Number.isInteger(v) && v >= 0 ? v : 0; } catch(e) {}
function saveStars(){ try { localStorage.setItem(STORE + '.stars', String(stars)); } catch(e) {} }
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

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
// "cek-cek-cek": suara khas cicak, pendek dan pelan
const sChirp = () => { const n = 3 + (Math.random()*3|0); for(let i=0;i<n;i++) tone(2600,2200,.035,'square',.05,i*.11); };
const sBoing = () => { tone(260,720,.22,'triangle',.28); tone(1400,2100,.06,'sine',.1,.02); };
const sBye   = () => { tone(500,1500,.3,'sine',.14); };
const sMiss  = () => tone(380,330,.08,'sine',.08);
const sWin   = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.18,i*.12));

/* ---------- Canvas ---------- */
const play = $('#play'), cv = $('#stage'), ctx = cv.getContext('2d');
let CW = 0, CH = 0, DPR = 1, bg = null;
function resize(){
  DPR = Math.min(2, window.devicePixelRatio||1);
  CW = cv.clientWidth; CH = cv.clientHeight;
  const bw = Math.round(CW*DPR), bh = Math.round(CH*DPR);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }   // hindari alokasi ulang yang tidak perlu
  ctx.setTransform(DPR,0,0,DPR,0,0);
  layout(); bg = null;
}
// Ukur ulang setiap kali ukuran canvas berubah (rotasi, font termuat), supaya sentuhan tetap pas.
new ResizeObserver(() => {
  if(!running) return;
  resize();
  for(const k of cicaks){ if(k.state !== 'enter'){ k.x = clamp(k.x, area.l, area.r); k.y = clamp(k.y, area.t, area.b); } newTarget(k); }
}).observe(cv);
darkMode.addEventListener?.('change', () => { bg = null; });

/* ---------- Ruangan (digambar sekali ke canvas cadangan) ---------- */
let R = 24, win = {x:0,y:0,w:0,h:0}, area = {l:0,r:0,t:0,b:0};
function layout(){
  R = clamp(Math.min(CW, CH) * .074, 24, 40);
  const w = clamp(CW * .34, 110, 190), h = w * .78;
  win = { x: CW/2, y: 84 + h/2, w, h };
  const m = R * 1.6;
  area = { l: m, r: CW - m, t: 84 + R*1.4, b: CH - 100 - R*1.2 };   // sisakan bawah untuk lantai & tips
}
function room(){
  const dark = darkMode.matches;
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  const g = c.getContext('2d'); g.setTransform(DPR,0,0,DPR,0,0); g.lineCap = g.lineJoin = 'round';
  // dinding + motif titik bunga
  g.fillStyle = dark ? '#2B2F55' : '#FFF4DE'; g.fillRect(0,0,CW,CH);
  g.fillStyle = dark ? 'rgba(255,255,255,.05)' : 'rgba(214,170,96,.16)';
  for(let y = 20, row = 0; y < CH; y += 46, row++)
    for(let x = (row%2) * 23 + 10; x < CW; x += 46){ g.beginPath(); g.arc(x,y,4,0,7); g.fill(); }
  // lantai kayu di bawah
  g.fillStyle = dark ? '#4A3A5E' : '#E8B98A'; g.fillRect(0, CH-28, CW, 28);
  g.fillStyle = dark ? '#5B4A72' : '#F3CFA6'; g.fillRect(0, CH-28, CW, 7);
  // jendela: langit siang atau malam
  const {x,y,w,h} = win, fr = 10;
  g.fillStyle = dark ? '#8A7BB8' : '#FFFFFF'; g.strokeStyle = dark ? '#5E4F8E' : '#E3C9A0'; g.lineWidth = 4;
  g.beginPath(); g.roundRect(x-w/2-fr, y-h/2-fr, w+fr*2, h+fr*2, 18); g.fill(); g.stroke();
  const sky = g.createLinearGradient(0, y-h/2, 0, y+h/2);
  if(dark){ sky.addColorStop(0,'#1A1F4A'); sky.addColorStop(1,'#3A3F7A'); } else { sky.addColorStop(0,'#7FD3F7'); sky.addColorStop(1,'#CDEFFF'); }
  g.fillStyle = sky; g.beginPath(); g.roundRect(x-w/2, y-h/2, w, h, 10); g.fill();
  g.save(); g.clip();
  if(dark){
    g.fillStyle = '#FFE9A8'; g.beginPath(); g.arc(x+w*.22, y-h*.18, h*.16, 0, 7); g.fill();
    g.fillStyle = '#2A2F64'; g.beginPath(); g.arc(x+w*.29, y-h*.24, h*.14, 0, 7); g.fill();
    g.fillStyle = '#FFF';
    for(const [sx,sy] of [[-.3,-.25],[-.12,.15],[-.35,.2],[.05,-.3],[.3,.25]]){ g.beginPath(); g.arc(x+sx*w, y+sy*h, 1.8, 0, 7); g.fill(); }
  } else {
    g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(x+w*.26, y-h*.2, h*.15, 0, 7); g.fill();
    g.fillStyle = '#FFF';
    for(const [cx,cy,cr] of [[-.22,.1,.13],[-.08,.08,.17],[.07,.12,.12]]){ g.beginPath(); g.arc(x+cx*w, y+cy*h, cr*h, 0, 7); g.fill(); }
    g.fillStyle = '#8EDB6A'; g.beginPath(); g.ellipse(x, y+h/2+h*.1, w*.7, h*.25, 0, 0, 7); g.fill();
  }
  g.restore();
  g.strokeStyle = dark ? '#8A7BB8' : '#FFFFFF'; g.lineWidth = 6;
  g.beginPath(); g.moveTo(x, y-h/2); g.lineTo(x, y+h/2); g.moveTo(x-w/2, y); g.lineTo(x+w/2, y); g.stroke();
  // ambang jendela
  g.fillStyle = dark ? '#6F5FA0' : '#F3CFA6';
  g.beginPath(); g.roundRect(x-w/2-fr-8, y+h/2+fr-2, w+fr*2+16, 12, 6); g.fill();
  // lampu dinding (tempat favorit cicak)
  const lx = CW * .84, ly = clamp(CH * .42, 230, CH - 160);
  const glow = g.createRadialGradient(lx, ly+16, 4, lx, ly+16, dark ? 120 : 80);
  glow.addColorStop(0, dark ? 'rgba(255,228,140,.55)' : 'rgba(255,228,140,.45)'); glow.addColorStop(1, 'rgba(255,228,140,0)');
  g.fillStyle = glow; g.beginPath(); g.arc(lx, ly+16, dark ? 120 : 80, 0, 7); g.fill();
  g.fillStyle = dark ? '#9A8CC8' : '#C9A27A'; g.beginPath(); g.roundRect(lx-5, ly-22, 10, 22, 4); g.fill();
  g.fillStyle = '#FFE58A'; g.strokeStyle = '#E0B030'; g.lineWidth = 3;
  g.beginPath(); g.arc(lx, ly+14, 16, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(lx-5, ly+9, 4, 0, 7); g.fill();
  // pigura gambar matahari
  const px = CW * .16, py = clamp(CH * .62, 280, CH - 110), pw = clamp(CW*.2, 60, 110), ph = pw * .8;
  g.fillStyle = dark ? '#8A7BB8' : '#FF9F7A'; g.beginPath(); g.roundRect(px-pw/2-7, py-ph/2-7, pw+14, ph+14, 10); g.fill();
  g.fillStyle = dark ? '#E9E4FF' : '#FFFDF7'; g.beginPath(); g.roundRect(px-pw/2, py-ph/2, pw, ph, 6); g.fill();
  g.fillStyle = '#FFD23F'; g.beginPath(); g.arc(px, py-ph*.05, ph*.2, 0, 7); g.fill();
  g.strokeStyle = '#FFD23F'; g.lineWidth = 3;
  for(let i=0;i<8;i++){ const a = i*Math.PI/4; g.beginPath(); g.moveTo(px+Math.cos(a)*ph*.28, py-ph*.05+Math.sin(a)*ph*.28); g.lineTo(px+Math.cos(a)*ph*.36, py-ph*.05+Math.sin(a)*ph*.36); g.stroke(); }
  g.fillStyle = '#8EDB6A'; g.fillRect(px-pw/2, py+ph*.3, pw, ph*.2);
  return c;
}

/* ---------- Gameplay ---------- */
const GOAL = 10, ON_WALL = 3;
const HI = ['Eh!', 'Wah!', 'Hihi, geli!', 'Aduh!', 'Ups!'];
const BYE = ['Dadah!', 'Daah!', 'Pulang dulu!'];
let cicaks = [], fx = [], bubbles = [], spawned = 0, caught = 0, nextSpawn = 0;
let running = false, done = false, raf = 0, last = 0, T = 0, chirpAt = 0;

function setCounter(){ $('#counter').textContent = `🦎 ${GOAL - caught}`; }
function newTarget(k){ k.tx = rnd(area.l, area.r); k.ty = rnd(area.t, area.b); }

function spawn(){
  const side = pick(['l','r','b']), off = R * 3.4;
  const k = { col: CICAK_COLORS[spawned % CICAK_COLORS.length], ph: rnd(0, 6), state: 'enter',
    speed: rnd(.9, 1.15) * R * (2.6 + caught * .12), scale: 1, wait: 0, timer: 0 };
  if(side === 'l'){ k.x = -off; k.y = rnd(area.t, area.b); }
  else if(side === 'r'){ k.x = CW + off; k.y = rnd(area.t, area.b); }
  else { k.x = rnd(area.l, area.r); k.y = CH + off; }
  newTarget(k);
  k.ang = Math.atan2(k.tx - k.x, -(k.ty - k.y));
  cicaks.push(k); spawned++;
  sChirp();
}

function turnTo(k, a, rate, dt){
  let d = a - k.ang; d = Math.atan2(Math.sin(d), Math.cos(d));
  k.ang += clamp(d, -rate*dt, rate*dt);
  return Math.abs(d);
}
function update(k, dt){
  if(k.state === 'dizzy'){ k.timer -= dt; if(k.timer <= 0){ k.state = 'leave'; k.tx = win.x; k.ty = win.y; } return; }
  if(k.state === 'out'){ k.scale -= dt * 2.6; return; }
  if(k.wait > 0){ k.wait -= dt; if(k.wait <= 0) newTarget(k); return; }
  const dx = k.tx - k.x, dy = k.ty - k.y, dist = Math.hypot(dx, dy);
  const leaving = k.state === 'leave';
  if(dist < (leaving ? 6 : R)){
    if(leaving){ k.state = 'out'; sBye(); return; }
    k.state = 'walk'; k.wait = rnd(.5, 1.6); return;   // berhenti sebentar, lalu cari tempat baru
  }
  const off = turnTo(k, Math.atan2(dx, -dy), leaving ? 9 : 4.5, dt);
  // pelan saat berbelok tajam, supaya geraknya seperti merayap
  const sp = k.speed * (leaving ? 2.2 : 1) * (off > 1.2 ? .35 : 1);
  const step = Math.min(sp * dt, dist);
  k.x += Math.sin(k.ang) * step; k.y -= Math.cos(k.ang) * step;
}
// Pusat sentuh: sedikit ke arah kepala, supaya kepala dan badan sama-sama kena.
const hitCenter = k => [k.x + Math.sin(k.ang) * R * .4, k.y - Math.cos(k.ang) * R * .4];

function start(){
  // Layar awal dibuat inert (tetap tampil, tapi tidak bisa difokus/diklik) supaya Enter/Spasi
  // tidak menekan "Main!" lagi di tengah ronde.
  play.classList.add('on'); $('#home').inert = true; sheet(false); clearTimeout(winTimer); stopMascot();
  resize(); cicaks = []; fx = []; bubbles = []; spawned = 0; caught = 0; done = false; setCounter();
  spawn(); nextSpawn = .9; chirpAt = rnd(3, 6);
  $('#tip').textContent = 'Tap cicaknya! 👆';
  running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  play.focus({ preventScroll: true });   // fokus ke area main (bukan tombol), jadi Enter tidak memicu apa-apa
}
function stop(){
  running = false; clearTimeout(winTimer); cancelAnimationFrame(raf);
  play.classList.remove('on'); $('#home').inert = false; sheet(false); showStars(); startMascot();
  $('#startBtn').focus();
}

// Balon kata menempel di atas kepala cicak (k), ikut bergerak bersamanya.
function bubble(text, k, life = 1.1){ bubbles.push({ text, k, rise: 0, life, max: life }); }
function burst(x, y){
  if(reduceMotion.matches){ fx.push({ x, y, vx: 0, vy: -40, life: .6, max: .6, kind: 'star', size: R*.5 }); return; }
  for(let i = 0; i < 7; i++){
    const a = i / 7 * Math.PI * 2 + rnd(-.2, .2), s = rnd(120, 220);
    fx.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s, life: .7, max: .7, kind: i%2 ? 'star' : 'dot', size: rnd(.3,.45)*R, col: pick(['#FFD23F','#FF8FB8','#47C9E5','#7BD88F']) });
  }
}
function ripple(x, y){ fx.push({ x, y, vx: 0, vy: 0, life: .35, max: .35, kind: 'ring', size: R }); }

function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  // cicak baru datang selama masih ada sisa dan dinding belum penuh
  const active = cicaks.filter(k => k.state === 'enter' || k.state === 'walk').length;
  if(spawned < GOAL && active < ON_WALL){ nextSpawn -= dt; if(nextSpawn <= 0){ spawn(); nextSpawn = rnd(.7, 1.4); } }
  if((chirpAt -= dt) <= 0){ if(active) sChirp(); chirpAt = rnd(4, 8); }

  for(const k of cicaks) update(k, dt);
  cicaks = cicaks.filter(k => k.scale > 0);
  for(const p of fx){ p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vx *= .92; p.vy *= .92; }
  fx = fx.filter(p => p.life > 0);
  for(const b of bubbles){ b.life -= dt; b.rise += 14*dt; }
  bubbles = bubbles.filter(b => b.life > 0);

  draw();
  if(!done && caught === GOAL && cicaks.length === 0){ done = true; winGame(); }
  if(running) raf = requestAnimationFrame(loop);
}

function draw(){
  if(!bg) bg = room();
  ctx.setTransform(1,0,0,1,0,0); ctx.drawImage(bg, 0, 0); ctx.setTransform(DPR,0,0,DPR,0,0);
  // cicak yang sedang pamit digambar paling atas
  const order = [...cicaks].sort((a,b) => (a.state==='leave'||a.state==='out') - (b.state==='leave'||b.state==='out'));
  for(const k of order){
    const moving = (k.state === 'enter' || k.state === 'walk' || k.state === 'leave') && k.wait <= 0;
    const mood = k.state === 'dizzy' ? 'pusing' : (k.state === 'leave' || k.state === 'out') ? 'senang' : 'normal';
    drawCicak(ctx, k.x, k.y, R, k.col, T, k.ph, { angle: k.ang, walk: moving, mood, scale: Math.max(0, k.scale), alpha: Math.min(1, k.scale*1.5) });
  }
  for(const p of fx){
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if(p.kind === 'star') cicakStar(ctx, p.x, p.y, p.size, '#FFD23F', '#E0A800');
    else if(p.kind === 'dot'){ ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.size*.5, 0, 7); ctx.fill(); }
    else { ctx.strokeStyle = darkMode.matches ? 'rgba(255,255,255,.6)' : 'rgba(27,42,107,.35)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1.4 - a*.8), 0, 7); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
  for(const b of bubbles){
    const a = Math.min(1, b.life / .25, (b.max - b.life) / .12 + .2);
    ctx.globalAlpha = Math.max(0, a);
    ctx.font = `800 ${Math.round(R*.85)}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(b.text).width + R*.9, h = R * 1.3;
    const s = Math.max(0, b.k.scale);
    const bx = clamp(b.k.x, w/2 + 6, CW - w/2 - 6);
    let by = b.k.y - R*2.5*s - b.rise;
    if(by < 84 + h/2) by = b.k.y + R*2.6*s + b.rise;   // dekat HUD/jendela: balon pindah ke bawah cicak
    ctx.fillStyle = '#FFFDF7'; ctx.strokeStyle = '#1B2A6B'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(bx - w/2, by - h/2, w, h, h/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1B2A6B'; ctx.fillText(b.text, bx, by + 2);
  }
  ctx.globalAlpha = 1;
}

cv.addEventListener('pointerdown', e => {
  if(!running || done) return;
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  let best = null, bd = Infinity;
  for(const k of cicaks){
    if(k.state !== 'enter' && k.state !== 'walk') continue;
    const [hx, hy] = hitCenter(k), d = Math.hypot(hx - x, hy - y);
    if(d < R * 1.9 && d < bd){ best = k; bd = d; }
  }
  if(!best){ ripple(x, y); sMiss(); return; }
  best.state = 'dizzy'; best.timer = .9; best.wait = 0;
  caught++; setCounter(); sBoing(); burst(x, y);
  bubble(pick(HI), best, .9);
  setTimeout(() => { if(running && cicaks.includes(best)) bubble(pick(BYE), best, 1.1); }, 900);
  if(caught === 1) $('#tip').textContent = '';
  else if(caught === GOAL - 1) $('#tip').textContent = 'Tinggal satu lagi! 🦎';
  else if(caught === GOAL) $('#tip').textContent = '';
});

let winTimer = 0;
// Layar menang: HUD & canvas di belakangnya inert, fokus ke "Main lagi".
function sheet(on){
  $('#winSheet').classList.toggle('on', on);
  $('.hud').inert = cv.inert = on;
  if (on) $('#againBtn').focus({ preventScroll: true });
}
function winGame(){
  stars++; saveStars(); sWin();
  winTimer = setTimeout(() => { sheet(true); running = false; cancelAnimationFrame(raf); drawWinCicak(); }, 500);
}

/* ---------- Cicak di layar awal & layar menang ---------- */
const mascot = $('#mascot'), mctx = mascot.getContext('2d');
let mRaf = 0;
function paintMini(cvs, c, mood, t){
  const d = Math.min(2, devicePixelRatio || 1), W = cvs.clientWidth, H = cvs.clientHeight;
  if(cvs.width !== Math.round(W*d)){ cvs.width = Math.round(W*d); cvs.height = Math.round(H*d); }
  c.setTransform(d,0,0,d,0,0); c.clearRect(0,0,W,H);
  drawCicak(c, W/2, H*.43, W*.2, CICAK_COLORS[0], t, 0, { mood, walk: mood === 'normal' && !reduceMotion.matches });
}
function mascotFrame(now){
  paintMini(mascot, mctx, 'normal', reduceMotion.matches ? .9 : now/1000);
  if(!reduceMotion.matches && !play.classList.contains('on')) mRaf = requestAnimationFrame(mascotFrame);
}
function startMascot(){ cancelAnimationFrame(mRaf); mRaf = requestAnimationFrame(mascotFrame); }
function stopMascot(){ cancelAnimationFrame(mRaf); }
function drawWinCicak(){ const w = $('#winCicak'); paintMini(w, w.getContext('2d'), 'senang', .9); }
startMascot();
reduceMotion.addEventListener?.('change', startMascot);

/* ---------- Tombol ---------- */
$('#startBtn').addEventListener('click', () => { audio(); start(); });
$('#homeBtn').addEventListener('click', stop);
$('#againBtn').addEventListener('click', start);
$('#doneBtn').addEventListener('click', stop);

})();
