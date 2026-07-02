import type { Recommendation, Intelligence } from "@/hooks/useRestaurantIntelligence";

const currency = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export type Rationale = {
  why: string;
  how: string;
  ifNothing: string;
  roi: string;
  risk: { level: "Bajo" | "Medio" | "Alto"; note: string };
};

export function buildRationale(rec: Recommendation, ctx: Intelligence): Rationale {
  const impact = Number(rec.economic_impact ?? 0);
  const priority = rec.priority || "medium";
  const relatedDish = ctx.dishes.find(
    (d) => rec.title && rec.title.toLowerCase().includes(d.name.toLowerCase()),
  );

  // Why — anclado a datos
  let why: string;
  if (relatedDish && relatedDish.margin != null && relatedDish.target_margin != null) {
    why = `El plato ${relatedDish.name} tiene un margen del ${Number(relatedDish.margin).toFixed(
      0,
    )}% frente a un objetivo del ${Number(relatedDish.target_margin).toFixed(0)}%. Con ${relatedDish.monthly_sales ?? 0} ventas al mes, cada punto de margen cuenta.`;
  } else if (rec.problem) {
    why = rec.problem;
  } else {
    why = "El Comité detecta un patrón por debajo de los umbrales de referencia del sector.";
  }

  // How — fórmula legible
  let how: string;
  if (relatedDish && relatedDish.recommended_price != null && relatedDish.sale_price != null) {
    const delta = Number(relatedDish.recommended_price) - Number(relatedDish.sale_price);
    const sales = Number(relatedDish.monthly_sales ?? 0);
    how = `Δprecio × ventas mensuales = ${currency.format(delta)} × ${sales} = ${currency.format(
      Math.max(0, delta * sales),
    )}/mes.`;
  } else if (impact > 0) {
    how = `Impacto derivado de comparar tus precios de compra actuales con la mejor alternativa activa en el sistema: ${currency.format(
      impact,
    )}/mes recuperables.`;
  } else {
    how = "Cálculo cualitativo — impacto operativo o de imagen sin cifra directa asociada.";
  }

  // If nothing
  const threeMonth = impact * 3;
  const ifNothing =
    impact > 0
      ? `En 3 meses dejarás de ingresar aproximadamente ${currency.format(
          threeMonth,
        )}. El problema no se corrige solo: se acumula con cada servicio.`
      : rec.time_impact
        ? `Seguirás perdiendo ${rec.time_impact} recurrentes, sin visibilidad ni control.`
        : "El diagnóstico persistirá y aparecerá en cada informe futuro hasta que se resuelva.";

  // ROI
  const effort = priority === "high" ? 2 : priority === "low" ? 14 : 7; // días
  const roiDays = impact > 0 ? Math.max(1, Math.round((effort * 40) / Math.max(1, impact / 30))) : effort;
  const roi =
    impact > 0
      ? roiDays <= 7
        ? `Menos de una semana. Coste operativo ≈ ${effort} días, retorno ≈ ${currency.format(
            impact,
          )}/mes.`
        : `Aproximadamente ${Math.ceil(roiDays / 7)} semanas para recuperar el esfuerzo invertido.`
      : `Retorno operativo — ${effort} días de trabajo para consolidar la mejora.`;

  // Risk
  let risk: Rationale["risk"];
  if (relatedDish && relatedDish.recommended_price != null && relatedDish.sale_price != null) {
    const pct =
      ((Number(relatedDish.recommended_price) - Number(relatedDish.sale_price)) /
        Math.max(0.01, Number(relatedDish.sale_price))) *
      100;
    if (pct > 12) risk = { level: "Alto", note: `Subida de precio ${pct.toFixed(0)}% — comunícalo con narrativa.` };
    else if (pct > 5) risk = { level: "Medio", note: `Subida moderada del ${pct.toFixed(0)}%, aceptada por la mayoría de clientes recurrentes.` };
    else risk = { level: "Bajo", note: "Cambio imperceptible para el cliente medio." };
  } else if (priority === "high") {
    risk = { level: "Medio", note: "Acción prioritaria — planifica y comunica al equipo antes de ejecutar." };
  } else {
    risk = { level: "Bajo", note: "Cambio interno sin impacto en la experiencia de sala." };
  }

  return { why, how, ifNothing, roi, risk };
}