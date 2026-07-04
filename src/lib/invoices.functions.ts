import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { recordAuditEvent } from "@/lib/security/audit";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const bin = atob(clean);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as unknown as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function seedFromString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

const uploadInput = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  base64: z.string().min(1),
  supplier_id: z.string().uuid().optional().nullable(),
});

export const uploadInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => uploadInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Rate limit: 10 uploads/minute per user (OCR + storage are expensive).
    await enforceRateLimit({ key: `upload_invoice:user:${userId}`, max: 10, windowSec: 60 });

    if (!ALLOWED_MIME.has(data.mimeType)) {
      throw new Error(`unsupported_mime:${data.mimeType}`);
    }

    const bytes = base64ToBytes(data.base64);
    if (bytes.byteLength === 0) throw new Error("empty_file");
    if (bytes.byteLength > MAX_BYTES) throw new Error("file_too_large");

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("restaurant_id")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw profErr;
    const restaurant_id = profile?.restaurant_id;
    if (!restaurant_id) throw new Error("no_restaurant");

    const checksum = await sha256Hex(bytes);

    const { data: existing, error: dupErr } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("restaurant_id", restaurant_id)
      .eq("file_checksum", checksum)
      .maybeSingle();
    if (dupErr) throw dupErr;
    if (existing) {
      return { invoice_id: existing.id, deduped: true, status: existing.status };
    }

    const ext = EXT_BY_MIME[data.mimeType] ?? "bin";
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);

    const { data: inv, error: insErr } = await supabase
      .from("invoices")
      .insert({
        restaurant_id,
        supplier_id: data.supplier_id ?? null,
        status: "uploaded",
        storage_path: "pending",
        file_checksum: checksum,
        ocr_mode: "demo",
      })
      .select("id")
      .single();
    if (insErr) throw insErr;

    const storage_path = `${restaurant_id}/${inv.id}/${Date.now()}_${safeName}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("invoices")
      .upload(storage_path, bytes, { contentType: data.mimeType, upsert: false });
    if (upErr) {
      await supabase.from("invoices").delete().eq("id", inv.id);
      throw upErr;
    }

    const { error: updErr } = await supabase
      .from("invoices")
      .update({ storage_path })
      .eq("id", inv.id);
    if (updErr) throw updErr;

    return { invoice_id: inv.id, deduped: false, status: "uploaded" as const };
  });

const parseInput = z.object({ invoice_id: z.string().uuid() });

export const parseInvoiceDemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => parseInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Rate limit: 5 OCR runs/minute per user (expensive pipeline).
    await enforceRateLimit({ key: `parse_invoice:user:${userId}`, max: 5, windowSec: 60 });

    const { data: inv, error: invErr } = await supabase
      .from("invoices")
      .select("id, restaurant_id, status, ocr_mode")
      .eq("id", data.invoice_id)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!inv) throw new Error("invoice_not_found");
    if (inv.status !== "uploaded" && inv.status !== "failed") {
      throw new Error(`invalid_status:${inv.status}`);
    }
    if (inv.ocr_mode !== "demo") throw new Error("ocr_mode_not_demo");

    const started = Date.now();
    await recordAuditEvent({
      event_type: "ocr_started",
      severity: "info",
      source: "parse_invoice_demo",
      actor: "user",
      result: "success",
      user_id: userId,
      restaurant_id: inv.restaurant_id,
      metadata: { invoice_id: inv.id, mode: "demo" },
    });
    await supabase
      .from("invoices")
      .update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
        error_code: null,
        error_message: null,
      })
      .eq("id", inv.id);

    try {
      const { data: ings, error: ingErr } = await supabase
        .from("ingredients")
        .select("id, name, unit, current_price")
        .eq("restaurant_id", inv.restaurant_id)
        .order("name", { ascending: true });
      if (ingErr) throw ingErr;
      if (!ings || ings.length === 0) throw new Error("no_ingredients");

      const rng = mulberry32(seedFromString(inv.id));
      const maxLines = Math.min(6, ings.length);
      const nLines = Math.max(3, Math.min(maxLines, 3 + Math.floor(rng() * 4)));
      const pool = [...ings];
      const picked: typeof ings = [];
      for (let i = 0; i < nLines && pool.length; i++) {
        const idx = Math.floor(rng() * pool.length);
        picked.push(pool.splice(idx, 1)[0]);
      }

      const items: Array<Record<string, unknown>> = [];
      let subtotal = 0;
      let tax_total = 0;
      const tax_rate = 10;

      picked.forEach((ing, i) => {
        const qty = round4(1 + rng() * 9);
        const basePrice = Number(ing.current_price ?? 0) || 1;
        const variance = 0.92 + rng() * 0.16;
        const unit_price = round4(basePrice * variance);
        const net_amount = round2(qty * unit_price);
        const tax_amount = round2(net_amount * (tax_rate / 100));
        const total_amount = round2(net_amount + tax_amount);
        subtotal += net_amount;
        tax_total += tax_amount;
        items.push({
          restaurant_id: inv.restaurant_id,
          invoice_id: inv.id,
          line_number: i + 1,
          description: ing.name,
          quantity: qty,
          unit: ing.unit,
          base_quantity: qty,
          base_unit: ing.unit,
          conversion_factor: 1,
          unit_price,
          net_amount,
          tax_rate,
          tax_amount,
          total_amount,
          matched_ingredient_id: ing.id,
          confidence_score: 95,
          review_status: "pending",
        });
      });

      subtotal = round2(subtotal);
      tax_total = round2(tax_total);
      const total = round2(subtotal + tax_total);

      const { error: itemsErr } = await supabase
        .from("invoice_items")
        .insert(items as never);
      if (itemsErr) throw itemsErr;

      const { error: finErr } = await supabase
        .from("invoices")
        .update({
          status: "needs_review",
          processing_completed_at: new Date().toISOString(),
          ocr_provider: "demo",
          confidence_score: 95,
          subtotal,
          tax_total,
          total,
        })
        .eq("id", inv.id);
      if (finErr) throw finErr;

      await recordAuditEvent({
        event_type: "ocr_completed",
        severity: "info",
        source: "parse_invoice_demo",
        actor: "user",
        result: "success",
        user_id: userId,
        restaurant_id: inv.restaurant_id,
        duration_ms: Date.now() - started,
        metadata: { invoice_id: inv.id, lines: items.length },
      });
      return { invoice_id: inv.id, lines: items.length, subtotal, tax_total, total };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("invoices")
        .update({
          status: "failed",
          error_code: "demo_parser",
          error_message: msg,
          processing_completed_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
      await recordAuditEvent({
        event_type: "ocr_failed",
        severity: "error",
        source: "parse_invoice_demo",
        actor: "user",
        result: "failure",
        user_id: userId,
        restaurant_id: inv.restaurant_id,
        duration_ms: Date.now() - started,
        metadata: { invoice_id: inv.id, message: msg.slice(0, 200) },
      });
      throw err;
    }
  });

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select(
        "id, invoice_number, invoice_date, status, ocr_mode, supplier_id, subtotal, tax_total, total, currency, created_at, updated_at",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  });

const getInput = z.object({ id: z.string().uuid() });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => getInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: invoice, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (invErr) throw invErr;
    if (!invoice) throw new Error("invoice_not_found");

    const { data: items, error: itemsErr } = await supabase
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", data.id)
      .order("line_number", { ascending: true });
    if (itemsErr) throw itemsErr;

    return { invoice, items: items ?? [] };
  });

// ---------- P0.3: line review & apply-gating ----------

type ItemRow = {
  id: string;
  invoice_id: string;
  restaurant_id: string;
  matched_ingredient_id: string | null;
  base_quantity: number | null;
  unit_price: number | null;
  net_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  review_status: "pending" | "confirmed" | "ignored" | "needs_attention";
  ignored_reason: string | null;
};

async function loadItemWithInvoice(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  itemId: string,
) {
  const { data: item, error } = await supabase
    .from("invoice_items")
    .select("*, invoices!inner(id, status, restaurant_id)")
    .eq("id", itemId)
    .maybeSingle();
  if (error) throw error;
  if (!item) throw new Error("invoice_item_not_found");
  return item as ItemRow & { invoices: { id: string; status: string; restaurant_id: string } };
}

function amountsLookValid(row: {
  base_quantity: number | null;
  unit_price: number | null;
  net_amount: number | null;
  total_amount: number | null;
}): string | null {
  if (row.base_quantity == null || Number(row.base_quantity) <= 0) return "base_quantity_invalid";
  if (row.unit_price != null && Number(row.unit_price) < 0) return "unit_price_negative";
  if (row.net_amount != null && Number(row.net_amount) < 0) return "net_amount_negative";
  if (row.total_amount != null && Number(row.total_amount) < 0) return "total_amount_negative";
  return null;
}

const confirmInput = z.object({ invoice_item_id: z.string().uuid() });

export const confirmInvoiceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => confirmInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const item = await loadItemWithInvoice(supabase, data.invoice_item_id);

    if (item.invoices.status !== "needs_review") {
      throw new Error(`invalid_invoice_status:${item.invoices.status}`);
    }
    if (!item.matched_ingredient_id) throw new Error("missing_ingredient");

    const { data: ing, error: ingErr } = await supabase
      .from("ingredients")
      .select("id, restaurant_id")
      .eq("id", item.matched_ingredient_id)
      .maybeSingle();
    if (ingErr) throw ingErr;
    if (!ing || ing.restaurant_id !== item.restaurant_id) {
      throw new Error("ingredient_cross_tenant");
    }

    const amountErr = amountsLookValid(item);
    if (amountErr) throw new Error(amountErr);

    const { error: upErr } = await supabase
      .from("invoice_items")
      .update({ review_status: "confirmed", ignored_reason: null })
      .eq("id", item.id);
    if (upErr) throw upErr;

    return { ok: true, invoice_item_id: item.id, review_status: "confirmed" as const };
  });

const ignoreInput = z.object({
  invoice_item_id: z.string().uuid(),
  ignored_reason: z.string().trim().min(3).max(500),
});

export const ignoreInvoiceItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ignoreInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const item = await loadItemWithInvoice(supabase, data.invoice_item_id);
    if (item.invoices.status !== "needs_review") {
      throw new Error(`invalid_invoice_status:${item.invoices.status}`);
    }
    const { error: upErr } = await supabase
      .from("invoice_items")
      .update({ review_status: "ignored", ignored_reason: data.ignored_reason })
      .eq("id", item.id);
    if (upErr) throw upErr;
    return { ok: true, invoice_item_id: item.id, review_status: "ignored" as const };
  });

const matchInput = z.object({
  invoice_item_id: z.string().uuid(),
  ingredient_id: z.string().uuid(),
  confidence_score: z.number().min(0).max(100).optional(),
});

export const matchInvoiceItemToIngredient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => matchInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const item = await loadItemWithInvoice(supabase, data.invoice_item_id);
    const invStatus = item.invoices.status;
    if (invStatus === "applied" || invStatus === "reversed") {
      throw new Error(`invalid_invoice_status:${invStatus}`);
    }
    if (invStatus !== "needs_review") {
      throw new Error(`invalid_invoice_status:${invStatus}`);
    }

    const { data: ing, error: ingErr } = await supabase
      .from("ingredients")
      .select("id, restaurant_id")
      .eq("id", data.ingredient_id)
      .maybeSingle();
    if (ingErr) throw ingErr;
    if (!ing || ing.restaurant_id !== item.restaurant_id) {
      throw new Error("ingredient_cross_tenant");
    }

    const patch: Record<string, unknown> = { matched_ingredient_id: ing.id };
    if (data.confidence_score != null) patch.confidence_score = data.confidence_score;
    // Re-matching resets to pending so the user re-confirms explicitly.
    if (item.review_status !== "ignored") patch.review_status = "pending";

    const { error: upErr } = await supabase
      .from("invoice_items")
      .update(patch as never)
      .eq("id", item.id);
    if (upErr) throw upErr;
    return { ok: true, invoice_item_id: item.id, matched_ingredient_id: ing.id };
  });

const invoiceIdInput = z.object({ invoice_id: z.string().uuid() });

async function loadInvoiceAndItems(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  invoiceId: string,
) {
  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, restaurant_id, status, subtotal, tax_total, total")
    .eq("id", invoiceId)
    .maybeSingle();
  if (invErr) throw invErr;
  if (!inv) throw new Error("invoice_not_found");

  const { data: items, error: itemsErr } = await supabase
    .from("invoice_items")
    .select(
      "id, restaurant_id, matched_ingredient_id, base_quantity, unit_price, net_amount, tax_amount, total_amount, review_status, ignored_reason",
    )
    .eq("invoice_id", invoiceId);
  if (itemsErr) throw itemsErr;
  return { invoice: inv, items: (items ?? []) as ItemRow[] };
}

function computeValidation(
  invoice: { subtotal: number | null; tax_total: number | null; total: number | null },
  items: ItemRow[],
) {
  const blocking_errors: Array<{ code: string; item_id?: string; detail?: string }> = [];
  const warnings: Array<{ code: string; item_id?: string; detail?: string }> = [];

  const confirmed = items.filter((i) => i.review_status === "confirmed");
  const ignored = items.filter((i) => i.review_status === "ignored");
  const pending = items.filter((i) => i.review_status === "pending");
  const needsAttn = items.filter((i) => i.review_status === "needs_attention");

  if (confirmed.length === 0) blocking_errors.push({ code: "no_confirmed_lines" });

  for (const it of confirmed) {
    if (!it.matched_ingredient_id) {
      blocking_errors.push({ code: "confirmed_missing_ingredient", item_id: it.id });
    }
    const amountErr = amountsLookValid(it);
    if (amountErr) blocking_errors.push({ code: amountErr, item_id: it.id });
  }

  for (const it of pending) blocking_errors.push({ code: "line_pending", item_id: it.id });
  for (const it of needsAttn) blocking_errors.push({ code: "line_needs_attention", item_id: it.id });

  if (
    invoice.subtotal != null &&
    invoice.tax_total != null &&
    invoice.total != null &&
    Math.abs(Number(invoice.subtotal) + Number(invoice.tax_total) - Number(invoice.total)) > 0.02
  ) {
    blocking_errors.push({ code: "totals_mismatch" });
  }

  const confirmedNet = confirmed.reduce((s, it) => s + Number(it.net_amount ?? 0), 0);
  if (invoice.subtotal != null && confirmed.length > 0) {
    const diff = Math.abs(confirmedNet - Number(invoice.subtotal));
    if (diff > 0.05 && diff / Math.max(1, Number(invoice.subtotal)) > 0.02) {
      warnings.push({
        code: "confirmed_net_vs_subtotal_diverges",
        detail: diff.toFixed(2),
      });
    }
  }

  const affected = Array.from(
    new Set(
      confirmed
        .map((i) => i.matched_ingredient_id)
        .filter((x): x is string => typeof x === "string"),
    ),
  );

  return {
    confirmed_count: confirmed.length,
    ignored_count: ignored.length,
    pending_count: pending.length,
    needs_attention_count: needsAttn.length,
    blocking_errors,
    warnings,
    can_apply: blocking_errors.length === 0,
    expected_movements_count: confirmed.length,
    affected_ingredient_ids: affected,
  };
}

export const getInvoiceValidationSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => invoiceIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { invoice, items } = await loadInvoiceAndItems(context.supabase, data.invoice_id);
    return {
      invoice_id: invoice.id,
      status: invoice.status,
      ...computeValidation(invoice, items),
    };
  });

export const validateInvoiceForApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => invoiceIdInput.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Rate limit: 20 promotions/minute per user (guards apply pipeline).
    await enforceRateLimit({ key: `validate_apply:user:${userId}`, max: 20, windowSec: 60 });

    const { invoice, items } = await loadInvoiceAndItems(supabase, data.invoice_id);

    if (invoice.status !== "needs_review") {
      return {
        promoted: false,
        status: invoice.status,
        ...computeValidation(invoice, items),
        blocking_errors: [
          { code: `invalid_invoice_status:${invoice.status}` },
          ...computeValidation(invoice, items).blocking_errors,
        ],
        can_apply: false,
      };
    }

    const summary = computeValidation(invoice, items);
    if (!summary.can_apply) {
      return { promoted: false, status: invoice.status, ...summary };
    }

    const { error: upErr } = await supabase
      .from("invoices")
      .update({ status: "ready_to_apply", error_code: null, error_message: null })
      .eq("id", invoice.id)
      .eq("status", "needs_review"); // guard against races
    if (upErr) throw upErr;

    return { promoted: true, status: "ready_to_apply" as const, ...summary };
  });
