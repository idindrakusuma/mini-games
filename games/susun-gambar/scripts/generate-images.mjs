// Membuat thumbnail (og-image.png 1200x630) dan ikon game susun-gambar.
// Pakai: npm run susun-gambar:images   (butuh Playwright + Chromium; set CHROMIUM_PATH bila perlu)
//
// Gambar puzzle diambil dari public/assets/js/pictures.js, sama persis dengan isi game.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = p => path.join(root, 'public/assets', p);
const EXTRA_JS = ['public/assets/js/pictures.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const fontLink = '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">';

// ART(c, x, y, r): gambar karakter utama berpusat di (x, y) dengan "jari-jari" r.
// ART baru dipanggil setelah font Baloo 2 termuat, jadi teks di canvas boleh memakai
// c.font = '800 100px "Baloo 2"' tanpa jatuh ke font cadangan.
const ART = `function ART(c,x,y,r,icon){
  // papan puzzle 3x3 gambar kucing, satu potongan (kanan atas) terangkat dan miring
  const B=r*1.5, o={x:x-B/2-r*.08,y:y-B/2+r*.08}, cell=B/3, img=document.createElement('canvas');
  img.width=img.height=Math.round(B*2); drawPicture(img.getContext('2d'),PICTURES[icon?0:0],img.width); const src=img.width/3;
  c.save(); c.shadowColor='rgba(27,42,107,.25)'; c.shadowOffsetY=r*.04; c.fillStyle='#FFFDF7';
  c.beginPath(); c.roundRect(o.x-r*.05,o.y-r*.05,B+r*.1,B+r*.1,r*.16); c.fill(); c.restore();
  c.save(); c.beginPath(); c.roundRect(o.x,o.y,B,B,r*.12); c.clip();
  for(let i=0;i<9;i++){ if(i===2) continue; c.drawImage(img,(i%3)*src,Math.floor(i/3)*src,src,src,o.x+(i%3)*cell,o.y+Math.floor(i/3)*cell,cell,cell); }
  c.fillStyle='rgba(185,140,255,.3)'; c.fillRect(o.x+2*cell,o.y,cell,cell);
  c.strokeStyle='rgba(255,255,255,.85)'; c.lineWidth=Math.max(1,r*.018);
  for(const t of [1,2]){ c.beginPath(); c.moveTo(o.x+t*cell,o.y); c.lineTo(o.x+t*cell,o.y+B); c.moveTo(o.x,o.y+t*cell); c.lineTo(o.x+B,o.y+t*cell); c.stroke(); }
  c.restore();
  c.save(); c.translate(o.x+2.5*cell+r*.1,o.y+.5*cell-r*.1); c.rotate(.17);
  c.shadowColor='rgba(27,42,107,.35)'; c.shadowBlur=r*.08; c.shadowOffsetY=r*.05; c.fillStyle='#FFFDF7';
  c.beginPath(); c.roundRect(-cell/2-r*.03,-cell/2-r*.03,cell+r*.06,cell+r*.06,r*.09); c.fill(); c.shadowColor='transparent';
  c.beginPath(); c.roundRect(-cell/2,-cell/2,cell,cell,r*.07); c.clip(); c.drawImage(img,2*src,0,src,src,-cell/2,-cell/2,cell,cell); c.restore();
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
</style></head><body><div class="txt"><h1>Susun<br>Gambar</h1><p>Seret potongan, susun gambarnya!</p></div>
<div class="url">mini-games.indrakusuma.dev/susun-gambar</div>
<canvas id="c" width="520" height="560"></canvas>
<script>${EXTRA_JS}</script><script>${ART}
document.fonts.load('800 100px "Baloo 2"').then(()=>{ART(document.getElementById('c').getContext('2d'),272,290,285);window.done=1;});
</script></body></html>`;

// full: kotak penuh (ikon app); false: sudut membulat (favicon)
const icon = (S, full) => `<!doctype html><html><head>${fontLink}<style>html,body{margin:0;background:transparent}</style></head><body>
<canvas id="c" width="${S}" height="${S}"></canvas><script>${EXTRA_JS}</script><script>${ART}
const c=document.getElementById('c').getContext('2d'), S=${S};
c.fillStyle='#ECE1FF'; ${full ? 'c.fillRect(0,0,S,S);' : 'c.beginPath();c.roundRect(0,0,S,S,S*.22);c.fill();'}
document.fonts.load('800 100px "Baloo 2"').then(()=>{ART(c,S/2,S/2,S*${full ? .52 : .6},1);window.done=1;});
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
console.log('OK: og-image + ikon susun-gambar dibuat');
