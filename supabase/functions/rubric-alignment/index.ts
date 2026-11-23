import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, json, parseRubric } from "../_shared/exam-ai-access.ts";
import { validAgentKey } from "../_shared/case-word-by-word.ts";
import { getOpenAIConfig, openAIJson } from "../_shared/openai.ts";

// Admin-only, read-only: checks rubric items vs their word-by-word sentences and
// returns suggestions. Never writes to the database and is never used by grading.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set(["sesuai", "sebagian", "tidak_sesuai", "kosong"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { ...corsHeaders, "Access-Control-Allow-Headers": `${corsHeaders["Access-Control-Allow-Headers"]}, x-agent-api-key` } });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const caseId = body?.case_id;
    if (typeof caseId !== "string" || !UUID.test(caseId)) return json({ error: "case_id harus berupa UUID." }, 400);
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
    const [{ data: cc }, { data: keys }] = await Promise.all([
      admin.from("clinical_cases").select("title, initial_prompt, questions_text").eq("id", caseId).single(),
      admin.from("case_answer_keys").select("answer_key_text, checklist_rubric, previous_answer_key_text, answer_key_edited_at, previous_rubric_items, rubric_edited_at").eq("case_id", caseId).maybeSingle(),
    ]);
    if (!cc) return json({ error: "Soal tidak ditemukan." }, 404);
    const rawItems: any[] = Array.isArray(keys?.checklist_rubric?.items) ? keys.checklist_rubric.items : [];
    const parsed = parseRubric(keys?.checklist_rubric);
    const items = rawItems
      .map((it, i) => ({ id: typeof it?.id === "string" ? it.id : "", text: parsed[i]?.text ?? "", answer: typeof it?.answer === "string" ? it.answer : "" }))
      .filter((it) => it.id && it.text);
    if (!items.length) return json({ error: "Rubrik belum punya butir yang tersimpan. Simpan soal dulu." }, 400);

    // Perubahan terakhir = sumber kebenaran; bagian yang tidak disentuh perlu disesuaikan.
    const akAt = keys?.answer_key_edited_at ? Date.parse(keys.answer_key_edited_at) : 0;
    const rbAt = keys?.rubric_edited_at ? Date.parse(keys.rubric_edited_at) : 0;
    const prevItems: any[] = Array.isArray(keys?.previous_rubric_items) ? keys.previous_rubric_items : [];
    const prevById = new Map(prevItems.map((p) => [p?.id, p]));
    const editedIds = new Set<string>();
    if (rbAt && rbAt >= akAt) for (const it of items) {
      const p = prevById.get(it.id);
      if (!p || (p.text ?? "") !== it.text || (p.answer ?? "") !== it.answer) editedIds.add(it.id);
    }
    const lastEdit = !akAt && !rbAt ? "none" : akAt > rbAt ? "answer_key" : "rubric";
    const prevAnswerKey = lastEdit === "answer_key" ? String(keys?.previous_answer_key_text ?? "") : "";
    const editedAt = lastEdit === "none" ? null : new Date(Math.max(akAt, rbAt)).toISOString();
    const digital: any[] = Array.isArray(keys?.checklist_rubric?.digital_properties) ? keys.checklist_rubric.digital_properties : [];

    const prompt = `Anda reviewer soal ujian oral board kedokteran. Untuk SETIAP butir daftar tilik, nilai apakah kalimat "word by word" (yang harus diucapkan peserta untuk mendapat poin) sesuai dengan butir tersebut dan dengan kunci jawaban.
Status: "sesuai", "sebagian", "tidak_sesuai", atau "kosong" (word by word belum ada).
Untuk status selain "sesuai", beri "suggested_answer": kalimat lisan Bahasa Indonesia 1-3 kalimat, klinis tepat, mengikuti kunci jawaban. Beri "suggested_text" HANYA bila teks butir rubrik itu sendiri ambigu/salah klinis (jangan ubah poin atau critical).
Balas JSON: {"items":[{"item_id":"...","status":"...","reason":"singkat","suggested_answer":"...","suggested_text":"..."}]}

PERUBAHAN TERAKHIR ADMIN: ${lastEdit === "answer_key" ? `KUNCI JAWABAN diedit (anggap versi baru BENAR). Kunci jawaban LAMA sebelum diedit:\n${prevAnswerKey.slice(0, 6000)}\nSemua butir rubrik & word by word yang masih mengikuti versi lama WAJIB diberi saran agar sesuai kunci jawaban baru.` : lastEdit === "rubric" ? `RUBRIK/WORD BY WORD diedit pada butir id: ${[...editedIds].join(", ") || "-"} (anggap BENAR, jangan beri saran untuk butir ini kecuali kosong). Butir lain yang bertentangan dengan butir yang diedit wajib diberi saran.` : "tidak diketahui"}

Selain itu, usulkan "property_suggestions": properti digital BARU (hasil pemeriksaan penunjang/nilai yang perlu diperlihatkan penguji bila diminta peserta) yang muncul di kunci jawaban/perubahan terakhir namun belum ada di daftar properti. Format: {"label":"...","value":"nilai/temuan singkat","needs_media":true bila seharusnya berupa gambar/video/suara (EKG, echo, rontgen, auskultasi),"reason":"..."}. Kosongkan bila tidak perlu.
PROPERTI DIGITAL SAAT INI:
${digital.map((d) => `- ${d?.label ?? ""}: ${d?.value ?? ""}`).join("\n") || "(belum ada)"}

Balas JSON lengkap: {"items":[...],"property_suggestions":[...]}

KASUS: ${cc.title}
SKENARIO: ${cc.initial_prompt ?? ""}
PERTANYAAN: ${cc.questions_text ?? ""}
KUNCI JAWABAN: ${keys?.answer_key_text ?? ""}

BUTIR:
${items.map((it) => `- id=${it.id} | butir: ${it.text} | word by word: ${it.answer || "(kosong)"}`).join("\n")}`;

    const reply = await openAIJson<{ items?: any[]; property_suggestions?: any[] }>(openai, [{ role: "user", content: prompt }], { signal: req.signal });
    const ids = new Set(items.map((i) => i.id));
    const suggestions = (Array.isArray(reply?.items) ? reply.items : [])
      .filter((s) => s && ids.has(s.item_id))
      .map((s) => ({
        item_id: String(s.item_id),
        status: STATUSES.has(s.status) ? s.status : "sebagian",
        reason: String(s.reason ?? "").slice(0, 600),
        ...(typeof s.suggested_answer === "string" && s.suggested_answer.trim() ? { suggested_answer: s.suggested_answer.trim().slice(0, 2000) } : {}),
        ...(typeof s.suggested_text === "string" && s.suggested_text.trim() ? { suggested_text: s.suggested_text.trim().slice(0, 500) } : {}),
      }));
    const existing = new Set(digital.map((d) => String(d?.label ?? "").trim().toLowerCase()));
    const property_suggestions = (Array.isArray(reply?.property_suggestions) ? reply.property_suggestions : [])
      .filter((p) => p && typeof p.label === "string" && p.label.trim() && !existing.has(p.label.trim().toLowerCase()))
      .slice(0, 10)
      .map((p) => ({ label: p.label.trim().slice(0, 200), value: String(p.value ?? "").trim().slice(0, 2000), needs_media: !!p.needs_media, reason: String(p.reason ?? "").slice(0, 400) }));
    return json({
      suggestions: suggestions.map((s) => ({ ...s, recommended: lastEdit !== "none" && !editedIds.has(s.item_id) && s.status !== "sesuai" })),
      last_edit: { kind: lastEdit, at: editedAt, edited_item_ids: [...editedIds] },
      property_suggestions,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return json({ error: /quota|billing|insufficient/i.test(msg) ? "Kredit AI habis. Isi ulang lalu coba lagi." : msg }, 500);
  }
});
