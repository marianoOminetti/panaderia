# Unificación de flujos: Nueva Venta, Cargar producción, Registrar compra

Documento para validar con el dueño y prompt listo para Cursor.

---

## 1. Análisis de impacto en el negocio

### Qué mejora para el usuario y la operación

| Área | Situación actual | Después de unificar |
|------|------------------|---------------------|
| **Aprendizaje** | Tres pantallas distintas: en ventas ves grilla y carrito arriba; en Stock una lista larga con carrito abajo; en Insumos otro layout y un flujo extra “Insumos en 0” con formulario. Quien hace las tres tareas tiene que recordar tres formas de trabajar. | Una sola forma de trabajar: mismo header, carrito siempre arriba, lista/grilla abajo con buscador y filtros. Un solo “modelo mental” para venta, producción e insumos. |
| **Velocidad** | En Cargar producción hay que scrollear para ver el carrito y los productos sin stock se mezclan con los que tienen. En Insumos el carrito muestra 4 líneas por ítem y precios con decimales (ej. 6298.1). Más tiempo buscando y leyendo. | Carrito siempre visible arriba; tap en producto = agrega; ítems de carrito resumidos (nombre, cantidad, precio, subtotal); precios redondeados cuando son > $100. Menos scroll y menos ruido visual. |
| **Errores** | Dos flujos en Insumos (formulario “Insumos en 0” vs carrito de compra) generan duda: “¿esto lo cargo acá o en el otro?”. Riesgo de cargar dos veces o no cargar. | Un solo camino para registrar compras: todo por el carrito. Sin formulario “Insumos en 0”; si hay insumos en 0 se sugiere registrarlos desde Registrar compra. |
| **Consistencia** | La referencia es Nueva Venta (la que más se usa). Stock e Insumos se sienten “otra app”. | Los tres flujos se ven y se usan igual: mismo patrón de pantalla y mismos gestos (tap = agregar, carrito arriba, confirmar con un botón). |

**Resumen:** Menos fricción, menos confusión y menos tiempo por tarea; misma lógica de guardado y de precios (Supabase, propagación de precios, Voz, colores/tipografía y pantalla principal de Insumos no cambian).

---

## 2. Resumen de requisitos en lenguaje de producto (para validar con el dueño)

- **Mismo layout en los tres flujos**  
  - Header fijo con: Volver, título, total/resumen a la derecha, botón Voz y botón principal (Cobrar / Cargar / Registrar compra).  
  - Debajo del header: **carrito siempre visible arriba** (en una card).  
  - Debajo del carrito: **lista o grilla de ítems** con **buscador y filtros siempre visibles** (sin abrir pantallas nuevas).

- **Interacción**  
  - **Tap en un producto/insumo = agregar al carrito** (cantidad 1 o una presentación). Ajuste de cantidad con +/− en el carrito. No abrir pantallas nuevas para agregar.

- **Cargar producción (Stock)**  
  - Mismo header y orden que Nueva Venta: carrito arriba, lista/grilla abajo.  
  - Buscador y filtros visibles.  
  - Productos **sin stock** separados o marcados (ej. al final o con estilo distinto) para priorizar los que tienen stock.

- **Registrar compra (Insumos)**  
  - Mismo header y orden: carrito arriba, lista de insumos abajo con buscador y filtros visibles.  
  - **Carrito simplificado**: por ítem mostrar solo lo esencial (nombre, cantidad, precio por presentación, subtotal; máx. 2 líneas de detalle).  
  - **Precios en carrito**: siempre redondeados cuando son > $100 (sin decimales tipo 6298.1 en pantalla).  
  - **Eliminar el flujo “Insumos en 0” con formulario**: ya no existe esa pantalla con inputs por insumo. Si al cargar producción hay insumos en 0, se informa y se sigue (o se sugiere registrarlos desde “Registrar compra”); todo lo que se compra se registra solo por el carrito de compra.

- **Qué no cambia**  
  - Lógica de guardado en Supabase.  
  - Propagación de precios al confirmar compra de insumos (actualización de precios e historial).  
  - Botón y flujo de Voz.  
  - Colores y tipografía.  
  - Pantalla principal de Insumos (lista, botón “Registrar compra de stock”, etc.).

---

## 3. Prompt para Cursor (implementación)

Copia y pega el siguiente bloque en Cursor para implementar la unificación.

```markdown
## Objetivo
Unificar la experiencia visual y de uso de tres flujos usando **Nueva Venta** como referencia:
1. **Nueva Venta** (referencia) — VentasManualScreen
2. **Cargar producción** — StockProductionModal (Stock)
3. **Registrar compra** — InsumosCompra (Insumos)

Los tres deben compartir: header fijo, carrito siempre visible arriba, lista/grilla abajo con buscador y filtros visibles. Tap en ítem = agrega al carrito. Sin abrir pantallas nuevas para agregar.

---

## Referencia: Nueva Venta (VentasManualScreen)

Estructura actual a replicar en Stock e Insumos:
- **Header** (screen-header): [← Volver] [Título + subtítulo] [Total/resumen] [🎙️ Voz] [Botón principal]
- **Contenido** (screen-content):
  1. Primera card: **Carrito** (título "Carrito") + lista de ítems con +/−, precio editable si aplica, subtotal, ✕. Total al pie.
  2. Segunda card: **Productos/Insumos** con buscador y filtros visibles en la parte superior de la card (o barra fija arriba de la grilla). Grilla de 2 columnas (ventas) o lista clicable; tap en ítem = addToCart / agregar al carrito.

Si en Ventas no existe aún buscador/filtros en la grilla de productos, agregarlos para que la referencia sea completa (input de búsqueda + filtros por categoría o tipo si aplica).

---

## Cambios en Cargar producción (Stock)

**Archivos:** `src/components/stock/StockProductionModal.jsx`, y si hace falta `Stock.jsx` para estado de búsqueda/filtro.

1. **Mismo header que Nueva Venta**
   - Izq: ← Volver.
   - Centro: título "Cargar stock", subtítulo "Carrito de producción".
   - Der: Total (+N u), 🎙️ Voz, ✓ Cargar.
   - Usar las mismas clases y estructura que VentasManualScreen (screen-header, mismos estilos de Total y botones).

2. **Orden del contenido**
   - **Primera card:** "Carrito de stock" (arriba). Contenido igual que ahora: ítems con emoji, nombre, +cantidad; Total a cargar; Vaciar carrito; botón Cargar. Sin duplicar el botón Cargar abajo.
   - **Segunda card:** "Productos". Arriba de la lista, **buscador** (input) y **filtros** si tiene sentido (ej. "Todos / Sin stock / Con stock"). Lista o grilla de productos.

3. **Lista de productos**
   - Mostrar en **grilla de 2 columnas** (mismo patrón que Ventas: producto-card con emoji, nombre, stock, +/−) O lista de una columna con el mismo estilo de ítem.
   - **Tap en la fila/card** = agregar 1 al carrito (addToStockCart(receta, 1)). Los botones +/− pueden quedarse en la card o solo en el carrito.
   - **Orden / highlight:** Productos **con stock** primero (o agrupados arriba); productos **sin stock** al final o con estilo distinto (ej. opacidad, borde o texto "Sin stock" en color var(--danger)). No mezclar sin criterio.

4. **Sin pantallas nuevas**
   - Todo en la misma pantalla overlay; no abrir modales adicionales para elegir productos.

---

## Cambios en Registrar compra (Insumos)

**Archivos:** `src/components/insumos/InsumosCompra.jsx`, y estado en `Insumos.jsx` si hace falta para búsqueda/filtros dentro del screen.

1. **Mismo header que Nueva Venta**
   - Izq: ← Volver.
   - Centro: título "Registrar compra de stock" (o "Registrar compra"), subtítulo opcional.
   - Der: **Total** de la compra, 🎙️ Voz, ✓ Registrar compra.
   - Mover el bloque de Voz del contenido al header (solo el botón 🎙️ Voz); la fila de "Dictá por ejemplo..." puede quedar colapsada o como hint debajo del header, o eliminarse si el botón es suficiente.

2. **Orden del contenido**
   - **Primera card:** "Carrito de compra" (arriba). **Ítems simplificados** (ver punto 3).
   - **Segunda card:** "Insumos". Arriba: **buscador** y **filtros** (categorías) siempre visibles. Lista o grilla de insumos; tap = agregar 1 presentación al carrito.

3. **Carrito simplificado (máx. 2 líneas por ítem)**
   - Por ítem mostrar: **nombre**; una línea con cantidad (+/−), precio por presentación (input), subtotal; botón ✕.
   - Quitar: la línea "Cantidad: X g (N × Y g)", la línea "Precio por presentación: [input] antes $Z · +N%", y la línea "Subtotal: $W" como tercera línea. Integrar en una sola línea: cantidad, precio (editable), subtotal. Segunda línea solo si hace falta (ej. "antes $Z" en texto pequeño).
   - **Precios en carrito:** En toda la UI del carrito (valores mostrados, no solo total), usar **redondeo a entero cuando el valor es > 100**. Crear o usar una función tipo `fmtPrecio(n)` que si n >= 100 devuelve formato sin decimales; si n < 100 puede mantener 1 decimal. Aplicar a: precio por presentación mostrado, subtotal por ítem, total de la compra. Los inputs pueden seguir aceptando decimales internamente pero al mostrar el valor prellenado usar el mismo criterio.

4. **Lista de insumos**
   - Buscador y filtros (categoría) **siempre visibles** arriba de la lista, sin scroll para verlos.
   - Tap en insumo = agregar al carrito (agregarAlCarritoCompra). Lista en una columna o grilla según espacio; mismo patrón de ítem que en ventas (nombre, presentación, precio, stock).

5. **Eliminar flujo "Insumos en 0" (formulario)**
   - En **Stock**: eliminar el uso de `StockInsumosEnCeroModal`. Cuando al cargar producción (manual o voz) se detecten insumos en 0:
     - No abrir el modal con el formulario de cantidades.
     - Opción A: seguir con la carga igual (omitir) y mostrar un toast: "Stock cargado. Algunos insumos están en 0; registralos en Insumos → Registrar compra si los compraste."
     - Opción B: mostrar un mensaje breve (toast o alert corto) con un solo botón "Seguir igual" que ejecute la misma lógica que hoy hace "Omitir y seguir igual" (completar la carga de producción sin registrar insumos).
   - Eliminar o no renderizar `StockInsumosEnCeroModal`; quitar estado `insumosEnCeroModal` y llamadas a `setInsumosEnCeroModal` para ese flujo. La lógica de `confirmarInsumosEnCero` (registrar movimientos de insumos) ya no se usa desde ese modal; si se necesita en otro lado, conservarla en un helper pero no vinculada al modal.

---

## Lo que NO debe cambiar
- Lógica de guardado en Supabase (ventas, stock, movimientos de insumos, precios).
- Propagación de precios al confirmar compra de insumos (updateInsumo, insertPrecioHistorial, updateRecetaCostos, etc.).
- Botón y flujo de Voz (reconocimiento, parsing, guardado).
- Colores (variables CSS existentes) y tipografía.
- Pantalla principal de Insumos (InsumosList, botón "Registrar compra de stock", búsqueda y pestañas de categoría en esa pantalla).

---

## Lista de verificación final
- [ ] Los tres flujos tienen el **mismo header** (Volver, título, total/resumen, Voz, botón principal).
- [ ] **Carrito siempre visible arriba** en los tres (primera card del contenido).
- [ ] **Buscador y filtros visibles** en la sección de productos/insumos (sin scroll para verlos).
- [ ] **Tap en producto/insumo = agrega al carrito**; no abre pantallas nuevas.
- [ ] Stock: productos sin stock **ordenados o destacados** (al final o con estilo distinto).
- [ ] Insumos: **carrito simplificado** (máx. 2 líneas por ítem); **precios sin decimales** cuando > $100 en toda la UI del carrito.
- [ ] **Flujo "Insumos en 0" eliminado**: no se muestra el modal con formulario; al detectar insumos en 0 se sigue o se muestra mensaje + "Seguir igual".
- [ ] Nueva Venta (referencia) tiene buscador y filtros en la grilla de productos (si no existían, agregados).
```

---

## Uso del documento

- **Sección 1:** Para explicar al dueño por qué unificar y qué gana el negocio.
- **Sección 2:** Para validar con el dueño el qué (requisitos) antes de desarrollar.
- **Sección 3:** Para que un desarrollador pegue el prompt en Cursor e implemente; la lista de verificación al final sirve como checklist de aceptación.
