import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function NboeCaseToggle({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const key = ["case_nboe", caseId];
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("clinical_cases").select("is_nboe").eq("id", caseId).single();
      if (error) throw error;
      return data.is_nboe;
    },
  });
  const mutation = useMutation({
    mutationFn: async (checked: boolean) => {
      if (!canEdit) throw new Error("Anda tidak memiliki akses untuk mengubah soal ini.");
      const { data, error } = await supabase.from("clinical_cases")
        .update({ is_nboe: checked }).eq("id", caseId).select("is_nboe").single();
      if (error) throw error;
      return data.is_nboe;
    },
    onSuccess: (checked) => {
      client.setQueryData(key, checked);
      void client.invalidateQueries({ queryKey: ["clinical_cases"] });
      toast({ title: checked ? "Soal ditandai sebagai Soal NBOE" : "Penanda Soal NBOE dihapus" });
    },
    onError: (error: Error) => toast({ title: "Gagal menyimpan penanda", description: error.message, variant: "destructive" }),
  });
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Checkbox id={`nboe-${caseId}`} checked={data === true} disabled={!canEdit || isLoading || isError || mutation.isPending}
        onCheckedChange={(checked) => mutation.mutate(checked === true)} />
      <Label htmlFor={`nboe-${caseId}`} className="text-sm">Soal NBOE</Label>
      {isError && <span role="alert" className="text-xs text-destructive">Gagal memuat</span>}
    </div>
  );
}