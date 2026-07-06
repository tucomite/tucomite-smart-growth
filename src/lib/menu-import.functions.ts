import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ importId: z.string().uuid() });

const EXTRACTION_PROMPT = `Eres un extractor experto de cartas de restaurante.
Analiza la(s) imagen(es) o PDF adjuntos y devuelve EXCLUSIVAMENTE JSON válido con esta estructura:

{
  "dishes": [
    {
      "name": "string (obligatorio)",
      "category": "string o null",
      "sale_price": number o null,
      "description": "string o null",
      "confidence": number entre 0 y 1
    }
  ]
}

Reglas ESTRICTAS:
- NO inventes platos. Si dudas, no lo incluyas.
- NO inventes precios. Si no ves el precio con claridad, deja sale_price = null.
- NO inventes categorías. Si no ves la sección, deja category = null.
- sale_price siempre en euros como número (ej: 12.50), sin símbolos ni texto.
- confidence refleja tu certeza en la línea completa (nombre + precio + categoría).
- Devuelve solo JSON, sin markdown, sin comentarios, sin texto adicional.`;

type ExtractedDish = {
  name: string;
  category: string | null;
  sale_price: number | null;
  description: string | null;
  confidence: number;
};

function parseModelJson(raw: string): { dishes: ExtractedDish[] } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("La IA no devolvió un JSON válido.");
    parsed = JSON.parse(match[0]);
  }
  const dishesRaw = (parsed as { dishes?: unknown })?.dishes;
  if (!Array.isArray(dishesRaw)) {
    throw new Error("El JSON no contiene un array 'dishes'.");
  }
  const dishes: ExtractedDish[] = [];
  for (const d of dishesRaw) {
    if (!d || typeof d !== "object") continue;
    const obj = d as Record<string, unknown>;
    const name = typeof obj.name === "string" ? obj.name.trim() : "";
    if (!name) continue;
    const category = typeof obj.category === "string" && obj.category.trim() ? obj.category.trim() : null;
    const description =
      typeof obj.description === "string" && obj.description.trim() ? obj.description.trim() : null;
    let sale_price: number | null = null;
    if (typeof obj.sale_price === "number" && Number.isFinite(obj.sale_price) && obj.sale_price >= 0) {
      sale_price = Math.round(obj.sale_price * 100) / 100;
    } else if (typeof obj.sale_price === "string") {
      const n = Number(obj.sale_price.replace(/[€$£\s]/g, "").replace(",", "."));
      if (Number.isFinite(n) && n >= 0) sale_price = Math.round(n * 100) / 100;
    }
    let confidence = 0.5;
    if (typeof obj.confidence === "number" && Number.isFinite(obj.confidence)) {
      confidence = Math.max(0, Math.min(1, obj.confidence));
    }
    dishes.push({ name, category, sale_price, description, confidence });
  }
  return { dishes };
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  // Chunked base64 to avoid stack overflow on large PDFs.
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export const processMenuImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: imp, error: loadErr } = await supabase
      .from("menu_imports")
      .select("*")
      .eq("id", data.importId)
      .maybeSingle();
    if (loadErr) throw new Error(loadErr.message);
    if (!imp) throw new Error("Importación no encontrada");
    if (imp.source !== "pdf" && imp.source !== "photos") {
      throw new Error("Solo se procesan importaciones de PDF o fotografías");
    }
    if (imp.status === "confirmed") {
      return { status: "confirmed" as const, dishesCount: 0 };
    }

    // Mark processing
    await supabase
      .from("menu_imports")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", imp.id);

    try {
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("LOVABLE_API_KEY no configurada en el servidor");

      // Resolve files
      type FileRef = { path: string; mime: string; filename: string };
      const files: FileRef[] = [];
      if (imp.source === "pdf") {
        if (!imp.storage_path) throw new Error("Ruta del PDF no disponible");
        files.push({
          path: imp.storage_path,
          mime: "application/pdf",
          filename: imp.original_filename ?? "carta.pdf",
        });
      } else {
        const photos = (imp.extracted_json as { photos?: Array<{ path: string; name?: string }> } | null)
          ?.photos;
        if (!Array.isArray(photos) || photos.length === 0) {
          throw new Error("No hay fotografías registradas para esta importación");
        }
        for (const p of photos.slice(0, 8)) {
          if (!p?.path) continue;
          const ext = (p.name ?? p.path).split(".").pop()?.toLowerCase();
          const mime =
            ext === "png"
              ? "image/png"
              : ext === "webp"
                ? "image/webp"
                : ext === "heic"
                  ? "image/heic"
                  : "image/jpeg";
          files.push({ path: p.path, mime, filename: p.name ?? p.path.split("/").pop() ?? "foto" });
        }
      }
      if (files.length === 0) throw new Error("Sin ficheros para procesar");

      const content: Array<Record<string, unknown>> = [{ type: "text", text: EXTRACTION_PROMPT }];
      for (const f of files) {
        const { data: blob, error: dlErr } = await supabase.storage.from("menus").download(f.path);
        if (dlErr || !blob) throw new Error(`No se pudo descargar ${f.filename}: ${dlErr?.message ?? "desconocido"}`);
        const b64 = await blobToBase64(blob);
        if (f.mime === "application/pdf") {
          content.push({
            type: "file",
            file: {
              filename: f.filename,
              file_data: `data:${f.mime};base64,${b64}`,
            },
          });
        } else {
          content.push({
            type: "image_url",
            image_url: { url: `data:${f.mime};base64,${b64}` },
          });
        }
      }

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{ role: "user", content }],
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (res.status === 402) {
          throw new Error("Créditos IA agotados. Añade saldo para procesar cartas.");
        }
        if (res.status === 429) {
          throw new Error("Límite de peticiones IA superado. Reintenta en unos segundos.");
        }
        throw new Error(`Error IA ${res.status}: ${text.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawText = json.choices?.[0]?.message?.content ?? "";
      if (!rawText) throw new Error("La IA no devolvió contenido");
      const parsed = parseModelJson(rawText);
      if (parsed.dishes.length === 0) {
        throw new Error(
          "No se han detectado platos en el fichero. Revisa la calidad de la imagen o crea la carta manualmente.",
        );
      }

      const prevExtra =
        imp.extracted_json && typeof imp.extracted_json === "object" && !Array.isArray(imp.extracted_json)
          ? (imp.extracted_json as Record<string, unknown>)
          : {};
      const nextJson = { ...prevExtra, dishes: parsed.dishes };

      await supabase
        .from("menu_imports")
        .update({
          status: "needs_review",
          extracted_json: nextJson,
          error_code: null,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", imp.id);

      return { status: "needs_review" as const, dishesCount: parsed.dishes.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("menu_imports")
        .update({
          status: "failed",
          error_message: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", imp.id);
      throw new Error(msg);
    }
  });