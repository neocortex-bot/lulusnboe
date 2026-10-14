import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Trash2, Wand2, Send, Save } from "lucide-react";

// Pre-review cases live in clinical_cases with status = "prereview".
// They are never deployable (deploy only reads status = "published").
export const PREREVIEW_STATUS = "prereview";

interface ChecklistItem {
  answer: string; // the exact sentence the candidate should say
  text: string; // the checklist criterion
  points: number; // 1-2
  isCritical: boolean;
}

interface DraftCase {
  id?: string;
  title: string;
  exam_mode: string;
  reading_time_seconds: number;
  time_limit_seconds: number;
  initial_prompt: string;
  questions_text: string;
  answer_key_text: string;
  items: ChecklistItem[];
  updated_at?: string;
}

const emptyDraft = (): DraftCase => ({
  title: "",
  exam_mode: "oral_board",
  reading_time_seconds: 120,
  time_limit_seconds: 360,
  initial_prompt: "",
  questions_text: "",
  answer_key_text: "",
  items: [],
});

const splitSentences = (text: string) =>
  text
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter((s) => s.length > 3);

const validate = (d: DraftCase): string[] => {
  const errs: string[] = [];
  if (d.title.trim().length < 5) errs.push("Judul soal minimal 5 karakter.");
  if (!d.initial_prompt.trim()) errs.push("Skenario kasus belum diisi.");
  if (!d.questions_text.trim()) errs.push("Pertanyaan belum diisi.");
  if (!d.answer_key_text.trim()) errs.push("Jawaban kata per kata belum diisi.");
  if (d.items.length === 0) errs.push("Daftar tilik masih kosong.");
  d.items.forEach((it, i) => {
    if (!it.text.trim()) errs.push(`Butir ${i + 1}: kriteria daftar tilik kosong.`);
    if (!it.answer.trim()) errs.push(`Butir ${i + 1}: kalimat jawaban kosong.`);
  });
  const texts = d.items.map((i) => i.text.trim().toLowerCase()).filter(Boolean);
  if (new Set(texts).size !== texts.length) errs.push("Ada butir daftar tilik yang duplikat.");
  return errs;
};

const PreReview = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<DraftCase | null>(null);

  const { data: drafts = [], isLoading } = useQuery({
    queryKey: ["prereview_cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_cases")
        .select("*")
        .eq("status", PREREVIEW_STATUS)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((c: any): DraftCase => {
        const raw = c.checklist_rubric;
        const items = Array.isArray(raw?.items) ? raw.items : Array.isArray(raw) ? raw : [];
        return {
          id: c.id,
          title: c.title,
          exam_mode: c.exam_mode,
          reading_time_seconds: c.reading_time_seconds ?? 120,
          time_limit_seconds: c.time_limit_seconds ?? 360,
          initial_prompt: c.initial_prompt ?? "",
          questions_text: c.questions_text ?? "",
          answer_key_text: c.answer_key_text ?? "",
          updated_at: c.updated_at,
          items: items.map((it: any) => ({
            answer: it.answer ?? "",
            text: it.text ?? "",
            points: Math.min(2, Math.max(1, Number(it.points) || 2)),
            isCritical: !!it.isCritical,
          })),
        };
      });
    },
  });

  const save = async (d: DraftCase, publish: boolean) => {
    const rubric = { enabled: true, items: d.items };
    const payload: any = {
      title: d.title.trim(),
      exam_mode: d.exam_mode,
      reading_time_seconds: d.reading_time_seconds,
      time_limit_seconds: d.time_limit_seconds,
      initial_prompt: d.initial_prompt,
      questions_text: d.questions_text,
      answer_key_text: d.answer_key_text,
      checklist_rubric: rubric,
      rubric_mode: d.items.length > 0 ? "checklist" : "none",
      status: publish ? "published" : PREREVIEW_STATUS,
      source: "admin",
    };
    if (publish) {
      payload.reviewed_by = user?.id ?? null;
      payload.reviewed_at = new Date().toISOString();
    }
    let id = d.id;
    if (id) {
      const { error } = await supabase.from("clinical_cases").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("clinical_cases")
        .insert({ ...payload, created_by: user?.id ?? null })
        .select("id")
        .single();
      if (error) throw error;
      id = data.id;
    }
    const { error: akErr } = await supabase
      .from("case_answer_keys")
      .upsert({ case_id: id, answer_key_text: d.answer_key_text, checklist_rubric: rubric as any }, { onConflict: "case_id" });
    if (akErr) throw akErr;
    return id!;
  };

  const saveMut = useMutation({
    mutationFn: async ({ d, publish }: { d: DraftCase; publish: boolean }) => {
      if (publish) {
        const errs = validate(d);
        if (errs.length) throw new Error(errs.join("\n"));
      } else if (!d.title.trim()) {
        throw new Error("Isi judul soal dulu sebelum menyimpan.");
      }
      const id = await save(d, publish);
      return { id, publish };
    },
    onSuccess: ({ id, publish }, { d }) => {
      qc.invalidateQueries({ queryKey: ["prereview_cases"] });
      qc.invalidateQueries({ queryKey: ["clinical_cases"] });
      if (publish) {
        toast({ title: "Soal di-ingest", description: "Soal sudah masuk ke daftar Clinical Cases dan siap di-deploy." });
        setEditing(null);
      } else {
        toast({ title: "Draft tersimpan" });
        setEditing({ ...d, id });
      }
    },
    onError: (e: Error) => toast({ title: "Belum bisa disimpan", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinical_cases").delete().eq("id", id).eq("status", PREREVIEW_STATUS);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prereview_cases"] });
      toast({ title: "Draft dihapus" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalPoints = (d: DraftCase) => d.items.reduce((s, i) => s + i.points, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="icon" title="Kembali ke admin">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">Pre-review Soal</h1>
              <p className="text-sm text-muted-foreground">
                Susun soal, jawaban kata per kata, dan daftar tilik sebelum di-ingest.
              </p>
            </div>
          </div>
          <Button onClick={() => setEditing(emptyDraft())}>
            <Plus className="h-4 w-4 mr-2" /> Soal Baru
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle>Belum di-ingest ({drafts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Memuat...</p>
            ) : drafts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Belum ada draft. Klik "Soal Baru" untuk mulai.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Butir Tilik</TableHead>
                    <TableHead>Total Poin</TableHead>
                    <TableHead>Kelengkapan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drafts.map((d) => {
                    const errs = validate(d);
                    return (
                      <TableRow key={d.id} className="cursor-pointer" onClick={() => setEditing(d)}>
                        <TableCell className="font-medium">{d.title}</TableCell>
                        <TableCell>{d.exam_mode === "panel_exam" ? "Panel" : "Oral Board"}</TableCell>
                        <TableCell>{d.items.length}</TableCell>
                        <TableCell>{totalPoints(d)}</TableCell>
                        <TableCell>
                          {errs.length === 0 ? (
                            <Badge>Siap ingest</Badge>
                          ) : (
                            <Badge variant="outline">{errs.length} perlu dilengkapi</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus draft"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (d.id && confirm(`Hapus draft "${d.title}"?`)) deleteMut.mutate(d.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Review Soal" : "Soal Baru"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <DraftEditor
              key={editing.id ?? "new"}
              initial={editing}
              busy={saveMut.isPending}
              onSave={(d) => saveMut.mutate({ d, publish: false })}
              onIngest={(d) => {
                if (confirm("Soal sudah yakin dan beres? Soal akan di-ingest dan siap di-deploy.")) {
                  saveMut.mutate({ d, publish: true });
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface EditorProps {
  initial: DraftCase;
  busy: boolean;
  onSave: (d: DraftCase) => void;
  onIngest: (d: DraftCase) => void;
}

const DraftEditor = ({ initial, busy, onSave, onIngest }: EditorProps) => {
  const [d, setD] = useState<DraftCase>(initial);
  const set = <K extends keyof DraftCase>(k: K, v: DraftCase[K]) => setD((p) => ({ ...p, [k]: v }));
  const setItem = (i: number, patch: Partial<ChecklistItem>) =>
    setD((p) => ({ ...p, items: p.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) }));

  const generateFromAnswer = () => {
    const sentences = splitSentences(d.answer_key_text);
    if (sentences.length === 0) return;
    if (d.items.length > 0 && !confirm("Ganti daftar tilik dengan butir baru dari setiap kalimat jawaban?")) return;
    set(
      "items",
      sentences.map((s) => ({ answer: s, text: s, points: 2, isCritical: false })),
    );
  };

  const errs = validate(d);
  const total = d.items.reduce((s, i) => s + i.points, 0);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="soal">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="soal">1. Soal</TabsTrigger>
          <TabsTrigger value="jawaban">2. Jawaban Kata per Kata</TabsTrigger>
          <TabsTrigger value="tilik">3. Daftar Tilik ({d.items.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="soal" className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Judul</Label>
            <Input value={d.title} onChange={(e) => set("title", e.target.value)} placeholder="Topik — Skenario (Inisial, umur th)" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={d.exam_mode} onValueChange={(v) => set("exam_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oral_board">Oral Board</SelectItem>
                  <SelectItem value="panel_exam">Panel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Waktu baca (detik)</Label>
              <Input type="number" min={0} value={d.reading_time_seconds} onChange={(e) => set("reading_time_seconds", Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Waktu jawab (detik)</Label>
              <Input type="number" min={30} value={d.time_limit_seconds} onChange={(e) => set("time_limit_seconds", Number(e.target.value))} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Skenario kasus</Label>
            <Textarea rows={8} value={d.initial_prompt} onChange={(e) => set("initial_prompt", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pertanyaan (singkat & padat, bernomor)</Label>
            <Textarea rows={6} value={d.questions_text} onChange={(e) => set("questions_text", e.target.value)} placeholder={"1. ...\n2. ..."} />
          </div>
        </TabsContent>

        <TabsContent value="jawaban" className="space-y-3 pt-2">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Pertanyaan</Label>
              <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap min-h-[300px]">
                {d.questions_text || <span className="text-muted-foreground">Belum ada pertanyaan.</span>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Jawaban yang semestinya diucapkan peserta (satu kalimat per baris)</Label>
              <Textarea rows={14} value={d.answer_key_text} onChange={(e) => set("answer_key_text", e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {d.answer_key_text.trim().split(/\s+/).filter(Boolean).length} kata · sekitar{" "}
                {Math.ceil(d.answer_key_text.trim().split(/\s+/).filter(Boolean).length / 130 * 60)} detik bicara
                (waktu jawab {d.time_limit_seconds} detik)
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tilik" className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              Setiap butir terikat ke satu kalimat jawaban. Lengkap = 2 poin, kurang lengkap = 1 poin. Total {total} poin.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={generateFromAnswer}>
                <Wand2 className="h-4 w-4 mr-2" /> Buat dari kalimat jawaban
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set("items", [...d.items, { answer: "", text: "", points: 2, isCritical: false }])}
              >
                <Plus className="h-4 w-4 mr-2" /> Tambah butir
              </Button>
            </div>
          </div>
          {d.items.length === 0 && (
            <p className="text-center text-muted-foreground py-6">Belum ada butir daftar tilik.</p>
          )}
          {d.items.map((it, i) => (
            <div key={i} className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Butir {i + 1}</span>
                <div className="flex items-center gap-3">
                  <Select value={String(it.points)} onValueChange={(v) => setItem(i, { points: Number(v) })}>
                    <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Maks 1 poin</SelectItem>
                      <SelectItem value="2">Maks 2 poin</SelectItem>
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={it.isCritical} onCheckedChange={(v) => setItem(i, { isCritical: v })} /> Kritis
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => set("items", d.items.filter((_, idx) => idx !== i))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Kalimat jawaban (diucapkan peserta)</Label>
                  <Textarea rows={2} value={it.answer} onChange={(e) => setItem(i, { answer: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kriteria daftar tilik</Label>
                  <Textarea rows={2} value={it.text} onChange={(e) => setItem(i, { text: e.target.value })} />
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {errs.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <p className="font-medium mb-1">Belum siap ingest:</p>
          <ul className="list-disc pl-5 space-y-0.5">
            {errs.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 border-t pt-4">
        <Button variant="outline" disabled={busy} onClick={() => onSave(d)}>
          <Save className="h-4 w-4 mr-2" /> Simpan draft
        </Button>
        <Button disabled={busy || errs.length > 0} onClick={() => onIngest(d)}>
          <Send className="h-4 w-4 mr-2" /> Submit & Ingest
        </Button>
      </div>
    </div>
  );
};

export default PreReview;
