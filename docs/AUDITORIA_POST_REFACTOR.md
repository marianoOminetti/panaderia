# Auditoría post-refactor App.js

**Fecha:** 3 de marzo de 2026  
**Alcance:** Estructura, funcionalidad, Supabase, datos y reporte final.

---

## 1. ESTRUCTURA

### 1.1 Archivos creados y líneas

| Archivo | Líneas | Límite (400) |
|---------|--------|--------------|
| `src/App.js` | **1115** | ❌ (objetivo < 200) |
| `src/components/dashboard/Dashboard.jsx` | 776 | ❌ > 400 |
| `src/components/ventas/Ventas.jsx` | 1896 | ❌ > 400 |
| `src/components/stock/Stock.jsx` | 1151 | ❌ > 400 |
| `src/components/insumos/Insumos.jsx` | 1998 | ❌ > 400 |
| `src/components/recetas/Recetas.jsx` | 329 | ✅ |
| `src/components/clientes/Clientes.jsx` | 961 | ❌ > 400 |
| `src/components/analytics/Analytics.jsx` | 707 | ❌ > 400 |
| `src/components/plan/PlanSemanal.jsx` | 780 | ❌ > 400 |
| `src/components/gastos/GastosFijos.jsx` | 322 | ✅ |

**Lib y utils (referencia):**

| Archivo | Líneas |
|---------|--------|
| `src/lib/supabaseClient.js` | 10 |
| `src/lib/format.js` | 9 |
| `src/lib/dates.js` | 17 |
| `src/lib/units.js` | 22 |
| `src/lib/costos.js` | 25 |
| `src/lib/metrics.js` | 40 |
| `src/lib/contacts.js` | 41 |
| `src/config/appConfig.js` | 61 |
| `src/lib/offlineVentas.js` | 77 |
| `src/utils/errorReport.js` | 82 |
| `src/lib/voice.js` | 101 |
| `src/lib/agrupadores.js` | 103 |
| `src/lib/stockPlan.js` | 129 |

### 1.2 Cumplimiento

- **App.js < 200 líneas:** ❌ **No.** Tiene 1115 líneas (estilos inline ~280, loadData y callbacks ~400+, render y tabs ~400+).
- **Ningún archivo > 400 líneas:** ❌ **No.** Superan 400: Dashboard (776), Ventas (1896), Stock (1151), Insumos (1998), Clientes (961), Analytics (707), PlanSemanal (780).
- **Imports rotos:** ✅ **No.** `npm run build` compila correctamente; todos los imports resuelven a `./lib/supabaseClient.js` o rutas relativas válidas.

---

## 2. FUNCIONALIDAD (por módulo)

Verificación basada en **código y flujo de datos** (no hay E2E automatizados; las pruebas manuales quedan a cargo del equipo).  
**Plan para automatización:** [docs/PLAN_AUTOMATIZACION_PRUEBAS.md](PLAN_AUTOMATIZACION_PRUEBAS.md).

| Módulo | Qué se verificó en código | Estado |
|--------|---------------------------|--------|
| **Dashboard** | Recibe `ventas`, `recetas`, `stock`, `gastosFijos`; usa `agruparVentas`, métricas, `fmt`; sin llamadas directas a Supabase (datos vienen de App). | ✅ Flujo coherente |
| **Ventas** | `registrarVentaEnSupabase(rows)` inserta en `ventas` con `precio_unitario`, `total_final`; carrito → cobrar → insert; `actualizarStock` al confirmar. | ✅ Flujo coherente |
| **Stock** | Recibe `actualizarStock`, `stock`, `recetas`, etc.; producción manual/voz actualiza stock vía callbacks de App. | ✅ Flujo coherente |
| **Insumos** | Búsqueda/filtro en estado local; edición de precio → `supabase.from("insumos").update` y `precio_historial.insert`. | ✅ Flujo coherente |
| **Recetas** | Lista con costo y margen (`costoReceta`, `precio_venta`, `(precio_venta - costoUnitario) / precio_venta`); detalle en modal con mismo cálculo. | ✅ Flujo coherente |
| **Clientes** | Lista con `clientesConGasto`; detalle con historial de ventas y pedidos; alta/edición/eliminar duplicados vía Supabase. | ✅ Flujo coherente |

**Recomendación:** Ejecutar a mano: login → Dashboard, nueva venta (carrito + cobrar), carga de producción en Stock, editar precio en Insumos, abrir receta (costo/margen), abrir cliente (historial).

---

## 3. SUPABASE

### 3.1 Cliente único

- **Origen del cliente:** Un solo módulo: `src/lib/supabaseClient.js` (exporta `supabase` y `SUPABASE_CONFIG_OK`).
- **Nota:** El enunciado pedía `lib/supabase.js`; en el proyecto el archivo se llama `lib/supabaseClient.js`. ✅ Misma idea: un solo lugar.

Todos los que usan Supabase importan desde ahí:

- `App.js`, `Ventas.jsx`, `Insumos.jsx`, `Clientes.jsx`, `GastosFijos.jsx`, `Recetas.jsx`, `PlanSemanal.jsx`.

### 3.2 Queries en /hooks/

- **Carpeta `src/hooks/`:** ❌ **No existe.** No hay hooks dedicados a datos.
- Las queries están en:
  - **App.js:** `loadData` (insumos, recetas, ventas, clientes, pedidos, stock, insumo_stock, insumo_movimientos, insumo_composicion, gastos_fijos, precio_historial, plan_semanal), seed insumos, `actualizarStock`, `registrarMovimientoInsumo`, sync ventas pendientes.
  - **Componentes:** Ventas (insert/delete), Insumos (update/insert insumos y precio_historial), Clientes (CRUD clientes/pedidos/ventas), GastosFijos (CRUD gastos_fijos), Recetas (CRUD recetas y receta_ingredientes), PlanSemanal (plan_semanal).

### 3.3 Queries duplicadas

- Misma tabla y misma intención en varios sitios (ej. `ventas` insert en Ventas.jsx y en App.js para offline; `insumos.select` solo en App loadData). No hay duplicación lógica de “misma query en dos hooks”; la duplicación es entre App (carga global + mutaciones) y componentes (mutaciones). ⚠️ **Deuda:** concentrar carga y mutaciones en hooks/capas reutilizables reduciría duplicación.

---

## 4. DATOS

### 4.1 Insumos duplicados en DB

- En el esquema (`20250201_initial_schema.sql`) **no** hay UNIQUE en `insumos(nombre, categoria)` (ni en nombre solo).
- La app evita duplicados por teléfono en **clientes** (merge duplicados); en insumos no hay constraint ni flujo específico de “evitar duplicado por nombre”.
- ⚠️ **Deuda:** Puede haber insumos duplicados en la DB; conviene UNIQUE o flujo de “buscar por nombre antes de insertar”.

### 4.2 Ventas y precio histórico

- **Tabla `ventas`:** tiene `precio_unitario` (y en migración posterior `subtotal`, `descuento`, `total_final`). El código inserta siempre `precio_unitario` y `total_final` por línea; no se hace join a `recetas` para el precio al mostrar ventas.
- ✅ **Ventas muestran precio histórico:** se usa `v.precio_unitario` (y `v.total_final` cuando existe) en Dashboard, Ventas, Clientes, Analytics, agrupadores.

### 4.3 Márgenes de recetas

- Fórmula en Recetas e Insumos: `(precio_venta - costoUnitario) / precio_venta`; `costoUnitario` viene de `costoReceta(id, recetaIngredientes, insumos)` o del `costo_unitario` guardado.
- ✅ **Cálculo correcto** (margen = (P - C) / P).

---

## 5. REPORTE FINAL

### ✅ Qué funciona bien

- Build correcto; sin imports rotos; un solo cliente Supabase (`lib/supabaseClient.js`).
- Ventas usan **precio histórico** (`precio_unitario`/`total_final`) en toda la app.
- Márgenes de recetas calculados correctamente (costo + precio_venta).
- Componentes extraídos (GastosFijos, Clientes, Analytics, Recetas) con props y flujos coherentes.
- Recetas.jsx y GastosFijos.jsx cumplen el límite de 400 líneas.

### ⚠️ Qué funciona pero tiene deuda técnica

- **App.js** muy grande (1115 líneas): estilos inline, `loadData`, callbacks de stock/insumos y render podrían ir a hooks, context o módulos (objetivo < 200).
- **Varios componentes > 400 líneas:** Ventas (1896), Insumos (1998), Stock (1151), Clientes (961), PlanSemanal (780), Dashboard (776), Analytics (707). Conviene dividir por subpantallas o hooks.
- **Queries no centralizadas en /hooks/:** no existe `src/hooks/`; las queries están en App y en componentes. Deuda: crear hooks (ej. `useInsumos`, `useVentas`, `useStock`) y usarlos desde App y pantallas.
- **Insumos duplicados:** la DB permite duplicados; no hay UNIQUE ni flujo en UI para evitarlos.

### ❌ Qué está roto o falta

- **App.js < 200 líneas:** incumplido (1115 líneas).
- **Límite 400 líneas por archivo:** incumplido en 7 componentes.
- **Todas las queries en /hooks/:** no aplica; la carpeta `hooks` no existe y las queries están en App y componentes.
- **Test `App.test.js`:** sigue buscando "learn react"; es probable que falle si la app ya no muestra ese texto. Conviene actualizar o eliminar el test.

---

## Resumen ejecutivo

| Criterio | Estado |
|----------|--------|
| App.js < 200 líneas | ❌ |
| Ningún archivo > 400 líneas | ❌ |
| Imports rotos | ✅ |
| Funcionalidad por módulo (código) | ✅ |
| Cliente Supabase único | ✅ (lib/supabaseClient.js) |
| Queries en /hooks/ | ❌ (no hay hooks) |
| No queries duplicadas (misma lógica) | ⚠️ (repartidas App + componentes) |
| No insumos duplicados (DB/regla) | ⚠️ (no garantizado) |
| Ventas con precio histórico | ✅ |
| Márgenes recetas correctos | ✅ |

**Próximos pasos sugeridos:** (1) Reducir App.js moviendo estilos a CSS y carga/mutaciones a hooks; (2) crear `src/hooks/` y migrar queries; (3) dividir Ventas, Insumos, Stock, Clientes en subcomponentes o hooks para bajar de 400 líneas; (4) opcional: UNIQUE o flujo para insumos duplicados; (5) actualizar o reemplazar `App.test.js`.
