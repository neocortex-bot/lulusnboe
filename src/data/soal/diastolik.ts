import type { SoalDraft } from "./types";

export const diastolik: SoalDraft = {
  slug: "diastolik",
  pageTitle: "Station 2 — Echo Fungsi Diastolik LV (ASE 2016)",
  draftTitle: "Echo — Fungsi Diastolik LV ASE 2016 (Tn. 50 th, post-PCI)",
  scenario: `Seorang laki-laki 50 tahun datang kontrol ke poliklinik.

Riwayat penyakit sekarang: sesak nafas dirasakan jika beraktivitas berat. PND (-), orthopneu (-). Nyeri dada saat ini tidak ada.

Pasien dengan riwayat PCI 1 tahun lalu. Riwayat Hipertensi (+) rutin mengonsumsi obat, Riwayat Diabetes Mellitus (-), Riwayat merokok (-).

Echo: EF 45%.`,
  instructions: [
    "Lakukan pemeriksaan echo fokus pada fungsi diastolik secara profesional",
    "Interpretasi hasil fungsi diastolik berdasarkan ASE 2016",
  ],
  examDataTitle: "Data echo (ditampilkan ke peserta)",
  examData: ["E/A: 0,9", "E/E': 16", "LAVI: 35 ml/m²", "TR vmax: tidak ada", "EF: 45%"],
  keySections: [
    {
      title: "Kunci interpretasi (ASE 2016)",
      items: [
        { label: "E/A 0,9", value: "normal (0,8–2,0)" },
        { label: "E/e' 16", value: "meningkat (abnormal >14)" },
        { label: "LAVI 35 ml/m²", value: "membesar (abnormal >34)" },
        { label: "TR vmax", value: "tidak terukur" },
        { label: "Kesimpulan", value: "≥2 dari 4 kriteria abnormal → disfungsi diastolik grade II (pseudonormal) dengan peningkatan LAP" },
      ],
    },
  ],
  properties: [
    "Mesin echo / probe + gel",
    "Elektroda EKG (3 sadapan)",
    "Data BB & TB pasien (dimasukkan ke mesin)",
    "Gambar/hasil echo: PW Doppler transmitral (E/A), TDI annulus mitral, LAVI, EF",
  ],
  fullAnswer: [
    {
      heading: "Persiapan pemeriksaan yang profesional",
      text: "Sebelum memulai, saya memperkenalkan diri dan menyapa pasien, menjelaskan tujuan pemeriksaan echo. Saya memasang elektroda EKG pada dada pasien untuk sinkronisasi gambar, dan memasukkan data berat badan serta tinggi badan pasien ke mesin echo untuk perhitungan indeks.",
    },
    {
      heading: "Teknik pengukuran fungsi diastolik",
      text: "Saya mengukur kecepatan aliran transmitral dengan pulse wave Doppler di ujung katup mitral untuk mendapatkan gelombang E dan A. Kemudian tissue Doppler imaging di annulus mitral septal dan lateral untuk mendapatkan e prime, lalu menghitung rasio E per e prime. Saya juga mengukur volume atrium kiri yang diindeks terhadap luas permukaan tubuh atau LAVI, dan mencari kecepatan maksimal regurgitasi trikuspid atau TR vmax.",
    },
    {
      heading: "Interpretasi parameter",
      text: "Hasil yang didapat: E per A 0,9 yang masih dalam rentang normal, E per e prime 16 yang meningkat, LAVI 35 mililiter per meter persegi yang membesar, dan TR vmax tidak terukur.",
    },
    {
      heading: "Kesimpulan berdasarkan ASE 2016",
      text: "Berdasarkan algoritma ASE 2016, dari empat kriteria yaitu e prime, E per e prime, LAVI, dan TR vmax, terdapat lebih dari dua kriteria abnormal, sehingga fungsi diastolik terganggu. Dengan E per A 0,9 dan E per e prime 16, ini sesuai disfungsi diastolik grade dua atau pola pseudonormal dengan peningkatan tekanan pengisian atrium kiri atau peningkatan LAP.",
    },
    {
      heading: "Kaitan klinis",
      text: "Temuan ini sesuai dengan keluhan sesak saat aktivitas berat pada pasien dengan riwayat hipertensi dan riwayat PCI satu tahun lalu, dengan fungsi sistolik yang sedikit menurun, EF 45 persen.",
    },
  ],
  tilik: [
    { dt: "Memperkenalkan diri, menyapa pasien, dan menjelaskan tujuan pemeriksaan", wbw: "Saya memperkenalkan diri dan menyapa pasien, menjelaskan tujuan pemeriksaan echo.", poin: 2 },
    { dt: "Memasang elektroda EKG untuk sinkronisasi gambar echo", wbw: "Saya memasang elektroda EKG pada dada pasien untuk sinkronisasi gambar.", poin: 2 },
    { dt: "Memasukkan data BB dan TB pasien ke mesin echo", wbw: "Memasukkan data berat badan serta tinggi badan pasien ke mesin echo untuk perhitungan indeks.", poin: 2 },
    { dt: "Menyebutkan pengukuran aliran transmitral (PW Doppler: gelombang E dan A)", wbw: "Saya mengukur kecepatan aliran transmitral dengan pulse wave Doppler di ujung katup mitral untuk mendapatkan gelombang E dan A.", poin: 2 },
    { dt: "Menyebutkan tissue Doppler (TDI) annulus mitral untuk e' dan rasio E/e'", wbw: "Tissue Doppler imaging di annulus mitral septal dan lateral untuk mendapatkan e prime, lalu menghitung rasio E per e prime.", poin: 2 },
    { dt: "Menyebutkan pengukuran LAVI dan TR vmax", wbw: "Saya juga mengukur volume atrium kiri yang diindeks terhadap luas permukaan tubuh atau LAVI, dan mencari kecepatan maksimal regurgitasi trikuspid atau TR vmax.", poin: 2 },
    { dt: "Menyebutkan E/A 0,9 (masih normal)", wbw: "E per A 0,9 yang masih dalam rentang normal.", poin: 2 },
    { dt: "Menyebutkan E/e' 16 (meningkat)", wbw: "E per e prime 16 yang meningkat.", poin: 2 },
    { dt: "Menyebutkan LAVI 35 ml/m² (membesar) dan TR vmax tidak terukur", wbw: "LAVI 35 mililiter per meter persegi yang membesar, dan TR vmax tidak terukur.", poin: 2 },
    { dt: "Menyebutkan algoritma ASE 2016: ≥2 dari 4 kriteria abnormal → fungsi diastolik terganggu", wbw: "Berdasarkan algoritma ASE 2016, dari empat kriteria yaitu e prime, E per e prime, LAVI, dan TR vmax, terdapat lebih dari dua kriteria abnormal, sehingga fungsi diastolik terganggu.", poin: 2 },
    { dt: "Kesimpulan: disfungsi diastolik grade II (pseudonormal) dengan peningkatan LAP", wbw: "Ini sesuai disfungsi diastolik grade dua atau pola pseudonormal dengan peningkatan tekanan pengisian atrium kiri atau peningkatan LAP.", poin: 2, kritis: true },
    { dt: "Mengaitkan temuan dengan keluhan sesak aktivitas, riwayat hipertensi dan PCI, EF 45%", wbw: "Temuan ini sesuai dengan keluhan sesak saat aktivitas berat pada pasien dengan riwayat hipertensi dan riwayat PCI satu tahun lalu, dengan EF 45 persen.", poin: 2 },
  ],
  readingTimeSeconds: 120,
  timeLimitSeconds: 360,
};
