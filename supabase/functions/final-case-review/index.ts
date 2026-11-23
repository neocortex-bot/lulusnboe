import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/exam-ai-access.ts";
import { getOpenAIConfig, openAIJson } from "../_shared/openai.ts";
import { FINAL_REVIEW_POLICY, normalizeFinalReview } from "../_shared/final-case-review.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Konfigurasi layanan belum lengkap." }, 500);
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Silakan masuk kembali." }, 401);
    const admin = createClient(url, key);
    const { data: auth, error: authError } = await admin.auth.getUser(token);
    if (authError || !auth.user) return json({ error: "Sesi login berakhir." }, 401);
    const { data: isAdmin, error: roleError } = await admin.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
    if (roleError || !isAdmin) return json({ error: "Hanya admin dapat memeriksa soal." }, 403);
    const body = await req.json();
    const caseId = body?.case_id;
    if (typeof caseId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(caseId)) {
      return json({ error: "Soal tidak valid." }, 400);
    }
    // Never trust form content or client-provided approval flags.
    const { data: input, error: readError } = await admin.rpc("get_final_case_input", { _case_id: caseId });
    if (readError) throw readError;
    if (!input) return json({ error: "Soal tidak ditemukan." }, 404);
    const content = JSON.stringify(input);
    if (content.length > 200000) return json({ error: "Isi soal terlalu panjang untuk diperiksa lengkap; ringkas terlebih dahulu." }, 400);
    const config = getOpenAIConfig();
    if (!config) return json({ error: "Konfigurasi AI belum tersedia." }, 500);
    const raw = await openAIJson(config, [{ role: "system", content: FINAL_REVIEW_POLICY }, { role: "user", content: `DATA SOAL TERSIMPAN:\n${content}` }], { signal: req.signal });
    const result = normalizeFinalReview(raw, input);
    const { error: saveError } = await admin.rpc("record_final_case_review", { _case_id: caseId, _input: input, _result: result, _checked_by: auth.user.id });
    if (saveError) throw saveError;
    return json({ case_id: caseId, result, passed: result.passed, stale: false, updated_at: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message ?? "Pemeriksaan gagal.";
    return json({ error: /quota|billing|insufficient/i.test(msg) ? "Kredit AI habis. Pemeriksaan belum lolos; coba lagi setelah isi ulang." : msg }, 500);
  }
});