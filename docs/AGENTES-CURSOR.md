# Agentes Cursor — producción y mantenimiento

## Resumen rápido

| Momento | Agente | Qué hace |
|---------|--------|----------|
| Decís **mergemos** | **pr-gatekeeper** | Revisa PR a `master`, fixes, checks; **muestra contador janitor N/5**; bloquea prod si `janitorDue` |
| Cada **5 merges** a `master` | **code-janitor** | Limpieza + refactor con **estándares sin choclos**; PR a `develop` |
| Tras cambios de código | **qa-senior** | Bugs (regla automática) |
| Error nuevo en **Sentry** / issue `sentry-triage` | **sentry-triage** | Analiza stack/tags, causa en repo, propone fix o PR a `develop` |

---

## pr-gatekeeper

- Reglas: `mergemos-gatekeeper.mdc`, `pre-merge-prod.mdc`
- Definición: `.cursor/agents/pr-gatekeeper.md`
- **Siempre** al decir «mergemos»; primera acción del agente, sin preguntar.

Incluye paso **0**: leer `.cursor/merge-janitor-state.json` y mostrarte:

- `Merges a master desde último janitor: 3/5`
- `janitorDue: false`

Si ya van **5 merges** (`janitorDue: true`), el gatekeeper **no** autoriza merge a prod hasta que corras el janitor.

---

## code-janitor — reglas que le dimos

Definición completa: `.cursor/agents/code-janitor.md`

### Cuándo corre

- GitHub Actions suma 1 por cada PR **mergeado a `master`**; al llegar a **5** → `janitorDue: true` + issue en GitHub.
- El gatekeeper **bloquea prod** mientras `janitorDue: true`.
- Manual: “janitor”, “limpieza”, “sacar choclos”.

### Estándares (nada de choclos)

| Regla | Límite |
|-------|--------|
| Componente `.jsx` | máx. **250** líneas |
| Hook | máx. **120** líneas |
| `App.jsx` | máx. **150** líneas (solo router/providers) |
| Función | máx. **40** líneas |
| >300 líneas | **choclo crítico** — partir en ese ciclo |

Principios: SRP, DRY, sin lógica de negocio pesada en JSX, sin `App` como god hub, sin `console.log` ni código comentado muerto, hooks Supabase sin duplicar en 5 pantallas, sin deshabilitar ESLint masivo.

### Cómo entrega

1. Diagnóstico con lista de choclos (visible).
2. PR `chore/code-janitor-…` → **`develop`** (staging).
3. qa-senior + build + smoke (venta, insumo, stock).
4. En el mismo PR: `janitorDue: false`, `lastJanitorRunAt` actualizado.

**No** mergea a `master` directo.

---

## Contador (lo que ves en cada mergemos)

Archivo: `.cursor/merge-janitor-state.json`

```json
{
  "mergesSinceLastRun": 0,
  "janitorDue": false,
  "lastJanitorRunAt": null,
  "threshold": 5
}
```

Workflow: `.github/workflows/merge-janitor-counter.yml` (al cerrar PR mergeado a `master`).

Si el bot no puede pushear el JSON (branch protection), actualizá el contador a mano o permití push del `github-actions[bot]` a `master` solo para ese path.

---

## Reglas Cursor

- `mergemos-gatekeeper.mdc` — «mergemos» → gatekeeper primero
- `pre-merge-prod.mdc` — merge a prod
- `merge-janitor-due.mdc` — gatekeeper muestra contador; janitor si `janitorDue`

---

## Flujo

```
feature → develop
develop → master     →  decís "mergemos" → gatekeeper (ve N/5, bloquea si janitorDue)
cada 5 merges master →  janitorDue → code-janitor → PR develop → luego seguís con prod
```

Ver `docs/FLUJO-PR.md`.

---

## sentry-triage

- Definición: `.cursor/agents/sentry-triage.md`
- Regla: `.cursor/rules/sentry-triage.mdc` (link Sentry o “analizá error sentry”)
- Automático: Sentry webhook → Cursor Automation (`.cursor/automation-sentry-triage.prompt.md`) y/o GitHub `sentry-alert.yml` → issue `sentry-triage`
- Setup: `docs/SENTRY.md` sección “Agente automático”

---

## Automations (opcional en Cursor Cloud)

Ver secciones anteriores en este doc o pedir en chat “automation gatekeeper”. El contador y el bloqueo por `janitorDue` viven en el agente aunque no uses Automation.

**Sentry:** prompt listo en `.cursor/automation-sentry-triage.prompt.md`.

---

## Seguridad

No commitear `.afip-local/`, `.env`, certificados ni claves.
