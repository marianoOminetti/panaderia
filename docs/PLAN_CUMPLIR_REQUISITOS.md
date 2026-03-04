# Plan para cumplir requisitos post-auditoría

**Objetivos:** App.js < 200 líneas, ningún archivo > 400 líneas, todas las queries en `/hooks/`, cliente Supabase único (ya OK).

---

## Resumen de fases

| Fase | Descripción | Orden |
|------|-------------|--------|
| **Fase 0** | Estilos: sacar de App.js a CSS | Primero (libera ~290 líneas en App) |
| **Fase 1** | Crear `src/hooks/` y mover todas las queries | Segundo |
| **Fase 2** | Reducir App.js a < 200 líneas usando hooks | Tercero |
| **Fase 3** | Partir componentes > 400 líneas | Cuarto |

---

## Fase 0: Estilos fuera de App.js

**Objetivo:** Eliminar el string `styles` de ~290 líneas en App.js.

### Pasos

1. **Crear o ampliar `src/App.css`**
   - Mover todo el contenido del template literal `styles` (desde `@import url(...)` hasta el último `}`) a `App.css`.
   - En `App.css` no hace falta envolver en nada; son reglas globales. Si ya existe `App.css`, reemplazar/añadir según corresponda.
   - Mantener las mismas clases (`.app`, `.header`, `.nav`, `.content`, etc.).

2. **En `src/index.js`**
   - Asegurar que se importe `./App.css` (o que `App.js` importe `./App.css` una sola vez).

3. **En `src/App.js`**
   - Eliminar la constante `const styles = \`...\`` completa (~líneas 19-308).
   - Eliminar todo `<style>{styles}</style>` y reemplazar por nada (los estilos ya vienen de App.css).
   - Buscar y reemplazar: `<><style>{styles}</style>` → `<>` y `</style></>` → `</>` donde aplique.

**Resultado:** App.js pierde ~290 líneas. Quedan ~825.

---

## Fase 1: Todas las queries en `/hooks/`

**Objetivo:** Crear `src/hooks/` y que toda lectura/escritura a Supabase pase por hooks (sin duplicar lógica).

### 1.1 Estructura de hooks propuesta

```
src/hooks/
  useAuth.js           # session, signOut (opcional: getSession ya usado en App)
  useAppData.js        # loadData + estado: insumos, recetas, ventas, clientes, pedidos, stock, insumoStock, etc.
  useStockMutations.js # actualizarStock, registrarMovimientoInsumo (o integrar en useAppData)
  usePlanResumen.js    # resumen plan semanal (o integrar en useAppData)
```

**Alternativa más simple:** Un solo hook `useAppData.js` que devuelva:
- Estado: `insumos`, `recetas`, `ventas`, `clientes`, `pedidos`, `stock`, `insumoStock`, `insumoMovimientos`, `insumoComposicion`, `precioHistorial`, `gastosFijos`, `resumenPlanSemanal`, `loading`, `seeded`, `planSemanalVersion`.
- Acciones: `loadData`, `actualizarStock`, `registrarMovimientoInsumo`, `consumirInsumosPorStock`, `syncVentasPendientes`, `setRecetasFilterIds`, `setPlanSemanalVersion`, `setSeeded`.
- Dependencias que necesitan los callbacks: `recetas`, `recetaIngredientes`, `insumos`, `insumoComposicion` (para consumirInsumosPorStock y resumen plan).

Las mutaciones que hoy están en **componentes** (Ventas, Clientes, Recetas, etc.) pueden quedarse en componentes pero **llamando a Supabase**; el requisito es “queries en hooks”. Opción:
- **A)** Solo la **carga** y las mutaciones que hoy están en **App** se mueven a hooks; los componentes siguen haciendo sus propios `supabase.from(...).insert/update/delete` (pero entonces “todas las queries en hooks” no se cumple).
- **B)** Crear hooks por dominio: `useVentas`, `useClientes`, `useRecetas`, `useInsumos`, `useGastosFijos`, `usePlanSemanal`, etc., y que cada componente use solo el hook (sin llamar a `supabase` directamente).

Para cumplir estrictamente “todas las queries en /hooks/”, hace falta **B**: hooks que encapsulen **todas** las llamadas a Supabase. El plan siguiente asume **B** con un hook global de datos + hooks de mutación donde aplique.

### Pasos concretos Fase 1

1. **Crear `src/hooks/useAppData.js`** (~200–250 líneas)
   - Mover de App.js: `loadData` (Promise.all de insumos, recetas, ventas, receta_ingredientes, clientes, pedidos, stock, insumo_stock, insumo_movimientos, insumo_composicion, gastos_fijos, precio_historial, plan_semanal si aplica).
   - Mover: seed de insumos cuando `insumos.length === 0`.
   - Estado: todos los `useState` de datos que hoy tiene App (insumos, recetas, ventas, …).
   - Devolver: `{ data, loadData, loading, seeded, setSeeded, setRecetasFilterIds, recetasFilterIds, planSemanalVersion, setPlanSemanalVersion, resumenPlanSemanal }` donde `data` sea un objeto con insumos, recetas, ventas, etc.

2. **Crear `src/hooks/useStockMutations.js`** (~80 líneas)
   - Recibe: `recetas`, y opcionalmente setters/estado de stock e insumo_stock (o los recibe del contexto/hook de datos).
   - Implementar: `actualizarStock(receta_id, delta)` (usa `supabase.from("stock").upsert`), `registrarMovimientoInsumo(...)` (insumo_stock + insumo_movimientos), `consumirInsumosPorStock(receta_id, cantidad)` (lógica actual de App).
   - Devolver: `{ actualizarStock, registrarMovimientoInsumo, consumirInsumosPorStock }`.
   - Este hook puede recibir `setStock`, `setInsumoStock`, `setInsumoMovimientos` desde `useAppData` para actualizar estado local tras cada mutación, o `useAppData` puede exponer “setters” y el hook llamarlos.

3. **Crear `src/hooks/usePlanResumen.js`** (~70 líneas)
   - Lógica actual del `useEffect` que hace `supabase.from("plan_semanal").select(...)` y `calcularRequerimientoInsumosParaItems`.
   - Inputs: recetas, recetaIngredientes, insumos, insumoComposicion, insumoStock, planSemanalVersion.
   - Devuelve: `resumenPlanSemanal`.

4. **Crear `src/hooks/useSyncVentasPendientes.js`** (~40 líneas)
   - Mover `syncVentasPendientes` de App; depende de `isOnline`, `actualizarStock`, `loadData`.

5. **Queries que siguen en componentes**
   - Para cumplir “todas en hooks”, hay que extraer:
     - **Ventas:** insert/delete ventas → `src/hooks/useVentas.js` (ej. `insertVentas(rows)`, `deleteVentas(ids)`).
     - **Clientes:** CRUD clientes, pedidos, ventas (marcar entregado) → `src/hooks/useClientes.js`.
     - **Recetas:** CRUD recetas y receta_ingredientes → `src/hooks/useRecetas.js`.
     - **Insumos:** update insumos, insert precio_historial, insumo_composicion → `src/hooks/useInsumos.js`.
     - **GastosFijos:** CRUD gastos_fijos → `src/hooks/useGastosFijos.js`.
     - **PlanSemanal:** select/upsert plan_semanal → `src/hooks/usePlanSemanal.js` (o extender useAppData/usePlanResumen).
   - Cada componente deja de importar `supabase` y usa solo el hook correspondiente.

**Orden sugerido:** Primero `useAppData` + `useStockMutations` + `usePlanResumen` + `useSyncVentasPendientes`, y App.js los consume. Luego, por componente, crear useVentas, useClientes, useRecetas, useInsumos, useGastosFijos, usePlanSemanal y refactorizar cada pantalla para usarlos.

**Resultado:** No hay llamadas a `supabase` fuera de `src/hooks/` (y de `lib/supabaseClient.js`). App.js solo usa hooks.

---

## Fase 2: App.js < 200 líneas

**Objetivo:** Después de Fase 0 y Fase 1, App.js debe tener solo: imports, uso de hooks, UI de layout (header, nav, tabs, Toast, ConfirmDialog), y renderizado por tab. Sin estilos inline, sin loadData ni callbacks de datos.

### Pasos

1. **Mover componentes pequeños a archivos**
   - `Toast` → `src/components/ui/Toast.jsx`
   - `ConfirmDialog` → `src/components/ui/ConfirmDialog.jsx`
   - `ConfigMissing` → `src/components/auth/ConfigMissing.jsx`
   - `AuthScreen` → `src/components/auth/AuthScreen.jsx`
   - `MoreMenuScreen` → `src/components/menu/MoreMenuScreen.jsx`
   - En App.js solo: `import ...` y uso en el JSX.

2. **App.js solo conserva**
   - Imports (react, errorReport, hooks, componentes de pantalla y UI).
   - `useAuth` o getSession (si lo encapsulás en hook) + `useAppData`, `useStockMutations`, `useSyncVentasPendientes`, etc.
   - Estado local mínimo: `session`, `authLoading`, `tab`, `toast`, `confirmState`, `errorLogOpen` (y lo que no esté en hooks).
   - Constantes de navegación: `NAV_TABS`, `MORE_MENU_ITEMS`, `isMoreSection`.
   - Render: ConfigMissing / auth loading / AuthScreen / contenido por tab / nav / Toast / ConfirmDialog.

3. **Contar líneas**
   - Objetivo: ≤ 199. Si sobra, extraer por ejemplo “contenido por tab” a un componente `AppContent.jsx` que reciba `tab`, `setTab`, y las props que hoy recibe cada pantalla.

**Resultado:** App.js < 200 líneas.

---

## Fase 3: Ningún archivo > 400 líneas

**Objetivo:** Partir cada componente que hoy supera 400 líneas en varios archivos (cada uno ≤ 400).

### 3.1 Ventas (1896 → varios archivos)

| Archivo | Contenido | Líneas aprox |
|---------|-----------|--------------|
| `Ventas.jsx` | Contenedor: estado de tab/vista, render de lista o carrito o modal; usa subcomponentes y hooks | &lt; 250 |
| `VentasList.jsx` | Lista de ventas agrupadas, botón nueva venta, eliminar/editar grupo | &lt; 350 |
| `VentasCart.jsx` | Carrito (ítems, total, cobrar), modal de cobro | &lt; 350 |
| `VentasManualScreen.jsx` | Pantalla “nueva venta” (productos, cantidades, cliente, medio de pago) | &lt; 400 |
| `VentasEditModal.jsx` | Modal editar venta (agregar ítems, guardar) | &lt; 300 |
| `hooks/useVentas.js` | insertVentas, deleteVentas, lógica de agrupación si se centraliza | &lt; 150 |

### 3.2 Insumos (1998 → varios)

| Archivo | Contenido | Líneas aprox |
|---------|-----------|--------------|
| `Insumos.jsx` | Contenedor: filtro, lista o compra; usa subcomponentes | &lt; 250 |
| `InsumosList.jsx` | Lista de insumos, búsqueda, editar precio, abrir compra | &lt; 400 |
| `InsumosCompra.jsx` | Flujo de compra (carrito de compra, registrar, actualizar precios y recetas) | &lt; 400 |
| `InsumosComposicion.jsx` | UI de insumo_composicion (si está mezclado, extraer) | &lt; 300 |
| `hooks/useInsumos.js` | updateInsumo, insertPrecioHistorial, etc. | &lt; 150 |

### 3.3 Stock (1151 → varios)

| Archivo | Contenido | Líneas aprox |
|---------|-----------|--------------|
| `Stock.jsx` | Contenedor: métricas, lista, FAB; modales producción/voz | &lt; 250 |
| `StockList.jsx` | Lista de productos con stock, días restantes, acciones | &lt; 350 |
| `StockProductionModal.jsx` | Modal “cargar producción” (manual) | &lt; 250 |
| `StockVoiceModal.jsx` | Modal de voz (parsear, confirmar) | &lt; 250 |
| Lógica compartida (métricas, pedidos pendientes) | En `Stock.jsx` o `lib/stockMetrics.js` | &lt; 200 |

### 3.4 Clientes (961 → varios)

| Archivo | Contenido | Líneas aprox |
|---------|-----------|--------------|
| `Clientes.jsx` | Lista + detalle/modal nuevo; orquesta subcomponentes | &lt; 250 |
| `ClientesList.jsx` | Lista de clientes con búsqueda, avatar, total | &lt; 200 |
| `ClienteDetalle.jsx` | Pantalla detalle: resumen, pedidos futuros, historial compras | &lt; 400 |
| `ClienteFormModal.jsx` | Modal nuevo/editar cliente + importar contactos | &lt; 200 |
| `hooks/useClientes.js` | CRUD clientes, pedidos, ventas (entregado) | &lt; 200 |

### 3.5 PlanSemanal (780 → varios)

| Archivo | Contenido | Líneas aprox |
|---------|-----------|--------------|
| `PlanSemanal.jsx` | Contenedor: selector semana, tabla, acciones | &lt; 250 |
| `PlanSemanalTable.jsx` | Tabla recetas × cantidades plan/realizado | &lt; 300 |
| `PlanSemanalActions.jsx` | Botones “marcar realizado”, “consumir insumos”, etc. | &lt; 250 |
| Lógica de carga/upsert | En hook `usePlanSemanal` | &lt; 150 |

### 3.6 Dashboard (776 → varios)

| Archivo | Contenido | Líneas aprox |
|---------|-----------|--------------|
| `Dashboard.jsx` | Contenedor: métricas, grid de accesos, alertas | &lt; 250 |
| `DashboardMetrics.jsx` | Bloque de métricas (ingreso, ganancia, etc.) | &lt; 200 |
| `DashboardQuickGrid.jsx` | Grid de botones (Ventas, Stock, Plan, etc.) | &lt; 250 |
| `DashboardAlerts.jsx` | Alertas (stock, plan, etc.) | &lt; 150 |

### 3.7 Analytics (707 → varios)

| Archivo | Contenido | Líneas aprox |
|---------|-----------|--------------|
| `Analytics.jsx` | Contenedor: tabs o secciones; orquesta bloques | &lt; 200 |
| `AnalyticsSemana.jsx` | Comparativa semana actual vs anterior, tendencias | &lt; 250 |
| `AnalyticsProductos.jsx` | Top vendidos, top rentables | &lt; 200 |
| `AnalyticsGraficos.jsx` | Gráficos (barras 7 días, torta, pico día/hora) | &lt; 250 |
| Helpers (parseISODate, startOfWeek, topBy, etc.) | En `Analytics.jsx` o `lib/analyticsUtils.js` | &lt; 150 |

---

## Orden de ejecución recomendado

1. **Fase 0** (estilos) → bajo riesgo, reduce App de una vez.
2. **Fase 1.1** (hooks de datos): `useAppData`, `useStockMutations`, `usePlanResumen`, `useSyncVentasPendientes`; App.js los usa y deja de tener loadData/callbacks internos.
3. **Fase 2** (App < 200): extraer Toast, ConfirmDialog, ConfigMissing, AuthScreen, MoreMenuScreen; simplificar App a layout + hooks + render por tab.
4. **Fase 1.2** (hooks por dominio): useVentas, useClientes, useRecetas, useInsumos, useGastosFijos, usePlanSemanal; refactorizar cada componente para usar solo hooks (sin `supabase` directo).
5. **Fase 3** (partir componentes): uno por uno, empezando por los más grandes (Ventas, Insumos, Stock, Clientes, PlanSemanal, Dashboard, Analytics). Después de cada uno, `npm run build` y revisión rápida.

---

## Checklist final

- [ ] App.js tiene &lt; 200 líneas.
- [ ] Ningún archivo en `src/` tiene &gt; 400 líneas.
- [ ] No hay imports rotos (`npm run build` OK).
- [ ] Todas las llamadas a Supabase (from/insert/update/delete) están en archivos bajo `src/hooks/`.
- [ ] El cliente Supabase se importa solo desde `src/lib/supabaseClient.js`.
- [ ] (Opcional) Insumos: UNIQUE en DB o flujo “evitar duplicados por nombre” para cumplir “no hay insumos duplicados”.

Cuando quieras, se puede bajar a tareas por PR (por ejemplo: “PR 1: Fase 0”, “PR 2: useAppData + useStockMutations”, etc.).
