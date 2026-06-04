# Flujo de PR y ambientes

## Ramas

| Rama | Ambiente | Deploy |
|------|----------|--------|
| `develop` | Staging | Auto al hacer push |
| `master` | Producción | Solo vía PR aprobado |

## Flujo de trabajo

1. **Desarrollo**: Trabajás en `develop` o en branches desde `develop`:
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/nueva-funcion
   # ... cambios ...
   git add . && git commit -m "feat: nueva función"
   git push -u origin feature/nueva-funcion
   ```

2. **PR a staging**: Abrís PR de `feature/nueva-funcion` → `develop`. Merge cuando esté listo.

3. **PR a producción**: Cuando `develop` está estable:
   - Abrís PR de `develop` → `master`
   - Revisás que todo funcione
   - Merge → se despliega a producción

## Configuración en Vercel/Netlify

- **Producción**: branch `master` → `https://panaderia.vercel.app` (o tu dominio)
- **Preview/Staging**: branch `develop` → `https://develop-panaderia.vercel.app` (o subdominio staging)

En Vercel: Settings → Git → Production Branch = `master`. Las otras ramas generan previews automáticos.

## Branch protection

En GitHub: **Settings** → **Branches** → **Add branch protection rule** para `master`:
- Branch name pattern: `master`
- ✅ Require a pull request before merging
- ✅ Require status checks to pass (opcional, si tenés CI)
- Do not allow bypassing the above settings

Así solo código estable (vía PR desde `develop`) llega a producción.

## Agentes antes de prod

- Abrís PR `develop` → `master` y en el chat decís **«mergemos»** → corre **pr-gatekeeper** (contador janitor **N/5**; si `janitorDue`, primero **code-janitor**).
- No mergear a `master` en la misma respuesta que el primer «mergemos» sin veredicto **Listo para merge**.
- Detalle: `docs/AGENTES-CURSOR.md`.

## AFIP a producción (checklist post-merge)

1. `npm run db:push:prod`
2. `supabase link --project-ref clgxrxlccjjqxzvapfav && supabase functions deploy registrar-en-afip`
3. `AFIP_PRODUCTION=true npm run afip:setup:local` (certificados en `.afip-local/`)
4. Confirmar que **no** quede `AFIP_ALLOW_MOCK=true` en secrets de prod
5. Smoke: cobro con «Registrar en AFIP» en la app de producción

Staging ya usa el proyecto dev `xdiggsdjmmylkvephyod`; ver `docs/AFIP_SETUP.md`.
