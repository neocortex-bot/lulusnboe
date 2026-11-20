import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ResultCasePromptProps {
  resultId: string;
}

export default function ResultCasePrompt({ resultId }: ResultCasePromptProps) {
  const [open, setOpen] = useState(false);
  const { data: prompt, isLoading, isError, refetch } = useQuery({
    queryKey: ["exam_result_case_prompt", resultId],
    enabled: open,
    gcTime: 0,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("exam_results")
        .select("exam_sessions:session_id(clinical_cases:case_id(initial_prompt, questions_text))")
        .eq("id", resultId)
        .single();
      if (error) throw error;
      return data?.exam_sessions?.clinical_cases ?? null;
    },
  });

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border pb-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-between gap-3 whitespace-normal px-0 py-2 text-left" aria-label="Vignette dan pertanyaan">
          <span className="text-sm font-semibold">Vignette dan Pertanyaan</span>
          {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        {isLoading ? <p className="text-sm text-muted-foreground">Memuat soal...</p> : isError ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-destructive">
            <span>Soal gagal dimuat.</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>Coba lagi</Button>
          </div>
        ) : (
          <>
            <section className="min-w-0">
              <h4 className="mb-1 text-sm font-semibold">Vignette</h4>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{prompt?.initial_prompt || "Vignette tidak tersedia."}</p>
            </section>
            <section className="min-w-0">
              <h4 className="mb-1 text-sm font-semibold">Pertanyaan</h4>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{prompt?.questions_text || "Pertanyaan tidak tersedia."}</p>
            </section>
          </>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}