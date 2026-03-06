# Resumen: Bloque D — DashboardAlerts (Etapa 11)

**Fecha:** 5 de marzo de 2025  
**Plan de referencia:** [PLAN_REFACTOR_POR_FASES.md](./PLAN_REFACTOR_POR_FASES.md) — Bloque D

---

## Objetivo del bloque

Mover el **cálculo** de las alertas del dashboard (stock bajo, margen bajo, pedidos próximos, grupos con deuda, alertas roja/amarilla, etc.) a un hook. El componente **DashboardAlerts.jsx** sigue siendo presentacional (solo recibe props y renderiza); la lógica vivía en **Dashboard.jsx** y pasó al hook.

---

## Qué se hizo

### ETAPA 11: Extraer useDashboardAlerts

**Archivo creado:** `src/hooks/useDashboardAlerts.js` (134 líneas)

**Movido al hook (misma lógica, sin cambiar fórmulas ni textos):**
- `stockBajo`: recetas con stock ≤ 0.
- `recetasMargenBajo`: recetas con margen &lt; 50%.
- `metricasStock`: resultado de `calcularMetricasVentasYStock(recetas, ventas, stock, METRICAS_VENTANA_DIAS)`.
- `alertaRoja` / `alertaAmarilla`: recetas según días restantes vs. `DIAS_ALERTA_ROJA` y `DIAS_ALERTA_AMARILLA`.
- Normalización y filtrado de pedidos: `pedidosList`, `pedidosConFecha`, `pedidosNormalizados`, `pedidosProximos`, `pedidosAgrupadosProximos`.
- Conteos por día: `pedidosHoyCount`, `pedidosManianaCountResumen`, `pedidosPasadoCount`.
- Pedidos para mañana: `pedidosManiana`, `pedidosManianaPorReceta`, `alertasPedidosManiana` (recetas con pedido mañana y stock insuficiente).
- Deuda: `gruposConDeuda`, `totalDeuda` (vía `getGruposConDeuda` y `totalDebeEnGrupo`).

**Entrada del hook:** `{ recetas, ventas, stock, pedidos }`.

**Salida del hook:** objeto con todas las propiedades anteriores, envuelto en `useMemo(..., [recetas, ventas, stock, pedidos])` para no recalcular en cada render.

**Dashboard.jsx:**
- Deja de calcular esas variables y llama `useDashboardAlerts({ recetas, ventas, stock, pedidos })`.
- Sigue calculando solo lo que usa **DashboardMetrics** y la sección "Últimas ventas hoy": `hoyStr`, `ventasHoy`, `ingresoHoy`, `costoUnitarioPorReceta`, `costHoy`, `margenHoy`, `debeTotal`.
- Pasa `alerts.*` a `<DashboardAlerts />` y `alerts.stockBajo` / `alerts.recetasMargenBajo` a `<DashboardQuickGrid />`.
- Se eliminan imports ya no usados: `DIAS_ALERTA_*`, `METRICAS_VENTANA_DIAS`, `agruparPedidos`, `getGruposConDeuda`, `totalDebeEnGrupo`, `calcularMetricasVentasYStock`.

**DashboardAlerts.jsx:** Sin cambios; sigue siendo presentacional y recibe las mismas props (ahora desde `alerts` en Dashboard).

---

## Verificación

- **Build:** `npm run build` — exitoso.
- **Tests:** `npm test -- --watchAll=false` — 1 test pasado.
- **Comportamiento:** Misma lógica y mismas fórmulas; solo cambia el lugar donde se calculan las alertas.

---

## Archivos tocados

| Archivo | Acción |
|---------|--------|
| `src/hooks/useDashboardAlerts.js` | Creado |
| `src/components/dashboard/Dashboard.jsx` | Modificado: uso del hook, eliminación de la lógica de alertas y de imports innecesarios |

---

## Métricas

| Métrica | Antes | Después |
|---------|--------|--------|
| Dashboard.jsx | ~287 líneas | 187 líneas |
| useDashboardAlerts.js | — | 134 líneas |
| DashboardAlerts.jsx | Sin cambios | Sigue presentacional |

---

## Próximos pasos (según el plan)

El plan contempla un **Bloque E** opcional (Ventas.jsx, Recetas.jsx, etc.) con el mismo formato de etapas.  
Instrucciones en [PLAN_REFACTOR_POR_FASES.md](./PLAN_REFACTOR_POR_FASES.md).
