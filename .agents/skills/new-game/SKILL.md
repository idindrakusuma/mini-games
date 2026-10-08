---
name: new-game
description: Membuat game baru di Taman Bermain (repo mini-games), mulai dari ide sampai siap deploy. Mencakup folder dan struktur game, SEO (meta, Open Graph, JSON-LD, sitemap), PWA, thumbnail og-image dan ikon, kartu di landing page, README, gameplay, dan tes di browser HP. Pakai skill ini setiap kali user minta membuat, menambah, atau menyiapkan game baru.
---

# Membuat game baru di Taman Bermain

Ikuti aturan di `AGENTS.md`. Langkah-langkah di bawah ini dikerjakan berurutan.

## 1. Pahami gamenya

Sebelum membuat file apa pun, pastikan hal-hal berikut sudah jelas. Kalau ada yang belum, tanya user **satu per satu**:

- **Konsep dan cara main.** Satu kalimat: anak melakukan apa, dan kapan dia menang? Harus bisa dimainkan dengan sentuhan dan tanpa membaca.
- **Nama game.** Bahasa Indonesia, pendek dan ceria (misalnya "Tebak Hewan").
- **Slug.** kebab-case dari nama, dipakai sebagai URL (`/tebak-hewan/`).
- **Emoji maskot** dan **warna aksen**: `soap` (pink), `sun` (kuning), `leaf` (hijau), `water` (biru), atau `grape` (ungu). Pilih warna yang belum dipakai game lain kalau bisa.
- **Tagline.** Maksimal sekitar 45 huruf, ajakan untuk anak. Tampil di kartu landing page, layar awal, dan thumbnail.
- **Deskripsi SEO.** 1–2 kalimat (sekitar 150 huruf) untuk orang tua. Sebutkan manfaat dan "gratis, langsung main di browser".

Jangan mulai bikin game sebelum konsepnya disetujui user.

## 2. Scaffold

Dari root repo:

```bash
node .agents/skills/new-game/scripts/new-game.mjs \
  --slug tebak-hewan --name "Tebak Hewan" --emoji 🐘 --accent leaf \
  --tagline "Dengar suaranya, tebak hewannya!" \
  --description "Game tebak suara hewan untuk anak. Gratis, langsung main di browser tanpa install." \
  --keywords "game anak, tebak hewan, suara hewan, game edukasi" \
  --title-suffix "Game Tebak Suara Hewan untuk Anak"
```

Script ini otomatis mengerjakan:
- Membuat `games/<slug>/`: `public/index.html` (SEO lengkap: title, description, canonical, Open Graph, Twitter, JSON-LD), `site.webmanifest` (scope `./`), CSS, `game.js` placeholder yang sudah bisa dimainkan, `scripts/generate-images.mjs`, dan `README.md`.
- Mengganti kartu "Segera hadir" pertama di landing page dengan kartu game ini. Kalau sudah tidak ada kartu "Segera hadir", kartu ditambahkan di akhir daftar.
- Menambahkan URL game ke `sitemap.xml`, menambah baris di tabel README root, dan menambah script `npm run <slug>:images`.

## 3. Buat gameplay

Ganti bagian **Gameplay** di `games/<slug>/public/assets/js/game.js`. Bagian bintang, suara, canvas, dan tombol boleh dipakai apa adanya. Sesuaikan HTML dan CSS seperlunya. Patokannya:

- **Satu aturan main.** Satu ronde selesai dalam 1–2 menit, lalu muncul layar "Hore" dan anak mendapat 1 bintang.
- **Semua bisa disentuh.** Target sentuh minimal 64px, pakai `pointer` events, tanpa hover, tanpa gestur rumit.
- **Feedback di setiap aksi.** Ada suara (Web Audio, tanpa file) dan animasi. Teks pendek dalam Bahasa Indonesia sederhana.
- **Tidak ada kalah yang menyakitkan.** Tidak ada game over, timer yang menekan, atau hal yang menakutkan.
- **Tampilan.** Cek mode gelap dan `prefers-reduced-motion`. Hormati `env(safe-area-inset-*)`.
- **Tetap mandiri.** Jangan import file dari game lain. Pakai path relatif saja. Key `localStorage` harus memakai prefix dari `STORE`.
- Kalau butuh kamera atau mikrofon: proses di perangkat, sediakan cara main tanpa izin tersebut, lalu sesuaikan `Permissions-Policy` di `vercel.json`.
- Lengkapi bagian "Cara Main" di `games/<slug>/README.md`.

## 4. Thumbnail dan ikon

Fungsi `ART()` di `games/<slug>/scripts/generate-images.mjs` menggambar karakter utama. Default-nya emoji maskot di dalam lingkaran berwarna aksen.

Kalau game punya karakter sendiri yang digambar di canvas, pisahkan kode gambarnya ke file sendiri (contoh: `germ.js` di Pemburu Kuman). Daftarkan file itu di `EXTRA_JS`, lalu panggil fungsinya dari dalam `ART()`. Dengan begitu thumbnail sama persis dengan isi game.

```bash
npm install                          # sekali saja, untuk Playwright
CHROMIUM_PATH=/path/ke/chromium npm run <slug>:images   # CHROMIUM_PATH hanya kalau Chromium bawaan Playwright tidak ada
```

Wajib dicek setelah generate: buka `public/assets/images/og-image.png` dan `public/assets/icons/icon-192.png`. Pastikan tidak kosong, teks tidak terpotong, dan karakternya terlihat jelas.

## 5. Tes di browser

```bash
npm run build && (cd dist && python3 -m http.server 8765)
```

Pakai Playwright dengan viewport HP (misalnya `devices['iPhone 13']`), mode terang dan gelap. Cek hal-hal berikut:

- [ ] Landing page `/` menampilkan kartu baru dengan ikon, dan kartunya membuka `/<slug>/`.
- [ ] `/<slug>` tanpa garis miring di akhir tetap jalan (redirect ke `/<slug>/`).
- [ ] Satu ronde bisa dimainkan sampai layar menang, dan jumlah bintang bertambah setelah "Selesai".
- [ ] Tidak ada error konsol, dan tidak ada request yang gagal (status ≥ 400).
- [ ] Manifest: `start_url` dan `scope` sama dengan `/<slug>/`, dan ikonnya bisa dimuat.
- [ ] Lihat screenshot-nya sendiri: ceria, rapi di layar HP, tidak ada yang terpotong.

## 6. Selesaikan

- Kalau CSS landing page berubah, naikkan `?v=N` di link stylesheet-nya.
- Commit dengan pesan yang jelas, lalu push ke branch yang diminta user.
- Laporkan ke user: URL game (`https://mini-games.indrakusuma.dev/<slug>/`), screenshot, dan apa saja yang belum dites (misalnya Safari asli atau perangkat fisik).
