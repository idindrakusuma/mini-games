// Pratinjau semua jalur goresan: angka = urutan goresan (di titik mulai), panah = arah di ujung goresan.
// Pakai: node games/pensil-ajaib/scripts/preview-strokes.mjs [output.png]   (butuh Playwright)
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strokesJs = fs.readFileSync(path.join(root, 'public/assets/js/strokes.js'), 'utf8');
const outFile = process.argv[2] || path.join(os.tmpdir(), 'pensil-ajaib-strokes.png');

const html = `<!doctype html><html><head><style>
body{margin:0;background:#fff;font-family:sans-serif}
.grid{display:grid;grid-template-columns:repeat(13,120px);gap:6px;padding:10px}
.cell{border:1px solid #ddd;border-radius:8px;position:relative}
.cell b{position:absolute;left:6px;top:2px;font-size:14px;color:#888}
svg{display:block}
</style></head><body><div class="grid" id="g"></div>
<script>${strokesJs}</script><script>
const NS='http://www.w3.org/2000/svg', COL=['#E63946','#2A9D8F','#7B2CBF','#F4A261','#1D3557'];
const g=document.getElementById('g');
for (const ch of Object.keys(STROKES).sort((a,b)=>{const r=x=>/[A-Z]/.test(x)?0:/[a-z]/.test(x)?1:2; return r(a)-r(b)||a.localeCompare(b);})) {
  const cell=document.createElement('div'); cell.className='cell'; cell.innerHTML='<b>'+ch+'</b>';
  const svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox','0 0 120 180'); svg.setAttribute('width',120); svg.setAttribute('height',180);
  for (const y of [BOX.top,BOX.mid,BOX.base,BOX.desc]) { const l=document.createElementNS(NS,'line'); l.setAttribute('x1',0); l.setAttribute('x2',120); l.setAttribute('y1',y); l.setAttribute('y2',y); l.setAttribute('stroke', y===BOX.base?'#bbb':'#eee'); svg.append(l); }
  cell.append(svg); g.append(cell);
  STROKES[ch].forEach((d,i)=>{
    const c=COL[i%COL.length];
    const num=(x,y)=>{ const t=document.createElementNS(NS,'circle'); t.setAttribute('cx',x); t.setAttribute('cy',y); t.setAttribute('r',7); t.setAttribute('fill',c); svg.append(t);
      const n=document.createElementNS(NS,'text'); n.setAttribute('x',x); n.setAttribute('y',y+4); n.setAttribute('text-anchor','middle'); n.setAttribute('font-size',10); n.setAttribute('fill','#fff'); n.textContent=i+1; svg.append(n); };
    if (d.startsWith('dot')) { const [,x,y]=d.split(' ').map(Number); num(x,y); return; }
    const p=document.createElementNS(NS,'path'); p.setAttribute('d',d); p.setAttribute('fill','none'); p.setAttribute('stroke',c); p.setAttribute('stroke-width',4); p.setAttribute('stroke-linecap','round'); p.setAttribute('stroke-linejoin','round'); p.setAttribute('opacity',.8); svg.append(p);
    const L=p.getTotalLength(), a=p.getPointAtLength(L), b=p.getPointAtLength(Math.max(0,L-8)), s=p.getPointAtLength(0);
    const ang=Math.atan2(a.y-b.y,a.x-b.x), h=document.createElementNS(NS,'path');
    h.setAttribute('d','M'+(a.x-9*Math.cos(ang-0.5))+' '+(a.y-9*Math.sin(ang-0.5))+' L'+a.x+' '+a.y+' L'+(a.x-9*Math.cos(ang+0.5))+' '+(a.y-9*Math.sin(ang+0.5)));
    h.setAttribute('fill','none'); h.setAttribute('stroke',c); h.setAttribute('stroke-width',3); svg.append(h);
    num(s.x,s.y);
  });
}
</script></body></html>`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1660, height: 1000 } });
await page.setContent(html);
await page.screenshot({ path: outFile, fullPage: true });
await browser.close();
console.log('OK:', outFile);
