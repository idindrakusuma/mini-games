// Membuat og-image.png dan ikon dari karakter kuman di public/assets/js/germ.js.
// Pakai: node scripts/generate-images.mjs   (butuh Playwright + Chromium)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const germ = fs.readFileSync(path.join(root, 'public/assets/js/germ.js'), 'utf8');
const out = p => path.join(root, 'public/assets', p);
const fontLink = '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">';

const og = `<!doctype html><html><head>${fontLink}<style>
html,body{margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:"Baloo 2",sans-serif;color:#1B2A6B;position:relative;
background:radial-gradient(circle at 8% 20%, rgba(255,255,255,.6) 0 26px, transparent 27px),
radial-gradient(circle at 46% 88%, rgba(255,255,255,.45) 0 40px, transparent 41px),
radial-gradient(circle at 56% 12%, rgba(255,255,255,.5) 0 18px, transparent 19px),#BFEFFA}
.txt{position:absolute;left:72px;top:110px;width:600px}
h1{font-size:112px;line-height:.92;margin:0 0 22px;font-weight:800;text-shadow:0 6px 0 rgba(255,255,255,.7)}
p{font-size:36px;line-height:1.25;margin:0 0 30px;color:#3F5A92;font-weight:500}
.pills{display:flex;gap:16px}.pill{font-size:30px;font-weight:800;border-radius:999px;padding:8px 26px;box-shadow:0 6px 0 rgba(27,42,107,.22)}
.y{background:#FFD23F}.p{background:#FF8FB8}
.url{position:absolute;left:72px;bottom:44px;font-size:26px;font-weight:700;color:#3F5A92}
canvas{position:absolute;right:20px;top:40px}
</style></head><body><div class="txt"><h1>Pemburu<br>Kuman</h1><p>Game kamera untuk anak: usir kuman lucu sambil cuci tangan &amp; sikat gigi!</p>
<div class="pills"><span class="pill y">🖐️ Tangan</span><span class="pill p">🦷 Gigi</span></div></div>
<div class="url">mini-games.indrakusuma.dev/pemburu-kuman</div>
<canvas id="c" width="560" height="560"></canvas>
<script>${germ}</script><script>
const c=document.getElementById('c').getContext('2d');
drawGerm(c,250,320,150,COLORS[0],0.6,0);drawGerm(c,450,140,78,COLORS[1],0.6,2);drawGerm(c,465,430,62,COLORS[4],0.6,4);
</script></body></html>`;

// full: kotak penuh (ikon app); false: sudut membulat (favicon)
const icon = (S, full) => `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>
<canvas id="c" width="${S}" height="${S}"></canvas><script>${germ}</script><script>
const c=document.getElementById('c').getContext('2d'), S=${S};
c.fillStyle='#BFEFFA'; ${full ? 'c.fillRect(0,0,S,S);' : 'c.beginPath();c.roundRect(0,0,S,S,S*.22);c.fill();'}
drawGerm(c,S/2,S*.58,S*${full ? .27 : .3},COLORS[0],0.6,0);
</script></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out('images/og-image.png') });
for (const [name, size, full] of [['icon-512.png', 512, 1], ['icon-192.png', 192, 1], ['apple-touch-icon.png', 180, 1], ['favicon-32.png', 32, 0]]) {
  // Page baru per ikon: setContent di page yang sama tidak membuang deklarasi `const`,
  // jadi script kedua gagal (identifier sudah ada) dan canvas tetap kosong.
  const ip = await browser.newPage({ viewport: { width: size, height: size } });
  await ip.setContent(icon(size, full));
  await ip.locator('#c').screenshot({ path: out('icons/' + name), omitBackground: true });
}
await browser.close();
console.log('OK: og-image + ikon dibuat ulang');
