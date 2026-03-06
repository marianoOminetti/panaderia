# Resumen: Bloque C — ClienteDetalle.jsx (Etapas 8, 9 y 10)

**Fecha:** 5 de marzo de 2025  
**Plan de referencia:** [PLAN_REFACTOR_POR_FASES.md](./PLAN_REFACTOR_POR_FASES.md) — Bloque C

---

## Objetivo del bloque

Reducir **ClienteDetalle.jsx** extrayendo la sección de pedidos y la de ventas (historial de compras) a subcomponentes que reciben props. Solo mover JSX; la lógica de guardado/entrega sigue en ClienteDetalle.

---

## Qué se hizo

### ETAPA 8: Extraer ClienteDetallePedidos

**Archivo creado:** `src/components/clientes/ClienteDetallePedidos.jsx` (347 líneas)

**Movido al componente:**
- Toda la card **"Pedidos futuros"**: botón "+ Nuevo pedido", formulario de nuevo pedido (fecha, producto, cantidad, precio, ítems, seña, estado), lista de pedidos pendientes con cambio de estado y "Marcar entregado".

**Props que recibe:** `pedidosClienteAgrupados`, `recetas`, estado del formulario (`nuevoPedidoAbierto`, `pedidoFechaEntrega`, `pedidoRecetaSel`, `pedidoCantidad`, `pedidoPrecio`, `pedidoItems`, `pedidoSenia`, `pedidoEstado`, `savingPedido`), setters y handlers (`addPedidoItem`, `quitarPedidoItem`, `guardarPedido`, `actualizarEstadoPedido`, `marcarPedidoEntregado`).

**ClienteDetalle:** sigue calculando `pedidosClienteAgrupados`, mantiene todo el estado y la lógica de pedidos (useClientes, guardarPedido, marcarPedidoEntregado, etc.) y renderiza `<ClienteDetallePedidos ... />` pasando esas props.

---

### ETAPA 9: Extraer ClienteDetalleVentas

**Archivo creado:** `src/components/clientes/ClienteDetalleVentas.jsx` (70 líneas)

**Movido al componente:**
- La card **"Historial de compras"**: lista de ventas del cliente ordenadas por fecha (más recientes primero), con receta, fecha y total por línea.

**Props que recibe:** `ventasCliente` (array ya filtrado por cliente) y `recetas`.

**ClienteDetalle:** pasa `ventasCliente={getVentasDeCliente(cliente.id)}` y `recetas={recetas}`. Se evita mutar el array original ordenando una copia (`[...ventasCliente].sort(...)`) dentro del hijo.

---

### ETAPA 10: Revisión

- ClienteDetalle.jsx queda con: header (Volver + nombre), card **Resumen** (teléfono, cantidad de compras, total gastado), `<ClienteDetallePedidos />` y `<ClienteDetalleVentas />`.
- Estado y lógica de pedidos (useClientes, formulario, guardarPedido, marcarPedidoEntregado, etc.) siguen en ClienteDetalle; no se movió lógica, solo el JSX de las dos cards a los subcomponentes.
- **Líneas:** ClienteDetalle.jsx pasó de **736** a **335** (objetivo &lt;400 cumplido).

---

## Verificación

- **Build:** `npm run build` — exitoso.
- **Tests:** `npm test -- --watchAll=false` — 1 test pasado.
- **Comportamiento:** Sin cambios de lógica ni UI; solo extracción de JSX a componentes.

---

## Archivos tocados

| Archivo | Acción |
|---------|--------|
| `src/components/clientes/ClienteDetallePedidos.jsx` | Creado |
| `src/components/clientes/ClienteDetalleVentas.jsx` | Creado |
| `src/components/clientes/ClienteDetalle.jsx` | Modificado: imports de los dos hijos, reemplazo de las dos cards por los componentes y paso de props |

---

## Métricas

| Métrica | Antes | Después |
|---------|--------|--------|
| ClienteDetalle.jsx | 736 líneas | 335 líneas |
| ClienteDetallePedidos.jsx | — | 347 líneas |
| ClienteDetalleVentas.jsx | — | 70 líneas |

---

## Próximos pasos (según el plan)

Siguiente bloque: **D — DashboardAlerts.jsx** (Etapa 11): extraer lógica de alertas a `useDashboardAlerts`.  
Instrucciones en [PLAN_REFACTOR_POR_FASES.md](./PLAN_REFACTOR_POR_FASES.md).
