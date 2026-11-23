import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Download, Loader2, Mic, Pencil, Plus } from "lucide-react";
import CaseForm from "@/components/admin/CaseForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { categoryBadgeClass, toCategoryLabel } from "@/lib/caseCategory";
import { importPreparationSeed, PREPARATION_MODE, startPreparationPractice } from "@/lib/persiapan";

type PrepCase = { id: string; title: string; category: string | null; questions_text: string };

const ALL = "__all__";

const Persiapan = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState(ALL);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ["preparation_cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_cases")
        .select("id, title, category, questions_text")
        .eq("exam_mode", PREPARATION_MODE)
        .eq("status", "published")
        .order("title");
      if (error) throw error;
      return (data ?? []) as PrepCase[];
    },
  });

  const divisions = useMemo(
    () => Array.from(new Set(cases.map((c) => c.category).filter(Boolean) as string[])).sort(),
    [cases],
  );
  const filtered = cases.filter((c) =>
    (division === ALL || c.category === division) &&
    c.title.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const start = async (caseId: string) => {
    setStartingId(caseId);
    try {
      const sessionId = await startPreparationPractice(caseId);
      navigate(`/exam/${sessionId}`);
    } catch (err) {
      console.error(err);
      toast.error("Gagal memulai ujian persiapan. Coba lagi.");
      setStartingId(null);
    }
  };

  const runImport = async () => {
    if (!user) return;
    setImporting(true);
    try {
      const created = await importPreparationSeed(user.id);
      toast.success(created ? `${created} station persiapan ditambahkan` : "Semua station sudah ada");
      queryClient.invalidateQueries({ queryKey: ["preparation_cases"] });
      queryClient.invalidateQueries({ queryKey: ["clinical_cases"] });
    } catch (err) {
      console.error(err);
      toast.error("Impor station gagal.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-4 py-4 sm:px-6">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">Persiapan Skill Station</h1>
            <p className="text-sm text-muted-foreground">
              Lafalkan persiapan dari menyapa pasien sampai tepat sebelum prosedur. Baca 10 detik, jawab 60 detik.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isAdmin && <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" /> Tambah Soal Persiapan</Button>}
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={runImport} disabled={importing}>
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Impor 48 kartu PIKiR PADi
              </Button>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to={isAdmin ? "/admin" : "/exam"}><ArrowLeft className="h-4 w-4" /> Kembali</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input placeholder="Cari station…" value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
          <Select value={division} onValueChange={setDivision}>
            <SelectTrigger className="sm:w-56"><SelectValue placeholder="Semua divisi" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Semua divisi</SelectItem>
              {divisions.map((d) => <SelectItem key={d} value={d}>{toCategoryLabel(d)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : error ? (
          <p className="text-sm text-destructive">Daftar station gagal dimuat.</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            {cases.length === 0 ? "Belum ada station persiapan." : "Tidak ada station yang cocok."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead className="hidden sm:table-cell">Divisi</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="min-w-[12rem] font-medium">{c.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {c.category && <Badge variant="outline" className={categoryBadgeClass(c.category)}>{toCategoryLabel(c.category)}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {isAdmin && (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/admin/case/preview/${c.id}`}><Pencil className="h-4 w-4" /> <span className="hidden md:inline">Rubrik</span></Link>
                          </Button>
                        )}
                        <Button size="sm" onClick={() => start(c.id)} disabled={startingId !== null}>
                          {startingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />}
                          Mulai Ujian Persiapan
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Tambah Soal Persiapan</DialogTitle></DialogHeader>
          <CaseForm defaultExamMode={PREPARATION_MODE} categories={divisions} onClose={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Persiapan;
