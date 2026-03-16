## Radiografía UX actual

- **Rol del módulo de Insumos en la app**
  - Es una pantalla tipo **lista + hub de acciones**: desde un solo lugar se accede a alta/edición de insumo, compras masivas de stock, detalle y movimientos.
  - Sigue patrones globales de la app: título de pantalla (`Insumos`), subtítulo explicativo y tarjetas (`card`) para agrupar flujos.
  - El módulo conecta directamente con **stock**, **precios unitarios** y, a través de recetas, con **costos y márgenes**.
  - En el uso real actual, el foco está en **dar de alta insumos, actualizar precios y consultar el detalle para verificar si el precio está bien**; el flujo de **edición agregando composición/premezclas** se percibe más pesado y el acceso a **“Editar insumo” desde el detalle no es tan evidente**, lo que desincentiva su uso.

- **Pantalla principal de Insumos**
  - **Encabezado**:
    - Título `Insumos` y subtítulo con cantidad y contexto: `X materias primas · ingresos y egresos para calcular ganancia`.
    - Refuerza el rol de la pantalla dentro del negocio (no solo gestión de stock, sino impacto en ganancia).
  - **Card “Compras de stock”**:
    - Texto de ayuda: “Registrá en un solo paso lo que compraste y cuánto pagaste. Ideal cuando volvés del súper.”
    - Botón primario: `📥 Registrar compra de stock` que abre el flujo de compra masiva (`InsumosCompra`).
    - El copy apunta a rapidez (“un solo paso”) y al momento de uso (post compra).
  - **Buscador + filtros**:
    - `search-bar` con placeholder “Buscar insumo...”.
    - Tabs de categoría (`cat-tabs`) con opción “Todos” + categorías definidas en `CATEGORIAS`.
    - Mantiene el patrón global de listas: buscador siempre antes de la lista y filtros arriba.
  - **Card “Stock y precios”**:
    - Lista de insumos filtrados/ordenados:
      - Ítem con punto de color por categoría (`insumo-dot`), nombre (`insumo-nombre`), detalle (`insumo-detalle`) y precio actual (`insumo-precio`).
      - Detalle muestra: `presentacion · chip con precio por unidad · Stock: X unidad · "Tocar para ver" subrayado`.
      - `precioPorU` calcula precio unitario en base a `precio`, `cantidad_presentacion` y `unidad`, usando unidad por defecto (`g`) y formato consistente (`fmt`).
      - Stock negativo se resalta en rojo (`var(--danger)`, bold).
    - Estado vacío:
      - Usa patrón global: ícono (`📦`), texto “Sin resultados” dentro de `empty`.
  - **Últimos movimientos**:
    - Card opcional con hasta 20 movimientos recientes:
      - Borde izquierdo verde/rojo según ingreso/egreso, texto con cantidad, nombre de insumo y tipo (“(ingreso)/(egreso)”).
      - Fecha formateada `toLocaleString("es-AR")` y valor si aplica.
    - Refuerza la visibilidad de cambios recientes sobre stock y valores.
  - **Acción de alta rápida**:
    - Botón flotante (`fab`) con “+” para crear nuevo insumo, consistente con patrón de acciones principales en listas.

- **Formulario de insumo (`InsumosFormModal`)**
  - **Estructura y navegación**:
    - Se abre como `screen-overlay` con header tipo pantalla de acción:
      - `← Volver` arriba a la izquierda (patrón global).
      - Título dinámico: “Nuevo insumo” vs “Editar insumo”.
    - Contenido en `screen-content` con campos en columna.
  - **Campos principales**:
    - `Nombre`:
      - `FormInput` con label visible, placeholder (“Ej: Harina de almendras”) y `required`, auto-focus.
      - Alineado con reglas globales de formularios (labels siempre visibles).
    - `Categoría`:
      - Select buscable (`SearchableSelect`) con opciones desde `CATEGORIAS`.
      - Label propio (`form-label`) y placeholder “Seleccionar categoría”.
    - `Precio`:
      - `FormMoneyInput` con label “Precio”, placeholder “4500”, `required`.
      - Es el precio de la presentación completa (no explícito en el copy).
    - `Presentación`:
      - `FormInput` con label “Presentación” y placeholder “x 30 u”.
      - Campo de texto libre para describir el empaque (ej. “x 25 kg”, “x 12 u”).
    - `Cantidad`:
      - `FormInput` tipo `number` con label “Cantidad”, placeholder “30”.
      - Representa `cantidad_presentacion`: cuánta unidad de medida hay en la presentación.
    - `Unidad`:
      - `SearchableSelect` con opciones (`UNIDADES`): g, ml, u, kg, l.
      - Label “Unidad” y placeholder “Unidad”.
  - **Acciones y feedback**:
    - Botón primario:
      - Texto según contexto: “Agregar insumo” / “Guardar cambios” / “Guardando...”.
      - Deshabilitado mientras `saving` o si faltan nombre o precio.
    - Botón secundario:
      - “Cancelar” como salida clara sin cambios.
    - Validaciones simples (nombre y precio obligatorios), feedback de guardado via label del botón + toasts (desde hooks).

- **Flujo de compras de stock**
  - Desde la card “Compras de stock” se abre `InsumosCompra` como pantalla de carrito:
    - Carrito de ítems comprados (`compraCart`) con cantidades, precios, total (`totalCompra`) y estado de guardado (`compraSaving`).
    - `precioPorU` se reutiliza para comunicar impacto unitario.
    - Se siguen patrones de pantalla de carrito ya usados en ventas/stock (carrito arriba, selección abajo; botón de confirmar compra principal).
  - Confirmar compra dispara:
    - Registro de movimientos de insumo (`registrarMovimientoInsumo`).
    - Actualización de precios de insumos (`updateInsumo`, `insertPrecioHistorial`).
    - Recalculo de costos de recetas (`updateRecetaCostos`) según decisiones del usuario.
  - Flujo intermedio de decisión de precios:
    - `InsumosPrecioDecisionModal`:
      - Pantalla/modal donde se decide, por insumo, si actualizar o no el precio en base a lo comprado.
      - Permite granularidad: no todo lo comprado impacta precios automáticamente.
  - Resultado de compra:
    - `InsumosCompraResultadoModal`:
      - Comunica resultado de la compra (compraResultado).
      - Da opción explícita `onVerRecetasAfectadas` para navegar al impacto en recetas/costos.

- **Detalle y eliminación de insumos**
  - `InsumosDetalleModal`:
    - Pantalla/modal de detalle con:
      - Información de stock, composición (`insumoComposicion`), recetas que lo usan y precio por unidad (`precioPorU`).
      - Acciones de edición: abrir `InsumosFormModal` con datos precargados.
      - Acciones de eliminación:
        - Confirma con mensaje: `¿Eliminar el insumo "Nombre"?` con opción destructiva.
        - Si falla (en uso en recetas o movimientos), muestra toast: `⚠️ No se pudo eliminar (en uso en recetas o movimientos)`.
    - Conecta con composición de recetas y su costo.

---

## Problemas y riesgos de UX

- **Claridad de flujos (compra → precio → recetas)**
  - **Percepción de “magia” en la relación compra–precio–recetas (Riesgo Alto)**:
    - Desde la pantalla principal no se explicita que:
      - Registrar una compra puede proponer actualizar precios de insumos.
      - Cambiar precios puede recalcular costos y márgenes de recetas.
    - Los pasos técnicos existen (`InsumosPrecioDecisionModal`, `updateRecetaCostos`), pero el usuario puede no tener claro:
      - Cuándo exactamente se recalculan las recetas.
      - Si todos los productos se actualizan o solo algunos.
      - Si puede revisar qué se modificó después.
  - **Muchas responsabilidades en una sola pantalla (Riesgo Medio)**:
    - Pantalla de Insumos actúa como:
      - Lista de insumos.
      - Hub de compras masivas.
      - Portal a movimientos históricos.
      - Acceso a detalle, edición y composición para recetas.
    - A nivel jerarquía visual, la card de “Compras de stock” compite con “Stock y precios”, sin una separación clara entre:
      - Gestión de catálogo de insumos.
      - Flujo operativo de compra masiva.
    - Esto puede generar ruido cognitivo, sobre todo en primeros usos.

- **Confianza en el precio y su impacto**
  - **Miedo a equivocarse en el precio (Riesgo Alto)**:
    - Para Mariano, el **precio del insumo** es el punto más sensible: si se equivoca ahí, siente que “todo lo demás queda mal”.
    - Hoy la pantalla de Insumos no refuerza visualmente que el flujo principal de **actualización de precios** es seguro, reversible o fácil de revisar.
    - Esto condiciona la confianza en la pantalla completa: si no está seguro del precio, usará menos otras funciones por miedo a “romper” costos y márgenes.
  - **Actualización de insumos compuestos que no se refleja claramente en la composición/premezcla (Riesgo Alto)**:
    - El flujo de edición de **composiciones/premezclas** es más incómodo y menos accesible que la edición básica del insumo.
    - Si se actualiza un insumo compuesto y la pantalla no deja clarísimo cómo quedó la **composición final** y qué cambió en costos, el riesgo percibido es de “romper recetas” sin darse cuenta.
    - Falta una confirmación visual de que la **premezcla quedó coherente** después de editarla (ingredientes, proporciones y costos).

- **Claridad de inputs críticos para costos**
  - **Campo `Precio` sin contexto de “precio de la presentación” (Riesgo Medio)**:
    - El label es solo “Precio” y el placeholder “4500”, sin aclarar que:
      - Es el precio **total de la presentación** (“bolsa x 25 kg”, “pack x 30 u”).
    - El cálculo de `precioPorU` depende de interpretar correctamente que ese valor es el total de la unidad vendida por el proveedor, no un precio por kilo/gramo/unidad ya normalizado.
  - **`Presentación` y `Cantidad` no explican su rol en costos (Riesgo Medio)**:
    - `Presentación` es descriptivo (“x 30 u”, “x 25 kg”) pero opcional y textual.
    - `Cantidad` (`cantidad_presentacion`) tiene label genérico y sin aclaración de vínculo con `Unidad`.
    - La combinación `Precio + Cantidad + Unidad` es clave para costos, pero:
      - El formulario no lo explica.
      - No muestra en vivo el precio unitario resultante para validar mentalmente.
  - **Unidad default y formatos por defecto pueden ocultar errores (Riesgo Medio)**:
    - Si no se define `unidad`, se asume “g”.
    - Un error común sería cargar una presentación en kg con unidad g o viceversa, generando precios unitarios irreales que impactan en todas las recetas.

- **Gestión de categorías**
  - **Categorías no editables que empujan a “categorías basura” (Riesgo Alto)**:
    - Hoy Mariano no puede **crear o ajustar categorías** desde el flujo natural de trabajo.
    - Cuando no encuentra una categoría adecuada, termina asignando el insumo a **categorías incorrectas o genéricas**, perdiendo valor en la organización del catálogo.
    - Esto degrada la calidad de los datos a mediano plazo (listas desordenadas, filtros menos útiles) y vuelve menos confiable la pantalla de Insumos como “mapa mental” de las materias primas.

- **Feedback y mensajes**
  - **Feedback de recalculo de recetas poco explícito (Riesgo Alto)**:
    - `InsumosCompraResultadoModal` alerta sobre que hay recetas afectadas y ofrece `onVerRecetasAfectadas`, pero:
      - No queda claro cuántas recetas cambiaron, ni en qué sentido (¿aumentó el costo, bajó el margen?).
      - El usuario puede cerrar el modal sin comprender el impacto real.
  - **Mensajes de error genéricos en eliminación (Riesgo Medio)**:
    - Toast de eliminación fallida: `⚠️ No se pudo eliminar (en uso en recetas o movimientos)`.
    - No diferencia:
      - Caso “en uso en recetas” vs “tiene movimientos históricos”.
      - Si hay alguna acción recomendada (ej. “editá en lugar de eliminar”, o “cerrar saldo y dejarlo como histórico”).
  - **Toasts y textos dispersos (Riesgo Medio)**:
    - El módulo usa varias capas de feedback:
      - Cambios de texto en botones (`Guardando...`).
      - Toasts de hooks (`showToast`).
      - Modales de confirmación y de resultado.
    - Sin un patrón de microcopy consolidado, se corre el riesgo de:
      - Mensajes inconsistentes (“guardar”, “actualizar”, “registrar”) para acciones similares.
      - Falta de foco en lo que más le importa al dueño: “qué cambió en sus números”.

- **Consistencia visual/terminológica**
  - **Terminología mixta entre módulos (Riesgo Medio)**:
    - En Insumos se habla de “materias primas”, “insumos”, “stock”, “movimientos”, “compras de stock”.
    - En otros módulos (según UI_PATTERNS y docs) se usan conceptos de “ventas”, “costos”, “ganancia”, “gastos”.
    - Falta un puente explícito en la pantalla de Insumos que recuerde que:
      - Cada ajuste de insumo impacta en “costo de receta” y “ganancia”.
  - **Patrón de carrito consistente pero poco explicitado (Riesgo Bajo)**:
    - El flujo de `InsumosCompra` sigue la lógica de carrito compartida con ventas/stock, pero la pantalla inicial solo dice “Registrá en un solo paso lo que compraste y cuánto pagaste”.
    - No se explicita que:
      - Es un carrito (seleccionás varios insumos de una).
      - Podés revisar y ajustar precio/cantidad por ítem.

---

## Recomendaciones de UI/UX (priorizadas)

### Alta

- **Hacer MUY claro y confiable el flujo de actualización de precios**
  - **Qué hacer**:
    - En la lista de `Stock y precios`, destacar visualmente que ese es el lugar principal para **ver y actualizar precios** (por ejemplo, reforzando con un subtítulo tipo: “Acá tenés los precios que alimentan tus recetas. Tocar para ver y actualizar.”).
    - En `InsumosFormModal`, reforzar en el header o helper text que **editar el precio acá actualiza los costos de recetas después de las compras**, alineado con los textos de compra.
    - En `InsumosPrecioDecisionModal`, usar un copy que deje claro que este es el paso donde se decide qué precios **efectivamente cambian** con la compra (no es un paso “oscuro” intermedio).
  - **Por qué**:
    - Alinea la UI con el uso real (alta/actualización de precios/detalle como flujos principales) y reduce el miedo a equivocarse en el precio.

- **Simplificar el acceso y la edición de composiciones/premezclas**
  - **Qué hacer**:
    - En `InsumosDetalleModal`, hacer más visibles y directas las acciones:
      - Botón claro “Editar insumo” y, cuando aplique, un botón separado “Editar composición/premezcla”, ambos al alcance sin scroll ni ambigüedad.
    - Usar un layout de detalle que separe bien:
      - Bloque “Datos básicos y precio”.
      - Bloque “Composición / premezcla” con CTA “Editar composición”.
    - Después de guardar cambios en una composición, mostrar un resumen muy claro de cómo quedó la premezcla (ingredientes + costos) para reforzar la confianza.
  - **Por qué**:
    - Baja la fricción de un flujo hoy poco usado pero crítico cuando se trabaja con premezclas, y reduce el riesgo percibido de “romper” algo al tocar la composición.

- **Mejorar el formulario y la gestión de categorías para evitar categorías basura**
  - **Qué hacer**:
    - En el formulario de insumo, permitir:
      - Crear una nueva categoría desde el mismo `SearchableSelect` (ej. opción “+ Crear categoría nueva” al final de la lista).
      - O, si no se quiere permitir creación libre, al menos guiar mejor con ejemplos y agrupar categorías existentes para que sea más obvio dónde va cada insumo.
    - En la pantalla principal, revisar si conviene mostrar solo las categorías realmente usadas o agrupar las “raras” bajo un label más explicativo.
  - **Por qué**:
    - Evita que el usuario “engañe al sistema” metiendo todo en categorías genéricas y mantiene el módulo útil a largo plazo.

- **Hacer explícito el flujo compra → precio → recetas**
  - **Qué hacer**:
    - En la card “Compras de stock”, extender el copy para incluir el impacto en recetas. Ejemplo:
      - Texto corto debajo: “Lo que cargues acá puede actualizar precios de insumos y recalcular costos de recetas.”
    - En `InsumosCompraResultadoModal`:
      - Ordenar la información para que lo primero que vea Mariano sea el **impacto en sus números**, y después el detalle:
        - Bloque inicial: “Cambios en tus recetas” con:
          - “Se recalcularon **M recetas**.”
          - “El costo promedio de receta cambió de X a Y” o, si no se dispone, al menos “Algunas recetas cambiaron de costo y margen.”
        - Debajo, un bloque más pequeño con:
          - “Actualizaste el precio de **N insumos**.”
      - Incluir CTA clara:
        - Botón primario: “Ver recetas afectadas” (mantener `onVerRecetasAfectadas`) para ir directo a la vista de recetas con cambios.
        - Opción secundaria para cerrar o ver más tarde, dejando claro que siempre puede revisar estos cambios desde Recetas.
  - **Por qué**:
    - Reduce la sensación de “magia” y refuerza el entendimiento de cómo la compra impacta en números clave, priorizando lo que Mariano realmente quiere ver después de comprar: cambios de margen y costo de recetas.

- **Aclarar y reforzar inputs críticos para costos en el formulario de insumo**
  - **Qué hacer**:
    - Cambiar labels y ayudas en tres campos:
      - `Precio` → “Precio de la presentación” (`FormMoneyInput`):
        - Subtexto o helper: “Lo que pagás por el paquete completo (ej: bolsa x 25 kg).”
      - `Presentación` → mantener como está pero con ejemplo que conecte con unidad:
        - Placeholder: “Ej: x 25 kg, x 12 u”.
      - `Cantidad` + `Unidad`:
        - Label de `Cantidad` → “Cantidad en la presentación”.
        - Añadir helper text: “Cuánto trae el paquete en la unidad elegida (ej: 25 si es 25 kg).”
    - Mostrar debajo de la fila `Precio + Presentación` (o de `Cantidad + Unidad`) una línea de info calculada:
      - “Precio unitario estimado: $X / unidad” usando `precioPorU` en versión “preview”.
      - Actualizada en vivo a medida que cambia precio/cantidad/unidad (aunque sea solo texto, sin interacción).
  - **Por qué**:
    - Deja claro que el precio es por empaque, no por unidad.
    - Le da al usuario una verificación visual rápida para detectar errores de unidad/escala.

- **Mejorar mensajes de eliminación de insumos y alternativas**
  - **Qué hacer**:
    - Al fallar `deleteInsumo`, diferenciar el mensaje según motivo (si el backend lo permite) o hacer el mensaje más accionable:
      - Ejemplo de microcopy:
        - `⚠️ No se pudo eliminar. Este insumo está en uso en recetas o movimientos.`
        - Línea extra: “En lugar de eliminarlo, podés editarlo o dejar de usarlo en recetas nuevas.”
    - En `InsumosDetalleModal`, antes del botón de eliminar, agregar un texto pequeño:
      - “Si este insumo ya no se usa, podés dejar de usarlo en recetas nuevas y mantener el historial.”
  - **Por qué**:
    - Evita que el usuario se frustre con un mensaje “caja negra”.
    - Propone un comportamiento recomendado alineado con la realidad contable (no borrar historial).

### Media

- **Reorganizar jerarquía visual de la pantalla de Insumos**
  - **Qué hacer**:
    - Reordenar bloques para enfatizar el flujo más frecuente:
      - Mantener título y subtítulo.
      - Mostrar primero buscador + tabs (para que el foco inicial sea ver/ajustar insumos).
      - Luego la card de “Stock y precios”.
      - Y debajo, la card “Compras de stock” como acción destacada, pero separada del listado principal.
    - Alternativa ligera (si no se quiere reordenar):
      - Mantener orden actual pero ajustar títulos:
        - “Compras de stock rápidas” (para posicionarla como flujo específico).
        - En “Stock y precios”, agregar subtítulo corto: “Acá ves y editás los insumos que alimentan tus recetas.”
  - **Por qué**:
    - Reduce la percepción de “pantalla saturada”, dejando claro qué es catálogo y qué es operación puntual.

- **Unificar microcopy en flujos de compra y edición**
  - **Qué hacer**:
    - Revisar textos de botones y toasts para que sigan un patrón consistente:
      - Acciones de creación: “Agregar insumo”, “Registrar compra de stock”.
      - Acciones de edición: “Guardar cambios”.
      - Acciones de confirmación de procesos: “Confirmar compra”, “Aplicar cambios de precio”.
    - En modales de precio y resultado, usar siempre la palabra “precio” y “costo de recetas” de forma explícita:
      - Ejemplo: “Decidí qué precios de insumos actualizar con esta compra.”
      - “Estas recetas cambiaron de costo por los nuevos precios.”
  - **Por qué**:
    - Bajar la carga cognitiva a través de un vocabulario estable.

- **Hacer más visible que el flujo de compras es un “carrito”**
  - **Qué hacer**:
    - En la card de compras, ajustar el copy a algo como:
      - “Armá un carrito con todo lo que compraste y registrá precio y cantidad de cada insumo.”
    - Dentro de `InsumosCompra`, usar títulos/labels alineados con el patrón de carrito de ventas:
      - “Carrito de compras de insumos”, “Total de la compra”.
  - **Por qué**:
    - Aprovecha un patrón mental muy conocido (carrito) y conecta mejor con otras pantallas de la app.

### Baja

- **Refinar estados vacíos y mensajes de ayuda**
  - **Qué hacer**:
    - En “Sin resultados” de la lista de insumos:
      - Agregar texto extra: “Probá con otro nombre o categoría. Si es un insumo nuevo, agregalo con el +.”
    - En `InsumosMovimientos`:
      - Si no hay movimientos, explicitar: “Todavía no registraste compras ni egresos de este insumo.”
  - **Por qué**:
    - Mejora la auto-explicación de la pantalla en casos límite sin sobrecargar al usuario.

- **Consistencia de terminología entre módulos**
  - **Qué hacer**:
    - Verificar que en la app se use siempre la misma combinación:
      - “Insumos / materias primas” para este módulo.
      - “Recetas” para productos compuestos.
      - “Costos y margen” para impacto económico.
    - En el subtítulo de Insumos, reforzar el vínculo:
      - Por ejemplo: “X materias primas · impactan en el costo y la ganancia de tus recetas.”
  - **Por qué**:
    - Ayuda a que el usuario cree un mapa mental claro de cómo se conectan módulos.

---

## Notas para el dev lead

- **Sobre alcance y prioridad**
  - Las recomendaciones de nivel **Alta** se pueden abordar con cambios de copy y pequeñas mejoras de UI reutilizando componentes existentes (`FormInput`, `FormMoneyInput`, modales actuales). No requieren cambios de arquitectura ni de flujo de datos, solo exponer mejor lo que ya pasa internamente.
  - Las de nivel **Media** implican ajustes de layout (reordenar bloques en la pantalla de Insumos) y refinar textos en varios puntos, pero pueden hacerse de forma incremental y testeando con el dueño.
  - Las de nivel **Baja** son oportunidades de pulido que conviene ir incorporando mientras se tocan esas zonas por otros motivos.

- **Traducción a tareas concretas**
  - **UX/Copy**:
    - Definir microcopy final para:
      - Card de “Compras de stock” y subtítulos de “Stock y precios”.
      - Mensajes de `InsumosPrecioDecisionModal` y `InsumosCompraResultadoModal` (incluyendo resumen de N insumos / M recetas).
      - Textos de error y helper text en formulario de Insumo, especialmente para `Precio`, `Cantidad` y `Unidad`.
  - **UI/Implementación React**:
    - `InsumosFormModal.jsx`:
      - Ajustar labels y placeholders de campos críticos.
      - Agregar texto auxiliar y, opcionalmente, preview de precio unitario calculado con la misma lógica de `precioPorU`.
    - `Insumos.jsx` / `InsumosList.jsx`:
      - Reordenar secciones (buscador/tabs vs card de compras) o ajustar títulos/subtítulos según se decida, priorizando el uso real de alta/actualización de precios y consulta de detalle.
      - Extender estado vacío de lista con mensaje más guiado.
    - `InsumosDetalleModal.jsx`:
      - Hacer más evidente el acceso a “Editar insumo” y, cuando aplique, a “Editar composición/premezcla” como acciones claras desde el detalle.
      - Reorganizar el contenido en bloques diferenciados (“Datos básicos y precio” / “Composición / premezcla”) para que la edición de composición no se sienta oculta.
    - `InsumosCompraResultadoModal.jsx` y `InsumosPrecioDecisionModal.jsx`:
      - Incluir resumen numérico (N insumos, M recetas) y un CTA principal claro (“Ver recetas afectadas”).
      - En el resultado de compra, diseñar el layout para que el **primer bloque** destaque cambios de costo y margen de recetas, y recién después el detalle de insumos actualizados.
    - Gestión de categorías:
      - Evaluar permitir la creación de nuevas categorías desde el `SearchableSelect` del formulario de insumos (“+ Crear categoría nueva”).
      - Si no se permite creación libre, trabajar una UX que guíe mejor la elección (agrupando categorías, mejorando textos) para reducir la cantidad de insumos en categorías “cajón de sastre”.
  - **Patrones compartidos / UI_PATTERNS.md**:
    - Una vez aplicados los cambios, actualizar `UI_PATTERNS.md` para:
      - Documentar explícitamente el patrón “Pantalla Insumos” como **Pantalla de lista hub** (lista + flujos críticos colgando).
      - Agregar reglas sobre cómo se explican inputs críticos de costos (precio de presentación, cantidad, unidad) y cómo se muestra siempre el precio unitario resultante.

- **Sugerencia de validación con el negocio**
  - Antes de implementar cambios más grandes en textos, validar con el dueño:
    - La forma en la que habla de “insumos”, “materias primas”, “recetas” y “margen”.
    - Qué info le resulta más valiosa en el resultado de una compra:
      - ¿Ver cuántas recetas cambiaron?
      - ¿Ver la diferencia de margen en pesos o en porcentaje?
  - Eso permite priorizar qué datos resaltar en los modales de resultado sin sobrecargar la pantalla.

