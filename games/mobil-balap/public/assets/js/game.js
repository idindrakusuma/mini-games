/* Mobil Balap · logika game.
   Mobil melaju dan berhenti di setiap gerbang. Pertanyaan muncul ("Mana segitiga biru?"),
   anak menekan salah satu dari 3 tombol bentuk. Benar: palang terangkat dan mobil ngebut.
   Salah: mobil mogok sebentar (asap, batuk-batuk), lalu boleh coba lagi tanpa hukuman.
   Setelah 6 gerbang, mobil sampai garis finis dan anak dapat 1 bintang. Karakter ada di car.js. */
(() => {
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const shuffle = a => { for(let i = a.length-1; i > 0; i--){ const j = Math.random()*(i+1)|0; [a[i],a[j]] = [a[j],a[i]]; } return a; };
const clamp = (v,a,b) => Math.min(Math.max(v,a),Math.max(a,b));
const STORE = 'mobilBalap';   // prefix localStorage, wajib unik per game
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
const sVroom  = () => { tone(90,260,.7,'sawtooth',.07); tone(180,520,.7,'triangle',.06); };
const sRight  = () => { tone(660,880,.12,'triangle',.2); tone(990,1320,.18,'triangle',.18,.1); };
const sSputter = () => { for(let i=0;i<5;i++) tone(110 - i*8, 60, .12, 'square', .08, i*.2); tone(300,120,.25,'sine',.12,1.05); };
const sGate   = () => tone(500,700,.15,'sine',.12);
const sWin    = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.18,i*.12));

// Ucapan memakai suara bawaan browser (bahasa Indonesia bila tersedia); kalau tidak ada, teks tetap tampil.
function say(text){
  try{
    if(!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'id-ID'; u.rate = .95; u.pitch = 1.15;
    const v = speechSynthesis.getVoices().find(v => /^id/i.test(v.lang)); if(v) u.voice = v;
    speechSynthesis.speak(u);
  }catch(e){}
}

/* ---------- Bentuk & warna ---------- */
const starD = (() => { let d = ''; for(let i=0;i<10;i++){ const a = -Math.PI/2 + i*Math.PI/5, r = i%2 ? 19 : 44; d += (i ? 'L' : 'M') + (50 + Math.cos(a)*r).toFixed(1) + ' ' + (54 + Math.sin(a)*r).toFixed(1); } return d + 'Z'; })();
const SHAPES = {
  lingkaran: 'M50 10 A40 40 0 1 1 49.99 10Z',
  kotak:     'M22 14 H78 Q86 14 86 22 V78 Q86 86 78 86 H22 Q14 86 14 78 V22 Q14 14 22 14Z',
  segitiga:  'M50 10 Q54 10 57 15 L91 77 Q94 86 84 86 H16 Q6 86 9 77 L43 15 Q46 10 50 10Z',
  bintang:   starD,
  hati:      'M50 88 C20 68 6 50 10 32 C14 14 38 10 50 28 C62 10 86 14 90 32 C94 50 80 68 50 88Z',
};
const COLORS = {
  merah:  { f:'#FF5A5F', s:'#C2303A' },
  biru:   { f:'#3FA9F5', s:'#1F6FB8' },
  kuning: { f:'#FFC93C', s:'#C28A12' },
  hijau:  { f:'#5CCB6E', s:'#2E8A3E' },
};
const P2D = Object.fromEntries(Object.entries(SHAPES).map(([k,d]) => [k, new Path2D(d)]));
const shapeSVG = (shape, color) => `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${SHAPES[shape]}" fill="${COLORS[color].f}" stroke="${COLORS[color].s}" stroke-width="6" stroke-linejoin="round"/></svg>`;
function drawShape(c, shape, color, x, y, size){
  c.save(); c.translate(x - size/2, y - size/2); c.scale(size/100, size/100);
  c.fillStyle = COLORS[color].f; c.strokeStyle = COLORS[color].s; c.lineWidth = 6; c.lineJoin = 'round';
  c.fill(P2D[shape]); c.stroke(P2D[shape]); c.restore();
}

// Soal per gerbang. Pengecoh: satu bentuk sama beda warna, satu warna sama beda bentuk,
// jadi anak perlu memperhatikan bentuk DAN warnanya. Dua gerbang pertama memakai pengecoh yang
// beda bentuk dan beda warna supaya lebih mudah.
function makeQuestion(i, prev){
  const shapes = Object.keys(SHAPES), colors = Object.keys(COLORS);
  let ans;
  do { ans = { shape: pick(shapes), color: pick(colors) }; } while(prev && prev.shape === ans.shape && prev.color === ans.color);
  const key = o => o.shape + o.color, opts = [ans], used = new Set([key(ans)]);
  const add = o => { if(!used.has(key(o))){ used.add(key(o)); opts.push(o); return true; } return false; };
  if(i >= 2){
    add({ shape: ans.shape, color: pick(colors.filter(c => c !== ans.color)) });
    add({ shape: pick(shapes.filter(s => s !== ans.shape)), color: ans.color });
  }
  while(opts.length < 3) add({ shape: pick(shapes.filter(s => s !== ans.shape)), color: pick(colors.filter(c => c !== ans.color)) });
  return { ans, opts: shuffle(opts) };
}

/* ---------- Canvas ---------- */
const play = $('#play'), cv = $('#stage'), ctx = cv.getContext('2d');
let CW = 0, CH = 0;
function resize(){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  CW = cv.clientWidth; CH = cv.clientHeight;
  const bw = Math.round(CW*dpr), bh = Math.round(CH*dpr);
  if (cv.width !== bw || cv.height !== bh) { cv.width = bw; cv.height = bh; }   // hindari alokasi ulang yang tidak perlu
  ctx.setTransform(dpr,0,0,dpr,0,0);
  layout();
}
new ResizeObserver(() => { if(running) resize(); }).observe(cv);

// Tata letak: jalan berada di atas panel tombol; mobil di sepertiga kiri layar.
let L = {};
function layout(){
  // tinggi panel tombol dihitung dari ukurannya di CSS (clamp(88px, 27vw, 128px) + padding), bukan dari
  // isinya, karena panel masih kosong saat mobil sedang melaju
  const panel = clamp(CW * .27, 88, 128) + 50;
  const sceneB = CH - panel;
  const s = clamp(Math.min(CW / 470, (sceneB - 150) / 330), .5, 1.25);
  const roadH = 120 * s + 30;
  const roadT = clamp(sceneB - roadH - 10, 190, CH - roadH);
  L = { s, roadT, roadH, ground: roadT + roadH*.62, carX: clamp(CW*.3, 110*s, CW*.4), stopGap: 150*s, gateGap: Math.max(CW*.9, 520*s) };
}

/* ---------- Pemandangan ---------- */
function drawScene(dist, t){
  const dark = darkMode.matches, {roadT, roadH, s} = L;
  // langit
  const sky = ctx.createLinearGradient(0, 0, 0, roadT);
  if(dark){ sky.addColorStop(0,'#0E2A4F'); sky.addColorStop(1,'#2B4C7E'); } else { sky.addColorStop(0,'#8ED8FA'); sky.addColorStop(1,'#DDF5FF'); }
  ctx.fillStyle = sky; ctx.fillRect(0, 0, CW, roadT + 2);
  if(dark){
    ctx.fillStyle = '#FFF';
    for(let i=0;i<24;i++){ const x = (i*137.5 - dist*.02) % (CW+20), y = 30 + (i*61) % Math.max(60, roadT*.55); ctx.globalAlpha = .4 + .4*Math.sin(t*2+i); ctx.beginPath(); ctx.arc((x+CW+20)%(CW+20), y, 1.6, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFE9A8'; ctx.beginPath(); ctx.arc(CW*.12, 165, 24, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = '#FFD23F'; ctx.beginPath(); ctx.arc(CW*.12, 170, 28, 0, 7); ctx.fill();
  }
  // awan (pelan)
  ctx.fillStyle = dark ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.9)';
  for(let i=0;i<4;i++){
    const span = CW + 240, x = ((i*span/4 - dist*.08 - t*6) % span + span) % span - 120, y = 150 + (i%2)*60 + i*8;
    if(y > roadT - 90) continue;
    ctx.beginPath(); ctx.arc(x, y, 22, 0, 7); ctx.arc(x+26, y-10, 28, 0, 7); ctx.arc(x+56, y, 22, 0, 7); ctx.fill();
  }
  // bukit (sedang)
  ctx.fillStyle = dark ? '#1F5A4A' : '#9BE08A';
  ctx.beginPath(); ctx.moveTo(0, roadT);
  for(let x = 0; x <= CW + 10; x += 10){ const w = (x + dist*.25); ctx.lineTo(x, roadT - 60*s - 34*s*Math.sin(w/130) - 18*s*Math.sin(w/57)); }
  ctx.lineTo(CW, roadT); ctx.closePath(); ctx.fill();
  // rumput + pohon (cepat)
  ctx.fillStyle = dark ? '#2C7A55' : '#6FCF6A'; ctx.fillRect(0, roadT - 14*s, CW, 16*s);
  const tg = 170*s;
  for(let k = Math.floor(dist*.6 / tg) - 1; k * tg - dist*.6 < CW + tg; k++){
    const x = k*tg - dist*.6 + ((k*53)%40)*s, h = (36 + (k*29)%24)*s;
    ctx.fillStyle = dark ? '#6B4F3A' : '#B07A4F'; ctx.fillRect(x-4*s, roadT - 14*s - h*.5, 8*s, h*.5);
    ctx.fillStyle = dark ? '#2F8F62' : '#4FB860'; ctx.beginPath(); ctx.arc(x, roadT - 14*s - h*.6, h*.42, 0, 7); ctx.fill();
  }
  // jalan
  ctx.fillStyle = dark ? '#3A3F55' : '#5C6378'; ctx.fillRect(0, roadT, CW, roadH);
  ctx.fillStyle = dark ? '#4A506A' : '#7A8197'; ctx.fillRect(0, roadT, CW, 8*s);
  ctx.fillStyle = '#FFFDF7'; const dw = 60*s, dg = 50*s;
  for(let x = -((dist) % (dw+dg)); x < CW; x += dw+dg){ ctx.beginPath(); ctx.roundRect(x, roadT + roadH*.36, dw, 8*s, 4*s); ctx.fill(); }
  // tanah di bawah jalan (di balik panel tombol)
  ctx.fillStyle = dark ? '#1F5A4A' : '#8ED67E'; ctx.fillRect(0, roadT + roadH, CW, CH - roadT - roadH);
}

// Gerbang: dua tiang, papan "?" di atas, dan palang bergaris yang terangkat kalau jawabannya benar.
function drawGate(x, g){
  const {roadT, roadH, s} = L, top = roadT - 230*s, bottom = roadT + roadH*.9, w = 26*s;
  ctx.fillStyle = '#E8ECF5'; ctx.strokeStyle = '#9AA3BC'; ctx.lineWidth = 3*s;
  // tiang belakang (atas jalan) dan tiang depan (bawah jalan)
  ctx.beginPath(); ctx.roundRect(x - w/2, top + 40*s, w, roadT + 6*s - top - 40*s, 8*s); ctx.fill(); ctx.stroke();
  // papan
  const bw = 120*s, bh = 104*s, by = top - 30*s;
  ctx.fillStyle = '#FFFDF7'; ctx.strokeStyle = '#FF9F1C'; ctx.lineWidth = 7*s;
  ctx.beginPath(); ctx.roundRect(x - bw/2, by, bw, bh, 22*s); ctx.fill(); ctx.stroke();
  if(g.solved) drawShape(ctx, g.q.ans.shape, g.q.ans.color, x, by + bh/2, 76*s);
  else { ctx.fillStyle = '#FF9F1C'; ctx.font = `800 ${70*s}px "Baloo 2","Trebuchet MS",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', x, by + bh/2 + 6*s); }
  // palang (berputar ke atas dari pangkal di tiang)
  const len = Math.min(roadH*.95, 150*s), py = roadT + 10*s;
  ctx.save(); ctx.translate(x, py); ctx.rotate(-g.lift * Math.PI/2 * .95);
  ctx.fillStyle = '#FFFDF7'; ctx.strokeStyle = '#C2303A'; ctx.lineWidth = 3*s;
  ctx.beginPath(); ctx.roundRect(-8*s, 0, 16*s, len, 8*s); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#FF5A5F';
  for(let k = 14*s; k < len - 10*s; k += 30*s){ ctx.fillRect(-7*s, k, 14*s, 14*s); }
  ctx.restore();
  ctx.fillStyle = '#E8ECF5'; ctx.strokeStyle = '#9AA3BC'; ctx.lineWidth = 3*s;
  ctx.beginPath(); ctx.arc(x, py, 12*s, 0, 7); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x - w/2, bottom - 10*s, w, 22*s, 6*s); ctx.fill(); ctx.stroke();
}
function drawFinish(x){
  const {roadT, roadH, s} = L, top = roadT - 210*s, sq = 14*s;
  ctx.fillStyle = '#E8ECF5'; ctx.strokeStyle = '#9AA3BC'; ctx.lineWidth = 3*s;
  for(const px of [x - 10*s, x + 10*s]){ ctx.beginPath(); ctx.roundRect(px - 6*s, top, 12*s, roadT + roadH - top, 6*s); ctx.fill(); ctx.stroke(); }
  // bendera kotak-kotak dan garis finis di jalan
  for(let r = 0; r < 4; r++) for(let k = 0; k < 6; k++){
    ctx.fillStyle = (r + k) % 2 ? '#1B2A6B' : '#FFFFFF'; ctx.fillRect(x + 16*s + k*sq, top + 6*s + r*sq + Math.sin(performance.now()/200 + k)*3*s, sq, sq);
  }
  for(let r = 0; r < Math.ceil(roadH / sq); r++) for(let k = 0; k < 2; k++){
    ctx.fillStyle = (r + k) % 2 ? '#1B2A6B' : '#FFFFFF'; ctx.fillRect(x - sq + k*sq, roadT + r*sq, sq, Math.min(sq, roadT + roadH - (roadT + r*sq)));
  }
}

/* ---------- Gameplay ---------- */
const GATES = 6;
let running = false, raf = 0, last = 0, T = 0;
let dist = 0, speed = 0, target = 0, phase = 'drive', gates = [], gi = 0, finishX = 0;
let carColor = 'merah', mogokT = 0, wrongs = 0, confetti = [], winTimer = 0, sayTimer = 0;
const VMAX = () => 520 * L.s;

function setCounter(){ $('#counter').textContent = `🏁 ${Math.min(gi, GATES)}/${GATES}`; }
function setAsk(html){ $('#ask').innerHTML = html; }
function choicesOff(off){ $('#choices').classList.toggle('off', off); $('#choices').inert = off; }

function start(){
  play.classList.add('on'); $('#home').inert = true; sheet(false); clearTimeout(winTimer); stopMascot();
  choicesOff(true); $('#choices').innerHTML = ''; setAsk('');
  resize();
  carColor = pick(Object.keys(CAR_COLORS));
  dist = 0; speed = 0; gi = 0; wrongs = 0; confetti = []; mogokT = 0;
  gates = []; let prev = null;
  for(let i = 0; i < GATES; i++){ const q = makeQuestion(i, prev); prev = q.ans; gates.push({ at: (i + 1) * L.gateGap, q, solved: false, lift: 0 }); }
  finishX = (GATES + 1) * L.gateGap;
  setCounter(); goTo(gates[0].at - L.stopGap); sVroom();
  running = true; last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
  play.focus({ preventScroll: true });
}
function stop(){
  running = false; clearTimeout(winTimer); clearTimeout(sayTimer); cancelAnimationFrame(raf);
  try{ speechSynthesis.cancel(); }catch(e){}
  play.classList.remove('on'); $('#home').inert = false; sheet(false); showStars(); startMascot();
  $('#startBtn').focus();
}
function goTo(d){ target = d; phase = 'drive'; }

function ask(){
  const g = gates[gi], {shape, color} = g.q.ans;
  phase = 'ask'; wrongs = 0;
  setAsk(`Mana <b>${shape} ${color}</b>?`);
  const box = $('#choices'); box.innerHTML = '';
  for(const o of g.q.opts){
    const b = document.createElement('button');
    b.className = 'choice'; b.innerHTML = shapeSVG(o.shape, o.color); b.setAttribute('aria-label', `${o.shape} ${o.color}`);
    b.addEventListener('click', () => answer(b, o));
    box.append(b);
  }
  choicesOff(false); say(`Mana ${shape} ${color}?`);
}
function answer(btn, o){
  if(phase !== 'ask' || btn.classList.contains('wrong')) return;
  const g = gates[gi];
  if(o.shape === g.q.ans.shape && o.color === g.q.ans.color){
    btn.classList.add('right'); g.solved = true; phase = 'lift'; sRight();
    const name = `${o.shape[0].toUpperCase()}${o.shape.slice(1)} ${o.color}`;
    setAsk(`<span class="ok">Benar! ${name}!</span> 🎉`); say(`Benar! ${name}!`);
    burst(L.carX + 60*L.s, L.ground - 120*L.s, 10);
    setTimeout(() => { choicesOff(true); }, 450);
  } else {
    btn.classList.add('wrong'); btn.setAttribute('aria-disabled', 'true');
    wrongs++; phase = 'mogok'; mogokT = 1.5; sSputter();
    setAsk(`Ups, mogok! Coba lagi, ya 💪`); say('Ups, mobilnya mogok! Coba lagi, ya.');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => {
      if(!running || phase !== 'ask') return;
      const {shape, color} = g.q.ans; setAsk(`Mana <b>${shape} ${color}</b>?`); say(`Mana ${shape} ${color}?`);
      // setelah 2 kali salah, tombol yang benar bergoyang sebagai petunjuk
      if(wrongs >= 2) [...$('#choices').children][g.q.opts.indexOf(g.q.ans)].classList.add('hint');
    }, 1700);
  }
}

function burst(x, y, n){
  if(reduceMotion.matches) n = Math.min(n, 4);
  for(let i = 0; i < n; i++){
    const a = rnd(0, Math.PI*2), sp = rnd(120, 300);
    confetti.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 120, life: rnd(.8, 1.3), col: pick(['#FFD23F','#FF5A5F','#3FA9F5','#5CCB6E','#B98CFF']), r: rnd(4, 7) * L.s, rot: rnd(0, 6) });
  }
}

function loop(now){
  const dt = Math.min(.05, (now - last) / 1000); last = now; T += dt;
  // mobil maju ke target dengan perlambatan halus
  if(phase === 'drive' || phase === 'finish'){
    const left = target - dist, acc = 700 * L.s;
    const want = Math.min(VMAX(), Math.sqrt(Math.max(0, 2 * acc * .9 * left)));
    speed = speed < want ? Math.min(want, speed + acc*dt) : want;
    dist += speed * dt;
    if(left < 1.5){
      dist = target; speed = 0;
      if(phase === 'finish'){ phase = 'won'; winGame(); }
      else if(gi < GATES) ask();
    }
  }
  if(phase === 'mogok'){ mogokT -= dt; if(mogokT <= 0) phase = 'ask'; }
  if(phase === 'lift'){
    const g = gates[gi]; g.lift = Math.min(1, g.lift + dt * 2.2);
    if(g.lift >= 1){
      gi++; setCounter(); sGate(); sVroom(); setAsk('');
      if(gi < GATES) goTo(gates[gi].at - L.stopGap);
      else { phase = 'finish'; target = finishX + 40*L.s; }
    }
  }
  for(const p of confetti){ p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 500*dt; p.rot += dt*8; }
  confetti = confetti.filter(p => p.life > 0);

  draw();
  if(running) raf = requestAnimationFrame(loop);
}

function draw(){
  ctx.clearRect(0, 0, CW, CH);
  drawScene(dist, T);
  const sx = d => L.carX + (d - dist);
  for(const g of gates){ const x = sx(g.at); if(x > -200 && x < CW + 200) drawGate(x, g); }
  { const x = sx(finishX); if(x > -200 && x < CW + 200) drawFinish(x); }
  const mood = phase === 'mogok' ? 'mogok' : phase === 'won' ? 'senang' : speed > 40 ? 'ngebut' : 'normal';
  const spin = dist / (24 * L.s);
  drawCar(ctx, L.carX, L.ground, L.s * .85, CAR_COLORS[carColor], T, { mood, spin });
  for(const p of confetti){
    ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.col;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r*.6, p.r*2, p.r*1.2); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Layar menang: HUD & canvas di belakangnya inert, fokus ke "Main lagi".
function sheet(on){
  $('#winSheet').classList.toggle('on', on);
  $('.hud').inert = cv.inert = on;
  if (on) $('#againBtn').focus({ preventScroll: true });
}
function winGame(){
  stars++; saveStars(); sWin(); say('Hore, sampai finis!');
  setAsk('Hore, sampai finis! 🏁');
  burst(L.carX, L.ground - 120*L.s, 30);
  winTimer = setTimeout(() => { sheet(true); running = false; cancelAnimationFrame(raf); drawMini($('#winCar'), 'senang', .9, carColor); }, 1600);
}

/* ---------- Mobil di layar awal & layar menang ---------- */
const mascot = $('#mascot');
let mRaf = 0;
function drawMini(cvs, mood, t, color = 'merah'){
  const d = Math.min(2, devicePixelRatio || 1), W = cvs.clientWidth, H = cvs.clientHeight, c = cvs.getContext('2d');
  if(cvs.width !== Math.round(W*d)){ cvs.width = Math.round(W*d); cvs.height = Math.round(H*d); }
  c.setTransform(d,0,0,d,0,0); c.clearRect(0,0,W,H);
  // mood senang punya bintang di atas atap: beri ruang di atas supaya tidak terpotong
  drawCar(c, W*.52, H*.9, mood === 'senang' ? Math.min(W/320, H*.85/170) : W/300, CAR_COLORS[color], t, { mood, spin: t*6 });
}
function mascotFrame(now){
  drawMini(mascot, 'normal', reduceMotion.matches ? .9 : now/1000);
  if(!reduceMotion.matches && !play.classList.contains('on')) mRaf = requestAnimationFrame(mascotFrame);
}
function startMascot(){ cancelAnimationFrame(mRaf); mRaf = requestAnimationFrame(mascotFrame); }
function stopMascot(){ cancelAnimationFrame(mRaf); }
startMascot();
reduceMotion.addEventListener?.('change', startMascot);
// Font Baloo 2 untuk nomor di pintu mobil: gambar ulang setelah font termuat.
document.fonts?.ready.then(startMascot);

/* ---------- Tombol ---------- */
$('#startBtn').addEventListener('click', () => { audio(); start(); });
$('#homeBtn').addEventListener('click', stop);
$('#sayBtn').addEventListener('click', () => {
  audio();
  const g = gates[gi]; if(running && g && (phase === 'ask' || phase === 'mogok')) say(`Mana ${g.q.ans.shape} ${g.q.ans.color}?`);
});
$('#againBtn').addEventListener('click', start);
$('#doneBtn').addEventListener('click', stop);

})();
