# Ganti kategori di modal Edit Case

Tambahkan pilihan **Kategori** di modal Edit Case (dan Buat Soal), tepat di bawah Judul Soal.

- Memakai pemilih kategori yang sama dengan detail soal/deploy: pilih kategori yang sudah ada, "Tanpa kategori", atau buat kategori baru.
- Nilai awal diambil dari kategori soal saat ini; disimpan saat klik "Simpan Perubahan" / "Buat Soal".
- Tampilan tetap "Huruf Depan Kapital", di database tetap huruf kecil dengan `_`.
- Setelah simpan, label kategori di tabel soal dan filter kategori langsung ikut berubah.

## Technical
- `CaseForm.tsx`: tambah prop `category` di `existingCase` dan prop `categories: string[]`; state `category`; render `CategoryPicker`; masukkan `category` ke `casePayload` (update & insert).
- `CaseManager.tsx`: oper `categories` (dari `uniqueCategories(cases)`) dan `category` soal ke `CaseForm`.
- Tes kecil: menyimpan form mengirim `category` dalam format key huruf kecil.
