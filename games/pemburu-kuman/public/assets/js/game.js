/* Pemburu Kuman · logika game: kamera, deteksi tangan/gigi, kuman, skor. */
/* Mode gigi memakai MediaPipe Face Landmarker (assets/vendor/) untuk mencari mulut; kalau gagal dimuat, kembali ke deteksi warna. */
(() => {
const $ = s => document.querySelector(s);
const rnd = (a,b) => a + Math.random()*(b-a);
const pick = a => a[Math.floor(Math.random()*a.length)];
const FONT = '"Baloo 2","Trebuchet MS",system-ui,sans-serif';

/* ---------- Stars (per device) ---------- */
let stars = 0;
try { stars = parseInt(localStorage.getItem('pemburuKuman.stars') || '0', 10) || 0; } catch(e) {}
function saveStars(){ try { localStorage.setItem('pemburuKuman.stars', String(stars)); } catch(e) {} }
function showStars(){ $('#starsHome').textContent = `⭐ ${stars} bintang`; }
showStars();

/* ---------- Sound ---------- */
let ac = null;
function audio(){ if(!ac){ try{ ac = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } if(ac && ac.state==='suspended') ac.resume(); return ac; }
function tone(f1,f2,dur,type='sine',vol=.22,delay=0){
  const a = audio(); if(!a) return;
  const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.001,t+dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t+dur+.02);
}
const sPop = () => { tone(500,1400,.12,'sine',.3); tone(1600,2400,.06,'triangle',.08,.05); };
let lastSquish = 0;
const sSquish = () => { const n=performance.now(); if(n-lastSquish<140) return; lastSquish=n; tone(rnd(700,1000),rnd(1300,1700),.07,'triangle',.06); };
// "Cling cling": dua dentingan lonceng tinggi.
const sCling = d => [[2093,0],[3136,.01],[2637,.14],[3951,.15]].forEach(([f,o],i)=>tone(f,f*1.003,i%2?.3:.45,'sine',i%2?.06:.15,d+o));
const sWin = () => [523,659,784,1047].forEach((f,i)=>tone(f,f*1.01,.25,'triangle',.18,i*.12));

/* ---------- Home hero ---------- */
const hero = $('#heroGerm'), hctx = hero.getContext('2d');
function drawHero(t){
  hctx.clearRect(0,0,440,360);
  drawGerm(hctx,170,200,92,COLORS[0],t,0);
  drawGerm(hctx,330,120,52,COLORS[1],t,2);
  drawGerm(hctx,345,275,38,COLORS[4],t,4);
}

/* ---------- Play state ---------- */
const play=$('#play'), cv=$('#stage'), ctx=cv.getContext('2d'), video=$('#video');
let screen='home', mode='hands', useCam=false, stream=null, facing='user';
let CW=0, CH=0;
function resize(){
  const dpr = Math.min(2, window.devicePixelRatio||1);
  CW = cv.clientWidth; CH = cv.clientHeight;
  cv.width = Math.round(CW*dpr); cv.height = Math.round(CH*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize', () => { if(screen==='play') resize(); });

/* Cartoon fallback (no camera) */
const cartoon = document.createElement('canvas'); cartoon.width=480; cartoon.height=360;
function drawCartoon(){
  const c = cartoon.getContext('2d');
  c.fillStyle='#BDEBF5'; c.fillRect(0,0,480,360);
  c.strokeStyle='#E6F7FB'; c.lineWidth=3;
  for(let x=0;x<480;x+=60){ c.beginPath(); c.moveTo(x,0); c.lineTo(x,360); c.stroke(); }
  for(let y=0;y<360;y+=60){ c.beginPath(); c.moveTo(0,y); c.lineTo(480,y); c.stroke(); }
  const skin='#E8B48A';
  c.fillStyle=skin; c.strokeStyle='#B5764A'; c.lineWidth=5;
  if(mode==='hands'){
    const R=(x,y,w,h,r)=>{ c.beginPath(); c.roundRect(x,y,w,h,r); c.fill(); };
    R(150,70,40,140,20); R(200,48,42,160,21); R(252,56,40,150,20); R(300,86,36,120,18);
    c.save(); c.translate(150,215); c.rotate(-.75); R(-20,-90,40,110,20); c.restore();
    c.beginPath(); c.ellipse(244,230,100,92,0,0,7); c.fill();
    R(196,280,96,80,10);
  } else {
    c.beginPath(); c.ellipse(240,190,190,170,0,0,7); c.fill();
    c.fillStyle='#D9607A'; c.beginPath(); c.ellipse(240,230,118,72,0,0,7); c.fill();
    c.fillStyle='#5A1424'; c.beginPath(); c.ellipse(240,230,100,56,0,0,7); c.fill();
    c.fillStyle='#fff';
    for(let i=0;i<6;i++){ c.beginPath(); c.roundRect(170+i*24,178,22,30,6); c.fill(); }
    for(let i=0;i<5;i++){ c.beginPath(); c.roundRect(182+i*24,256,22,26,6); c.fill(); }
    c.fillStyle='#1B2A6B';
    c.beginPath(); c.arc(180,110,14,0,7); c.fill(); c.beginPath(); c.arc(300,110,14,0,7); c.fill();
  }
}

/* ---------- Detection (skin + teeth, runs fully on the device) ---------- */
const det = document.createElement('canvas'), dctx = det.getContext('2d',{willReadFrequently:true});
let W=56,H=42,N=W*H, prevGray, motion, mask, cand=[], detKey='', firstFrame=true;
let detected=false, lastSeen=0;
function setupDet(sw,sh){
  if(sw>=sh){ W=56; H=Math.max(24,Math.round(56*sh/sw)); } else { H=56; W=Math.max(24,Math.round(56*sw/sh)); }
  N=W*H; det.width=W; det.height=H;
  prevGray=new Float32Array(N); motion=new Float32Array(N); mask=new Uint8Array(N);
  detKey=sw+'x'+sh; firstFrame=true;
}
function integral(a){
  const I=new Int32Array((W+1)*(H+1));
  for(let y=0;y<H;y++){ let row=0; for(let x=0;x<W;x++){ row+=a[y*W+x]; I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+row; } }
  return I;
}
function box(I,x,y,r){
  const x0=Math.max(0,x-r), y0=Math.max(0,y-r), x1=Math.min(W,x+r+1), y1=Math.min(H,y+r+1);
  return I[y1*(W+1)+x1]-I[y0*(W+1)+x1]-I[y1*(W+1)+x0]+I[y0*(W+1)+x0];
}
/* ---------- Face model for teeth mode (optional, on-device) ---------- */
// Titik bibir bagian dalam (FaceMesh), dari sudut mulut 78 ke sudut mulut 308.
const LIP_UP=[78,191,80,81,82,13,312,311,310,415,308], LIP_LO=[78,95,88,178,87,14,317,402,318,324,308];
const vendor = f => new URL('assets/vendor/'+f, document.baseURI).href, MP='mediapipe-0.10.35/';
// Ukuran asli dua file terbesar, untuk progress bar (content-length bisa berupa ukuran terkompresi).
const WASM_BYTES=11153617, MODEL_BYTES=3758596;
let face=null, faceState='idle', faceTs=0, faceGot=0, faceStart=0, mouth=null, faceSeen=false;
const mcv = document.createElement('canvas'), mctx = mcv.getContext('2d',{willReadFrequently:true});
async function grab(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error(res.status+' '+url);
  if(!res.body){ const b=new Uint8Array(await res.arrayBuffer()); faceGot+=b.length; return b; }
  const reader=res.body.getReader(), parts=[]; let n=0;
  for(;;){ const {done,value}=await reader.read(); if(done) break; parts.push(value); n+=value.length; faceGot+=value.length; }
  const out=new Uint8Array(n); let o=0; for(const p of parts){ out.set(p,o); o+=p.length; }
  return out;
}
// Hanya dipanggil saat mode gigi dipilih, jadi mode tangan tidak pernah mengunduh model.
async function loadFace(){
  if(faceState!=='idle') return;
  faceState='loading'; faceGot=0; faceStart=performance.now();
  let blobUrl=null;
  try{
    const {FilesetResolver, FaceLandmarker} = await import(vendor(MP+'vision_bundle.mjs'));
    const files = await FilesetResolver.forVisionTasks(vendor(MP+'wasm'));
    // Hanya varian SIMD yang disimpan; jangan unduh apa pun kalau browser butuh varian lain.
    if(/nosimd/.test(files.wasmBinaryPath)) throw new Error('no wasm simd');
    const [wasm, model] = await Promise.all([grab(files.wasmBinaryPath), grab(vendor('face_landmarker-f16-v1.task'))]);
    files.wasmBinaryPath = blobUrl = URL.createObjectURL(new Blob([wasm], {type:'application/wasm'}));
    const opts = delegate => ({baseOptions:{modelAssetBuffer:new Uint8Array(model), delegate}, runningMode:'VIDEO', numFaces:1});
    try{ face = await FaceLandmarker.createFromOptions(files, opts('GPU')); }
    catch(e){ face = await FaceLandmarker.createFromOptions(files, opts('CPU')); }
    faceState='ready';
  }catch(e){ face=null; faceState='failed'; }
  finally{ if(blobUrl) URL.revokeObjectURL(blobUrl); }
}
const faceLoading = () => mode==='teeth' && useCam && faceState==='loading';
// Loader baru muncul kalau unduhan agak lama, supaya tidak berkedip saat file sudah ada di cache.
let lastPct=-1;
function showLoader(now){
  const on = faceLoading() && now-faceStart>300 && !$('#camSheet').classList.contains('on');
  $('#loadSheet').classList.toggle('on', on);
  if(!on) return;
  const pct = Math.min(99, Math.round(faceGot/(WASM_BYTES+MODEL_BYTES)*100));
  if(pct===lastPct) return;
  lastPct=pct;
  $('#loadBar').style.width = pct+'%';
  $('#loadPct').textContent = pct+'%';
  $('#loadSheet .bar').setAttribute('aria-valuenow', pct);
}
const useFace = () => mode==='teeth' && useCam && faceState==='ready';
function lipAt(poly,t){
  const f=t*(poly.length-1), i=Math.min(poly.length-2, f|0), k=f-i;
  return [poly[i][0]+(poly[i+1][0]-poly[i][0])*k, poly[i][1]+(poly[i+1][1]-poly[i][1])*k];
}
// Posisi gigi: sedikit masuk dari garis bibir ke arah tengah mulut. Hasilnya koordinat 0..1 di layar.
function anchorUV(a){
  const p=lipAt(a.up?mouth.up:mouth.lo, a.t), q=lipAt(a.up?mouth.lo:mouth.up, a.t);
  return [p[0]+(q[0]-p[0])*.3, p[1]+(q[1]-p[1])*.3];
}
const cellOf = uv => Math.min(H-1,Math.max(0,(uv[1]*H)|0))*W + Math.min(W-1,Math.max(0,(uv[0]*W)|0));
function inPoly(x,y,P){
  let c=false;
  for(let i=0,j=P.length-1;i<P.length;j=i++){
    if((P[i][1]>y)!==(P[j][1]>y) && x<(P[j][0]-P[i][0])*(y-P[i][1])/(P[j][1]-P[i][1])+P[i][0]) c=!c;
  }
  return c;
}
// Mengembalikan true kalau gigi kelihatan. Mengisi `mouth` (koordinat layar, ikut dicermin seperti grid deteksi).
function analyzeMouth(s){
  let r;
  try{ faceTs=Math.max(faceTs+1, Math.round(performance.now())); r=face.detectForVideo(s.el, faceTs); }
  catch(e){ face=null; faceState='failed'; return false; }
  const L = r && r.faceLandmarks && r.faceLandmarks[0];
  faceSeen = !!L;
  if(!L) return false;
  const raw = i => [L[i].x, L[i].y], up=LIP_UP.map(raw), lo=LIP_LO.map(raw);
  const px = (a,b) => Math.hypot((a[0]-b[0])*s.w, (a[1]-b[1])*s.h);
  const width = px(up[0],up[10]), gap = px(raw(13),raw(14));
  const flip = p => [s.mirror?1-p[0]:p[0], p[1]];
  mouth = {up:up.map(flip), lo:lo.map(flip)};
  if(width < 12 || gap < width*.05) return false;
  // Gigi = piksel terang dan tidak kemerahan di dalam bibir bagian dalam.
  const poly = up.concat(lo.slice(1,-1).reverse());
  let x0=1,y0=1,x1=0,y1=0; for(const p of poly){ x0=Math.min(x0,p[0]); y0=Math.min(y0,p[1]); x1=Math.max(x1,p[0]); y1=Math.max(y1,p[1]); }
  const sx=Math.max(0,x0*s.w), sy=Math.max(0,y0*s.h), sw=Math.min(s.w,x1*s.w)-sx, sh=Math.min(s.h,y1*s.h)-sy;
  if(sw<4 || sh<2) return false;
  const MW=48, MH=Math.max(6, Math.min(48, Math.round(MW*sh/sw)));
  if(mcv.width!==MW || mcv.height!==MH){ mcv.width=MW; mcv.height=MH; }
  mctx.drawImage(s.el, sx, sy, sw, sh, 0, 0, MW, MH);
  const d = mctx.getImageData(0,0,MW,MH).data;
  let inside=0, teeth=0;
  for(let y=0;y<MH;y++) for(let x=0;x<MW;x++){
    if(!inPoly((sx+(x+.5)*sw/MW)/s.w, (sy+(y+.5)*sh/MH)/s.h, poly)) continue;
    inside++;
    const p=(y*MW+x)*4, r=d[p], g=d[p+1], b=d[p+2], mx=Math.max(r,g,b), mn=Math.min(r,g,b);
    if(.299*r+.587*g+.114*b>95 && mx-mn<Math.max(45,mx*.32) && r-b<70) teeth++;
  }
  return inside>=12 && (teeth>=inside*.08 || gap>width*.3);
}

function source(){
  if(useCam) return {el:video, w:video.videoWidth, h:video.videoHeight, mirror:facing==='user', ready:video.readyState>=2 && video.videoWidth>0};
  return {el:cartoon, w:480, h:360, mirror:false, ready:true};
}
function analyze(now){
  const s = source(); if(!s.ready) return;
  if(detKey !== s.w+'x'+s.h) setupDet(s.w,s.h);
  dctx.save(); if(s.mirror){ dctx.translate(W,0); dctx.scale(-1,1); }
  dctx.drawImage(s.el,0,0,W,H); dctx.restore();
  const d = dctx.getImageData(0,0,W,H).data;
  const skin=new Uint8Array(N), white=new Uint8Array(N), dark=new Uint8Array(N);
  for(let i=0,p=0;i<N;i++,p+=4){
    const r=d[p], g=d[p+1], b=d[p+2], gray=.299*r+.587*g+.114*b;
    const diff = firstFrame ? 0 : Math.abs(gray-prevGray[i]);
    motion[i] = motion[i]*.4 + diff*.6; prevGray[i]=gray;
    const cr=.5*r-.4187*g-.0813*b+128, cb=-.1687*r-.3313*g+.5*b+128;
    if(cr>135 && cr<178 && cb>78 && cb<130 && r>70 && r>g && r>b) skin[i]=1;
    const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
    if(mn>130 && mx-mn<55) white[i]=1;
    if(gray<75) dark[i]=1;
  }
  firstFrame=false;
  const Is=integral(skin), clean=new Uint8Array(N); let sc=0;
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const i=y*W+x; if(skin[i] && box(Is,x,y,1)>=5){ clean[i]=1; sc++; } }
  mask.fill(0); cand.length=0;
  if(faceLoading()){
    // tunggu model selesai diunduh; loader yang tampil
  } else if(useFace()){
    if(analyzeMouth(s)) cand.push(0);
    if(mouth) for(const g of germs){
      if(g.state!=='alive') continue;
      if(!g.a){ g.a={up:Math.random()<.5, t:rnd(.2,.8)}; }
      g.cell=cellOf(anchorUV(g.a));
    }
  } else if(mode==='hands'){
    if(sc > N*.03 && sc < N*.85) for(let i=0;i<N;i++) if(clean[i]){ mask[i]=1; cand.push(i); }
  } else {
    const Ic=integral(clean), Id=integral(dark), tmp=[];
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const i=y*W+x;
      if(white[i] && box(Ic,x,y,5)>=6 && box(Id,x,y,3)>=2) tmp.push(i);
    }
    if(tmp.length>=3 && tmp.length<N*.2) for(const i of tmp){ mask[i]=1; cand.push(i); }
  }
  detected = cand.length>0;
  if(detected) lastSeen=now;
  // keep germs glued to the hand / teeth
  for(const g of germs){
    if(g.state!=='alive' || !detected || (g.a && useFace()) || mask[g.cell]) continue;
    const gx=g.cell%W, gy=(g.cell/W)|0; let best=-1, bd=1e9;
    for(const c of cand){ const dx=c%W-gx, dy=((c/W)|0)-gy, dd=dx*dx+dy*dy; if(dd<bd){ bd=dd; best=c; } }
    if(best>=0) g.cell=best;
  }
  // scrubbing = local movement around a germ
  if(useCam && detected){
    let gm=0; for(let i=0;i<N;i++) gm+=motion[i]; gm/=N;
    for(const g of germs){
      if(g.state!=='alive' || g.alpha<.5) continue;
      const gx=g.cell%W, gy=(g.cell/W)|0; let m=0,n=0;
      for(let y=Math.max(0,gy-2);y<=Math.min(H-1,gy+2);y++) for(let x=Math.max(0,gx-2);x<=Math.min(W-1,gx+2);x++){ m+=motion[y*W+x]; n++; }
      m = m/n - gm*.5;
      if(m>10) hurt(g, Math.min(5,(m-10)*.18), now);
    }
  }
}

/* ---------- Game ---------- */
let germs=[], parts=[], round=null, lastSpawn=0, lastAnalyze=0;
const TAUNT = {
  hands:['Hihi, aku ngumpet di sini!','Tangan ini lengket, enak!','Jangan pakai sabun yaa!','Aku suka tangan kotor!'],
  teeth:['Nyam, sisa permen!','Gigi ini rumahku!','Jangan disikat yaa!','Hihi, aku bikin bolong!']
};
const OUCH = {
  hands:['Aaah, busa!','Kabuuur!','Licin banget!','Ampun sabun!'],
  teeth:['Aaah, odol!','Kabuuur!','Mint, pedes!','Ampun sikat!']
};
function newRound(){
  germs=[]; parts=[];
  round = {total: mode==='hands'?6:5, spawned:0, killed:0, done:false};
  updateCounter();
}
function updateCounter(){
  const left = round ? round.total-round.killed : 0;
  $('#counter').textContent = left ? `🦠 ${left} kuman` : '✨ Bersih!';
}
function spawn(now){
  if(useFace() && mouth) return spawnTooth(now);
  let best=null, bd=-1;
  for(let k=0;k<12;k++){
    const c = pick(cand), cx=c%W, cy=(c/W)|0;
    let md=1e9; for(const g of germs){ if(g.state!=='alive') continue; const dx=g.cell%W-cx, dy=((g.cell/W)|0)-cy; md=Math.min(md,dx*dx+dy*dy); }
    if(md>bd){ bd=md; best=c; }
  }
  addGerm({cell:best, ox:rnd(-.4,.4), oy:rnd(-.4,.4)}, now);
}
// Kuman di gigi menempel ke titik bibir, jadi ikut bergerak bersama mulut.
function spawnTooth(now){
  let best=null, bd=-1;
  for(let k=0;k<12;k++){
    const a={up:Math.random()<.5, t:rnd(.18,.82)}, uv=anchorUV(a);
    let md=1e9; for(const g of germs){ if(g.state!=='alive' || !g.a) continue; const o=anchorUV(g.a); md=Math.min(md,(o[0]-uv[0])**2+(o[1]-uv[1])**2); }
    if(md>bd){ bd=md; best=a; }
  }
  addGerm({a:best, cell:cellOf(anchorUV(best)), ox:0, oy:0}, now);
}
function addGerm(pos, now){
  germs.push(Object.assign(pos, {hp:100, col:pick(COLORS), ph:rnd(0,6), state:'alive', alpha:0,
    sx:null, sy:null, hurtT:0, say:pick(TAUNT[mode]), sayUntil:now+1800, size:rnd(.85,1.15)}));
  round.spawned++; lastSpawn=now;
}
function hurt(g,amt,now){
  if(g.state!=='alive') return;
  g.hp-=amt; g.hurtT=now;
  if(Math.random()<.45 && g.sx!=null) bubble(g.sx+rnd(-20,20), g.sy+rnd(-20,20));
  sSquish();
  if(g.hp<=0) kill(g,now);
}
function kill(g,now){
  g.state='pop'; g.popT=now; g.say=pick(OUCH[mode]); g.sayUntil=now+1100;
  for(let i=0;i<10;i++) bubble(g.sx,g.sy,true);
  for(let i=0;i<6;i++) parts.push({type:'star',x:g.sx,y:g.sy,vx:rnd(-4,4),vy:rnd(-6,-2),r:rnd(7,12),life:0,max:900,rot:rnd(0,6)});
  sPop();
  round.killed++; updateCounter();
  if(round.killed>=round.total && !round.done){ round.done=true; setTimeout(win,900); }
}
function bubble(x,y,burst){
  parts.push({type:'bubble',x,y,vx:burst?rnd(-3,3):rnd(-.6,.6),vy:burst?rnd(-4,-1):rnd(-1.6,-.6),r:rnd(5,burst?16:11),life:0,max:rnd(700,1200)});
}
function win(){
  stars++; saveStars(); showStars(); sWin();
  for(let i=0;i<40;i++) parts.push({type:'star',x:rnd(0,CW),y:-20,vx:rnd(-1,1),vy:rnd(2,5),r:rnd(8,14),life:0,max:2200,rot:rnd(0,6)});
  $('#winTitle').textContent = mode==='hands' ? 'Hore, tanganmu bersih!' : 'Hore, gigimu kinclong!';
  $('#winText').textContent = `Semua kuman kabur. Kamu dapat 1 bintang! Sekarang ada ${stars} bintang ⭐`;
  $('#winSheet').classList.add('on');
}

/* Tombol orang tua "Sudah bersih": semua kuman kabur, gigi berkilau, lalu menang. */
let viewRect=null;
function teethPoints(n){
  const pts=[], R=viewRect;
  for(let i=0;i<n;i++){
    let uv=null;
    if(R && useFace() && mouth) uv=anchorUV({up:i%2===0, t:rnd(.12,.88)});
    else if(R && cand.length>1){ const c=pick(cand); uv=[((c%W)+.5)/W, (((c/W)|0)+.5)/H]; }
    pts.push(uv ? [R.x+uv[0]*R.w, R.y+uv[1]*R.h] : [CW*rnd(.3,.7), CH*rnd(.42,.58)]);
  }
  return pts;
}
function shine(){
  if(!round || round.done) return;
  const now=performance.now(), r=round;
  audio(); round.done=true;
  let said=false;
  for(const g of germs) if(g.state==='alive'){
    // cukup satu kuman yang teriak, supaya balon katanya tidak menumpuk
    g.state='pop'; g.popT=now; g.say=pick(OUCH[mode]); g.sayUntil=said?0:now+1100; said=true;
    if(g.sx!=null) for(let i=0;i<4;i++) bubble(g.sx,g.sy,true);
  }
  round.killed=round.total; updateCounter(); sPop();
  // kilau muncul bergantian, dua gelombang, masing-masing dengan bunyi "cling"
  const pts=teethPoints(6), R=germR();
  let cx=0, cy=0; for(const [x,y] of pts){ cx+=x/pts.length; cy+=y/pts.length; }
  let spread=0; for(const [x,y] of pts) spread=Math.max(spread, Math.hypot(x-cx,y-cy));
  for(const d of [0,650]) parts.push({type:'glow',x:cx,y:cy,vx:0,vy:0,r:Math.max(R*2.2,spread*1.4),life:-d,max:900});
  // sedikit kilau saja: tiga per gelombang, satu "cling" per gelombang
  pts.forEach(([x,y],i) => parts.push({type:'sparkle',x,y,vx:0,vy:0,r:rnd(R*1.4,R*1.9),life:-(i%3)*140-(i>=3?650:0),max:700,rot:rnd(-.15,.15)}));
  sCling(.05); sCling(.7);
  setTimeout(() => { if(round===r && screen==='play') win(); }, 2400);
}
// Kilau cahaya putih: titik terang dengan sinar tipis, seperti pantulan cahaya di gigi.
function sparkle(c,x,y,r,rot){
  if(r<=0) return;
  c.save(); c.translate(x,y); c.rotate(rot);
  const halo=c.createRadialGradient(0,0,0,0,0,r*.6);
  halo.addColorStop(0,'rgba(255,255,255,.95)'); halo.addColorStop(1,'rgba(255,255,255,0)');
  c.fillStyle=halo; c.beginPath(); c.arc(0,0,r*.6,0,7); c.fill();
  // bayangan kebiruan tipis supaya kilau putih tetap terbaca di atas gigi putih
  c.shadowColor='rgba(60,110,170,.55)'; c.shadowBlur=r*.18; c.fillStyle='#fff';
  const ray=(len,w)=>{ c.beginPath(); c.moveTo(0,-len); c.quadraticCurveTo(w,0,0,len); c.quadraticCurveTo(-w,0,0,-len); c.fill(); };
  ray(r,r*.1); c.rotate(Math.PI/2); ray(r*.8,r*.1);
  c.rotate(Math.PI/4); ray(r*.35,r*.07); c.rotate(Math.PI/2); ray(r*.35,r*.07);
  c.restore();
}

/* Tap & rub with finger */
let pressing=false;
function pointerHit(e,amt){
  const r=cv.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top, now=performance.now();
  for(const g of germs){
    if(g.state!=='alive' || g.sx==null || g.alpha<.3) continue;
    const rad = germR()*g.size*1.4;
    if((g.sx-x)**2+(g.sy-y)**2 < rad*rad){ hurt(g,amt,now); if(amt<20) bubble(x,y); }
  }
}
cv.addEventListener('pointerdown', e => { pressing=true; audio(); pointerHit(e,34); });
cv.addEventListener('pointermove', e => { if(pressing) pointerHit(e,5); });
addEventListener('pointerup', () => pressing=false);
addEventListener('pointercancel', () => pressing=false);

function germR(){ return Math.min(CW,CH) * (mode==='hands' ? .07 : .055); }
function coverRect(sw,sh){
  const s=Math.max(CW/sw, CH/sh), w=sw*s, h=sh*s;
  return {x:(CW-w)/2, y:(CH-h)/2, w, h};
}

function star(c,x,y,r,rot){
  c.save(); c.translate(x,y); c.rotate(rot); c.beginPath();
  for(let i=0;i<10;i++){ const a=i*Math.PI/5-Math.PI/2, rr=i%2?r*.45:r; c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr); }
  c.closePath(); c.fillStyle='#FFD23F'; c.fill(); c.strokeStyle='#E09B00'; c.lineWidth=2; c.stroke(); c.restore();
}
function speech(text,x,y,alpha){
  const fs = Math.max(15, Math.min(22, CW*.045));
  ctx.save(); ctx.globalAlpha=alpha; ctx.font=`700 ${fs}px ${FONT}`;
  const w = ctx.measureText(text).width + 24, h = fs + 16;
  let bx = Math.min(Math.max(8, x-w/2), CW-w-8), by = Math.max(80, y-h);
  ctx.fillStyle='#FFFDF7'; ctx.strokeStyle='#1B2A6B'; ctx.lineWidth=3;
  ctx.beginPath(); ctx.roundRect(bx,by,w,h,h/2); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#1B2A6B'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text, bx+w/2, by+h/2+1); ctx.restore();
}

let lastTip='';
function setTip(html){ if(html!==lastTip){ $('#tip').innerHTML=html; lastTip=html; } }

let prevT=performance.now();
function frame(now){
  const dt = Math.min(50, now-prevT); prevT=now; const t=now/1000;
  if(screen==='home'){ drawHero(t); requestAnimationFrame(frame); return; }

  if(now-lastAnalyze>66){ lastAnalyze=now; analyze(now); }
  const s = source();
  ctx.clearRect(0,0,CW,CH);
  ctx.fillStyle='#0E2D4D'; ctx.fillRect(0,0,CW,CH);
  let rect=null;
  if(s.ready){
    rect = coverRect(s.w,s.h);
    ctx.save();
    if(s.mirror){ ctx.translate(CW,0); ctx.scale(-1,1); ctx.drawImage(s.el, CW-rect.x-rect.w, rect.y, rect.w, rect.h); }
    else ctx.drawImage(s.el, rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }
  viewRect=rect;
  const visible = detected || now-lastSeen < 700;

  // scanning sweep while searching
  if(s.ready && !visible && round && !round.done){
    const yy = (Math.sin(t*1.6)*.5+.5)*CH;
    const gr = ctx.createLinearGradient(0,yy-40,0,yy+40);
    gr.addColorStop(0,'rgba(71,201,229,0)'); gr.addColorStop(.5,'rgba(71,201,229,.45)'); gr.addColorStop(1,'rgba(71,201,229,0)');
    ctx.fillStyle=gr; ctx.fillRect(0,yy-40,CW,80);
  }

  if(round && !round.done && visible && cand.length && rect){
    const alive = germs.filter(g=>g.state==='alive').length;
    const maxNow = Math.min(4, round.total-round.spawned+alive);
    if(alive<maxNow && round.spawned<round.total && now-lastSpawn>650) spawn(now);
  }

  const R = germR();
  for(const g of germs){
    if(rect){
      let u, v;
      if(g.a && mouth && useFace()) [u,v]=anchorUV(g.a);
      else { u=((g.cell%W)+.5+g.ox)/W; v=(((g.cell/W)|0)+.5+g.oy)/H; }
      const tx=rect.x+u*rect.w, ty=rect.y+v*rect.h;
      if(g.sx==null){ g.sx=tx; g.sy=ty; } else if(g.state==='alive'){ g.sx+=(tx-g.sx)*.35; g.sy+=(ty-g.sy)*.35; }
    }
    if(g.sx==null) continue;
    if(g.state==='alive'){
      g.alpha += ((visible?1:0)-g.alpha)*.15;
      const isHurt = now-g.hurtT<220;
      drawGerm(ctx,g.sx,g.sy,R*g.size,g.col,t,g.ph,{alpha:g.alpha,hurt:isHurt,scale:.6+.4*Math.max(.2,g.hp/100)});
    } else {
      const k=(now-g.popT)/350;
      if(k<1) drawGerm(ctx,g.sx,g.sy,R*g.size,g.col,t,g.ph,{alpha:1-k,hurt:true,scale:1+k*.6});
    }
    if(now<g.sayUntil && (g.state!=='alive' || g.alpha>.5)) speech(g.say,g.sx,g.sy-R*g.size*1.5, Math.min(1,(g.sayUntil-now)/300));
  }
  germs = germs.filter(g => g.state==='alive' || now-g.popT<1200);

  for(const p of parts){
    p.life+=dt; p.x+=p.vx*dt/16; p.y+=p.vy*dt/16;
    if(p.life<0) continue;
    if(p.type==='glow'){
      const k=Math.sin(Math.PI*Math.min(1,p.life/p.max)), gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r);
      gr.addColorStop(0,`rgba(255,255,255,${.8*k})`); gr.addColorStop(.5,`rgba(255,246,200,${.4*k})`); gr.addColorStop(1,'rgba(255,246,200,0)');
      ctx.fillStyle=gr; ctx.fillRect(p.x-p.r,p.y-p.r,p.r*2,p.r*2); continue;
    }
    if(p.type==='sparkle'){ sparkle(ctx,p.x,p.y,p.r*Math.sin(Math.PI*Math.min(1,p.life/p.max)),p.rot+p.life/900); continue; }
    if(p.type==='star'){ p.vy+=.12*dt/16; p.rot+=.08; }
    const a = 1-p.life/p.max; if(a<=0) continue;
    ctx.save(); ctx.globalAlpha=a;
    if(p.type==='bubble'){
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,7); ctx.fillStyle='rgba(255,255,255,.35)'; ctx.fill();
      ctx.lineWidth=2; ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(p.x-p.r*.35,p.y-p.r*.35,p.r*.22,0,7); ctx.fillStyle='#fff'; ctx.fill();
    } else star(ctx,p.x,p.y,p.r,p.rot);
    ctx.restore();
  }
  parts = parts.filter(p=>p.life<p.max);

  // instructions
  showLoader(now);
  const sheetOn = document.querySelector('#play .sheet.on');
  const shineOff = mode!=='teeth' || !round || round.done || !!sheetOn;
  if(shineBtn.hidden!==shineOff) shineBtn.hidden=shineOff;
  if(!round || round.done || $('#camSheet').classList.contains('on') || $('#loadSheet').classList.contains('on')) setTip('');
  else if(!s.ready) setTip('Sebentar, kamera lagi siap-siap…');
  else if(!visible && useFace() && !faceSeen) setTip('Lihat ke kamera, ya! 🙂<small>Wajahmu harus kelihatan</small>');
  else if(!visible) setTip(mode==='hands'
      ? 'Tunjukkan tanganmu ke kamera 🖐️<small>Kumannya lagi ngumpet!</small>'
      : 'Buka mulut, senyum lebar! 😁<small>'+(useFace()?'Gigimu harus kelihatan':'Dekatkan gigimu ke kamera')+'</small>');
  else setTip(mode==='hands'
      ? (useCam ? 'Gosok-gosok tanganmu! 🧼<small>Atau tekan kumannya pakai jari</small>' : 'Gosok kumannya pakai jari! 🧼')
      : (useCam ? 'Sikat gigimu, ayo! 🪥<small>Atau tekan kumannya pakai jari</small>' : 'Gosok kumannya pakai jari! 🪥'));

  requestAnimationFrame(frame);
}

/* ---------- Camera ---------- */
async function startCam(){
  stopCam();
  $('#camSheet').classList.remove('on');
  try{
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('no camera');
    stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:facing, width:{ideal:640}, height:{ideal:480}}, audio:false});
    video.srcObject = stream; await video.play();
    useCam=true; $('#flipBtn').hidden=false;
  }catch(e){
    useCam=false; $('#camSheet').classList.add('on');
  }
}
function stopCam(){ if(stream){ stream.getTracks().forEach(t=>t.stop()); stream=null; } video.srcObject=null; }

function startPlay(m){
  mode=m; screen='play'; audio();
  document.getElementById('home').style.display='none';
  play.classList.add('on'); resize();
  $('#winSheet').classList.remove('on');
  detected=false; lastSeen=0; detKey='';
  mouth=null; faceSeen=false;
  if(m==='teeth') loadFace();
  newRound(); drawCartoon(); startCam();
}
function goHome(){
  stopCam(); useCam=false; screen='home'; round=null;
  play.classList.remove('on'); $('#camSheet').classList.remove('on'); $('#winSheet').classList.remove('on'); $('#loadSheet').classList.remove('on');
  document.getElementById('home').style.display='';
}

document.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => startPlay(b.dataset.mode)));
$('#homeBtn').addEventListener('click', goHome);
const shineBtn=$('#shineBtn');
shineBtn.addEventListener('click', shine);
$('#doneBtn').addEventListener('click', goHome);
$('#againBtn').addEventListener('click', () => { $('#winSheet').classList.remove('on'); newRound(); });
$('#retryCam').addEventListener('click', startCam);
$('#noCam').addEventListener('click', () => { $('#camSheet').classList.remove('on'); useCam=false; $('#flipBtn').hidden=true; detKey=''; drawCartoon(); });
$('#flipBtn').addEventListener('click', () => { facing = facing==='user' ? 'environment' : 'user'; detKey=''; startCam(); });

requestAnimationFrame(frame);
})();
