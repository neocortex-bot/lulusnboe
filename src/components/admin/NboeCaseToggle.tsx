import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NboeMarker, { type NboeValue } from "./NboeMarker";
import { useToast } from "@/hooks/use-toast";

export default function NboeCaseToggle({ caseId, canEdit }: { caseId: string; canEdit: boolean }) {
  const client = useQueryClient();
  const { toast } = useToast();
  const key = ["case_nboe", caseId];
  const { data, isLoading, isError } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("clinical_cases").select("is_nboe, nboe_period").eq("id", caseId).single();
      if (error) throw error;
      return data;
    },
  });
  const mutation = useMutation({
    mutationFn: async (value: NboeValue) => {
      if (!canEdit) throw new Error("Anda tidak memiliki akses untuk mengubah soal ini.");
      const { data, error } = await supabase.from("clinical_cases")
        .update(value).eq("id", caseId).select("is_nboe, nboe_period").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (value) => {
      client.setQueryData(key, value);
      void client.invalidateQueries({ queryKey: ["clinical_cases"] });
      toast({ title: value.is_nboe ? "Periode Soal NBOE disimpan" : "Penanda Soal NBOE dihapus" });
    },
    onError: (error: Error) => toast({ title: "Gagal menyimpan penanda", description: error.message, variant: "destructive" }),
  });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NboeMarker value={data ?? { is_nboe: false, nboe_period: null }} disabled={!canEdit || isLoading || isError || mutation.isPending}
        onChange={async value => { await mutation.mutateAsync(value); }} />
      {isError && <span role="alert" className="text-xs text-destructive">Gagal memuat</span>}
    </div>
  );
}