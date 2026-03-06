# Con qué seguir — Propuesta (vista Dev Lead)

**Contexto:** [ESTADO_REFACTOR_DEV_LEAD.md](./ESTADO_REFACTOR_DEV_LEAD.md). Refactor incremental respetando: una etapa = un objetivo, solo mover código, verificar y rollback definido.

---

## Prioridad 1 — Ventas.jsx (753 líneas)

Sigue siendo el archivo más pesado. Reducir en etapas de **un solo objetivo** cada una.

### Opción A: Extraer estado del modal de cobro

**Objetivo:** Mover a un hook todo lo que es exclusivo del flujo “modal de cobro” (chargeModalOpen, chargeTotalOverride, lógica de abrir/cerrar y del total a cobrar). No tocar edición ni lista.

- **Archivos a crear:** `src/hooks/useVentasChargeModal.js`
- **Archivos a modificar:** `src/components/ventas/Ventas.jsx`
- **Lógica a mover:** Estado `chargeModalOpen`, `setChargeModalOpen`, `chargeTotalOverride`, `setChargeTotalOverride`; handlers que abren/cierran el modal de cobro y actualizan el total. El hook recibe lo que necesite (ej. `cartTotal`, `setChargeModalOpen` para cerrar desde fuera) y devuelve estado + handlers. Ventas.jsx usa el hook y pasa props a VentasChargeModal.
- **Verificar:** `npm run build`. Browser: Ventas → agregar ítems al carrito → Cobrar → ver modal, cambiar monto, cobrar. Mismo flujo que antes.
- **Rollback:** Borrar `useVentasChargeModal.js` y restaurar en Ventas.jsx el estado y handlers movidos.

### Opción B: Extraer estado de la edición de venta

**Objetivo:** Mover a un hook el estado y handlers de “editar venta/grupo” (editGrupo, editForm, editCantidades, editSaving, editItemsToAdd, editRemovedRecetas, editPrecios, editTotalOverride, guardarEdicion, etc.). Ventas.jsx solo orquesta.

- **Archivos a crear:** `src/hooks/useVentasEdicion.js` (o similar)
- **Archivos a modificar:** `src/components/ventas/Ventas.jsx`
- **Lógica a mover:** Solo estado y handlers de edición; no tocar carrito ni cobro. Contrato del hook: recibe updateVenta, deleteVentas, actualizarStock, showToast, onRefresh, etc.; devuelve editGrupo, setEditGrupo, editForm, setEditForm, … y los callbacks de guardar/cancelar.
- **Verificar:** Build. Browser: Ventas → lista → editar una venta → cambiar cantidades/precios → guardar. Igual que antes.
- **Rollback:** Borrar el hook y restaurar en Ventas.jsx.

Recomendación: **empezar por Opción A** (modal de cobro), que suele estar más acotado que la edición.

---

## Prioridad 2 — Insumos.jsx (712 líneas) y Etapa 7

El plan original tenía una “Etapa 7: Revisar Insumos.jsx y dejar solo orquestación”.

- **Objetivo:** Revisar si queda estado que corresponda a “composición” (compInsumoSel, compFactor, compSaving, etc.) y si se puede mover a `useInsumosComposicion` **solo con movimiento literal** (sin reescribir lógica).
- **Archivos a crear:** Opcionalmente `src/hooks/useInsumosComposicion.js` si el bloque es claro.
- **Archivos a modificar:** `src/components/insumos/Insumos.jsx`
- **Verificar:** Build. Browser: Insumos → pestaña/vista Composición → flujo actual.
- **Rollback:** Si se creó el hook, borrarlo y volver el estado a Insumos.jsx.
- **Regla de parada:** Si para extraer composición hace falta cambiar la forma en que se calcula el factor o la lógica de guardado, **no hacerlo** y anotar en DEUDA TÉCNICA.

---

## Prioridad 3 — VentasList.jsx (319 líneas)

Si se quiere aligerar la lista de ventas sin tocar Ventas.jsx todavía:

- **Objetivo:** Extraer estado de filtros y lista derivada (por fecha, búsqueda, etc.) a `useVentasList`.
- **Archivos a crear:** `src/hooks/useVentasList.js`
- **Archivos a modificar:** `src/components/ventas/VentasList.jsx`
- **Lógica a mover:** Estado de filtros y la lista filtrada/ordenada; VentasList.jsx queda presentacional con las props que reciba del hook.
- **Verificar:** Build. Browser: Ventas → lista → filtrar por fecha, buscar. Editar venta sigue igual.
- **Rollback:** Borrar hook y restaurar en VentasList.jsx.

---

## Prioridad 4 — Tests y estabilidad

El dev-lead no exige más tests, pero “verificar después de cada archivo” sí. Opciones:

- **Mantener:** Un solo smoke test en App (actual) y verificación manual en browser por flujo.
- **Opcional:** Agregar un test por “módulo crítico” (ej. que useAnalyticsData devuelva la estructura esperada con datos mock) en etapas separadas, sin mezclar con refactor de componentes.

---

## Resumen recomendado

| Orden | Qué hacer | Riesgo | Tiempo aprox. |
|-------|-----------|--------|----------------|
| 1 | **Ventas: useVentasChargeModal** (estado del modal de cobro) | Bajo | 1 etapa |
| 2 | **Insumos: Etapa 7** (revisar estado composición; useInsumosComposicion solo si es movimiento literal) | Bajo–medio | 1 etapa |
| 3 | **Ventas: useVentasEdicion** (estado/handlers de edición de venta) | Medio | 1 etapa |
| 4 | **VentasList: useVentasList** (filtros y lista derivada) | Bajo | 1 etapa |

**Ejecutado:** useVentasChargeModal y useInsumosComposicion. useVentasEdicion y useVentasList no aplican. Ver RESUMEN_ETAPAS_CON_QUE_SEGUIR.md.

Siguiente paso concreto (ya hecho): **ejecutar la etapa “Extraer useVentasChargeModal”** (Prioridad 1, Opción A). Si querés, en el próximo mensaje podés pedir que la ejecute y te deje el resumen + verificación.
