import jsPDF from "jspdf";
import type { Intelligence } from "@/hooks/useRestaurantIntelligence";
import type { EnrichedRec, Risk, Goal } from "./recommendationIntel";

const GOLD: [number, number, number] = [201, 169, 114];
const INK: [number, number, number] = [20, 20, 24];
const MUTED: [number, number, number] = [110, 110, 120];

function eur(n: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

export function generateOwnerReport(
  ctx: Intelligence,
  enriched: EnrichedRec[],
  risks: Risk[],
  goals: Goal[],
  simulation: { gainMonthly: number; annualImpact: number; paybackDays: number },
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 56;
  let y = 0;

  // Cover
  doc.setFillColor(15, 15, 18);
  doc.rect(0, 0, W, H, "F");
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("TUCOMITÉ · INFORME EJECUTIVO", M, 90);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.text("Estado de tu restaurante", M, 160, { maxWidth: W - M * 2 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.setTextColor(180, 180, 190);
  doc.text(
    ctx.restaurantName || "Tu restaurante",
    M,
    200,
  );
  doc.setFontSize(11);
  doc.setTextColor(140, 140, 150);
  doc.text(
    new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date()),
    M,
    220,
  );

  // Cover metrics
  const metrics: [string, string][] = [
    ["Salud", `${ctx.kpis.healthScore}/100 · ${ctx.kpis.healthState}`],
    ["Margen medio", `${ctx.kpis.avgMargin.toFixed(1)}%`],
    ["Ahorro mensual detectado", eur(ctx.kpis.savedDetected)],
    ["Impacto anual estimado", eur(simulation.annualImpact)],
  ];
  let my = 320;
  metrics.forEach(([k, v]) => {
    doc.setDrawColor(60, 60, 70);
    doc.line(M, my, W - M, my);
    doc.setFontSize(10);
    doc.setTextColor(140, 140, 150);
    doc.text(k.toUpperCase(), M, my + 18);
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(v, W - M, my + 18, { align: "right" });
    my += 40;
  });
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 130);
  doc.text("Preparado por el Comité · Confidencial", M, H - 40);

  // ---------- Page 2: Priorities ----------
  doc.addPage();
  y = M;
  section(doc, y, "Prioridades del Comité", "Las 3 decisiones con mayor impacto ahora mismo.");
  y += 60;
  const top3 = [...enriched].sort((a, b) => b.score - a.score).slice(0, 3);
  top3.forEach((e, idx) => {
    doc.setDrawColor(230, 230, 232);
    doc.setFillColor(250, 249, 246);
    doc.roundedRect(M, y, W - M * 2, 110, 8, 8, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...GOLD);
    doc.text(`#${idx + 1} · ${e.area.toUpperCase()}`, M + 16, y + 22);
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(e.rec.title, M + 16, y + 44, { maxWidth: W - M * 2 - 180 });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    const desc = e.rec.solution ?? e.rec.problem ?? "";
    doc.text(doc.splitTextToSize(desc, W - M * 2 - 180), M + 16, y + 62);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...GOLD);
    doc.text(`+${eur(e.monthlyImpact)}/mes`, W - M - 16, y + 40, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(
      `Score ${e.score} · Éxito ${e.probability}% · Confianza ${e.confidence}`,
      W - M - 16,
      y + 60,
      { align: "right" },
    );
    y += 122;
  });

  // ---------- Page 3: Opportunities ----------
  doc.addPage();
  y = M;
  section(doc, y, "Oportunidades detectadas", "Ordenadas por impacto económico mensual.");
  y += 60;
  const opps = enriched
    .filter((e) => e.monthlyImpact > 0 && e.rec.status === "pending")
    .sort((a, b) => b.monthlyImpact - a.monthlyImpact);
  opps.forEach((e) => {
    if (y > H - 80) { doc.addPage(); y = M; }
    row(doc, y, e.rec.title, `+${eur(e.monthlyImpact)}/mes`, e.area);
    y += 34;
  });

  // ---------- Page 4: Risks ----------
  doc.addPage();
  y = M;
  section(doc, y, "Riesgos activos", "Situaciones que restan margen si no se atienden.");
  y += 60;
  risks.slice(0, 15).forEach((r) => {
    if (y > H - 80) { doc.addPage(); y = M; }
    row(doc, y, r.title, r.detail, `${r.severity.toUpperCase()} · ${r.area}`);
    y += 34;
  });

  // ---------- Page 5: Goals + Simulation ----------
  doc.addPage();
  y = M;
  section(doc, y, "Objetivos del trimestre", "Progreso actual sobre las metas del restaurante.");
  y += 60;
  goals.forEach((g) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(g.title, M, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(`${g.current} → ${g.target}`, W - M, y, { align: "right" });
    y += 8;
    doc.setFillColor(235, 233, 226);
    doc.rect(M, y, W - M * 2, 6, "F");
    doc.setFillColor(...GOLD);
    doc.rect(M, y, ((W - M * 2) * g.progress) / 100, 6, "F");
    y += 26;
  });

  y += 20;
  section(doc, y, "Qué ocurrirá si haces caso al Comité", "Simulación basada en las recomendaciones activas.");
  y += 60;
  const simRows: [string, string][] = [
    ["Beneficio mensual actual", eur(ctx.kpis.monthlyProfit)],
    ["Ganancia mensual estimada", `+${eur(simulation.gainMonthly)}`],
    ["Impacto anual estimado", `+${eur(simulation.annualImpact)}`],
    ["Tiempo de recuperación", `${simulation.paybackDays} días`],
  ];
  simRows.forEach(([k, v]) => {
    doc.setDrawColor(230, 230, 232);
    doc.line(M, y, W - M, y);
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(k, M, y + 18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(v, W - M, y + 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 36;
  });

  // Footer on last page
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(
    "Este informe ha sido preparado por TuComité, el comité inteligente de tu restaurante.",
    M,
    H - 40,
  );

  const filename = `TuComite_${(ctx.restaurantName || "restaurante").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

function section(doc: jsPDF, y: number, title: string, subtitle: string) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text("INFORME EJECUTIVO", 56, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...INK);
  doc.text(title, 56, y + 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text(subtitle, 56, y + 46);
}

function row(doc: jsPDF, y: number, title: string, right: string, tag: string) {
  const W = doc.internal.pageSize.getWidth();
  const M = 56;
  doc.setDrawColor(230, 230, 232);
  doc.line(M, y + 26, W - M, y + 26);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(title, M, y + 12, { maxWidth: W - M * 2 - 160 });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(tag, M, y + 24);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(right, W - M, y + 12, { align: "right" });
  doc.setFont("helvetica", "normal");
}