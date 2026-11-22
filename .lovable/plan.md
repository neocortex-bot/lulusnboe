# Tema berwarna yang bersih + tombol sinkronisasi hijau lemon

## Yang akan terlihat
1. Tombol "Sinkronkan properti dengan jawaban (AI)" berwarna hijau lemon dengan teks hitam (sama seperti label Soal NBOE), di halaman detail soal dan pre-review.
2. Tema aplikasi tidak lagi hitam-putih, tetap bersih dan minimal:
   - Warna utama: biru teal (tombol utama, tautan, tab aktif, fokus).
   - Latar halaman sedikit kebiruan lembut, kartu tetap putih agar bagian-bagian mudah dibedakan.
   - Tab, menu aktif, dan baris yang disorot memakai warna aksen muda (teal pucat) sehingga posisi navigasi jelas.
   - Tombol hapus tetap merah; label NBOE dan warna kategori tidak berubah.
   - Mode gelap ikut disesuaikan dengan nada yang sama.

## Detail teknis
- `src/index.css`: ubah token `--primary`, `--ring`, `--accent`, `--secondary`, `--muted`, `--background`, `--border`, dan token sidebar (light + dark). Semua HSL.
- `src/components/ui/button.tsx`: tambah varian `nboe` (bg-nboe, text-nboe-foreground, hover sedikit lebih gelap).
- `PropertySyncDialog.tsx`: tombol pemicu memakai `variant="nboe"`.
- Tidak ada perubahan logika; hanya tampilan. Verifikasi dengan screenshot halaman admin, detail soal, dan penguji di 394 px dan 1110 px.
- Simpan arah tema ke memori desain.
