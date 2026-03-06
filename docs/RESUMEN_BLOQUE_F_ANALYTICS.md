# Resumen: Bloque F — Analytics

**Plan:** [PLAN_EJECUCION_POR_IMPACTO.md](./PLAN_EJECUCION_POR_IMPACTO.md)

---

## Hecho

- **useAnalyticsData.js** creado: toda la lógica derivada (parseISODate, semanas, métricas actual vs anterior, trendInfo, topBy, topMasVendidos, topMasRentables, recetasSinVenta7, ventas30diasForPeak, ingresoPorDia/Hora, diaPico/horaPico, ventasMes, proyecciones, mejorCliente, pieData, etc.) dentro de un `useMemo` que recibe ventas, recetas, clientes, recetaIngredientes, insumos, gastosFijos.
- **Analytics.jsx** reducido a contenedor: importa useAnalyticsData, pasa props a AnalyticsSemana, AnalyticsProductos, AnalyticsGraficos. Cabecera con comentario de contexto.
- Build y tests: OK.

## Archivos

| Archivo | Acción |
|---------|--------|
| src/hooks/useAnalyticsData.js | Creado |
| src/components/analytics/Analytics.jsx | Modificado (solo orquestación) |

## Comentarios (convención)

- useAnalyticsData: JSDoc con qué hace, quién lo usa, @param y @returns.
- Analytics.jsx: cabecera "Contenedor: orquesta; lógica en useAnalyticsData".
