<div align="center">

<a href="https://mini-games.indrakusuma.dev/pemburu-kuman/"><img src="public/assets/images/og-image.png" alt="Pemburu Kuman: tiga kuman kartun lucu berwarna hijau, ungu, dan pink" width="100%"></a>

# Pemburu Kuman

**Game kamera untuk anak: usir kuman lucu sambil cuci tangan dan sikat gigi.**

[▶️ Main sekarang](https://mini-games.indrakusuma.dev/pemburu-kuman/) · Dibuat oleh [Indra Kusuma](https://indrakusuma.dev)

</div>

## Latar Belakang

Anak balita zaman sekarang kritis. Bilang "tanganmu ada kumannya" saja tidak cukup, karena mereka baru percaya kalau sudah melihatnya sendiri. Pemburu Kuman memperlihatkan kuman itu lewat kamera, langsung di tangan dan gigi mereka, supaya cuci tangan dan sikat gigi jadi sesuatu yang mereka mau lakukan, bukan yang harus disuruh.

## Tentang

Pemburu Kuman membuat rutinitas cuci tangan dan sikat gigi jadi permainan. Anak mengarahkan kamera ke tangan atau gigi, lalu kuman kartun muncul menempel di sana. Untuk mengusirnya, anak harus menggosok tangan pakai sabun atau menyikat gigi sampai semua kuman kabur.

## Fitur

### 🖐️ Mode Tangan
Tunjukkan tangan ke kamera, lalu kuman muncul menempel di kulit. Gosok-gosok tangan seperti sedang cuci tangan pakai sabun sampai 6 kuman kabur.

### 🦷 Mode Gigi
Buka mulut dan senyum lebar ke kamera, lalu kuman muncul di gigi. Sikat gigi sampai 5 kuman kabur. Posisi mulut dicari dengan model [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (gratis, Apache 2.0) yang disimpan di repo ini dan jalan di perangkat, jadi kuman benar-benar menempel di gigi dan ikut bergerak bersama mulut. Kalau model tidak bisa dimuat, game kembali ke deteksi warna.

### 🦠 Kuman yang hidup
- Kuman bergoyang, berkedip, dan matanya melirik ke sana kemari.
- Kuman ikut bergerak menempel di tangan atau gigi.
- Kuman mengejek sebelum diusir ("Jangan pakai sabun yaa!") dan teriak waktu kabur ("Ampun sabun!").
- Ada lima warna kuman dengan ukuran berbeda-beda.

### 👆 Main pakai jari
Selain menggosok di depan kamera, anak juga bisa menekan dan menggosok kuman langsung di layar. Setiap gosokan mengeluarkan gelembung sabun.

### ⭐ Hadiah bintang
Setiap ronde yang selesai memberi satu bintang. Jumlah bintang tersimpan di perangkat, jadi anak bisa terus mengumpulkannya.

### 🔊 Efek suara & animasi
Ada bunyi "pop" saat kuman kabur dan nada kemenangan di akhir ronde, diiringi hujan bintang dan gelembung sabun.

### 📷 Tetap bisa main tanpa kamera
Kalau kamera tidak diizinkan atau tidak tersedia, anak tetap bisa main dengan gambar tangan atau mulut kartun. Ada juga tombol untuk ganti antara kamera depan dan belakang.

### 📱 Ramah anak & ponsel
- Tombolnya besar, warnanya cerah, dan teksnya dalam Bahasa Indonesia yang sederhana.
- Mendukung mode gelap.
- Bisa dipasang ke layar utama HP seperti aplikasi.
- Langsung main di browser tanpa install.

### 🔒 Privasi terjaga
Kamera hanya dipakai di layar permainan. Deteksi tangan dan gigi berjalan sepenuhnya di perangkat, dan tidak ada foto atau video yang disimpan maupun dikirim ke mana pun. Model deteksi wajah memakai versi MediaPipe yang tidak mengirim metrik pemakaian, dan halaman ini melarang skrip mengirim permintaan ke domain lain (CSP `connect-src 'self'`).

## Pembuat

Dibuat oleh **[Indra Kusuma](https://indrakusuma.dev)**.
