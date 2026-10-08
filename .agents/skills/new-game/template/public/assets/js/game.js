/* {{NAME}} · logika game.
   PLACEHOLDER dari scaffold: ketuk gelembung {{EMOJI}} sampai habis.
   Ganti bagian "Gameplay" dengan permainan yang sebenarnya; sisanya (bintang,
   suara, layar, ukuran canvas) boleh dipakai apa adanya. */
(() => {
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const FONT = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';
const STORE = '{{STORE}}';   // prefix localStorage, wajib unik per game

/* ---------- Stars (per device) ---------- */
let stars = 0;
try { stars = parseInt(localStorage.getItem(STORE + '.stars') || '0', 10) || 0; } catch(e) {}
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
const sPop = () => { tone(500,1400,.12,'sine',.3); tone(1600,2400,.06,'triangle',.08,.05); };
const sWin = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.18,i*.12));

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
// Ukur ulang setiap kali ukuran canvas berubah (rotasi, teks HUD berganti baris, font termuat),
// bukan hanya saat jendela di-resize, supaya sentuhan tetap pas dengan gambar.
new ResizeObserver(() => { if(running) resize(); }).observe(cv);

/* ---------- Gameplay (ganti bagian ini) ---------- */
const GOAL = 5;
let items = [], left = 0, running = false, raf = 0, last = 0;

function spawn(){
  const r = rnd(42, 58);
  items.push({ x: rnd(r, CW - r), y: CH + r, r, vy: rnd(40, 70), ph: rnd(0, 6), pop: 0 });
}
function setCounter(){ $('#counter').textContent = `{{EMOJI}} ${left}`; }

function start(){
  play.classList.add('on'); $('#winSheet').classList.remove('on'); clearTimeout(winTimer);
  resize(); items = []; left = GOAL; setCounter();
  for(let i = 0; i < 3; i++) spawn();
  $('#tip').textContent = 'Ketuk gelembungnya!';
  running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
}
function stop(){ running = false; clearTimeout(winTimer); cancelAnimationFrame(raf); play.classList.remove('on'); showStars(); }

function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  ctx.clearRect(0, 0, CW, CH);
  for(const it of items){
    if(it.pop){ it.pop += dt * 4; }
    else { it.y -= it.vy * dt; if(it.y < -it.r) it.y = CH + it.r; }
    const wob = it.wob = Math.sin(now / 300 + it.ph) * 6, s = it.pop ? 1 + it.pop : 1;   // wob dipakai juga untuk hit test
    ctx.globalAlpha = it.pop ? Math.max(0, 1 - it.pop) : 1;
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(it.x + wob, it.y, it.r * s, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = `${it.r * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('{{EMOJI}}', it.x + wob, it.y + 2);
    ctx.globalAlpha = 1;
  }
  items = items.filter(it => it.pop < 1);
  if(running) raf = requestAnimationFrame(loop);
}

cv.addEventListener('pointerdown', e => {
  if(!running || left <= 0) return;
  const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  const hit = items.find(it => !it.pop && Math.hypot(it.x + (it.wob || 0) - x, it.y - y) < it.r + 16);
  if(!hit) return;
  hit.pop = .001; sPop(); left--; setCounter();
  if(left === 0){ win(); return; }
  if(items.filter(it => !it.pop).length < Math.min(3, left)) spawn();
});

let winTimer = 0;
function win(){
  stars++; saveStars(); sWin(); $('#tip').textContent = '';
  // Setelah animasi pecah terakhir selesai, tampilkan layar menang dan hentikan loop gambar (hemat baterai).
  winTimer = setTimeout(() => { $('#winSheet').classList.add('on'); running = false; cancelAnimationFrame(raf); }, 600);
}

/* ---------- Tombol ---------- */
$('#startBtn').addEventListener('click', () => { audio(); start(); });
$('#homeBtn').addEventListener('click', stop);
$('#againBtn').addEventListener('click', start);
$('#doneBtn').addEventListener('click', stop);
})();
