/* Pemburu Kuman · karakter kuman.
   Dipakai oleh game.js dan oleh scripts/ untuk membuat gambar & video promo. */
const COLORS = [
  {b:'#8BE06B',d:'#3F8F2E',s:'#C2F5A8'}, {b:'#B98CFF',d:'#6A3FC2',s:'#DCC8FF'},
  {b:'#FF9F5A',d:'#C2561A',s:'#FFD0A8'}, {b:'#5FD4D0',d:'#1E8A86',s:'#B4F0EE'},
  {b:'#FF7FA8',d:'#C23A6A',s:'#FFC2D6'}
];
function drawGerm(c,x,y,r,col,t,ph,o={}){
  c.save(); c.translate(x,y); c.globalAlpha = o.alpha ?? 1;
  if(o.hurt) c.translate(Math.sin(t*45)*r*.09,0);
  const sc = o.scale ?? 1, b = Math.sin(t*4+ph)*.06;
  c.scale(sc*(1+b), sc*(1-b));
  // antennae
  c.strokeStyle = col.d; c.lineWidth = r*.09; c.lineCap='round';
  for(const s of [-1,1]){
    const tx = s*r*.5 + Math.sin(t*3+ph+s)*r*.08, ty = -r*1.32;
    c.beginPath(); c.moveTo(s*r*.3,-r*.8); c.quadraticCurveTo(s*r*.25,-r*1.15,tx,ty); c.stroke();
    c.fillStyle = col.d; c.beginPath(); c.arc(tx,ty,r*.13,0,7); c.fill();
  }
  // wobbly body
  c.beginPath();
  for(let k=0;k<=72;k++){
    const a = k/72*Math.PI*2, rr = r*(1 + .11*Math.sin(a*8 + t*2.5 + ph));
    const px = Math.cos(a)*rr, py = Math.sin(a)*rr;
    k ? c.lineTo(px,py) : c.moveTo(px,py);
  }
  c.closePath(); c.fillStyle = col.b; c.fill(); c.lineWidth = r*.08; c.strokeStyle = col.d; c.stroke();
  // spots
  c.fillStyle = col.s;
  c.beginPath(); c.arc(-r*.5,r*.45,r*.13,0,7); c.fill();
  c.beginPath(); c.arc(r*.58,-r*.5,r*.09,0,7); c.fill();
  // cheeks
  c.fillStyle = 'rgba(255,110,150,.45)';
  c.beginPath(); c.arc(-r*.58,r*.2,r*.14,0,7); c.fill();
  c.beginPath(); c.arc(r*.58,r*.2,r*.14,0,7); c.fill();
  // eyes
  c.lineWidth = r*.08; c.strokeStyle = '#1B2A6B';
  if(o.hurt){
    for(const s of [-1,1]){
      const ex=s*r*.32, ey=-r*.12;
      c.beginPath(); c.moveTo(ex-s*r*.15,ey-r*.12); c.lineTo(ex+s*r*.08,ey); c.lineTo(ex-s*r*.15,ey+r*.12); c.stroke();
    }
    c.fillStyle='#7A1F3D'; c.beginPath(); c.ellipse(0,r*.38,r*.16,r*.2,0,0,7); c.fill();
  } else {
    const lx = Math.sin(t*1.3+ph)*r*.07, ly = Math.cos(t*1.1+ph)*r*.05;
    const blink = ((t+ph)%3.4) < .12;
    for(const s of [-1,1]){
      const ex=s*r*.32, ey=-r*.12;
      if(blink){ c.beginPath(); c.moveTo(ex-r*.18,ey); c.lineTo(ex+r*.18,ey); c.stroke(); continue; }
      c.fillStyle='#fff'; c.beginPath(); c.arc(ex,ey,r*.25,0,7); c.fill(); c.stroke();
      c.fillStyle='#1B2A6B'; c.beginPath(); c.arc(ex+lx,ey+ly,r*.12,0,7); c.fill();
      c.fillStyle='#fff'; c.beginPath(); c.arc(ex+lx+r*.04,ey+ly-r*.05,r*.04,0,7); c.fill();
    }
    c.beginPath(); c.arc(0,r*.2,r*.3,.15*Math.PI,.85*Math.PI); c.stroke();
    c.fillStyle='#fff'; c.fillRect(-r*.06,r*.47,r*.12,r*.1);
  }
  c.restore();
}
