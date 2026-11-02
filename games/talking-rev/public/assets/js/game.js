/* Talking Rev · logika game.
   Rev si kucing oranye punya 3 kebutuhan dalam satu ronde (urutan acak): lapar, haus, dan sakit.
   Anak memilih benda yang tepat (makan, air putih, obat). Saat sakit, anak membantu Rev minum
   obat langkah demi langkah: kocok, tuang ke sendok takar, suapkan, minum air putih, istirahat.
   Rev juga bisa dielus/dicolek dan menirukan suara anak (mikrofon opsional, diproses di perangkat).
   Gambar Rev ada di rev.js. */
(() => {
const $ = s => document.querySelector(s);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const STORE = 'talkingRev';   // prefix localStorage, wajib unik per game
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Bintang (per perangkat) ---------- */
// Isi localStorage bisa rusak/beda bentuk: hanya terima bilangan bulat >= 0.
let stars = 0;
try { const v = JSON.parse(localStorage.getItem(STORE + '.stars') || '0'); stars = Number.isInteger(v) && v >= 0 ? v : 0; } catch(e) {}
function saveStars(){ try { localStorage.setItem(STORE + '.stars', String(stars)); } catch(e) {} }
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Efek suara (Web Audio, tanpa file) ---------- */
let ac = null, out = null, noiseBuf = null;
function audio(){
  if(!ac){
    try{
      ac = new (window.AudioContext||window.webkitAudioContext)();
      // Jalur keluar bersama: dikeraskan lalu dibatasi kompresor supaya lantang tanpa pecah.
      const boost = ac.createGain(), comp = ac.createDynamicsCompressor();
      boost.gain.value = 1.8;
      comp.threshold.value = -14; comp.knee.value = 6; comp.ratio.value = 12; comp.attack.value = .003; comp.release.value = .2;
      boost.connect(comp).connect(ac.destination); out = boost;
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
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
// Desis pendek (kriuk, kocok, tuang) dari noise yang disaring.
function noise(dur, freq, type='bandpass', vol=.25, delay=0, freqTo=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = noiseBuf; f.type = type; f.frequency.setValueAtTime(freq, t);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + dur);
  src.connect(f).connect(g).connect(out); src.start(t); src.stop(t + dur + .02);
}
// Meong: nada naik lalu turun dengan sedikit getaran. p < 1 untuk meong sedih.
function sMeow(p = 1, delay = 0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(480*p, t); o.frequency.exponentialRampToValueAtTime(860*p, t+.14); o.frequency.exponentialRampToValueAtTime(520*p, t+.45);
  lfo.frequency.value = 9; lg.gain.value = 18*p; lfo.connect(lg).connect(o.frequency);
  g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.22, t+.05); g.gain.exponentialRampToValueAtTime(.001, t+.5);
  o.connect(g).connect(out); o.start(t); lfo.start(t); o.stop(t+.52); lfo.stop(t+.52);
}
function sPurr(){
  const a = audio(); if(!a) return;
  const t = a.currentTime, o = a.createOscillator(), g = a.createGain(), lfo = a.createOscillator(), lg = a.createGain();
  o.type = 'sawtooth'; o.frequency.value = 55;
  g.gain.value = 0; lfo.frequency.value = 24; lg.gain.value = .09; lfo.connect(lg).connect(g.gain);
  const env = a.createGain(); env.gain.setValueAtTime(.001, t); env.gain.exponentialRampToValueAtTime(1, t+.15); env.gain.exponentialRampToValueAtTime(.001, t+1.1);
  o.connect(g).connect(env).connect(out); o.start(t); lfo.start(t); o.stop(t+1.15); lfo.stop(t+1.15);
}
const sGiggle  = () => [0,1,2,3].forEach(i => tone(900 + i*80, 650 + i*80, .09, 'triangle', .2, i*.11));
const sNom     = () => [0, .28, .56].forEach(d => { noise(.12, 1800, 'bandpass', .35, d); tone(260, 180, .08, 'sine', .15, d + .05); });
const sGulp    = () => [0, .35, .7].forEach(d => tone(420, 160, .14, 'sine', .3, d));
const sShake   = () => { noise(.07, 3200, 'highpass', .3); noise(.07, 3600, 'highpass', .3, .12); };
const sPour    = () => noise(.7, 600, 'lowpass', .25, 0, 2400);
const sWhoosh  = () => noise(.35, 500, 'bandpass', .18, 0, 2500);
const sWrong   = () => tone(330, 260, .2, 'sine', .2);
const sSparkle = () => [1047,1319,1568,2093].forEach((f,i) => tone(f, f, .18, 'triangle', .16, i*.08));
const sSnore   = () => { tone(150, 120, .7, 'sine', .14); tone(190, 150, .6, 'sine', .1, 1.1); };
const sWin     = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.28,i*.12));

/* ---------- Rev bicara (speechSynthesis, suara tinggi seperti anak kucing) ---------- */
let voice = null;
function pickVoice(){ voice = speechSynthesis.getVoices().find(v => /^id([-_]|$)/i.test(v.lang)) || null; }
const canSpeak = 'speechSynthesis' in window;
if (canSpeak) { pickVoice(); speechSynthesis.addEventListener?.('voiceschanged', pickVoice); }
let sayDone = null, sayTimer = 0, speakTimer = 0;
function hush(){
  clearTimeout(sayTimer); clearTimeout(speakTimer);
  if (canSpeak) speechSynthesis.cancel();
  yap(false);
  if (sayDone) { const d = sayDone; sayDone = null; d(); }
}
// Tampilkan teks di balon dan ucapkan. Selesai (resolve) saat ucapan selesai atau dipotong.
function say(text, { talk = true } = {}){
  const busy = canSpeak && (speechSynthesis.speaking || speechSynthesis.pending);
  hush(); bubble(text);
  if (talk) yap(true);
  return new Promise(resolve => {
    sayDone = () => { yap(false); resolve(); };
    const finish = () => { clearTimeout(sayTimer); if (sayDone) { const d = sayDone; sayDone = null; d(); } };
    // Cadangan: kalau tidak ada suara (atau onend tidak terpanggil), tetap lanjut.
    sayTimer = setTimeout(finish, canSpeak ? 1500 + text.length * 85 : 600 + text.length * 55);
    if (!canSpeak) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'id-ID'; if (voice) u.voice = voice;
    u.rate = 1; u.pitch = 1.6; u.volume = 1;
    u.onend = finish; u.onerror = finish;
    // Beberapa browser membuang ucapan yang dipanggil tepat setelah cancel(): beri jeda singkat.
    if (busy) speakTimer = setTimeout(() => speechSynthesis.speak(u), 60); else speechSynthesis.speak(u);
  });
}

/* ---------- Tampilan Rev ---------- */
const play = $('#play'), wrap = $('#revWrap');
let mood = '';
function setMood(m){ if (m !== mood) { mood = m; $('#rev').innerHTML = revSVG(m); } }
$('#homeRev').innerHTML = revSVG('senang');
function bubble(text){
  const b = $('#bubble'); b.textContent = text;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
}
// Mulut buka-tutup selama bicara/mengunyah.
let yapTimer = 0;
function yap(on, ms = 140){
  clearInterval(yapTimer); wrap.classList.remove('yap');
  if (on && mood !== 'tidur') yapTimer = setInterval(() => wrap.classList.toggle('yap'), ms);
}
let animTimer = 0;
function anim(name, ms){
  clearTimeout(animTimer);
  wrap.classList.remove('no', 'boing', 'giggle', 'cheer', 'chew'); void wrap.offsetWidth;
  wrap.classList.add(name);
  animTimer = setTimeout(() => wrap.classList.remove(name), ms);
}
// Kedip sesekali.
(function blinkLoop(){
  setTimeout(() => {
    if (play.classList.contains('on')) { wrap.classList.add('blink'); setTimeout(() => wrap.classList.remove('blink'), 220); }
    blinkLoop();
  }, 2500 + Math.random() * 2500);
})();

/* ---------- Kebutuhan Rev ---------- */
const NEEDS = {
  lapar: {
    item: 'makan', ask: 'Kruuk… perutku lapar. Aku mau makan!', poke: 'Kruuk! Dengar, perutku bunyi!',
    wrong: { minum: 'Itu air. Aku lapar, mau makan dulu!', obat: 'Aku tidak sakit, kok. Obat hanya untuk yang sakit. Aku lapar!' },
    ok: 'Nyam, nyam… enak! Aku kenyang. Terima kasih!',
  },
  haus: {
    item: 'minum', ask: 'Hah… aku capek dan haus. Aku mau minum air putih!', poke: 'Hah… tenggorokanku kering.',
    wrong: { makan: 'Aku tidak lapar. Aku haus, mau minum!', obat: 'Aku tidak sakit, kok. Obat hanya untuk yang sakit. Aku haus!' },
    ok: 'Glek, glek… segar! Air putih bikin aku kuat lagi!',
  },
  sakit: {
    item: 'obat', ask: 'Uhuk… badanku panas. Aku sakit…', poke: 'Aduh… aku lagi tidak enak badan.',
    wrong: { makan: 'Aku lagi sakit… aku perlu obat dulu.', minum: 'Air putihnya nanti, ya. Sekarang aku perlu obat.' },
  },
};
const ITEMS = { makan: 'Makan', minum: 'Minum', obat: 'Obat' };

let token = 0;            // naik setiap ronde/keluar, supaya alur lama yang masih menunggu berhenti sendiri
let needs = [], ni = 0, phase = 'off', base = 'senang', wrongs = 0, medStep = '', shakes = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const need = () => NEEDS[needs[ni]];

function setBase(m){ base = m; setMood(m); }
function renderCounter(){
  $('#counter').innerHTML = needs.map((n, i) =>
    `<span class="need${i < ni || phase === 'won' ? ' done' : i === ni ? ' now' : ''}">${iconSVG(NEEDS[n].item)}</span>`).join('');
  $('#counter').setAttribute('aria-label', `Kebutuhan ${Math.min(ni + 1, 3)} dari 3`);
}
function trayNeeds(){
  phase = 'need';
  $('#tray').className = 'bar tray';
  $('#tray').innerHTML = Object.keys(ITEMS).map(k => `<button class="item ${k}" data-item="${k}">${iconSVG(k)}${ITEMS[k]}</button>`).join('');
}
function trayStep(icon, label, step, dots = -1){
  $('#tray').className = 'bar tray single';
  $('#tray').innerHTML = `<div class="step">${step}</div>` +
    `<button class="item obat" data-step="${medStep}">${iconSVG(icon)}${label}</button>` +
    (dots >= 0 ? `<div class="step dots">${[0,1,2].map(i => `<i class="${i < dots ? 'on' : ''}"></i>`).join('')}</div>` : '');
}

/* ---------- Benda terbang ke mulut Rev ---------- */
function fly(btn, icon){
  const from = btn.querySelector('svg').getBoundingClientRect(), r = wrap.getBoundingClientRect();
  const x0 = from.left + from.width / 2 - 32, y0 = from.top + from.height / 2 - 32;
  const x1 = r.left + r.width * .5 - 32, y1 = r.top + r.height * .55 - 32;
  const el = document.createElement('div'); el.className = 'fly'; el.innerHTML = iconSVG(icon);
  document.body.appendChild(el); sWhoosh();
  const a = el.animate([
    { transform: `translate(${x0}px,${y0}px) scale(1)` },
    { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 70}px) scale(1.1) rotate(-12deg)`, offset: .5 },
    { transform: `translate(${x1}px,${y1}px) scale(.35)`, opacity: .4 },
  ], { duration: reduced() ? 1 : 650, easing: 'ease-in-out', fill: 'forwards' });
  return a.finished.catch(() => {}).then(() => el.remove());
}

/* ---------- Alur ronde ---------- */
async function start(){
  const t = ++token;
  play.classList.add('on'); play.classList.remove('listen'); $('#home').inert = true; sheet(false);
  needs = shuffle(Object.keys(NEEDS)); ni = 0; phase = 'intro';
  renderCounter(); trayNeeds(); phase = 'intro';
  setBase('senang'); sMeow(1.1);
  play.focus({ preventScroll: true });
  await say('Halo! Aku Rev. Hari ini aku butuh bantuanmu, ya!');
  if (t === token) askNeed();
}
function askNeed(){
  wrongs = 0; trayNeeds(); renderCounter();
  setBase(needs[ni]); sMeow(.8);
  say(need().ask);
}
async function pickItem(btn){
  if (phase !== 'need') return;
  const k = btn.dataset.item, n = need(), t = token;
  if (k !== n.item) {
    sWrong(); anim('no', 600); wrongs++;
    say(n.wrong[k]);
    // Setelah salah sekali, benda yang benar bergoyang sebagai petunjuk.
    document.querySelector(`.item[data-item="${n.item}"]`)?.classList.add('nudge');
    return;
  }
  phase = 'busy'; hush();
  document.querySelectorAll('.item').forEach(b => { b.classList.remove('nudge'); if (b !== btn) b.classList.add('used'); });
  if (needs[ni] === 'sakit') { startMedicine(t); return; }
  await fly(btn, k); if (t !== token) return;
  if (k === 'makan') { setMood('makan'); anim('chew', 1500); sNom(); yap(true, 140); }
  else { setMood('minum'); sGulp(); yap(true, 175); }
  await wait(1400); if (t !== token) return;
  yap(false);
  await finishNeed(t, n.ok);
}
async function finishNeed(t, line){
  setMood('sembuh'); sSparkle(); anim('cheer', 1000);
  ni++; renderCounter();
  await say(line); if (t !== token) return;
  await wait(500); if (t !== token) return;
  if (ni >= needs.length) win(); else askNeed();
}

/* ---------- Minum obat, langkah demi langkah ---------- */
async function startMedicine(t){
  setBase('obat');   // termometer dilepas
  await say('Ini obat dari Ibu. Kita minum sesuai takaran, ya!'); if (t !== token) return;
  phase = 'med'; medStep = 'kocok'; shakes = 0;
  trayStep('obat', 'Kocok', 'Kocok botolnya 3 kali!', 0);
}
async function medTap(btn){
  if (phase !== 'med') return;
  const t = token;
  if (medStep === 'kocok') {
    shakes++; sShake();
    btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
    document.querySelectorAll('.dots i').forEach((d, i) => d.classList.toggle('on', i < shakes));
    if (shakes < 3) return;
    phase = 'busy'; await wait(450); if (t !== token) return;
    medStep = 'tuang'; phase = 'med';
    trayStep('sendok', 'Tuang', 'Tuang obat ke sendok takar');
    say('Tuang obatnya ke sendok takar, ya.', { talk: true });
  } else if (medStep === 'tuang') {
    phase = 'busy'; sPour();
    await wait(700); if (t !== token) return;
    btn.querySelector('svg').outerHTML = iconSVG('sendokPenuh');
    await wait(300); if (t !== token) return;
    medStep = 'suap'; phase = 'med';
    trayStep('sendokPenuh', 'Suapkan', 'Pas satu sendok. Suapkan ke Rev!');
    say('Pas satu sendok. Aaa…');
  } else if (medStep === 'suap') {
    phase = 'busy'; hush();
    await fly(btn, 'sendokPenuh'); if (t !== token) return;
    setMood('pahit'); anim('no', 600); tone(300, 240, .3, 'sine', .15);
    await wait(700); if (t !== token) return;
    setMood('obat');
    await say('Hmm… agak pahit. Tapi aku berani!'); if (t !== token) return;
    medStep = 'air'; phase = 'med';
    trayStep('minum', 'Air putih', 'Lalu minum air putih');
  } else if (medStep === 'air') {
    phase = 'busy';
    await fly(btn, 'minum'); if (t !== token) return;
    sGulp(); yap(true, 175);
    await wait(1200); if (t !== token) return;
    yap(false);
    await say('Glek, glek. Pahitnya hilang!'); if (t !== token) return;
    medStep = 'tidur'; phase = 'med';
    trayStep('tidur', 'Istirahat', 'Ajak Rev istirahat');
  } else if (medStep === 'tidur') {
    phase = 'busy'; hush();
    setMood('tidur'); sSnore(); say('Ssst… Rev tidur sebentar.', { talk: false });
    $('#tray').innerHTML = '';
    await wait(3000); if (t !== token) return;
    await finishNeed(t, 'Aku sudah sembuh! Ingat, ya: minum obat hanya dari Ayah, Ibu, atau Dokter.');
  }
}
$('#tray').addEventListener('click', e => {
  const btn = e.target.closest('.item'); if (!btn) return;
  audio();
  if (btn.dataset.item) pickItem(btn); else medTap(btn);
});

/* ---------- Elus & colek ---------- */
const canPoke = () => (phase === 'need' || phase === 'med' || phase === 'won') && !play.classList.contains('listen');
$('#hitHead').addEventListener('click', () => {
  audio(); if (!canPoke()) return;
  anim('boing', 450); sPurr();
  if (phase === 'med') say('Ayo, bantu aku minum obat, ya.');
  else if (phase === 'need') say(pick(['Purrr… enak dielus.', 'Purrr…']) + ' ' + need().poke);
  else say(pick(['Purrr… enak dielus!', 'Hihi, aku sayang kamu!', 'Meong! Kepalaku lembut, ya?']));
});
$('#hitBelly').addEventListener('click', () => {
  audio(); if (!canPoke()) return;
  if (phase === 'need' && needs[ni] === 'lapar') { anim('no', 600); sMeow(.8); say(need().poke); return; }
  if (phase !== 'won') { anim('giggle', 1200); sGiggle(); say(phase === 'med' ? 'Hihi… aku masih sakit, lho.' : need().poke); return; }
  const prev = mood; setMood('geli'); anim('giggle', 1200); sGiggle();
  say(pick(['Hihihi, geli!', 'Hahaha, perutku geli!', 'Aduh, jangan gelitik! Hihi!'])).then(() => { if (mood === 'geli') setMood(prev); });
});

/* ---------- Ngobrol: Rev menirukan suara anak ----------
   Suara direkam lewat Web Audio (tanpa MediaRecorder supaya tidak tergantung codec), hanya di
   memori perangkat, lalu diputar ulang lebih tinggi seperti suara kucing. Tidak ada yang dikirim ke mana pun. */
const PREROLL = .25, SILENCE_END = .9, MAX_TALK = 6, WAIT_START = 8;
let rec = null, phaseBeforeMic = '';
async function startListening(){
  const a = audio();
  if (!canPoke()) return;
  if (!a || !navigator.mediaDevices?.getUserMedia) { say('Wah, HP ini belum bisa merekam suara. Elus aku saja, yuk!'); return; }
  hush();
  phaseBeforeMic = phase; phase = 'mic';
  let stream;
  audioSession('play-and-record');
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch(e) {
    audioSession('playback'); phase = phaseBeforeMic;
    say('Mikrofonnya belum boleh dipakai. Tidak apa-apa, kita main terus, yuk!');
    return;
  }
  // Anak bisa saja sudah keluar dari layar main selama menunggu izin.
  if (!play.classList.contains('on') || phase !== 'mic') { stream.getTracks().forEach(t => t.stop()); audioSession('playback'); return; }
  const src = a.createMediaStreamSource(stream);
  const proc = a.createScriptProcessor(2048, 1, 1);
  const mute = a.createGain(); mute.gain.value = 0;   // onaudioprocess hanya jalan kalau tersambung ke output
  rec = { stream, src, proc, mute, chunks: [], rate: a.sampleRate, startAt: -1, lastLoud: 0, t: 0, dropped: 0 };
  proc.onaudioprocess = e => onAudio(e.inputBuffer.getChannelData(0));
  src.connect(proc); proc.connect(mute); mute.connect(a.destination);
  play.classList.add('listen'); setMood('dengar');
  bubble('Aku dengar… ayo bicara!');
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
  play.classList.remove('listen');
  return r;
}
// Kembali ke keadaan sebelum mikrofon (kebutuhan yang sedang berjalan).
function backFromMic(line){
  phase = phaseBeforeMic; setMood(base);
  if (line) say(line);
}
function finishListening(){
  const r = stopMic(); if (!r) return;
  const total = r.chunks.reduce((n, c) => n + c.length, 0);
  // Mulai sedikit sebelum suara pertama terdeteksi (PREROLL), supaya awal kata tidak terpotong.
  const from = Math.max(0, Math.floor((r.startAt - r.dropped) * r.rate));
  const len = total - from;
  if (r.startAt < 0 || len / r.rate < .3) { backFromMic('Hmm, aku belum dengar suaramu. Coba lagi, ya!'); return; }
  const a = audio(), buf = a.createBuffer(1, len, r.rate), data = buf.getChannelData(0);
  let pos = 0, skip = from;
  for (const c of r.chunks) {
    if (skip >= c.length) { skip -= c.length; continue; }
    const part = c.subarray(skip); skip = 0;
    data.set(part, pos); pos += part.length;
  }
  // Normalkan ke kekerasan rata-rata (RMS) supaya suara pelan tetap lantang.
  let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  const rms = Math.sqrt(sum / data.length);
  playCatVoice(buf, rms > 0 ? Math.min(12, .3 / rms) : 1);
}
async function playCatVoice(buf, gainVal){
  const a = audio(), t = token, rate = 1.6;
  const src = a.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
  const g = a.createGain(); g.gain.value = gainVal * 1.3;
  src.connect(g).connect(out);
  setMood('senang'); bubble('🔊 …'); yap(true, 120);
  src.start(a.currentTime + .1);
  await wait((buf.duration / rate + .2) * 1000); if (t !== token) return;
  yap(false);
  backFromMic(pick(['Hihi! Suaraku lucu, ya?', 'Meong! Ngobrol lagi, yuk!', 'Aku bisa menirukanmu!']));
}
$('#talkBtn').addEventListener('click', () => { if (rec) finishListening(); else startListening(); });
$('#micBtn').addEventListener('click', finishListening);

/* ---------- Menang & layar ---------- */
function sheet(on){
  $('#winSheet').classList.toggle('on', on);
  for (const el of play.querySelectorAll('.hud, .talk, .stage, .bar')) el.inert = on;
  if (on) $('#againBtn').focus({ preventScroll: true });
}
function win(){
  phase = 'won'; renderCounter();
  stars++; saveStars(); showStars(); sWin();
  $('#winRev').innerHTML = revSVG('sembuh');
  $('#tray').innerHTML = '';
  sheet(true);
  setTimeout(() => { if (phase === 'won') say('Hore! Aku sehat lagi! Terima kasih, ya!'); }, 500);
}
function stop(){
  token++; stopMic(); hush(); phase = 'off';
  play.classList.remove('on'); $('#home').inert = false; sheet(false); showStars();
  $('#startBtn').focus();
}
$('#startBtn').addEventListener('click', () => { audio(); start(); });
$('#homeBtn').addEventListener('click', () => { if (rec) { stopMic(); backFromMic(); } else stop(); });
$('#againBtn').addEventListener('click', start);
$('#doneBtn').addEventListener('click', stop);
// Matikan mikrofon dan suara kalau aplikasi ditinggal (pindah tab / layar mati).
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (rec) { stopMic(); backFromMic(); }
  if (canSpeak) speechSynthesis.cancel();
});

})();
