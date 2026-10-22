/* Taman Bermain · rak game yang digeser ke samping, seperti menu pilih game di konsol.
   Kartu di tengah membesar & bersinar, kartu lain mengecil & redup, warna latar ikut game yang dipilih.
   Ketuk kartu samping = geser ke tengah; ketuk kartu tengah (atau tombol Main) = buka game.
   Tanpa JS, daftar tetap bisa digeser dan setiap kartu tetap tautan biasa. */
(() => {
const list = document.getElementById('games');
if (!list) return;
const items = [...list.children];
const dots = document.getElementById('dots'), play = document.getElementById('playBtn');
const prev = document.getElementById('prevBtn'), next = document.getElementById('nextBtn');
const KEY = 'tamanBermain.lastGame';
const motion = matchMedia('(prefers-reduced-motion: reduce)');

document.body.classList.add('shelf-on');
play.hidden = prev.hidden = next.hidden = false;
dots.innerHTML = items.map(() => '<i></i>').join('');

// Kartu sekarang jauh lebih besar: biarkan browser memilih ikon 512px di layar tajam.
for (const img of list.querySelectorAll('img[src*="icon-192"]')) {
  const src = img.getAttribute('src');
  img.srcset = `${src} 192w, ${src.replace('icon-192', 'icon-512')} 512w`;
  img.sizes = '200px';
}

const centerOf = li => li.offsetLeft + li.offsetWidth / 2;
let cur = -1, raf = 0;

function update(){
  raf = 0;
  const mid = list.scrollLeft + list.clientWidth / 2;
  let best = 0, bestD = Infinity;
  items.forEach((li, i) => {
    const d = Math.abs(centerOf(li) - mid) / li.offsetWidth;   // 0 = tepat di tengah, 1 = satu kartu di samping
    const k = Math.min(1, d);
    li.style.transform = `scale(${1 - .18 * k})`;
    li.style.opacity = String(1 - .45 * k);
    if (d < bestD) { bestD = d; best = i; }
  });
  select(best);
}
function select(i){
  if (i === cur) return;
  cur = i;
  items.forEach((li, j) => li.classList.toggle('on', j === i));
  [...dots.children].forEach((d, j) => d.classList.toggle('on', j === i));
  prev.disabled = i === 0; next.disabled = i === items.length - 1;
  const card = items[i].querySelector('.card');
  document.body.style.setProperty('--focus', getComputedStyle(card).getPropertyValue('--accent').trim());
  if (card.href) {
    play.href = card.getAttribute('href'); play.hidden = false;
    play.setAttribute('aria-label', 'Main ' + card.querySelector('b').textContent);
    try { localStorage.setItem(KEY, card.getAttribute('href')); } catch(e) {}
  } else play.hidden = true;   // kartu "Segera hadir"
}
function go(i, smooth = true){
  i = Math.max(0, Math.min(items.length - 1, i));
  list.scrollTo({ left: centerOf(items[i]) - list.clientWidth / 2, behavior: smooth && !motion.matches ? 'smooth' : 'auto' });
}

list.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
addEventListener('resize', () => { go(cur, false); update(); });

// Ketuk kartu yang belum di tengah: geser dulu ke tengah, jangan langsung dibuka.
list.addEventListener('click', e => {
  const li = e.target.closest('li'); if (!li) return;
  const i = items.indexOf(li);
  if (i !== cur) { e.preventDefault(); go(i); }
});
// Keyboard: Tab ke kartu ikut menggeser, panah kiri/kanan pindah kartu.
list.addEventListener('focusin', e => { const i = items.indexOf(e.target.closest('li')); if (i >= 0 && i !== cur) go(i); });
list.addEventListener('keydown', e => {
  const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
  if (!d) return;
  e.preventDefault();
  const i = Math.max(0, Math.min(items.length - 1, cur + d));
  items[i].querySelector('a, .card')?.focus({ preventScroll: true });
  go(i);
});
prev.addEventListener('click', () => go(cur - 1));
next.addEventListener('click', () => go(cur + 1));

// Mulai dari game yang terakhir dipilih (kalau masih ada), tanpa animasi.
let start = 0;
try {
  const last = localStorage.getItem(KEY);
  const i = items.findIndex(li => li.querySelector('.card')?.getAttribute('href') === last);
  if (i >= 0) start = i;
} catch(e) {}
go(start, false);
update();
})();
