// Menyusun semua game ke dist/ untuk deploy.
//   games/landing-page/public  → dist/
//   games/<nama-game>/public   → dist/<nama-game>/
// Pakai: node scripts/build.mjs   (tanpa dependency)
//
// Cache busting: di HTML hasil salinan, setiap <link href="….css"> dan <script src="….js"> lokal diberi
// ?v=<hash isi file>. Jadi URL berubah setiap kali isinya berubah, dan browser (termasuk Safari yang
// kadang memakai ulang CSS lama dari memori) pasti mengambil versi baru. File sumber di public/ tidak
// diubah, jadi game tetap bisa dibuka tanpa build.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gamesDir = path.join(root, 'games');
const dist = path.join(root, 'dist');
const LANDING = 'landing-page';

const games = fs.readdirSync(gamesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name)
  .sort();

// Semua pengecekan dijalankan sebelum menyalin apa pun, supaya dist/ tidak tertinggal setengah jadi.
for (const name of games) {
  if (!fs.existsSync(path.join(gamesDir, name, 'public'))) throw new Error(`games/${name} tidak punya folder public/`);
}
for (const name of games) {
  if (name !== LANDING && fs.existsSync(path.join(gamesDir, LANDING, 'public', name))) {
    throw new Error(`Bentrok: games/${LANDING}/public/${name} menimpa game ${name}`);
  }
}

// Hapus dist/ lama hanya setelah semua pengecekan lolos.
fs.rmSync(dist, { recursive: true, force: true });

for (const name of games) {
  const src = path.join(gamesDir, name, 'public');
  const dest = name === LANDING ? dist : path.join(dist, name);
  fs.cpSync(src, dest, { recursive: true });
  console.log(`games/${name}/public → ${path.relative(root, dest) || 'dist'}/`);
}

// Tambahkan ?v=<hash> ke referensi CSS/JS lokal di semua HTML di dist/.
const ASSET_REF = /(<(?:link|script)\b[^>]*?\s(?:href|src)=")([^"]+?\.(?:css|js))(?:\?[^"]*)?(")/g;
const hashOf = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
let versioned = 0;
for (const html of fs.readdirSync(dist, { recursive: true }).filter(f => f.endsWith('.html'))) {
  const file = path.join(dist, html), dir = path.dirname(file);
  const out = fs.readFileSync(file, 'utf8').replace(ASSET_REF, (m, pre, ref, post) => {
    if (/^(?:[a-z]+:)?\/\//i.test(ref) || ref.startsWith('/')) return m;   // URL luar & path absolut dibiarkan
    const target = path.join(dir, ref);
    if (!fs.existsSync(target)) throw new Error(`${path.relative(root, file)}: ${ref} tidak ditemukan`);
    versioned++;
    return `${pre}${ref}?v=${hashOf(target)}${post}`;
  });
  fs.writeFileSync(file, out);
}
console.log(`${versioned} referensi CSS/JS diberi ?v=<hash>`);
