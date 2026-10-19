import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { canEditCase } from "@/lib/casePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArchiveRestore, Trash2 } from "lucide-react";

export const ARCHIVED_STATUS = "archived";

interface ArchivedCase {
  id: string;
  title: string;
  exam_mode: string;
  category?: string | null;
  created_by?: string | null;
  updated_at?: string;
}

const ArchivePage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isMasterAdmin } = useAuth();
  const [caseToPurge, setCaseToPurge] = useState<ArchivedCase | null>(null);

  const { data: cases = [], isLoading } = useQuery({
    queryKey: ["archived_cases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_cases")
        .select("id, title, exam_mode, created_by, updated_at")
        .eq("status", ARCHIVED_STATUS)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ArchivedCase[];
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clinical_cases")
        .update({ status: "published" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived_cases"] });
      queryClient.invalidateQueries({ queryKey: ["clinical_cases"] });
      toast({ title: "Soal dipulihkan", description: "Soal kembali tampil di daftar utama." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const purgeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinical_cases").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived_cases"] });
      toast({ title: "Soal dihapus permanen" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const canManage = (c: ArchivedCase) =>
    canEditCase({ isMasterAdmin, createdBy: c.created_by, userId: user?.id });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card px-6 py-4 flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon" title="Kembali ke Admin">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Arsip Soal</h1>
          <p className="text-sm text-muted-foreground">
            Soal yang dihapus tersimpan di sini dan bisa dipulihkan kembali.
          </p>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Soal Terarsip ({cases.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : cases.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Arsip kosong. Tidak ada soal yang dihapus.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Diarsipkan</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.title}</TableCell>
                      <TableCell>{c.exam_mode === "oral_board" ? "Oral Board" : "Panel Exam"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.updated_at ? new Date(c.updated_at).toLocaleString("id-ID") : "—"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {canManage(c) ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restoreMutation.mutate(c.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <ArchiveRestore className="h-4 w-4 mr-2" /> Pulihkan
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hapus permanen"
                              onClick={() => setCaseToPurge(c)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Hanya lihat</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <AlertDialog open={!!caseToPurge} onOpenChange={(o) => !o && setCaseToPurge(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Soal <span className="font-semibold">"{caseToPurge?.title}"</span> akan dihapus selamanya beserta kunci jawaban dan hasil ujian terkait. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (caseToPurge) purgeMutation.mutate(caseToPurge.id);
                setCaseToPurge(null);
              }}
            >
              Ya, Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ArchivePage;
