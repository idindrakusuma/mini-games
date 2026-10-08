<div align="center">

<a href="https://mini-games.indrakusuma.dev/pensil-ajaib/"><img src="public/assets/images/og-image.png" alt="Pensil Ajaib: Tulis huruf, lihat keajaibannya!" width="100%"></a>

# Pensil Ajaib

**Tulis huruf, lihat keajaibannya!**

[▶️ Main sekarang](https://mini-games.indrakusuma.dev/pensil-ajaib/) · Bagian dari [Taman Bermain](https://mini-games.indrakusuma.dev) · Dibuat oleh [Indra Kusuma](https://indrakusuma.dev)

</div>

## Tentang

Game tracing huruf dan angka untuk balita. Ikuti panah dan tulis A–Z, a–z, serta 0–9 pakai jari. Gratis, langsung main di browser.

## Cara Main

1. Pilih tab **ABC** (huruf besar), **abc** (huruf kecil), atau **123** (angka), lalu ketuk satu karakter.
2. Letakkan jari di **titik hijau**, lalu ikuti panahnya. Garis ungu mengisi jalur sesuai arah menulis.
3. Setelah satu goresan selesai, titik hijau pindah ke awal goresan berikutnya.
4. Kalau semua goresan selesai, huruf berubah jadi **pelangi** dan dibacakan ("Hebat! be. Bola!"). Ketuk ▶ untuk karakter berikutnya.

Setiap 5 karakter **berbeda** yang selesai memberi 1 bintang: mengulang karakter yang sama tidak menambah hitungan, dan setelah bintang didapat hitungan mulai dari nol lagi. Karakter yang sudah pernah dilatih diberi tanda ✓.

## Dirancang untuk balita

- **Urutan dan arah goresan** mengikuti cara menulis yang diajarkan di TK/SD. Huruf kecil memakai gaya tulisan tangan (a dan g bulat).
- **Sangat memaafkan.** Jalurnya lebar dan jari boleh melenceng. Kalau keluar jalur, garis berhenti tanpa dihapus dan tanpa suara salah, lalu lanjut lagi dari titik hijau. Mengangkat jari di dekat ujung goresan juga dihitung selesai.
- **Tetap harus menulis.** Coretan asal di seluruh layar tidak dihitung, karena jari harus menelusuri jalur secara menyambung.
- **Tenang saat menulis.** Latar polos, dan kemeriahan baru muncul saat satu karakter selesai.

## Pengembangan

```bash
npm run dev               # dari root repo, lalu buka /pensil-ajaib/
npm run pensil-ajaib:images   # buat ulang thumbnail & ikon
```

Jalur goresan ada di `public/assets/js/strokes.js` (kotak 120×180, garis bantu atas 20, tengah 70, dasar 130, ekor 165). Setelah mengubahnya:

```bash
node games/pensil-ajaib/scripts/preview-strokes.mjs out.png      # lihat semua jalur + urutan + arah
BASE=http://localhost:3000 node games/pensil-ajaib/scripts/test-trace.mjs   # pastikan semua bisa ditulis
```
