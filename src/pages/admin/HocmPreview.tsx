import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ClipboardList, Stethoscope, Calculator, Pill, ShieldAlert, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Preview soal station Echo - HOCM (statis, dari materi yang diupload).
 * Menampilkan tampilan peserta + panel admin (kunci jawaban, daftar tilik, properti).
 */

const SCENARIO = `Pasien laki-laki 40 thn datang dengan keluhan rasa tidak nyaman di dada. Riwayat syncope (+), ada kerabat yang meninggal usia 40an. Riwayat sesak nafas (+). Tidak ada riwayat HT.

Pemfis: murmur di LSB`;

const INSTRUCTIONS = [
  "Interpretasikan hasil echo (hitung kalau perlu, ada kalkulator?)",
  "Sebutkan 2 diagnosa berdasarkan hasil echo",
  "Pilih tatalaksana berdasarkan diagnosis → pilih dari obat di meja (ada biso, verapamil, ramipril, isdn, furosemide)",
  "Apa saja pemeriksaan untuk stratifikasi risiko?",
  "Apa tujuan stratifikasi risiko pada HOCM",
];

const ECHO_DATA = [
  "LVH (IVSd 5.0 + PWd 1.9)",
  "EF 77%",
  "SAM (+)",
  "LV gradient ±35 mmHg (hitung sendiri)",
  "Dagger shaped (+) LVOTO, VTI Vel 4.6",
  "Ada jet Severe AR",
];

const CALC_PARAMS = [
  { label: "Peak MR velocity", value: "6.6 m/s" },
  { label: "Peak LVSP", value: "4(6.6²) + LAP (10 mmHg) = 184.24 mmHg" },
  { label: "SBP", value: "113 mmHg (ada data di penguji)" },
  { label: "LVOT gradient", value: "LVSP − SBP = 184.24 − 113 = 71.24 mmHg" },
];

// Kunci jawaban lengkap: script utuh yang seharusnya diucapkan peserta,
// dari awal sampai selesai, mengcover semua daftar tilik secara berurutan.
const FULL_ANSWER: { heading: string; text: string }[] = [
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
];

const estimateSpeakSeconds = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / 130) * 60)); // ~130 kata/menit
};

const PROPERTIES = [
  "Kalkulator",
  "Obat di meja: bisoprolol, verapamil, ramipril, ISDN, furosemide",
  "Gambar echo: PLAX (SAM), M-mode, CW Doppler LVOT (dagger-shaped), jet AR",
  "Data penguji: SBP 113 mmHg",
];

interface Tilik {
  dt: string;
  wbw: string;
  poin: number;
  kritis?: boolean;
}

const TILIK: Tilik[] = [
  // 1. Interpretasi echo
  { dt: "Menyebutkan LVH / penebalan dinding LV (IVSd 5.0, PWd 1.9)", wbw: "Terdapat hipertrofi ventrikel kiri yang masif, IVSd 5.0 dan PWd 1.9.", poin: 2 },
  { dt: "Menyebutkan EF 77% (fungsi sistolik baik/hiperdinamis)", wbw: "Ejection fraction 77 persen, fungsi sistolik baik bahkan hiperdinamis.", poin: 2 },
  { dt: "Menyebutkan SAM (systolic anterior motion) katup mitral", wbw: "Terlihat SAM atau systolic anterior motion dari katup mitral.", poin: 2 },
  { dt: "Menyebutkan LVOTO dengan gradien ±35 mmHg / dagger-shaped CW Doppler", wbw: "Ada obstruksi jalur keluar LV dengan gradien sekitar 35 mmHg, bentuk dagger-shaped pada continuous wave Doppler, VTI velocity 4.6.", poin: 2 },
  { dt: "Menyebutkan adanya severe AR (aortic regurgitation)", wbw: "Selain itu terlihat jet severe AR atau regurgitasi aorta berat.", poin: 2 },
  { dt: "Menghitung LVOT gradient dari peak MR velocity (LVSP − SBP = 71 mmHg)", wbw: "Peak MR velocity 6.6 meter per detik, LVSP sama dengan 4 kali 6.6 kuadrat tambah LAP 10, sekitar 184 mmHg. Dikurangi SBP 113, gradien LVOT sekitar 71 mmHg.", poin: 2 },
  // 2. Diagnosa
  { dt: "Diagnosa 1: HOCM (hypertrophic obstructive cardiomyopathy)", wbw: "Diagnosa pertama adalah HOCM atau hypertrophic obstructive cardiomyopathy.", poin: 2, kritis: true },
  { dt: "Diagnosa 2: Severe AR / regurgitasi aorta berat", wbw: "Diagnosa kedua adalah severe aortic regurgitation.", poin: 2 },
  // 3. Tatalaksana
  { dt: "Memilih beta blocker (bisoprolol) atau verapamil sebagai terapi utama HOCM", wbw: "Untuk HOCM saya pilih beta blocker yaitu bisoprolol, atau verapamil bila beta blocker tidak toleran.", poin: 2, kritis: true },
  { dt: "Menghindari/menyebut kontraindikasi: ACE inhibitor (ramipril), ISDN, diuretik berlebih (furosemide) karena memperberat obstruksi", wbw: "Ramipril, ISDN, dan furosemide tidak saya berikan karena vasodilator dan diuretik dapat memperberat obstruksi LVOT.", poin: 2 },
  // 4. Pemeriksaan stratifikasi risiko
  { dt: "Menyebutkan Holter / ambulatory monitor (deteksi NSVT)", wbw: "Pemeriksaan stratifikasi risiko meliputi Holter monitor untuk mendeteksi NSVT.", poin: 2 },
  { dt: "Menyebutkan CMR (cardiac MRI) untuk LGE / fibrosis dan ketebalan dinding", wbw: "Cardiac MRI untuk menilai late gadolinium enhancement atau fibrosis dan ketebalan dinding maksimal.", poin: 2 },
  { dt: "Menyebutkan exercise test / TEE provokasi gradien dan genotyping", wbw: "Juga exercise test untuk gradien provokasi, serta genotyping bila tersedia.", poin: 2 },
  // 5. Tujuan stratifikasi risiko
  { dt: "Menyebutkan tujuan: pertimbangan pemasangan ICD (pencegahan sudden cardiac death)", wbw: "Tujuan stratifikasi risiko adalah untuk pertimbangan pemasangan ICD guna mencegah sudden cardiac death.", poin: 2, kritis: true },
];

const RISK_FACTORS = [
  "Riwayat keluarga sudden death dari HCM (≤50 th, kerabat dekat)",
  "Massive LVH (ketebalan dinding ≥30 mm)",
  "Syncope yang tidak terjelaskan",
  "HCM dengan disfungsi sistolik LV (EF <50%)",
  "Aneurisma apikal LV",
  "LGE luas pada CMR (≥15% massa LV)",
  "NSVT pada ambulatory monitor",
  "Status genotipe positif",
];

export default function HocmPreview() {
  const [showAdmin, setShowAdmin] = useState(true);
  const totalPoin = TILIK.reduce((s, t) => s + t.poin, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/prereview"><ArrowLeft className="mr-1 h-4 w-4" />Pre-review</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAdmin((v) => !v)}>
            {showAdmin ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
            {showAdmin ? "Sembunyikan panel admin" : "Tampilkan panel admin"}
          </Button>
        </div>

        <div>
          <h1 className="text-xl font-bold">Station Echo — HOCM</h1>
          <p className="text-sm text-muted-foreground">
            Preview soal (draft, belum di-ingest). Mode: Oral Board.
          </p>
        </div>

        {/* ===== Tampilan peserta ===== */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" /> Skenario klinik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed">{SCENARIO}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Instruksi kandidat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1.5 pl-5 text-sm">
              {INSTRUCTIONS.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Data echo (ditampilkan ke peserta)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {ECHO_DATA.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* ===== Panel admin ===== */}
        {showAdmin && (
          <>
            <Separator />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Panel admin — tidak ditampilkan ke peserta
            </p>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="h-4 w-4" /> Kunci perhitungan (kunci jawaban)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {CALC_PARAMS.map((p, i) => (
                    <li key={i}>
                      <span className="font-medium">{p.label}:</span> {p.value}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ShieldAlert className="h-4 w-4" /> Faktor risiko sudden death pada HCM (kunci jawaban)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {RISK_FACTORS.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Pill className="h-4 w-4" /> Properti soal (disiapkan penguji, tidak ditampilkan ke peserta)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {PROPERTIES.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="h-4 w-4" /> Daftar tilik ⇄ Word by Word
                  <Badge variant="secondary" className="ml-auto">Total {totalPoin} poin</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {TILIK.map((t, i) => (
                  <div key={i} className="rounded-md border p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium">
                        {i + 1}. {t.dt}
                      </p>
                      <div className="flex shrink-0 gap-1">
                        <Badge variant="outline">{t.poin} poin</Badge>
                        {t.kritis && <Badge variant="destructive">Kritis</Badge>}
                      </div>
                    </div>
                    <p className="mt-1 text-muted-foreground">
                      <span className="italic">“{t.wbw}”</span>
                    </p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground">
                  Skor per tilik: lengkap = 2, kurang lengkap = 1, tidak disebut = 0. Penilaian AI bersifat generous — istilah/sinonim setara diterima.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
