# Producción: no puedo eliminar ni cargar

## Error "duplicate key value violates unique constraint" (version already exists)

Si al hacer `db push` ves `Key (version)=(20250302100004) already exists`, el historial de migraciones está desincronizado. Probá:

```bash
npx supabase link --project-ref clgxrxlccjjqxzvapfav
npx supabase migration repair 20250302100004 --status reverted
npx supabase db push --yes
```

Eso marca la migración como revertida; al hacer `db push` se vuelve a aplicar (el `ADD COLUMN IF NOT EXISTS` no rompe si la columna ya existe). Si falla otra versión, reemplazá `20250302100004` por la que indique el error.

---

## Problemas de carga/eliminación

Si en producción **no podés eliminar ventas** ni **cargar stock** (u otras operaciones fallan), casi siempre es un tema de **base de datos** o **autenticación**.

## Checklist rápido

### 1. Migraciones aplicadas en el proyecto de producción

Dev y prod usan **proyectos Supabase distintos**:

- **Dev**: `xdiggsdjmmylkvephyod`
- **Prod**: `clgxrxlccjjqxzvapfav`

Las migraciones hay que aplicarlas en **cada** proyecto:

```bash
# Vincular al proyecto de producción
supabase link --project-ref clgxrxlccjjqxzvapfav

# Aplicar migraciones (incluye fix de RLS si clientes carga pero insumos/ventas no)
supabase db push
```

Si **clientes carga pero insumos y ventas no**, es casi seguro un tema de políticas RLS parciales. La migración `20250302100008_rls_fix.sql` las corrige: ejecutá `supabase db push` en prod.

### 2. Usuario creado en el proyecto de producción

Los usuarios se crean por proyecto. Un usuario de dev **no existe** en prod.

1. Entrá al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Seleccioná el **proyecto de producción** (clgxrxlccjjqxzvapfav)
3. **Authentication** → **Users** → **Add user**
4. Creá el usuario con el mismo email/contraseña que usás en prod

### 3. Variables de entorno en Vercel

En el proyecto de Vercel, **Settings** → **Environment Variables**:

- `REACT_APP_SUPABASE_URL` → URL del proyecto de **producción** (ej: `https://clgxrxlccjjqxzvapfav.supabase.co`)
- `REACT_APP_SUPABASE_ANON_KEY` → `anon` key del proyecto de **producción**
- `REACT_APP_VAPID_PUBLIC_KEY` → clave pública del **mismo par** que `VAPID_PRIVATE_KEY` en Supabase prod (ver `docs/PUSH_VAPID_Y_DEPLOY.md`). Usá **Production** con un valor distinto al de Preview si cada ambiente tiene su propio proyecto Supabase.

Si apuntan al proyecto de dev, vas a tener datos mezclados o errores raros.

### 3b. Push notifications no llegan

1. **VAPID alineado:** la pública en Vercel debe corresponder al JWK privado en Supabase (Edge Functions → Secrets → `VAPID_PRIVATE_KEY`). Si rotaste claves: `node scripts/push-set-vapid-secrets.js --file .vapid-keys.local.json` y `npm run push:deploy`.
2. **Suscripciones:** en prod, SQL Editor: `SELECT user_id, updated_at FROM push_subscriptions;` — si está vacío, en la app **Más → Activar notificaciones** (permiso concedido, iPhone con PWA instalada).
3. **Push de prueba (sin venta):** copiá `.env.push.local.example` → `.env.push.local` con la `service_role` de prod, luego `npm run push:test:prod`. Solo listar suscripciones: `npm run push:test:prod -- --list`. Un usuario: `npm run push:test:prod -- --user=<uuid>`.
4. **Logs:** Supabase → Edge Functions → `send-push` / `notify-event` tras registrar una venta online.
5. **Sentry:** buscá mensajes con tag `area:push` (`sent=0`, invoke failed).

### 4. URL de producción en Supabase Auth

En el proyecto de prod en Supabase:

1. **Authentication** → **URL Configuration**
2. **Site URL**: tu URL de producción (ej: `https://panaderia.vercel.app`)
3. **Redirect URLs**: agregá tu dominio de prod si usás OAuth o magic links

Para login con email/contraseña esto suele no ser necesario, pero conviene tenerlo bien configurado.

### 5. Verificar políticas RLS en prod

En el SQL Editor del proyecto de prod, ejecutá:

```sql
-- Ver políticas activas en ventas
SELECT * FROM pg_policies WHERE tablename = 'ventas';

-- Ver políticas en stock
SELECT * FROM pg_policies WHERE tablename = 'stock';
```

Deberías ver políticas tipo `auth_required_ventas` con `auth.uid() IS NOT NULL`. Si no hay políticas o son distintas, volvé a correr las migraciones.

### 6. Recrear políticas si hace falta

Si las políticas están mal o no existen, podés recrearlas:

```sql
-- Ejemplo para ventas (ajustá según tus migraciones)
DROP POLICY IF EXISTS "auth_required_ventas" ON ventas;
CREATE POLICY "auth_required_ventas" ON ventas
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
```

Repetí para `stock`, `insumos`, `recetas`, `clientes`, etc., según las tablas que uses.

---

## Ver el error real

**Sentry (recomendado en prod):** configurá `REACT_APP_SENTRY_DSN` en Vercel y redeploy. Ver pasos en [SENTRY.md](./SENTRY.md).

Con el sistema de logs que agregamos, cuando falla una operación:

1. El toast muestra el mensaje de Supabase (ej: `new row violates row-level security policy`)
2. Si hay errores, aparece un botón ⚠ en el header para ver el log completo
3. En la consola del navegador (F12) vas a ver `[Panadería Error]` con más detalle

Eso te indica si es RLS, permisos, o algo distinto.
