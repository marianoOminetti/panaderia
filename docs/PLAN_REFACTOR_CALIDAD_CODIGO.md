### Plan de mejora de calidad, refactor y limpieza

Este documento define un plan iterativo para recuperar y mantener la calidad del código en la app de la panadería, sin frenar el negocio.

---

### Diagnóstico (alto nivel)

- **Componentes y hooks gigantes**: varios archivos pasan 300–400+ líneas (`Ventas.jsx`, `GastosFijos.jsx`, `usePlanSemanalScreen.js`, `useInsumosCompra.js`, etc.), mezclando UI, negocio y Supabase.
- **Dominios claros pero mezclados**: ventas, pedidos, gastos, stock, plan, clientes, etc. están en `components/`, `hooks/` y `lib/` sin una estructura de feature consistente.
- **Lógica de negocio en UI**: pantallas como `Ventas.jsx`, `GastosFijos.jsx`, `ClienteDetallePedidos.jsx`, `PlanSemanal` concentran queries, cálculos y layout en el mismo archivo.
- **Hooks de dominio “todo-en-uno”**: hooks enormes (`usePlanSemanalScreen`, `useVentasEdit`, `useInsumosCompra`) funcionan como mini-services sin separar lectura, escritura y estado de UI.
- **Transición incompleta en pedidos**: entran `Pedidos.jsx`, `PedidosList.jsx`, `PedidosListFilters.jsx` y `lib/pedidos.js` mientras se borran `PedidoFormModal.jsx` y `usePedidoForm.js` ⇒ probable mezcla de flujo nuevo con restos del viejo.
- **Hooks muy acoplados a pantallas/modales**: nombres como `useVentasChargeModal`, `usePlanSemanalScreen` dificultan reuso y testeabilidad.
- **`App.js` demasiado cargado**: concentra routing, nav y parte de la orquestación de negocio.
- **`lib` mezclando dominio y helpers**: `lib/gastosFijos.js`, `lib/ventas.js`, `lib/stock*` junto con `lib/dates.js`, `lib/format.js` sin separación clara.
- **Migraciones Supabase recientes**: `gastos_fijos_vigencia` y `check_and_fix_pedidos` sugieren que puede haber código todavía atado a esquemas viejos o con ramas de compatibilidad.

---

### Ejes de trabajo priorizados

1. **Ventas y pedidos (flujos críticos de caja)**
   - **Dolor**: mucha lógica repartida entre pantallas, hooks y lib; coexistencia de viejo/nuevo; riesgo alto de bugs silenciosos.
   - **Meta**: un flujo único y claro, con lógica de dominio en hooks/lib finos y pantallas livianas.

2. **Gastos fijos y costos**
   - **Dolor**: `GastosFijos.jsx` enorme + nueva lógica de vigencias en la DB; probable mezcla de reglas con UI.
   - **Meta**: lógica de gastos fijos alineada con las migraciones, concentrada en una capa de dominio.

3. **Plan semanal, stock e insumos**
   - **Dolor**: hooks gigantes y componentes largos combinando cálculos de producción, stock y UI.
   - **Meta**: cálculos concentrados en funciones puras/lib, pantallas que solo orquestan.

4. **Arquitectura por features & rol de `App`**
   - **Dolor**: `components/` + `hooks/` + `lib/` global sin feature modules, `App.js` como hub de todo.
   - **Meta**: cada dominio con su mini “feature package” y un `App` mucho más liviano.

5. **Catálogo de hooks y limpieza**
   - **Dolor**: muchos hooks con nombres muy específicos, algunos probablemente muertos o duplicados.
   - **Meta**: set mínimo y claro de hooks de dominio y de UI, con todo lo viejo marcado o eliminado.

6. **Capa de datos Supabase consistente**
   - **Dolor**: riesgo de queries duplicadas/inconsistentes y de código que no refleja las últimas migraciones.
   - **Meta**: capa bien definida por entidad para todas las operaciones con Supabase.

---

### Roadmap por iteraciones

#### Iteración 1 – Mapear y estabilizar ventas/pedidos

- **Objetivo**: Entender y documentar el flujo actual, y sacar del medio el legacy obvio.
- **Refactor**
  - Mapear responsabilidades de `Ventas.jsx`, `VentasManualScreen.jsx`, `ClienteDetallePedidos.jsx`, `Pedidos.jsx`, `PedidosList.jsx`, `PedidosListFilters.jsx` y `lib/pedidos.js` (solo lectura y comentarios, sin mover lógica todavía).
  - Revisar `useVentas*` y `lib/ventas.js` para identificar qué se usa realmente.
  - Ver en `App.js` / `AppContent.jsx` exactamente cómo se enrutan ventas/pedidos.
- **Borrado**
  - Confirmar que lo eliminado (`PedidoFormModal.jsx`, `usePedidoForm.js`) no deja referencias colgando.
  - Taggear internamente (comentario + issue) componentes/rutas “en desuso” que siguen vivos, para eliminarlos en la próxima iteración.
- **DX/UX**
  - Crear un checklist corto de QA manual para:
    - crear/modificar/cobrar una venta
    - crear/modificar un pedido

#### Iteración 2 – Extraer dominio de ventas/pedidos a hooks/lib

- **Objetivo**: Adelgazar las pantallas sin cambiar UX.
- **Refactor**
  - Definir hooks de dominio: `useVentasData`, `useVentasMutations`, `usePedidosData`, `usePedidosMutations`.
  - Mover desde los componentes:
    - llamadas a Supabase
    - cálculos de totales, estados, filtros
    - parseos/formateos de datos
  - Ajustar componentes para que consuman estos hooks con props simples (`items`, `isLoading`, `onCreate`, etc.).
- **Borrado**
  - Eliminar funciones no usadas en `lib/ventas.js` y `lib/pedidos.js`.
  - Borrar hooks legacy de ventas/pedidos que ya no se referencien.
- **DX/UX**
  - Documentar contratos básicos de los nuevos hooks (inputs/outputs) en un README interno muy corto.

#### Iteración 3 – Alinear gastos fijos con migraciones

- **Objetivo**: Asegurar que la lógica de gastos fijos refleje fielmente el modelo de la DB.
- **Refactor**
  - Revisar `GastosFijos.jsx`, `useGastosFijos.js`, `useGastosFijosForm.js`, `lib/gastosFijos.js` y `20260311120000_gastos_fijos_vigencia.sql`.
  - Extraer a `lib/gastosFijos.js`:
    - cálculo de vigencias
    - validaciones de fechas/montos
    - cualquier lógica que se use en métricas de ganancia.
  - Convertir `GastosFijos.jsx` en un contenedor que consume estos cálculos.
- **Borrado**
  - Quitar funciones viejas que asuman un modelo sin vigencia o columnas antiguas.
- **DX/UX**
  - Documentar con 2–3 ejemplos cómo debería funcionar la vigencia (qué pasa al cambiar fechas, etc.).

#### Iteración 4 – Plan semanal, stock e insumos

- **Objetivo**: Sacar los cálculos pesados fuera de las pantallas.
- **Refactor**
  - Desarmar `usePlanSemanalScreen.js`, `useInsumosCompra.js`, `useStockMutations.js` en:
    - funciones puras en `lib` (`calcularProduccion`, `calcularStockNecesario`, etc.)
    - hooks de dominio (`usePlanSemanalData`, `useStockPlan`).
  - Reducir componentes `PlanSemanal`, `Stock`, `Insumos*` a orquestadores que llaman esos hooks/lib.
- **Borrado**
  - Unificar cálculos duplicados y borrar variantes obsoletas.
- **DX/UX**
  - Con la lógica centralizada, revisar que los mismos números se vean coherentemente en dashboard/analytics/plan.

#### Iteración 5 – Estructura por features y adelgazar `App`

- **Objetivo**: Dar el paso mínimo hacia una arquitectura que escale.
- **Refactor**
  - Introducir `src/features/<dominio>/` y mover allí:
    - componentes principales, hooks de dominio y lib de cada dominio.
  - Dejar `src/components/` solo para UI genérica (`ui`, `shared`).
  - Simplificar `App.js` a:
    - providers globales
    - rutas
    - layout base
- **Borrado**
  - Limpiar carpetas viejas, helpers duplicados y rutas no usadas.
- **DX/UX**
  - Dejar un README pequeño por feature con:
    - entry points
    - hooks principales
    - tablas de Supabase relevantes.

---

### Reglas de código / convenciones

- **Estructura por features**: todo lo de negocio vive en `src/features/<dominio>/{components,hooks,lib}`; `src/lib` queda para utilidades transversales (fechas, formatos, etc.).
- **Límites de tamaño**: si un componente u hook pasa las ~250 líneas, hay que abrir tarea de extracción; >300 líneas es refactor obligatorio.
- **Tipos de hooks**:
  - `use<Entity>Data` y `use<Entity>Mutations` para dominio.
  - `use<Entity><Context/UI>` para estado de UI (filtros, tablas, modales).
- **Supabase encapsulado**: solo hooks de dominio o servicios de datos tocan Supabase; componentes nunca.
- **Naming consistente**: evitar nombres pegados a una pantalla (`usePlanSemanalScreen`) para lógica de dominio; esos nombres se reservan para hooks de UI.
- **Domino vs utilidades**:
  - código que conoce tablas/negocio → `features/<dominio>/lib`.
  - helpers genéricos → `src/lib`.
- **Gestión de legacy**: cualquier archivo sospechado de legacy se marca explícitamente y se prohíbe agregarle lógica nueva; en vez de eso, se crea la versión correcta y se migra.
- **Migraciones con checklist**: toda migración relevante requiere revisar y listar dónde se toca esa tabla en el código (hooks/lib del dominio).
- **`App` sin negocio**: `App.js` se limita a providers, rutas, layout; nada de reglas de negocio ni llamadas directas a Supabase.
- **UI genérica sin dominio**: componentes en `components/ui` / `shared` no reciben entidades crudas (`venta`, `pedido`), solo props “planas”.
- **Checklists de QA manual**: cualquier refactor en ventas/pedidos/gastos pasa por un checklist mínimo antes de mergear.
- **README por feature**: cada módulo clave tiene un README con entry points, hooks principales y dependencias de Supabase.

