# Sentry — errores en producción

La app ya envía errores a Sentry cuando `REACT_APP_SENTRY_DSN` está definido en el **build** (Create React App embebe la variable al compilar).

## Vercel (obligatorio para prod)

1. [Vercel Dashboard](https://vercel.com) → proyecto Panadería → **Settings** → **Environment Variables**
2. Agregar:
   - **Key:** `REACT_APP_SENTRY_DSN`
   - **Value:** DSN del proyecto en [sentry.io](https://sentry.io) (Client Keys)
   - **Environments:** Production (opcional Preview para staging)
3. **Deployments** → último deploy de prod → **Redeploy** (sin esto el bundle viejo no incluye el DSN)

### CLI (alternativa)

```bash
npx vercel login
npx vercel link
printf '%s' 'TU_DSN_AQUI' | npx vercel env add REACT_APP_SENTRY_DSN production
```

Luego redeploy.

## Local

Copiá `.env.production.example` a `.env.production.local` y pegá el DSN (gitignored).

Para **CLI / agente** (`sentry-cli`, triage en Cursor), agregá en el mismo archivo o en `.env.local`:

```bash
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=gluten-free
```

El token **no** va al bundle; solo `REACT_APP_SENTRY_DSN` se embebe en el build.

```bash
npm run build
npx serve -s build
```

Provocá un error y revisá **Issues** en Sentry.

## Qué se reporta

| Origen | Cómo |
|--------|------|
| `reportError()` en hooks/pantallas | `captureException` + `extra` + tag `action` si viene en contexto |
| Promesas rechazadas | `unhandledrejection` → `reportError` |
| Crash de React | `Sentry.ErrorBoundary` en `index.js` |
| Siempre (paralelo) | Buffer local ⚠, `POST /api/log-error` → logs Vercel |

## Proyecto Sentry

- Plataforma: **React**
- `environment` en eventos: `REACT_APP_ENV` si existe, si no `NODE_ENV`
- Performance: `tracesSampleRate` 0.1 solo en `production`

## Agente automático `sentry-triage`

Cuando Sentry detecta un error, el flujo recomendado:

```
Sentry (nuevo issue)
    → Webhook (Cursor Automation y/o GitHub repository_dispatch)
    → Issue GitHub label sentry-triage  (opcional, workflow .github/workflows/sentry-alert.yml)
    → Cursor: agente sentry-triage analiza y propone fix / PR a develop
```

### Opción A — Cursor Automation (más directo)

1. [cursor.com/automations](https://cursor.com/automations) → crear automation con trigger **Webhook**.
2. Copiar el prompt de `docs/SENTRY_CURSOR_AUTOMATION.md`.
3. Activar **Sentry MCP** en el automation (token de org en Sentry → Settings → Auth Tokens).
4. En Sentry → **Alerts** → regla *A new issue is created* → acción **Webhook** → URL del automation de Cursor.

### Opción B — GitHub issue + agente en el repo

1. Crear en GitHub un PAT fine-grained con **Issues: write** y **Contents: read** (solo repo `panaderia`). Guardarlo como secret `SENTRY_DISPATCH_PAT` **no** hace falta en el repo si usás el PAT solo en Sentry webhook header.

2. En Sentry, alert webhook:

   - **URL:** `https://api.github.com/repos/marianoOminetti/panaderia/dispatches`
   - **Method:** POST
   - **Header:** `Authorization: Bearer <PAT>`
   - **Header:** `Accept: application/vnd.github+json`
   - **Body (ejemplo):**

   ```json
   {
     "event_type": "sentry_alert",
     "client_payload": {
       "title": "{{ issue.title }}",
       "web_url": "{{ issue.link }}",
       "message": "{{ error.value }}",
       "culprit": "{{ culprit }}"
     }
   }
   ```

   (Los placeholders exactos dependen de la plantilla de Sentry; ajustá según el editor de alertas.)

3. El workflow `sentry-alert.yml` crea un issue con label `sentry-triage`.

4. En Cursor: abrís el issue o decís **analizá el error de sentry** (regla `.cursor/rules/sentry-triage.mdc`).

### Probar el workflow sin Sentry

```bash
gh workflow run sentry-alert.yml \
  -f title="Error: test sentry prod" \
  -f sentry_url="https://o4510983136542720.ingest.us.sentry.io/issues/..." \
  -f message="Error: test sentry prod"
```

### Token para que el agente lea Sentry (local / CI)

```bash
export SENTRY_AUTH_TOKEN=sntrys_...   # User Auth Token, scope project:read
export SENTRY_ORG=<tu-org-slug>
npx @sentry/cli issues list --project <project-slug>
```

Definición del agente: `.cursor/agents/sentry-triage.md`.

## Seguridad

- No commitear el DSN en archivos trackeados (solo `.env.*.local`).
- El DSN es público en el bundle del navegador; rotar en Sentry si se filtró en un repo público.
- No commitear `SENTRY_AUTH_TOKEN` ni PAT de webhooks.
