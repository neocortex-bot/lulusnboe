import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { getRubricQualityError } from "./rubric-validation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-agent-api-key, content-type",
  "Access-Control-Allow-Methods": "GET, PATCH, OPTIONS",
};

const RubricItem = z.object({
  text: z.string().min(10).max(500),
  points: z.number().int().min(1).max(5),
  isCritical: z.boolean(),
  // Word by word (agar mendapatkan poin ini) — admin-only, disimpan di case_answer_keys
  answer: z.string().max(4000).optional(),
});
type RubricItemT = z.infer<typeof RubricItem>;

const MediaNote = z.object({
  description: z.string().min(3).max(300),
  category: z.enum(["case_media", "examination", "additional_info"]).default("examination"),
  trigger_keywords: z.array(z.string().min(2)).default([]),
});

// Operasi rubrik granular, seperti admin mengedit satu baris di tabel.
const RubricOp = z.discriminatedUnion("op", [
  z.object({ op: z.literal("add"), item: RubricItem, index: z.number().int().min(0).optional() }),
  z.object({ op: z.literal("update"), index: z.number().int().min(0), item: RubricItem.partial() }),
  z.object({ op: z.literal("remove"), index: z.number().int().min(0) }),
  z.object({ op: z.literal("move"), from: z.number().int().min(0), to: z.number().int().min(0) }),
]);

const UpdateSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  status: z.enum(["prereview", "draft", "published", "archived"]).optional(),
  exam_mode: z.enum(["oral_board", "osce", "panel_exam"]).optional(),
  reading_time_minutes: z.number().min(0.25).max(15).optional(),
  time_limit_minutes: z.number().min(0.5).max(30).optional(),
  reading_time_seconds: z.number().int().min(5).max(900).optional(),
  time_limit_seconds: z.number().int().min(30).max(1800).optional(),
  show_results_to_candidate: z.boolean().optional(),
  initial_prompt: z.string().max(20000).optional(),
  questions_text: z.string().min(20).max(20000).optional(),
  answer_key_text: z.string().min(100).max(50000).optional(),
  checklist_rubric: z.object({ items: z.array(RubricItem).max(100) }).optional(),
  rubric_ops: z.array(RubricOp).max(100).optional(),
  properties: z.array(z.string().min(1).max(500)).max(50).optional(),
  // Properti digital: ganti seluruh daftar. needs_media=true + tanpa media_url = PR admin.
  digital_properties: z.array(z.object({
    label: z.string().min(1).max(200),
    value: z.string().max(4000).default(""),
    media_url: z.string().url().max(2000).nullable().optional(),
    media_type: z.enum(["image", "video", "audio"]).nullable().optional(),
    needs_media: z.boolean().default(false),
  })).max(50).optional(),
  // Kategori soal -> kolom clinical_cases.category. nullable agar bisa dikosongkan.
  category: z.string().max(100).nullable().optional(),
  media_notes: z.array(MediaNote).optional(),
  created_by_email: z.string().email().optional(),
  dry_run: z.boolean().optional(),
});

const SCHEMA_DOC = {
  auth_header: "X-Agent-Api-Key: <CASE_ADMIN_API_KEY>",
  GET_list: "/functions/v1/case-admin?status=&q=<judul>&limit=100",
  GET_one: "/functions/v1/case-admin?id=<case_id> — semua field + rubrik lengkap (dengan answer) + properties",
  PATCH: "/functions/v1/case-admin?id=<case_id> — kirim hanya field yang diubah",
  patch_fields: {
    title: "10-200 char, unik", status: "prereview|draft|published|archived",
    exam_mode: "oral_board|osce|panel_exam", reading_time_seconds: "5-900", time_limit_seconds: "30-1800",
    initial_prompt: "skenario", questions_text: ">=20 char", answer_key_text: ">=100 char",
    checklist_rubric: "{items:[{text,points 1-5,isCritical,answer?}]} — ganti seluruh rubrik",
    rubric_ops: "[{op:'add',item,index?}|{op:'update',index,item:{...sebagian}}|{op:'remove',index}|{op:'move',from,to}] — index 0-based",
    properties: "string[] admin-only (properti fisik)", category: "string bebas maks 100 char -> clinical_cases.category (atau null utk mengosongkan)", media_notes: "array", dry_run: "true = validasi & preview tanpa simpan",
    digital_properties: "[{label, value, media_url?, media_type?: image|video|audio, needs_media: bool}] — ganti seluruh daftar; needs_media=true tanpa media_url = 'Butuh media asli' (PR admin). Ambil dulu via GET lalu kirim ulang lengkap agar tidak hilang.",
  },
  rubric_rules: "3-100 butir, >=1 kritis, total >=6 poin, tanpa duplikat (atau 0 butir = nonaktif)",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function applyOps(items: RubricItemT[], ops: z.infer<typeof RubricOp>[]): RubricItemT[] | string {
  const out = items.map((i) => ({ ...i }));
  for (const [n, o] of ops.entries()) {
    if (o.op === "add") {
      const at = o.index ?? out.length;
      if (at > out.length) return `rubric_ops[${n}]: index ${at} di luar rentang`;
      out.splice(at, 0, o.item);
    } else if (o.op === "update") {
      if (!out[o.index]) return `rubric_ops[${n}]: index ${o.index} tidak ada`;
      out[o.index] = { ...out[o.index], ...o.item };
    } else if (o.op === "remove") {
      if (!out[o.index]) return `rubric_ops[${n}]: index ${o.index} tidak ada`;
      out.splice(o.index, 1);
    } else {
      if (!out[o.from] || o.to >= out.length) return `rubric_ops[${n}]: from/to di luar rentang`;
      const [m] = out.splice(o.from, 1);
      out.splice(o.to, 0, m);
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("CASE_ADMIN_API_KEY") || Deno.env.get("CASE_INGEST_API_KEY");
  if (!expected) return json(500, { error: "Server missing CASE_ADMIN_API_KEY" });
  const provided = req.headers.get("x-agent-api-key");
  if (!provided || provided !== expected) return json(401, { error: "Invalid or missing X-Agent-Api-Key" });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id && !/^[0-9a-f-]{36}$/i.test(id)) return json(400, { error: "id harus UUID" });

  async function loadFull(caseId: string) {
    const { data, error } = await supabase.from("clinical_cases").select("*").eq("id", caseId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const { data: ak } = await supabase
      .from("case_answer_keys").select("answer_key_text, checklist_rubric").eq("case_id", caseId).maybeSingle();
    const akR = (ak?.checklist_rubric ?? {}) as { items?: RubricItemT[]; properties?: string[]; digital_properties?: unknown[] };
    const ccR = (data.checklist_rubric ?? {}) as { items?: RubricItemT[] };
    const items = (akR.items?.length ? akR.items : ccR.items) ?? [];
    return {
      ...data,
      answer_key_text: ak?.answer_key_text ?? data.answer_key_text ?? null,
      rubric_items: items.map((it, index) => ({ index, ...it })),
      properties: akR.properties ?? [],
      digital_properties: (akR.digital_properties ?? []).map((p) => {
        const d = p as Record<string, unknown>;
        return { ...d, media_pending: !!d.needs_media && !d.media_url };
      }),
    };
  }

  if (req.method === "GET") {
    if (!id) {
      const status = url.searchParams.get("status");
      const q = url.searchParams.get("q");
      const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
      let query = supabase.from("clinical_cases")
        .select("id, title, exam_mode, status, source, rubric_mode, created_at");
      if (status) query = query.eq("status", status);
      if (q) query = query.ilike("title", `%${q.slice(0, 100)}%`);
      const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);
      if (error) return json(500, { error: "List failed", detail: error.message });
      return json(200, { count: data.length, cases: data, schema: SCHEMA_DOC });
    }
    try {
      const full = await loadFull(id);
      if (!full) return json(404, { error: "Case not found", id });
      return json(200, { case: full });
    } catch (e) {
      return json(500, { error: "Fetch failed", detail: (e as Error).message });
    }
  }

  if (req.method === "PATCH") {
    if (!id) return json(400, { error: "Missing ?id=<case_id>" });
    let raw: unknown;
    try { raw = await req.json(); } catch { return json(400, { error: "Invalid JSON body" }); }
    const parsed = UpdateSchema.safeParse(raw);
    if (!parsed.success) return json(400, { error: "Validation failed", details: parsed.error.flatten(), schema: SCHEMA_DOC });
    const data = parsed.data;
    if (data.checklist_rubric && data.rubric_ops) return json(400, { error: "Pilih salah satu: checklist_rubric atau rubric_ops" });

    let current;
    try { current = await loadFull(id); } catch (e) { return json(500, { error: "Fetch failed", detail: (e as Error).message }); }
    if (!current) return json(404, { error: "Case not found", id });

    const patch: Record<string, unknown> = {};
    for (const k of ["title", "status", "exam_mode", "show_results_to_candidate", "initial_prompt", "questions_text", "answer_key_text", "media_notes"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    if (data.category !== undefined) patch.category = data.category;
    if (data.reading_time_seconds !== undefined) patch.reading_time_seconds = data.reading_time_seconds;
    else if (data.reading_time_minutes !== undefined) patch.reading_time_seconds = Math.round(data.reading_time_minutes * 60);
    if (data.time_limit_seconds !== undefined) patch.time_limit_seconds = data.time_limit_seconds;
    else if (data.time_limit_minutes !== undefined) patch.time_limit_seconds = Math.round(data.time_limit_minutes * 60);

    if (data.title && data.title !== current.title) {
      const { data: dup } = await supabase.from("clinical_cases").select("id").ilike("title", data.title).neq("id", id).limit(1);
      if (dup?.length) return json(409, { error: "Judul sudah dipakai soal lain", conflict_id: dup[0].id });
    }

    let newItems: RubricItemT[] | undefined;
    if (data.checklist_rubric) newItems = data.checklist_rubric.items;
    if (data.rubric_ops) {
      const base = current.rubric_items.map(({ index: _i, ...it }: { index: number } & RubricItemT) => it);
      const r = applyOps(base, data.rubric_ops);
      if (typeof r === "string") return json(400, { error: r });
      for (const [i, it] of r.entries()) {
        const chk = RubricItem.safeParse(it);
        if (!chk.success) return json(400, { error: `Butir ${i} tidak valid`, details: chk.error.flatten() });
      }
      newItems = r;
    }
    if (newItems) {
      if (newItems.length > 0) {
        const err = getRubricQualityError(newItems);
        if (err) return json(400, { error: err });
      }
      // Tabel kandidat: tanpa jawaban word-by-word
      patch.checklist_rubric = {
        enabled: newItems.length > 0,
        items: newItems.map(({ answer: _a, ...rest }) => rest),
      };
      patch.rubric_mode = newItems.length > 0 ? "checklist" : "none";
    }

    if (data.created_by_email) {
      const { data: owner } = await supabase.from("profiles").select("id").ilike("email", data.created_by_email).maybeSingle();
      if (owner) patch.created_by = owner.id;
    }

    const summary = newItems ? {
      rubric_items: newItems.length,
      critical_items: newItems.filter((i) => i.isCritical).length,
      total_points: newItems.reduce((s, i) => s + i.points, 0),
    } : undefined;

    if (data.dry_run) {
      return json(200, { dry_run: true, changed_fields: [...Object.keys(patch), ...(data.properties ? ["properties"] : []), ...(data.digital_properties ? ["digital_properties"] : [])], rubric: summary, preview_items: newItems });
    }

    if (Object.keys(patch).length) {
      const { error: updErr } = await supabase.from("clinical_cases").update(patch).eq("id", id);
      if (updErr) return json(500, { error: "Update failed", detail: updErr.message });
    }

    if (data.answer_key_text !== undefined || newItems || data.properties || data.digital_properties) {
      const { data: ak } = await supabase.from("case_answer_keys").select("checklist_rubric").eq("case_id", id).maybeSingle();
      const prev = (ak?.checklist_rubric ?? {}) as Record<string, unknown>;
      const akPayload: Record<string, unknown> = {
        checklist_rubric: {
          ...prev,
          ...(newItems ? { enabled: newItems.length > 0, items: newItems } : {}),
          ...(data.properties ? { properties: data.properties } : {}),
          ...(data.digital_properties ? {
            digital_properties: data.digital_properties.map((p) => ({
              label: p.label.trim(), value: p.value.trim(),
              media_url: p.media_url ?? null, media_type: p.media_type ?? null,
              needs_media: p.needs_media,
            })),
          } : {}),
        },
      };
      if (data.answer_key_text !== undefined) akPayload.answer_key_text = data.answer_key_text;
      const res = ak
        ? await supabase.from("case_answer_keys").update(akPayload).eq("case_id", id)
        : await supabase.from("case_answer_keys").insert({ case_id: id, ...akPayload });
      if (res.error) return json(500, { error: "Answer key sync failed", detail: res.error.message });
    }

    const updated = await loadFull(id);
    console.log(`[case-admin] Updated id=${id} fields=${Object.keys(patch).join(",")}`);
    return json(200, { ok: true, id, changed_fields: [...Object.keys(patch), ...(data.properties ? ["properties"] : []), ...(data.digital_properties ? ["digital_properties"] : [])], rubric: summary, case: updated });
  }

  return json(405, { error: "Method not allowed (use GET or PATCH)" });
});
