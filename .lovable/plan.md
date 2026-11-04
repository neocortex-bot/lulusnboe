# Sinkronisasi rubrik dan hasil ujian

- Setiap penyimpanan perubahan poin, penanda critical, dan penghapusan butir di detail soal otomatis menghitung ulang seluruh hasil ujian soal tersebut, termasuk yang sudah selesai.
- Butir yang dihapus tidak lagi masuk total poin atau menyebabkan gagal critical. Status LULUS/TIDAK LULUS mengikuti rubrik terbaru.
- Pertahankan penilaian dan bukti jawaban butir yang masih ada. Sesuaikan bobot nilai AI secara proporsional; nilai manual tetap dipertahankan, dibatasi maksimum terbaru.
- Butir baru belum mendapat nilai otomatis dari jawaban lama; tampil sebagai belum dinilai dan dapat dinilai admin atau melalui evaluasi AI.
- Hasil di halaman session diperbarui tanpa perlu evaluasi ulang AI.

## Detail teknis
- Tambahkan fungsi dan trigger Supabase untuk sinkronisasi di semua jalur penyimpanan rubrik serta hasil evaluasi, bukan hanya halaman detail.
- Cocokkan butir berdasarkan identitas bila tersedia atau teks, bukan posisi agar penghapusan tidak memindahkan nilai ke butir lain.
- Uji perubahan bobot, critical, penghapusan, dan perlindungan nilai manual; jalankan sinkronisasi hasil terdahulu dan periksa hasil tersimpan.
- Verifikasi alur halaman dengan sesi admin bila akses pengujian tersedia; akses login Supabase eksternal dapat membatasi verifikasi langsung.