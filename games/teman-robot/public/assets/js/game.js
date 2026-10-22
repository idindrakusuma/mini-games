/* Teman Robot · logika game.
   Bumble Bee bisa dicolek (kepala/perut), diajak ngobrol (mengulang suara anak dengan suara robot,
   diproses di perangkat), joget, dan main tebak huruf & angka (5 soal benar = 1 bintang).
   Gambar robot ada di robot.js. */
(() => {
const $ = s => document.querySelector(s);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const STORE = 'temanRobot';   // prefix localStorage, wajib unik per game

/* ---------- Bintang (per perangkat) ---------- */
// Isi localStorage bisa rusak/beda bentuk: hanya terima bilangan bulat >= 0.
let stars = 0;
try { const v = JSON.parse(localStorage.getItem(STORE + '.stars') || '0'); stars = Number.isInteger(v) && v >= 0 ? v : 0; } catch(e) {}
function saveStars(){ try { localStorage.setItem(STORE + '.stars', String(stars)); } catch(e) {} }
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Efek suara (Web Audio, tanpa file) ---------- */
let ac = null;
let out = null;   // jalur keluar bersama: dikeraskan lalu dibatasi kompresor supaya lantang tanpa pecah
function audio(){
  if(!ac){
    try{
      ac = new (window.AudioContext||window.webkitAudioContext)();
      const boost = ac.createGain(), comp = ac.createDynamicsCompressor();
      boost.gain.value = 1.8;
      comp.threshold.value = -14; comp.knee.value = 6; comp.ratio.value = 12; comp.attack.value = .003; comp.release.value = .2;
      boost.connect(comp).connect(ac.destination); out = boost;
    }catch(e){ ac = null; }
  }
  if(ac && ac.state==='suspended') ac.resume();
  return ac;
}
// iOS memindahkan suara ke speaker telepon (pelan) selama mikrofon aktif; kembalikan ke speaker utama.
function audioSession(type){ try { if (navigator.audioSession) navigator.audioSession.type = type; } catch(e) {} }
function tone(f1,f2,dur,type='sine',vol=.2,delay=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(out); o.start(t); o.stop(t+dur+.02);
}
const sBeep  = () => { tone(880,880,.07,'square',.1); tone(1320,1320,.07,'square',.1,.09); };
const sBoing = () => { tone(220,880,.18,'square',.14); tone(880,440,.25,'triangle',.22,.16); };
const sLaugh = () => [0,1,2,3,4].forEach(i => tone(700 + i*60, 500 + i*60, .09, 'triangle', .24, i*.11));
const sRight = () => { tone(660,990,.12,'triangle',.26); tone(990,1320,.16,'triangle',.2,.1); };
const sWrong = () => tone(330,260,.18,'sine',.2);
const sWin   = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.28,i*.12));
function sDance(){
  const notes = [523,659,784,659, 587,698,880,698, 523,659,784,1047];
  notes.forEach((f,i) => { tone(f,f,.16,'square',.12,i*.2); if(i % 2 === 0) tone(131,131,.12,'triangle',.3,i*.2); });
}

/* ---------- Robot bicara (speechSynthesis, suara tinggi seperti robot) ---------- */
let voice = null, speakTimer = 0, talkTimer = 0;
function pickVoice(){
  if (!('speechSynthesis' in window)) return;
  voice = speechSynthesis.getVoices().find(v => /^id([-_]|$)/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
function hush(){
  clearTimeout(speakTimer); speakTimer = 0; clearTimeout(talkTimer);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
// Ucapkan teks; mulut robot bergerak selama bicara, lalu kembali ke mood `after`.
function say(text, after = 'senang'){
  const busy = speakTimer !== 0 || ('speechSynthesis' in window && (speechSynthesis.speaking || speechSynthesis.pending));
  hush();
  setMood('bicara');
  // Cadangan: kalau tidak ada suara (atau onend tidak terpanggil), mulut berhenti sendiri.
  const done = () => { clearTimeout(talkTimer); if (mood === 'bicara') setMood(after); };
  talkTimer = setTimeout(done, 700 + text.length * 70);
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'id-ID'; if (voice) u.voice = voice;
  u.rate = .95; u.pitch = 1.7; u.volume = 1;
  u.onend = () => { clearTimeout(talkTimer); talkTimer = setTimeout(done, 150); };
  // Beberapa browser membuang ucapan yang dipanggil tepat setelah cancel(): beri jeda singkat.
  if (busy) speakTimer = setTimeout(() => { speakTimer = 0; speechSynthesis.speak(u); }, 60); else speechSynthesis.speak(u);
}

/* ---------- Tampilan robot & balon kata ---------- */
const play = $('#play'), wrap = $('#robotWrap');
let mood = 'senang', screen = '', moodTimer = 0;
function setMood(m, scr = screen){
  if (m === mood && scr === screen) return;
  mood = m; screen = scr; $('#robot').innerHTML = robotSVG(m, scr);
}
$('#homeRobot').innerHTML = robotSVG('senang');
function bubble(text, pic = ''){
  const b = $('#bubble');
  $('#bubbleText').textContent = text;
  $('#bubblePic').textContent = pic; $('#bubblePic').hidden = !pic;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
}
// Animasi sekali jalan pada robot (boing, giggle, dance, cheer).
let animTimer = 0;
function anim(name, ms){
  clearTimeout(animTimer);
  wrap.classList.remove('boing', 'giggle', 'dance', 'cheer'); void wrap.offsetWidth;
  wrap.classList.add(name);
  animTimer = setTimeout(() => wrap.classList.remove(name), ms);
}
function setMode(m){
  play.classList.remove('free', 'listen', 'quiz'); play.classList.add(m);
  $('#replayBtn').hidden = m !== 'quiz';
  updateCounter();
}
function updateCounter(){
  const c = $('#counter');
  if (play.classList.contains('quiz')) {
    c.innerHTML = Array.from({ length: GOAL }, (_, i) => `<span class="dot${i < solved ? ' done' : ''}"></span>`).join('');
    c.setAttribute('aria-label', `Soal ${Math.min(solved + 1, GOAL)} dari ${GOAL}`);
  } else { c.textContent = `⭐ ${stars}`; c.removeAttribute('aria-label'); }
}

/* ---------- Colek & joget ---------- */
const HEAD_LINES = ['Bip bop! Kepalaku berbunyi!', 'Aduh, antenaku goyang!', 'Halo, halo! Ada orang di sana?', 'Tuing! Kepalaku keras, lho!'];
const BELLY_LINES = ['Hihihi, geli!', 'Hahaha, perutku geli!', 'Aduh, jangan gelitik! Hihi!'];
function react(m, line, animName, ms, sfx){
  if (!play.classList.contains('free')) return;
  clearTimeout(moodTimer);
  sfx(); anim(animName, ms); bubble(line);
  setMood(m);
  // Ucapkan setelah efek suara selesai, lalu kembali senang.
  moodTimer = setTimeout(() => say(line), 380);
}
$('#hitHead').addEventListener('click', () => { audio(); react('wow', pick(HEAD_LINES), 'boing', 650, sBoing); });
$('#hitBelly').addEventListener('click', () => { audio(); react('geli', pick(BELLY_LINES), 'giggle', 1000, sLaugh); });
$('#danceBtn').addEventListener('click', () => {
  audio(); hush(); clearTimeout(moodTimer);
  setMood('senang'); bubble('Ayo joget! Bip, bip, bop!'); sDance(); anim('dance', 2400);
});

/* ---------- Ngobrol: robot mengulang suara anak ----------
   Suara direkam lewat Web Audio (tanpa MediaRecorder supaya tidak tergantung codec), hanya di
   memori perangkat, lalu diputar ulang lebih tinggi + efek robot. Tidak ada yang dikirim ke mana pun. */
const PREROLL = .25, SILENCE_END = .9, MAX_TALK = 6, WAIT_START = 8;
let rec = null;   // { stream, src, proc, mute, chunks, rate, startAt, lastLoud, t, dropped } (waktu dalam detik)
async function startListening(){
  const a = audio();
  if (!a || !navigator.mediaDevices?.getUserMedia) {
    bubble('Wah, HP ini belum bisa merekam suara. Colek aku saja, yuk!'); say('Wah, HP ini belum bisa merekam suara. Colek aku saja, yuk!'); return;
  }
  hush(); clearTimeout(moodTimer);
  let stream;
  audioSession('play-and-record');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch(e) {
    audioSession('playback');
    bubble('Mikrofonnya belum boleh dipakai. Tidak apa-apa, colek aku atau main tebak, yuk!');
    say('Mikrofonnya belum boleh dipakai. Tidak apa-apa, colek aku atau main tebak, yuk!');
    return;
  }
  // Anak bisa saja sudah keluar dari layar main selama menunggu izin.
  if (!play.classList.contains('on') || !play.classList.contains('free')) { stream.getTracks().forEach(t => t.stop()); return; }
  const src = a.createMediaStreamSource(stream);
  const proc = a.createScriptProcessor(2048, 1, 1);
  const mute = a.createGain(); mute.gain.value = 0;   // onaudioprocess hanya jalan kalau tersambung ke output
  rec = { stream, src, proc, mute, chunks: [], rate: a.sampleRate, startAt: -1, lastLoud: 0, t: 0, dropped: 0 };
  proc.onaudioprocess = e => onAudio(e.inputBuffer.getChannelData(0));
  src.connect(proc); proc.connect(mute); mute.connect(a.destination);
  setMode('listen'); setMood('dengar');
  bubble('Aku dengar... ayo bicara!');
  $('#micBtn').focus({ preventScroll: true });
}
const bars = [...document.querySelectorAll('#level i')];
function onAudio(data){
  if (!rec) return;
  const r = rec, copy = new Float32Array(data);
  r.chunks.push(copy); r.t += copy.length / r.rate;
  let sum = 0; for (let i = 0; i < copy.length; i++) sum += copy[i] * copy[i];
  const rms = Math.sqrt(sum / copy.length);
  bars.forEach((b, i) => { b.style.height = Math.round(8 + Math.min(1, rms * 12) * 28 * (0.5 + Math.abs(Math.sin(r.t * 9 + i)) * .5)) + 'px'; });
  if (rms > .02) { if (r.startAt < 0) r.startAt = Math.max(0, r.t - PREROLL); r.lastLoud = r.t; }
  // Selesai otomatis: diam sebentar setelah bicara, terlalu lama bicara, atau tidak ada suara sama sekali.
  if (r.startAt >= 0 && (r.t - r.lastLoud > SILENCE_END || r.t - r.startAt > MAX_TALK)) finishListening();
  else if (r.startAt < 0 && r.t > WAIT_START) finishListening();
  // Simpan secukupnya: sebelum anak mulai bicara cukup sisakan sekitar 1 detik.
  else if (r.startAt < 0) { while (r.t - r.dropped > 1) r.dropped += r.chunks.shift().length / r.rate; }
}
function stopMic(){
  if (!rec) return null;
  const r = rec; rec = null;
  r.proc.onaudioprocess = null;
  try { r.src.disconnect(); r.proc.disconnect(); r.mute.disconnect(); } catch(e) {}
  r.stream.getTracks().forEach(t => t.stop());
  audioSession('playback');
  bars.forEach(b => { b.style.height = ''; });
  return r;
}
function finishListening(){
  const r = stopMic(); if (!r) return;
  setMode('free');
  const total = r.chunks.reduce((n, c) => n + c.length, 0);
  // Mulai sedikit sebelum suara pertama terdeteksi (PREROLL), supaya awal kata tidak terpotong.
  const from = Math.max(0, Math.floor((r.startAt - r.dropped) * r.rate));
  const len = total - from;
  if (r.startAt < 0 || len / r.rate < .3) {
    const line = 'Hmm, aku belum dengar suaramu. Coba lagi, ya!'; bubble(line); say(line); return;
  }
  const a = audio(), buf = a.createBuffer(1, len, r.rate), data = buf.getChannelData(0);
  let pos = 0, skip = from;
  for (const c of r.chunks) {
    if (skip >= c.length) { skip -= c.length; continue; }
    const part = c.subarray(skip); skip = 0;
    data.set(part, pos); pos += part.length;
  }
  // Normalkan ke kekerasan rata-rata (RMS), bukan puncak, supaya suara pelan tetap lantang.
  // Puncak yang kelewat keras diredam kompresor di jalur keluar.
  let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  const rms = Math.sqrt(sum / data.length);
  const gainVal = rms > 0 ? Math.min(12, .3 / rms) : 1;
  playRobotVoice(buf, gainVal);
}
function playRobotVoice(buf, gainVal){
  const a = audio(), t = a.currentTime + .05;
  const src = a.createBufferSource(); src.buffer = buf; src.playbackRate.value = 1.45;
  const pre = a.createGain(); pre.gain.value = gainVal;
  // Seperti Talking Tom: suara asli dipercepat (lebih tinggi) jadi bagian utama, ditambah sedikit
  // ring modulator (dikali osilator 55Hz) supaya terdengar agak "robot" tanpa menutupi kata-katanya.
  const ring = a.createGain(); ring.gain.value = 0;
  const osc = a.createOscillator(); osc.frequency.value = 55; osc.connect(ring.gain);
  const wet = a.createGain(); wet.gain.value = .3;
  const dry = a.createGain(); dry.gain.value = 1.4;
  src.connect(pre); pre.connect(ring); ring.connect(wet); wet.connect(out); pre.connect(dry); dry.connect(out);
  const dur = buf.duration / 1.45;
  sBeep();
  src.start(t + .18); osc.start(t + .18); src.stop(t + .18 + dur + .05); osc.stop(t + .18 + dur + .1);
  setMood('bicara'); bubble('🔊 ...');
  clearTimeout(talkTimer);
  talkTimer = setTimeout(() => {
    setMood('senang'); anim('cheer', 1000);
    bubble(pick(['Bip! Suaraku lucu, ya?', 'Hihi! Ngobrol lagi, yuk!', 'Bip bop! Ayo bicara lagi!']));
  }, (dur + .3) * 1000);
}
$('#talkBtn').addEventListener('click', startListening);
$('#micBtn').addEventListener('click', finishListening);

/* ---------- Tebak-tebakan huruf & angka ---------- */
// [huruf, cara baca]. Q dan X dilewati: jarang dipakai dan cara bacanya membingungkan untuk balita.
const LETTERS = [['A','a'],['B','be'],['C','ce'],['D','de'],['E','e'],['F','ef'],['G','ge'],['H','ha'],['I','i'],['J','je'],
  ['K','ka'],['L','el'],['M','em'],['N','en'],['O','o'],['P','pe'],['R','er'],['S','es'],['T','te'],['U','u'],['V','ve'],
  ['W','we'],['Y','ye'],['Z','zet']];
const NUM_WORDS = ['satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh'];
const COUNT_PICS = ['🍎','⭐','🐟','🎈','🍓','🐞','🌸','🚗'];
const GOAL = 5;
let questions = [], qi = 0, solved = 0, current = null, locked = false, nextTimer = 0;

function makeQuestion(kind){
  if (kind === 'huruf') {
    const opts = shuffle(LETTERS.slice()).slice(0, 3), ans = pick(opts);
    return { kind, ans: ans[0], opts: opts.map(o => o[0]), name: g => `huruf ${LETTERS.find(l => l[0] === g)[1]}`,
      text: `Mana huruf ${ans[0]}?`, speak: `Mana huruf ${ans[1]}?` };
  }
  if (kind === 'angka') {
    const opts = shuffle([...Array(10)].map((_, i) => String(i + 1))).slice(0, 3), ans = pick(opts);
    return { kind, ans, opts, name: g => `angka ${NUM_WORDS[g - 1]}`, text: `Mana angka ${ans}?`, speak: `Mana angka ${NUM_WORDS[ans - 1]}?` };
  }
  // hitung: ada berapa gambar? (1–5)
  const n = 1 + Math.floor(Math.random() * 5), p = pick(COUNT_PICS);
  const others = shuffle([1,2,3,4,5].filter(x => x !== n)).slice(0, 2);
  return { kind, ans: String(n), opts: shuffle([n, ...others].map(String)), pic: p.repeat(n), name: g => NUM_WORDS[g - 1],
    text: 'Ada berapa?', speak: 'Ada berapa? Hitung, yuk!' };
}
function startQuiz(){
  audio(); hush(); clearTimeout(moodTimer); clearTimeout(nextTimer); sheet(false);
  // Campuran: 2 huruf, 2 angka, 1 hitung, urutan acak.
  questions = shuffle(['huruf', 'huruf', 'angka', 'angka', 'hitung']).map(makeQuestion);
  qi = 0; solved = 0; setMode('quiz'); ask();
}
function ask(){
  current = questions[qi]; locked = false;
  setMood('bicara', '?');
  bubble(current.text, current.pic || '');
  const cards = $('#cards'); cards.innerHTML = '';
  current.opts.forEach(g => {
    const b = document.createElement('button');
    b.className = 'card'; b.textContent = g; b.setAttribute('aria-label', current.name(g));
    b.addEventListener('click', () => answer(b, g));
    cards.appendChild(b);
  });
  say(current.speak, 'dengar');
}
function answer(btn, g){
  if (locked || btn.classList.contains('wrong')) return;
  if (g === current.ans) {
    locked = true; solved++; updateCounter();
    btn.classList.add('right');
    document.querySelectorAll('.card').forEach(c => { if (c !== btn) c.classList.add('fade'); });
    sRight(); anim('cheer', 1000);
    const line = current.kind === 'hitung' ? `Betul! Ada ${current.ans}!` : `Betul! Itu ${current.kind} ${g}!`;
    const spoken = current.kind === 'hitung' ? `Betul! Ada ${NUM_WORDS[g - 1]}!` : `Betul! Itu ${current.name(g)}!`;
    bubble(line, current.pic || ''); setMood('wow', g); say(spoken, 'wow');
    nextTimer = setTimeout(() => { if (solved >= GOAL) win(); else { qi++; ask(); } }, 2200);
  } else {
    btn.classList.add('wrong'); sWrong();
    const what = current.kind === 'hitung' ? `Itu ${g}` : `Itu ${current.kind} ${g}`;
    bubble(`${what}. Coba lagi, ya!`, current.pic || '');
    setMood('geli'); anim('giggle', 1000);
    say(`Itu ${current.name(g)}. Coba lagi, ya!`, 'dengar');
  }
}
$('#replayBtn').addEventListener('click', () => { if (current && !locked) { audio(); say(current.speak, 'dengar'); } });
$('#quizBtn').addEventListener('click', startQuiz);

// Layar menang: HUD & area main di belakangnya inert, fokus ke tombol pertama.
function sheet(on){
  $('#winSheet').classList.toggle('on', on);
  for (const el of play.querySelectorAll('.hud, .talk, .stage, .bar')) el.inert = on;
  if (on) $('#againBtn').focus({ preventScroll: true });
}
function win(){
  stars++; saveStars(); showStars(); sWin();
  $('#winRobot').innerHTML = robotSVG('wow', '★');
  setTimeout(() => say('Hore! Kamu hebat! Kamu dapat satu bintang!', 'senang'), 500);
  sheet(true);
}
$('#againBtn').addEventListener('click', startQuiz);
$('#doneBtn').addEventListener('click', backToRobot);
function backToRobot(){
  hush(); clearTimeout(nextTimer); sheet(false); setMode('free');
  setMood('senang', ''); bubble('Asyik! Mau ngapain lagi?');
}

/* ---------- Layar ---------- */
function start(){
  // Layar awal dibuat inert supaya Enter/Spasi tidak menekan "Main!" lagi.
  play.classList.add('on'); $('#home').inert = true;
  sheet(false); setMode('free'); setMood('senang', '');
  bubble('Halo! Aku Bumble Bee. Colek aku, yuk!');
  say('Halo! Aku Bumble Bee. Colek aku, yuk!');
  play.focus({ preventScroll: true });
}
function stop(){
  stopMic(); hush(); clearTimeout(nextTimer); clearTimeout(moodTimer);
  play.classList.remove('on'); $('#home').inert = false; sheet(false); showStars();
  $('#startBtn').focus();
}
// Tombol rumah: dari tebak/dengar kembali ke robot dulu, dari robot kembali ke layar awal.
$('#homeBtn').addEventListener('click', () => {
  if (play.classList.contains('listen')) { stopMic(); backToRobot(); }
  else if (play.classList.contains('quiz')) backToRobot();
  else stop();
});
$('#startBtn').addEventListener('click', () => { audio(); start(); });
// Matikan mikrofon kalau aplikasi ditinggal (pindah tab / layar mati).
document.addEventListener('visibilitychange', () => {
  if (document.hidden && rec) { stopMic(); backToRobot(); }
});

})();
