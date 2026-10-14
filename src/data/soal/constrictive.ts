import type { SoalDraft } from "./types";

export const constrictive: SoalDraft = {
  slug: "constrictive",
  pageTitle: "Station Konsul Antar Departemen — Constrictive Pericarditis",
  draftTitle: "Konsul Antar Departemen — Constrictive Pericarditis Post Radioterapi (Ny. S, 27 th)",
  scenario: `Ny. S, 27 thn, dikonsulkan dari Departemen Onkologi dengan sesak nafas dan bengkak kedua tungkai sejak 3 bulan. Riwayat kanker payudara kiri, telah selesai radioterapi 2 tahun lalu.

Anda adalah dokter jaga kardiologi yang menerima konsul.`,
  instructions: [
    "Interpretasikan hasil pemeriksaan",
    "Sebutkan diagnosis dan diagnosis bandingnya",
    "Bagaimana membedakan keduanya?",
    "Sebutkan tatalaksana",
    "Sampaikan jawaban konsul ke departemen pengirim",
  ],
  examDataTitle: "Informasi tambahan (ditampilkan ke peserta)",
  examData: ["Hasil pemeriksaan tersedia di laptop / dapat diminta ke penguji."],
  keySections: [
    {
      title: "Kunci temuan pemeriksaan (kunci jawaban)",
      items: [
        { label: "EKG", value: "Low voltage QRS, sinus takikardia, T inversi difus" },
        { label: "Foto toraks", value: "Kalsifikasi perikard, efusi pleura bilateral, CTR normal" },
        { label: "Echo 2D/M-mode", value: "Septal bounce, perikard menebal/hiperekoik, LV ukuran & EF normal, biatrial ringan" },
        { label: "Doppler", value: "Variasi respirasi mitral inflow E >25%, annulus reversus (e' medial > lateral, e' medial ≥8 cm/s), hepatic vein expiratory diastolic flow reversal" },
        { label: "IVC", value: "Dilatasi, kolaps <50% (plethora)" },
      ],
    },
    {
      title: "Constrictive vs restrictive (kunci jawaban)",
      items: [
        "Konstriktif: septal bounce (+), variasi respirasi >25%, e' medial normal/↑ (annulus reversus), perikard menebal/kalsifikasi",
        "Restriktif: tidak ada variasi respirasi, e' ↓ (<7 cm/s), perikard normal, LV dinding bisa menebal, atrium sangat dilatasi",
        "Kateterisasi: konstriktif → discordance LV-RV (interdependence); restriktif → concordance",
      ],
    },
  ],
  properties: [
    "Laptop berisi EKG (low voltage), foto toraks (kalsifikasi perikard), video/gambar echo (septal bounce, M-mode, Doppler mitral inflow, TDI medial & lateral, vena hepatika, IVC)",
    "Lembar konsul dari Departemen Onkologi",
    "Penguji berperan sebagai dokter departemen pengirim (onkologi)",
    "Data vital tersedia di penguji bila diminta",
  ],
  fullAnswer: [
    {
      heading: "Interpretasi pemeriksaan",
      text: "Dari EKG didapatkan low voltage QRS. Foto toraks menunjukkan kalsifikasi perikard dengan efusi pleura. Pada echo terdapat perikard yang menebal, septal bounce, variasi respirasi aliran mitral lebih dari 25 persen, annulus reversus yaitu e' medial lebih tinggi dari lateral, aliran balik diastolik vena hepatika saat ekspirasi, serta IVC yang melebar tanpa kolaps. Fungsi sistolik ventrikel kiri normal.",
    },
    {
      heading: "Diagnosis & diagnosis banding",
      text: "Diagnosis saya adalah perikarditis konstriktif akibat radiasi. Diagnosis bandingnya kardiomiopati restriktif.",
    },
    {
      heading: "Membedakan konstriktif vs restriktif",
      text: "Pada konstriktif ada variasi respirasi dan septal bounce, e' medial normal atau meningkat dengan annulus reversus, dan perikard menebal. Pada restriktif tidak ada variasi respirasi, e' menurun, perikard normal. Bila ragu bisa dilakukan CT atau MRI jantung dan kateterisasi untuk melihat ventricular interdependence.",
    },
    {
      heading: "Tatalaksana",
      text: "Untuk gejala kongesti diberikan diuretik dengan hati-hati dan restriksi garam. Terapi definitifnya adalah perikardiektomi.",
    },
    {
      heading: "Jawaban konsul",
      text: "Terima kasih atas konsulnya. Pasien kami diagnosis perikarditis konstriktif pasca radiasi. Kami rawat bersama, kami berikan diuretik dan akan kami rujuk ke bedah toraks kardiovaskular untuk perikardiektomi. Terapi onkologi dapat dilanjutkan sesuai indikasi.",
    },
  ],
  tilik: [
    { dt: "Menyebutkan EKG low voltage", wbw: "Dari EKG didapatkan low voltage QRS.", poin: 2 },
    { dt: "Menyebutkan kalsifikasi perikard pada foto toraks", wbw: "Foto toraks menunjukkan kalsifikasi perikard dengan efusi pleura.", poin: 2 },
    { dt: "Menyebutkan perikard menebal dan septal bounce", wbw: "Pada echo terdapat perikard yang menebal dan septal bounce.", poin: 2 },
    { dt: "Menyebutkan variasi respirasi mitral inflow >25%", wbw: "Variasi respirasi aliran mitral lebih dari 25 persen.", poin: 2 },
    { dt: "Menyebutkan annulus reversus (e' medial > lateral)", wbw: "Annulus reversus yaitu e' medial lebih tinggi dari lateral.", poin: 2 },
    { dt: "Menyebutkan hepatic vein expiratory flow reversal / IVC plethora", wbw: "Aliran balik diastolik vena hepatika saat ekspirasi, serta IVC melebar tanpa kolaps.", poin: 2 },
    { dt: "Diagnosis: perikarditis konstriktif (pasca radiasi)", wbw: "Diagnosis saya adalah perikarditis konstriktif akibat radiasi.", poin: 2, kritis: true },
    { dt: "Diagnosis banding: kardiomiopati restriktif", wbw: "Diagnosis bandingnya kardiomiopati restriktif.", poin: 2 },
    { dt: "Pembeda: variasi respirasi & septal bounce hanya pada konstriktif", wbw: "Pada konstriktif ada variasi respirasi dan septal bounce, pada restriktif tidak ada.", poin: 2 },
    { dt: "Pembeda: e' normal/annulus reversus vs e' menurun pada restriktif", wbw: "E' medial normal dengan annulus reversus, sedangkan restriktif e' menurun.", poin: 2 },
    { dt: "Menyebut pemeriksaan lanjutan: CT/MRI jantung atau kateterisasi", wbw: "Bila ragu bisa dilakukan CT atau MRI jantung dan kateterisasi.", poin: 2 },
    { dt: "Terapi simptomatik: diuretik hati-hati + restriksi garam", wbw: "Untuk kongesti diberikan diuretik dengan hati-hati dan restriksi garam.", poin: 2 },
    { dt: "Terapi definitif: perikardiektomi", wbw: "Terapi definitifnya adalah perikardiektomi.", poin: 2, kritis: true },
    { dt: "Jawaban konsul: menyampaikan diagnosis & rawat bersama", wbw: "Terima kasih atas konsulnya, pasien kami diagnosis perikarditis konstriktif pasca radiasi, kami rawat bersama.", poin: 2 },
    { dt: "Jawaban konsul: rujuk bedah toraks kardiovaskular", wbw: "Akan kami rujuk ke bedah toraks kardiovaskular untuk perikardiektomi.", poin: 2 },
  ],
  readingTimeSeconds: 120,
  timeLimitSeconds: 420,
};
