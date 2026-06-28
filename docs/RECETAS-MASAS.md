# Recetas, masas y familias

Guía para configurar cadenas **masa base → porcionada → producto** en Recetas y que el plan semanal las calcule bien.

## Tipos de receta

| Tipo | Cuándo usarlo | Ejemplo |
|------|---------------|---------|
| **Masa base** | Batch que amasás; no se vende | Masa Sablée, Masa Brownie |
| **Masa porcionada** | Porción pesada de una base | Masa Sablée 45g |
| **Producto** | Lo que vendés | Brownie porción, Pastafrola |

En la pantalla Recetas podés filtrar por **Masas** / **Productos** y agrupar productos por **Familia** (ej. `Brownie`).

## Brownie (una masa base, varias variantes)

1. Abrí un Brownie existente con insumos crudos.
2. **Extraer masa** → elegí los ingredientes del batter → nombre `Masa Brownie`, familia `Brownie`.
3. Guardá el producto (queda usando la masa en gramos).
4. **Nueva variante** desde un Brownie ya configurado para crear porción, 20cm, frutos rojos, etc.
5. Ajustá gramos de masa, extras y precio en cada variante.

Todas las variantes deben compartir familia `Brownie` y usar **Masa Brownie** como precursora (no duplicar premezcla/huevos).

## Pastafrola / Sablée

1. Creá **Masa Sablée** (tipo Masa base) con insumos reales. Oculta en venta.
2. Desde esa receta: **Crear porciones** → `45, 55` (o las que uses).
3. Editá **Pastafrola**: ingrediente = Masa Sablée 45g o 55g (no costo fijo “Masa Sablée”).
4. Familia opcional: `Pastafrola` o `Sablée`.

Cadena resultante: `Masa Sablée` → `Masa Sablée 45g` → `Pastafrola`.

## Plan semanal

- Tab **Masas** del día: sub-secciones **Base** / **Porcionadas**.
- **Resumen de masas**: planificado vs necesario (base y porcionadas por separado).
- Si faltan masas: alerta + botón **Completar masas faltantes**.

## Precios y costos al reestructurar

### Lo que NO cambia solo

| Qué | Comportamiento |
|-----|----------------|
| **Precio de venta** | Queda en el **producto** (`precio_venta`). Extraer masa no lo modifica. |
| **Ventas ya cargadas** | Usan el `precio_unitario` guardado en esa venta — no se recalculan. |
| **Analytics futuro** | Usa costo calculado de la receta × cantidad vendida. |

### Lo que tenés que configurar bien

1. **`gramos_por_unidad` en cada masa** — obligatorio si la cargás en gramos (ej. 80 g de Masa Brownie, 45 g de Sablée porcionada). Sin eso el costo muestra «—» y el margen queda mal.
2. **Masa Brownie: `gramos_por_unidad` = gramos totales del batch** (suma de insumos del batter) si `rinde = 1`.
3. **Producto: gramos de masa por unidad** = cuántos gramos de masa lleva **una** unidad vendida.
4. **Pastafrola:** al pasar de costo fijo $240 a masa real, el **costo puede cambiar** — compará margen antes y después y ajustá precio si hace falta.

### Checklist después de migrar

- [ ] Guardar **Masa Brownie** → costo > $0 en el panel del modal
- [ ] Guardar cada **variante Brownie** → costo similar al que tenía con insumos crudos
- [ ] **Margen** en la card de Recetas razonable (no «—»)
- [ ] **Masa Sablée** + porciones 45g/55g con `gramos_por_unidad` correctos
- [ ] **Pastafrola** enlazada a porcionada (no costo fijo)
- [ ] Probar venta nueva: precio de mostrador igual al habitual

### Equivalencia esperada

Si movés los mismos insumos del producto a la masa base y el producto usa exactamente ese batch en gramos, el **costo unitario del producto debe ser casi igual** al anterior (tests automáticos en `src/lib/costos.test.js`).

Al guardar una masa, la app **propaga el recálculo de costos** a productos que la usan (mismo criterio que cuando cambiás precio de un insumo).


1. Ejecutá migraciones Supabase (columna `recetas.familia`).
2. Reconfigurá Brownie y Sablée/Pastafrola con los flujos de arriba.
3. Verificá en Plan semanal que planificar Pastafrolas muestre necesidad de porcionada + base.

## Campos útiles

- **Gramos por unidad** en masas: permite cargar la precursora en gramos en otras recetas y en el plan.
- **Oculto en venta**: masas intermedias no deben aparecer en ventas.
- **Familia**: solo agrupa la lista; no cambia costos.
