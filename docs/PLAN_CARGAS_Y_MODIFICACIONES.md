# Plan de cargas y modificaciones – consistencia de datos

Este documento describe **qué escribe cada flujo** y **en qué orden**, para evitar inconsistencias (ej. venta guardada pero stock no descontado).

---

## 1. Carga de datos (lectura)

**Origen:** `useAppData` → `loadData()`.

**Tablas que se leen en paralelo:**

| Tabla | Uso |
|-------|-----|
| `insumos` | Catálogo de insumos |
| `recetas` | Productos / recetas |
| `ventas` | Historial de ventas (límite 1000) |
| `receta_ingredientes` | Relación receta ↔ insumos |
| `clientes` | Clientes |
| `pedidos` | Pedidos (límite 1000) |
| `stock` | Stock actual por receta |
| `insumo_stock` | Stock de insumos |
| `insumo_movimientos` | Últimos 100 movimientos |
| `insumo_composicion` | Insumos compuestos |
| `gastos_fijos` | Gastos fijos |
| `precio_historial` | Historial de precios (límite 5000) |

**Quién llama `loadData`:** App (inicio/sesión), y tras muchas mutaciones (ej. después de registrar venta, cargar stock, eliminar venta, etc.) para refrescar la UI.

---

## 2. Flujos que modifican datos (escrituras)

### 2.1 Venta nueva (carrito) – **Ventas ↔ Stock**

**Dónde:** `Ventas.jsx` → `registrarVentaCarrito` → `registrarVentaEnSupabase(rows)`.

**Orden actual:**

1. `insertVentas(rows)` → tabla `ventas`
2. Para cada fila: `actualizarStock(receta_id, -cantidad)` → tabla `stock`

**Riesgo:** Si (1) funciona y (2) falla (red, cierre rápido, etc.), queda **venta guardada y stock sin descontar** → inconsistencia.

**Mitigación (implementada):** Si el descuento de stock falla, se borran las ventas recién insertadas (`insertVentas` devuelve los `id`; en `registrarVentaEnSupabase` se hace `deleteVentas(ids)` en el `catch` y se re-lanza el error).

---

### 2.2 Editar venta – **Ventas ↔ Stock**

**Dónde:** `Ventas.jsx` → `guardarEdicion`.

**Orden:**

1. Para cada ítem existente: `updateVenta(v.id, payload)` y `actualizarStock(receta_id, -deltaCant)` (delta por cambio de cantidad).
2. Si hay ítems nuevos: `insertVentas(rows)` y luego `actualizarStock(receta_id, -cantidad)` por cada uno.

**Mitigación (implementada):** Primero se aplican todos los deltas de stock en batch (o loop); después se hacen los `updateVenta` e `insertVentas`. Si falla la escritura de ventas, se hace rollback del stock (batch/loop con deltas invertidos).

---

### 2.3 Eliminar venta – **Ventas ↔ Stock**

**Dónde:** `Ventas.jsx` → `eliminarVenta`.

**Orden:**

1. `deleteVentas(ids)` → borra en `ventas`
2. Para cada ítem: `actualizarStock(receta_id, +cantidad)` (devolver stock)

**Mitigación (implementada):** Primero se devuelve el stock (loop `actualizarStock(receta_id, +cantidad)`); después se llama a `deleteVentas(ids)`. Si falla el delete, se hace rollback del stock (restar de nuevo).

---

### 2.4 Sincronizar ventas pendientes (offline) – **Ventas ↔ Stock**

**Dónde:** `useSyncVentasPendientes.js` → `syncVentasPendientes`.

**Orden por lote:**

1. `supabase.from("ventas").insert(rows)`
2. Para cada fila: `actualizarStock(receta_id, -cantidad)`
3. `deleteVentaPendiente(item.id)` (borra del almacenamiento local)

**Mitigación (implementada):** Se hace `insert` con `.select("id")`; si falla el descuento de stock se llama a `deleteVentas(ids)` con los ids insertados y se re-lanza el error. Solo se borra del almacenamiento local (`deleteVentaPendiente`) después de que venta y stock terminen bien.

---

### 2.5 Marcar pedido como entregado – **Pedidos + Ventas + Stock**

**Dónde:** `ClienteDetalle.jsx` → `marcarPedidoEntregado` (usa `insertVentas`, `updatePedidoEntregado`, `deleteVentasByIds` de useClientes; `actualizarStock` por props).

**Orden:**

1. Descontar stock (loop `actualizarStock(receta_id, -cantidad)`).
2. `insertVentas(rows)` → tabla `ventas` (devuelve ids).
3. `updatePedidoEntregado(grupo.key)` → tabla `pedidos` (estado "entregado").

**Mitigación (implementada):** Si falla `insertVentas`: no hay ventas ni cambio de pedido; se hace rollback del stock. Si falla `updatePedidoEntregado`: se hace `deleteVentasByIds(ids)` con los ids insertados y rollback del stock; no queda venta sin pedido marcado entregado.

---

### 2.6 Cargar producción (stock) – **Stock ↔ Insumos**

**Dónde:** `Stock.jsx` → `ejecutarCargaVoz` / `cargarStockCarrito`.

**Orden:**

1. `actualizarStockBatch([{ receta_id, delta }])` → un solo `upsert` en `stock`
2. Para cada ítem: `consumirInsumosPorStock(receta_id, cantidad)` → escribe en `insumo_stock` e `insumo_movimientos` (con try/catch por ítem)

**Riesgo:** Stock ya subido; si falla el consumo de insumos, se avisa por toast pero no se revierte el stock (aceptado: stock es la fuente de verdad para productos terminados).

---

### 2.7 Plan semanal – “Producir” – **Stock ↔ Insumos ↔ Plan**

**Dónde:** `PlanSemanal.jsx` → `handleProducir`.

**Orden:**

1. `actualizarStock(receta.id, cantidad)` → tabla `stock`
2. `consumirInsumosPorStock(receta.id, cantidad)` → `insumo_stock` + `insumo_movimientos`
3. `upsertPlanRow(...)` → tabla `plan_semanal`

**Mitigación (implementada):** Si (2) o (3) fallan, se hace rollback del stock (`actualizarStock(receta.id, -cantidad)`). No queda stock subido sin plan ni sin consumo de insumos.

---

### 2.8 Insumos – flujos que tocan varias tablas

#### 2.8.1 Registrar movimiento (una unidad atómica)

**Dónde:** `useStockMutations` → `registrarMovimientoInsumo`; usado desde Insumos (compra, ingreso/egreso manual) y desde `consumirInsumosPorStock`.

**Orden:** (1) `upsert` en `insumo_stock`; (2) `insert` en `insumo_movimientos`. Si (2) falla: rollback del upsert en `insumo_stock`. Cada movimiento es atómico.

#### 2.8.2 Registrar compra solo stock (loop de movimientos)

**Dónde:** `Insumos.jsx` → `registrarCompraSoloStock`. Por cada ítem: `registrarMovimientoInsumo`. **Mitigación:** Se muestra "Se registraron X de Y; error en el resto. Revisá el carrito."; el carrito no se vacía.

#### 2.8.3 Aplicar decisiones de precio (compra + precios + costos recetas)

**Dónde:** `Insumos.jsx` → `aplicarDecisionesPrecio`. Orden: (1) loop movimientos; (2) loop updateInsumo + insertPrecioHistorial; (3) loop updateRecetaCostos. **Mitigación:** Try/catch por ítem en (2) y (3); toast con fallidos; no se revierten movimientos.

#### 2.8.4 Editar insumo (precio) + historial

**Dónde:** `Insumos.jsx` → `save`. updateInsumo luego insertPrecioHistorial. **Riesgo aceptado:** Si falla historial, se muestra "Insumo guardado (no se pudo registrar historial de precio)".

#### 2.8.5 Catálogo y composición

insertInsumo / deleteInsumo (solo `insumos`); deleteInsumoComposicion / upsertInsumoComposicion (solo `insumo_composicion`).

---

### 2.9 Clientes – flujos que tocan varias tablas

#### 2.9.1 Insert / update / delete cliente

**Dónde:** `useClientes` → `insertCliente`, `deleteCliente`; `ClienteFormModal` usa `insertCliente`.

- **insertCliente:** solo tabla `clientes`.
- **deleteCliente:** solo tabla `clientes`. **Regla:** No debe llamarse si el cliente tiene ventas o pedidos; si no, quedarían ventas/pedidos con `cliente_id` apuntando a un id borrado (huérfanos). Quien implemente la UI de "eliminar cliente" debe: o bien comprobar que no hay ventas ni pedidos, o bien ofrecer "fusionar con otro" (ver 2.9.2) y luego borrar.

#### 2.9.2 Fusionar clientes (reasignar ventas y pedidos + borrar origen)

**Dónde:** `useClientes` → `updateVentasClienteId`, `updatePedidosClienteId`, `deleteCliente`. (La UI de fusión puede implementarse en Clientes.jsx / ClienteDetalle.)

**Orden obligatorio:**

1. `updateVentasClienteId(fromClienteId, toClienteId)` → reasigna en `ventas`.
2. `updatePedidosClienteId(fromClienteId, toClienteId)` → reasigna en `pedidos`.
3. `deleteCliente(fromClienteId)` → borra el cliente origen en `clientes`.

**Riesgo:** Si (3) falla, el cliente origen sigue existiendo pero ya no tiene ventas ni pedidos (quedaron en el destino). No hay huérfanos; el usuario puede reintentar el delete. No se hace rollback de (1) y (2) para no dejar ventas/pedidos huérfanos.

#### 2.9.3 Pedido entregado

Visto en **2.5**: stock → insertVentas → updatePedidoEntregado; rollback ventas (deleteVentasByIds) y stock si falla el update del pedido.

#### 2.9.4 Otros

- **insertPedidos:** solo tabla `pedidos`.
- **updatePedidoEstado:** solo tabla `pedidos`.

---

### 2.10 Otros (una sola tabla o sin acoplamiento)

- **Recetas:** update/insert/delete en `recetas` y `receta_ingredientes`.
- **Gastos fijos:** insert/update/delete en `gastos_fijos`.

---

## 3. Regla para evitar inconsistencia venta ↔ stock

**Convención:** Si un flujo escribe en tabla **A** y luego en tabla **B**, y **B** falla: o se **revierte A** (rollback), o no se debe haber escrito en A todavía. Aplicado a: ventas ↔ stock, ventas ↔ pedidos (entregado), stock ↔ insumos ↔ plan_semanal, insumo_stock ↔ insumo_movimientos. Para pedido entregado: si falla updatePedidoEntregado, se borran las ventas insertadas (deleteVentasByIds) y se revierte el stock.

---

## 4. Resumen de llamadas por flujo

| Flujo | Tablas tocadas | Orden | Rollback / mitigación |
|-------|----------------|-------|------------------------|
| Nueva venta (carrito) | ventas → stock | insert ventas, luego stock por ítem | Sí: delete ventas insertadas si falla stock |
| Editar venta | ventas, stock | stock batch primero, luego update/insert ventas; rollback stock si falla venta | Sí |
| Eliminar venta | ventas, stock | devolver stock primero, luego delete ventas; rollback stock si falla delete | Sí |
| Sync pendientes | ventas, stock, IndexedDB | insert ventas (.select id), stock por fila; si falla stock → delete ventas insertadas | Sí |
| Pedido entregado | ventas, stock, pedidos | stock, insert ventas, update pedido | Sí: deleteVentasByIds + rollback stock si falla venta o update pedido |
| Cargar producción | stock, insumo_stock, insumo_movimientos | batch stock, luego consumo insumos | Stock no se revierte; insumos con try/catch |
| Plan “Producir” | stock, insumo_*, plan_semanal | stock, consumo, plan | Sí: rollback stock si falla consumo o plan |
| Registrar movimiento insumo | insumo_stock, insumo_movimientos | upsert stock, insert mov | Sí: rollback stock si falla insert mov |
| Compra insumos (loop) | insumo_stock, insumo_movimientos | por ítem registrarMovimientoInsumo | Toast "X de Y"; carrito no se vacía |
| Aplicar precios (compra) | insumo_*, insumos, precio_historial, recetas | movimientos, luego precios/costos por ítem | Try/catch por ítem; no rollback movimientos |
| Fusionar clientes | ventas, pedidos, clientes | updateVentasClienteId, updatePedidosClienteId, deleteCliente | Si falla delete: no rollback (evitar huérfanos) |

Este archivo se actualiza cuando se agreguen nuevos flujos o se cambie el orden de escrituras.
