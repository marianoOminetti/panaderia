# Plan Etapa 1 — Infraestructura push (Prompt 1)

**Orden de implementación:** (1) Infraestructura → (2) Push venta + stock 0 → (3) Push ingreso.

---

## FASE 0 — Auditoría breve (resumen)

- **Estructura:** No existe `notifications/`, ni `pushNotifications.js`, ni `usePushSubscription`; no hay `public/sw.js`. Sin conflictos con la arquitectura.
- **Permiso actual:** `App.js` líneas 103–106 piden `Notification.requestPermission()` en un `useEffect`; se mueve al hook en Etapa 1.
- **Puntos de enganche (para Etapas 2 y 3):**
  - **Venta:** `useVentas.insertVentas()` — llamado desde `Ventas.jsx` (líneas 142, 307) y `ClienteDetalle.jsx` (196).
  - **Stock 0:** `useStockMutations.actualizarStock` y `actualizarStockBatch` — en actualizarStock ya hay toast + `new Notification()`; en batch solo toast.
  - **Ingreso:** `useStockMutations.registrarMovimientoInsumo()` — llamado desde `Insumos.jsx` (registrarCompraSoloStock / confirmarCompra).
- **Deep link:** `ventasPreloadGrupoKey` y efecto en `Ventas.jsx` ya existen; falta leer `?tab=ventas&venta=KEY` al cargar/ganar foco y setear tab + `ventasPreloadGrupoKey`.
- **Variables de entorno:** Proyecto usa `REACT_APP_*`; para VAPID: `REACT_APP_VAPID_PUBLIC_KEY`.

---

## Etapa 1 — Detalle (solo infra, sin notify-event ni disparos)

| Ítem | Acción |
|------|--------|
| **Migración SQL** | Crear tabla `push_subscriptions` (id, user_id FK auth.users, endpoint, p256dh, auth, created_at, updated_at). RLS: solo `auth.uid() = user_id` para SELECT, INSERT, UPDATE, DELETE. |
| **public/sw.js** | Escuchar `push` → mostrar notificación con título/cuerpo del payload. En `notificationclick` → abrir ventana con `payload.url` o base URL de la app. |
| **src/lib/pushNotifications.js** | `registerServiceWorker()`, `subscribeUser()` (VAPID público desde env), guardar suscripción en Supabase. Sin claves privadas. |
| **src/hooks/usePushSubscription.js** | Pedir permiso, registrar SW, suscribir, guardar en DB. Retornar `{ permission, isSubscribed, subscribe, unsubscribe, loading }`. Aquí vive el permiso (se quita de App.js). |
| **App.js** | Quitar useEffect de Notification. Añadir lectura de URL al cargar y al focus: si `tab=ventas` y `venta=KEY`, setTab('ventas') y setVentasPreloadGrupoKey(KEY). Registrar SW y opcionalmente suscribir (o dejar suscripción bajo demanda desde UI). |
| **Edge Function send-push** | Código en `supabase/functions/send-push/` listo para deploy manual; invocable solo desde backend (service role / notify-event). Si no hay Supabase CLI, dejar en docs el código. |
| **No tocar** | useVentas, useStockMutations, notify-event (Etapa 2). |

**Verificación Etapa 1:** App arranca; permiso se pide desde el hook; al aceptar, se registra SW y se guarda suscripción en `push_subscriptions`; abrir `/?tab=ventas&venta=<uuid>` abre tab Ventas y el modal de esa venta si existe.

---

## Etapa 2 — Estado (Prompt 2)

- **Implementado:** Llamada a `notify-event` tras `insertVentas` exitoso (desde `Ventas.jsx` usando `notifyEvent(\"venta\", { transaccion_id, venta_ids })`).  
- **Implementado:** Push stock 0 desde cliente: `useStockMutations.actualizarStock` y `actualizarStockBatch` llaman `notifyEvent(\"stock_zero\", { receta_id })` cuando `anterior > 0 && nuevo <= 0`.  
- **Implementado:** Edge Function `notify-event` (venta + stock_zero) que construye título/cuerpo y llama a `send-push`.  
- **Pendiente opcional:** Reemplazar `new Notification()` en `useStockMutations` por `notifyLocal` del módulo (hoy conviven la notificación local y el push backend).

## Etapa 3 (pendiente, Prompt 3)

- Disparo push al registrar ingreso (registrarMovimientoInsumo con tipo ingreso).
- Caso `ingreso_mercaderia` en notify-event.

---

## ESTADO DEL REFACTOR — Etapa 1 completada

**Completado:**
- Migración SQL `push_subscriptions` + RLS (`supabase/migrations/20260304100010_push_subscriptions.sql`)
- Service Worker `public/sw.js` (push + notificationclick con url)
- `src/lib/pushNotifications.js` (registerServiceWorker, subscribeUser, saveSubscriptionToSupabase)
- `src/hooks/usePushSubscription.js` (permiso, SW, subscribe/unsubscribe, auto-suscribir al aceptar)
- App.js: quitado useEffect de Notification; añadido usePushSubscription; deep link (applyDeepLink en mount + focus)
- Edge Function stub `supabase/functions/send-push/index.ts` (lee body, lee suscripciones; envío Web Push pendiente de librería Deno)
- Doc `docs/PUSH_VAPID_Y_DEPLOY.md` y `REACT_APP_VAPID_PUBLIC_KEY` en `.env.example`

**Pendiente Etapa 2 (Prompt 2):**
- Implementar envío Web Push real en `send-push` (hoy devuelve 501; falta integrar librería Web Push para Deno y usar VAPID_PRIVATE_KEY).  
- Decidir si se mantiene o se reemplaza la `Notification` local en `useStockMutations` por un helper `notifyLocal` único.

**Verificar Etapa 1:**
1. Configurar `REACT_APP_VAPID_PUBLIC_KEY` en .env y aplicar migración `push_subscriptions`.
2. Iniciar sesión → aceptar notificaciones → comprobar que en `push_subscriptions` hay una fila para ese user_id.
3. Abrir `/?tab=ventas&venta=<key>` (con key = transaccion_id o id de una venta suelta) → debe abrir tab Ventas y el modal de esa venta.
