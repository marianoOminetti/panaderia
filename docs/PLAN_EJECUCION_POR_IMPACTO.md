# Plan de ejecución por impacto — Bloques pendientes

**Objetivo:** Ejecutar todos los bloques de refactor pendientes, ordenados por **impacto** (reducción de líneas y archivos pesados), con etapas concretas y verificables.

**Reglas (igual que el plan original):** Solo mover código; no cambiar lógica. Una etapa = un objetivo. Verificar build + humo tras cada etapa. Si hace falta cambiar lógica → parar y anotar deuda técnica.

**Comentarios:** En cada bloque se agregan comentarios de contexto (cabecera de archivo, contrato de hooks/componentes, secciones en archivos largos, "why" en lógica no obvia). Ver [CONVENCION_COMENTARIOS.md](./CONVENCION_COMENTARIOS.md).

**Referencias:** [PLAN_REFACTOR_POR_FASES.md](./PLAN_REFACTOR_POR_FASES.md), [ARCHIVOS_POR_BLOQUE_REFACTOR.md](./ARCHIVOS_POR_BLOQUE_REFACTOR.md)

---

## Estado previo (ya hecho)

| Bloque | Resumen |
|--------|--------|
| A | Etapas 1–4: smoke test, límites useAppData, console.error en hooks Supabase |
| B | useInsumosCompra, useInsumosLista; Insumos.jsx reducido |
| C | ClienteDetallePedidos, ClienteDetalleVentas; ClienteDetalle reducido |
| D | useDashboardAlerts; Dashboard/DashboardAlerts presentacional |
| E | useVentasCart en Ventas.jsx |
| Recetas | useRecetasForm, RecetaModal, parseDecimal/costoDesdeIngredientes en lib |

---

## Orden de ejecución por impacto

El impacto se midió por: **líneas en archivos >250** y **cantidad de archivos pesados** por dominio. Orden:

1. **Bloque F — Analytics** (~432 + 257 + 240 líneas) — Mayor archivo contenedor + subvistas.
2. **Bloque G — Stock** (~369 + 282 + 273) — Orquestador + modal + hook grande.
3. **Bloque H — Plan semanal** (~425 + 283) — PlanSemanal + tabla.
4. **Bloque I — Ventas (afinar)** (~753 + 319 + 297) — Reducir más Ventas.jsx y/o VentasList.
5. **Bloque J — Insumos (afinar)** — Etapa 7 del plan: revisar Insumos.jsx; opcional InsumosCompra.
6. **Bloque K — Gastos** (~302) — Un archivo; extraer hook o subcomponente.
7. **Bloque L — Clientes (afinar)** (~243 + 335) — ClienteFormModal o pulir ClienteDetalle.
8. **Bloque M — App/AppContent** (opcional, último) — 242 + 191; solo si se valora Context o reducir props.

---

## Bloque F — Analytics (impacto 1)

**Objetivo:** Analytics.jsx deja de tener toda la lógica derivada; pasa a ser presentacional (tabs + hijos).

### F.1 — Extraer useAnalyticsData

**Archivos a crear:** `src/hooks/useAnalyticsData.js`

**Archivos a modificar:** `src/components/analytics/Analytics.jsx`

**Lógica a mover (solo mover):**
- Helpers y datos derivados: `parseISODate`, `startOfWeek`, `endOfWeek`, `thisWeekStart`, `thisWeekEnd`, `prevWeekStart`, `prevWeekEnd`, `isBetween`, `montoVenta`, `costoUnitarioPorReceta`, `getCostoLinea`, `ventasConFecha`, `ventasSemanaActual`, `ventasSemanaAnterior`, `sumMetric`, todas las métricas (ingreso/costo/ganancia/margen actual vs anterior), `trendInfo` y los `trend*`, `topBy`, `topMasVendidos`, `topMasRentables`, `recetasSinVenta7`, `ventas30diasForPeak`, `diasSemana`, etc.
- El hook recibe: `ventas`, `recetas`, `clientes`, `recetaIngredientes`, `insumos`, `gastosFijos`.
- El hook devuelve un objeto con todos los valores que hoy usa el JSX (semanas, métricas, tops, datos para gráficos, etc.).

**Verificar:**
```bash
npm run build
npm test -- --watchAll=false
```
Browser: Analytics → pestañas Semana, Productos, Gráficos; mismos números y gráficos.

**Rollback:** Borrar `useAnalyticsData.js` y restaurar en `Analytics.jsx` el código movido.

---

### F.2 — Dejar Analytics.jsx solo como contenedor

**Archivos a modificar:** `src/components/analytics/Analytics.jsx`

**Objetivo:** Tras F.1, el componente solo importa `useAnalyticsData`, llama al hook con las props, y pasa los datos a `AnalyticsSemana`, `AnalyticsProductos`, `AnalyticsGraficos`. Sin lógica de cálculo en el componente.

**Comentarios (convención):** En `useAnalyticsData.js`, cabecera JSDoc (qué hace, params, return). En `Analytics.jsx`, cabecera actualizada ("Contenedor: tabs y paso de datos a Semana/Productos/Gráficos; lógica en useAnalyticsData").

**Verificar:** Mismo que F.1. Objetivo: Analytics.jsx < 150 líneas.

**Rollback:** Revertir a estado tras F.1.

---

## Bloque G — Stock (impacto 2)

**Objetivo:** Reducir Stock.jsx extrayendo estado y handlers a hooks por flujo (carrito, voz, pantalla manual).

### G.1 — Extraer useStockCart (carrito de producción)

**Archivos a crear:** `src/hooks/useStockCart.js`

**Archivos a modificar:** `src/components/stock/Stock.jsx`

**Lógica a mover (solo mover):**
- Estado: `stockCart`, `setStockCart`.
- Handlers: `addToStockCart`, `removeFromStockCart`, `updateStockCartQuantity`, y lo que aplique a “aplicar producción” / guardado del carrito (si está en el mismo flujo).
- El hook recibe lo que necesite (recetas, actualizarStock, etc.) y devuelve estado + handlers. Stock.jsx usa el hook y pasa a StockList / modales lo que corresponda.

**Verificar:**
```bash
npm run build
```
Browser: Stock → agregar al carrito, aplicar producción. Mismo flujo.

**Rollback:** Borrar `useStockCart.js` y restaurar en Stock.jsx.

---

### G.2 — Extraer useStockVoz (modal de voz)

**Archivos a crear:** `src/hooks/useStockVoz.js`

**Archivos a modificar:** `src/components/stock/Stock.jsx`

**Lógica a mover (solo mover):**
- Estado: `voiceModal`, `listening`, `transcript`, `parsedStock`, `savingVoice`; refs `recRef`, `transcriptRef`.
- Handlers: abrir/cerrar modal de voz, start/stop listening, parsear voz, guardar desde voz.
- Hook recibe dependencias (SpeechRecognitionAPI, parsearVozAVentas, actualizarStockBatch o lo que use). Stock.jsx usa el hook y pasa a StockVoiceModal.

**Verificar:** Stock → abrir modal voz, dictar, guardar. Mismo comportamiento.

**Rollback:** Borrar `useStockVoz.js` y restaurar en Stock.jsx.

---

### G.3 — Revisar Stock.jsx y dejar solo orquestación

**Archivos a modificar:** `src/components/stock/Stock.jsx`

**Objetivo:** Tras G.1 y G.2, Stock.jsx solo: imports, useStockCart, useStockVoz, estado restante (manualScreenOpen, manualSaving, preload) si no se movió, y JSX (lista, modales, FAB). Objetivo: Stock.jsx < 250 líneas.

**Verificar:** Build + flujo completo Stock (lista, producción, voz, manual).

**Rollback:** Revertir G.3.

---

## Bloque H — Plan semanal (impacto 3)

**Objetivo:** Reducir PlanSemanal.jsx extrayendo carga de datos y estado de semana/carrito a un hook.

### H.1 — Extraer usePlanSemanalScreen

**Archivos a crear:** `src/hooks/usePlanSemanalScreen.js`

**Archivos a modificar:** `src/components/plan/PlanSemanal.jsx`

**Lógica a mover (solo mover):**
- Estado: `weekStart`, `setWeekStart`, `planRows`, `setPlanRows`, `cartPlanItems`, `setCartPlanItems`, `loading`, `saving`, refs `weekStartRef`, `loadingErrorShownRef`.
- `cargarPlan` y el `useEffect` que llama a cargarPlan(weekStart).
- Handlers que modifican plan (guardar, aplicar a stock, etc.) si viven en PlanSemanal y son claramente de “pantalla”.
- El hook recibe: `fetchPlan`, `recetas`, `showToast`, `onRefresh`, `onPlanChanged`, y lo que necesite para insert/update/delete. Devuelve estado + cargarPlan + handlers.

**Verificar:**
```bash
npm run build
```
Browser: Plan semanal → cambiar semana, cargar, editar filas, guardar, aplicar a stock.

**Rollback:** Borrar `usePlanSemanalScreen.js` y restaurar en PlanSemanal.jsx.

---

### H.2 — PlanSemanal.jsx solo orquestación

**Archivos a modificar:** `src/components/plan/PlanSemanal.jsx`

**Objetivo:** Solo usePlanSemanal, usePlanSemanalScreen, y JSX (PlanSemanalTable, PlanSemanalActions). Objetivo: PlanSemanal.jsx < 200 líneas.

**Verificar:** Mismo flujo. Rollback: revertir H.2.

---

## Bloque I — Ventas (afinar) (impacto 4)

**Objetivo:** Ventas.jsx ya tiene useVentasCart; reducir más extrayendo flujo “venta manual” o “lista/edición”.

### I.1 — Extraer useVentasManual (opcional)

**Archivos a crear:** `src/hooks/useVentasManual.js`

**Archivos a modificar:** `src/components/ventas/Ventas.jsx`

**Lógica a mover (solo mover):**
- Estado y handlers exclusivos del flujo “pantalla manual” (selector de producto, cantidad, precio, agregar a carrito desde manual, etc.). No tocar useVentasCart ni edición.
- Hook recibe lo que necesite (recetas, addToCart del carrito si aplica, etc.). Ventas.jsx usa useVentasManual y pasa a VentasManualScreen.

**Verificar:** Ventas → venta manual → agregar ítems, cobrar. Igual que antes.

**Rollback:** Borrar useVentasManual.js y restaurar en Ventas.jsx.

---

### I.2 — Extraer estado/filtros de VentasList (opcional)

**Archivos a crear:** `src/hooks/useVentasList.js` (o similar)

**Archivos a modificar:** `src/components/ventas/VentasList.jsx`

**Lógica a mover (solo mover):** Estado de filtros (fecha, búsqueda, etc.) y lista derivada. VentasList queda presentacional. Solo si VentasList.jsx > 250 líneas y el movimiento es claro.

**Verificar:** Ventas → lista → filtrar, editar venta. Rollback definido.

---

## Bloque J — Insumos (afinar) (impacto 5)

**Objetivo:** Cerrar Etapa 7 del plan original; opcionalmente extraer estado de InsumosCompra si no está en useInsumosCompra.

### J.1 — Revisar Insumos.jsx (Etapa 7)

**Archivos a modificar:** `src/components/insumos/Insumos.jsx`

**Objetivo:** Confirmar que todo el estado está en useInsumosCompra y useInsumosLista. Si queda estado suelto de “composición” (compInsumoSel, compFactor, etc.) y es separable sin cambiar lógica, mover a useInsumosComposicion en una etapa aparte. Si no, anotar y dejar.

**Verificar:** Build. Browser: Insumos (lista, compra, composición). Objetivo: Insumos.jsx < 500 líneas si es posible.

**Rollback:** Revertir cambios.

---

### J.2 — InsumosCompra: hook de estado interno (opcional)

**Archivos a crear:** Solo si InsumosCompra.jsx tiene estado que no esté ya en useInsumosCompra: evaluar `useInsumosCompraForm` o similar para formulario/modal interno. Solo movimiento literal.

**Verificar y rollback:** Estándar.

---

## Bloque K — Gastos (impacto 6)

**Objetivo:** Reducir GastosFijos.jsx (~302 líneas) extrayendo lista y/o formulario.

### K.1 — Extraer useGastosFijosList (o useGastosFijos)

**Archivos a crear:** `src/hooks/useGastosFijos.js` (ya existe; revisar si la lógica de lista/form está en el componente y se puede subir al hook) o `src/hooks/useGastosFijosList.js` si el hook actual solo hace CRUD.

**Archivos a modificar:** `src/components/gastos/GastosFijos.jsx`

**Lógica a mover (solo mover):** Estado de lista, filtros, modal de edición/alta, y handlers (openEdit, save, delete). GastosFijos.jsx queda presentacional o con mínimo estado.

**Verificar:** Build. Browser: Gastos fijos → listar, agregar, editar, eliminar.

**Rollback:** Revertir y, si se creó hook nuevo, borrarlo.

---

## Bloque L — Clientes (afinar) (impacto 7)

**Objetivo:** Opcional; ClienteDetalle ya refactorizado. Si ClienteFormModal o ClienteDetalle siguen pesados, una etapa por archivo.

### L.1 — ClienteFormModal: extraer hook de formulario (opcional)

**Archivos a crear:** `src/hooks/useClienteForm.js` (o similar)

**Archivos a modificar:** `src/components/clientes/ClienteFormModal.jsx`

**Lógica a mover (solo mover):** Estado del form (nombre, teléfono, etc.) y validación/guardado. Modal queda presentacional. Solo si el archivo es > 200 líneas y el movimiento es obvio.

**Verificar y rollback:** Estándar.

---

## Bloque M — App / AppContent (impacto 8, opcional)

**Objetivo:** Último; solo si se quiere atacar “props drilling” o reducir App.js.

### M.1 — Documentar props y valorar Context (sin implementar)

**Archivos a modificar:** `docs/` o comentarios en `App.js`

**Objetivo:** Listar las props que App pasa a AppContent; anotar si en el futuro conviene un Context (ej. AuthContext, ToastContext). No cambiar código aún; solo planificación.

---

### M.2 — Extraer estado de UI de App a un hook (opcional)

**Archivos a crear:** `src/hooks/useAppUI.js` (o similar)

**Archivos a modificar:** `src/App.js`

**Lógica a mover (solo mover):** Estado de tab activo, toasts, confirm, errorLog, isOnline si es posible, sin cambiar flujo. App.js solo llama al hook y pasa valores a AppContent. Solo si el movimiento es literal y no obliga a tocar muchos hijos.

**Verificar:** Build + humo completo. Rollback: revertir.

---

## Resumen de orden de ejecución

| Orden | Bloque | Etapas | Objetivo de líneas (aprox) |
|-------|--------|--------|----------------------------|
| 1 | F — Analytics | F.1, F.2 | Analytics.jsx < 150 |
| 2 | G — Stock | G.1, G.2, G.3 | Stock.jsx < 250 |
| 3 | H — Plan semanal | H.1, H.2 | PlanSemanal.jsx < 200 |
| 4 | I — Ventas afinación | I.1, I.2 (opc) | Ventas.jsx menor; VentasList si aplica |
| 5 | J — Insumos afinación | J.1, J.2 (opc) | Insumos.jsx < 500 |
| 6 | K — Gastos | K.1 | GastosFijos.jsx < 200 |
| 7 | L — Clientes afinación | L.1 (opc) | ClienteFormModal más delgado |
| 8 | M — App (opc) | M.1, M.2 (opc) | Documentar; opcional useAppUI |

---

## Reglas de ejecución

1. **Una etapa a la vez:** Completar F.1, verificar, luego F.2. No pasar a G hasta que F esté estable.
2. **Build + test tras cada etapa:** `npm run build` y `npm test -- --watchAll=false`.
3. **Humo en browser** en el flujo afectado antes de seguir.
4. **Documentar:** Crear `docs/RESUMEN_BLOQUE_F_ANALYTICS.md` (y similares) al cerrar cada bloque.
5. **Deuda técnica:** Si en alguna etapa hace falta **cambiar lógica** (no solo mover), detenerse y anotar en el resumen del bloque y en PLAN_REFACTOR_POR_FASES (sección DEUDA TÉCNICA).
6. **QA:** Tras cada bloque, invocar qa-senior sobre los archivos tocados (según regla del workspace).
7. **Comentarios de contexto:** Al tocar archivos en cada bloque, aplicar [CONVENCION_COMENTARIOS.md](./CONVENCION_COMENTARIOS.md): cabecera en archivos nuevos (qué hace, quién lo usa, contrato params/return o props), cabecera actualizada en orquestadores, secciones `// --- ... ---` en archivos largos, y comentarios "why" en lógica no obvia. Así agentes y humanos tienen más contexto al leer el código.
