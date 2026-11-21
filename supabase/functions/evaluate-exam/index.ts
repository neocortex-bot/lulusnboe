import { getExamAiContext, json, corsHeaders, parseRubric, safeUpstreamError } from "../_shared/exam-ai-access.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getOpenAIConfig, openAIChat, openAIJson } from "../_shared/openai.ts";
import { itemCoverageShare, quoteSupportedByTranscript } from "../_shared/transcript-match.ts";
import { buildEvaluationPrompt, buildUserContent, coveragePoints } from "./grading-prompt.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bearer = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    // Internal queue tick: process the next queued result.
    if (body?.queue_tick === true) {
      if (bearer !== serviceKey) return json({ error: "Tidak diizinkan." }, 403);
      const admin = createClient(url, serviceKey);
      const { data: nextId } = await admin.rpc("claim_next_ai_evaluation");
      if (nextId) runInBackground(admin, String(nextId));
      return json({ ok: true, next: nextId ?? null });
    }
    const { result_id } = body;
    const context = await getExamAiContext(req, result_id);
    if (context.response) return context.response;
    const { admin } = context;
    if (!getOpenAIConfig()) return json({ error: "Konfigurasi OpenAI belum tersedia. Setel OPENAI_API_KEY di Supabase secrets." }, 500);
    const { data: claim, error: claimError } = await admin.rpc("claim_ai_evaluation", { _result_id: result_id });
    if (claimError) return json({ error: "Antrean evaluasi gagal dibuat." }, 500);
    if (claim === "busy") return json({ status: "busy", message: "Evaluasi untuk hasil ini sedang berjalan atau sudah dalam antrean." });
    if (claim === "queued") return json({ status: "queued", message: "Evaluasi dimasukkan antrean dan akan berjalan otomatis." });
    if (claim !== "processing") return json({ error: "Hasil ujian tidak ditemukan." }, 404);
    runInBackground(admin, result_id);
    return json({ status: "processing", message: "Evaluasi AI sedang berjalan di latar belakang." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function runInBackground(supabase: any, resultId: string) {
  const task = (async () => {
    try {
      await evaluateResult(supabase, resultId);
      await supabase.from("exam_results").update({ ai_eval_status: "done", ai_eval_error: null }).eq("id", resultId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("evaluate-exam background failed", resultId, message);
      await supabase.from("exam_results").update({ ai_eval_status: "error", ai_eval_error: message.slice(0, 500) }).eq("id", resultId);
    } finally {
      // Hand off to a fresh invocation so each job gets its own time budget.
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/evaluate-exam`, {
        method: "POST",
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" },
        body: JSON.stringify({ queue_tick: true }),
      }).catch((e) => console.error("queue tick failed", e));
    }
  })();
  // @ts-ignore EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(task);
}

function buildTranscriptionPrompt(title?: string | null) {
  return `Ujian lisan kardiologi berbahasa Indonesia dengan istilah medis Inggris. ${title ? `Topik: ${title}. ` : ""}Istilah: pemeriksaan fisis, anamnesis, diagnosis banding, near syncope, sinus ritme, QTc, T inversi, pulseless, parestesia, poikilotermia, echo, ekokardiografi, EKG, ECG, LVH, RVH, PFO, ASD, VSD, HOCM, LVOT, TAPSE, EF, LVEF, troponin, NT-proBNP, CT scan, MRI, cath lab, PCI, STEMI, NSTEMI, atrial fibrilasi, stenosis, regurgitasi, perikarditis, kardiomiopati, Holter, treadmill, bubble study, TEE, TTE.`;
}

async function evaluateResult(supabase: any, result_id: string) {
    const { data: result, error: resultError } = await supabase.from("exam_results").select("*").eq("id", result_id).single();
    if (resultError || !result) throw new Error("Hasil ujian tidak ditemukan.");
    const openai = getOpenAIConfig();
    if (!openai) throw new Error("Konfigurasi OpenAI belum tersedia.");
    const { data: sessionData } = await supabase.from("exam_sessions")
      .select("case_id, session_start_time").eq("id", result.session_id).single();
    if (!sessionData) throw new Error("Sesi ujian tidak ditemukan.");
    const [caseResult, answerKeyResult] = await Promise.all([
      supabase.from("clinical_cases").select("title, questions_text, time_limit_seconds").eq("id", sessionData.case_id).single(),
      supabase.from("case_answer_keys").select("answer_key_text, checklist_rubric").eq("case_id", sessionData.case_id).maybeSingle(),
    ]);
    if (caseResult.error) throw new Error("Soal ujian tidak ditemukan.");
    if (answerKeyResult.error) throw new Error("Kunci jawaban gagal dimuat.");
    const clinicalCase = caseResult.data;
    const answerKeys = answerKeyResult.data;
    let transcript = result.transcript;
    if (!transcript?.trim() && result.audio_file_url) {
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) throw new Error("Konfigurasi transkripsi OpenAI belum tersedia.");
      const { data: audioData, error: audioErr } = await supabase.storage.from("exam-audio").download(result.audio_file_url);
      if (audioErr || !audioData) throw new Error("Rekaman gagal diunduh.");
      if (!audioData.size) throw new Error("Rekaman kosong. Tidak ada jawaban untuk dinilai.");
      if (audioData.size > 25 * 1024 * 1024) throw new Error("Rekaman melebihi batas transkripsi 25 MB.");
      const lowerName = String(result.audio_file_url).toLowerCase();
      const isMp4 = /\.(mp4|m4a)$/.test(lowerName) || audioData.type.includes("mp4");
      const transcribe = (model: string) => {
        const formData = new FormData();
        formData.append("file", audioData, isMp4 ? "audio.mp4" : "audio.webm");
        formData.append("model", model);
        formData.append("language", "id");
        formData.append("prompt", buildTranscriptionPrompt(clinicalCase?.title));
        return fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST", headers: { Authorization: `Bearer ${openaiKey}` }, body: formData,
        });
      };
      let whisperRes = await transcribe("gpt-4o-transcribe");
      if (!whisperRes.ok && whisperRes.status !== 401 && whisperRes.status !== 429) {
        console.warn("gpt-4o-transcribe gagal, memakai whisper-1", whisperRes.status);
        whisperRes = await transcribe("whisper-1");
      }
      if (!whisperRes.ok) {
        const message = await safeUpstreamError(whisperRes, "Transkripsi OpenAI gagal");
        throw new Error(`Transkripsi OpenAI: ${message}`);
      }
      transcript = (await whisperRes.json()).text;
      if (typeof transcript === "string" && transcript.trim()) {
        const { error } = await supabase.from("exam_results").update({ transcript }).eq("id", result_id);
        if (error) throw new Error("Transkrip gagal disimpan.");
      }
    }
    if (typeof transcript !== "string" || !transcript.trim()) throw new Error("Tidak ada transkrip atau rekaman untuk dinilai.");
    const items = parseRubric(answerKeys?.checklist_rubric);
    const rubricData = { enabled: items.length > 0, items };
    const answerKey = answerKeys?.answer_key_text || "";
    const questions = clinicalCase?.questions_text || "";
    const systemPrompt = buildEvaluationPrompt(rubricData, answerKey, questions);
    const userContent = buildUserContent(clinicalCase, rubricData, answerKey, questions, transcript);
      const scoreReport: any = await openAIJson(
        openai,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        { deterministic: true },
      );
      if (!scoreReport || typeof scoreReport !== "object") throw new Error("AI tidak menghasilkan laporan penilaian. Hasil lama tetap tersimpan.");
      const assessed = Array.isArray(scoreReport.items) ? scoreReport.items : [];
      // Per-reviewer scoring rule: a rubric line is worth up to 2 points.
      //   2 = mentioned fully (the rubric point is really covered)
      //   1 = mentioned but incomplete
      //   0 = not mentioned (shown bold+italic so the candidate knows to say it)
      // Full means clinically adequate core competency, not recital of every
      // supporting detail. A genuinely partial answer still earns only 1.
      const FULL_POINTS = 2;
      scoreReport.items = (rubricData.enabled ? rubricData.items : assessed).map((item: any, index: number) => {
        const evaluated = assessed[index];
        const quote = typeof evaluated?.evidenceQuote === "string" ? evaluated.evidenceQuote.trim() : "";
        const note = typeof evaluated?.comment === "string" ? evaluated.comment : "";
        // The transcript is raw Whisper output, so the model's quote is verified
        // with a speech-to-text tolerant comparison rather than an exact match.
        const rawCoverageInitial = String(evaluated?.coverage ?? "").toLowerCase();
        const quoteOk = quote ? quoteSupportedByTranscript(transcript, quote) : false;
        // A note like "menyebut LVEF <35%, tetapi tidak menyebut NYHA" names a
        // PARTIAL mention; treating that as whole-line absence erased the half
        // point the candidate had earned. So only accept the "absent" verdict
        // when the note does not ALSO credit something ("tetapi", "namun",
        // "hanya", "sedangkan", "walaupun"), and never when the model's own
        // coverage field says otherwise.
        const notesPartialCredit = /\b(tetapi|tapi|namun|hanya|sedangkan|walaupun|walau|meski|meskipun|belum lengkap|kurang lengkap)\b/i.test(note);
        const saysAbsent =
          !notesPartialCredit &&
          rawCoverageInitial === "none" &&
          /tidak (disebut|menyebut|ada|ditemukan)|belum (disebut|ada)|tidak dijelaskan|tidak menyebutkan/i.test(note);

        // The MODEL's "coverage" is the primary judgment: it reads the clinical
        // meaning, which is what matters. The transcript check is only a guard
        // against a fabricated quote, never a reason to erase a real mention.
        //
        // Earlier this code required quoteOk for any credit, so an unverifiable
        // quote (common with Whisper's mangled spelling) silently zeroed an item
        // the candidate had actually answered, and the same answer scored
        // differently between runs.
        const rawCoverage = String(evaluated?.coverage ?? "").toLowerCase();
        let coverage: "full" | "partial" | "none";
        if (saysAbsent || rawCoverage === "none") {
          // The model explicitly says it is missing.
          coverage = "none";
        } else if (rawCoverage === "full") {
          coverage = "full";
        } else if (rawCoverage === "partial") {
          coverage = "partial";
        } else if (evaluated?.passed) {
          // Older/looser replies without a coverage field.
          coverage = "partial";
        } else {
          coverage = "none";
        }

        // Safeguard against an all-or-nothing verdict on a many-part rubric
        // line: when the candidate demonstrably said a MEANINGFUL SHARE of the
        // line's own key phrases, a "none" is wrong — the model meant "partial".
        // This is what silently zeroed real answers (e.g. "LVEF <35% + GDMT
        // minimal 3 bulan" scored 0 on a line demanding exactly those criteria).
        if (coverage === "none" && !saysAbsent && itemCoverageShare(transcript, item.text ?? item.item) > 0) {
          coverage = "partial";
        }

        // A quote that we CAN verify but that the model called absent means the
        // candidate did say it. Never let that cost the point outright.
        if (coverage === "none" && !saysAbsent && quoteOk) coverage = "partial";

        const passed = coverage !== "none";
        const points = coveragePoints(coverage);
        return {
          item: item.text ?? item.item,
          points,
          maxPoints: FULL_POINTS,
          isCritical: item.isCritical,
          passed,
          coverage,
          evidenceQuote: coverage !== "none" && quoteOk ? quote : "",
          comment: note || (coverage === "full" ? "Kompetensi inti terpenuhi." : coverage === "partial" ? "Disebut namun belum lengkap." : "Tidak disebutkan."),
        };
      });
      // `points` is the earned score, `maxPoints` the ceiling, so totals are
      // straight sums. Each rubric line caps at 2.
      // Re-read to preserve a model answer generated concurrently and any
      // rubric items an admin scored manually (never overwrite those).
      const { data: latest } = await supabase.from("exam_results").select("ai_score_report").eq("id", result_id).single();
      const previous = latest?.ai_score_report;
      const prevItems: any[] = Array.isArray(previous?.items) ? previous.items : [];
      if (prevItems.some((it: any) => it?.manualOverride)) {
        scoreReport.items = scoreReport.items.map((item: any) => {
          const kept = prevItems.find((p: any) => p?.manualOverride && p.item === item.item);
          return kept ?? item;
        });
      }
      scoreReport.gradingPromptVersion = "clinical-competency-v4-2026-11-21";
      scoreReport.totalPossible = scoreReport.items.reduce((sum: number, item: any) => sum + (item.maxPoints ?? 2), 0);
      scoreReport.totalScore = scoreReport.items.reduce((sum: number, item: any) => sum + (item.points ?? 0), 0);
      if (rubricData.enabled) scoreReport.score = scoreReport.totalPossible > 0 ? Math.round(scoreReport.totalScore / scoreReport.totalPossible * 100) : 0;
      scoreReport.hasCriticalFail = scoreReport.items.some((item: any) => item.isCritical && !item.passed);
      scoreReport.passStatus = scoreReport.score >= 68 && !scoreReport.hasCriticalFail ? "LULUS" : "TIDAK LULUS";
      const cached = previous?.modelAnswer;
      if (cached) scoreReport.modelAnswer = cached;
      const { error } = await supabase.from("exam_results").update({ transcript, ai_score_report: scoreReport }).eq("id", result_id);
      if (error) throw new Error("Laporan AI gagal disimpan.");
  return { success: true, score_report: scoreReport };
}
