# Arquitectura y convenciones: notificaciones push

**Objetivo:** Integrar un sistema de notificaciones push de forma modular en la app React + Supabase, con tres tipos:

1. Notificación al **registrar una venta**
2. Notificación al **registrar ingreso de mercadería** (insumo)
3. Notificación cuando el **stock de un producto llega a 0**

Este documento define la estructura actual, dónde debe vivir el código nuevo, qué legacy eliminar y las convenciones para quien implemente.

**Referencia obligatoria:** Antes de implementar, usar como spec de negocio y requisitos el archivo **`docs/NOTIFICACIONES_PUSH_ANALISIS_Y_PROMPTS.md`** (contenido de cada push, redirección, prompts 1–3 y orden de implementación).

---

## 1. Estructura actual del proyecto (auditoría)

### 1.1 Árbol relevante

```
src/
  App.js                 ← routing, providers, Toast/Confirm, pide permiso Notification
  components/
    AppContent.jsx       ← switch por tab (dashboard, ventas, stock, more, etc.)
    auth/                ← AuthScreen, ConfigMissing
    layout/              ← AppHeader, AppNav, ErrorLogOverlay
    ui/                  ← Toast, ConfirmDialog, SearchableCliente, SearchableSelect
    dashboard/           ← Dashboard, DashboardAlerts, DashboardMetrics, DashboardQuickGrid
    ventas/              ← Ventas, VentasList, VentasCart, VentasEditModal, VentasVoiceModal, etc.
    stock/               ← Stock, StockList, StockProductionModal, StockVoiceModal
    insumos/             ← Insumos, InsumosList, InsumosCompra, InsumosComposicion
    recetas/             ← Recetas
    clientes/            ← Clientes, ClientesList, ClienteDetalle, ClienteFormModal
    plan/                ← PlanSemanal, PlanSemanalTable, PlanSemanalActions
    analytics/           ← Analytics, AnalyticsSemana, AnalyticsGraficos, AnalyticsProductos
    gastos/              ← GastosFijos
    menu/                ← MoreMenuScreen
  hooks/                 ← useAppData, useAuth, useVentas, useStockMutations, useClientes, useInsumos, etc.
  lib/                   ← supabaseClient (único cliente), format, dates, units, agrupadores, costos, metrics, etc.
  config/                ← appConfig, nav
  utils/                 ← errorReport
```

### 1.2 Patrones ya establecidos

| Aspecto | Cómo está hoy |
|--------|----------------|
| **Cliente Supabase** | Un solo lugar: `src/lib/supabaseClient.js`. Todos los hooks importan `supabase` desde ahí. |
| **Queries / mutaciones** | En **hooks** (`useVentas`, `useStockMutations`, `useInsumos`, etc.), no en componentes. |
| **Estado global de app** | En `App.js` vía `useAppData` + hooks de mutación; datos pasados por props a `AppContent` → pantallas. |
| **UI reutilizable** | `components/ui/` (Toast, ConfirmDialog, Searchable*). Sin lógica de negocio. |
| **Dominios** | Carpetas por dominio bajo `components/` (ventas, stock, insumos, clientes, etc.). |

### 1.3 Puntos de enganche para los tres tipos de notificación

| Tipo | Dónde se dispara hoy en código |
|------|-------------------------------|
| **Venta registrada** | `useVentas.insertVentas()` — llamado desde `Ventas.jsx` (carrito/cobrar) y `ClienteDetalle.jsx` (entregar pedido). |
| **Ingreso de mercadería** | `useStockMutations.registrarMovimientoInsumo(insumo_id, "ingreso", cantidad, valor)` — llamado desde `Insumos.jsx` e indirectamente desde `Stock.jsx` (consumos son egreso). |
| **Stock producto a 0** | `useStockMutations.actualizarStock()` y `actualizarStockBatch()` — cuando `anterior > 0 && nuevo <= 0` ya se hace toast + `new Notification()` **inline** en el hook (ver sección 3). |

---

## 1.4 Contenido de cada push y redirección (spec desde NOTIFICACIONES_PUSH_ANALISIS_Y_PROMPTS.md)

Esta sección fija el **contrato** de qué va en cada notificación y cómo debe comportarse el clic. Cualquier implementación debe respetarlo.

### Push de venta

| Campo | Contenido |
|-------|-----------|
| **Título** | Ej. `Venta $12.500` (monto total de esa transacción). |
| **Cuerpo** | Nombre del cliente (o "Consumidor final") + " · " + "Pagado" o "Debe" según `estado_pago`. Ej. `Juan Pérez · Pagado`, `Consumidor final · Debe`. |
| **Redirección** | Al hacer clic → abrir la app en la pestaña **Ventas** y abrir el **detalle de esa venta** (modal existente al tocar una venta en la lista). |

**Deep link técnico:**

- El payload del push debe incluir **`ventaGrupoKey`**: `transaccion_id` si la venta tiene uno, o el `id` del ítem si es venta suelta (misma `key` que usa `agruparVentas()` en `src/lib/agrupadores.js`).
- El service worker, al recibir el clic, debe abrir la URL de la app con query, ej. `/?tab=ventas&venta=KEY`.
- La app, al cargar o al ganar foco, debe leer `tab` y `venta` de la URL: si `tab=ventas` y `venta=KEY`, cambiar a la pestaña Ventas y setear **`ventasPreloadGrupoKey`** con `KEY` (ya existe en `App.js` y `Ventas.jsx`; solo falta conectar la lectura de la URL con ese estado).

### Push de ingreso de mercadería

- Título tipo "Ingreso de mercadería", cuerpo breve (ej. "Se registró una compra de insumos"). Sin redirección específica obligatoria en la spec.

### Push stock a 0

- Título/cuerpo tipo "Stock en 0: [nombre producto]". Sin redirección específica obligatoria en la spec.

### Backend (Edge Functions)

- **send-push:** debe aceptar en el body, además de `title` y `body`, un campo opcional **`url`** (ej. `/?tab=ventas&venta=KEY`) para que el service worker abra esa URL al hacer clic.
- **notify-event:** para tipo `venta`, debe consultar la venta (y join con `clientes`), armar título/cuerpo (monto, cliente, Pagado/Debe), calcular **ventaGrupoKey** (transaccion_id o id del ítem), y pasar a send-push la `url` construida con esa key.

---

## 2. Dónde debe vivir el código de notificaciones push

### 2.1 Módulo de notificaciones (frontend)

Crear un **módulo acotado** que concentre suscripción, permisos, estado y helpers de UI:

```
src/
  lib/
    pushNotifications.js     ← servicio: registro SW, suscripción VAPID, guardar endpoint en Supabase (tabla push_subscriptions o similar)
  hooks/
    usePushSubscription.js   ← hook: permiso, suscribir/desuscribir, estado (subscribed | denied | unsupported)
    useNotifications.js      ← opcional: estado en UI (lista de notificaciones leídas/no leídas si se guardan en DB)
  components/
    notifications/            ← carpeta del “dominio” notificaciones
      NotificationPermissionBanner.jsx   ← opcional: aviso para activar notificaciones
      NotificationList.jsx                ← opcional: lista en “Más” o header
```

**Regla:** Todo lo que sea “pedir permiso”, “registrar service worker”, “suscribirse a push” y “mostrar estado de suscripción” vive en este módulo. Los **eventos de negocio** (venta, ingreso, stock a 0) no deben duplicar lógica de notificación: deben **disparar** el envío vía backend o, en su defecto, llamar a un único helper del módulo (ver 2.3).

### 2.2 Suscripción push (dónde vive)

| Responsabilidad | Ubicación | Descripción |
|-----------------|-----------|-------------|
| Service Worker | `public/sw.js` (o `public/sw-notifications.js`) | Manejo de `push` (mostrar notificación con título/cuerpo del payload). **En `notificationclick`:** abrir la app (focus o nueva pestaña) con la URL que venga en el payload; si el payload tiene `url` (ej. `/?tab=ventas&venta=KEY`), usar esa URL; si no, abrir la base URL de la app. |
| Registro SW + VAPID | `src/lib/pushNotifications.js` | Funciones: `registerServiceWorker()`, `subscribeUser(subscription => saveToSupabase(subscription))`. |
| Persistir suscripción | Hook o lib | Insert/upsert en tabla `push_subscriptions` (user_id, endpoint, keys, etc.) vía `supabase.from('push_subscriptions').upsert(...)`. |
| Permiso y estado en UI | `src/hooks/usePushSubscription.js` | Retorna `{ permission, isSubscribed, subscribe, unsubscribe, loading }`. Usado por App o por un banner en layout. |
| Pedir permiso al cargar | Hoy está en `App.js` (líneas 105–107). | **Recomendación:** Mover a `usePushSubscription` o a un efecto dentro del módulo de notificaciones; App solo usa el hook o un componente que lo use. |
| **Deep link (lectura URL)** | `App.js` o `AppContent.jsx` | Al cargar la app (o al ganar foco si se abre desde notificación), leer query params: si `tab=ventas` y `venta=KEY`, setear estado de tab a "ventas" y **ventasPreloadGrupoKey** a `KEY`, para que `Ventas.jsx` abra el modal de esa venta (ya existe el efecto que reacciona a `ventasPreloadGrupoKey`). |

### 2.3 Envío desde backend (dónde vive)

Las notificaciones push **reales** (con la app en segundo plano o cerrada) se envían desde un **servidor** que tenga las VAPID keys privadas. Opciones coherentes con el stack:

| Opción | Dónde vive | Comentario |
|--------|------------|------------|
| **Supabase Edge Functions** | `supabase/functions/send-push/` + `notify-event/` (o equivalente) | **send-push:** recibe `title`, `body`, opcionalmente `url` (para el clic); obtiene suscripciones desde `push_subscriptions`, envía con web-push (incluyendo `url` en el payload para el SW). **notify-event:** recibe tipo venta, stock_zero o ingreso_mercaderia y payload (ver doc de análisis); para tipo `venta` consulta venta + cliente, arma título/cuerpo y `url` con `ventaGrupoKey`; llama a send-push. |
| **Database triggers + Edge Function** | Migración SQL (trigger on `ventas`, `insumo_movimientos`, `stock`) que llama a `net.http_post` a la Edge Function | Mantiene la lógica de “cuándo notificar” en la DB; la función solo “envía”. |
| **Servicio externo** (OneSignal, Firebase FCM, etc.) | Config y llamadas desde Edge Function o desde un cron/job | Misma idea: backend envía; el frontend solo se suscribe y recibe. |

**Convención:** Todo el código que **envía** push (VAPID privada, web-push, etc.) vive **solo en backend** (Edge Functions o servicio externo). El frontend **nunca** debe contener claves privadas ni lógica de envío a terceros.

### 2.4 UI y estado de notificaciones (in-app)

| Qué | Dónde |
|-----|--------|
| Lista de notificaciones (si se guardan en DB) | `src/components/notifications/NotificationList.jsx`; datos con hook que lea de `notificaciones` o similar. |
| Badge / contador no leídas | Opcional: en `AppNav` o `AppHeader`, leyendo del mismo estado. |
| Ajustes “activar/desactivar notificaciones” | Dentro de “Más” (p. ej. `MoreMenuScreen`) o en un subpanel; usa `usePushSubscription`. |
| Toast / notificación in-app al recibir push | El Service Worker ya puede mostrar la notificación nativa; si además se quiere un toast en la app cuando está abierta, se puede exponer un evento (BroadcastChannel o desde SW) y que un listener en App o en un provider actualice estado y muestre Toast. |

---

## 3. Código legacy a eliminar o refactorizar

### 3.1 Notificación inline en `useStockMutations.js`

**Situación:** Cuando el stock pasa a 0, el hook hace:

- `showToast(...)` (correcto, reutilizable)
- Llamada directa a `new Notification("Stock agotado", { body: ... })` (líneas 41–52 y equivalente en batch no tiene el mismo aviso push).

**Problema:** Lógica de notificación mezclada con mutación de stock; además solo cubre “stock a 0” en un flujo (actualizarStock), no en batch ni centralizado para los otros dos tipos (venta, ingreso).

**Propuesta:**

1. **Al implementar el módulo de push:** Crear en `src/lib/pushNotifications.js` (o similar) una función tipo `notifyLocal(title, body)` que:
   - Si `Notification.permission === 'granted'`, muestre `new Notification(title, body)`.
   - Opcionalmente envíe el evento a un listener para mostrar también un toast en la app.
2. **En `useStockMutations`:** Eliminar el bloque `if (Notification.permission === 'granted') { new Notification(...) }` y reemplazarlo por una llamada a `notifyLocal('Stock agotado', \`${nombre} se quedó sin stock.\`)` importada desde el módulo de notificaciones.
3. **En `actualizarStockBatch`:** Aplicar el mismo criterio para los ítems que pasan a 0 (hoy solo hacen `showToast`; unificar con `notifyLocal` para que quede un solo punto de “mostrar notificación”).

Así no se introduce código nuevo disperso y el futuro “envío desde backend” puede reutilizar los mismos títulos/cuerpos o un mapa de tipos.

### 3.2 Petición de permiso en `App.js`

**Situación:** Líneas 105–107 piden `Notification.requestPermission()` al montar.

**Propuesta:** Cuando exista `usePushSubscription`, mover esta lógica al hook (o a un efecto dentro de un componente que use el hook). App solo monta ese componente o usa el hook y deja de tener el `useEffect` de Notification. Así todo el flujo de permisos queda en el módulo de notificaciones.

### 3.3 Tests desactualizados

**Situación:** `App.test.js` sigue buscando “learn react” (documentado en `docs/AUDITORIA_POST_REFACTOR.md` y `docs/PLAN_AUTOMATIZACION_PRUEBAS.md`).

**Propuesta:** No es bloqueante para push, pero para no dejar más legacy: actualizar el test para que compruebe algo que exista (p. ej. que la app renderiza sin error o que aparece un elemento de la shell). No introducir tests de notificaciones push en esta primera fase a menos que se automatice el flujo E2E.

### 3.4 Resumen de cambios legacy

| Archivo | Acción |
|---------|--------|
| `src/hooks/useStockMutations.js` | Quitar `new Notification(...)` inline; usar helper del módulo de notificaciones (`notifyLocal`). |
| `src/App.js` | Mover petición de permiso a `usePushSubscription` o componente del módulo notificaciones. |
| `src/App.test.js` | Actualizar o reemplazar para que el test sea válido (evitar “learn react”). |

---

## 4. Convenciones concretas para la implementación

### 4.1 Nombres de carpetas y archivos

| Tipo | Convención | Ejemplo |
|------|------------|--------|
| Carpetas | `kebab-case` | `notifications` (ya en camelCase en el proyecto para dominios; mantener consistencia con `dashboard`, `ventas`, etc.). |
| Componentes React | `PascalCase.jsx` | `NotificationPermissionBanner.jsx`, `NotificationList.jsx` |
| Hooks | `camelCase` con prefijo `use` | `usePushSubscription.js`, `useNotifications.js` |
| Servicios / lib | `camelCase.js` | `pushNotifications.js` |
| Service Worker | `camelCase.js` en `public/` | `sw.js` o `sw-notifications.js` |
| Edge Functions | `kebab-case` (Supabase) | `send-push` o `notify-venta`, `notify-ingreso`, `notify-stock-zero` |

### 4.2 Dónde importar el cliente Supabase

- Siempre: `import { supabase } from '../lib/supabaseClient'` (o la ruta relativa correcta).
- El módulo de notificaciones debe usar el mismo cliente para guardar suscripciones y, si aplica, leer preferencias.

### 4.3 Tipos de notificación (constantes)

Definir en un solo lugar (p. ej. `src/config/notifications.js` o dentro de `src/lib/pushNotifications.js`) los tipos que el backend y el frontend comparten:

```js
// Ejemplo: src/config/notifications.js
export const NOTIFICATION_TYPES = {
  VENTA_REGISTRADA: 'venta_registrada',
  INGRESO_MERCADERIA: 'ingreso_mercaderia',
  STOCK_CERO: 'stock_cero',
};
```

Así los títulos/cuerpos y el routing en el SW pueden basarse en un mismo mapa.

### 4.4 Patrones a seguir (para no introducir legacy)

1. **Un solo lugar para “mostrar notificación local”:** Helper (`notifyLocal` o similar) usado por hooks de negocio (useStockMutations, y en el futuro por callbacks tras venta/ingreso si se quiere feedback inmediato en la misma sesión).
2. **Un solo lugar para suscripción:** Toda la lógica de registro SW + VAPID + guardar en DB en `lib/pushNotifications.js` y en `usePushSubscription`; no duplicar en componentes.
3. **Backend envía, frontend no:** No poner claves privadas ni llamadas a web-push desde el frontend.
4. **Hooks para datos y estado:** Si se guardan notificaciones en DB, un hook `useNotifications()` que lea y opcionalmente marque como leídas; los componentes solo consumen ese hook.
5. **No dejar archivos huérfanos:** Cualquier nuevo archivo debe ser importado desde `App`, `AppContent`, un hook usado por ellos o desde otro componente ya referenciado en el árbol.
6. **Manejo de errores:** En hooks que llamen a Supabase (p. ej. guardar suscripción), usar el mismo patrón que en el resto del proyecto: `if (error) { console.error('[notifications/...]', error); throw error; }`.

### 4.5 Checklist antes de dar por cerrada la feature

- [ ] Suscripción push vive en `src/lib/pushNotifications.js` + `src/hooks/usePushSubscription.js`.
- [ ] Service Worker en `public/` solo maneja `push` y muestra notificación (y opcionalmente comunica con la app vía BroadcastChannel).
- [ ] Envío de push desde backend (Edge Function o equivalente); sin claves privadas en el frontend.
- [ ] Los tres eventos (venta, ingreso, stock a 0) disparan notificación vía backend (o vía helper único en frontend para notificación local).
- [ ] Push de venta: contenido = monto + cliente + Pagado/Debe; payload incluye `ventaGrupoKey`; clic abre app con `?tab=ventas&venta=KEY`; App lee params y setea `ventasPreloadGrupoKey`.
- [ ] Código legacy eliminado: sin `new Notification(...)` inline en `useStockMutations`; permiso movido al módulo de notificaciones; App.test actualizado si se toca.
- [ ] Ningún archivo nuevo sin import (no huérfanos).
- [ ] Convenciones de nombres y carpetas respetadas.

---

## 5. Resumen rápido

| Tema | Ubicación |
|------|------------|
| **Suscripción push (SW + VAPID + guardar en DB)** | `src/lib/pushNotifications.js`, `src/hooks/usePushSubscription.js`, `public/sw.js` |
| **Envío desde backend** | Edge Functions `send-push` (acepta `url` para clic) y `notify-event` (arma mensaje por tipo; para venta: monto, cliente, Pagado/Debe + ventaGrupoKey → url) |
| **Deep link (clic en push de venta)** | Payload con `url` (ej. `/?tab=ventas&venta=KEY`); SW abre esa URL; App/AppContent lee `tab` y `venta`, setea `ventasPreloadGrupoKey` |
| **UI / estado de notificaciones** | `src/components/notifications/` + hook `useNotifications` si hay lista en DB |
| **Notificación local (fallback / mismo dispositivo)** | Helper único en el módulo (p. ej. `notifyLocal`), usado por useStockMutations y demás |
| **Eliminar legacy** | Quitar Notification inline de useStockMutations, mover permiso desde App.js, actualizar App.test |

**Spec de contenido y flujo:** Ver sección 1.4 y **`docs/NOTIFICACIONES_PUSH_ANALISIS_Y_PROMPTS.md`** (prompts 1–3, contenido del push de venta, redirección).

---

## 6. Seguridad: la push lleva información sensible

Las notificaciones incluyen **datos sensibles del negocio**: montos de venta, nombres de clientes, estado de pago, nombres de productos. No pueden llegar a cualquiera. Esta sección fija requisitos obligatorios para la implementación.

### 6.1 Quién puede registrar una suscripción push

- **Solo usuarios autenticados.** La tabla `push_subscriptions` debe tener **RLS estricto**: cada usuario solo puede INSERT/UPDATE/DELETE/SELECT sus propias filas (`auth.uid() = user_id`). No puede ver ni modificar suscripciones de otros.
- El frontend solo debe poder guardar suscripciones con `user_id = auth.uid()` (el cliente de Supabase ya envía el JWT; RLS debe rechazar cualquier fila con otro `user_id`).
- En la migración: políticas explícitas para SELECT, INSERT, UPDATE y DELETE con `auth.uid() = user_id`. Sin políticas por defecto que permitan leer todas las filas a usuarios normales.

### 6.2 Quién puede enviar push (Edge Functions)

- **send-push** no debe ser invocable por el cliente con título/cuerpo/url arbitrarios. Si cualquier usuario autenticado pudiera llamarla, podría enviar push falsos a todos o a usuarios concretos.  
  **Requisito:** send-push debe ser invocada **solo** desde el backend: por **notify-event** (u otra Edge Function) usando **service role** o por un trigger/worker interno. El cliente **nunca** debe llamar a send-push directamente.
- **notify-event:** si se invoca desde el cliente (por ejemplo tras `insertVentas`), debe **validar** que el evento existe y que el usuario tiene derecho a disparar esa notificación (por ejemplo: la venta recién insertada pertenece al mismo contexto/tenant; o solo se permite invocar desde triggers en DB y no desde el cliente). No confiar en título/cuerpo enviados por el cliente: el mensaje se construye **siempre en el backend** a partir de datos de la DB.
- Preferible: disparar notificaciones desde **triggers en la DB** (AFTER INSERT en `ventas`, etc.) llamando a la Edge Function con service role, así ningún cliente puede “disparar” pushes a mano.

### 6.3 A quién se envía el push

- Solo a usuarios que **tienen una fila en `push_subscriptions`** (es decir, aceptaron notificaciones y su suscripción está guardada).
- Hoy no hay roles: en la spec se asume que todos los usuarios autenticados son del mismo negocio y pueden ver ventas. Aun así, el envío debe leer destinatarios desde `push_subscriptions` (solo esos endpoints), no desde una lista arbitraria que pueda enviar el cliente.
- **Cuando existan roles:** filtrar destinatarios por rol (por ejemplo push de venta solo a dueño/admin), según lo definido en el doc de análisis (SECURITY).

### 6.4 Deep link y acceso a la venta

- La URL del push incluye `ventaGrupoKey` (UUID de transacción o de ítem). Cualquier usuario que reciba o conozca esa URL podría intentar abrir `?tab=ventas&venta=KEY`.
- **Requisito:** el acceso a los datos de la venta debe estar protegido por **RLS** en las tablas `ventas` y `clientes`. Al abrir la app con `?venta=KEY`, la app cargará esa venta vía Supabase; si RLS es correcto, solo los usuarios autorizados verán datos. No confiar en “solo usuarios con el link”; confiar en que la capa de datos (RLS) restringe por usuario/tenant.
- No incluir en el payload del push más información sensible de la necesaria (evitar IDs de clientes u otros datos que no deban verse en el dispositivo).

### 6.5 Claves y payload

- **VAPID privada:** solo en backend (Supabase secrets). Nunca en el frontend ni en el repo.
- **VAPID pública:** en variable de entorno en el frontend; no hardcodear en el código.
- El contenido del push (título, cuerpo, url) se construye en el backend a partir de la DB; el cliente no envía texto libre que se muestre en la notificación.

### 6.6 Checklist de seguridad (implementación)

- [ ] RLS en `push_subscriptions`: solo `auth.uid() = user_id` para todas las operaciones de usuarios normales.
- [ ] send-push invocable solo desde el backend (service role / otra Edge Function), no desde el cliente.
- [ ] notify-event: si se llama desde el cliente, validar evento y permisos; mensaje siempre armado en backend desde DB.
- [ ] Destinatarios del push: solo los que figuren en `push_subscriptions`; sin listas arbitrarias enviadas por el cliente.
- [ ] RLS en `ventas` (y `clientes`) correcto, de modo que el deep link no exponga datos a quien no debería verlos.
- [ ] VAPID privada solo en secrets; pública en env.

Con esto, la implementación de push notifications queda acotada a un módulo claro, reutilizable y alineado con la estructura y convenciones ya usadas en el proyecto.
