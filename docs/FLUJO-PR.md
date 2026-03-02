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

## Branch protection (opcional)

En GitHub: Settings → Branches → Add rule para `master`:
- Require pull request before merging
- Require status checks (si tenés CI)
- Do not allow bypassing
