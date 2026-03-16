# Refactor: arquitectura de datos del módulo Insumos (stock)

## Diagnóstico breve

- **Único escritor de `insumo_stock` en la app**: `useStockMutations.registrarMovimientoInsumo` (optimistic update + upsert a DB + insert en `insumo_movimientos`).
- **Carga**: `useAppData.loadData` lee `insumo_stock` (sin límite) y `insumo_movimientos` (límite 100). Arma `insumoStock` como mapa `insumo_id → cantidad`.
- **Problema**: Para algunos insumos la fila en `insumo_stock` queda en 0 aunque en `insumo_movimientos` hay muchos ingresos. Posibles causas: estado en memoria desactualizado cuando se calcula `nuevo` (ej. `insumoStock` sin esa clave), race con `loadData`/`onRefresh`, o orden/condición de ejecución en batch.
- **Fallback en UI**: `InsumosList` usa “si no hay `insumoStock` o está vacío, calculo stock sumando los últimos 100 movimientos”. Ese fallback es frágil (límite 100, y mezcla dos fuentes de verdad).

---

## Fuente de verdad y capas

### Regla de negocio

- **Fuente de verdad**: `insumo_movimientos` es el libro mayor (append-only). El stock actual de un insumo es la suma de todos sus movimientos (ingreso +, egreso -).
- **Cache**: `insumo_stock` es un cache derivado: debe cumplir siempre  
  `insumo_stock.cantidad = SUM(movimientos por ese insumo_id)`.
- **No stock negativo**: En UI y reportes se muestra `max(0, cantidad)`. En DB podemos permitir temporalmente negativo para auditoría o forzar `>= 0` con constraint; lo importante es que el cálculo sea consistente con movimientos.

### Insumos premezcla / composición

- Los insumos con `insumo_composicion` (premezclas) consumen sus **componentes** (egresos en los hijos). El stock que se muestra y se compra es el del insumo (y el de cada componente). No cambia la regla: cada fila de `insumo_stock` = suma de movimientos de ese `insumo_id`.

---

## Diseño por capas

### Capa 1 — Base de datos

| Responsabilidad | Qué hace |
|-----------------|----------|
| **insumo_movimientos** | Única tabla que la app escribe para “cambiar stock”. Cada fila es un movimiento (ingreso/egreso) con cantidad y valor. |
| **insumo_stock** | Cache de lectura: una fila por insumo con `cantidad` y `updated_at`. **Se actualiza solo por trigger** (o por job de reconciliación). |
| **Trigger (nuevo)** | `ON INSERT` en `insumo_movimientos`: calcula el nuevo total para ese `insumo_id` (leyendo `insumo_stock` actual o 0 si no existe) + delta del movimiento, hace `INSERT`/`UPDATE` en `insumo_stock`. Todo en la misma transacción que el `INSERT` del movimiento. |

Con eso:
- La app **solo** hace `INSERT` en `insumo_movimientos`.
- El stock en DB nunca se desincroniza del libro mayor (mismo transacción).

### Capa 2 — Hooks / mutaciones

| Archivo / hook | Responsabilidad |
|----------------|-----------------|
| **useAppData** | Sigue leyendo `insumo_stock` para armar `insumoStock`. Opcional: seguir leyendo `insumo_movimientos` con un límite solo para la UI de “últimos movimientos” (no para calcular stock). |
| **useStockMutations.registrarMovimientoInsumo** | Solo hace `INSERT` en `insumo_movimientos` (con tipo, cantidad, valor). Ya no escribe en `insumo_stock`. Tras el insert: actualiza estado en memoria con `setInsumoStock(prev => ({ ...prev, [insumo_id]: (prev[insumo_id] ?? 0) + delta }))` (optimistic). Opcional: después de insert, hacer un `select` de `insumo_stock` para ese `insumo_id` y actualizar estado con el valor real devuelto por la DB. |
| **loadData / onRefresh** | Siguen trayendo `insumo_stock` completo; la UI se corrige en el próximo refresh si hubo concurrencia. |

### Capa 3 — Componentes

| Componente | Cómo lee el stock |
|------------|-------------------|
| **InsumosList, InsumosCompra, InsumosDetalleModal, Stock, PlanSemanal, usePlanResumen, usePlanSemanalScreen, stockPlan.js** | Siguen usando `insumoStock` (mapa en memoria). Sin cambio de API. |
| **InsumosList** | Quitar el fallback que suma los últimos 100 movimientos para “stock”. Una vez que el trigger existe y `registrarMovimientoInsumo` solo inserta en movimientos, la fuente única para cantidad es `insumo_stock` → `insumoStock`. |

---

## Cuándo y cómo se recalcula `insumo_stock`

1. **En cada escritura (recomendado)**  
   Trigger en `insumo_movimientos`: al hacer `INSERT`, actualizar (o insertar) la fila correspondiente en `insumo_stock` con la nueva cantidad. Cálculo: `cantidad_actual_en_insumo_stock + (tipo = 'ingreso' ? cantidad : -cantidad)`.

2. **Migración puntual (una vez)**  
   Script SQL que, para cada `insumo_id` que tenga movimientos, calcule `SUM(cantidad * (tipo = 'ingreso' ? 1 : -1))` y haga `UPSERT` en `insumo_stock`. Así se corrige el estado actual de la tabla antes de poner el trigger.

3. **Opcional a futuro**  
   Job o función “reconciliar” que vuelva a calcular `insumo_stock` desde `insumo_movimientos` si se detecta inconsistencia; no es necesario para el refactor mínimo.

---

## Reglas de negocio a respetar

- **No stock negativo en display**: En la UI mostrar `max(0, valor)` para no confundir; en DB el trigger puede escribir `GREATEST(0, nuevo)` si se quiere impedir negativo a nivel dato.
- **Un solo camino de escritura**: Todo cambio de stock de insumos pasa por `INSERT` en `insumo_movimientos`. No hay otros updates directos a `insumo_stock` desde la app.
- **Premezclas**: Al “consumir” por producción se registran egresos en los insumos componentes (ya lo hace `consumirInsumosPorStock`); no cambia la regla de fuente de verdad.
- **Idempotencia de migración**: El script de reconciliación debe poder ejecutarse sin duplicar efecto (UPSERT por `insumo_id`).

---

## Lista priorizada de cambios concretos

### Prioridad 1 — DB (evitar divergencia de raíz)

1. **Migración: trigger en `insumo_movimientos`**  
   - Archivo nuevo en `supabase/migrations/` (ej. `YYYYMMDD_insumo_stock_trigger.sql`).  
   - Crear función que: dado `NEW.insumo_id`, `NEW.tipo`, `NEW.cantidad`, lea cantidad actual de `insumo_stock` (o 0), calcule nueva cantidad, haga `INSERT ... ON CONFLICT (insumo_id) DO UPDATE SET cantidad = EXCLUDED.cantidad, updated_at = now()`.  
   - Crear trigger `AFTER INSERT ON insumo_movimientos FOR EACH ROW EXECUTE` esa función.

2. **Migración: reconciliación una vez**  
   - Mismo u otro archivo SQL: script que para cada `insumo_id` en `insumo_movimientos` calcule `SUM(cantidad * (CASE WHEN tipo = 'ingreso' THEN 1 ELSE -1 END))` y haga upsert en `insumo_stock`. Así las filas existentes quedan alineadas con el historial antes de depender del trigger.

### Prioridad 2 — Mutaciones (un solo camino de escritura)

3. **useStockMutations.js — `registrarMovimientoInsumo`**  
   - Dejar de hacer `upsert` en `insumo_stock`.  
   - Hacer solo `insert` en `insumo_movimientos` (y opcionalmente `select` del movimiento creado).  
   - Mantener: actualización optimista en memoria con `setInsumoStock` (y si se quiere, después de insert leer `insumo_stock` para ese `insumo_id` y sincronizar estado).  
   - En caso de error en el insert, hacer rollback del estado en memoria (revertir el delta).  
   - Eliminar el rollback que re-escribía `insumo_stock` en DB al fallar el insert de movimiento (ya no tocamos esa tabla desde la app).

### Prioridad 3 — Carga y UI

4. **useAppData.js**  
   - Sin cambios estructurales; sigue cargando `insumo_stock` y opcionalmente `insumo_movimientos` (para lista de últimos movimientos). Si se sube el límite de movimientos, solo para la sección “últimos movimientos”, no para calcular stock.

5. **InsumosList.jsx**  
   - Quitar la lógica de fallback que usa `stockFromMovimientos` cuando `insumoStock` está vacío o no tiene claves. Mostrar siempre el stock desde `insumoStock[insumo_id] ?? 0`.  
   - Opcional: mantener la sección “Últimos movimientos” leyendo `insumoMovimientos` (solo para mostrar lista, no para cantidad).

### Prioridad 4 — Verificación y documentación

6. **Verificación**  
   - Tras deploy: registrar una compra de un insumo que antes quedaba en 0; comprobar en Supabase que `insumo_movimientos` tiene el nuevo registro y que `insumo_stock` se actualizó (trigger).  
   - Revisar que InsumosList, InsumosCompra y Plan semanal muestren el mismo número después de refresh.

7. **Documentación**  
   - Dejar este doc como referencia; opcional: un comentario en `useStockMutations.js` y en la migración del trigger indicando que `insumo_stock` se mantiene solo por el trigger a partir de `insumo_movimientos`.

---

## Resumen de archivos a tocar

| Archivo | Cambio |
|---------|--------|
| `supabase/migrations/` (nuevo) | Trigger AFTER INSERT en `insumo_movimientos` que actualiza `insumo_stock`. |
| `supabase/migrations/` (nuevo o mismo) | Script de reconciliación: recalcular `insumo_stock` desde `insumo_movimientos`. |
| `src/hooks/useStockMutations.js` | En `registrarMovimientoInsumo`: quitar upsert a `insumo_stock`; solo insert en `insumo_movimientos` + optimistic update en memoria; ajustar rollback en error. |
| `src/components/insumos/InsumosList.jsx` | Quitar fallback `stockFromMovimientos` para la columna Stock; usar solo `insumoStock`. |
| `src/hooks/useAppData.js` | Sin cambios obligatorios (opcional: aclarar en comentario que el stock viene de `insumo_stock` mantenido por trigger). |

---

## Migración para el usuario

- **Deploy**: aplicar las dos migraciones (trigger + reconciliación) en el mismo orden. No hace falta truncar tablas; la reconciliación sobrescribe `insumo_stock` con valores coherentes con el historial.
- **Rollback**: si hubiera que volver atrás, se puede eliminar el trigger y volver a la versión anterior de `registrarMovimientoInsumo` que hacía upsert; luego ejecutar de nuevo la reconciliación si se desea alinear de nuevo.

Con esto el modelo de datos y la capa de mutaciones quedan sólidos: una sola fuente de verdad (`insumo_movimientos`), cache derivado (`insumo_stock`) actualizado en la misma transacción, y componentes leyendo siempre el mismo mapa `insumoStock` sin lógica de fallback que mezcle fuentes.
