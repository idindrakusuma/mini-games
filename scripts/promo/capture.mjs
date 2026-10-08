// Merekam gameplay asli tiap game (frame demi frame, waktu virtual) untuk video promo Threads.
// Game dimainkan otomatis oleh skrip di bawah. Hasilnya: promo/.cache/<klip>/ berisi frame JPEG,
// frames.json (waktu tiap frame), dan events.json (sentuhan jari & kejadian untuk efek suara).
// Pakai: npm run build && node scripts/promo/capture.mjs [klip...]   (butuh Playwright + Chromium)
import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.join(root, 'dist');
const cacheDir = path.join(root, 'promo/.cache');
if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/ belum ada. Jalankan `npm run build` dulu.');

/* ---------- server statis untuk dist/ ---------- */
const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json', '.wasm':'application/wasm' };
const server = http.createServer((q, r) => {
  let p = path.join(dist, decodeURIComponent(q.url.split('?')[0]));
  if (p.endsWith(path.sep)) p += 'index.html';
  if (!p.startsWith(dist) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(r);
}).listen(0);
const BASE = `http://localhost:${server.address().port}`;

const launch = {};
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);

/* ---------- perekam ---------- */
// Merekam frame demi frame dengan waktu virtual, supaya hasilnya mulus dan tajam (2×) berapa pun kecepatan mesin:
// - waktu JS (requestAnimationFrame, setTimeout, performance.now) memakai fake clock Playwright;
// - animasi & transisi CSS di-pause lalu dimajukan manual lewat Web Animations API;
// - setiap frame = tepat 1/FPS detik, diambil dengan screenshot.
// Screencast CDP tidak dipakai karena hanya mengirim frame seukuran CSS pixel (390 px), tidak 2×.
const FPS = 30, DT = 1000 / FPS;
async function record(name, url, hook, play, opts = {}) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', ...(opts.ctx || {}) });
  if (opts.storage) await ctx.addInitScript(s => { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, opts.storage);
  const pg = await ctx.newPage();
  pg.on('pageerror', e => console.error(`[${name}] page error:`, e.message));
  if (hook) await pg.route(hook.match, async route => {
    const res = await route.fetch(); const body = (await res.text()).replace(/\}\)\(\);\s*$/, `window.__T = ${hook.expose};\n})();\n`);
    route.fulfill({ response: res, body });
  });
  await pg.clock.install({ time: 0 });
  await pg.goto(BASE + url);
  await pg.evaluate(() => document.fonts.ready);

  const dir = path.join(cacheDir, name);
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const frames = [], events = [];
  let vt = 0;   // waktu virtual (ms) sejak rekaman dimulai
  async function frame() {
    await pg.clock.runFor(DT);
    await pg.evaluate(dt => {
      for (const a of document.getAnimations()) {
        if (a.__vt == null) { a.__vt = a.currentTime || 0; a.pause(); }
        a.__vt += dt; a.currentTime = a.__vt;
      }
    }, DT);
    vt += DT;
    const file = String(frames.length).padStart(5, '0') + '.jpg';
    await pg.screenshot({ path: path.join(dir, file), type: 'jpeg', quality: 90 });
    frames.push({ t: +(vt / 1000).toFixed(4), file });
  }
  const wait = async ms => { for (let end = vt + ms; vt + DT / 2 < end;) await frame(); };
  // biarkan game selesai memuat dulu (tanpa direkam)
  await pg.clock.runFor(800);
  const now = () => +(vt / 1000).toFixed(3);
  const ev = (type, extra = {}) => events.push({ t: now(), type, ...extra });

  // Jari: setiap gerakan dicatat supaya video bisa menggambar penanda sentuhan (screenshot tidak menampilkan kursor).
  const finger = {
    async down(x, y) { await pg.mouse.move(x, y); ev('finger', { x, y, down: 1 }); await pg.mouse.down(); },
    async move(x, y) { await pg.mouse.move(x, y); ev('finger', { x, y, down: 1 }); },
    async up() { await pg.mouse.up(); ev('finger', { down: 0 }); },
    async tap(x, y) { await this.down(x, y); await wait(100); await this.up(); },
    async drag(pts, ms = 600) {
      await this.down(pts[0].x, pts[0].y); await wait(DT);
      // satu gerakan per frame, mengikuti titik-titik jalur sesuai waktu
      const n = Math.max(1, Math.round(ms / DT));
      for (let i = 1; i <= n; i++) {
        const f = i / n * (pts.length - 1), k = Math.min(pts.length - 2, Math.floor(f)), p = lerp(pts[k], pts[k + 1], f - k);
        // gerakan di antara frame dikirim juga, supaya game yang membaca jalur (Pensil Ajaib) tidak melewatkan titik
        const f0 = (i - 1) / n * (pts.length - 1);
        for (let j = Math.floor(f0) + 1; j <= k; j++) await pg.mouse.move(pts[j].x, pts[j].y);
        await this.move(p.x, p.y); await frame();
      }
      await wait(60); await this.up();
    },
    async tapEl(sel) { const b = await pg.locator(sel).first().boundingBox(); await this.tap(b.x + b.width / 2, b.y + b.height / 2); },
  };
  await play({ pg, finger, ev, sleep: wait, T: expr => pg.evaluate(expr) });
  await wait(opts.tail ?? 400);
  fs.writeFileSync(path.join(dir, 'frames.json'), JSON.stringify({ css: 390, fps: FPS, frames }));
  fs.writeFileSync(path.join(dir, 'events.json'), JSON.stringify(events));
  console.log(`✓ ${name}: ${frames.length} frame, ${(vt / 1000).toFixed(1)} dtk, ${events.filter(e => e.type !== 'finger').length} kejadian`);
  await ctx.close();
}
const lerp = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
const path2 = (a, b, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const k = i / n, e = k * k * (3 - 2 * k); return lerp(a, b, e); });

/* ---------- skrip main per game ---------- */
const CLIPS = {
  // Pemburu Kuman, mode tangan tanpa kamera: gosok kuman pakai jari sampai bersih.
  'pemburu-kuman-tangan': () => record('pemburu-kuman-tangan', '/pemburu-kuman/', {
    match: '**/pemburu-kuman/assets/js/game.js',
    expose: '{ germs: () => germs.filter(g => g.state === "alive" && g.sx != null && g.alpha > .6).map(g => ({ x: g.sx, y: g.sy })), killed: () => round ? round.killed : 0, done: () => !!(round && round.done) }',
  }, async ({ pg, finger, ev, sleep, T }) => {
    await finger.tapEl('.choice.hands'); await sleep(900);
    if (await pg.isVisible('#noCam')) { await finger.tapEl('#noCam'); }
    ev('mark', { name: 'play' });   // video mulai dari sini, panel "kamera belum bisa dibuka" dipotong
    await sleep(1600);
    for (let n = 0; n < 12 && !(await T(() => __T.done())); n++) {
      const g = (await T(() => __T.germs()))[0];
      if (!g) { await sleep(300); continue; }
      const k0 = await T(() => __T.killed());
      await finger.down(g.x, g.y); ev('squish');
      for (let i = 0; i < 16; i++) { const a = i * .9; await sleep(30); await finger.move(g.x + Math.cos(a) * 22, g.y + Math.sin(a) * 16); if (i % 4 === 3) ev('squish'); }
      await finger.up(); if (await T(() => __T.killed()) > k0) ev('pop'); await sleep(350);
    }
    ev('win'); await sleep(2600);
  }),

  // Pemburu Kuman, mode gigi tanpa kamera: usir satu kuman, lalu ortu menekan ✨ "Sudah bersih".
  'pemburu-kuman-gigi': () => record('pemburu-kuman-gigi', '/pemburu-kuman/', {
    match: '**/pemburu-kuman/assets/js/game.js',
    expose: '{ germs: () => germs.filter(g => g.state === "alive" && g.sx != null && g.alpha > .6).map(g => ({ x: g.sx, y: g.sy })), killed: () => round ? round.killed : 0 }',
  }, async ({ pg, finger, ev, sleep, T }) => {
    await finger.tapEl('.choice.teeth'); await sleep(900);
    if (await pg.isVisible('#noCam')) { await finger.tapEl('#noCam'); }
    ev('mark', { name: 'play' });   // video mulai dari sini, panel "kamera belum bisa dibuka" dipotong
    await sleep(2600);
    for (let n = 0; n < 2; n++) {
      const g = (await T(() => __T.germs()))[0]; if (!g) break;
      const k0 = await T(() => __T.killed());
      await finger.down(g.x, g.y); ev('squish');
      for (let i = 0; i < 16; i++) { const a = i * .9; await sleep(30); await finger.move(g.x + Math.cos(a) * 16, g.y + Math.sin(a) * 10); if (i % 4 === 3) ev('squish'); }
      await finger.up(); if (await T(() => __T.killed()) > k0) ev('pop'); await sleep(500);
    }
    await sleep(600);
    await finger.tapEl('#shineBtn'); ev('cling', { at: .05 }); ev('cling', { at: .7 }); ev('pop');
    await sleep(2400); ev('win'); await sleep(1800);
  }),

  // Huruf & Angka, Tebak huruf dengan 4 kartu: sekali salah (kartu goyang), lalu benar.
  'huruf-angka': () => record('huruf-angka', '/huruf-angka/', {
    match: '**/huruf-angka/assets/js/game.js',
    expose: '{ get S(){ return S; } }',
  }, async ({ pg, finger, ev, sleep, T }) => {
    await finger.tapEl('#home .mode[data-set="huruf"]'); ev('blip'); await sleep(1000);
    await finger.tapEl('#menu .mode[data-game="tebak"]'); ev('blip'); await sleep(1300);
    const cards = async () => pg.$$eval('#cards .card', (cs, g) => cs.map(c => { const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, g: c.getAttribute('aria-label'), right: c.getAttribute('aria-label') === g }; }), await T(() => __T.S.target.glyph));
    for (let q = 0; q < 3; q++) {
      const cs = await cards();
      if (q === 0) { await finger.tap(cs.find(c => !c.right).x, cs.find(c => !c.right).y); ev('boing'); await sleep(1100); }
      const r = cs.find(c => c.right); await finger.tap(r.x, r.y); ev('ding');
      await sleep(2700);
    }
  }, { storage: { 'hurufAngka.level': JSON.stringify({ 'huruf-tebak': { lv: 2, streak: 0 } }) } }),

  // Pensil Ajaib: tulis huruf A mengikuti titik hijau, lalu B.
  'pensil-ajaib': () => record('pensil-ajaib', '/pensil-ajaib/', {
    match: '**/pensil-ajaib/assets/js/game.js',
    expose: '{ get T(){ return T; }, scr(x, y){ const r = pad.getBoundingClientRect(); return { x: r.left + view.ox + x * view.s, y: r.top + view.oy + y * view.s }; } }',
  }, async ({ pg, finger, ev, sleep, T }) => {
    await finger.tapEl('.ch[data-ch="A"]'); ev('blip'); await sleep(1300);
    for (let c = 0; c < 2; c++) {
      const strokes = await T(() => __T.T.strokes.map(st => ({ dot: st.dot, pts: st.pts.map(p => __T.scr(p.x, p.y)) })));
      for (const st of strokes) {
        if (st.dot) { await finger.tap(st.pts[0].x, st.pts[0].y); ev('tick'); await sleep(350); continue; }
        const pts = st.pts.filter((_, i) => i % 3 === 0).concat([st.pts.at(-1)]);
        await finger.drag(pts, Math.min(1100, 260 + pts.length * 14)); ev('tick'); await sleep(320);
      }
      ev('win'); await sleep(2300);
      if (c === 0) { await finger.tapEl('#nextBtn'); ev('blip'); await sleep(1100); }
    }
  }),

  // Cocok Bentuk: satu ronde penuh (3 papan), dengan satu kali salah di papan pertama.
  'cocok-bentuk': () => record('cocok-bentuk', '/cocok-bentuk/', {
    match: '**/cocok-bentuk/assets/js/game.js',
    expose: '{ items: () => items.map(i => ({ x: i.x, y: i.y, t: i.target, s: i.state })), targets: () => targets.map(t => ({ x: t.x, y: t.y })), board: () => board, S: () => S }',
  }, async ({ pg, finger, ev, sleep, T }) => {
    await finger.tapEl('#startBtn'); ev('blip'); await sleep(2200);   // biarkan petunjuk 👆 terlihat sebentar
    for (let b = 0; b < 3; b++) {
      const lift = await T(() => Math.min(30, __T.S() * .25));
      const tg = await T(() => __T.targets());
      let items = await T(() => __T.items());
      if (b === 0) {
        const w = items[0], wrong = tg.findIndex((_, i) => i !== w.t);
        await finger.drag(path2(w, { x: tg[wrong].x, y: tg[wrong].y + lift }), 650); ev('boing'); await sleep(900);
      }
      for (let k = 0; k < items.length; k++) {
        const it = (await T(() => __T.items()))[k];
        await finger.drag(path2(it, { x: tg[it.t].x, y: tg[it.t].y + lift }), 620); ev('plop'); await sleep(380);
      }
      ev(b < 2 ? 'chime' : 'win'); await sleep(b < 2 ? 1700 : 2400);
    }
  }),
};

const want = process.argv.slice(2);
for (const [name, run] of Object.entries(CLIPS)) if (!want.length || want.includes(name)) await run();
await browser.close();
server.close();
