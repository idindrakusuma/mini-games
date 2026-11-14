/* Berburu Cicak · karakter cicak (canvas).
   Dipakai oleh game.js dan oleh scripts/generate-images.mjs supaya thumbnail sama dengan isi game.
   drawCicak(ctx, x, y, r, warna, t, fase, opsi): r = jari-jari badan, cicak menghadap ke atas
   lalu diputar dengan opsi.angle (radian, 0 = atas, searah jarum jam).
   opsi: angle, walk (kaki bergerak), mood: 'normal' | 'pusing' | 'senang', scale, alpha, tongue */
const CICAK_COLORS = [
  {b:'#8EDB6A',d:'#3D8A2C',s:'#C8F5A9',name:'hijau'},
  {b:'#FFC94D',d:'#B9801A',s:'#FFE7A3',name:'kuning'},
  {b:'#FF9F7A',d:'#C2553A',s:'#FFD1BE',name:'oranye'},
  {b:'#6CCFE6',d:'#2484A0',s:'#BDEFFA',name:'biru'},
  {b:'#C29BFF',d:'#7048C2',s:'#E3D2FF',name:'ungu'}
];
function drawCicak(c,x,y,r,col,t,ph,o={}){
  const mood = o.mood || 'normal', walk = o.walk ? 1 : 0, ink = '#1B2A6B';
  c.save(); c.translate(x,y); c.rotate(o.angle || 0);
  const sc = o.scale ?? 1; c.scale(sc,sc); c.globalAlpha = o.alpha ?? 1;
  if(mood==='pusing') c.rotate(Math.sin(t*14)*.08);
  c.lineCap = c.lineJoin = 'round';

  // bayangan lembut di dinding
  c.fillStyle = 'rgba(40,30,60,.13)';
  c.beginPath(); c.ellipse(r*.18,r*.35,r*.95,r*1.6,0,0,7); c.fill();

  // ekor: melengkung dan bergoyang pelan
  const N = 22, L = [], R = [];
  const sway = mood==='pusing' ? 0 : 1;
  let px = 0, py = r*.7;
  for(let i=0;i<=N;i++){
    const s = i/N;
    const cx = Math.sin(s*3.2 - t*(walk?9:3) + ph)*r*.42*s*(.4+.6*sway) + Math.sin(s*1.6)*r*.25*s;
    const cy = r*.7 + s*r*2.3;
    const w = r*.34*(1-s)**.9 + r*.05;
    const dx = cx-px, dy = (cy-py)||1, len = Math.hypot(dx,dy);
    const nx = -dy/len, ny = dx/len;
    L.push([cx+nx*w, cy+ny*w]); R.push([cx-nx*w, cy-ny*w]);
    px = cx; py = cy;
  }
  c.beginPath(); c.moveTo(...L[0]); L.forEach(p=>c.lineTo(...p));
  const tip = R[N]; c.lineTo((L[N][0]+tip[0])/2, L[N][1]+r*.06);
  for(let i=N;i>=0;i--) c.lineTo(...R[i]);
  c.closePath(); c.fillStyle = col.b; c.fill(); c.lineWidth = r*.08; c.strokeStyle = col.d; c.stroke();
  // belang ekor
  c.strokeStyle = col.s; c.lineWidth = r*.07;
  for(const k of [5,10,15]){ c.beginPath(); c.moveTo(...L[k]); c.lineTo(...R[k]); c.stroke(); }

  // kaki: pasangan diagonal bergantian saat berjalan
  const leg = (sx, front, swing) => {
    const ay = front ? -r*.42 : r*.5;
    const fx = sx*r*1.22, fy = (front ? -r*.95 : r*.95) + swing;
    const ex = sx*r*1.08, ey = ay + (front ? r*.05 : -r*.05) + swing*.4;
    for(const [w,s] of [[r*.38,col.d],[r*.26,col.b]]){
      c.strokeStyle = s; c.lineWidth = w;
      c.beginPath(); c.moveTo(sx*r*.45,ay); c.quadraticCurveTo(ex,ey,fx,fy); c.stroke();
    }
    // jari-jari dengan bantalan bulat (khas cicak)
    const base = Math.atan2(fy-ey, fx-ex);
    for(let k=-2;k<=2;k++){
      const a = base + k*.5, tx = fx+Math.cos(a)*r*.36, ty = fy+Math.sin(a)*r*.36;
      c.strokeStyle = col.d; c.lineWidth = r*.13; c.beginPath(); c.moveTo(fx,fy); c.lineTo(tx,ty); c.stroke();
      c.strokeStyle = col.b; c.lineWidth = r*.06; c.beginPath(); c.moveTo(fx,fy); c.lineTo(tx,ty); c.stroke();
      c.fillStyle = col.s; c.strokeStyle = col.d; c.lineWidth = r*.04;
      c.beginPath(); c.arc(tx,ty,r*.09,0,7); c.fill(); c.stroke();
    }
  };
  const sw = Math.sin(t*12+ph)*r*.25*walk;
  leg(-1,1, sw); leg(1,0, sw); leg(1,1,-sw); leg(-1,0,-sw);

  // badan
  c.fillStyle = col.b; c.strokeStyle = col.d; c.lineWidth = r*.08;
  c.beginPath(); c.ellipse(0,r*.12,r*.68,r*.98,0,0,7); c.fill(); c.stroke();
  // totol di punggung
  c.fillStyle = col.s;
  for(const [sx,sy,sr] of [[0,-.25,.16],[-.3,.2,.12],[.3,.25,.12],[0,.6,.14],[-.22,.85,.08],[.24,.82,.08]]){
    c.beginPath(); c.arc(sx*r,sy*r,sr*r,0,7); c.fill();
  }

  // kepala
  const hy = -r*1.1;
  c.fillStyle = col.b; c.strokeStyle = col.d; c.lineWidth = r*.08;
  c.beginPath(); c.ellipse(0,hy,r*.9,r*.74,0,0,7); c.fill(); c.stroke();
  // pipi
  c.fillStyle = 'rgba(255,110,150,.45)';
  for(const s of [-1,1]){ c.beginPath(); c.ellipse(s*r*.6,hy+r*.22,r*.14,r*.1,0,0,7); c.fill(); }

  // mata besar
  c.lineWidth = r*.07; c.strokeStyle = ink;
  const eyes = [-1,1].map(s=>[s*r*.42, hy-r*.2]);
  if(mood==='pusing'){
    for(const [ex,ey] of eyes){
      c.fillStyle='#fff'; c.beginPath(); c.arc(ex,ey,r*.3,0,7); c.fill(); c.stroke();
      c.lineWidth = r*.05; c.beginPath();
      for(let a=0;a<Math.PI*5;a+=.2){
        const rr = r*.02 + a*r*.014, aa = a + t*10;
        const qx = ex+Math.cos(aa)*rr, qy = ey+Math.sin(aa)*rr;
        a ? c.lineTo(qx,qy) : c.moveTo(qx,qy);
      }
      c.stroke(); c.lineWidth = r*.07;
    }
    // mulut "o"
    c.fillStyle = '#7A1F3D'; c.beginPath(); c.ellipse(0,hy+r*.3,r*.11,r*.13,0,0,7); c.fill();
    // bintang berputar di atas kepala
    for(let k=0;k<3;k++){
      const a = t*4 + k*2.09, sxp = Math.cos(a)*r*.85, syp = hy - r*1.1 + Math.sin(a)*r*.22;
      cicakStar(c, sxp, syp, r*.16, '#FFD23F', '#E0A800');
    }
  } else if(mood==='senang'){
    for(const [ex,ey] of eyes){
      c.fillStyle='#fff'; c.beginPath(); c.arc(ex,ey,r*.3,0,7); c.fill(); c.stroke();
      c.beginPath(); c.arc(ex,ey+r*.06,r*.15,Math.PI*1.1,Math.PI*1.9); c.stroke();
    }
    c.fillStyle = '#7A1F3D';
    c.beginPath(); c.arc(0,hy+r*.18,r*.24,.1*Math.PI,.9*Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#FF7FA8'; c.beginPath(); c.ellipse(0,hy+r*.36,r*.1,r*.05,0,0,7); c.fill();
  } else {
    const lx = Math.sin(t*1.3+ph)*r*.06, ly = Math.cos(t*1.1+ph)*r*.04;
    const blink = ((t+ph)%3.6) < .13;
    for(const [ex,ey] of eyes){
      if(blink){ c.fillStyle=col.b; c.beginPath(); c.arc(ex,ey,r*.3,0,7); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(ex-r*.16,ey); c.lineTo(ex+r*.16,ey); c.stroke(); continue; }
      c.fillStyle='#fff'; c.beginPath(); c.arc(ex,ey,r*.3,0,7); c.fill(); c.stroke();
      c.fillStyle=ink; c.beginPath(); c.arc(ex+lx,ey+ly,r*.17,0,7); c.fill();
      c.fillStyle='#fff'; c.beginPath(); c.arc(ex+lx+r*.05,ey+ly-r*.06,r*.05,0,7); c.fill();
    }
    // senyum + lidah kecil sesekali
    c.beginPath(); c.arc(0,hy+r*.08,r*.24,.2*Math.PI,.8*Math.PI); c.stroke();
    const tg = o.tongue ?? Math.max(0, Math.sin((t+ph)*1.7)) ** 8;
    if(tg > .05){
      c.fillStyle = '#FF6B8A'; c.beginPath();
      c.ellipse(0,hy+r*.32+tg*r*.06,r*.08,r*.06+tg*r*.09,0,0,7); c.fill();
    }
  }
  c.restore();
}
function cicakStar(c,x,y,R,fill,line){
  c.save(); c.translate(x,y); c.beginPath();
  for(let i=0;i<10;i++){ const a = -Math.PI/2 + i*Math.PI/5, rr = i%2 ? R*.48 : R; c.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); }
  c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = R*.18; c.strokeStyle = line; c.stroke(); c.restore();
}
