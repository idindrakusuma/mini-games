// Merender video promo Threads (1080×1920, 30 fps) dari scripts/promo/video.html, lengkap dengan musik & efek suara.
// Pakai: node scripts/promo/render.mjs [video...]   (butuh Playwright + Chromium, ffmpeg, dan hasil capture.mjs)
// Video: utama, pemburu-kuman, huruf-angka, pensil-ajaib, cocok-bentuk. Hasil: promo/threads/<video>.mp4
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'promo/threads');
const FPS = 30;
const VIDEOS = ['utama', 'pemburu-kuman', 'huruf-angka', 'pensil-ajaib', 'cocok-bentuk'];

function run(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: [input ? 'pipe' : 'ignore', 'ignore', 'inherit'] });
    p.on('error', reject);
    p.on('close', code => code ? reject(new Error(`${cmd} exited ${code}`)) : resolve());
    if (input) input(p.stdin);
  });
}

// Disajikan lewat http (bukan file://) supaya canvas yang berisi gambar rekaman tidak "tainted".
const MIME = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg' };
const server = http.createServer((q, r) => {
  const p = path.join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(r);
}).listen(0);
const BASE = `http://localhost:${server.address().port}`;

const launch = {};
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);
fs.mkdirSync(outDir, { recursive: true });

const want = process.argv.slice(2).length ? process.argv.slice(2) : VIDEOS;
for (const id of want) {
  if (!VIDEOS.includes(id)) throw new Error(`video tidak dikenal: ${id}`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'promo-'));
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exit(1); });
  await page.goto(`${BASE}/scripts/promo/video.html?v=${id}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => window.ready);
  if (!(await page.evaluate(() => document.fonts.check('800 40px "Baloo 2"')))) console.warn('⚠️  Font Baloo 2 tidak termuat, memakai font cadangan');
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);

  /* ---------- 1. render frame ---------- */
  const silent = path.join(tmp, 'video.mp4');
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', silent], async stdin => {
    for (let i = 0; i < frames; i++) {
      const b64 = await page.evaluate(async t => { await window.render(t); return document.getElementById('v').toDataURL('image/jpeg', .93).split(',')[1]; }, i / FPS);
      if (!stdin.write(Buffer.from(b64, 'base64'))) await new Promise(r => stdin.once('drain', r));
      if (i % 60 === 0) process.stdout.write(`\r${id}: frame ${i}/${frames}`);
    }
    stdin.end();
  });
  const sfx = await page.evaluate(() => window.SFX);
  await page.close();

  /* ---------- 2. sintesis audio (musik latar + efek suara, tanpa file) ---------- */
  const SR = 44100, N = Math.ceil(duration * SR), buf = new Float32Array(N);
  let seed = 3; const rnd = (a, b) => a + ((seed = (seed * 16807) % 2147483647) / 2147483647) * (b - a);
  const wave = { sine: p => Math.sin(p), tri: p => 2 / Math.PI * Math.asin(Math.sin(p)) };
  function tone(f1, f2, dur, type, vol, start) {
    const s0 = Math.floor(start * SR), n = Math.floor(dur * SR); let ph = 0;
    for (let i = 0; i < n && s0 + i < N; i++) {
      const k = i / n; ph += 2 * Math.PI * f1 * Math.pow(f2 / f1, k) / SR;
      if (s0 + i >= 0) buf[s0 + i] += wave[type](ph) * vol * Math.pow(.004, k) * Math.min(1, i / (SR * .004));
    }
  }
  function noise(dur, vol, start, lo, hi) {   // whoosh: noise dengan filter low-pass yang menyapu
    const s0 = Math.floor(start * SR), n = Math.floor(dur * SR); let y = 0;
    for (let i = 0; i < n && s0 + i < N; i++) {
      const k = i / n, fc = lo + (hi - lo) * Math.sin(Math.PI * k), a = 1 - Math.exp(-2 * Math.PI * fc / SR);
      y += a * (rnd(-1, 1) - y); if (s0 + i >= 0) buf[s0 + i] += y * vol * Math.sin(Math.PI * k);
    }
  }
  const SOUNDS = {
    pop: t => { tone(500, 1400, .12, 'sine', .35, t); tone(1600, 2400, .06, 'tri', .1, t + .05); },
    plop: t => { tone(380, 120, .14, 'sine', .4, t); tone(900, 1500, .08, 'tri', .12, t + .06); },
    blip: t => tone(320, 760, .1, 'sine', .22, t),
    squish: t => tone(rnd(700, 1000), rnd(1300, 1700), .07, 'tri', .06, t),
    tick: t => tone(880, 1320, .08, 'tri', .12, t),
    win: t => [523, 659, 784, 1047].forEach((f, i) => { tone(f, f * 1.01, .35, 'tri', .2, t + i * .12); tone(f * 2, f * 2, .25, 'sine', .05, t + i * .12); }),
    chime: t => [659, 784, 988].forEach((f, i) => tone(f, f * 1.01, .25, 'tri', .17, t + i * .09)),
    ding: t => { tone(1320, 1320, .5, 'sine', .16, t); tone(1980, 1980, .3, 'sine', .06, t); },
    cling: t => [[2093, 0], [3136, .01], [2637, .14], [3951, .15]].forEach(([f, o], i) => tone(f, f * 1.003, i % 2 ? .3 : .45, 'sine', i % 2 ? .06 : .14, t + o)),
    boing: t => { tone(260, 170, .16, 'tri', .22, t); tone(200, 140, .16, 'tri', .16, t + .12); },
    whoosh: t => noise(.4, .45, t - .1, 300, 3500),
  };
  for (const e of sfx) SOUNDS[e.type]?.(e.t);
  const fx = buf.slice(); buf.fill(0);

  // musik latar ceria: 120 bpm, C – G – Am – F
  const BEAT = .5, chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]];
  for (let b = 0; b * BEAT < duration - .3; b++) {
    const t = b * BEAT, ch = chords[Math.floor(b / 4) % 4], arp = [ch[0] * 2, ch[1] * 2, ch[2] * 2, ch[1] * 2];
    tone(ch[0] / 2, ch[0] / 2, BEAT * .9, 'tri', .18, t);                                   // bass
    tone(arp[(b * 2) % 4], arp[(b * 2) % 4], .22, 'tri', .06, t);                          // arpeggio 1/8
    tone(arp[(b * 2 + 1) % 4], arp[(b * 2 + 1) % 4], .22, 'tri', .05, t + BEAT / 2);
    if (b % 2 === 1) noise(.05, .1, t, 4000, 9000);                                        // hi-hat
  }
  const pcm = Buffer.alloc(44 + N * 4);
  pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12);
  pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(SR, 24);
  pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
  for (let i = 0; i < N; i++) {
    const t = i / SR, env = Math.min(1, t / .4) * Math.min(1, Math.max(0, (duration - t) / 1.2));
    const v = Math.tanh((fx[i] + buf[i] * env) * 1.1) * .9 * 32767 | 0;
    pcm.writeInt16LE(v, 44 + i * 4); pcm.writeInt16LE(v, 46 + i * 4);
  }
  const wav = path.join(tmp, 'audio.wav');
  fs.writeFileSync(wav, pcm);

  /* ---------- 3. gabung ---------- */
  const out = path.join(outDir, `${id}.mp4`);
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-c:v', 'copy', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart', '-shortest', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\r✓ ${path.relative(root, out)} (${duration.toFixed(1)} dtk)        `);
}
await browser.close();
server.close();
