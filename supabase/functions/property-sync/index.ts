import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json } from "../_shared/exam-ai-access.ts";
import { validAgentKey } from "../_shared/case-word-by-word.ts";
import { getOpenAIConfig, openAIJson } from "../_shared/openai.ts";

// Admin-only, read-only: menyelaraskan kunci jawaban, word by word, dan teks butir
// rubrik dengan caption properti digital (sumber kebenaran). Tidak menulis ke database.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...corsHeaders, "Access-Control-Allow-Headers": `${corsHeaders["Access-Control-Allow-Headers"]}, x-agent-api-key` } });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = body?.case_id;
    if (typeof caseId !== "string" || !UUID.test(caseId)) return json({ error: "case_id harus berupa UUID." }, 400);
    const props = (Array.isArray(body?.properties) ? body.properties : []).slice(0, 60)
      .map((p: any) => ({ label: str(p?.label, 200).trim(), value: str(p?.value, 3000).trim(), media: Boolean(p?.media_url) }))
      .filter((p: any) => p.label || p.value);
    const items = (Array.isArray(body?.items) ? body.items : []).slice(0, 150)
      .map((it: any, i: number) => ({ index: i, text: str(it?.text, 1000), answer: str(it?.answer, 3000) }));
    const answerKey = str(body?.answer_key_text, 30000);
    const captioned = props.filter((p: any) => p.value);
    if (!captioned.length) return json({ error: "Belum ada properti digital yang memiliki caption/nilai untuk dicek." }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Konfigurasi layanan belum lengkap." }, 500);
    const admin = createClient(url, key);
    const agentKey = req.headers.get("x-agent-api-key");
    const agentAuthorized = validAgentKey(agentKey, Deno.env.get("CASE_ADMIN_API_KEY"), Deno.env.get("CASE_INGEST_API_KEY"));
    if (agentKey && !agentAuthorized) return json({ error: "Invalid X-Agent-Api-Key" }, 401);
    if (!agentAuthorized) {
      const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
      if (!token) return json({ error: "Silakan masuk kembali." }, 401);
      const { data: auth } = await admin.auth.getUser(token);
      if (!auth?.user) return json({ error: "Sesi login berakhir. Silakan masuk kembali." }, 401);
      const [{ data: isAdmin }, { data: isMaster }] = await Promise.all([
        admin.rpc("has_role", { _user_id: auth.user.id, _role: "admin" }),
        admin.rpc("is_master_admin", { _user_id: auth.user.id }),
      ]);
      if (!isAdmin && !isMaster) return json({ error: "Hanya admin yang dapat memakai fitur ini." }, 403);
    }
    const openai = getOpenAIConfig();
    if (!openai) return json({ error: "Konfigurasi AI belum tersedia." }, 500);
    const { data: cc } = await admin.from("clinical_cases").select("title, initial_prompt, questions_text").eq("id", caseId).single();
    if (!cc) return json({ error: "Soal tidak ditemukan." }, 404);

    const prompt = `Anda reviewer soal ujian oral board kedokteran. Caption/nilai PROPERTI DIGITAL di bawah adalah SUMBER KEBENARAN (itulah yang dilihat peserta saat meminta pemeriksaan penunjang).
Tugas: temukan bagian KUNCI JAWABAN, WORD BY WORD butir, dan TEKS BUTIR rubrik yang menyebut/menginterpretasikan pemeriksaan penunjang tetapi angka/temuannya BERBEDA atau BERTENTANGAN dengan caption properti.
Aturan:
- Ubah HANYA angka/temuan/interpretasi yang konflik; pertahankan gaya, struktur, dan sisa kalimat apa adanya.
- Jangan mengarang nilai yang tidak ada di caption. Jangan menyentuh bagian yang tidak terkait pemeriksaan penunjang.
- Untuk kunci jawaban, kembalikan teks LENGKAP setelah perbaikan (bukan potongan) hanya jika ada perubahan.
- Bila caption sendiri tampak janggal klinis (interpretasi tidak cocok dengan nilainya), JANGAN ubah caption; laporkan di property_warnings.
- Properti tanpa nilai teks tidak dicek.
Balas JSON: {"answer_key":{"after":"teks lengkap","reason":"..."}|null,"items":[{"index":0,"field":"answer"|"text","after":"...","reason":"..."}],"property_warnings":[{"label":"...","reason":"..."}]}

KASUS: ${cc.title}
SKENARIO: ${cc.initial_prompt ?? ""}
PERTANYAAN: ${cc.questions_text ?? ""}

PROPERTI DIGITAL:
${captioned.map((p: any) => `- ${p.label || "(tanpa label)"}${p.media ? " [ada media]" : ""}: ${p.value}`).join("\n")}

KUNCI JAWABAN:
${answerKey || "(kosong)"}

BUTIR RUBRIK:
${items.map((it: any) => `- index=${it.index} | butir: ${it.text} | word by word: ${it.answer || "(kosong)"}`).join("\n")}`;

    const reply = await openAIJson<any>(openai, [{ role: "user", content: prompt }], { signal: req.signal });
    const changes = (Array.isArray(reply?.items) ? reply.items : [])
      .filter((c: any) => Number.isInteger(c?.index) && items[c.index] && (c.field === "answer" || c.field === "text") && typeof c.after === "string" && c.after.trim())
      .map((c: any) => ({ index: c.index, field: c.field, before: items[c.index][c.field as "answer" | "text"], after: c.after.trim().slice(0, 3000), reason: str(c.reason, 600) }))
      .filter((c: any) => c.after !== c.before.trim());
    const ak = reply?.answer_key && typeof reply.answer_key.after === "string" && reply.answer_key.after.trim() && reply.answer_key.after.trim() !== answerKey.trim()
      ? { after: reply.answer_key.after.trim().slice(0, 30000), reason: str(reply.answer_key.reason, 600) } : null;
    const warnings = (Array.isArray(reply?.property_warnings) ? reply.property_warnings : [])
      .map((w: any) => ({ label: str(w?.label, 200), reason: str(w?.reason, 600) })).filter((w: any) => w.reason);
    const skipped = props.filter((p: any) => !p.value).map((p: any) => p.label || "(tanpa label)");
    return json({ answer_key: ak, items: changes, property_warnings: warnings, skipped });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: /quota|billing|insufficient/i.test(msg) ? "Kredit AI habis. Isi ulang lalu coba lagi." : msg }, 500);
  }
});
