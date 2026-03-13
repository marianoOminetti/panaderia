## Visión de negocio actual

El módulo de insumos hoy ya funciona como el “sistema nervioso” de tus costos. Cada insumo tiene nombre, presentación (por ejemplo “bolsa x 25 kg”), cantidad y unidad (kg, g, ml, l, unidades), y un precio asociado a esa presentación. Con eso, la app calcula automáticamente el costo por unidad real que se usa en las recetas (por ejemplo costo por gramo o por unidad) y lo propaga a los costos de cada producto final.

Cuando cargás compras de stock, además de actualizar cuántos kilos/litros/unidades tenés, podés actualizar ahí mismo el precio del insumo. Si el precio cambia, la app:
- Guarda un historial de precios del insumo en el tiempo.
- Recalcula los costos de las recetas que usan ese insumo.
- Actualiza los márgenes unitarios de esos productos.

Eso te permite:
- **Ver costos y márgenes actualizados sin hacer cuentas a mano.**
- **Entender el impacto de una compra o un aumento de proveedor en tus productos finales.**
- **Tomar decisiones de precio (subir o no) con un número concreto de margen por producto.**

En síntesis: si el precio de la harina, huevos, manteca o cualquier otro insumo se mueve, la app ya tiene el mecanismo para que esa suba baje hasta el producto final y se vea reflejada en tus márgenes.

## Riesgos y dolores detectados

- **Riesgo de insumos mal definidos desde el alta.**  
  Si al crear un insumo se carga mal la presentación (ej. “x 25 kg” pero se pone cantidad 1 en lugar de 25, o se mezcla kg con g), el costo por unidad queda desfasado. Eso después se traduce en recetas baratas o caras “de mentira”, y los márgenes que ves no representan la realidad.

- **Riesgo específico con insumos “premezcla” que dependen de otros.**  
  Caso concreto: `premezcla casera` que se compone de `almidón de maíz`, `fécula de mandioca` y `harina de arroz`. Hoy, si actualizás los precios de esos 3 insumos base, el costo de la premezcla no se recalcula automáticamente en función de esos cambios. Resultado:  
  - El costo real de la premezcla queda desfasado respecto de sus ingredientes.  
  - Todas las recetas que usan esa premezcla se calculan con un costo subestimado.  
  - Se pierde visibilidad de cuánto están pegando los aumentos en un insumo clave que se usa en muchas recetas.

- **Riesgo de precios desactualizados por compras que no actualizan precio.**  
  Si en una compra cargás stock pero no tildás/indicás que el precio cambió, o no actualizás el precio ahí mismo, el sistema mantiene el costo viejo. Resultado:  
  - Recetas calculadas con costos históricos.  
  - Márgenes que parecen buenos pero en realidad ya se achicaron.

- **Falta de “explicación” clara al terminar una compra que cambia precios.**  
  Hoy el sistema recalcula costos de recetas y márgenes cuando actualizás precios desde una compra, pero el dueño puede no ver claramente:  
  - Cuáles recetas se vieron afectadas.  
  - Cuánto bajó (o subió) el margen de cada una.  
  - Si hay productos que ya quedaron por debajo del margen objetivo (ej. 60%).  
  Esto hace que el módulo sea poderoso, pero poco “conversador”: hace el cálculo, pero no te cuenta la historia de negocio detrás.

- **Riesgo de no detectar aumentos fuertes de proveedores.**  
  Si un insumo sube 20–40% y se actualiza sin ninguna alerta, esa suba puede diluirse entre muchos insumos y el dueño no termina de ver dónde se le está yendo el margen. El historial existe, pero falta una señal clara de “ojo, este insumo se disparó”.

- **Complejidad percibida al cargar insumos nuevos.**  
  La cantidad de campos (nombre, categoría, precio, descripción, cantidad, unidad) es necesaria, pero si no está guiada con ejemplos y defaults inteligentes, el usuario puede:  
  - Copiar el mismo texto en distintos campos.  
  - No entender bien qué poner en “cantidad de presentación” vs “cantidad que uso en receta”.  
  - Crear variantes duplicadas de un mismo insumo.  
  Todo eso termina en recetas mal armadas y números que no cierran.

## Oportunidades de mejora (priorizadas)

### Prioridad Alta

- **Resumen post-compra enfocado en márgenes.**  
  Al confirmar una compra que actualiza precios, mostrar un resumen tipo “cierre de compra” con:  
  - Lista de recetas afectadas (nombre del producto).  
  - Antes y después del margen unitario (% y pesos).  
  - Semáforo de riesgo (verde si sigue arriba del margen objetivo, amarillo si se acercó, rojo si ya está por debajo).  
  Esto convierte una acción contable (cargar compra) en una decisión de negocio (“tengo que revisar el precio de estas 3 recetas ya mismo”).

- **Alertas de aumento fuerte de insumo.**  
  Cuando un insumo cambie de precio por encima de un umbral (por ejemplo +15% o +20% respecto al precio anterior), mostrar una alerta clara:  
  - “Este insumo aumentó 23% vs el precio anterior”.  
  - Cantidad de recetas afectadas.  
  - Botón directo para ver esas recetas y sus márgenes.  
  Esto te permite detectar rápido qué proveedor o insumo te está comiendo el margen.

- **Control específico para premezclas y sus insumos base.**  
  Incluir una lógica de “insumo compuesto” para casos como `premezcla casera` que dependen de otros insumos (`almidón de maíz`, `fécula de mandioca`, `harina de arroz`, etc.). Cada vez que cambie el precio de uno de los insumos base:  
  - Marcar automáticamente la premezcla como “pendiente de revisión de costo”.  
  - Mostrar un listado de “premezclas desactualizadas” en la pantalla de Insumos, con fecha del último cálculo y diferencia estimada vs precios actuales de sus ingredientes.  
  - Ofrecer un flujo simple para que el dueño revise y acepte el nuevo costo sugerido de cada premezcla (con detalle de cuánto cambió el costo total y el impacto estimado en las recetas que la usan).

- **Validaciones fuertes al crear/editar insumos críticos.**  
  Para insumos de alto impacto (harina, huevos, manteca, etc.), reforzar:  
  - Que la unidad y la cantidad de presentación tengan sentido (ej. 25 kg, no 1 kg con descripción “x25kg”).  
  - Que el precio por unidad resultante no quede en valores absurdos (ej. 0,00001 por kg o 10.000 por gramo).  
  - Mensajes claros si algo parece raro: “Revisá este insumo, el costo por kg quedó demasiado bajo/alto para lo habitual”.  
  Esto reduce errores de carga que después contaminan todas las recetas.

### Prioridad Media

- **Sección visual separada en la pantalla de Insumos: “Impacto en recetas”.**  
  Dentro de la pantalla central de insumos, dedicar una zona específica para:  
  - Ver rápidamente cuántas recetas usan ese insumo.  
  - Ver rango de margen actual de esas recetas (mínimo, máximo, promedio).  
  - Acceso rápido a “recetas en riesgo” (debajo de X% margen).  
  Esto refuerza mentalmente que cada vez que tocas un insumo, estás tocando productos finales y ganancia.

- **Plantillas y ejemplos para alta de insumos frecuentes.**  
  Ofrecer presets tipo:  
  - “Bolsa de harina 25 kg” → ya vienen cantidad y unidad prellenadas.  
  - “Maple de huevos x30 unidades”.  
  - “Caja de manteca x20 unidades de 200 g”.  
  Esto acelera la carga y baja el riesgo de inventar unidades o presentaciones poco consistentes.

- **Recordatorio suave de precios viejos.**  
  Al editar un precio de insumo, mostrar:  
  - Último precio.  
  - Variación en % vs el nuevo.  
  - Fecha de la última actualización.  
  Ayuda a validar que no haya un error de tipeo y da contexto sin abrumar.

### Prioridad Baja

- **Pequeños indicadores de salud de costos en la lista de insumos.**  
  En la tabla/lista de insumos, sumar iconos o color de fondo que indiquen:  
  - Insumos sin recetas asociadas (posible basura o pendiente de uso).  
  - Insumos con cambios de precio recientes (últimos X días).  
  - Insumos marcados como “críticos” para el negocio.  
  Sirve como radar visual sin obligarte a entrar a cada detalle.

- **Texto de ayuda contextual en lenguaje de negocio.**  
  En vez de explicaciones técnicas, tooltips tipo:  
  - “Precio de presentación: lo que le pagás al proveedor por este paquete completo.”  
  - “Cantidad de presentación: cuántos kg/litros/unidades trae este paquete.”  
  - “Unidad: en qué medida vas a usar este insumo en las recetas.”  
  Esto reduce dudas y hace que cualquiera del equipo pueda cargar insumos con menos riesgo.

## Sugerencias para producto/dev lead

- **Convertir la actualización de precios en una “mini auditoría de márgenes”.**  
  Cada vez que se confirma una compra que cambia precios, la app debería mostrar un “panel de impacto” con recetas afectadas, márgenes antes/después y un semáforo según el margen objetivo configurado (ej. 60%). Dejar explícito un CTA tipo “Revisar precios de estas recetas ahora” para que el dueño pueda tomar decisiones en el momento.

- **Definir reglas de negocio para detectar precios “sospechosos” de insumos.**  
  Implementar validaciones simples pero efectivas: rangos de precio por unidad esperados por categoría, chequear desvíos fuertes vs histórico, y bloquear o al menos advertir cuando un valor rompe totalmente la lógica. Mejor un mensaje incómodo al cargar que semanas de márgenes mal calculados.

- **Introducir niveles de criticidad de insumos.**  
  Permitir marcar ciertos insumos como “críticos” (por peso en costo total o volumen de uso). Para esos insumos, aplicar validaciones más estrictas, mayor visibilidad de cambios de precio y presencia destacada en el panel de impacto en recetas.

- **Hacer más explícita la relación Insumo → Receta → Margen.**  
  En la pantalla de detalle de insumo, incluir un bloque fijo que muestre:  
  - Número de recetas que lo usan.  
  - Rango actual de márgenes de esas recetas.  
  - Link directo a la vista de “recetas en riesgo” cuando cambia el precio.  
  Esto ayuda al dueño a pensar siempre en términos de “si toco este insumo, qué productos se me complican”.

- **Simplificar el alta de insumos con plantillas y ejemplos reales del negocio.**  
  Preparar un set inicial de plantillas para los insumos más usados en Panadería SG, con presentaciones típicas y unidades ya seteadas. Dejar al sistema sugerir esos presets primero, y recién después permitir definiciones totalmente libres. Esto reduce la curva de aprendizaje y estandariza cómo se guardan los datos.

- **Modelar explícitamente insumos compuestos y su relación con insumos base.**  
  Definir en datos qué insumos son “compuestos” (ej. `premezcla casera`) y qué insumos base los integran (`almidón de maíz`, `fécula de mandioca`, `harina de arroz`, con cantidades y unidades). Implementar un recalculo automático del costo del insumo compuesto cuando cambie el precio de cualquiera de sus bases, más un estado de “pendiente de revisión” hasta que el dueño acepte el nuevo costo.

- **Crear un reporte/alerta de “premezclas desactualizadas”.**  
  Armar una vista o sección específica que liste todas las premezclas cuyo costo quedó desfasado respecto de sus insumos base (ej. cambios de precio desde la última vez que se calculó la mezcla). Desde ahí, permitir revisar una por una, ver el impacto en las recetas que usan esa premezcla y confirmar el nuevo costo con 1–2 clics.

