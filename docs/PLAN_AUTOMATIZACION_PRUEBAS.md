# Plan de automatización de pruebas

**Objetivo:** Pasar de verificación solo por código y pruebas manuales a una base de pruebas automatizadas que proteja los flujos críticos y permita refactors con más confianza.

**Contexto:** [AUDITORIA_POST_REFACTOR.md](./AUDITORIA_POST_REFACTOR.md) sección 2 — hoy la funcionalidad se verifica por código y flujo de datos; no hay E2E automatizados y las pruebas manuales quedan a cargo del equipo.

---

## 1. Estado actual

| Elemento | Estado |
|----------|--------|
| **Jest + React Testing Library** | ✅ Instalados (react-scripts + @testing-library/*) |
| **App.test.js** | ❌ Desactualizado: busca "learn react"; la app ya no muestra ese texto |
| **Tests unitarios** | No hay (lib, utils, helpers sin cobertura) |
| **Tests de integración** | No hay (componentes + datos mock) |
| **E2E (Cypress/Playwright)** | No hay; flujos críticos solo manuales |

**Checklist manual actual (auditoría):** login → Dashboard, nueva venta (carrito + cobrar), carga de producción en Stock, editar precio en Insumos, abrir receta (costo/margen), abrir cliente (historial).

---

## 2. Estrategia propuesta

1. **Arreglar lo que ya existe** — Actualizar o reemplazar `App.test.js` para que el build/test sea verde y compruebe algo útil (p. ej. que la app renderiza sin error o que aparece un elemento conocido).
2. **Unit tests primero** — Priorizar `src/lib/` y `src/utils/` (lógica pura, sin UI): costos, métricas, fechas, formatos, agrupadores. Rápido de escribir y alto valor para regresiones.
3. **Integración con mocks** — Tests de componentes críticos (Ventas, Stock, Dashboard, Recetas) con datos mock y Supabase mockeado, para no depender de DB real ni E2E en esta fase.
4. **E2E opcional (fase posterior)** — Si el equipo lo prioriza: añadir Cypress o Playwright y automatizar el checklist manual (login → venta → stock → insumos → receta → cliente). Requiere entorno estable (staging/local con DB conocida).

---

## 3. Fases concretas

### Fase 1 — Base verde y smoke (corto plazo)

- [ ] **1.1** Actualizar `App.test.js`: que renderice `<App />` y espere algo que exista en la app (p. ej. un tab, título o texto de la shell). Eliminar la búsqueda de "learn react".
- [ ] **1.2** Asegurar que `npm test` (o `npm run test`) pase en CI/local.
- [ ] **1.3** (Opcional) Un test mínimo de que la app no lanza en el primer paint (smoke).

**Entregable:** Suite de tests que pasa y que incluye al menos un test de App con sentido.

---

### Fase 2 — Unit tests en lib y utils (prioridad alta)

Archivos candidatos (según auditoría y tamaño):

- `src/lib/costos.js` — `costoReceta`, cálculos de costo/margen.
- `src/lib/metrics.js` — agregaciones y métricas.
- `src/lib/dates.js` — rangos, inicio/fin de semana.
- `src/lib/format.js` — formateo de números/monedas.
- `src/lib/units.js` — conversión de unidades.
- `src/lib/agrupadores.js` — agrupar ventas por día/semana/etc.
- `src/utils/errorReport.js` — si tiene lógica testeable (no solo side effects).

**Convención sugerida:**  
- Tests junto al código: `costos.test.js` en `src/lib/` o carpeta `src/lib/__tests__/`.  
- O carpeta raíz `src/__tests__/lib/` si se prefiere centralizar.

**Entregable:** Cobertura de la lógica de negocio en lib/utils; regresiones en márgenes, fechas y agrupadores detectadas por tests.

---

### Fase 3 — Integración (componentes con mocks)

- [ ] **3.1** Mock de Supabase: crear un helper o módulo que devuelva un cliente mock (o funciones que devuelvan datos fijos) para no tocar DB en tests.
- [ ] **3.2** Tests de integración para flujos críticos:
  - **Dashboard:** con `ventas`, `recetas`, `stock`, `gastosFijos` mock, ver que se renderiza y que no hay error al calcular/agrupar.
  - **Recetas:** lista con costo y margen; modal de detalle con mismo cálculo (datos mock).
  - **Ventas (reducido):** carrito + lógica de total con precios mock (sin insert real).
- [ ] Priorizar componentes que ya cumplen <400 líneas (Recetas, GastosFijos) para no lidiar con componentes gigantes al inicio.

**Entregable:** Tests que validan render y lógica de al menos Dashboard y Recetas (y opcionalmente un subflujo de Ventas) con datos mock.

---

### Fase 4 — E2E (opcional, medio plazo)

- [ ] **4.1** Elegir herramienta: **Playwright** (recomendado para React, multi-browser, buen DX) o **Cypress**.
- [ ] **4.2** Definir entorno: app en modo staging o local + Supabase de desarrollo con datos seed reproducibles.
- [ ] **4.3** Automatizar el checklist manual de la auditoría:
  1. Login (si aplica) / carga de app.
  2. Dashboard visible y con datos.
  3. Nueva venta: agregar al carrito y cobrar (ver que aparece en listado o resumen).
  4. Stock: carga de producción (al menos un flujo feliz).
  5. Insumos: editar precio de un insumo (y opcionalmente ver historial).
  6. Recetas: abrir una receta y ver costo/margen.
  7. Clientes: abrir un cliente y ver historial.
- [ ] **4.4** Integrar E2E en CI (ej. solo en staging o en PRs con label).

**Entregable:** Suite E2E que ejecuta el checklist crítico sin intervención manual; documentado en este mismo doc o en README de tests.

---

## 4. Criterios de éxito

- **Fase 1:** `npm test` pasa; ningún test obsoleto (“learn react”).
- **Fase 2:** Cambios en `costos.js`, `metrics.js`, `agrupadores.js` o `dates.js` están cubiertos por tests que fallen si se rompe la lógica.
- **Fase 3:** Refactors en Dashboard o Recetas tienen tests de integración que detecten roturas de props o de cálculos.
- **Fase 4 (si se hace):** El checklist de la auditoría está automatizado y se ejecuta en CI o en un comando único.

---

## 5. Referencias

- Auditoría: [AUDITORIA_POST_REFACTOR.md](./AUDITORIA_POST_REFACTOR.md) — sección 2 (Funcionalidad) y próximos pasos punto 5 (App.test.js).
- Checklist manual hoy: login → Dashboard, venta (carrito + cobrar), producción Stock, editar precio Insumos, receta (costo/margen), cliente (historial).

---

## 6. Próximo paso inmediato

Implementar **Fase 1** (actualizar `App.test.js` y dejar la suite verde). Luego priorizar **Fase 2** con `src/lib/costos.js` y `src/lib/metrics.js` por impacto en negocio (márgenes y métricas).
