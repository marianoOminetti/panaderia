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

# 3. Push de migraciones
supabase db push
```

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

Para clonar todos los datos de producción a desarrollo:

```bash
SUPABASE_PROD_SERVICE_KEY=xxx SUPABASE_DEV_SERVICE_KEY=yyy npm run copy:prod-to-dev
```

Obtener las keys: Dashboard de cada proyecto → Settings → API → `service_role`.
