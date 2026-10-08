/* Cocok Bentuk · gambar karakter bentuk, lubang, dan cipratan warna.
   Dipakai oleh game.js dan scripts/generate-images.mjs (thumbnail & ikon). */

// Ukuran s = lebar kotak pembatas. Koordinat di bawah dalam satuan s, berpusat di (0,0).
const SHAPES = {
  lingkaran:      { face:[0, 0] },
  kotak:          { face:[0, .02] },
  segitiga:       { face:[0, .14] },
  bintang:        { face:[0, .05] },
  hati:           { face:[0, -.02] },
  'persegi panjang': { face:[0, 0], small:true },
};
const SHAPE_KINDS = Object.keys(SHAPES);

function shapePath(c, kind, s){
  c.beginPath();
  if (kind === 'lingkaran') c.arc(0, 0, s*.5, 0, Math.PI*2);
  else if (kind === 'kotak') c.roundRect(-s*.45, -s*.45, s*.9, s*.9, s*.14);
  else if (kind === 'persegi panjang') c.roundRect(-s*.52, -s*.31, s*1.04, s*.62, s*.12);
  else if (kind === 'segitiga') {
    // segitiga dengan sudut membulat
    const P = [[0, -.48], [.54, .42], [-.54, .42]].map(([x, y]) => [x*s, y*s]), r = s*.1;
    c.moveTo((P[2][0]+P[0][0])/2, (P[2][1]+P[0][1])/2);
    for (let i = 0; i < 3; i++) c.arcTo(P[i][0], P[i][1], P[(i+1)%3][0], P[(i+1)%3][1], r);
    c.closePath();
  } else if (kind === 'bintang') {
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI/2 + i*Math.PI/5, rr = (i % 2 ? .25 : .53)*s;
      c.lineTo(Math.cos(a)*rr, Math.sin(a)*rr + s*.04);
    }
    c.closePath();
  } else if (kind === 'hati') {
    c.moveTo(0, s*.44);
    c.bezierCurveTo(-s*.62, s*.02, -s*.5, -s*.52, 0, -s*.2);
    c.bezierCurveTo(s*.5, -s*.52, s*.62, s*.02, 0, s*.44);
    c.closePath();
  }
}

// Wajah: mood 'happy' (mata ^^, senyum lebar), 'oops' (mulut o), selain itu senyum biasa.
function drawFace(c, kind, s, mood, t){
  const [fx, fy] = SHAPES[kind].face, k = SHAPES[kind].small ? .85 : 1;
  c.save(); c.translate(fx*s, fy*s); c.scale(k, k);
  const ink = '#1B2A6B', ex = s*.15, ey = -s*.06, er = s*.085;
  c.lineCap = 'round'; c.lineWidth = Math.max(2, s*.04); c.strokeStyle = ink;
  if (mood === 'happy') {
    for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx*ex, ey + er*.4, er*.75, Math.PI*1.1, Math.PI*1.9); c.stroke(); }
    c.fillStyle = ink; c.beginPath(); c.arc(0, s*.06, s*.15, 0, Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#FF7A9A'; c.beginPath(); c.ellipse(0, s*.15, s*.07, s*.035, 0, 0, Math.PI*2); c.fill();
  } else {
    const blink = t != null && (t % 4.2) > 4.05;
    for (const sx of [-1, 1]) {
      if (blink) { c.beginPath(); c.moveTo(sx*ex - er*.7, ey); c.lineTo(sx*ex + er*.7, ey); c.stroke(); continue; }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(sx*ex, ey, er, er*1.15, 0, 0, Math.PI*2); c.fill();
      c.lineWidth = Math.max(1.5, s*.02); c.stroke();
      c.fillStyle = ink; c.beginPath(); c.arc(sx*ex + er*.15, ey + er*.15, er*.5, 0, Math.PI*2); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(sx*ex + er*.32, ey - er*.12, er*.18, 0, Math.PI*2); c.fill();
    }
    c.lineWidth = Math.max(2, s*.04);
    if (mood === 'oops') { c.fillStyle = ink; c.beginPath(); c.ellipse(0, s*.12, s*.05, s*.065, 0, 0, Math.PI*2); c.fill(); }
    else { c.beginPath(); c.arc(0, s*.05, s*.1, Math.PI*.15, Math.PI*.85); c.stroke(); }
  }
  // pipi
  c.fillStyle = 'rgba(255,122,154,.45)';
  for (const sx of [-1, 1]) { c.beginPath(); c.ellipse(sx*s*.27, s*.07, s*.06, s*.035, 0, 0, Math.PI*2); c.fill(); }
  c.restore();
}

function drawShape(c, kind, x, y, s, color, opt = {}){
  c.save(); c.translate(x, y); if (opt.rot) c.rotate(opt.rot);
  if (opt.alpha != null) c.globalAlpha = opt.alpha;
  if (opt.shadow) { c.save(); c.translate(s*.03, s*.06); shapePath(c, kind, s); c.fillStyle = 'rgba(27,42,107,.18)'; c.fill(); c.restore(); }
  shapePath(c, kind, s);
  c.fillStyle = color; c.fill();
  // kilap di kiri atas
  c.save(); c.clip(); c.fillStyle = 'rgba(255,255,255,.28)';
  c.beginPath(); c.ellipse(-s*.22, -s*.26, s*.2, s*.11, -.6, 0, Math.PI*2); c.fill(); c.restore();
  shapePath(c, kind, s);   // path kilap menimpa path bentuk; buat ulang sebelum menggambar garis tepi
  c.lineJoin = 'round'; c.lineWidth = Math.max(2, s*.045); c.strokeStyle = '#1B2A6B'; c.stroke();
  if (!opt.noFace) drawFace(c, kind, s, opt.mood, opt.t);
  c.restore();
}

// Lubang: siluet lembut dengan garis putus-putus.
function drawHole(c, kind, x, y, s, dark, glow){
  c.save(); c.translate(x, y);
  shapePath(c, kind, s);
  c.fillStyle = dark ? 'rgba(0,0,0,.28)' : 'rgba(27,42,107,.12)'; c.fill();
  c.setLineDash([s*.07, s*.06]); c.lineCap = 'round'; c.lineJoin = 'round';
  c.lineWidth = Math.max(2, s*.035); c.strokeStyle = glow ? '#FFD23F' : (dark ? 'rgba(255,255,255,.45)' : 'rgba(27,42,107,.35)');
  c.stroke(); c.restore();
}

// Cipratan cat: gumpalan bergelombang + tetesan kecil. seed membuat bentuknya tetap per cipratan.
function drawSplash(c, x, y, s, color, seed){
  c.save(); c.translate(x, y);
  const N = 72, R = th => s*.4*(1 + .13*Math.sin(5*th + seed) + .07*Math.sin(3*th + seed*2.1) + .04*Math.sin(9*th + seed*.7));
  c.beginPath();
  for (let i = 0; i <= N; i++) { const th = i/N*Math.PI*2, r = R(th); c.lineTo(Math.cos(th)*r, Math.sin(th)*r); }
  c.closePath(); c.fillStyle = color; c.fill();
  c.lineWidth = Math.max(2, s*.03); c.strokeStyle = 'rgba(27,42,107,.35)'; c.stroke();
  for (let i = 0; i < 3; i++) {
    const th = seed*1.7 + i*2.1, d = s*(.5 + .05*i), r = s*(.07 - .015*i);
    c.beginPath(); c.arc(Math.cos(th)*d, Math.sin(th)*d, r, 0, Math.PI*2); c.fill(); c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,.3)'; c.beginPath(); c.ellipse(-s*.14, -s*.16, s*.12, s*.06, -.6, 0, Math.PI*2); c.fill();
  c.restore();
}
