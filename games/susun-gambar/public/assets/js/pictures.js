/* Susun Gambar · gambar-gambar puzzle (canvas), semuanya digambar sendiri tanpa file gambar.
   PICTURES[i].draw(ctx, S) menggambar satu gambar persegi S×S, memenuhi seluruh kotak.
   Setiap gambar punya latar yang ramai (langit, matahari, rumput, gelembung) supaya tiap
   potongan 3x3 punya ciri yang bisa dikenali anak. Dipakai juga oleh scripts/generate-images.mjs. */
const PZ_INK = '#1B2A6B';
function pzE(c, x, y, rx, ry, fill, stroke, lw = 1.6, rot = 0){
  c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI*2);
  if(fill){ c.fillStyle = fill; c.fill(); }
  if(stroke){ c.lineWidth = lw; c.strokeStyle = stroke; c.stroke(); }
}
function pzC(c, x, y, r, fill, stroke, lw){ pzE(c, x, y, r, r, fill, stroke, lw); }
function pzP(c, d, fill, stroke, lw = 1.6){
  const p = new Path2D(d);
  if(fill){ c.fillStyle = fill; c.fill(p); }
  if(stroke){ c.lineWidth = lw; c.strokeStyle = stroke; c.lineJoin = c.lineCap = 'round'; c.stroke(p); }
}
function pzEye(c, x, y, r, look = 0){
  pzC(c, x, y, r, '#fff', PZ_INK, r*.28);
  pzC(c, x + look*r*.3, y + r*.1, r*.55, PZ_INK);
  pzC(c, x + look*r*.3 + r*.2, y - r*.12, r*.2, '#fff');
}
function pzSmile(c, x, y, w, lw = 1.6){ c.beginPath(); c.arc(x, y - w*.4, w, .2*Math.PI, .8*Math.PI); c.lineWidth = lw; c.strokeStyle = PZ_INK; c.lineCap = 'round'; c.stroke(); }
function pzCheeks(c, x1, x2, y, r){ for(const x of [x1, x2]) pzE(c, x, y, r, r*.65, 'rgba(255,110,150,.5)'); }
function pzSky(c, top, bot, h = 100){ const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fillRect(0, 0, 100, h); }
function pzSun(c, x, y, r){
  c.strokeStyle = '#FFB800'; c.lineWidth = 2.2; c.lineCap = 'round';
  for(let i = 0; i < 8; i++){ const a = i*Math.PI/4; c.beginPath(); c.moveTo(x + Math.cos(a)*r*1.3, y + Math.sin(a)*r*1.3); c.lineTo(x + Math.cos(a)*r*1.7, y + Math.sin(a)*r*1.7); c.stroke(); }
  pzC(c, x, y, r, '#FFD23F', '#F2A900', 1.2);
}
function pzCloud(c, x, y, s){ c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 5*s, 0, 7); c.arc(x + 6*s, y - 3*s, 6.5*s, 0, 7); c.arc(x + 13*s, y, 5*s, 0, 7); c.rect(x, y, 13*s, 5*s); c.fill(); }
function pzFlower(c, x, y, r, col){
  for(let i = 0; i < 5; i++){ const a = i*Math.PI*2/5; pzC(c, x + Math.cos(a)*r, y + Math.sin(a)*r, r*.75, col); }
  pzC(c, x, y, r*.6, '#FFD23F');
}
function pzGrass(c, y, col = '#7BD88F', dark = '#4FB860'){
  c.fillStyle = col; c.beginPath(); c.moveTo(0, y);
  for(let x = 0; x <= 100; x += 10) c.quadraticCurveTo(x + 5, y - 4, x + 10, y);
  c.lineTo(100, 100); c.lineTo(0, 100); c.closePath(); c.fill();
  c.strokeStyle = dark; c.lineWidth = 1.2; c.lineCap = 'round';
  for(let x = 6; x < 100; x += 13){ const yy = y + 8 + (x*7) % 14; c.beginPath(); c.moveTo(x, yy); c.lineTo(x - 1.5, yy - 3.5); c.moveTo(x, yy); c.lineTo(x + 1.5, yy - 3.5); c.stroke(); }
}

const PICTURES = [
  { name: 'kucing', label: 'Kucing', draw(c){
    c.fillStyle = '#FFE3EE'; c.fillRect(0, 0, 100, 100);
    c.fillStyle = 'rgba(255,143,184,.35)';
    for(let y = 6; y < 70; y += 14) for(let x = (y/14 % 2)*7 + 5; x < 100; x += 14){ c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); }
    pzSun(c, 84, 14, 7);
    pzGrass(c, 78, '#9BE08A', '#5DBB5A');
    // ekor
    pzP(c, 'M66 80 C86 80 92 62 84 50 C80 44 74 48 78 54 C83 62 78 72 64 72Z', '#FF9A3C', '#C8641E');
    // badan
    pzE(c, 50, 74, 22, 18, '#FF9A3C', '#C8641E', 1.8);
    pzE(c, 50, 78, 12, 11, '#FFE9CF');
    for(const x of [40, 60]) pzE(c, x, 90, 6, 4, '#FFE9CF', '#C8641E', 1.4);
    // telinga
    for(const s of [-1, 1]){
      pzP(c, `M${50 + s*24} 38 L${50 + s*26} 12 L${50 + s*6} 26Z`, '#FF9A3C', '#C8641E', 1.8);
      pzP(c, `M${50 + s*21} 32 L${50 + s*22} 18 L${50 + s*10} 26Z`, '#FFB3C1');
    }
    // kepala
    pzE(c, 50, 42, 27, 22, '#FF9A3C', '#C8641E', 1.8);
    c.strokeStyle = '#E0691F'; c.lineWidth = 2.2; c.lineCap = 'round';
    for(const dx of [-6, 0, 6]){ c.beginPath(); c.moveTo(50 + dx, 21); c.lineTo(50 + dx, 27); c.stroke(); }
    pzE(c, 50, 50, 11, 7.5, '#FFE9CF');
    pzEye(c, 40, 40, 5.5, .3); pzEye(c, 60, 40, 5.5, .3);
    pzP(c, 'M47 46 H53 L50 49Z', '#FF6B8A', '#C23A6A', 1);
    c.strokeStyle = PZ_INK; c.lineWidth = 1.3; c.beginPath(); c.moveTo(50, 49); c.quadraticCurveTo(47, 53, 44, 51); c.moveTo(50, 49); c.quadraticCurveTo(53, 53, 56, 51); c.stroke();
    c.strokeStyle = '#C8641E'; c.lineWidth = 1;
    for(const s of [-1, 1]) for(const dy of [-2, 2]){ c.beginPath(); c.moveTo(50 + s*12, 48 + dy*.5); c.lineTo(50 + s*26, 46 + dy*2); c.stroke(); }
    pzCheeks(c, 33, 67, 49, 3.5);
    // bola benang
    pzC(c, 16, 84, 9, '#47C9E5', '#1F8FB0', 1.6);
    c.strokeStyle = '#1F8FB0'; c.lineWidth = 1.1;
    for(const a of [-.5, .3, 1.1]){ c.beginPath(); c.ellipse(16, 84, 8, 4, a, 0, Math.PI*2); c.stroke(); }
    c.beginPath(); c.moveTo(24, 86); c.quadraticCurveTo(30, 94, 36, 90); c.stroke();
  }},
  { name: 'ikan', label: 'Ikan', draw(c){
    pzSky(c, '#47C9E5', '#1F6FB8');
    // gelembung
    for(const [x, y, r] of [[14, 14, 3], [20, 26, 2], [80, 60, 2.5], [86, 48, 1.8], [62, 12, 2.2], [30, 50, 1.6]]) pzC(c, x, y, r, 'rgba(255,255,255,.35)', 'rgba(255,255,255,.85)', .9);
    // pasir & rumput laut
    c.fillStyle = '#FFE49A'; c.beginPath(); c.moveTo(0, 86); c.quadraticCurveTo(30, 78, 55, 86); c.quadraticCurveTo(80, 92, 100, 84); c.lineTo(100, 100); c.lineTo(0, 100); c.fill();
    for(const [x, h, col] of [[10, 34, '#4FB860'], [17, 24, '#7BD88F'], [88, 30, '#4FB860'], [94, 20, '#7BD88F']]){
      c.strokeStyle = col; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, 92);
      c.bezierCurveTo(x - 5, 92 - h*.35, x + 5, 92 - h*.65, x, 92 - h); c.stroke();
    }
    pzP(c, 'M40 90 l4 -6 l4 6 l6 -1 l-4 5 l2 5 l-8 -2 l-8 2 l2 -5 l-4 -5Z', '#FF8FB8', '#C23A6A', 1.1);
    pzC(c, 70, 92, 3.5, '#FFF3C4', '#E0A800', 1);
    // ikan kecil
    pzP(c, 'M70 24 Q78 18 86 24 Q78 30 70 24Z M86 24 L92 19 V29Z', '#FFD23F', '#E0A800', 1.2); pzC(c, 74, 23, 1.2, PZ_INK);
    // ikan besar
    pzP(c, 'M74 52 L94 36 Q90 52 94 68Z', '#FF9F5A', '#C2561A', 1.8);
    pzP(c, 'M42 30 Q52 18 62 32Z', '#FF9F5A', '#C2561A', 1.6);
    pzP(c, 'M44 72 Q52 84 60 72Z', '#FF9F5A', '#C2561A', 1.6);
    pzE(c, 46, 52, 32, 22, '#FFB36B', '#C2561A', 1.8);
    c.fillStyle = '#fff'; c.save(); c.beginPath(); c.ellipse(46, 52, 31, 21, 0, 0, 7); c.clip();
    for(const x of [50, 62]) { c.beginPath(); c.ellipse(x, 52, 3.5, 24, 0, 0, 7); c.fill(); }
    c.restore();
    pzE(c, 46, 52, 32, 22, null, '#C2561A', 1.8);
    pzEye(c, 28, 46, 6.5, -.4);
    pzSmile(c, 22, 60, 5, 1.6); pzCheeks(c, 34, 34, 58, 3.2);
  }},
  { name: 'kura-kura', label: 'Kura-kura', draw(c){
    pzSky(c, '#8ED8FA', '#DDF5FF', 62);
    pzSun(c, 16, 15, 7); pzCloud(c, 58, 14, 1); pzCloud(c, 78, 28, .7);
    pzGrass(c, 60, '#9BE08A', '#5DBB5A');
    pzFlower(c, 12, 88, 3, '#FF8FB8'); pzFlower(c, 88, 86, 3, '#B98CFF'); pzFlower(c, 92, 70, 2.4, '#FF8FB8');
    // kaki
    for(const x of [30, 44, 58, 70]) pzE(c, x, 76, 6, 7, '#8EDB6A', '#3D8A2C', 1.6);
    // kepala
    pzE(c, 86, 54, 11, 9.5, '#8EDB6A', '#3D8A2C', 1.8);
    pzEye(c, 88, 51, 4, .3); pzSmile(c, 89, 59, 3.6, 1.4); pzCheeks(c, 82, 82, 58, 2.2);
    // ekor
    pzP(c, 'M20 66 L10 70 L20 72Z', '#8EDB6A', '#3D8A2C', 1.4);
    // tempurung
    pzP(c, 'M18 70 Q18 30 50 30 Q82 30 82 70Z', '#C29B5A', '#7A5A2A', 2);
    c.save(); c.clip(new Path2D('M18 70 Q18 30 50 30 Q82 30 82 70Z'));
    for(const [x, y] of [[50, 46], [34, 58], [66, 58], [38, 38], [62, 38]]) pzP(c, `M${x - 7} ${y} L${x - 3.5} ${y - 6} H${x + 3.5} L${x + 7} ${y} L${x + 3.5} ${y + 6} H${x - 3.5}Z`, '#E0BC7A', '#7A5A2A', 1.2);
    c.restore();
    c.fillStyle = '#7A5A2A'; c.beginPath(); c.roundRect(16, 68, 68, 5, 2.5); c.fill();
  }},
  { name: 'burung', label: 'Burung', draw(c){
    pzSky(c, '#B5E7FF', '#FFF4DE');
    pzSun(c, 84, 16, 8); pzCloud(c, 8, 16, 1.1); pzCloud(c, 46, 8, .7);
    // pohon & dahan
    c.fillStyle = '#7BD88F'; c.beginPath(); c.arc(-4, 70, 22, 0, 7); c.arc(10, 90, 18, 0, 7); c.fill();
    c.fillStyle = '#4FB860'; c.beginPath(); c.arc(4, 78, 8, 0, 7); c.fill();
    pzP(c, 'M0 74 Q50 64 104 76 L104 82 Q50 72 0 80Z', '#B07A4F', '#7A4A2A', 1.4);
    for(const [x, y, r] of [[72, 66, -.6], [88, 70, .5], [28, 66, -.4]]) pzE(c, x, y, 5, 2.4, '#7BD88F', '#4FB860', 1, r);
    c.fillStyle = '#9BE08A'; c.fillRect(0, 92, 100, 8);
    pzFlower(c, 80, 94, 2.6, '#FF8FB8'); pzFlower(c, 60, 95, 2.2, '#FFD23F');
    // burung
    pzP(c, 'M24 44 L12 36 L14 48Z', '#FFB800', '#C28A12', 1.4);
    pzE(c, 46, 46, 22, 20, '#FFD23F', '#C28A12', 1.8);
    pzE(c, 48, 54, 13, 10, '#FFF3C4');
    pzP(c, 'M34 46 Q26 58 40 60 Q44 52 34 46Z', '#FFB800', '#C28A12', 1.4);
    pzP(c, 'M66 42 L78 46 L66 50Z', '#FF9F1C', '#C2561A', 1.4);
    pzEye(c, 56, 38, 5, .4); pzCheeks(c, 62, 62, 48, 2.8);
    pzP(c, 'M46 26 Q44 18 50 20 Q50 24 46 26Z', '#FFB800', '#C28A12', 1.2);
    c.strokeStyle = '#FF9F1C'; c.lineWidth = 1.8; for(const x of [42, 50]){ c.beginPath(); c.moveTo(x, 64); c.lineTo(x, 72); c.stroke(); }
    // not musik
    for(const [x, y, k] of [[76, 32, 1], [88, 42, .8]]){
      pzE(c, x, y, 2.6*k, 2*k, PZ_INK, null, 1, -.4);
      c.strokeStyle = PZ_INK; c.lineWidth = 1.3; c.beginPath(); c.moveTo(x + 2.3*k, y); c.lineTo(x + 2.3*k, y - 9*k); c.quadraticCurveTo(x + 6*k, y - 7*k, x + 6*k, y - 4*k); c.stroke();
    }
  }},
  { name: 'kapal', label: 'Kapal', draw(c){
    pzSky(c, '#8ED8FA', '#E6F7FF', 70);
    pzSun(c, 16, 16, 8); pzCloud(c, 66, 12, .9);
    c.strokeStyle = PZ_INK; c.lineWidth = 1.4; c.lineCap = 'round';
    for(const [x, y] of [[74, 34], [84, 28]]){ c.beginPath(); c.moveTo(x - 4, y); c.quadraticCurveTo(x - 2, y - 3, x, y); c.quadraticCurveTo(x + 2, y - 3, x + 4, y); c.stroke(); }
    // laut
    c.fillStyle = '#47C9E5'; c.fillRect(0, 68, 100, 32);
    // tiang & layar
    c.fillStyle = '#7A4A2A'; c.fillRect(48, 14, 3, 56);
    pzP(c, 'M51 16 L51 62 L82 62Z', '#FFFDF7', '#9AA3BC', 1.4);
    pzP(c, 'M51 30 L51 40 L66 40 L60 30Z', '#FF8FB8');
    pzP(c, 'M47 22 L47 62 L24 62Z', '#FFD23F', '#C28A12', 1.4);
    pzP(c, 'M51 14 L62 10 L51 7Z', '#FF5A5F', '#C2303A', 1);
    // lambung kapal
    pzP(c, 'M14 64 H88 Q84 82 70 84 H30 Q16 82 14 64Z', '#FF5A5F', '#C2303A', 1.8);
    c.fillStyle = '#FFFDF7'; c.fillRect(17, 68, 69, 3);
    for(const x of [32, 48, 64]) pzC(c, x, 76, 3, '#CFF0FF', '#C2303A', 1.2);
    // ombak
    for(let row = 0; row < 3; row++){
      c.strokeStyle = row ? '#BFEFFA' : '#FFFFFF'; c.lineWidth = 2.2; c.beginPath();
      const y = 86 + row*6;
      for(let x = -10 + row*5; x < 110; x += 14){ c.moveTo(x, y); c.quadraticCurveTo(x + 3.5, y - 3.5, x + 7, y); c.quadraticCurveTo(x + 10.5, y + 3.5, x + 14, y); }
      c.stroke();
    }
    pzP(c, 'M8 92 Q10 84 16 88 L18 86 L18 92Z', '#7FD3F7', '#1F6FB8', 1);
  }},
  { name: 'pesawat', label: 'Pesawat', draw(c){
    pzSky(c, '#7FC8F8', '#D6F0FF');
    // pelangi
    const rb = ['#FF5A5F', '#FF9F1C', '#FFD23F', '#5CCB6E', '#3FA9F5', '#B98CFF'];
    rb.forEach((col, i) => { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(16, 104, 46 - i*3, Math.PI*1.03, Math.PI*1.75); c.stroke(); });
    pzCloud(c, 6, 82, 1.2); pzCloud(c, 70, 84, 1.3); pzCloud(c, 64, 14, .9); pzCloud(c, 8, 22, .8);
    pzSun(c, 88, 10, 6);
    // pesawat
    pzP(c, 'M44 50 L30 76 L40 76 L60 52Z', '#3FA9F5', '#1F6FB8', 1.6);
    pzP(c, 'M44 46 L32 22 L42 22 L60 44Z', '#3FA9F5', '#1F6FB8', 1.6);
    pzP(c, 'M14 46 L8 30 L16 30 L26 44Z', '#FF5A5F', '#C2303A', 1.5);
    pzP(c, 'M12 42 Q12 36 22 36 H76 Q94 36 94 47 Q94 58 76 58 H22 Q12 58 12 52Z', '#FFFDF7', '#9AA3BC', 1.8);
    pzP(c, 'M78 37 Q92 38 93 47 H80Z', '#CFF0FF', '#9AA3BC', 1.2);
    c.fillStyle = '#FF5A5F'; c.fillRect(14, 50, 64, 3.5);
    for(const x of [30, 40, 50, 60]) pzC(c, x, 44, 3, '#CFF0FF', '#1F6FB8', 1);
    pzEye(c, 84, 44, 3.4, .5); pzSmile(c, 86, 52, 3, 1.2);
    // garis angin
    c.strokeStyle = '#fff'; c.lineWidth = 2; c.lineCap = 'round';
    for(const [y, l] of [[40, 8], [48, 12], [56, 7]]){ c.beginPath(); c.moveTo(8 - l, y); c.lineTo(8 - l - 10, y); c.stroke(); }
  }},
  { name: 'semangka', label: 'Semangka', draw(c){
    c.fillStyle = '#FFF3C4'; c.fillRect(0, 0, 100, 100);
    pzSun(c, 86, 14, 7);
    pzFlower(c, 12, 14, 3.4, '#FF8FB8'); pzFlower(c, 30, 8, 2.4, '#B98CFF');
    // lebah kecil (supaya potongan atas-tengah punya ciri)
    c.setLineDash([1.5, 2]); c.strokeStyle = '#C28A12'; c.lineWidth = 1; c.beginPath(); c.moveTo(36, 26); c.quadraticCurveTo(42, 12, 48, 20); c.stroke(); c.setLineDash([]);
    pzE(c, 52, 12, 4, 5, 'rgba(255,255,255,.85)', '#9AA3BC', 1, -.5); pzE(c, 58, 12, 4, 5, 'rgba(255,255,255,.85)', '#9AA3BC', 1, .5);
    pzE(c, 55, 20, 8, 6, '#FFD23F', PZ_INK, 1.4);
    c.save(); c.beginPath(); c.ellipse(55, 20, 7.3, 5.3, 0, 0, 7); c.clip(); c.fillStyle = PZ_INK; c.fillRect(52, 13, 2.4, 14); c.fillRect(57, 13, 2.4, 14); c.restore();
    pzC(c, 63, 19, 1.4, PZ_INK);
    // taplak kotak-kotak
    for(let y = 64; y < 100; y += 6) for(let x = 0; x < 100; x += 6){ if(((x + y)/6) % 2 < 1){ c.fillStyle = '#FF8FA0'; c.fillRect(x, y, 6, 6); } else { c.fillStyle = '#FFFDF7'; c.fillRect(x, y, 6, 6); } }
    // potongan semangka
    pzP(c, 'M8 40 A42 42 0 0 0 92 40Z', '#5CCB6E', '#2E8A3E', 2);
    pzP(c, 'M13 40 A37 37 0 0 0 87 40Z', '#E6FFD9');
    pzP(c, 'M17 40 A33 33 0 0 0 83 40Z', '#FF5A6E');
    for(const [x, y] of [[28, 48], [72, 48], [50, 66], [36, 62], [64, 62], [24, 56], [76, 56]]) pzE(c, x, y, 1.6, 2.6, '#2B1B12');
    pzEye(c, 40, 46, 4.2); pzEye(c, 60, 46, 4.2); pzSmile(c, 50, 54, 4, 1.5); pzCheeks(c, 32, 68, 52, 3);
    // potongan kecil di taplak
    pzP(c, 'M70 82 L90 82 L80 96Z', '#FF5A6E', '#2E8A3E', 1.4);
    pzP(c, 'M12 80 L30 80 L21 94Z', '#FF5A6E', '#2E8A3E', 1.4);
  }},
  { name: 'stroberi', label: 'Stroberi', draw(c){
    c.fillStyle = '#ECE1FF'; c.fillRect(0, 0, 100, 100);
    c.fillStyle = 'rgba(185,140,255,.35)';
    for(let y = 8; y < 100; y += 16) for(let x = ((y - 8)/16 % 2)*8 + 8; x < 100; x += 16){ c.beginPath(); c.arc(x, y, 2.6, 0, 7); c.fill(); }
    pzSun(c, 14, 14, 6);
    // stroberi
    pzP(c, 'M50 92 C26 84 14 62 18 44 C22 30 36 28 50 32 C64 28 78 30 82 44 C86 62 74 84 50 92Z', '#FF5A6E', '#C2303A', 2);
    c.fillStyle = '#FFE49A';
    for(const [x, y] of [[30, 46], [44, 44], [58, 44], [70, 48], [26, 60], [74, 62], [36, 74], [50, 80], [64, 74], [40, 60], [60, 60]]){ c.beginPath(); c.ellipse(x, y, 1.3, 2, 0, 0, 7); c.fill(); }
    pzP(c, 'M50 34 L36 24 L44 30 L34 34 L46 36 L42 42 L50 37 L58 42 L54 36 L66 34 L56 30 L64 24Z', '#5CCB6E', '#2E8A3E', 1.4);
    c.strokeStyle = '#2E8A3E'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(50, 32); c.quadraticCurveTo(52, 20, 58, 16); c.stroke();
    pzEye(c, 41, 56, 4.4); pzEye(c, 59, 56, 4.4); pzSmile(c, 50, 66, 5, 1.6); pzCheeks(c, 32, 68, 64, 3);
    // stroberi kecil
    pzP(c, 'M84 92 C76 88 74 80 76 76 C78 72 84 74 84 74 C84 74 90 72 92 76 C94 80 92 88 84 92Z', '#FF8FA0', '#C2303A', 1.2);
    pzP(c, 'M80 75 L84 71 L88 75Z', '#5CCB6E');
    pzFlower(c, 86, 16, 3, '#FFD23F'); pzFlower(c, 10, 84, 2.6, '#47C9E5');
  }},
];
// Gambar ke kotak S×S (koordinat gambar memakai 0..100).
function drawPicture(c, pic, S){ c.save(); c.scale(S/100, S/100); c.lineJoin = c.lineCap = 'round'; pic.draw(c); c.restore(); }
