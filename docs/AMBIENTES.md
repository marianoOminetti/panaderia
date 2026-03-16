# Ambientes

Gluten Free usa tres ambientes: **development**, **staging** y **production**.

| Rama Git | Ambiente | Deploy |
|----------|----------|--------|
| `develop` | Staging | Vercel/Netlify preview |
| `master` | Producción | Vercel/Netlify production |

## Archivos de configuración

| Archivo | Propósito | Git |
|---------|-----------|-----|
| `.env.development.example` | Plantilla dev | ✅ |
| `.env.staging.example` | Plantilla staging | ✅ |
| `.env.production.example` | Plantilla prod | ✅ |
| `.env.development.local` | Valores reales dev | ❌ |
| `.env.staging` | Valores reales staging | ❌ |
| `.env.production.local` | Valores reales prod | ❌ |

## Setup inicial

```bash
# Desarrollo
cp .env.development.example .env.development.local
# Editá .env.development.local con tu Supabase de dev

# Staging (opcional)
cp .env.staging.example .env.staging
# Editá .env.staging con tu Supabase de staging

# Producción
cp .env.production.example .env.production.local
# Editá .env.production.local con tu Supabase de prod
```

## Comandos

| Comando | Ambiente | Output |
|---------|----------|--------|
| `npm start` | development | Dev server |
| `npm run build` | production | `build/` |
| `npm run build:staging` | staging | `build/` |

## Scripts (import-recetas, seed-dia-ejemplo)

Los scripts Node usan `SUPABASE_URL` y `SUPABASE_KEY` (o el fallback hardcodeado).

Para usar un ambiente específico:

```bash
# Con variables inline
SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=xxx node scripts/import-recetas.js --upsert

# O cargá desde .env (si usás dotenv)
```

## Badge en la app

El header muestra:
- **DEV** en desarrollo
- **STAGING** en staging
- **BETA** en producción
