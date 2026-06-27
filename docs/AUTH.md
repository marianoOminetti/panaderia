# Autenticación

La app es una herramienta de gestión interna. **No hay auto-registro**: los usuarios se crean desde el panel de Supabase.

**RLS activo**: Si no estás logueado, Supabase devuelve 403 Forbidden en todas las consultas.

---

## Vincular Supabase al proyecto (CLI)

Para usar `supabase db push` y otros comandos:

```bash
# 1. Login (abre el navegador o usa token)
supabase login

# 2. Vincular al proyecto dev
supabase link --project-ref xdiggsdjmmylkvephyod

# 3. Push de migraciones (dev suele requerir --include-all)
npm run db:push:dev
```

Tras el primer deploy de roles, la migración `20260602123100_bootstrap_user_roles_dev.sql` asigna `admin` a usuarios Auth existentes sin fila en `user_roles`.

Para producción: `supabase link --project-ref clgxrxlccjjqxzvapfav`

**Token alternativo:** Si no querés usar el flujo del navegador, generá un token en [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) y ejecutá:

```bash
SUPABASE_ACCESS_TOKEN=tu_token supabase link --project-ref xdiggsdjmmylkvephyod
```

---

## Crear usuarios (email + contraseña)

1. Entrá al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Seleccioná tu proyecto
3. **Authentication** → **Users**
4. **Add user** → **Create new user**
5. Ingresá **email** y **contraseña**
6. Guardá

Ese usuario ya puede entrar a la app con ese email y contraseña.

---

## Asignar rol de app (obligatorio)

La app usa roles internos en `public.user_roles`.
Si un usuario no tiene rol, no puede entrar.

Roles disponibles:
- `admin`: acceso completo.
- `venta`: solo módulo de ventas (CRUD ventas + alta/edición básica de cliente).

Asignar rol desde SQL Editor (Supabase):

```sql
-- 1) Buscar el user_id del usuario
select id, email
from auth.users
where email = 'usuario@tu-dominio.com';

-- 2) Asignar rol (ejemplo: venta)
insert into public.user_roles (user_id, role)
values ('UUID_DEL_USUARIO', 'venta')
on conflict (user_id)
do update set role = excluded.role, updated_at = now();
```

Para asignar admin, usar `role = 'admin'`.

---

## Desactivar confirmación de email (opcional)

Si querés que los usuarios entren sin confirmar el email:

1. **Authentication** → **Providers** → **Email**
2. Desactivá **"Confirm email"**

---

## Scripts (seed, import-recetas)

Los scripts que escriben en la DB necesitan la **service role key** (bypasea RLS):

```bash
SUPABASE_KEY=tu_service_role_key node scripts/seed-dia-ejemplo.js
```

La service role key está en: Dashboard → Settings → API → `service_role` (no la expongas en el frontend).

---

## Copiar prod → dev

Para clonar datos de producción a desarrollo (solo datos, no estructura):

```bash
# Con supabase login (lee service_role automáticamente)
npm run copy:prod-to-dev

# Solo lo necesario para probar plan semanal (recetas, masas, ventas, plan)
npm run copy:prod-to-dev:plan

# O con keys explícitas
SUPABASE_PROD_SERVICE_KEY=xxx SUPABASE_DEV_SERVICE_KEY=yyy npm run copy:prod-to-dev
```

Antes de copiar, asegurate de que dev tenga el mismo esquema: `npm run db:push:dev`.

Obtener las keys: Dashboard de cada proyecto → Settings → API → `service_role`.

**Nota:** no copia usuarios Auth ni `user_roles`; el login de dev sigue siendo independiente.
