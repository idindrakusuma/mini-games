/* Mobil Balap · karakter mobil (canvas), tampak samping menghadap kanan.
   drawCar(ctx, x, y, s, warna, t, opsi): (x, y) = titik tengah bawah (menempel jalan),
   s = skala (1 = panjang mobil sekitar 210px).
   opsi.mood: 'normal' | 'ngebut' | 'mogok' | 'senang';  opsi.spin = sudut putar roda (radian). */
const CAR_COLORS = {
  merah:  {b:'#FF5A5F', d:'#C2303A', l:'#FF9A9D'},
  biru:   {b:'#3FA9F5', d:'#1F6FB8', l:'#9AD3FF'},
  kuning: {b:'#FFC93C', d:'#C28A12', l:'#FFE49A'},
  hijau:  {b:'#5CCB6E', d:'#2E8A3E', l:'#A8EDB2'},
};
function drawCar(c, x, y, s, col, t, o = {}){
  const mood = o.mood || 'normal', ink = '#1B2A6B';
  c.save(); c.translate(x, y); c.scale(s, s); c.lineJoin = c.lineCap = 'round';
  // bayangan di jalan
  c.fillStyle = 'rgba(20,20,50,.18)'; c.beginPath(); c.ellipse(0, 2, 100, 9, 0, 0, 7); c.fill();

  // garis kecepatan di belakang
  if(mood === 'ngebut'){
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 6;
    for(const [yy, len, ph] of [[-50,60,0],[-80,40,1.7],[-28,46,3.1]]){
      const o2 = ((t*900 + ph*100) % 80);
      c.beginPath(); c.moveTo(-120 - o2, yy); c.lineTo(-120 - o2 - len, yy); c.stroke();
    }
  }
  // goyang badan
  let bob = 0, tilt = 0;
  if(mood === 'ngebut') bob = Math.sin(t*30) * 1.6;
  else if(mood === 'mogok'){ tilt = Math.sin(t*22) * .035; bob = Math.abs(Math.sin(t*11)) * -4; }
  else if(mood === 'senang') bob = -Math.abs(Math.sin(t*6)) * 8;
  else bob = Math.sin(t*3) * 1.2;

  // roda (digambar dulu supaya lengkungan badan menutupi bagian atasnya)
  const spin = o.spin ?? (mood === 'ngebut' ? t*25 : 0);
  const wheel = (wx) => {
    const wy = -24 + (mood === 'mogok' ? Math.sin(t*20 + wx)*1.5 : 0);
    c.save(); c.translate(wx, wy);
    c.fillStyle = '#2B2D42'; c.beginPath(); c.arc(0, 0, 24, 0, 7); c.fill();
    c.fillStyle = '#E8ECF5'; c.beginPath(); c.arc(0, 0, 12, 0, 7); c.fill();
    c.rotate(spin); c.strokeStyle = '#9AA3BC'; c.lineWidth = 3.5;
    for(let i=0;i<3;i++){ c.rotate(Math.PI*2/3); c.beginPath(); c.moveTo(0,0); c.lineTo(0,10); c.stroke(); }
    c.fillStyle = '#9AA3BC'; c.beginPath(); c.arc(0, 0, 4, 0, 7); c.fill();
    c.restore();
  };

  c.save(); c.translate(0, bob); c.rotate(tilt);
  // spoiler belakang
  c.fillStyle = col.d; c.beginPath(); c.roundRect(-94, -96, 10, 26, 4); c.fill();
  c.fillStyle = col.b; c.strokeStyle = col.d; c.lineWidth = 4;
  c.beginPath(); c.roundRect(-118, -104, 50, 13, 6); c.fill(); c.stroke();
  // knalpot
  c.fillStyle = '#9AA3BC'; c.beginPath(); c.roundRect(-108, -40, 18, 9, 4); c.fill();
  // kabin (kaca besar tempat mata)
  c.fillStyle = col.b; c.strokeStyle = col.d; c.lineWidth = 5;
  c.beginPath(); c.moveTo(-50, -72); c.quadraticCurveTo(-36, -124, 14, -124); c.quadraticCurveTo(52, -124, 66, -72); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = '#CFF0FF'; c.beginPath(); c.moveTo(-36, -76); c.quadraticCurveTo(-26, -114, 14, -114); c.quadraticCurveTo(44, -114, 54, -76); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.beginPath(); c.ellipse(-16, -100, 5, 9, .5, 0, 7); c.fill();
  // badan utama
  c.fillStyle = col.b; c.strokeStyle = col.d; c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-100, -36); c.quadraticCurveTo(-104, -76, -78, -78); c.lineTo(70, -80);
  c.quadraticCurveTo(108, -76, 108, -48); c.quadraticCurveTo(108, -28, 92, -28); c.lineTo(-90, -28);
  c.quadraticCurveTo(-100, -28, -100, -36); c.closePath(); c.fill(); c.stroke();
  // lengkung roda
  c.fillStyle = col.d;
  for(const wx of [-60, 48]){ c.beginPath(); c.arc(wx, -26, 30, Math.PI, 0); c.closePath(); c.fill(); }
  // garis balap
  c.fillStyle = '#FFFFFF'; c.beginPath(); c.roundRect(-96, -66, 190, 8, 4); c.fill();
  // nomor di pintu
  c.fillStyle = '#FFFFFF'; c.strokeStyle = col.d; c.lineWidth = 3;
  c.beginPath(); c.arc(2, -48, 15, 0, 7); c.fill(); c.stroke();
  c.fillStyle = ink; c.font = '800 22px "Baloo 2","Trebuchet MS",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(o.number ?? '1', 2, -46);
  // lampu depan
  c.fillStyle = mood === 'mogok' ? '#E8D9A0' : '#FFE14D'; c.strokeStyle = '#E0A800'; c.lineWidth = 2.5;
  c.beginPath(); c.ellipse(100, -60, 6, 9, 0, 0, 7); c.fill(); c.stroke();
  // pipi
  c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(80, -60, 8, 5, 0, 0, 7); c.fill();
  // mulut di moncong depan
  c.strokeStyle = ink; c.lineWidth = 4;
  if(mood === 'mogok'){
    c.beginPath(); c.moveTo(82, -44);
    for(let i=1;i<=4;i++) c.lineTo(82 + i*5, -44 + (i%2 ? -4 : 0)); c.stroke();
  } else if(mood === 'senang' || mood === 'ngebut'){
    c.fillStyle = '#7A1F3D'; c.beginPath(); c.arc(92, -50, 11, .05*Math.PI, .95*Math.PI); c.closePath(); c.fill();
    c.fillStyle = '#FF7FA8'; c.beginPath(); c.ellipse(92, -43, 5, 3, 0, 0, 7); c.fill();
  } else {
    c.beginPath(); c.arc(92, -52, 10, .15*Math.PI, .85*Math.PI); c.stroke();
  }
  // mata di kaca depan
  const eyes = [[2, -94], [34, -92]];
  c.strokeStyle = ink; c.lineWidth = 3.5;
  for(const [ex, ey] of eyes){
    if(mood === 'senang'){
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, 13, 0, 7); c.fill(); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.arc(ex, ey + 4, 7, Math.PI*1.1, Math.PI*1.9); c.stroke(); c.lineWidth = 3.5;
    } else if(mood === 'mogok'){
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, 13, 0, 7); c.fill(); c.stroke();
      c.lineWidth = 2.5; c.beginPath();
      for(let a=0;a<Math.PI*5;a+=.25){ const rr = 1 + a*.6, aa = a + t*9; const qx = ex+Math.cos(aa)*rr, qy = ey+Math.sin(aa)*rr; a ? c.lineTo(qx,qy) : c.moveTo(qx,qy); }
      c.stroke(); c.lineWidth = 3.5;
    } else {
      const blink = mood === 'normal' && (t % 3.4) < .13;
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex, ey, 13, 0, 7); c.fill(); c.stroke();
      if(blink){ c.fillStyle = '#CFF0FF'; c.beginPath(); c.arc(ex, ey, 11.5, 0, 7); c.fill(); c.beginPath(); c.moveTo(ex-8, ey); c.lineTo(ex+8, ey); c.stroke(); continue; }
      const look = mood === 'ngebut' ? 5 : 3;
      c.fillStyle = ink; c.beginPath(); c.arc(ex + look, ey, 7, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + look + 2.5, ey - 3, 2.4, 0, 7); c.fill();
    }
  }
  // alis semangat saat ngebut
  if(mood === 'ngebut'){ c.lineWidth = 4; for(const [ex, ey] of eyes){ c.beginPath(); c.moveTo(ex-9, ey-20); c.lineTo(ex+9, ey-16); c.stroke(); } }
  // keringat saat mogok
  if(mood === 'mogok'){
    c.fillStyle = '#7FD3F7'; c.beginPath(); c.moveTo(56, -118); c.quadraticCurveTo(64, -104, 56, -100); c.quadraticCurveTo(48, -104, 56, -118); c.fill();
  }
  c.restore();
  wheel(-60); wheel(48);

  // asap dari kap mesin saat mogok
  if(mood === 'mogok'){
    for(let i=0;i<4;i++){
      const p = ((t*.8 + i/4) % 1), r = 8 + p*16;
      c.globalAlpha = Math.min(1, (1 - p) * 1.2); c.fillStyle = '#A9B0C0';
      c.beginPath(); c.arc(78 + Math.sin(p*6 + i)*8, -84 - p*70, r, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
  }
  // kilau bintang saat senang
  if(mood === 'senang'){
    for(let i=0;i<3;i++){
      const a = t*3 + i*2.1, sx = Math.cos(a)*90, sy = -150 + Math.sin(a)*14;
      carStar(c, sx, sy, 9 + Math.sin(t*8+i)*2);
    }
  }
  c.restore();
}
function carStar(c, x, y, R){
  c.save(); c.translate(x, y); c.beginPath();
  for(let i=0;i<10;i++){ const a = -Math.PI/2 + i*Math.PI/5, rr = i%2 ? R*.48 : R; c.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); }
  c.closePath(); c.fillStyle = '#FFD23F'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#E0A800'; c.stroke(); c.restore();
}
