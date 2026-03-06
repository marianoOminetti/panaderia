# Plan de comentarios — Contexto de toda la app para agentes

**Objetivo:** Que los agentes (y quien lea el código) tengan contexto claro de toda la aplicación: qué es, cómo está organizada, dónde está cada cosa y qué hace cada módulo.

**Referencia:** [CONVENCION_COMENTARIOS.md](./CONVENCION_COMENTARIOS.md) — formato y qué comentar en archivos.

---

## 1. Punto de entrada para agentes (hecho)

- **Documento:** [CONTEXTO_APP_PARA_AGENTES.md](./CONTEXTO_APP_PARA_AGENTES.md)
- **Contenido:** Descripción de la app, stack, estructura de carpetas, flujo de datos (App → AppContent → pantallas), índice de documentación y resumen por dominio.
- **Uso:** Los agentes pueden leer primero este doc para orientarse; desde ahí enlaza a CON_QUE_SEGUIR, RESUMEN_BLOQUE_*, APP_PROPS_Y_CONTEXT, etc.

---

## 2. Comentarios en código (prioridad)

Aplicar la [CONVENCION_COMENTARIOS](./CONVENCION_COMENTARIOS.md) en este orden, para que el contexto se construya de arriba hacia abajo.

### Fase A — Raíz y orquestador

| Archivo | Comentario |
|---------|------------|
| `src/App.js` | Cabecera: qué hace App (auth, datos globales, navegación, toasts/confirm, deep links); que el estado se pasa por props a AppContent; enlace a APP_PROPS_Y_CONTEXT.md. Opcional: `// --- Auth ---`, `// --- Datos (useAppData) ---`, `// --- Navegación / deep links ---`, `// --- UI global (toast, confirm) ---`. |
| `src/components/AppContent.jsx` | Cabecera: orquestador por `tab`; lista de pantallas y qué recibe cada una (o "ver props"; enlace a CONTEXTO_APP_PARA_AGENTES o APP_PROPS_Y_CONTEXT). Opcional: `// --- Dashboard ---`, `// --- Ventas ---`, etc. por cada `tab === "..."`. |

### Fase B — Config y lib

| Archivo / carpeta | Comentario |
|-------------------|------------|
| `src/config/nav.js` | Cabecera: pestañas principales (NAV_TABS) y ítems del menú "Más" (MORE_MENU_ITEMS); usado por AppNav y App para rutas. |
| `src/config/appConfig.js` | Cabecera: qué configura (env, URLs, feature flags si hay). |
| `src/lib/*.js` | Por archivo: cabecera con **qué hace** (una frase), **quién lo usa** y, si aplica, **contrato** (entradas/salidas principales). Ej.: agrupadores, costos, format, dates, supabaseClient, etc. |

### Fase C — Hooks

- **Regla:** Todo hook con cabecera JSDoc: qué hace, quién lo usa, `@param` y `@returns` (o descripción breve del objeto devuelto).
- **Prioridad:** Los que alimentan App o varias pantallas primero: `useAppData`, `useAuth`, `useStockMutations`, `useVentas`; luego por dominio: `useVentasCart`, `useVentasChargeModal`, `useInsumosCompra`, `useDashboardAlerts`, `useAnalyticsData`, `usePlanSemanalScreen`, `useStockMutations`, etc.
- Ver lista en [ARCHIVOS_POR_BLOQUE_REFACTOR.md](./ARCHIVOS_POR_BLOQUE_REFACTOR.md) y hooks en `src/hooks/`.

### Fase D — Componentes por dominio

Por cada carpeta bajo `src/components/` (dashboard, ventas, insumos, stock, plan, clientes, analytics, recetas, gastos, auth, layout, ui, menu):

- **Pantalla contenedora** (ej. Ventas.jsx, Insumos.jsx): cabecera indicando que orquesta hooks y subcomponentes; lista breve de hijos (VentasList, VentasCart, VentasManualScreen, modales) y qué flujos cubre (nueva venta, cobro, edición, etc.).
- **Componentes hijos y modales:** cabecera con propósito y props principales (o "recibe estado/handlers del padre").
- **Archivos largos (>200 líneas):** además de cabecera, secciones con `// --- Nombre de sección ---` para que un agente sepa dónde está cada flujo.

Orden sugerido por impacto/uso: ventas → insumos → stock → dashboard → analytics → plan → clientes → recetas → gastos → layout → ui → auth → menu.

---

## 3. Qué no hace falta

- Comentar cada línea o cada `useState`.
- Documentación exhaustiva de APIs internas; basta propósito y contrato en cabecera.
- Duplicar en comentarios lo que ya está en RESUMEN_BLOQUE_*; el comentario en código puede ser breve y remitir al doc si existe.

---

## 4. Cómo ejecutar el plan

1. **Ya hecho:** CONTEXTO_APP_PARA_AGENTES.md como entrada única.
2. **Incremental:** Al tocar un archivo (refactor, feature, fix), aplicar la convención en ese archivo (cabecera y, si aplica, secciones).
3. **Dedicado (opcional):** Recorrer Fase A → B → C → D por bloques (ej. un bloque = una carpeta o un dominio) y cerrar cada bloque con "comentarios aplicados".
4. **Regla para agentes:** Si un archivo no tiene cabecera y se va a modificar, agregar al menos la cabecera según CONVENCION_COMENTARIOS.

---

## 5. Índice de docs relacionados

| Doc | Uso |
|-----|-----|
| [CONTEXTO_APP_PARA_AGENTES.md](./CONTEXTO_APP_PARA_AGENTES.md) | **Entrada:** mapa de la app y contexto para agentes. |
| [CONVENCION_COMENTARIOS.md](./CONVENCION_COMENTARIOS.md) | Formato y qué comentar en cada tipo de archivo. |
| [APP_PROPS_Y_CONTEXT.md](./APP_PROPS_Y_CONTEXT.md) | Qué pasa App → AppContent; posible evolución a Context. |
| [CON_QUE_SEGUIR.md](./CON_QUE_SEGUIR.md) | Próximos pasos de refactor / mejoras. |
| [ESTADO_REFACTOR_DEV_LEAD.md](./ESTADO_REFACTOR_DEV_LEAD.md) | Estado del refactor por fases. |
| [ARCHIVOS_POR_BLOQUE_REFACTOR.md](./ARCHIVOS_POR_BLOQUE_REFACTOR.md) | Archivos por dominio y candidatos a refactor. |
| RESUMEN_BLOQUE_*.md | Detalle por bloque (Ventas, Insumos, Dashboard, etc.). |
