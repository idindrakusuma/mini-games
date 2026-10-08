// Tes otomatis: "menulis" semua 62 karakter dengan jari yang melenceng acak, lalu memastikan
// coretan asal TIDAK dianggap selesai. Jalankan setelah `npm run dev` (atau server statis lain di dist/).
// Pakai: BASE=http://localhost:3000 JIT=10 node games/pensil-ajaib/scripts/test-trace.mjs
import { chromium, devices } from 'playwright';
const BASE = process.env.BASE || 'http://localhost:3000';
const JIT = +(process.env.JIT || 10);   // seberapa jauh jari boleh melenceng (satuan kotak 120x180)
const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const p = await (await b.newContext(devices[process.env.DEV || 'iPhone 13'])).newPage();
const errors = [];
p.on('pageerror', e => errors.push(e.message));
p.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
await p.goto(BASE + '/pensil-ajaib/', { waitUntil: 'networkidle' });

// Titik jalur di layar, lewat pensilAjaibTest.toScreen dari game.js (rumus skala tidak diduplikasi di sini)
const plan = (ch, jitter) => p.evaluate(([ch, jitter]) => {
  const map = (x, y) => { const q = pensilAjaibTest.toScreen(x, y), j = () => (Math.random() * 2 - 1) * jitter * q.s; return { x: q.x + j(), y: q.y + j() }; };
  return STROKES[ch].map(d => {
    if (d.startsWith('dot')) { const [, x, y] = d.split(' ').map(Number); return { dot: true, pts: [map(x, y)] }; }
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path'); el.setAttribute('d', d); document.getElementById('measure').append(el);
    const L = el.getTotalLength(), pts = [];
    for (let t = 0; t <= L; t += 6) { const q = el.getPointAtLength(t); pts.push(map(q.x, q.y)); }
    const e = el.getPointAtLength(L); pts.push(map(e.x, e.y)); el.remove();
    return { dot: false, pts };
  });
}, [ch, jitter]);
const finished = () => p.$eval('#nextBtn', e => e.classList.contains('ready'));

const fails = [];
for (const [tab, chars] of [['besar', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'], ['kecil', 'abcdefghijklmnopqrstuvwxyz'], ['angka', '0123456789']]) {
  if (await p.isVisible('#play.on')) await p.click('#homeBtn');
  await p.click(`.tab[data-set=${tab}]`);
  await p.click(`.ch[data-ch="${chars[0]}"]`);
  for (const ch of chars) {
    for (const st of await plan(ch, JIT)) {
      if (st.dot) { await p.mouse.click(st.pts[0].x, st.pts[0].y); continue; }
      await p.mouse.move(st.pts[0].x, st.pts[0].y); await p.mouse.down();
      for (const q of st.pts.slice(1)) await p.mouse.move(q.x, q.y);
      await p.mouse.up();
    }
    if (!await finished()) fails.push(ch);
    await p.click('#nextBtn', { force: true });
  }
}
// Coretan asal di huruf B tidak boleh selesai
if (await p.isVisible('#play.on')) await p.click('#homeBtn');
await p.click('.tab[data-set=besar]'); await p.click('.ch[data-ch="B"]');
const r = await (await p.$('#pad')).boundingBox();
let scribbled = 0;
for (let i = 0; i < 5; i++) {
  await p.click('#redoBtn');
  await p.mouse.move(r.x + 10, r.y + 10); await p.mouse.down();
  for (let j = 0; j < 80; j++) await p.mouse.move(r.x + Math.random() * r.width, r.y + Math.random() * r.height);
  await p.mouse.up();
  if (await finished()) scribbled++;
}
await b.close();
console.log(`Karakter gagal ditulis: ${fails.length ? fails.join(' ') : 'tidak ada'}`);
console.log(`Coretan asal yang lolos: ${scribbled}/5`);
console.log(`Error/404: ${errors.length ? errors.join(', ') : 'tidak ada'}`);
process.exit(fails.length || scribbled || errors.length ? 1 : 0);
