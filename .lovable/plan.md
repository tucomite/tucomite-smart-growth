Objetivo: transformar la app actual en un producto listo para vender sin añadir páginas nuevas ni romper lo existente (landing, onboarding, auth, Carta). Solo elevamos calidad, dinamismo e inteligencia.

## 1. Datos 100% dinámicos (fin de los mocks)

Auditar todas las rutas de `_authenticated/*` y eliminar cualquier número, texto, ingrediente demo o array estático:

- `dashboard.tsx`, `carta.$dishId.tsx`, `marketing.tsx`, `comite.tsx`, `inventario.tsx`, `compras.tsx`, `rentabilidad.tsx`.
- Todo KPI se calcula desde `dishes`, `ingredients`, `suppliers`, `recommendations`, `committee_activity`, `dish_ingredients`.
- Eliminar `demoIngredients` del detalle de plato — si un plato no tiene ingredientes, mostrar estado vacío elegante ("El Chef IA aún no ha desglosado esta receta") con CTA para desglosarla, no datos ficticios.
- Textos del Comité (memoria, night report) generados desde `updated_at` y agregados reales, sin frases hardcodeadas.

## 2. IA contextual reactiva

Un único hook central `useRestaurantIntelligence()` que:

- Suscribe realtime (`supabase.channel`) a `dishes`, `ingredients`, `suppliers`, `recommendations`.
- Deriva en memoria: salud, margen medio, ahorro pendiente/conseguido, impacto económico, alertas de stock, ideas de marketing.
- Todos los módulos consumen este hook → cambiar un precio, aplicar una recomendación o editar stock recalcula Dashboard, Rentabilidad, Marketing y Comité sin refresco.

Habilitar realtime en migración: `ALTER PUBLICATION supabase_realtime ADD TABLE ...` para las 4 tablas clave.

## 3. Histórico + gráficos

Nueva tabla `daily_snapshots` (restaurant_id, date, saved_detected, saved_applied, recs_applied, recs_pending, avg_margin, stock_value, waste_estimate) con RLS + GRANTs.

- Trigger/función `snapshot_today()` que recalcula el snapshot del día en cada mutación relevante (upsert por `(restaurant_id, date)`).
- Backfill inicial de 30 días sintéticos derivados de los datos actuales del restaurante (curva realista basada en KPIs reales, no aleatorios puros) para que los gráficos tengan contenido desde el día 1.
- En `rentabilidad.tsx` (página ya existente) añadir tabs Hoy / Ayer / 7 días / 30 días con gráficos premium usando `recharts` (ya disponible vía shadcn `chart`): área para ahorro, línea para margen, barras para recomendaciones.

## 4. Timeline del Comité

En el Dashboard, nuevo bloque "Actividad del Comité" que lee `committee_activity` ordenado por `created_at desc` con hora `HH:mm`, icono por `type`, línea vertical tipo timeline.

- Función `simulate_committee_tick()` opcional (cron `*/15 min` vía pg_cron) que inserta 1-3 actividades derivadas del estado real (plato con margen bajo detectado, proveedor alternativo encontrado, etc.). Sin cron si el usuario prefiere ligereza: generar entradas al vuelo cuando se abre el Dashboard si la última actividad tiene > 30 min.
- Animación de entrada escalonada.

## 5. Modo Director General

Toggle premium (Switch shadcn con dos labels) arriba del Dashboard, estado en `localStorage` + `useState`.

- **Operativo** (actual): salud, recomendaciones detalladas, night report, timeline.
- **Director General**: 4 tarjetas grandes — Dinero ganado (mes), Dinero en juego (recs pendientes), Oportunidades top 3, Decisiones importantes. Tipografía enorme, sin jerga técnica, un solo scroll.

## 6. Explicaciones premium en cada recomendación

Extender tarjetas de recomendación con acordeón "Ver razonamiento del Comité" que responde:

- **¿Por qué?** — derivado de `problem` + datos (ej. "Margen 22% vs objetivo 65%").
- **¿Cómo se calculó?** — fórmula legible ("Δprecio × ventas mensuales = 1,40€ × 82 = 115€/mes").
- **¿Qué pasa si no haces nada?** — impacto negativo proyectado a 3 meses.
- **ROI** — tiempo de recuperación (impacto / esfuerzo estimado).
- **Riesgo** — nivel bajo/medio/alto con justificación (ej. subida de precio > 10% = riesgo medio).

Generador puro TypeScript `buildRationale(rec, context)` — 0 llamadas IA, 100% determinista sobre datos reales.

## 7. Animaciones premium

- `<AnimatedNumber>` (framer-motion) para todos los KPIs — cuenta desde 0 al montar y anima diffs cuando cambia el valor.
- `<AnimatedBar>` para barras de salud/margen.
- Entradas escalonadas (`staggerChildren`) en grids de tarjetas.
- Transiciones `layout` en toggle Operativo/Director.
- Nada de bounces exagerados: `ease: [0.22, 1, 0.36, 1]`, duraciones 0.3–0.6s.

## 8. Pulido tipo Apple/Linear

Barrido global de UI, sin nuevas features:

- Escala tipográfica coherente (display 48/40/32, body 15/14, caption 12) en Playfair + Inter.
- Espaciados en múltiplos de 4; secciones con `py-16` consistente.
- Sombras suaves `shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]` en tarjetas.
- Estados vacíos ilustrados en cada módulo (icono + título + subtítulo + CTA).
- Skeletons (shadcn `Skeleton`) en vez de spinners.
- Hover states sutiles (`hover:bg-muted/40`, translate-y-[-1px]).
- Focus rings dorados accesibles.
- Botón primario negro carbón con hover a `charcoal/90` y ring dorado en focus.
- Sidebar con item activo en dorado tenue, transiciones 200ms.
- Responsive: revisar breakpoints en Dashboard, Carta detalle y Rentabilidad (grids colapsan a 1 col < md).

## Detalles técnicos

**Migraciones**
1. `create table daily_snapshots` + GRANTs + RLS + policy `current_restaurant_id()`.
2. Función `refresh_daily_snapshot(rid uuid)` que hace UPSERT.
3. Triggers `AFTER INSERT/UPDATE` en `recommendations`, `dishes`, `ingredients` → llaman `refresh_daily_snapshot(current_restaurant_id())`.
4. `ALTER PUBLICATION supabase_realtime ADD TABLE dishes, ingredients, suppliers, recommendations, committee_activity, daily_snapshots;`
5. Función `backfill_snapshots_30d(rid uuid)` invocable desde onboarding/primer login.

**Nuevos archivos frontend** (sin nuevas rutas)
- `src/hooks/useRestaurantIntelligence.ts` — hook central + realtime.
- `src/lib/rationale.ts` — `buildRationale()`.
- `src/lib/snapshots.ts` — helpers de agregación.
- `src/components/ui/animated-number.tsx`
- `src/components/ui/animated-bar.tsx`
- `src/components/app/CommitteeTimeline.tsx`
- `src/components/app/DirectorModeToggle.tsx`
- `src/components/app/DirectorSummary.tsx`
- `src/components/app/HistoryCharts.tsx` (usado dentro de `rentabilidad.tsx`).
- `src/components/app/RecommendationRationale.tsx` (acordeón dentro de tarjetas existentes).

**Ficheros modificados** (sin cambiar contratos)
- `dashboard.tsx`, `rentabilidad.tsx`, `marketing.tsx`, `comite.tsx`, `carta.$dishId.tsx`, `carta.index.tsx`, `inventario.tsx`, `compras.tsx`, `AppShell.tsx`, `styles.css` (tokens de sombra/typo), `onboarding.tsx` (llamar backfill al terminar).

**No se toca**: landing, auth, `__root.tsx`, integraciones Supabase auto-generadas, esquema de `dishes/ingredients/suppliers/recommendations/committee_activity/profiles/restaurants`.

## Fuera de alcance
- Nuevas rutas o módulos.
- Cambios en la landing o el onboarding visual.
- Integración con IA externa (todo cálculo es determinista sobre datos reales).
- Sistema de notificaciones push / email.

## Verificación
- `tsgo` limpio.
- Aplicar una recomendación → ver Dashboard, Rentabilidad y Salud actualizarse sin refrescar (Playwright + screenshots).
- Toggle Director General cambia toda la vista con animación.
- Gráficos de 30 días renderizan datos reales del restaurante logueado.
