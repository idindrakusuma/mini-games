# AGENT.md

Panduan untuk AI agent (dan manusia) yang bekerja di repo ini.

## Tentang repo

**Taman Bermain**: kumpulan mini game web untuk anak kecil (kira-kira 3–10 tahun), di-deploy ke Vercel di `https://mini-games.indrakusuma.dev`. Landing page ada di `/`, dan setiap game punya path sendiri, misalnya `/pemburu-kuman/`.

## Prinsip game

Setiap game harus:

- **Sederhana.** Satu ide, satu aturan main. Anak paham tanpa membaca instruksi panjang.
- **Intuitif.** Bisa dimainkan dengan sentuhan. Tombol besar (minimal 48px, lebih baik 64px ke atas) dan tanpa gestur rumit.
- **Mobile friendly.** Dirancang untuk HP dulu, layar sentuh, portrait. Tetap rapi di desktop. Hormati `env(safe-area-inset-*)`.
- **Web based.** Langsung main di browser, tanpa install, tanpa login, tanpa iklan.
- **Ceria.** Warna cerah, sudut membulat, font ramah (Baloo 2), animasi dan suara yang menyenangkan. Tidak ada yang menakutkan, kalah yang menyakitkan, atau hitung mundur yang menekan.
- **Bahasa Indonesia** yang sederhana dan hangat untuk semua teks.
- **Aman untuk anak.** Tidak ada tautan keluar di area main (tautan untuk orang tua cukup di footer), tidak ada pengumpulan data. Kamera dan mikrofon hanya dipakai bila memang inti permainan, diproses di perangkat, dan ada jalan main tanpa izin tersebut.
- Mendukung **mode gelap** (`prefers-color-scheme`) dan `prefers-reduced-motion`.

## Struktur & aturan teknis

```
games/
  landing-page/public/   → /
  <nama-game>/public/    → /<nama-game>/
  <nama-game>/scripts/   ← alat bantu, tidak di-deploy
scripts/build.mjs        ← menyalin games/*/public ke dist/
vercel.json
```

- **Vanilla HTML/CSS/JS.** Tanpa framework, tanpa bundler, tanpa langkah build per game. Game harus jalan hanya dengan membuka `public/index.html` lewat server statis.
- **Tiap game mandiri.** Jangan import atau link file dari game lain maupun dari landing page. Folder `games/<nama-game>/` harus bisa dicopy keluar dan tetap jalan. (Pengecualian: landing page boleh menampilkan ikon game dari `<nama-game>/assets/icons/`.)
- **Pakai path relatif** (`assets/css/style.css`, `site.webmanifest`), jangan path absolut (`/assets/...`), karena game disajikan di sub-path.
- **`localStorage`**: semua game berbagi satu domain, jadi key wajib diberi prefix nama game, misalnya `pemburuKuman.stars`.
- **PWA per game**: tiap game punya `site.webmanifest` sendiri dengan `start_url` dan `scope` `"./"`, dan ikon dengan path relatif.
- **SEO**: URL canonical, `og:url`, dan `og:image` memakai URL lengkap `https://mini-games.indrakusuma.dev/<nama-game>/...`. `robots.txt` dan `sitemap.xml` hanya ada satu, di `games/landing-page/public/`.
- **Cache**: CSS/JS selalu divalidasi ulang ke server (`max-age=0`), sedangkan gambar dan ikon di `assets/images|icons/` di-cache 1 hari. Kalau mengganti gambar dengan nama file yang sama, tambahkan `?v=N` di referensinya.
- Nama folder game memakai **kebab-case** dan langsung menjadi path URL-nya.

## Menambah game baru

1. Buat `games/<nama-game>/public/index.html` beserta `assets/` (css, js, icons, images) dan `site.webmanifest`.
2. Tambahkan `games/<nama-game>/README.md` (tentang game dan cara main).
3. Tambahkan kartu di `games/landing-page/public/index.html` (salin kartu yang sudah ada) dan ganti salah satu kartu "Segera hadir" bila perlu.
4. Tambahkan URL game ke `games/landing-page/public/sitemap.xml`.
5. Tambahkan baris di tabel "Daftar Game" pada `README.md`.
6. Jalankan `npm run build`, lalu cek di browser dengan viewport HP: halaman `/<nama-game>/` (dan juga tanpa garis miring di akhir), tanpa error konsol, tanpa request 404.

## Perintah

```bash
npm run build                  # susun dist/
npm run dev                    # build + sajikan dist/
npm run pemburu-kuman:images   # generate ulang og-image & ikon (butuh Playwright)
npm run landing-page:images
```

Kalau Playwright tidak bisa mengunduh Chromium sendiri, set `CHROMIUM_PATH` ke binary Chromium yang ada.
