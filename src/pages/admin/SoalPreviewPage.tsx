import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, ClipboardList, Stethoscope, KeyRound, Package, Target, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SOAL_REGISTRY } from "@/data/soal";
import { importSoalToPrereview } from "@/lib/prereviewImport";

const estimateSpeakSeconds = (text: string) => {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round((words / 130) * 60)); // ~130 kata/menit
};

/**
 * Template generik preview soal. Membaca data dari src/data/soal/<slug>.ts
 * lewat route dinamis /preview-soal/:slug — soal baru tidak butuh halaman baru.
 */
export default function SoalPreviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const soal = slug ? SOAL_REGISTRY[slug] : undefined;
  const [showAdmin, setShowAdmin] = useState(true);
  const [importing, setImporting] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!soal) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/prereview"><ArrowLeft className="mr-1 h-4 w-4" />Pre-review</Link>
          </Button>
          <p className="text-sm text-muted-foreground">Soal dengan slug "{slug}" tidak ditemukan.</p>
        </div>
      </div>
    );
  }

  const totalPoin = soal.tilik.reduce((s, t) => s + t.poin, 0);

  const handleImport = async () => {
    if (importing) return;
    setImporting(true);
    try {
      await importSoalToPrereview(soal, { userId: user?.id, toast, navigate });
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
            <Button size="sm" onClick={handleImport} disabled={importing}>
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
          <h1 className="text-xl font-bold">{soal.pageTitle}</h1>
          <p className="text-sm text-muted-foreground">Preview soal (draft, belum di-ingest). Mode: Oral Board.</p>
        </div>

        {/* ===== Tampilan peserta ===== */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4" /> Skenario klinik
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-line text-sm leading-relaxed">{soal.scenario}</p>
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
              {soal.instructions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {soal.examData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{soal.examDataTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {soal.examData.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* ===== Panel admin ===== */}
        {showAdmin && (
          <>
            <Separator />
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Panel admin — tidak ditampilkan ke peserta
            </p>

            {soal.keySections?.map((sec, si) => (
              <Card key={si}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <KeyRound className="h-4 w-4" /> {sec.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {typeof sec.items[0] === "string" ? (
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {(sec.items as string[]).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {(sec.items as { label: string; value: string }[]).map((p, i) => (
                        <li key={i}>
                          <span className="font-medium">{p.label}:</span> {p.value}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" /> Properti soal (disiapkan penguji, tidak ditampilkan ke peserta)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {soal.properties.map((p, i) => (
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
                    ± {Math.round(soal.fullAnswer.reduce((s, a) => s + estimateSpeakSeconds(a.text), 0) / 60)} menit
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Script utuh yang seharusnya diucapkan peserta dari awal sampai selesai, mengcover semua daftar tilik secara berurutan (pace bicara normal ±130 kata/menit).
                </p>
                {soal.fullAnswer.map((a, i) => (
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
                {soal.tilik.map((t, i) => (
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
