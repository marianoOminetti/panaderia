# Plan: Reutilizar pantalla "Nueva venta" para "Editar venta"

## 1. Revisión de la arquitectura actual

### 1.1 Componentes y responsabilidades

| Componente | Rol | Estado que usa / recibe |
|------------|-----|--------------------------|
| **Ventas.jsx** | Orquestador: estado de nueva venta y de edición, llamadas a useVentas, stock, toasts. | `cartItems`, `clienteSel`, `medioPago`, `estadoPago`, `manualScreenOpen`, `chargeModalOpen`, `chargeTotalOverride` (nueva). `editGrupo`, `editForm`, `editCantidades`, `editItemsToAdd`, `editRecetaToAdd`, `editCantidadToAdd`, `editModalOpen`, `editSaving` (edición). |
| **VentasManualScreen** | Pantalla full-screen: título "Nueva venta", total, botón Voz, botón Cobrar, carrito + grilla de productos. | `cartItems`, `cartTotal`, `updateCartQuantity`, `removeFromCart`, `updateCartPrice`, `setCartQuantity`, `recetas`, `stock`, `addToCart`, `onVoz`, `onCobrar`. No recibe cliente/pago (eso va en VentasChargeModal). |
| **VentasCart** | Lista del carrito: cantidad (+/- e input), precio (input), quitar; o solo lectura si `readOnly`. | `cartItems`, `cartTotal`, callbacks de cantidad/precio/remove, `readOnly`. Key actual: `item.receta.id`. |
| **VentasEditModal** | Pantalla full-screen de edición: SelectorCliente, SelectoresPago, cantidades por ítem (rawItems), bloque "Agregar producto" (select + cantidad + lista editItemsToAdd), botón Guardar. | `editGrupo`, `editForm`, `editCantidades`, `editItemsToAdd`, `editRecetaToAdd`, `editCantidadToAdd`, recetas, clientes, callbacks, `onGuardar`, `editSaving`. |
| **VentasChargeModal** | Modal Cobro: resumen (VentasCart readOnly), cliente, pago, total final editable, Registrar. | Mismo carrito + cliente/pago + `onRegistrar`, `saving`. |

### 1.2 Flujos actuales

- **Nueva venta**: Abrir manual screen → agregar al carrito (cartItems) → Cobrar → VentasChargeModal (cliente, pago, total) → `registrarVentaCarrito` → `insertVentas` + stock + cierre.
- **Editar venta**: Lista → Editar → VentasEditModal → cambiar cantidades (editCantidades), agregar ítems (editItemsToAdd) → Guardar → `guardarEdicion` → `updateVenta` por cada rawItem + `insertVentas` para editItemsToAdd + stock por deltas.

### 1.3 Formas de datos

- **cartItem (nueva venta)**  
  `{ receta, cantidad (number|string), precio_unitario (number|"") }`  
  Key en lista: `item.receta.id` (una línea por receta; misma receta se suma cantidad).

- **rawItem (fila venta en DB)**  
  `{ id, receta_id, cantidad, precio_unitario, subtotal, total_final, descuento, transaccion_id, cliente_id, medio_pago, estado_pago, fecha, ... }`  
  En edición se identifica por `v.id`.

- **editItemsToAdd**  
  `{ receta_id, cantidad, receta }`  
  Solo ítems nuevos a insertar en la misma transacción.

- **editGrupo**  
  `{ key, rawItems, total, cliente_id }` (salida de `agruparVentas`).

### 1.4 Dependencias cruzadas

- Ventas.jsx concentra toda la lógica de carrito (addToCart, updateCartQuantity, setCartQuantity, removeFromCart, updateCartPrice) y toda la de edición (editCantidades, editItemsToAdd, guardarEdicion, agregarProductoEnEdicion). VentasEditModal y VentasManualScreen son presentacionales respecto a esa lógica.

---

## 2. Propuesta de reutilización

### 2.1 Enfoque: mismo componente base con `mode`

- **VentasManualScreen** con `mode="new" | "edit"`.
- En **modo new**: comportamiento actual (carrito libre, precios editables, decimales, quitar cualquier ítem, acción "Cobrar" que abre VentasChargeModal).
- En **modo edit**: mismo layout (carrito + grilla), pero:
  - Carrito rellenado desde `editGrupo.rawItems` + `editItemsToAdd`.
  - Precio fijo (no input).
  - Solo cantidades enteras.
  - No eliminar ítems que ya estaban (sí los agregados desde la grilla).
  - Cliente y pago visibles en la misma pantalla (ej. arriba del carrito).
  - Acción principal: "Guardar" (llama a la lógica actual de guardar edición).

No hace falta un segundo paso tipo “Cobro” en edición: un solo paso con Guardar.

### 2.2 Cambios en VentasCart

VentasCart debe soportar el modo “edición” sin duplicar componente. Opciones:

- **Opción A – Props de comportamiento**  
  - `priceEditable` (default `true`): si `false`, mostrar precio como texto (no input).  
  - `quantityIntegerOnly` (default `false`): si `true`, +/- de a 1 y validar solo enteros en el input.  
  - `getItemKey(item)`: clave estable por fila (para no depender solo de `receta.id` cuando hay varias líneas de la misma receta).  
  - `canRemoveItem(item)`: si `false`, no mostrar botón quitar (ítems con `item.ventaId`).

- **Opción B – Forma del ítem**  
  Cada ítem puede llevar `ventaId?: number`. Si existe `ventaId`: precio no editable y no mostrar quitar. Prop global `integerOnly` para cantidades.

Recomendación: **Opción B** (ítem con `ventaId` opcional) + prop `quantityIntegerOnly`. VentasCart usa `item.ventaId` para precio readonly y quitar; key de lista `item.id` (ver sección 3).

---

## 3. Mapeo al formato de carrito y “Guardar”

### 3.1 Carrito unificado en modo edición

En modo edit no hace falta un solo estado “cart” en Ventas.jsx. Se mantienen `editCantidades` y `editItemsToAdd` como fuente de verdad y se **deriva** la lista que ve VentasManualScreen/VentasCart:

- **Desde rawItems** (ítems ya existentes en la venta):  
  Para cada `v` en `editGrupo.rawItems`:  
  `{ id: v.id, ventaId: v.id, receta: recetas.find(r => r.id === v.receta_id), cantidad: editCantidades[v.id] ?? v.cantidad, precio_unitario: v.precio_unitario }`  
  - `ventaId` indica “no quitar, no editar precio”.  
  - `id` como clave estable (permite varias líneas de la misma receta).

- **Desde editItemsToAdd** (ítems a agregar):  
  Para cada `it` en `editItemsToAdd` (con índice):  
  `{ id: \`add-${idx}\`, receta: it.receta, cantidad: it.cantidad, precio_unitario: it.receta.precio_venta ?? 0 }`  
  - Sin `ventaId` → se puede quitar (equivale a sacar de `editItemsToAdd`).

La lista que se pasa a VentasCart en modo edit es:  
`cartItemsEdit = [...rawItemsAsCart, ...editItemsToAddAsCart]`.  
El total se calcula igual que hoy sobre esa lista.

### 3.2 Callbacks en modo edición

Ventas.jsx sigue manejando estado de edición; VentasManualScreen solo invoca callbacks. Traducción:

- **Cambiar cantidad**  
  Si el ítem tiene `ventaId`: `setEditCantidades(prev => ({ ...prev, [ventaId]: valor }))` (solo enteros, mínimo 1).  
  Si es ítem a agregar (`id.startsWith('add-')`): actualizar `editItemsToAdd` en el índice correspondiente (sustituir cantidad).

- **Quitar**  
  Solo permitido para ítems sin `ventaId`: `setEditItemsToAdd(prev => prev.filter((_, i) => \`add-${i}\` !== itemId))`.

- **Precio**  
  En modo edit no se expone: VentasCart con `item.ventaId` (o prop `priceEditable={false}`) no muestra input de precio.

- **Agregar desde la grilla**  
  Igual que hoy en VentasEditModal: al elegir receta + cantidad y “Agregar”, se hace el equivalente a `agregarProductoEnEdicion` (añadir a `editItemsToAdd`). La grilla en VentasManualScreen en modo edit usa ese mismo callback.

### 3.3 Acción “Guardar”

- El botón principal de VentasManualScreen en modo edit es “Guardar”.
- Al hacer clic se llama `onGuardar()`, que en Ventas.jsx es **la misma función `guardarEdicion`** que ya existe.
- No duplicar lógica: `guardarEdicion` sigue usando `editGrupo`, `editForm`, `editCantidades`, `editItemsToAdd`; no necesita recibir “cartItems” ni convertir nada. Los estados ya están actualizados por los callbacks anteriores.

Resumen: el mapeo es solo para **visualización e interacción** en la pantalla; la persistencia sigue en `guardarEdicion` tal cual.

---

## 4. Pasos concretos de implementación

### Orden sugerido y archivos a tocar

1. **VentasCart.jsx**  
   - Añadir soporte para `quantityIntegerOnly` (step 1, validar entero; en new se mantiene comportamiento actual).  
   - Añadir lógica “precio no editable” cuando `item.ventaId != null` (o prop `priceEditable` derivada de eso): mostrar precio como texto.  
   - Ocultar botón quitar para ítems con `item.ventaId`.  
   - Usar `item.id` (o `item.ventaId ?? item.id`) como key cuando exista, para soportar varias líneas de la misma receta.  
   - No cambiar comportamiento cuando no hay `ventaId` ni `quantityIntegerOnly` (nueva venta).

2. **VentasManualScreen.jsx**  
   - Añadir prop `mode: "new" | "edit"`.  
   - Cuando `mode === "edit"`: recibir `editGrupo`, `editForm`, `setEditForm`, `editCantidades`, `setEditCantidades`, `editItemsToAdd`, `setEditItemsToAdd`, `onGuardar`, `editSaving`, `clientes`, `insertCliente`, `showToast`, `recetas`.  
   - En edit: título “Editar venta”; encima o debajo del carrito renderizar SelectorCliente y SelectoresPago (reutilizar mismos componentes que VentasEditModal/VentasChargeModal).  
   - En edit: no mostrar “Voz” ni “Cobrar”; mostrar botón “Guardar” (disabled si `editSaving`).  
   - En edit: pasar a VentasCart la lista derivada (rawItems + editItemsToAdd mapeados) y los callbacks que traducen a setEditCantidades/setEditItemsToAdd; en new seguir pasando `cartItems` y callbacks actuales.  
   - En edit: grilla de productos usa “agregar a editItemsToAdd” (mismo criterio que agregarProductoEnEdicion: receta + cantidad entera).

3. **Ventas.jsx**  
   - En `abrirEditar`: en lugar de `setEditModalOpen(true)`, hacer `setManualScreenOpen(true)` dejando `editGrupo`, `editForm`, `editCantidades`, `editItemsToAdd` ya seteados (como hoy).  
   - Pasar a VentasManualScreen `mode={editGrupo ? "edit" : "new"}` y, cuando `editGrupo` existe, las props de edición (editGrupo, editForm, setEditForm, editCantidades, setEditCantidades, editItemsToAdd, setEditItemsToAdd, onGuardar: guardarEdicion, editSaving, clientes, insertCliente, showToast).  
   - Crear en Ventas.jsx la función que **deriva** `cartItemsEdit` a partir de editGrupo + editCantidades + editItemsToAdd + recetas (y opcionalmente un helper que traduce eventos del “carrito edit” a setEditCantidades/setEditItemsToAdd).  
   - `onClose` de VentasManualScreen: si estamos en edit, además de cerrar pantalla limpiar editGrupo y estado de edición; si estamos en new, reset actual (resetNuevaVenta).  
   - Dejar de renderizar VentasEditModal (o eliminarlo cuando todo funcione).

4. **Limpieza**  
   - Quitar `editModalOpen` si ya no se usa.  
   - Eliminar o archivar VentasEditModal.jsx cuando la edición pase íntegra a VentasManualScreen.

### Verificación por paso

- Tras 1: en Nueva venta, carrito se ve y se comporta igual; en un branch o local, probar VentasCart con ítems que tengan `ventaId` y `quantityIntegerOnly` para ver precio fijo, solo enteros y sin quitar.  
- Tras 2: VentasManualScreen con `mode="edit"` y props mock muestra cliente, pago, carrito derivado y botón Guardar.  
- Tras 3: desde lista, Editar abre VentasManualScreen en edit; cambiar cantidades y agregar producto; Guardar ejecuta guardarEdicion y cierra; lista y totales correctos.  
- Tras 4: no queden referencias a VentasEditModal ni estado huérfano.

---

## 5. Riesgos y consideraciones

| Riesgo | Mitigación |
|--------|------------|
| **Stock** | `guardarEdicion` ya calcula deltas por cantidad; en modo edit obligar cantidades enteras en UI y en editCantidades/editItemsToAdd para no enviar decimales. |
| **transaccion_id** | Ya manejado en guardarEdicion (reuso del de rawItems[0] o nuevo si hay editItemsToAdd). Sin cambios. |
| **Ítems con id vs nuevos** | Diferenciar por `ventaId`: ítems con ventaId son updates (updateVenta); ítems sin ventaId en la lista derivada son de editItemsToAdd (insertVentas). Clave estable `item.id` evita colapsar por receta.id. |
| **Key en listas** | Usar `item.id` (ventaId o `add-${idx}`) en VentasCart en modo edit para no tener key duplicada cuando la misma receta aparece en varias filas de la venta. |
| **Cierre al guardar** | Tras guardarEdicion exitoso, cerrar pantalla y limpiar edit state (igual que hoy en VentasEditModal onGuardar). |
| **Regresión en Nueva venta** | No tocar flujo new: mismo cartItems, mismos callbacks; VentasCart con props por defecto (priceEditable, no integerOnly, quitar siempre). |

---

## 6. Resumen

- **Reutilización**: VentasManualScreen con `mode="new" | "edit"`; en edit se rellena el “carrito” desde rawItems + editItemsToAdd con mapeo a ítems con `id` y opcionalmente `ventaId`.
- **VentasCart**: soportar precio readonly y sin quitar cuando `item.ventaId` existe, y cantidades solo enteras vía prop (o ítem); key por `item.id` cuando exista.
- **Estado**: se mantiene editCantidades y editItemsToAdd en Ventas.jsx; la lista del carrito en edit es derivada; Guardar sigue siendo `guardarEdicion` sin duplicar código.
- **Orden**: VentasCart → VentasManualScreen (mode + props edit) → Ventas.jsx (abrirEditar → manual screen, derivar cart + callbacks, dejar de usar VentasEditModal) → limpieza.

Este plan no incluye implementación de código; es solo análisis y plan de implementación para ejecutar por etapas y verificar después de cada una.
