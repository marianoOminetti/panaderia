# Estado del refactor (vista Dev Lead)

**Referencia:** [.cursor/agents/dev-lead.md](../.cursor/agents/dev-lead.md) — FASE 0 a FASE 4

---

## FASE 0 — Auditoría actual (post-refactor)

### God objects (>300 líneas) — situación actual

| Archivo | Antes (reporte original) | Ahora | Nota |
|---------|---------------------------|-------|------|
| Insumos.jsx | 1284 | **712** | useInsumosCompra + useInsumosLista; sigue siendo el más grande |
| Ventas.jsx | 814 | **753** | useVentasCart; sigue pesado |
| ClienteDetalle.jsx | 736 | **335** | ClienteDetallePedidos + ClienteDetalleVentas |
| Recetas.jsx | 495 | **284** | useRecetasForm + RecetaModal + lib |
| DashboardAlerts.jsx | 489 | 489 | Lógica en useDashboardAlerts; componente presentacional |
| Analytics.jsx | 432 | **91** | useAnalyticsData |
| PlanSemanal.jsx | 425 | **121** | usePlanSemanalScreen |
| InsumosCompra.jsx | 386 | 386 | Sin cambio en este ciclo |
| Stock.jsx | 369 | **305** | useStockCart + useStockVoz |
| GastosFijos.jsx | 302 | **259** | useGastosFijosForm |

**Hooks grandes (lógica movida):** useInsumosCompra 517, useAnalyticsData 408, usePlanSemanalScreen 391, useInsumosLista 235, useStockVoz 170. Aceptable: lógica en hooks, componentes delgados.

### Dependencias cruzadas

- **Imports desde App:** solo `index.js` y `App.test.js`. Correcto.
- **Supabase:** cliente en un solo lugar; queries en hooks (useVentas, useRecetas, useAppData, etc.).
- **Manejo de errores:** hooks con `console.error('[modulo/accion]', error)` o `reportError` según convención (Etapas 3–4 del plan).

### Estado global

- Sin Context API. Estado en App.js y pasado por props a AppContent. Documentado en APP_PROPS_Y_CONTEXT.md para posible evolución.

---

## ESTADO DEL REFACTOR (FASE 4)

### ✅ Completado

- **Bloque A:** Etapas 1–4 (smoke test, límites useAppData, console.error en hooks Supabase).
- **Bloque B:** useInsumosCompra, useInsumosLista; Insumos.jsx 1284 → 712.
- **Bloque C:** ClienteDetallePedidos, ClienteDetalleVentas; ClienteDetalle 736 → 335.
- **Bloque D:** useDashboardAlerts; Dashboard/DashboardAlerts presentacional.
- **Bloque E:** useVentasCart en Ventas.jsx.
- **Recetas:** useRecetasForm, RecetaModal, parseDecimal/costoDesdeIngredientes en lib; Recetas 495 → 284.
- **Bloque F:** useAnalyticsData; Analytics 432 → 91.
- **Bloque G:** useStockCart, useStockVoz; Stock 369 → 305.
- **Bloque H:** usePlanSemanalScreen; PlanSemanal 425 → 121.
- **Bloque K:** useGastosFijosForm; GastosFijos 302 → 259.
- **Bloque M:** Documentación APP_PROPS_Y_CONTEXT.md (sin cambio de código en App).

### ⏸️ No ejecutado en este ciclo (opcionales)

- **Bloque I (Ventas afinación):** useVentasManual / useVentasList — acoplamiento alto con cobro y edición.
- **Bloque J (Insumos Etapa 7):** Revisar estado suelto en Insumos.jsx; opcional useInsumosComposicion.
- **Bloque L (Clientes):** useClienteForm para ClienteFormModal — bajo impacto.

### ⏳ Pendiente (candidatos a siguiente)

Ver sección "Con qué seguir" más abajo.

### DEUDA TÉCNICA DETECTADA (no tocar ahora)

- Ninguna anotada en las etapas ejecutadas. Refactor fue mecánico (solo mover código).
- Si en Ventas o Insumos se intenta extraer más y aparece necesidad de cambiar lógica, detenerse y anotar aquí.

### ARCHIVOS MODIFICADOS / CREADOS (resumen)

**Hooks nuevos:** useAnalyticsData, useStockCart, useStockVoz, usePlanSemanalScreen, useGastosFijosForm, useRecetasForm, useVentasCart, useDashboardAlerts, useInsumosCompra, useInsumosLista.

**Componentes nuevos:** RecetaModal, ClienteDetallePedidos, ClienteDetalleVentas.

**Lib:** format (parseDecimal), costos (costoDesdeIngredientes).

**Componentes refactorizados:** Analytics, Stock, PlanSemanal, GastosFijos, Recetas, Ventas, Dashboard, Insumos, ClienteDetalle.

---

## Reglas del dev-lead respetadas

1. **No cambiar lógica** — solo movimiento de código.
2. **No cambiar UI** — sin cambios visuales.
3. **No agregar features** — solo refactor.
4. **Verificación** — build y tests OK tras los bloques ejecutados.
5. **Convenciones** — hooks camelCase, componentes PascalCase, comentarios de contexto aplicados.

---

## Con qué seguir (propuesta)

Ver documento **CON_QUE_SEGUIR.md** en esta misma carpeta. Ejecutadas: useVentasChargeModal, useInsumosComposicion. Pendientes/pospuestos: useVentasEdicion (acoplamiento), useVentasList (VentasList ya presentacional). Ver **RESUMEN_ETAPAS_CON_QUE_SEGUIR.md**.
