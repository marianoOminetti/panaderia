# Reporte técnico — Mejoras, legacy y métricas

**Fecha:** 5 de marzo de 2025  
**Rol:** Dev Lead / Auditoría FASE 0  
**Proyecto:** Panadería (React + Supabase)

---

## 1. Resumen ejecutivo

- **Líneas totales en `src/`:** ~14.490 (JS/JSX/CSS)
- **Archivos en `src/`:** 76 (JS/JSX) + 2 CSS
- **God objects (>300 líneas):** 8 archivos
- **Estado global:** Sin Context API; estado concentrado en `App.js` y pasado por props
- **Tests:** 1 archivo (`App.test.js`), test por defecto de CRA (probablemente desactualizado)

---

## 2. Líneas por archivo (top 40)

| Líneas | Archivo |
|--------|---------|
| 1284 | `src/components/insumos/Insumos.jsx` |
| 814 | `src/components/ventas/Ventas.jsx` |
| 736 | `src/components/clientes/ClienteDetalle.jsx` |
| 495 | `src/components/recetas/Recetas.jsx` |
| 489 | `src/components/dashboard/DashboardAlerts.jsx` |
| 432 | `src/components/analytics/Analytics.jsx` |
| 425 | `src/components/plan/PlanSemanal.jsx` |
| 386 | `src/components/insumos/InsumosCompra.jsx` |
| 369 | `src/components/stock/Stock.jsx` |
| 319 | `src/components/ventas/VentasList.jsx` |
| 302 | `src/components/gastos/GastosFijos.jsx` |
| 297 | `src/components/ventas/VentasManualScreen.jsx` |
| 289 | `src/components/ventas/VentasCart.jsx` |
| 286 | `src/components/dashboard/Dashboard.jsx` |
| 283 | `src/components/plan/PlanSemanalTable.jsx` |
| 282 | `src/components/stock/StockProductionModal.jsx` |
| 273 | `src/hooks/useStockMutations.js` |
| 257 | `src/components/analytics/AnalyticsSemana.jsx` |
| 251 | `src/hooks/useAppData.js` |
| 249 | `src/components/ui/DatePicker.jsx` |
| 243 | `src/components/clientes/ClienteFormModal.jsx` |
| 242 | `src/App.js` |
| 240 | `src/components/analytics/AnalyticsGraficos.jsx` |
| 223 | `src/components/stock/StockList.jsx` |
| 216 | `src/components/ui/SearchableCliente.jsx` |
| 191 | `src/components/AppContent.jsx` |
| 185 | `src/lib/stockPlan.js` |
| 152 | `src/components/ui/SearchableSelect.jsx` |
| 147 | `src/hooks/useVentasVoz.js` |
| 147 | `src/components/insumos/InsumosList.jsx` |
| 145 | `src/components/menu/MoreMenuScreen.jsx` |
| 142 | `src/components/ventas/VentasVoiceModal.jsx` |
| 140 | `src/lib/agrupadores.js` |
| 132 | `src/components/insumos/InsumosComposicion.jsx` |

**Lib / hooks / config (sin componentes):**  
273 (useStockMutations), 251 (useAppData), 185 (stockPlan), 147 (useVentasVoz), 140 (agrupadores), 131 (usePushSubscription), 131 (useInsumos), 120 (voiceInsumos), 105 (useClientes), 101 (voice), 95 (pushNotifications), 93 (usePlanResumen), 82 (errorReport, useSyncVentasPendientes), 77 (offlineVentas), 74 (stockMetrics), 72 (costos), 67 (usePlanSemanal), 64 (appConfig), 55 (format), 50 (useGastosFijos), 41 (contacts, useRecetas), 40 (metrics, useVentas), 38 (useAuth), 26 (supabaseClient), 23 (useFilterBySearch), 22 (units), 18 (notifyEvent), 17 (dates), 14 (nav).

---

## 3. God objects y archivos pesados

**>300 líneas (candidatos a dividir):**

1. **Insumos.jsx (1284)** — Pantalla principal de insumos: lista, compra, composición, modales, voz, carrito. Muchos `useState` (24+). Ideal dividir en subpantallas o hooks por flujo (lista, compra, composición).
2. **Ventas.jsx (814)** — Orquestador de ventas: manual, voz, carrito, selectores. Similar a Insumos.
3. **ClienteDetalle.jsx (736)** — Detalle de cliente, pedidos, ventas, formularios. Se puede extraer lógica a hooks y subcomponentes por sección.
4. **Recetas.jsx (495)** — CRUD recetas e ingredientes. Extraíble: lista, formulario, ingredientes.
5. **DashboardAlerts.jsx (489)** — Alertas y lógica de negocio. Revisar si parte puede ir a un hook o a lib.
6. **Analytics.jsx (432)** — Contenedor de pestañas y gráficos. Podría ser solo layout y delegar a hijos.
7. **PlanSemanal.jsx (425)** — Plan semanal. Tabla y acciones podrían vivir en componentes más acotados.
8. **InsumosCompra.jsx (386)** — Flujo de compra. Candidato a extraer estado a un hook (carrito, guardado).

**App.js (242)** — Por debajo de 300 pero concentra: tab, toasts, confirm, errorLog, isOnline, preloads y ~25 props a `AppContent`. Cumple rol de “orquestador”; si crece más, conviene Context o estado por dominio.

---

## 4. Dominios de negocio detectados

| Dominio | Componentes / hooks / lib | Observación |
|---------|---------------------------|-------------|
| **Ventas** | Ventas.jsx, VentasCart, VentasList, VentasManualScreen, VentasChargeModal, VentasVoiceModal, VentasSelectors; useVentas, useVentasVoz; offlineVentas | Bien agrupado en `ventas/`. Hooks separados. |
| **Stock** | Stock.jsx, StockList, StockProductionModal, StockVoiceModal; useStockMutations; stockPlan, stockMetrics | Concentrado en `stock/`. useStockMutations grande (273 líneas). |
| **Insumos** | Insumos.jsx, InsumosList, InsumosCompra, InsumosComposicion; useInsumos; voiceInsumos | Insumos.jsx muy grande; resto razonable. |
| **Recetas** | Recetas.jsx; useRecetas; costos (parcial) | Un solo componente gordo. |
| **Clientes** | Clientes.jsx, ClientesList, ClienteDetalle, ClienteFormModal; useClientes | ClienteDetalle muy grande. |
| **Dashboard** | Dashboard.jsx, DashboardAlerts, DashboardMetrics, DashboardQuickGrid | Alertas con mucha lógica en componente. |
| **Plan semanal** | PlanSemanal.jsx, PlanSemanalTable, PlanSemanalActions; usePlanSemanal, usePlanResumen | Coherente. |
| **Analytics** | Analytics.jsx, AnalyticsSemana, AnalyticsGraficos, AnalyticsProductos | Contenedor + subvistas. |
| **Gastos** | GastosFijos.jsx; useGastosFijos | Aislado. |
| **Auth / layout** | AuthScreen, ConfigMissing; AppHeader, AppNav, AppContent; useAuth | Sin Context; auth en hook. |

Estructura actual alineada con “un folder por dominio”; el problema es el **tamaño** de algunos archivos, no la ubicación.

---

## 5. Dependencias cruzadas e imports

- **Imports de `App`:** Solo `index.js` y `App.test.js` importan `App`. No hay componentes que importen `App` (no hay acoplamiento inverso).
- **Cliente Supabase:** Un solo lugar: `src/lib/supabaseClient.js`. Correcto.
- **Flujo de datos:** `App` → `useAppData` (y otros hooks) → estado en App → `AppContent` recibe ~25+ props y las reparte a Dashboard, Ventas, Stock, etc. Es **prop drilling** sin Context; funcional pero verboso y frágil ante cambios.

---

## 6. Queries y mutaciones Supabase

**Dónde están:**

- **useAppData.js:** Carga principal (insumos, recetas, ventas, receta_ingredientes, clientes, pedidos, stock, insumo_stock, insumo_movimientos, insumo_composicion, gastos_fijos, precio_historial). Un único `loadData` con `Promise.all`. Bien centralizado.
- **useVentas.js:** insert ventas, delete ventas.
- **useClientes.js:** delete cliente, delete ventas, insert pedidos.
- **useInsumos.js:** insert precio_historial, delete insumos.
- **useRecetas.js:** update recetas, delete/insert receta_ingredientes, delete recetas.
- **usePlanSemanal.js:** insert/upsert plan_semanal.
- **useGastosFijos.js:** insert gastos_fijos.
- **useSyncVentasPendientes.js:** insert ventas.
- **usePushSubscription.js:** insert/delete push_subscriptions.
- **pushNotifications.js:** insert push_subscriptions.

**Duplicación:** No hay queries duplicadas de carga; la carga está en `useAppData`. Las mutaciones están en hooks por dominio. Algunos hooks no revisan `error` de Supabase de forma uniforme (ver sección de mejoras).

---

## 7. Estado global y propagación

- **Context API:** No se usa (`createContext` no aparece).
- **Estado en App.js:** Tab, preloads (stock, ventas, nueva venta, stock manual), toast, confirm, errorLog, isOnline. Más todo lo que devuelve `useAppData` (insumos, recetas, ventas, clientes, stock, etc.) y callbacks (showToast, confirm, loadData, setRecetasFilterIds, setPlanSemanalVersion).
- **Prop drilling:** `AppContent` recibe más de 25 props y las pasa a cada pantalla. Añadir una pantalla nueva implica tocar App y AppContent.

**Recomendación:** No cambiar lógica ni UI; si en un refactor se quiere reducir props, se puede introducir un Context mínimo (por ejemplo “AppState”) solo para datos de `useAppData` + showToast/confirm, en una etapa dedicada.

---

## 8. Componentes: inventario y convenciones

**Por carpeta:**

- **components/analytics:** 4 (Analytics, AnalyticsGraficos, AnalyticsSemana, AnalyticsProductos)
- **components/auth:** 2 (AuthScreen, ConfigMissing)
- **components/clientes:** 4 (Clientes, ClientesList, ClienteDetalle, ClienteFormModal)
- **components/dashboard:** 4 (Dashboard, DashboardAlerts, DashboardMetrics, DashboardQuickGrid)
- **components/gastos:** 1 (GastosFijos)
- **components/insumos:** 4 (Insumos, InsumosList, InsumosCompra, InsumosComposicion)
- **components/layout:** 3 (AppHeader, AppNav, ErrorLogOverlay)
- **components/menu:** 1 (MoreMenuScreen)
- **components/plan:** 3 (PlanSemanal, PlanSemanalTable, PlanSemanalActions)
- **components/recetas:** 1 (Recetas)
- **components/stock:** 4 (Stock, StockList, StockProductionModal, StockVoiceModal)
- **components/ui:** 7 (ConfirmDialog, DatePicker, ProductSearchInput, SearchableCliente, SearchableSelect, Toast)
- **components/ventas:** 7 (Ventas, VentasCart, VentasChargeModal, VentasList, VentasManualScreen, VentasSelectors, VentasVoiceModal)
- **AppContent.jsx** (fuera de subcarpeta)

**Convenciones:** Nombres en PascalCase para componentes; hooks en camelCase (useVentas, useAppData, etc.). Coherente con lo indicado en el agente dev-lead.

---

## 9. Código legacy y riesgos

1. **Insumos.jsx (1284 líneas, 24+ useState)**  
   Mucha UI y estado en un solo archivo; difícil de mantener y testear. Ideal: extraer hooks por flujo (lista, compra, composición, voz) y subcomponentes por sección.

2. **App.test.js**  
   Test por defecto de CRA que busca "learn react"; no refleja la app actual. Conviene actualizarlo o reemplazarlo por un smoke test (p. ej. render de App con mock de auth/config).

3. **Manejo de errores de Supabase**  
   No todos los hooks revisan `error` y lo loguean o propagan de forma uniforme. Regla deseable: siempre `if (error) { console.error(...); throw error }` (o equivalente) después de cada llamada.

4. **Prop drilling (App → AppContent → pantallas)**  
   Aumenta fricción al agregar pantallas o nuevos datos globales. No es “legacy” en sí, pero es el principal punto de dolor arquitectónico.

5. **Límites hardcodeados**  
   En `useAppData`: límites 1000 (ventas), 1000 (pedidos), 100 (insumo_movimientos), 5000 (precio_historial). Podrían venir de config o constantes documentadas.

6. **Sin TypeScript**  
   Proyecto 100% JS; tipos implícitos. Cualquier migración a TS sería gradual (archivo por archivo).

---

## 10. Mejoras técnicas recomendadas (priorizadas)

**Alto impacto, bajo riesgo (hacer primero):**

1. **Actualizar o reemplazar App.test.js** por un smoke test que renderice la app (con mocks de useAuth/useAppData si hace falta) y compruebe que no rompe. No cambiar lógica de negocio.
2. **Estandarizar manejo de errores en hooks de Supabase:** en cada hook que use `supabase.from(...)`, revisar `error`, loguear con prefijo `[dominio/accion]` y, donde corresponda, hacer throw o callback de error.
3. **Documentar límites de datos** (1000 ventas, 5000 precio_historial, etc.) en un comentario en `useAppData` o en `config/appConfig.js`.

**Alto impacto, refactor acotado:**

4. **Dividir Insumos.jsx:**  
   - Extraer estado y lógica de “compra” a un hook `useInsumosCompra` (carrito, guardado, voz).  
   - Dejar en Insumos.jsx solo orquestación y tabs/vistas; que InsumosCompra use el hook.  
   Objetivo: bajar Insumos.jsx a &lt;400 líneas sin cambiar comportamiento.

5. **Dividir ClienteDetalle.jsx:**  
   - Extraer secciones (pedidos, ventas, edición) en componentes hijos.  
   - Opcional: hook `useClienteDetalle(id)` que traiga datos y acciones.  
   Objetivo: archivo &lt;300 líneas.

**Medio impacto (cuando se toque cada área):**

6. **Ventas.jsx:** Similar a Insumos: extraer hooks por flujo (manual, voz, carrito) y dejar el componente como orquestador.
7. **DashboardAlerts.jsx:** Mover lógica de cálculo de alertas a un hook o a `lib/` (por ejemplo `useDashboardAlerts(datos)`), componente solo presentacional.
8. **Recetas.jsx:** Extraer formulario de receta e ingredientes a componentes/hooks para bajar líneas.

**Bajo impacto / opcional:**

9. **Context para datos de App:** Si se añaden más pantallas o más datos globales, valorar un Context “AppState” con useAppData + showToast/confirm para reducir props de AppContent. Hacerlo en una etapa solo de refactor, sin cambiar lógica.
10. **Constantes de categorías/rutas:** Revisar que categorías (p. ej. en insumos) y rutas/tabs estén en `config/` y no repetidas en componentes.

---

## 11. Estructura de carpetas actual vs. propuesta mínima (referencia)

Estructura actual ya se parece a la propuesta del dev-lead:

```
src/
  components/
    analytics/
    auth/
    clientes/
    dashboard/
    gastos/
    insumos/
    layout/
    menu/
    plan/
    recetas/
    stock/
    ui/
    ventas/
  config/
  hooks/
  lib/
  utils/
  App.js
  AppContent.jsx
```

No es necesario mover carpetas ahora; el foco es **reducir tamaño de archivos** (Insumos, Ventas, ClienteDetalle, etc.) y **estandarizar errores y tests**.

---

## 12. Próximos pasos sugeridos

1. Corregir/actualizar `App.test.js` y ejecutar tests.
2. Añadir en cada hook de Supabase el bloque estándar de manejo de error y documentar límites en useAppData.
3. Elegir un god object (p. ej. Insumos.jsx) y aplicar un plan de refactor por etapas de ~30 min (extraer hook, luego subcomponentes), verificando que la app siga igual después de cada etapa.

Si querés, el siguiente paso puede ser un **plan de refactor por etapas** (tal como indica el dev-lead) solo para Insumos.jsx o para tests + errores, con archivos a crear/modificar y pasos de verificación y rollback.
