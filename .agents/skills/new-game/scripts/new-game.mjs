// Scaffold game baru di Taman Bermain (tanpa dependency).
//
//   node .agents/skills/new-game/scripts/new-game.mjs \
//     --slug tebak-hewan --name "Tebak Hewan" --emoji 🐘 --accent leaf \
//     --tagline "Dengar suaranya, tebak hewannya!" \
//     --description "Game tebak suara hewan untuk anak. ..." \
//     [--keywords "game anak, hewan, suara"] [--title-suffix "Game Tebak Suara Hewan untuk Anak"]
//
// Yang dibuat/diubah:
//   games/<slug>/                       folder game dari template (SEO, PWA, game placeholder, generator gambar)
//   games/landing-page/public/index.html  kartu game (menggantikan kartu "Segera hadir" pertama)
//   games/landing-page/public/sitemap.xml URL game
//   README.md                           baris di tabel "Daftar Game"
//   package.json                        script "<slug>:images"
//   AGENTS.md                           baris "npm run <slug>:images" di daftar Perintah
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../..');
const templateDir = path.resolve(here, '../template');
const SITE = 'https://mini-games.indrakusuma.dev';

const ACCENTS = {
  soap:  { accent: '#FF8FB8', bg: '#FFE3EE' },
  sun:   { accent: '#FFD23F', bg: '#FFF3C4' },
  leaf:  { accent: '#7BD88F', bg: '#DDF6E3' },
  water: { accent: '#47C9E5', bg: '#BFEFFA' },
  grape: { accent: '#B98CFF', bg: '#ECE1FF' },
};

// ---------- argumen ----------
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith('--')) continue;
  let k, v;
  if (a.includes('=')) [k, v] = [a.slice(2, a.indexOf('=')), a.slice(a.indexOf('=') + 1)];
  else {
    k = a.slice(2); v = process.argv[i + 1];
    // "--flag" tanpa nilai: jangan ambil flag berikutnya sebagai nilainya
    if (v === undefined || v.startsWith('--')) { console.error(`✗ --${k} butuh nilai`); process.exit(1); }
    i++;
  }
  args[k] = v;
}
const fail = msg => { console.error('✗ ' + msg); process.exit(1); };
for (const k of Object.keys(args)) args[k] = args[k].trim();
for (const k of ['slug', 'name', 'emoji', 'tagline', 'description']) if (!args[k]) fail(`--${k} wajib diisi`);
const slug = args.slug;
if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) fail('--slug harus kebab-case, contoh: tebak-hewan');
if (slug === 'landing-page' || slug === 'assets') fail(`--slug "${slug}" sudah dipakai sistem`);
const accentKey = args.accent || 'water';
if (!ACCENTS[accentKey]) fail(`--accent harus salah satu dari: ${Object.keys(ACCENTS).join(', ')}`);
const gameDir = path.join(root, 'games', slug);
if (fs.existsSync(gameDir)) fail(`games/${slug} sudah ada`);
// Prefix localStorage dari slug (tebak-hewan → tebakHewan) harus unik di antara game yang ada.
const storeOf = s => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const clash = fs.readdirSync(path.join(root, 'games')).find(g => g !== 'landing-page' && storeOf(g) === storeOf(slug));
if (clash) fail(`prefix localStorage "${storeOf(slug)}" bentrok dengan games/${clash}; pilih slug lain`);

const name = args.name;
const words = name.split(/\s+/);
// Judul thumbnail: pecah per baris maksimal ~10 huruf (kata pendek seperti "&" ikut baris sebelumnya)
const ogLines = words.reduce((lines, w) => {
  const lastLine = lines[lines.length - 1];
  if (lastLine && (lastLine + ' ' + w).length <= 10) lines[lines.length - 1] = lastLine + ' ' + w;
  else lines.push(w);
  return lines;
}, []);
const longest = Math.max(...ogLines.map(w => w.length));
const today = new Date().toISOString().slice(0, 10);
// short_name PWA (label di bawah ikon) maksimal 12 huruf. Kalau nama terlalu panjang dan --short-name
// tidak diberikan: coba tanpa spasi ("Huruf&Angka"), kalau masih kepanjangan pakai kata pertama + peringatan.
// Potong per karakter (bukan per unit UTF-16) supaya emoji tidak terbelah.
const cut = (s, n) => Array.from(s).slice(0, n).join('');
function shortName(){
  if (args['short-name']) return cut(args['short-name'], 12);
  if (Array.from(name).length <= 12) return name;
  const compact = name.replace(/\s+/g, '');
  if (Array.from(compact).length <= 12) return compact;
  console.warn(`! short_name dipotong jadi "${cut(words[0], 12)}"; pakai --short-name untuk label ikon yang lebih pas`);
  return cut(words[0], 12);
}
const V = {
  SLUG: slug,
  NAME: name,
  // short_name PWA: maksimal 12 huruf supaya tidak terpotong di bawah ikon (bisa diatur dengan --short-name)
  SHORT_NAME: shortName(),
  EMOJI: args.emoji,
  TAGLINE: args.tagline,
  DESCRIPTION: args.description,
  KEYWORDS: args.keywords || `game anak, game edukasi, ${name.toLowerCase()}, game web anak, game gratis`,
  TITLE_SUFFIX: args['title-suffix'] || 'Game Seru untuk Anak',
  URL: `${SITE}/${slug}/`,
  STORE: storeOf(slug),
  ACCENT: ACCENTS[accentKey].accent,
  BG: ACCENTS[accentKey].bg,
  OG_TITLE_SIZE: String(longest <= 8 ? 112 : Math.max(64, Math.floor(112 * 8 / longest))),
};

const esc = {
  html: s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
  json: s => JSON.stringify(s).slice(1, -1),
  // Untuk nilai di dalam string/template literal JS dan komentar /* */: netralkan juga "*/", "</script"
  // dan pemisah baris, supaya nilai tidak bisa menutup komentar/tag script atau memecah string.
  js: s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
    .replace(/\*\//g, '*\\/').replace(/<\//g, '<\\/').replace(/\r?\n|\r|\u2028|\u2029/g, ' '),
};
// Di dalam <script type="application/ld+json"> entitas HTML tidak di-decode: isinya harus di-escape
// sebagai JSON (dan "<" diganti \u003c supaya tidak bisa menutup tag script).
const jsonLd = v => JSON.stringify(v).slice(1, -1).replace(/</g, '\\u003c');
// Satu kali lewat: setiap placeholder diganti tepat sekali, jadi nilai yang sudah dimasukkan
// (misalnya deskripsi berisi "{{URL}}") tidak ikut diproses ulang.
function fill(text, file) {
  const PH = /\{\{([A-Z_]+)\}\}/g;
  if (!file.endsWith('.html')) return text.replace(PH, m => fillOne(m, file));
  const LD = /(<script type="application\/ld\+json">)([\s\S]*?)(<\/script>)/g;
  let out = '', last = 0;
  for (const m of text.matchAll(LD)) {
    out += text.slice(last, m.index).replace(PH, x => fillOne(x, file));
    out += m[1] + m[2].replace(PH, (x, k) => { if (!(k in V)) fail(`placeholder tidak dikenal ${x} di ${file}`); return jsonLd(V[k]); }) + m[3];
    last = m.index + m[0].length;
  }
  return out + text.slice(last).replace(PH, x => fillOne(x, file));
}
// Di .mjs nilai berada di dalam template literal, jadi "<\/" yang dibuat esc.js kembali jadi "</" saat
// dievaluasi. Ganti setiap "<" dengan \\u003c: tetap "<" di string JS halaman, tapi tidak pernah
// bisa membentuk "</script" di HTML yang disusun generator.
const mjsSafe = s => s.replace(/</g, '\\\\u003c');
function fillOne(m, file) {
  const k = m.slice(2, -2);
  const kind = file.endsWith('.webmanifest') ? 'json' : file.endsWith('.js') || file.endsWith('.mjs') ? 'js' : 'html';
  const vals = { ...V, OG_TITLE_HTML: ogLines.map(esc.html).join('<br>'), EMOJI_JS: '' };
  if (!(k in vals)) fail(`placeholder tidak dikenal ${m} di ${file}`);
  if (k === 'OG_TITLE_HTML') return kind === 'js' ? esc.js(vals[k]) : vals[k];
  // Emoji untuk string JS di dalam template literal (fillText(...) di generator gambar): literal JSON yang aman.
  if (k === 'EMOJI_JS') return mjsSafe(esc.js(JSON.stringify(V.EMOJI)));
  // .mjs generator menaruh nilai di dalam HTML di dalam template literal JS
  if (file.endsWith('.mjs')) return mjsSafe(esc.js(esc.html(vals[k])));
  return kind === 'json' ? esc.json(vals[k]) : kind === 'js' ? esc.js(vals[k]) : esc.html(vals[k]);
}

// ---------- 1. siapkan semua isi di memori dulu ----------
// Template diisi dan landing page dicek SEBELUM ada file yang ditulis, jadi kalau gagal
// tidak ada folder setengah jadi yang memblokir percobaan berikutnya.
const files = [];
(function collect(src, dest) {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) collect(s, d);
    else files.push([d, fill(fs.readFileSync(s, 'utf8'), s)]);
  }
})(templateDir, gameDir);

const landingPath = path.join(root, 'games/landing-page/public/index.html');
let landing = fs.readFileSync(landingPath, 'utf8');
const card = `    <li>
      <a class="card ${accentKey}" href="${slug}/">
        <img src="${slug}/assets/icons/icon-192.png" alt="" width="96" height="96">
        <b>${esc.html(name)}</b>
        <small>${esc.html(V.TAGLINE)}</small>
        <span class="play">Main! ▶</span>
      </a>
    </li>
`;
const soon = /    <li>\n      <div class="card soon"[\s\S]*?<\/li>\n/;
// Pakai fungsi sebagai pengganti, supaya pola "$&", "$$" dll. di nama/tagline tidak ikut diproses.
if (soon.test(landing)) landing = landing.replace(soon, () => card);
else if (landing.includes('  </ul>')) landing = landing.replace('  </ul>', () => card + '  </ul>');
else fail('tidak menemukan daftar game di landing page');

// Sitemap, README dan package.json juga disiapkan di memori dulu (bisa gagal dibaca/di-parse).
const sitemapPath = path.join(root, 'games/landing-page/public/sitemap.xml');
const sitemapSrc = fs.readFileSync(sitemapPath, 'utf8');
if (!sitemapSrc.includes('</urlset>')) fail('sitemap.xml tidak punya </urlset>');
// Landing page ikut berubah (ada kartu baru): perbarui juga lastmod halaman utama.
const sitemap = sitemapSrc.replace(/(<loc>https:\/\/mini-games\.indrakusuma\.dev\/<\/loc>\s*<lastmod>)[^<]*(<\/lastmod>)/, (m, a, b) => a + today + b)
  .replace('</urlset>', () => `  <url>
    <loc>${V.URL}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`);

const readmePath = path.join(root, 'README.md');
let readme = fs.readFileSync(readmePath, 'utf8');
const tableEnd = readme.match(/## Daftar Game\n\n(?:\|.*\n)+/);
if (tableEnd) {
  const cell = t => t.replace(/[|\[\]]/g, m => '\\' + m);   // "|" memecah tabel, "[" "]" memecah tautan
  const row = `| ${cell(V.EMOJI)} [${cell(name)}](games/${slug}) | ${cell(V.TAGLINE)} | [/${slug}/](${V.URL}) |\n`;
  readme = readme.replace(tableEnd[0], () => tableEnd[0] + row);
} else console.warn('! tabel "Daftar Game" di README.md tidak ditemukan, tambahkan baris secara manual');

const pkgPath = path.join(root, 'package.json');
let pkg;
try { pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); } catch (e) { fail(`package.json tidak bisa dibaca: ${e.message}`); }
(pkg.scripts ||= {})[`${slug}:images`] = `node games/${slug}/scripts/generate-images.mjs`;

// Daftar perintah di AGENTS.md: tambahkan "npm run <slug>:images" setelah perintah :images terakhir.
const agentsPath = path.join(root, 'AGENTS.md');
let agents = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf8') : null;
if (agents) {
  const lines = agents.split('\n'), lastImg = lines.findLastIndex(l => /^npm run [\w-]+:images\b/.test(l));
  if (lastImg >= 0) { lines.splice(lastImg + 1, 0, `npm run ${slug}:images`); agents = lines.join('\n'); }
  else { console.warn('! daftar perintah :images di AGENTS.md tidak ditemukan, tambahkan secara manual'); agents = null; }
}

// ---------- 2. tulis semuanya (semua pengecekan di atas sudah lolos) ----------
for (const [d, text] of files) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, text); }
for (const d of ['public/assets/icons', 'public/assets/images']) fs.mkdirSync(path.join(gameDir, d), { recursive: true });
const written = files.map(([d]) => path.relative(root, d));
fs.writeFileSync(landingPath, landing);
fs.writeFileSync(sitemapPath, sitemap);
fs.writeFileSync(readmePath, readme);
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
if (agents) fs.writeFileSync(agentsPath, agents);

console.log(`✓ games/${slug} dibuat (${written.length} file)`);
console.log(`✓ kartu landing page, sitemap, README, package.json${agents ? ', dan AGENTS.md' : ''} diperbarui`);
console.log(`\nBerikutnya:\n  1. Buat gameplay di games/${slug}/public/assets/js/game.js\n  2. npm run ${slug}:images   (thumbnail & ikon)\n  3. npm run build lalu tes di browser`);
