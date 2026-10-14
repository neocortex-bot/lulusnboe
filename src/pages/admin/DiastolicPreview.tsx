import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ClipboardList, Stethoscope, Activity, Target, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Soal Station 2 — Pemeriksaan & interpretasi fungsi diastolik LV (ASE 2016).
 * Dari materi yang diupload. Membuka halaman ini langsung membuat draft di /prereview
 * (bila belum ada), lalu redirect ke Pre-review.
 */

const SCENARIO = `Seorang laki-laki 50 tahun datang kontrol ke poliklinik.

Riwayat penyakit sekarang: sesak nafas dirasakan jika beraktivitas berat. PND (-), orthopneu (-). Nyeri dada saat ini tidak ada.

Pasien dengan riwayat PCI 1 tahun lalu. Riwayat Hipertensi (+) rutin mengonsumsi obat, Riwayat Diabetes Mellitus (-), Riwayat merokok (-).

Echo: EF 45%.`;

const INSTRUCTIONS = [
  "Lakukan pemeriksaan echo fokus pada fungsi diastolik secara profesional",
  "Interpretasi hasil fungsi diastolik berdasarkan ASE 2016",
];

const ECHO_DATA = [
  "E/A: 0,9",
  "E/E': 16",
  "LAVI: 35 ml/m²",
  "TR vmax: tidak ada",
  "EF: 45%",
];

// Kunci jawaban lengkap: script utuh yang seharusnya diucapkan peserta,
// dari awal sampai selesai, mengcover semua daftar tilik secara berurutan.
const FULL_ANSWER: { heading: string; text: string }[] = [
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
];

const estimateSpeakSeconds = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / 130) * 60)); // ~130 kata/menit
};

const PROPERTIES = [
  "Mesin echo / probe + gel",
  "Elektroda EKG (3 sadapan)",
  "Data BB & TB pasien (dimasukkan ke mesin)",
  "Gambar/hasil echo: PW Doppler transmitral (E/A), TDI annulus mitral, LAVI, EF",
];

interface Tilik {
  dt: string;
  wbw: string;
  poin: number;
  kritis?: boolean;
}

const TILIK: Tilik[] = [
  // 1. Pemeriksaan profesional
  { dt: "Memperkenalkan diri, menyapa pasien, dan menjelaskan tujuan pemeriksaan", wbw: "Saya memperkenalkan diri dan menyapa pasien, menjelaskan tujuan pemeriksaan echo.", poin: 2 },
  { dt: "Memasang elektroda EKG untuk sinkronisasi gambar echo", wbw: "Saya memasang elektroda EKG pada dada pasien untuk sinkronisasi gambar.", poin: 2 },
  { dt: "Memasukkan data BB dan TB pasien ke mesin echo", wbw: "Memasukkan data berat badan serta tinggi badan pasien ke mesin echo untuk perhitungan indeks.", poin: 2 },
  // 2. Teknik pengukuran
  { dt: "Menyebutkan pengukuran aliran transmitral (PW Doppler: gelombang E dan A)", wbw: "Saya mengukur kecepatan aliran transmitral dengan pulse wave Doppler di ujung katup mitral untuk mendapatkan gelombang E dan A.", poin: 2 },
  { dt: "Menyebutkan tissue Doppler (TDI) annulus mitral untuk e' dan rasio E/e'", wbw: "Tissue Doppler imaging di annulus mitral septal dan lateral untuk mendapatkan e prime, lalu menghitung rasio E per e prime.", poin: 2 },
  { dt: "Menyebutkan pengukuran LAVI dan TR vmax", wbw: "Saya juga mengukur volume atrium kiri yang diindeks terhadap luas permukaan tubuh atau LAVI, dan mencari kecepatan maksimal regurgitasi trikuspid atau TR vmax.", poin: 2 },
  // 3. Interpretasi parameter
  { dt: "Menyebutkan E/A 0,9 (masih normal)", wbw: "E per A 0,9 yang masih dalam rentang normal.", poin: 2 },
  { dt: "Menyebutkan E/e' 16 (meningkat)", wbw: "E per e prime 16 yang meningkat.", poin: 2 },
  { dt: "Menyebutkan LAVI 35 ml/m² (membesar) dan TR vmax tidak terukur", wbw: "LAVI 35 mililiter per meter persegi yang membesar, dan TR vmax tidak terukur.", poin: 2 },
  // 4. Kesimpulan ASE 2016
  { dt: "Menyebutkan algoritma ASE 2016: ≥2 dari 4 kriteria abnormal → fungsi diastolik terganggu", wbw: "Berdasarkan algoritma ASE 2016, dari empat kriteria yaitu e prime, E per e prime, LAVI, dan TR vmax, terdapat lebih dari dua kriteria abnormal, sehingga fungsi diastolik terganggu.", poin: 2 },
  { dt: "Kesimpulan: disfungsi diastolik grade II (pseudonormal) dengan peningkatan LAP", wbw: "Ini sesuai disfungsi diastolik grade dua atau pola pseudonormal dengan peningkatan tekanan pengisian atrium kiri atau peningkatan LAP.", poin: 2, kritis: true },
  // 5. Kaitan klinis
  { dt: "Mengaitkan temuan dengan keluhan sesak aktivitas, riwayat hipertensi dan PCI, EF 45%", wbw: "Temuan ini sesuai dengan keluhan sesak saat aktivitas berat pada pasien dengan riwayat hipertensi dan riwayat PCI satu tahun lalu, dengan EF 45 persen.", poin: 2 },
];

// Draft yang dimasukkan ke /prereview.
const DRAFT = {
  title: "Echo — Fungsi Diastolik LV ASE 2016 (Tn. 50 th, post-PCI)",
  exam_mode: "oral_board",
  reading_time_seconds: 120,
  time_limit_seconds: 360,
  initial_prompt: `${SCENARIO}\n\nData echo (ditampilkan ke peserta):\n${ECHO_DATA.map((d) => `- ${d}`).join("\n")}`,
  questions_text: INSTRUCTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n"),
  answer_key_text: FULL_ANSWER.map((a) => a.text).join("\n"),
  properties: PROPERTIES,
  items: TILIK.map((t) => ({ answer: t.wbw, text: t.dt, points: t.poin, isCritical: !!t.kritis })),
};

export default function DiastolicPreview() {
  const [showAdmin, setShowAdmin] = useState(true);
  const totalPoin = TILIK.reduce((s, t) => s + t.poin, 0);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const autoRan = useRef(false);

  const importToPrereview = async () => {
    if (importing) return;
    setImporting(true);
    try {
      // Cegah duplikat: kalau draft dengan judul sama sudah ada, langsung buka Pre-review.
      const { data: existing } = await supabase
        .from("clinical_cases")
        .select("id")
        .eq("status", "prereview")
        .eq("title", DRAFT.title)
        .limit(1);
      if (existing && existing.length > 0) {
        toast({ title: "Draft sudah ada di Pre-review" });
        navigate("/prereview");
        return;
      }
      const rubric = { enabled: true, items: DRAFT.items };
      const { data, error } = await supabase
        .from("clinical_cases")
        .insert({
          title: DRAFT.title,
          exam_mode: DRAFT.exam_mode,
          reading_time_seconds: DRAFT.reading_time_seconds,
          time_limit_seconds: DRAFT.time_limit_seconds,
          initial_prompt: DRAFT.initial_prompt,
          questions_text: DRAFT.questions_text,
          answer_key_text: DRAFT.answer_key_text,
          checklist_rubric: rubric,
          rubric_mode: "checklist",
          status: "prereview",
          source: "admin",
          created_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const { error: akErr } = await supabase
        .from("case_answer_keys")
        .upsert(
          { case_id: data.id, answer_key_text: DRAFT.answer_key_text, checklist_rubric: { ...rubric, properties: DRAFT.properties } as any },
          { onConflict: "case_id" },
        );
      if (akErr) throw akErr;
      toast({ title: "Masuk ke Pre-review", description: "Draft soal fungsi diastolik siap diedit di halaman Pre-review." });
      navigate("/prereview");
    } catch (e: any) {
      toast({ title: "Gagal membuat draft", description: e?.message ?? "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  // Langsung buat draft begitu halaman dibuka (sesuai permintaan: langsung masuk prereview).
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    importToPrereview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/prereview"><ArrowLeft className="mr-1 h-4 w-4" />Pre-review</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={importToPrereview} disabled={importing}>
              <Send className="mr-1 h-4 w-4" />
              {importing ? "Menyimpan..." : "Masukkan ke Pre-review"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAdmin((v) => !v)}>
              {showAdmin ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
              {showAdmin ? "Sembunyikan panel admin" : "Tampilkan panel admin"}
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold">Station 2 — Echo Fungsi Diastolik LV (ASE 2016)</h1>
          <p className="text-sm text-muted-foreground">
            Draft otomatis dibuat di Pre-review saat halaman ini dibuka. Mode: Oral Board.
          </p>
        </div>

        {/* ===== Tampilan peserta ===== */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" /> Anamnesis / skenario klinik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed">{SCENARIO}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Instruksi soal
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
                  <Activity className="h-4 w-4" /> Kunci interpretasi (ASE 2016)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  <li><span className="font-medium">E/A 0,9:</span> normal (0,8–2,0)</li>
                  <li><span className="font-medium">E/e' 16:</span> meningkat (abnormal &gt;14)</li>
                  <li><span className="font-medium">LAVI 35 ml/m²:</span> membesar (abnormal &gt;34)</li>
                  <li><span className="font-medium">TR vmax:</span> tidak terukur</li>
                  <li><span className="font-medium">Kesimpulan:</span> ≥2 dari 4 kriteria abnormal → disfungsi diastolik grade II (pseudonormal) dengan peningkatan LAP</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4" /> Properti soal (disiapkan penguji, tidak ditampilkan ke peserta)
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
                  <Target className="h-4 w-4" /> Kunci jawaban lengkap — word by word (dari awal sampai selesai)
                  <Badge variant="secondary" className="ml-auto">
                    ± {Math.round(FULL_ANSWER.reduce((s, a) => s + estimateSpeakSeconds(a.text), 0) / 60)} menit
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Script utuh yang seharusnya diucapkan peserta dari awal sampai selesai, mengcover semua daftar tilik secara berurutan (pace bicara normal ±130 kata/menit).
                </p>
                {FULL_ANSWER.map((a, i) => (
                  <div key={i} className="rounded-md border p-3 text-sm">
                    <p className="font-medium">{i + 1}. {a.heading}</p>
                    <p className="mt-1 text-muted-foreground italic">“{a.text}”</p>
                  </div>
                ))}
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
