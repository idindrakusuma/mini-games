// Menyusun semua game ke dist/ untuk deploy.
//   games/landing-page/public  → dist/
//   games/<nama-game>/public   → dist/<nama-game>/
// Pakai: node scripts/build.mjs   (tanpa dependency)
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
