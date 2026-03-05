# Sistema de notificaciones push — Análisis y prompts para implementación

Documento para el dueño del negocio y para el equipo de desarrollo. Incluye análisis de flujo, impacto, priorización y **prompts listos para Cursor** para implementar la feature de forma modular.

---

## 1. Resumen en lenguaje de negocio

**Qué se pide:** Que ciertos usuarios de la app reciban una notificación en el celular (o navegador) cuando pase algo importante: una venta registrada, un ingreso de mercadería, o cuando el stock de un producto llegue a cero.

**Por qué importa:** Hoy el dueño (o quien lleva el control) tiene que estar entrando a la app para ver si hubo ventas, si entró mercadería o si algo se quedó sin stock. Con push, la información llega sola y se puede reaccionar más rápido (reponer producto, revisar compras, etc.).

---

## 2. Flujo y quién recibe cada notificación

### Estado actual de la app (roles)

En la base de datos **no hay roles ni permisos por usuario**: todos los que tienen cuenta (auth) ven los mismos datos (ventas, stock, insumos). En la documentación se habla de **dueño**, **vendedor** y **producción** como perfiles de uso, pero eso no está modelado todavía en la app.

Por eso, la recomendación inicial es:

| Tipo de notificación | Quién la recibe (v1) | Nota para más adelante |
|----------------------|----------------------|-------------------------|
| **Push de venta** | Todos los usuarios autenticados que tengan push habilitado | Cuando exista rol "dueño" o "admin", se puede limitar solo a ellos. |
| **Push de ingreso de mercadería** | Todos los usuarios autenticados con push habilitado | Útil para dueño y quien lleva compras; luego se puede filtrar por rol. |
| **Push stock a 0** | Todos los usuarios autenticados con push habilitado | Crítico para producción y dueño; luego se puede priorizar a "producción" y "dueño". |

**Regla de negocio:** Un usuario solo recibe push si en algún momento aceptó las notificaciones en la app y su suscripción sigue vigente (se guarda en backend). Si no aceptó o revocó el permiso, no se le envía nada.

---

## 2.1. Contenido del push de venta (qué va en cada notificación)

El dueño quiere que el push muestre **solo esa venta**: el monto, quién fue el cliente y si pagó o debe. Al tocar la notificación, que abra la app en **esa venta** (pantalla Ventas con el detalle de esa venta abierto).

**En lenguaje de negocio:**

- **Acumulado diario de venta:** en cada push de venta debe aparecer el total vendido **hoy** hasta ese momento (incluyendo la venta que acaba de disparar el push). Ejemplo: “Venta registrada. Hoy: $45.200”.
- **Margen diario:** en cada push debe aparecer también el **margen del día** actualizado (porcentaje o ganancia bruta del día). Así el dueño ve de un vistazo si el día viene bien en margen sin entrar a la app. Ejemplo: “Hoy: $45.200 · Margen 62%” o “Hoy: $45.200 · Ganancia $28.024 (62%)”.

**Resumen para el mensaje:**

| Qué incluir | Descripción |
|-------------|-------------|
| **Monto de la venta** | Total de esa transacción (suma de `total_final` de los ítems de esa venta; si es una sola línea, ese monto). |
| **Cliente** | Nombre del cliente (`clientes.nombre` por `cliente_id`) o texto "Consumidor final" si `cliente_id` es null. |
| **Pagó / Debe** | Según `estado_pago` de la venta: "Pagado" o "Debe". |

**Ejemplos de título/cuerpo del push:**

- Título: `Venta $12.500`  
  Cuerpo: `Juan Pérez · Pagado`

- Título: `Venta $8.300`  
  Cuerpo: `Consumidor final · Debe`

**Redirección (deep link):** el payload de la notificación debe incluir un identificador de esa venta (p. ej. `transaccion_id` si la venta tiene uno, o el `id` del único ítem si es venta suelta) para que, al hacer clic, la app abra la pestaña Ventas y abra el modal/detalle de esa venta. En la app ya existe el concepto de "grupo" de venta con una `key` (transaccion_id o id del ítem); ese valor debe ser el que se use en la URL o en los datos del push para que el cliente abra esa venta. Ver Prompt 1 (service worker: al hacer clic, abrir URL con query/hash) y Prompt 2 (backend: incluir en el payload la key del grupo).

---

## 3. Impacto en el negocio

### Ventajas de implementarlo

- **Menos dependencia de “entrar a mirar”:** El dueño puede estar en otra cosa y enterarse al instante de una venta, un ingreso o un producto sin stock.
- **Reacción más rápida al stock 0:** Hoy ya hay un toast y una notificación local en el navegador cuando algo llega a 0; con push, quien no está en la app (o en esa pestaña) también se entera.
- **Trazabilidad y sensación de control:** Refuerza que la app es el lugar donde pasa todo el negocio.

### Riesgos si no se hace

- **Seguir dependiendo de revisar la app a mano:** Más demora en reponer producto agotado o en revisar compras.
- **Que el “stock 0” pase desapercibido:** Si nadie tiene la app abierta, la notificación local actual no sirve; puede haber ventas perdidas o clientes que no encuentran el producto.

### Costo aproximado de “no hacer nada”

- Si 1 vez por semana un producto se queda en 0 y no se repone a tiempo: 1 venta perdida/día de ese producto. Con ~20–50 ventas/día y ticket promedio ~$3.000, una venta perdida por día son ~$90.000/mes en el peor caso. El push de stock 0 mitiga ese riesgo.

---

## 4. Priorización

| Prioridad | Feature | Motivo |
|-----------|---------|--------|
| **Alta** | Push **stock a 0** | Impacto directo en no perder ventas y en producción. Ya existe lógica de “stock 0” en el código; hay que centralizarla y sumar envío de push. |
| **Alta** | Push **venta** | Da visibilidad inmediata al dueño; bajo esfuerzo si la infra de push ya está. |
| **Media** | Push **ingreso de mercadería** | Muy útil para compras y caja; se puede implementar después de venta y stock 0. |

Orden sugerido de implementación técnica: **(1) Infraestructura push** → **(2) Push venta + push stock 0** → **(3) Push ingreso mercadería**.

---

## 5. Contexto técnico mínimo (para el dev)

- App: **React** + **Supabase** (auth, DB, RLS).
- **No hay roles en DB** hoy: se notifica a todos los usuarios que tengan suscripción push guardada.
- Eventos que disparan notificación:
  - **Venta:** `insert` en tabla `ventas` (desde `useVentas.insertVentas` / `Ventas.jsx`).
  - **Ingreso mercadería:** `insert` en `insumo_movimientos` con `tipo = 'ingreso'` (desde `useStockMutations.registrarMovimientoInsumo` / `Insumos.jsx`).
  - **Stock 0:** cuando en tabla `stock` la `cantidad` de una receta pasa a 0 (hoy se hace en `useStockMutations.actualizarStock` y `actualizarStockBatch`; hay notificación local con `Notification` API).
- Las notificaciones push reales requieren: **service worker**, **Web Push** (suscripción del cliente con VAPID), y un **backend** que envíe el mensaje (p. ej. **Supabase Edge Function** con clave VAPID privada). Mantener la app modular: un módulo de notificaciones que no mezcle lógica de negocio con el envío.

---

## 6. Prompts listos para Cursor / dev

Usar en este orden. Cada prompt es autocontenido pero asume que el anterior ya está hecho.

---

### Prompt 1 — Infraestructura base de notificaciones push (Web Push + Supabase)

**Objetivo:** Tener el canal de notificaciones funcionando de punta a punta: suscripción en el cliente, guardado en Supabase y envío desde el backend.

**Requisitos:**

1. **Tabla en Supabase**  
   - Crear tabla `push_subscriptions` (o similar) con: `id` (uuid), `user_id` (uuid, FK a auth.users), `endpoint` (text), `p256dh` (text), `auth` (text), `created_at`, `updated_at`.  
   - RLS: el usuario solo puede leer/insertar/actualizar/borrar sus propias filas (`auth.uid() = user_id`).

2. **Service worker**  
   - Añadir en `public/` un `sw.js` (o `firebase-messaging-sw.js` si más adelante usan FCM; por ahora Web Push estándar).  
   - El worker debe: escuchar `push` y mostrar una notificación con título y cuerpo; **al hacer clic**, abrir la app (focus o nueva pestaña) con la URL que venga en los datos del push. Si el payload incluye datos de redirección (ej. `ventaGrupoKey` para push de venta), construir la URL con query/hash (ej. `/?tab=ventas&venta=KEY`) para que la app abra directamente esa venta.  
   - Registrar el worker desde la app (por ejemplo en `App.js` o en un efecto al montar), usando la ruta que corresponda al build (ej. `/sw.js`).

3. **Frontend (React)**  
   - Módulo/hook `usePushSubscription` (o similar) que:  
     - Pida permiso `Notification.requestPermission()`.  
     - Si hay soporte para Service Worker y PushManager, registre el worker, obtenga la suscripción con `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: <VAPID_PUBLIC>)`.  
     - Envíe la suscripción al backend (Supabase): guardar en `push_subscriptions` (user_id = auth.uid(), endpoint, keys p256dh y auth).  
   - No guardar la clave VAPID pública en el repo; usar variable de entorno (ej. `VITE_VAPID_PUBLIC_KEY` o `REACT_APP_VAPID_PUBLIC_KEY` según el bundler).  
   - **Deep link:** si la app se abre desde una notificación (URL con query ej. `?tab=ventas&venta=KEY`), al cargar o al ganar foco leer esos parámetros: si `tab=ventas` y `venta=KEY`, cambiar a la pestaña Ventas y setear `ventasPreloadGrupoKey` con `KEY` para que se abra el modal de esa venta (ver Prompt 2).

4. **Backend (Supabase Edge Function)**  
   - Crear una función `send-push` (o nombre similar) que:  
     - Reciba en el body: `userIds: string[]` (opcional; si no se envía, enviar a todos los usuarios con suscripción), `title: string`, `body: string`, y opcionalmente `url` (para que al hacer clic se abra esa URL, ej. con `?tab=ventas&venta=KEY`) o `tag` para la notificación.  
     - Use la clave VAPID privada (secrets de Supabase) para firmar y enviar el payload a cada suscripción de esos usuarios (leyendo desde `push_subscriptions`).  
     - Si no hay librería oficial de Deno para Web Push, usar una que soporte Web Push (por ejemplo `web-push` en npm tiene implementaciones; en Deno buscar equivalente o usar `fetch` al estándar Web Push).  
   - La función debe ser invocada **solo desde el backend** (otra Edge Function con service role, o trigger/worker), nunca por el cliente con título/cuerpo/url arbitrarios, para evitar que un usuario envíe push falsos a otros. Documentar cómo invocarla desde notify-event o desde triggers.

5. **Modularidad**  
   - No acoplar la lógica de “qué evento ocurrió” (venta, ingreso, stock) a la implementación del envío. Crear un helper o pequeña API interna que reciba “enviar a usuarios X con título Y y cuerpo Z” y llame a la Edge Function. Así más adelante se pueden añadir más tipos de notificación sin tocar la infra.

**Entregables:**  
- Migración SQL para `push_subscriptions` y RLS.  
- Service worker en `public/`.  
- Hook/módulo de suscripción en el frontend.  
- Edge Function que envíe push.  
- Breve doc en `docs/` explicando cómo generar VAPID keys, dónde configurarlas y cómo probar el flujo.

---

### Prompt 2 — Disparar push al registrar una venta y cuando el stock llega a 0

**Objetivo:** Que al registrarse una venta se envíe una notificación push a los usuarios configurados, y que cuando el stock de un producto (receta) llegue a cero también se envíe un push.

**Requisitos:**

1. **Push al registrar una venta**  
   - Punto de disparo: después de un `insert` exitoso en la tabla `ventas` (donde ya se usa `insertVentas` en `useVentas.js` / flujo en `Ventas.jsx`).  
   - No modificar la lógica de negocio existente (cálculo de totales, descuento de stock, etc.). Añadir una llamada “fire-and-forget” para notificar (p. ej. llamar a una Edge Function `notify-event` con tipo `venta` y, si se pasa algo, el id de la venta o el total de esa venta; el contenido completo del mensaje se arma en el backend).  
   - **Contenido del push (obligatorio):** solo esa venta: monto total de la transacción, nombre del cliente (o "Consumidor final") y si pagó o debe (`estado_pago`). Ejemplo: título `Venta $12.500`, cuerpo `Juan Pérez · Pagado` o `Consumidor final · Debe`.
   - **Redirección:** al hacer clic en la notificación, la app debe abrir la pestaña Ventas y el detalle de **esa** venta (modal que ya existe al tocar una venta en la lista). Para eso: (1) el payload del push debe incluir la **key del grupo** de esa venta (`transaccion_id` si la venta tiene uno, o el `id` del ítem si es venta suelta); (2) el service worker, al recibir el clic, debe abrir la URL de la app con un parámetro que identifique esa venta (ej. `?tab=ventas&venta=KEY`); (3) la app al cargar o al ganar foco debe leer ese parámetro, cambiar a tab Ventas y setear `ventasPreloadGrupoKey` con esa key para que se abra el modal de esa venta (ya existe la lógica en `Ventas.jsx` con `ventasPreloadGrupoKey`).
   - La Edge Function `notify-event` debe: al recibir tipo `venta` y payload con los ids de la venta recién insertada (o `transaccion_id`), consultar en la DB esa venta (y si hay join con `clientes`, el nombre del cliente), calcular el total de la transacción, armar título y cuerpo (monto, cliente, Pagado/Debe), incluir en el payload del push la `ventaGrupoKey` para el deep link, resolver destinatarios (v1: todos con fila en `push_subscriptions`), y llamar a la función de envío de push del Prompt 1 (que debe aceptar y reenviar en el payload la URL o los datos para el clic).

2. **Push cuando el stock llega a 0**  
   - Hoy el “stock 0” se detecta en el cliente en `useStockMutations.js` (`actualizarStock` y `actualizarStockBatch`). Para no depender solo del cliente (p. ej. si el cambio viene de otro dispositivo o de un job), la detección debe poder hacerse también en el servidor.  
   - Opción A (recomendada): Crear un trigger en Supabase sobre la tabla `stock` (AFTER UPDATE) que, cuando `cantidad` pase a <= 0, inserte en una tabla de “eventos de notificación” (ej. `notification_events`: id, tipo, payload jsonb, created_at) o llame directamente a una Edge Function que envíe el push. La Edge Function lee el payload (receta_id, nombre de receta si está disponible) y envía “Stock en 0: [nombre producto]”.  
   - Opción B: Mantener la detección en el cliente y, cuando en `actualizarStock` / `actualizarStockBatch` se detecte `anterior > 0 && nuevo <= 0`, además de el toast y la `Notification` local, llamar a una Edge Function “notify-event” con tipo “stock_zero” y receta_id (y nombre si se tiene), para que el backend envíe el push a todos los usuarios con suscripción.  
   - Implementar una sola vía (A o B) para no duplicar lógica. Si se hace B, documentar que en el futuro un trigger (A) podría unificar todas las fuentes de cambios de stock.

3. **No dejar código legacy**  
   - La notificación local actual en `useStockMutations.js` (`new Notification(...)`) puede convivir con el push: si el usuario está en la app, puede seguir viendo el toast + notificación local; si no, recibe el push. Opcional: si se implementa push de stock 0 desde backend, se puede quitar la `Notification` local para no duplicar mensajes en el mismo dispositivo. Decidir y documentar.

4. **Modularidad**  
   - Centralizar “enviar notificación por evento” en un solo lugar: por ejemplo una Edge Function `notify-event` que reciba `{ type: 'venta' | 'stock_zero' | 'ingreso_mercaderia', payload: {...} }` y dentro construya título/cuerpo y llame a la función de envío de push. Así el tercer prompt (ingreso mercadería) solo añade un tipo más.

**Entregables:**  
- Llamada a notificación después de `insertVentas` exitoso (desde el cliente o vía trigger/DB, según se decida).  
- Detección de stock 0 unificada (trigger o cliente) + envío de push.  
- Edge Function(s) para “venta” y “stock_zero”.  
- Sin duplicar lógica ni dejar código muerto; doc breve de la decisión A/B para stock 0.

---

### Prompt 3 — Disparar push al registrar un ingreso de mercadería

**Objetivo:** Cuando se registre un ingreso de mercadería (insumo), que los usuarios con push habilitado reciban una notificación.

**Requisitos:**

1. **Punto de disparo**  
   - El ingreso se registra en `insumo_movimientos` con `tipo = 'ingreso'` (desde `useStockMutations.registrarMovimientoInsumo`, llamado desde `Insumos.jsx` en `registrarCompraSoloStock` y `confirmarCompra`).  
   - Tras un `insert` exitoso en `insumo_movimientos` con tipo `ingreso`, disparar la notificación. Opciones:  
     - **Cliente:** después de que `registrarMovimientoInsumo` resuelva (o después de terminar el loop en `registrarCompraSoloStock` / `confirmarCompra`), llamar a la Edge Function `notify-event` con tipo `ingreso_mercaderia` y payload con resumen (ej. cantidad de ítems o “Compra registrada”).  
     - **Servidor:** trigger AFTER INSERT en `insumo_movimientos` cuando `tipo = 'ingreso'`, que invoque la Edge Function o inserte en `notification_events` para que otra función envíe el push.  
   - Implementar una sola vía y documentarla.

2. **Contenido del push**  
   - Título tipo “Ingreso de mercadería” y cuerpo breve, por ejemplo “Se registró una compra de insumos” o “Nueva compra registrada” (sin exponer datos sensibles de precios si no hace falta).

3. **Reutilizar la infra**  
   - Usar la misma Edge Function `notify-event` y el mismo flujo de envío que en el Prompt 2; solo añadir el caso `ingreso_mercaderia` en el switch/casos y el mensaje correspondiente.

**Entregables:**  
- Disparo de notificación al registrar ingreso (cliente o trigger).  
- Soporte para `ingreso_mercaderia` en la función de notificaciones.  
- Una línea en la doc de notificaciones indicando cómo se dispara el push de ingreso.

---

## 7. Qué revisar después (por agente/rol)

- **QA:** Probar en navegador (y si aplica en PWA instalada): permisos, suscripción, envío de push para venta, stock 0 e ingreso; comportamiento con múltiples pestañas y con app en segundo plano.  
- **DEV-LEAD:** Revisar que la tabla `push_subscriptions` y las Edge Functions escalen si crece el número de usuarios; uso de secrets para VAPID; que no quede lógica duplicada entre cliente y triggers.  
- **SECURITY:** Ver que RLS en `push_subscriptions` sea estricto (solo el propio user_id); que las funciones que envían push no expongan datos sensibles en título/cuerpo; que solo usuarios autenticados puedan registrar suscripciones. El push de venta incluye **monto, cliente y estado de pago** de esa venta: solo debe enviarse a usuarios que ya tienen acceso a ventas en la app (v1 = todos autenticados con push); cuando existan roles, considerar limitar a dueño/admin.

---

## 8. Resumen de archivos / módulos tocados (referencia)

| Área | Archivos / recursos |
|------|----------------------|
| DB | Nueva tabla `push_subscriptions`; opcional `notification_events`; trigger en `stock` y/o en `insumo_movimientos`. |
| Frontend | `public/sw.js`, hook `usePushSubscription`, posible pantalla o ítem en Ajustes para “Activar notificaciones”. |
| Backend | Edge Functions: envío de push (VAPID) y `notify-event` (venta, stock_zero, ingreso_mercaderia). |
| Config | Variables de entorno: VAPID public (frontend), VAPID private (Supabase secrets). |

Si más adelante se agregan roles (dueño, vendedor, producción), se puede añadir una columna `role` o tabla `user_roles` y en `notify-event` filtrar destinatarios por rol según el tipo de notificación.
