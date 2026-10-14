import type { SoalDraft } from "./types";

export const hocm: SoalDraft = {
  slug: "hocm",
  pageTitle: "Station Echo — HOCM",
  draftTitle: "Echo — HOCM (Tn. 40 th)",
  scenario: `Pasien laki-laki 40 thn datang dengan keluhan rasa tidak nyaman di dada. Riwayat syncope (+), ada kerabat yang meninggal usia 40an. Riwayat sesak nafas (+). Tidak ada riwayat HT.

Pemfis: murmur di LSB`,
  instructions: [
    "Interpretasikan hasil echo (hitung kalau perlu, ada kalkulator?)",
    "Sebutkan 2 diagnosa berdasarkan hasil echo",
    "Pilih tatalaksana berdasarkan diagnosis → pilih dari obat di meja (ada biso, verapamil, ramipril, isdn, furosemide)",
    "Apa saja pemeriksaan untuk stratifikasi risiko?",
    "Apa tujuan stratifikasi risiko pada HOCM",
  ],
  examDataTitle: "Data echo (ditampilkan ke peserta)",
  examData: [
    "LVH (IVSd 5.0 + PWd 1.9)",
    "EF 77%",
    "SAM (+)",
    "LV gradient ±35 mmHg (hitung sendiri)",
    "Dagger shaped (+) LVOTO, VTI Vel 4.6",
    "Ada jet Severe AR",
  ],
  keySections: [
    {
      title: "Kunci perhitungan (kunci jawaban)",
      items: [
        { label: "Peak MR velocity", value: "6.6 m/s" },
        { label: "Peak LVSP", value: "4(6.6²) + LAP (10 mmHg) = 184.24 mmHg" },
        { label: "SBP", value: "113 mmHg (ada data di penguji)" },
        { label: "LVOT gradient", value: "LVSP − SBP = 184.24 − 113 = 71.24 mmHg" },
      ],
    },
    {
      title: "Faktor risiko sudden death pada HCM (kunci jawaban)",
      items: [
        "Riwayat keluarga sudden death dari HCM (≤50 th, kerabat dekat)",
        "Massive LVH (ketebalan dinding ≥30 mm)",
        "Syncope yang tidak terjelaskan",
        "HCM dengan disfungsi sistolik LV (EF <50%)",
        "Aneurisma apikal LV",
        "LGE luas pada CMR (≥15% massa LV)",
        "NSVT pada ambulatory monitor",
        "Status genotipe positif",
      ],
    },
  ],
  properties: [
    "Kalkulator",
    "Obat di meja: bisoprolol, verapamil, ramipril, ISDN, furosemide",
    "Gambar echo: PLAX (SAM), M-mode, CW Doppler LVOT (dagger-shaped), jet AR",
    "Data penguji: SBP 113 mmHg",
  ],
  fullAnswer: [
    {
      heading: "Pembukaan & interpretasi echo",
      text: "Terdapat hipertrofi ventrikel kiri yang masif, IVSd 5.0 dan PWd 1.9. Ejection fraction 77 persen, fungsi sistolik baik bahkan hiperdinamis. Terlihat SAM atau systolic anterior motion dari katup mitral. Ada obstruksi jalur keluar ventrikel kiri atau LVOTO dengan gradien sekitar 35 mmHg, terlihat bentuk dagger-shaped pada continuous wave Doppler, dengan VTI velocity 4.6. Selain itu terlihat jet severe AR atau regurgitasi aorta berat.",
    },
    {
      heading: "Perhitungan gradien LVOT",
      text: "Bila saya hitung gradien LVOT-nya: peak MR velocity 6.6 meter per detik, sehingga LVSP sama dengan 4 kali 6.6 kuadrat tambah LAP 10 mmHg, sekitar 184 mmHg. Dikurangi SBP 113 mmHg, gradien LVOT sekitar 71 mmHg.",
    },
    {
      heading: "Diagnosa",
      text: "Diagnosa pertama adalah HOCM atau hypertrophic obstructive cardiomyopathy. Diagnosa kedua adalah severe aortic regurgitation atau regurgitasi aorta berat.",
    },
    {
      heading: "Tatalaksana",
      text: "Untuk tatalaksana HOCM saya pilih beta blocker yaitu bisoprolol, atau verapamil bila beta blocker tidak toleran. Ramipril, ISDN, dan furosemide tidak saya berikan karena vasodilator dan diuretik dapat memperberat obstruksi LVOT.",
    },
    {
      heading: "Pemeriksaan stratifikasi risiko",
      text: "Pemeriksaan stratifikasi risiko meliputi Holter monitor untuk mendeteksi NSVT, cardiac MRI untuk menilai late gadolinium enhancement atau fibrosis serta ketebalan dinding maksimal, juga exercise test untuk gradien provokasi, serta genotyping bila tersedia.",
    },
    {
      heading: "Tujuan stratifikasi risiko",
      text: "Tujuan stratifikasi risiko adalah untuk pertimbangan pemasangan ICD guna mencegah sudden cardiac death.",
    },
  ],
  tilik: [
    { dt: "Menyebutkan LVH / penebalan dinding LV (IVSd 5.0, PWd 1.9)", wbw: "Terdapat hipertrofi ventrikel kiri yang masif, IVSd 5.0 dan PWd 1.9.", poin: 2 },
    { dt: "Menyebutkan EF 77% (fungsi sistolik baik/hiperdinamis)", wbw: "Ejection fraction 77 persen, fungsi sistolik baik bahkan hiperdinamis.", poin: 2 },
    { dt: "Menyebutkan SAM (systolic anterior motion) katup mitral", wbw: "Terlihat SAM atau systolic anterior motion dari katup mitral.", poin: 2 },
    { dt: "Menyebutkan LVOTO dengan gradien ±35 mmHg / dagger-shaped CW Doppler", wbw: "Ada obstruksi jalur keluar LV dengan gradien sekitar 35 mmHg, bentuk dagger-shaped pada continuous wave Doppler, VTI velocity 4.6.", poin: 2 },
    { dt: "Menyebutkan adanya severe AR (aortic regurgitation)", wbw: "Selain itu terlihat jet severe AR atau regurgitasi aorta berat.", poin: 2 },
    { dt: "Menghitung LVOT gradient dari peak MR velocity (LVSP − SBP = 71 mmHg)", wbw: "Peak MR velocity 6.6 meter per detik, LVSP sama dengan 4 kali 6.6 kuadrat tambah LAP 10, sekitar 184 mmHg. Dikurangi SBP 113, gradien LVOT sekitar 71 mmHg.", poin: 2 },
    { dt: "Diagnosa 1: HOCM (hypertrophic obstructive cardiomyopathy)", wbw: "Diagnosa pertama adalah HOCM atau hypertrophic obstructive cardiomyopathy.", poin: 2, kritis: true },
    { dt: "Diagnosa 2: Severe AR / regurgitasi aorta berat", wbw: "Diagnosa kedua adalah severe aortic regurgitation.", poin: 2 },
    { dt: "Memilih beta blocker (bisoprolol) atau verapamil sebagai terapi utama HOCM", wbw: "Untuk HOCM saya pilih beta blocker yaitu bisoprolol, atau verapamil bila beta blocker tidak toleran.", poin: 2, kritis: true },
    { dt: "Menghindari/menyebut kontraindikasi: ACE inhibitor (ramipril), ISDN, diuretik berlebih (furosemide) karena memperberat obstruksi", wbw: "Ramipril, ISDN, dan furosemide tidak saya berikan karena vasodilator dan diuretik dapat memperberat obstruksi LVOT.", poin: 2 },
    { dt: "Menyebutkan Holter / ambulatory monitor (deteksi NSVT)", wbw: "Pemeriksaan stratifikasi risiko meliputi Holter monitor untuk mendeteksi NSVT.", poin: 2 },
    { dt: "Menyebutkan CMR (cardiac MRI) untuk LGE / fibrosis dan ketebalan dinding", wbw: "Cardiac MRI untuk menilai late gadolinium enhancement atau fibrosis dan ketebalan dinding maksimal.", poin: 2 },
    { dt: "Menyebutkan exercise test / TEE provokasi gradien dan genotyping", wbw: "Juga exercise test untuk gradien provokasi, serta genotyping bila tersedia.", poin: 2 },
    { dt: "Menyebutkan tujuan: pertimbangan pemasangan ICD (pencegahan sudden cardiac death)", wbw: "Tujuan stratifikasi risiko adalah untuk pertimbangan pemasangan ICD guna mencegah sudden cardiac death.", poin: 2, kritis: true },
  ],
  readingTimeSeconds: 120,
  timeLimitSeconds: 360,
};
