// Membuat og-image.png dan ikon Taman Bermain (matahari tersenyum di langit).
// Pakai: node games/landing-page/scripts/generate-images.mjs   (butuh Playwright + Chromium)
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = p => path.join(root, 'public/assets', p);
const fontLink = '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;700;800&display=swap" rel="stylesheet">';

// Matahari tersenyum, digambar di canvas
const sun = `function drawSun(c,x,y,r){
  c.save(); c.translate(x,y);
  c.fillStyle='#FFB703';
  for(let i=0;i<12;i++){ c.save(); c.rotate(i*Math.PI/6); c.beginPath(); c.roundRect(-r*.11,-r*1.45,r*.22,r*.4,r*.11); c.fill(); c.restore(); }
  c.fillStyle='#FFD23F'; c.beginPath(); c.arc(0,0,r,0,7); c.fill();
  c.fillStyle='#FF8FB8'; c.globalAlpha=.6;
  for(const s of [-1,1]){ c.beginPath(); c.ellipse(s*r*.55,r*.22,r*.17,r*.11,0,0,7); c.fill(); }
  c.globalAlpha=1; c.fillStyle='#1B2A6B';
  for(const s of [-1,1]){ c.beginPath(); c.ellipse(s*r*.33,-r*.15,r*.1,r*.15,0,0,7); c.fill(); }
  c.fillStyle='#fff';
  for(const s of [-1,1]){ c.beginPath(); c.arc(s*r*.33+r*.03,-r*.21,r*.04,0,7); c.fill(); }
  c.strokeStyle='#1B2A6B'; c.lineWidth=r*.08; c.lineCap='round';
  c.beginPath(); c.arc(0,r*.12,r*.32,.2*Math.PI,.8*Math.PI); c.stroke();
  c.restore();
}`;

const og = `<!doctype html><html><head>${fontLink}<style>
html,body{margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:"Baloo 2",sans-serif;color:#1B2A6B;position:relative;background:#BFEFFA}
.txt{position:absolute;left:72px;top:130px;width:640px}
h1{font-size:120px;line-height:.92;margin:0 0 22px;font-weight:800;text-shadow:0 6px 0 rgba(255,255,255,.7)}
p{font-size:38px;line-height:1.25;margin:0;color:#3F5A92;font-weight:500}
.url{position:absolute;left:72px;bottom:44px;font-size:26px;font-weight:700;color:#3F5A92}
canvas{position:absolute;inset:0}
</style></head><body><canvas id="c" width="1200" height="630"></canvas>
<div class="txt"><h1>Taman<br>Bermain</h1><p>Game seru untuk anak, langsung main di browser!</p></div>
<div class="url">mini-games.indrakusuma.dev</div>
<script>${sun}
const c=document.getElementById('c').getContext('2d');
// pelangi
const bands=['#FF8FB8','#FFB703','#FFD23F','#7BD88F','#47C9E5','#B98CFF'];
bands.forEach((b,i)=>{ c.strokeStyle=b; c.lineWidth=26; c.beginPath(); c.arc(960,700,330-i*26,Math.PI,2*Math.PI); c.stroke(); });
// awan
c.fillStyle='rgba(255,255,255,.95)';
for(const [x,y,s] of [[760,560,1.3],[1090,590,1],[620,90,.8]]){
  c.beginPath(); c.arc(x,y,40*s,0,7); c.arc(x+45*s,y-20*s,50*s,0,7); c.arc(x+95*s,y,40*s,0,7); c.fill();
}
drawSun(c,1010,190,110);
</script></body></html>`;

// full: kotak penuh (ikon app); false: sudut membulat (favicon)
const icon = (S, full) => `<!doctype html><html><head><style>html,body{margin:0;background:transparent}</style></head><body>
<canvas id="c" width="${S}" height="${S}"></canvas><script>${sun}
const c=document.getElementById('c').getContext('2d'), S=${S};
c.fillStyle='#BFEFFA'; ${full ? 'c.fillRect(0,0,S,S);' : 'c.beginPath();c.roundRect(0,0,S,S,S*.22);c.fill();'}
drawSun(c,S/2,S/2,S*${full ? .26 : .3});
</script></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(og, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out('images/og-image.png') });
for (const [name, size, full] of [['apple-touch-icon.png', 180, 1], ['favicon-32.png', 32, 0]]) {
  // Page baru per ikon: setContent di page yang sama tidak membuang deklarasi `const`,
  // jadi script kedua gagal (identifier sudah ada) dan canvas tetap kosong.
  const ip = await browser.newPage({ viewport: { width: size, height: size } });
  await ip.setContent(icon(size, full));
  await ip.screenshot({ path: out('icons/' + name), omitBackground: !full });
  await ip.close();
}
await browser.close();
console.log('OK: og-image.png, apple-touch-icon.png, favicon-32.png');
