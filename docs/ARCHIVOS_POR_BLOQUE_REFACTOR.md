# Archivos por bloque — Próximo refactor

**Objetivo:** Ver en bloque los archivos candidatos a refactor (por dominio o por tamaño) para elegir el siguiente.

**Referencia:** [PLAN_REFACTOR_POR_FASES.md](./PLAN_REFACTOR_POR_FASES.md), [REPORTE_TECNICO_MEJORAS.md](./REPORTE_TECNICO_MEJORAS.md)

---

## Ya refactorizados (resúmenes en docs/)

| Bloque | Archivo(s) principal | Estado |
|--------|------------------------|--------|
| A | App.test.js, useAppData, hooks Supabase | Etapas 1–4 ✅ |
| B | Insumos.jsx | useInsumosCompra, useInsumosLista ✅ |
| C | ClienteDetalle.jsx | ClienteDetallePedidos, ClienteDetalleVentas ✅ |
| D | Dashboard.jsx / DashboardAlerts | useDashboardAlerts ✅ |
| E | Ventas.jsx | useVentasCart ✅ |
| Recetas | Recetas.jsx | useRecetasForm, RecetaModal, lib (parseDecimal, costoDesdeIngredientes) ✅ |

---

## Candidatos por dominio (orden sugerido para próximo bloque)

### Bloque Analytics
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/analytics/Analytics.jsx` | 432 | Contenedor pestañas + gráficos. Delegar a hijos o extraer estado por pestaña. |
| `src/components/analytics/AnalyticsSemana.jsx` | 257 | Subvista. |
| `src/components/analytics/AnalyticsGraficos.jsx` | ~240 | Subvista. |
| `src/components/analytics/AnalyticsProductos.jsx` | — | Subvista. |

### Bloque Plan semanal
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/plan/PlanSemanal.jsx` | 425 | Tabla + acciones; extraíble a hooks por flujo. |
| `src/components/plan/PlanSemanalTable.jsx` | 283 | Tabla. |
| `src/components/plan/PlanSemanalActions.jsx` | — | Acciones. |

### Bloque Insumos (seguir afinando)
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/insumos/InsumosCompra.jsx` | 386 | Flujo compra; candidato a hook de estado/carrito si no está ya. |
| `src/components/insumos/Insumos.jsx` | ~712 | Ya con hooks; revisar si queda estado suelto (Etapa 7 del plan). |

### Bloque Stock
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/stock/Stock.jsx` | 369 | Orquestador; extraíble estado/modales a hook. |
| `src/components/stock/StockProductionModal.jsx` | 282 | Modal producción. |
| `src/components/stock/StockList.jsx` | ~223 | Lista. |
| `src/hooks/useStockMutations.js` | 273 | Hook grande; revisar si se puede dividir por operación. |

### Bloque Ventas (seguir afinando)
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/ventas/Ventas.jsx` | ~753 | Ya useVentasCart; falta useVentasManual u otro flujo si aplica. |
| `src/components/ventas/VentasList.jsx` | 319 | Lista + filtros/edición. |
| `src/components/ventas/VentasManualScreen.jsx` | 297 | Pantalla venta manual. |
| `src/components/ventas/VentasCart.jsx` | 289 | Carrito. |

### Bloque Clientes (seguir afinando)
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/clientes/ClienteFormModal.jsx` | 243 | Formulario ABM cliente. |
| `src/components/clientes/ClienteDetalle.jsx` | ~335 | Ya con Pedidos/Ventas extraídos. |

### Bloque Dashboard (ya afinado)
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/dashboard/Dashboard.jsx` | 187 | useDashboardAlerts. |
| `src/components/dashboard/DashboardAlerts.jsx` | 489 | Presentacional; lógica en hook. |

### Bloque Gastos
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/components/gastos/GastosFijos.jsx` | 302 | Un solo componente; extraíble lista/form a hook o subcomponente. |

### Orquestador / raíz
| Archivo | Líneas (aprox) | Notas |
|---------|----------------|--------|
| `src/App.js` | 242 | Muchas props a AppContent; si crece, valorar Context por dominio. |
| `src/components/AppContent.jsx` | ~191 | Router y paso de props. |

---

## Cómo elegir el siguiente bloque

1. **Por impacto:** Los más grandes por dominio son Analytics (432), PlanSemanal (425), InsumosCompra (386), Stock (369).
2. **Por coherencia:** Seguir el mismo dominio (ej. afinar más Ventas o Insumos) o cerrar Analytics/Plan.
3. **Por riesgo:** Bloques con un solo archivo gordo (GastosFijos, Stock) son más fáciles de acotar.

Recomendación típica: **Analytics** o **Plan semanal** como siguiente bloque; o **Stock** si se prefiere un solo archivo grande (Stock.jsx + useStockMutations).
