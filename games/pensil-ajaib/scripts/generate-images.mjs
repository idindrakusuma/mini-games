// Membuat thumbnail (og-image.png 1200x630) dan ikon game pensil-ajaib.
// Pakai: npm run pensil-ajaib:images   (butuh Playwright + Chromium; set CHROMIUM_PATH bila perlu)
//
// Gambar karakter ada di ART di bawah. Default-nya emoji ✏️ di lingkaran warna.
// Kalau game punya karakter sendiri yang digambar di canvas (seperti germ.js di
// Pemburu Kuman), muat file itu lewat EXTRA_JS lalu panggil fungsinya di ART.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = p => path.join(root, 'public/assets', p);
const EXTRA_JS = ['public/assets/js/strokes.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const fontLink = '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">';

// ART(c, x, y, r): gambar karakter utama berpusat di (x, y) dengan "jari-jari" r.
// ART baru dipanggil setelah font Baloo 2 termuat, jadi teks di canvas boleh memakai
// c.font = '800 100px "Baloo 2"' tanpa jatuh ke font cadangan.
const ART = `function ART(c,x,y,r){
  // Huruf "A" pelangi di atas jalur tulisan, dengan pensil di ujung goresan (pensil hanya di gambar besar)
  const k = r * 2 / 150; c.save(); c.translate(x - 60 * k, y - 80 * k); c.scale(k, k);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const paths = STROKES.A.map(d => new Path2D(d));
  for (const [w, col] of [[30, 'rgba(27,42,107,.16)'], [26, '#FFFDF7']]) { c.strokeStyle = col; c.lineWidth = w; paths.forEach(p => c.stroke(p)); }
  const g = c.createLinearGradient(20, 20, 100, 130);
  ['#FF5D8F','#FF9F1C','#FFD23F','#3FBF62','#47C9E5','#8B5CF6'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
  c.strokeStyle = g; c.lineWidth = 15; paths.forEach(p => c.stroke(p));
  c.restore();
  if (r >= 60) {
    c.font = (r * .62) + 'px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000';
    c.fillText('✏️', x + r * .62, y + r * .55);
    c.font = (r * .3) + 'px "Noto Color Emoji","Apple Color Emoji",sans-serif';
    c.fillText('✨', x - r * .7, y - r * .7); c.fillText('✨', x + r * .75, y - r * .45);
  }
}`;

const og = `<!doctype html><html><head>${fontLink}<style>
html,body{margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:"Baloo 2",sans-serif;color:#1B2A6B;position:relative;
background:radial-gradient(circle at 8% 20%, rgba(255,255,255,.6) 0 26px, transparent 27px),
radial-gradient(circle at 46% 88%, rgba(255,255,255,.45) 0 40px, transparent 41px),
radial-gradient(circle at 56% 12%, rgba(255,255,255,.5) 0 18px, transparent 19px),#ECE1FF}
.txt{position:absolute;left:72px;top:0;bottom:120px;width:600px;display:flex;flex-direction:column;justify-content:center}
h1{font-size:112px;line-height:.92;margin:0 0 22px;font-weight:800;text-shadow:0 6px 0 rgba(255,255,255,.7)}
p{font-size:36px;line-height:1.25;margin:0;color:#3F5A92;font-weight:500}
.url{position:absolute;left:72px;bottom:44px;font-size:26px;font-weight:700;color:#3F5A92}
canvas{position:absolute;right:40px;top:35px}
</style></head><body><div class="txt"><h1>Pensil<br>Ajaib</h1><p>Tulis huruf, lihat keajaibannya!</p></div>
<div class="url">mini-games.indrakusuma.dev/pensil-ajaib</div>
<canvas id="c" width="520" height="560"></canvas>
<script>${EXTRA_JS}</script><script>${ART}
document.fonts.load('800 100px "Baloo 2"').then(()=>{ART(document.getElementById('c').getContext('2d'),260,280,200);window.done=1;});
</script></body></html>`;

// full: kotak penuh (ikon app); false: sudut membulat (favicon)
const icon = (S, full) => `<!doctype html><html><head>${fontLink}<style>html,body{margin:0;background:transparent}</style></head><body>
<canvas id="c" width="${S}" height="${S}"></canvas><script>${EXTRA_JS}</script><script>${ART}
const c=document.getElementById('c').getContext('2d'), S=${S};
c.fillStyle='#ECE1FF'; ${full ? 'c.fillRect(0,0,S,S);' : 'c.beginPath();c.roundRect(0,0,S,S,S*.22);c.fill();'}
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
console.log('OK: og-image + ikon pensil-ajaib dibuat');
