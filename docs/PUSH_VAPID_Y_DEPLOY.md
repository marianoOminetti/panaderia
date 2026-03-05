# Notificaciones push: VAPID y deploy de la Edge Function

## 1. Generar claves VAPID

La Edge Function `send-push` usa la librería **PushForge** (`@pushforge/builder`) para enviar Web Push en Deno. Esta librería espera que la clave privada VAPID esté en formato **JWK** (JSON Web Key).

En tu máquina (una sola vez por proyecto):

```bash
npm install -D @pushforge/builder
npx @pushforge/builder vapid
```

Obtendrás un JSON con algo similar a:

```json
{
  "publicKey": "BHy...",
  "privateJWK": { ... }
}
```

- **Clave pública (`publicKey`)**: la ponés en el frontend como variable de entorno `REACT_APP_VAPID_PUBLIC_KEY` (en `.env.development.local`, `.env.production.local`, o en Vercel/plataforma de deploy).
- **Clave privada (`privateJWK`)**: solo en el backend. En Supabase: Dashboard → Project Settings → Edge Functions → Secrets → añadí `VAPID_PRIVATE_KEY` con el **JSON completo** de `privateJWK` (como string).

> Si antes generaste claves con `npx web-push generate-vapid-keys`, deberás regenerar y actualizar tanto la pública como la privada para que coincidan con el formato de PushForge. Los usuarios deberán volver a aceptar notificaciones para registrar la nueva clave.

## 2. Configurar el frontend

En el archivo `.env` que use tu entorno (ej. `.env.development.local`):

```
REACT_APP_VAPID_PUBLIC_KEY=BH... (la clave pública completa)
```

Reiniciá el servidor de desarrollo después de cambiar variables de entorno.

## 3. Deploy de la Edge Function send-push

La función está en `supabase/functions/send-push/index.ts`. Actualmente lee suscripciones de la tabla `push_subscriptions` y prepara el payload; el envío real con Web Push en Deno requiere una librería compatible (p. ej. [PushForge](https://pushforge.draphy.org/) o [@negrel/webpush en JSR](https://www.negrel.dev/blog/deno-web-push-notifications/)).

### Deploy con Supabase CLI

```bash
supabase login
supabase link --project-ref <tu-project-ref>
supabase secrets set VAPID_PRIVATE_KEY=<tu-clave-privada>
supabase functions deploy send-push
```

### Seguridad

- **send-push no debe ser invocada por el cliente** con título/cuerpo/url arbitrarios. Invocala solo desde otra Edge Function (por ejemplo `notify-event`) usando el cliente con **service role**, o desde un trigger/worker en la DB.
- En el Dashboard de Supabase podés restringir qué funciones son invocables públicamente; `send-push` debería quedar solo para invocación interna o con auth de servicio.

## 4. Aplicar la migración push_subscriptions

Si aún no aplicaste la migración de la tabla:

```bash
supabase db push
```

O desde el Dashboard: SQL Editor → ejecutar el contenido de `supabase/migrations/20260304100010_push_subscriptions.sql`.

## 5. Probar el flujo (Etapa 1)

1. App con `REACT_APP_VAPID_PUBLIC_KEY` configurada.
2. Iniciar sesión → el hook pide permiso de notificaciones (si está en "default").
3. Aceptar → desde la UI (cuando exista botón "Activar notificaciones" en Más) llamar a `subscribe()` del hook para registrar la suscripción; la fila se guarda en `push_subscriptions`.
4. Deep link: abrir en el navegador `https://tu-app.vercel.app/?tab=ventas&venta=<transaccion_id_o_id_venta>` → debe abrir la pestaña Ventas y el modal de esa venta si existe.

Cuando la Edge Function tenga integrada la librería Web Push, podrás enviar un push de prueba desde `notify-event` o desde una llamada interna a `send-push` con body `{ title: "Prueba", body: "Hola", url: "/" }`.
