import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ClipboardList, Stethoscope, Calculator, Pill, ShieldAlert, Target, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Preview soal station Echo - HOCM (statis, dari materi yang diupload).
 * Menampilkan tampilan peserta + panel admin (kunci jawaban, daftar tilik, properti).
 */

const SCENARIO = `Ny. S, 27 thn, dikonsulkan dari Departemen Onkologi dengan sesak nafas dan bengkak kedua tungkai sejak 3 bulan. Riwayat kanker payudara kiri, telah selesai radioterapi 2 tahun lalu.

Anda adalah dokter jaga kardiologi yang menerima konsul.`;

const INSTRUCTIONS = [
  "Interpretasikan hasil pemeriksaan",
  "Sebutkan diagnosis dan diagnosis bandingnya",
  "Bagaimana membedakan keduanya?",
  "Sebutkan tatalaksana",
  "Sampaikan jawaban konsul ke departemen pengirim",
];

// Tidak ada data tambahan yang ditulis di soal: peserta harus melihat laptop / meminta ke penguji.
const ECHO_DATA: string[] = ["Hasil pemeriksaan tersedia di laptop / dapat diminta ke penguji."];

const CALC_PARAMS = [
  { label: "EKG", value: "Low voltage QRS, sinus takikardia, T inversi difus" },
  { label: "Foto toraks", value: "Kalsifikasi perikard, efusi pleura bilateral, CTR normal" },
  { label: "Echo 2D/M-mode", value: "Septal bounce, perikard menebal/hiperekoik, LV ukuran & EF normal, biatrial ringan" },
  { label: "Doppler", value: "Variasi respirasi mitral inflow E >25%, annulus reversus (e' medial > lateral, e' medial ≥8 cm/s), hepatic vein expiratory diastolic flow reversal" },
  { label: "IVC", value: "Dilatasi, kolaps <50% (plethora)" },
];

const FULL_ANSWER: { heading: string; text: string }[] = [
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
];

const estimateSpeakSeconds = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / 130) * 60));
};

const PROPERTIES = [
  "Laptop berisi EKG (low voltage), foto toraks (kalsifikasi perikard), video/gambar echo (septal bounce, M-mode, Doppler mitral inflow, TDI medial & lateral, vena hepatika, IVC)",
  "Lembar konsul dari Departemen Onkologi",
  "Penguji berperan sebagai dokter departemen pengirim (onkologi)",
  "Data vital tersedia di penguji bila diminta",
];

interface Tilik {
  dt: string;
  wbw: string;
  poin: number;
  kritis?: boolean;
}

const TILIK: Tilik[] = [
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
];

const RISK_FACTORS = [
  "Konstriktif: septal bounce (+), variasi respirasi >25%, e' medial normal/↑ (annulus reversus), perikard menebal/kalsifikasi",
  "Restriktif: tidak ada variasi respirasi, e' ↓ (<7 cm/s), perikard normal, LV dinding bisa menebal, atrium sangat dilatasi",
  "Kateterisasi: konstriktif → discordance LV-RV (interdependence); restriktif → concordance",
];

const DRAFT = {
  title: "Konsul Antar Departemen — Constrictive Pericarditis Post Radioterapi (Ny. S, 27 th)",
  exam_mode: "oral_board",
  reading_time_seconds: 120,
  time_limit_seconds: 420,
  initial_prompt: SCENARIO,
  questions_text: INSTRUCTIONS.map((q, i) => `${i + 1}. ${q}`).join("\n"),
  answer_key_text: FULL_ANSWER.map((a) => a.text).join("\n"),
  properties: PROPERTIES,
  items: TILIK.map((t) => ({ answer: t.wbw, text: t.dt, points: t.poin, isCritical: !!t.kritis })),
};

export default function ConstrictivePreview() {
  const [showAdmin, setShowAdmin] = useState(true);
  const totalPoin = TILIK.reduce((s, t) => s + t.poin, 0);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);

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
        toast({ title: "Draft Konsul — Constrictive Pericarditis sudah ada di Pre-review" });
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
      toast({ title: "Masuk ke Pre-review", description: "Draft Constrictive Pericarditis siap diedit di halaman Pre-review." });
      navigate("/prereview");
    } catch (e: any) {
      toast({ title: "Gagal membuat draft", description: e?.message ?? "Terjadi kesalahan.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

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
          <h1 className="text-xl font-bold">Station Konsul Antar Departemen — Constrictive Pericarditis</h1>
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
            <CardTitle className="text-base">Informasi tambahan (ditampilkan ke peserta)</CardTitle>
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
                  <ShieldAlert className="h-4 w-4" /> Constrictive vs restrictive (kunci jawaban)
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
