<div align="center">

<a href="https://mini-games.indrakusuma.dev"><img src="games/landing-page/public/assets/images/og-image.png" alt="Taman Bermain: matahari tersenyum di langit biru dengan awan dan pelangi" width="100%"></a>

# Taman Bermain

**Kumpulan game web sederhana untuk anak. Ceria, gampang dimainkan, dan langsung jalan di browser HP.**

[▶️ Main sekarang](https://mini-games.indrakusuma.dev) · Dibuat oleh [Indra Kusuma](https://indrakusuma.dev)

</div>

## Daftar Game

| Game | Tentang | URL |
| --- | --- | --- |
| 🦠 [Pemburu Kuman](games/pemburu-kuman) | Usir kuman lucu sambil cuci tangan dan sikat gigi, pakai kamera. | [/pemburu-kuman/](https://mini-games.indrakusuma.dev/pemburu-kuman/) |
| 🔤 [Huruf & Angka](games/huruf-angka) | Yuk kenalan sama huruf & angka! | [/huruf-angka/](https://mini-games.indrakusuma.dev/huruf-angka/) |

## Struktur

```
games/
  landing-page/        → disajikan di /        (pilih game)
    public/
  pemburu-kuman/       → disajikan di /pemburu-kuman/
    public/            ← yang di-deploy
    scripts/           ← alat bantu (generate gambar, video promo)
    promo/
scripts/build.mjs      ← menyusun games/*/public ke dist/
vercel.json
AGENTS.md               ← aturan untuk AI agent & kontributor
.agents/skills/new-game ← skill: workflow membuat game baru
```

Setiap game berdiri sendiri: tidak ada kode bersama antar game. Hanya isi folder `public/` yang di-deploy.

## Menjalankan di lokal

```bash
npm run dev      # build ke dist/ lalu sajikan di http://localhost:3000
npm run build    # hanya build ke dist/
```

Build tidak butuh dependency. Playwright hanya dipakai oleh script generate gambar dan video promo.

## Deploy

Di-deploy ke **Vercel** di `mini-games.indrakusuma.dev`. Semua pengaturan ada di `vercel.json`: build command `node scripts/build.mjs`, output ke `dist/`, dan `trailingSlash: true`. Opsi trailing slash ini wajib, karena tiap game memakai path relatif (`assets/...`) yang hanya benar kalau URL berakhir dengan `/`.

## Pembuat

Dibuat oleh **[Indra Kusuma](https://indrakusuma.dev)**.
