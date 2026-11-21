import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor, Tag } from "lucide-react";
import RubricBuilder, { type RubricData } from "./RubricBuilder";
import sharedParseRubricData, { withRubricItemIds } from "@/lib/rubricParser";
import DigitalPropertiesEditor from "./DigitalPropertiesEditor";
import NboeCaseToggle from "./NboeCaseToggle";
import CategoryPicker from "./CategoryPicker";
import { parseDigitalProperties, cleanDigitalProperties } from "@/lib/digitalProperties";
import PropertiesEditor from "./PropertiesEditor";

interface CaseFormProps {
  existingCase?: {
    id: string;
    title: string;
    exam_mode: string;
    initial_prompt: string;
    checklist_rubric: any;
    time_limit_seconds: number;
    reading_time_seconds?: number;
    questions_text?: string;
    answer_key_text?: string;
    show_results_to_candidate?: boolean;
    is_nboe?: boolean;
    category?: string | null;
  } | null;
  categories?: string[];
  onClose: () => void;
}

function parseRubricData(raw: any): RubricData {
  return sharedParseRubricData(raw);
}

const CaseForm = ({ existingCase, categories = [], onClose }: CaseFormProps) => {
  const [category, setCategory] = useState<string | null>(existingCase?.category ?? null);
  const [title, setTitle] = useState(existingCase?.title ?? "");
  const [examMode, setExamMode] = useState(existingCase?.exam_mode ?? "oral_board");
  const [initialPrompt, setInitialPrompt] = useState(existingCase?.initial_prompt ?? "");
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(existingCase?.time_limit_seconds ?? 360);
  const [readingTimeSeconds, setReadingTimeSeconds] = useState(existingCase?.reading_time_seconds ?? 120);
  const [questionsText, setQuestionsText] = useState(existingCase?.questions_text ?? "");
  const [answerKeyText, setAnswerKeyText] = useState(existingCase?.answer_key_text ?? "");
  const [isNboe, setIsNboe] = useState(false);
  const [digitalProps, setDigitalProps] = useState(() => parseDigitalProperties(existingCase?.checklist_rubric));
  const [showResultsToCandidate, setShowResultsToCandidate] = useState(
    existingCase?.show_results_to_candidate ?? false
  );
  const [rubricData, setRubricData] = useState<RubricData>(
    parseRubricData(existingCase?.checklist_rubric)
  );
  // Properti soal: admin-only, disimpan di case_answer_keys (tidak pernah ke peserta)
  const [properties, setProperties] = useState<string[]>(
    Array.isArray((existingCase?.checklist_rubric as any)?.properties)
      ? (existingCase?.checklist_rubric as any).properties.map((p: any) => String(p))
      : []
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      const items = withRubricItemIds(rubricData.items);
      const publicItems = items.map(({ answer: _answer, ...item }) => item);
      const casePayload = {
        title,
        category,
        exam_mode: examMode,
        initial_prompt: initialPrompt,
        time_limit_seconds: timeLimitSeconds,
        reading_time_seconds: readingTimeSeconds,
        questions_text: questionsText,
        show_results_to_candidate: showResultsToCandidate,
        // Keep answer_key_text and checklist_rubric on clinical_cases for backward compat
        // but the authoritative source is now case_answer_keys
        answer_key_text: answerKeyText,
        checklist_rubric: { ...rubricData, items: publicItems } as any,
        // Deteksi mode penilaian: daftar tilik aktif hanya bila enabled & ada items
        rubric_mode: rubricData.enabled && rubricData.items.length > 0 ? "checklist" : "none",
      };

      let caseId = existingCase?.id;

      if (existingCase) {
        const { error } = await supabase.from("clinical_cases").update(casePayload).eq("id", existingCase.id);
        if (error) throw error;
      } else {
        const { data: authData } = await supabase.auth.getUser();
        const { data, error } = await supabase
          .from("clinical_cases")
          .insert({ ...casePayload, is_nboe: isNboe, created_by: authData.user?.id ?? null })
          .select("id")
          .single();
        if (error) throw error;
        caseId = data.id;
      }

      // Upsert into case_answer_keys (admin-only table)
      if (caseId) {
        const { error: akError } = await supabase
          .from("case_answer_keys")
          .upsert(
            {
              case_id: caseId,
              answer_key_text: answerKeyText,
              checklist_rubric: {
                ...(existingCase?.checklist_rubric && !Array.isArray(existingCase.checklist_rubric) ? existingCase.checklist_rubric : {}),
                ...rubricData,
                items,
                properties: properties.map((p) => p.trim()).filter(Boolean),
                digital_properties: cleanDigitalProperties(digitalProps),
              } as any,
            },
            { onConflict: "case_id" }
          );
        if (akError) {
          throw akError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinical_cases"] });
      queryClient.invalidateQueries({ queryKey: ["clinical_case_preview", existingCase?.id] });
      toast({ title: existingCase ? "Soal diperbarui" : "Soal dibuat" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <span className="inline-flex items-center gap-2 text-sm font-medium"><Tag className="h-4 w-4 text-muted-foreground" /> Penanda soal</span>
        {existingCase ? <NboeCaseToggle caseId={existingCase.id} canEdit /> : (
          <div className="flex items-center gap-2">
            <Checkbox id="new-case-nboe" checked={isNboe} onCheckedChange={(checked) => setIsNboe(checked === true)} />
            <Label htmlFor="new-case-nboe">Soal NBOE</Label>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Judul Soal</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>Kategori</Label>
        <CategoryPicker categories={categories} value={category} onChange={setCategory} />
      </div>

      <div className="space-y-2">
        <Label>Mode Ujian</Label>
        <Select value={examMode} onValueChange={setExamMode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="oral_board">Oral Board</SelectItem>
            <SelectItem value="panel_exam">Panel Exam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="prompt">Kasus Klinis (Initial Prompt)</Label>
        <Textarea
          id="prompt"
          value={initialPrompt}
          onChange={(e) => setInitialPrompt(e.target.value)}
          rows={5}
          placeholder="Deskripsi kasus klinis yang akan ditampilkan saat fase membaca..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="questions">Soal / Pertanyaan</Label>
        <Textarea
          id="questions"
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          rows={4}
          placeholder="Pertanyaan yang ditampilkan setelah waktu baca selesai, bersama kasus di atas..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="answerKey">Kunci Jawaban (Answer Key)</Label>
        <p className="text-xs text-muted-foreground">
          Jawaban lengkap dan benar sebagai referensi AI untuk memberikan nilai. Data ini hanya dapat diakses oleh admin.
        </p>
        <Textarea
          id="answerKey"
          value={answerKeyText}
          onChange={(e) => setAnswerKeyText(e.target.value)}
          rows={6}
          placeholder="Tuliskan jawaban lengkap yang benar untuk setiap pertanyaan di atas..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="readingTime">Waktu Baca (detik)</Label>
          <Input
            id="readingTime"
            type="number"
            min={0}
            value={readingTimeSeconds}
            onChange={(e) => setReadingTimeSeconds(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Waktu Ujian (detik)</Label>
          <Input
            id="time"
            type="number"
            min={60}
            value={timeLimitSeconds}
            onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="showResults">Tampilkan Nilai ke Peserta</Label>
          <p className="text-xs text-muted-foreground">
            Bila aktif, peserta dapat melihat hasil evaluasi AI di halaman ujian mereka.
          </p>
        </div>
        <Switch
          id="showResults"
          checked={showResultsToCandidate}
          onCheckedChange={setShowResultsToCandidate}
        />
      </div>

      <RubricBuilder data={rubricData} onChange={setRubricData} />

      <PropertiesEditor properties={properties} onChange={setProperties} />

      <Separator />
      <section className="min-w-0 space-y-4" aria-labelledby="case-form-digital-title">
        <div className="flex items-center gap-3">
          <Monitor className="h-5 w-5 shrink-0 text-primary" />
          <h2 id="case-form-digital-title" className="text-base font-semibold">Properti Digital</h2>
          <span className="text-sm tabular-nums text-muted-foreground">{digitalProps.length}</span>
        </div>
        <DigitalPropertiesEditor items={digitalProps} onChange={setDigitalProps} caseId={existingCase?.id} />
      </section>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Menyimpan..." : existingCase ? "Simpan Perubahan" : "Buat Soal"}
        </Button>
      </div>
    </form>
  );
};

export default CaseForm;
