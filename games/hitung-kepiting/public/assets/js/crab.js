/* Hitung Kepiting · gambar kepiting di canvas.
   Dipakai oleh game.js dan scripts/generate-images.mjs (thumbnail & ikon), jadi gambarnya sama persis.
   drawCrab(c, x, y, s, o): pusat badan di (x, y), s = setengah lebar badan.
   o.color  'red' | 'orange'
   o.t      waktu (detik) untuk animasi kaki, capit, dan kedip
   o.walk   0..1, seberapa kuat kaki bergerak (sedang berjalan)
   o.wave   0..1, capit diangkat & melambai (senang) */
(function (g) {
  const PAL = {
    red:    { body: '#FF5E57', top: '#FF8A7A', dark: '#D93A3A', claw: '#FF6F61' },
    orange: { body: '#FF9F1C', top: '#FFC15E', dark: '#D97A00', claw: '#FFAE3D' },
  };
  function drawCrab(c, x, y, s, o) {
    o = o || {};
    const p = PAL[o.color] || PAL.red, t = o.t || 0, walk = o.walk || 0, wave = o.wave || 0;
    c.save(); c.translate(x, y);
    c.lineCap = 'round'; c.lineJoin = 'round';

    // Kaki: 3 di tiap sisi, bergoyang saat berjalan.
    c.strokeStyle = p.dark; c.lineWidth = s * .16;
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const sw = Math.sin(t * 18 + i * 2 + (side > 0 ? 1.5 : 0)) * walk * .22;
      const bx = side * s * (.62 + i * .1), by = s * (.1 + i * .2);
      const kx = side * s * (1.15 + i * .08), ky = s * (.05 + i * .28) - s * .12 + sw * s;
      const fx = side * s * (1.35 + i * .05), fy = s * (.55 + i * .22) + sw * s * .6;
      c.beginPath(); c.moveTo(bx, by); c.quadraticCurveTo(kx, ky, fx, fy); c.stroke();
    }

    // Lengan & capit.
    for (const side of [-1, 1]) {
      const lift = wave * (Math.sin(t * 9 + (side > 0 ? 0 : 1.6)) * .5 + .5);
      const cx = side * s * 1.22, cy = -s * (.55 + lift * .55);
      c.strokeStyle = p.dark; c.lineWidth = s * .2;
      c.beginPath(); c.moveTo(side * s * .7, -s * .2); c.quadraticCurveTo(side * s * 1.1, -s * .1, cx, cy + s * .2); c.stroke();
      const open = .35 + (wave ? Math.sin(t * 12) * .2 : 0);
      c.fillStyle = p.claw;
      c.beginPath(); c.ellipse(cx, cy, s * .42, s * .24, -side * open - Math.PI / 2 + side * .2, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + side * s * .12, cy + s * .02, s * .34, s * .18, side * open - Math.PI / 2 + side * .9, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,.35)';
      c.beginPath(); c.arc(cx - side * s * .08, cy - s * .12, s * .08, 0, 7); c.fill();
    }

    // Tangkai mata.
    c.strokeStyle = p.dark; c.lineWidth = s * .13;
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * s * .28, -s * .5); c.lineTo(side * s * .36, -s * 1.0); c.stroke(); }

    // Badan.
    c.fillStyle = p.body;
    c.beginPath(); c.ellipse(0, 0, s, s * .72, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = p.top;
    c.beginPath(); c.ellipse(0, -s * .2, s * .78, s * .42, 0, Math.PI, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.4)';
    c.beginPath(); c.ellipse(-s * .4, -s * .38, s * .16, s * .09, -.4, 0, 7); c.fill();

    // Mata (kedip sesekali).
    const blink = ((t + (o.seed || 0)) % 3.7) < .12 ? .15 : 1;
    for (const side of [-1, 1]) {
      const ex = side * s * .37, ey = -s * 1.08;
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ex, ey, s * .25, s * .25 * blink, 0, 0, 7); c.fill();
      c.fillStyle = '#1B2A6B'; c.beginPath(); c.ellipse(ex + side * s * .03, ey + s * .03, s * .13, s * .13 * blink, 0, 0, 7); c.fill();
      if (blink === 1) { c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + side * s * .03 - s * .05, ey - s * .03, s * .05, 0, 7); c.fill(); }
    }

    // Senyum & pipi merona.
    c.strokeStyle = '#7A1F2B'; c.lineWidth = s * .09;
    c.beginPath(); c.arc(0, s * .02, s * .26, .2 * Math.PI, .8 * Math.PI); c.stroke();
    c.fillStyle = 'rgba(255,255,255,.35)';
    for (const side of [-1, 1]) { c.beginPath(); c.ellipse(side * s * .58, s * .12, s * .14, s * .09, 0, 0, 7); c.fill(); }
    c.restore();
  }
  g.drawCrab = drawCrab;
})(typeof window !== 'undefined' ? window : globalThis);
