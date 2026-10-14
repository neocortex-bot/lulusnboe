import type { SoalDraft } from "./types";

export const mitralStenosis: SoalDraft = {
  slug: "mitral-stenosis",
  pageTitle: "Station Echo — Mitral Stenosis, Wilkins Score & Rencana PMC/MVR",
  draftTitle: "Echo — Mitral Stenosis: Interpretasi, Wilkins, PMC vs MVR & Edukasi (Ny. A, 32 th)",
  scenario: `Seorang perempuan 32 tahun datang ke poliklinik dengan keluhan sesak nafas saat aktivitas sedang sejak 6 bulan terakhir dan berdebar-debar.

Riwayat demam rematik saat usia sekolah. Pemeriksaan fisik: murmur mid-diastolik di apeks.

Anda diminta melakukan pemeriksaan echo.`,
  instructions: [
    "Lakukan pemeriksaan echo pada pasien ini secara profesional",
    "Interpretasikan hasil pemeriksaan dan tentukan derajat stenosis",
    "Tentukan Wilkins score dan rencana tindakan (PMC atau MVR)",
    "Berikan edukasi kepada pasien mengenai hasil dan rencana tindakan",
  ],
  examDataTitle: "Data echo (ditampilkan ke peserta setelah peserta meminta/melakukan view)",
  examData: [
    "MVA (planimetri SAX basal): 0,9 cm²",
    "Mean PG transmitral: 12 mmHg",
    "PHT: 240 ms",
    "LA dilatasi, LAVI 48 ml/m²",
    "Wilkins: mobilitas 2, penebalan 2, kalsifikasi 1, subvalvular 2",
    "MR: trivial; tidak tampak trombus LA (konfirmasi TEE)",
  ],
  keySections: [
    {
      title: "Kunci interpretasi",
      items: [
        { label: "Derajat MS", value: "Severe (MVA <1 cm², PHT >220 ms, mean PG >10 mmHg)" },
        { label: "Moderate / Mild", value: "MVA 1–1,5 cm², PG 5–10 / MVA >1,5 cm², PG <5 mmHg" },
        { label: "Wilkins score", value: "2+2+1+2 = 7 (≤8 → morfologi baik untuk PMC)" },
        { label: "Rencana", value: "PMC (Wilkins ≤8, MR ≤ mild, tanpa trombus LA). MVR bila Wilkins >8, MR ≥ moderat, trombus LA, kalsifikasi komisura berat" },
      ],
    },
    {
      title: "Wilkins score (tiap komponen 1–4, total 4–16)",
      items: [
        "Mobilitas: 1 hanya ujung leaflet terbatas → 4 hampir tidak bergerak",
        "Penebalan: 1 hampir normal (4–5 mm) → 4 seluruh leaflet (>8–10 mm)",
        "Kalsifikasi: 1 satu area → 4 luas di seluruh leaflet",
        "Subvalvular: 1 minimal di bawah leaflet → 4 seluruh korda sampai muskulus papilaris",
      ],
    },
  ],
  properties: [
    "Mesin echo / probe + gel, elektroda EKG",
    "Gambar/video echo: PLAX (hockey stick AML), SAX pulmonal, SAX basal (planimetri MVA, commissural fusion), SAX mid (D-shaped), A4C + CW mitral (mean PG, PHT), LAVI",
    "Tabel Wilkins score (untuk penguji)",
    "Hasil TEE (tidak ada trombus LA)",
  ],
  fullAnswer: [
    {
      heading: "Persiapan",
      text: "Selamat pagi Bu, saya dokter yang akan melakukan pemeriksaan echo jantung. Pemeriksaan ini untuk menilai katup mitral ibu, tidak sakit dan aman. Mohon ibu berbaring miring ke kiri dan membuka baju di area dada. Saya pasang elektroda EKG terlebih dahulu.",
    },
    {
      heading: "Prosedur echo",
      text: "Saya mulai dari view parasternal long axis untuk menilai stenosis dan regurgitasi, gerakan leaflet mitral dengan hockey stick appearance pada AML, penebalan dan kalsifikasi leaflet, penebalan subvalvular, serta ukuran atrium kiri. Lalu SAX setinggi pulmonal, saya ukur diameter, pasang color untuk regurgitasi, dan PW di RVOT untuk menilai PV acceleration time. Di SAX setinggi basal saya ukur luas area mitral dengan planimetri dan menilai commissural fusion. Di SAX setinggi mid saya nilai ada tidaknya D-shaped septum. Di apikal empat ruang saya nilai ukuran ruang jantung, pasang color dan CW di katup mitral untuk mean gradient dan pressure half time, nilai regurgitasi mitral dan trikuspid, serta mengukur LAVI.",
    },
    {
      heading: "Interpretasi",
      text: "Hasilnya MVA 0,9 sentimeter persegi, mean gradient 12 mmHg, dan PHT 240 milidetik, sehingga ini mitral stenosis berat. Atrium kiri dilatasi dengan LAVI 48.",
    },
    {
      heading: "Wilkins score dan rencana",
      text: "Wilkins score: mobilitas 2, penebalan 2, kalsifikasi 1, subvalvular 2, total 7. Karena skor kurang dari atau sama dengan 8, MR hanya trivial, dan tidak ada trombus atrium kiri pada TEE, pasien ini kandidat PMC atau balon mitral valvuloplasty. MVR dipilih bila Wilkins lebih dari 8, MR sedang sampai berat, atau ada trombus atrium kiri.",
    },
    {
      heading: "Edukasi",
      text: "Bu, katup jantung ibu menyempit berat akibat demam rematik, itu yang membuat ibu sesak dan berdebar. Kondisi katup ibu masih baik untuk dilebarkan dengan balon melalui kateter dari pembuluh darah paha tanpa operasi bedah. Risikonya antara lain kebocoran katup, stroke, atau perdarahan, namun jarang. Bila tidak berhasil, pilihannya operasi ganti katup. Ibu perlu minum obat teratur, profilaksis antibiotik untuk mencegah demam rematik berulang, dan kontrol rutin. Apakah ada yang ingin ditanyakan?",
    },
  ],
  tilik: [
    { dt: "Memperkenalkan diri dan menjelaskan tujuan pemeriksaan", wbw: "Saya dokter yang akan melakukan pemeriksaan echo jantung untuk menilai katup mitral ibu.", poin: 2 },
    { dt: "Memposisikan pasien berbaring (miring kiri), dada terbuka, pasang EKG", wbw: "Mohon ibu berbaring miring ke kiri dan membuka baju di area dada. Saya pasang elektroda EKG.", poin: 2 },
    { dt: "PLAX: menilai stenosis/regurgitasi, hockey stick AML, penebalan & kalsifikasi leaflet, subvalvular, ukuran LA", wbw: "View PLAX untuk menilai stenosis dan regurgitasi, hockey stick AML, penebalan dan kalsifikasi leaflet, penebalan subvalvular, serta ukuran atrium kiri.", poin: 2 },
    { dt: "SAX pulmonal: diameter, color regurgitasi, PW RVOT (PVAcct)", wbw: "SAX setinggi pulmonal, ukur diameter, pasang color, dan PW di RVOT untuk PV acceleration time.", poin: 2 },
    { dt: "SAX basal: planimetri MVA dan commissural fusion", wbw: "Di SAX basal saya ukur luas area mitral dengan planimetri dan menilai commissural fusion.", poin: 2 },
    { dt: "SAX mid: menilai D-shaped septum", wbw: "Di SAX mid saya nilai ada tidaknya D-shaped septum.", poin: 2 },
    { dt: "A4C: ukuran ruang, CW mitral (mean PG, PHT), regurgitasi MR/TR, LAVI", wbw: "Di apikal empat ruang, pasang color dan CW di katup mitral untuk mean gradient dan pressure half time, nilai MR dan TR, serta mengukur LAVI.", poin: 2 },
    { dt: "Menyebut MVA 0,9 cm², mean PG 12 mmHg, PHT 240 ms", wbw: "MVA 0,9 sentimeter persegi, mean gradient 12 mmHg, PHT 240 milidetik.", poin: 2 },
    { dt: "Kesimpulan: mitral stenosis berat", wbw: "Sehingga ini mitral stenosis berat.", poin: 2, kritis: true },
    { dt: "Menghitung Wilkins score = 7 (komponen mobilitas, penebalan, kalsifikasi, subvalvular)", wbw: "Wilkins score: mobilitas 2, penebalan 2, kalsifikasi 1, subvalvular 2, total 7.", poin: 2 },
    { dt: "Rencana PMC dengan alasan (Wilkins ≤8, MR trivial, tanpa trombus LA)", wbw: "Karena skor ≤8, MR trivial, dan tidak ada trombus atrium kiri, pasien kandidat PMC.", poin: 2, kritis: true },
    { dt: "Menyebut indikasi MVR (Wilkins >8, MR ≥ sedang, trombus LA)", wbw: "MVR dipilih bila Wilkins lebih dari 8, MR sedang sampai berat, atau ada trombus atrium kiri.", poin: 2 },
    { dt: "Edukasi diagnosis & penyebab dengan bahasa awam", wbw: "Katup jantung ibu menyempit berat akibat demam rematik, itu yang membuat ibu sesak dan berdebar.", poin: 2 },
    { dt: "Edukasi prosedur PMC, risiko, dan alternatif operasi", wbw: "Katup dilebarkan dengan balon lewat kateter dari paha tanpa bedah; risiko kebocoran katup, stroke, perdarahan; bila gagal, operasi ganti katup.", poin: 2 },
    { dt: "Edukasi obat, profilaksis rematik, kontrol rutin, dan memberi kesempatan bertanya", wbw: "Minum obat teratur, profilaksis antibiotik, kontrol rutin. Apakah ada yang ingin ditanyakan?", poin: 2 },
  ],
  readingTimeSeconds: 120,
  timeLimitSeconds: 420,
};
