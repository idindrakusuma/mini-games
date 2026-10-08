// Membuat thumbnail (og-image.png 1200x630) dan ikon game cocok-bentuk.
// Pakai: npm run cocok-bentuk:images   (butuh Playwright + Chromium; set CHROMIUM_PATH bila perlu)
//
// Karakter bentuk digambar dengan shapes.js (lewat EXTRA_JS), sama dengan di dalam game.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = p => path.join(root, 'public/assets', p);
const EXTRA_JS = ['public/assets/js/shapes.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const fontLink = '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">';

// ART(c, x, y, r): gambar karakter utama berpusat di (x, y) dengan "jari-jari" r.
// ART baru dipanggil setelah font Baloo 2 termuat, jadi teks di canvas boleh memakai
// c.font = '800 100px "Baloo 2"' tanpa jatuh ke font cadangan.
const ART = `function ART(c,x,y,r){
  // tiga karakter bentuk dari shapes.js, sama dengan yang ada di dalam game
  drawShape(c,'kotak',x-r*.42,y-r*.3,r*.95,'#7BD88F',{rot:-.12});
  drawShape(c,'lingkaran',x+r*.42,y-r*.32,r*.95,'#FF6B6B',{rot:.08});
  drawShape(c,'segitiga',x,y+r*.36,r*1.05,'#FFD23F',{mood:'happy'});
}`;

const og = `<!doctype html><html><head>${fontLink}<style>
html,body{margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:"Baloo 2",sans-serif;color:#1B2A6B;position:relative;
background:radial-gradient(circle at 8% 20%, rgba(255,255,255,.6) 0 26px, transparent 27px),
radial-gradient(circle at 46% 88%, rgba(255,255,255,.45) 0 40px, transparent 41px),
radial-gradient(circle at 56% 12%, rgba(255,255,255,.5) 0 18px, transparent 19px),#DDF6E3}
.txt{position:absolute;left:72px;top:0;bottom:120px;width:600px;display:flex;flex-direction:column;justify-content:center}
h1{font-size:112px;line-height:.92;margin:0 0 22px;font-weight:800;text-shadow:0 6px 0 rgba(255,255,255,.7)}
p{font-size:36px;line-height:1.25;margin:0;color:#3F5A92;font-weight:500}
.url{position:absolute;left:72px;bottom:44px;font-size:26px;font-weight:700;color:#3F5A92}
canvas{position:absolute;right:40px;top:35px}
</style></head><body><div class="txt"><h1>Cocok<br>Bentuk</h1><p>Yuk, pasangkan bentuk &amp; warna!</p></div>
<div class="url">mini-games.indrakusuma.dev/cocok-bentuk</div>
<canvas id="c" width="520" height="560"></canvas>
<script>${EXTRA_JS}</script><script>${ART}
document.fonts.load('800 100px "Baloo 2"').then(()=>{ART(document.getElementById('c').getContext('2d'),260,280,200);window.done=1;});
</script></body></html>`;

// full: kotak penuh (ikon app); false: sudut membulat (favicon)
const icon = (S, full) => `<!doctype html><html><head>${fontLink}<style>html,body{margin:0;background:transparent}</style></head><body>
<canvas id="c" width="${S}" height="${S}"></canvas><script>${EXTRA_JS}</script><script>${ART}
const c=document.getElementById('c').getContext('2d'), S=${S};
c.fillStyle='#DDF6E3'; ${full ? 'c.fillRect(0,0,S,S);' : 'c.beginPath();c.roundRect(0,0,S,S,S*.22);c.fill();'}
document.fonts.load('800 100px "Baloo 2"').then(()=>{ART(c,S/2,S/2,S*${full ? .3 : .4});window.done=1;});
</script></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.done);
await page.screenshot({ path: out('images/og-image.png') });
for (const [name, size, full] of [['icon-512.png', 512, 1], ['icon-192.png', 192, 1], ['apple-touch-icon.png', 180, 1], ['favicon-32.png', 32, 0]]) {
  // Page baru per ikon: setContent di page yang sama tidak membuang deklarasi `const`,
  // jadi script kedua gagal (identifier sudah ada) dan canvas tetap kosong.
  const ip = await browser.newPage({ viewport: { width: size, height: size } });
  await ip.setContent(icon(size, full), { waitUntil: 'networkidle' });
  await ip.waitForFunction(() => window.done);
  await ip.locator('#c').screenshot({ path: out('icons/' + name), omitBackground: true });
  await ip.close();
}
await browser.close();
console.log('OK: og-image + ikon cocok-bentuk dibuat');
