# UI Patterns — Panadería SG
Última actualización: 2026-06-16
Versión: 1.2

## Stack visual
- Framework: React
- Estilos: CSS global (App.css), variables en `:root`
- Paleta: púrpura principal (--purple-dark, --purple), texto (--text), fondo (--cream)
- Tipografía: Outfit (títulos), Plus Jakarta Sans (body)
- Iconos/emojis: emojis nativos para productos, texto para UI

## Componentes base
- `AppHeader` (src/components/layout/AppHeader.jsx) — cabecera con título, log errores, salir
- `AppNav` (src/components/layout/AppNav.jsx) — barra inferior de pestañas (bottom nav)
- `AppContent` — contenido por tab (dashboard, ventas, stock, etc.)
- `SyncStatus` (src/components/ui/SyncStatus.jsx) — indicador inline de sync en background
- `Toast` (src/components/ui/Toast.jsx) — confirmación efímera de acciones

---

## Patrón: Feedback de carga y sincronización

Tres niveles según severidad y bloqueo:

| Nivel | Cuándo | Componente / clase | Bloquea UI |
|-------|--------|-------------------|------------|
| **Full load** | Primera carga sin datos cacheados | `.loading` + `.spinner` + texto "Cargando..." | Sí |
| **Background sync** | Datos parciales ya visibles; sync secundario (ej. ventas SWR) | `SyncStatus` (pill con `.spinner-sm`) | No |
| **Acción puntual** | Guardar, eliminar, etc. | `Toast` o deshabilitar botón | No (toast) |

### SyncStatus — reglas
- Pill centrado arriba del tab activo, padding horizontal 16px (alineado con `.content`).
- Fondo `--surface`, borde `--border`, sombra `--shadow`, texto `--text-muted` 12px.
- Spinner reutiliza `.spinner` en variante `.spinner-sm` (14px).
- Entrada con `syncStatusIn` (fade + slide 6px, 0.25s) — misma familia que toast `slideDown`.
- Accesibilidad: `role="status"`, `aria-live="polite"`, `aria-busy="true"`.
- Copy por defecto: **"Sincronizando ventas…"** (ellipsis unicode `…`).
- Prop `message` opcional para otros syncs futuros.

### Offline banner (referencia)
- `.offline-banner` — amarillo, full width, aviso de conectividad (distinto de sync de datos).

---

## Patrón: Scroll to hide (header y nav)

**Comportamiento:** Al hacer scroll en la pantalla principal, el header y la barra inferior se ocultan/muestran según la dirección del scroll para ganar espacio de contenido.

- **Scroll hacia abajo** → la **nav inferior** se oculta (translateY 100%).
- **Scroll hacia arriba** → el **header** se oculta (translateY -100%).
- Cerca del **inicio** de la página (primeros ~24px): el header siempre visible.
- Cerca del **final** de la página (últimos ~24px): la nav siempre visible.

**Implementación:**
- Hook: `useScrollToHide()` en `src/hooks/useScrollToHide.js`. Devuelve `{ headerVisible, navVisible }`.
- App.js usa el hook y pasa `visible={headerVisible}` a `AppHeader` y `visible={navVisible}` a `AppNav`.
- Clases CSS: `.header--hidden` (transform translateY(-100%)), `.nav--hidden` (transform translateY(100%)).
- Transición: 0.25s ease-out en `.header` y `.nav`.

**Alcance:** Aplica al scroll del **viewport principal** (window). No aplica dentro de modales/screens overlay donde el scroll es de `.screen-content`; ahí header y nav suelen quedar fuera de vista.

**Accesibilidad:** Cuando están ocultos se aplica `aria-hidden="true"` para que lectores de pantalla no los anuncien y el foco no quede en elementos no visibles. Siguen en el DOM; al hacer scroll en la dirección opuesta vuelven a mostrarse y a ser accesibles.

---

## Reglas globales
- Toda pantalla de detalle/acción tiene "← Volver" arriba a la izquierda.
- El botón de acción principal está arriba a la derecha cuando corresponde.
- La bottom nav es visible en todas las pantallas raíz; puede ocultarse al hacer scroll hacia abajo (patrón scroll to hide).
- En pantallas de lista: buscador antes de la lista. Estados vacíos con mensaje y acción sugerida.

---

## Botones destructivos / secundarios en card-header
- Acciones destructivas en cabecera de card (ej. "Eliminar", "Dar de baja"): `className="edit-btn"` + `style={{ color: "var(--danger)" }}`.
- Mismo patrón en Gastos (Eliminar) y Cliente detalle (Dar de baja).
- Flujo: confirm con mensaje claro → `{ destructive: true }` → acción → cierre o toast de error.
- El diálogo de confirmación usa el botón "Eliminar" para cualquier acción destructiva; el mensaje debe explicar la acción concreta (ej. "¿Dar de baja este cliente?...").

---

## Patrón: Detalle de cliente
- **Resumen:** card con card-header (título "Resumen" + botón secundario/destructivo a la derecha). Datos en líneas con `fontSize: 13`, `color: var(--text-muted)`.
- **Historial de compras (por transacción):** dentro de un card "Historial de compras", cada compra es un bloque con clase `venta-transaction` (padding, border-bottom entre bloques). Dentro: fecha (texto secundario, 12px), luego ítems con `venta-item venta-item-simple` (emoji + `venta-nombre-simple`: "nombre x cantidad"), y al final `venta-grupo-total` con "Total: $...". Misma jerarquía y clases que en Ventas (venta-card) y listas de ítems: emoji + nombre, total debajo con borde superior punteado.

---

## PATRÓN — Pantalla de venta manual (`VentasManualScreen`)

**Tipo:** pantalla de carrito (overlay `screen-overlay`, bottom nav oculta).

### Estructura vertical (orden fijo)
1. `screen-header` — ← Volver + título ("Nueva venta" / "Editar venta")
2. Card **Carrito** — `VentasCart` + `PromosEnVentaPanel` (solo si hay promos calculadas)
3. Card **Combos** _(en implementación)_ — atajos `combo_precio_fijo` activos; ver sección siguiente
4. Card **Productos** — `ProductSearchInput` + lista `producto-row`
5. Footer fijo — total (lista tachada si hay promo) + "Registrar venta" / "Ir a cobro"

### Card Carrito
- `card-header` + `card-title` "Carrito"
- Ítems con patrón `insumo-item`: emoji, nombre, `QuantityControl`, precio editable, subtotal púrpura
- Estado vacío: "Agregá productos" (texto muted)
- `PromosEnVentaPanel`: panel **reactivo** debajo del carrito, borde superior punteado; checkboxes para activar/desactivar promos **ya detectadas** en el carrito (todos los tipos)

### Card Productos — `producto-row`
- Botón full width: emoji (20px) | nombre (ellipsis) | precio lista | stock (`fmtStock`)
- Tap: `addToCart(receta, 1)` + limpiar búsqueda
- Clase `.producto-row` con hover/active (`scale 0.98`)
- Buscador **siempre antes** de la lista

### Footer fijo
- Total en Outfit 20px `--purple-dark`
- Si hay descuento promo: lista tachada arriba + "Total con promo (−$…)"
- Botón primario full width en columna con secundario "Ir a cobro"

---

## PATRÓN — Selector de combos en venta _(en implementación)_

**Objetivo:** atajo de caja para promos `combo_precio_fijo` — **no** reemplaza `PromosEnVentaPanel`.

### Ubicación aprobada
- Card **Combos** entre Carrito y Productos (encima de Productos, debajo de Carrito).

### Contenido del card
- `card-title`: "Combos"
- Subtítulo opcional 12px muted: "Un toque agrega todos los productos"
- Lista vertical de filas tipo `producto-row` (misma interacción tap/active), una por combo activo.

### Fila de combo (layout 2 líneas)
- **Línea 1:** nombre del combo (bold 14px) | precio combo (`--purple-dark`, bold, ancho fijo, sin truncar)
- **Línea 2:** chips emoji+cantidad (ej. `🥖×4 · 🍕×1`) | precio lista tachado 11px | badge ahorro verde opcional

### Interacción
- **Tap** → agrega al carrito todas las cantidades del `combo_items` (suma a lo existente, no reemplaza).
- Tap repetido → otro combo completo si hay stock.
- Sin stock en algún producto → fila deshabilitada (`data-sin-stock`, mismo patrón que productos).
- Toast breve: "Combo agregado" (opcional).
- **No** checkbox en el selector; el toggle queda en `PromosEnVentaPanel` dentro del carrito.

### Relación con promos
| Zona | Rol |
|------|-----|
| Card Combos | **Entrada rápida** — solo `combo_precio_fijo` activas |
| `PromosEnVentaPanel` | **Revisión** — todas las promos que aplican (nxm, %, combo, etc.) con checkbox |

El cliente puede armar el combo a mano producto por producto; el descuento aparece igual en el panel del carrito.

### Alcance
- Solo flujo **Nueva venta** (no pedido, no editar venta salvo decisión futura).
- Ocultar card si no hay combos activos.

---

## PATRÓN — Gastos (lista)

**Archivo:** `src/components/gastos/GastosFijos.jsx`

### Estructura vertical (orden fijo)
1. `page-title` / `page-subtitle`
2. Card **Resumen** — grid `receta-stats` (Diario · Esta semana · Este mes); tap en semana/mes → Analytics
3. Card **Checklist de cierre** (opcional, persistido en localStorage por semana)
4. `search-bar` — "Buscar gasto..."
5. `cat-tabs` — Todos | Fijo | Variable | Puntual
6. Toolbar — "Facturas de la semana" · toggle orden monto/tipo
7. Card **Lista de gastos** — filas + acordeón históricos
8. FAB `fab fab-receta` — "+ Nuevo gasto" (único CTA de alta)

### Card Resumen
- Una sola card con `receta-stats` (3 columnas), valores `--purple-dark` vía `receta-stat-value`
- Subtítulo `analytics-kpi-sub`: desglose fijos vs extras de la semana
- KPI semanal/mensual clickeable si hay `onAbrirAnalytics`

### Filas de gasto — `insumo-item`
- `insumo-dot` con `TIPO_COLORS`: fijo púrpura, variable ámbar, puntual verde-muted
- Nombre + badge "Vence pronto" si fin vigencia ≤ 30 días
- Detalle: `chip` tipo + frecuencia/fecha (sin monto en detalle)
- `insumo-precio-value` a la derecha
- Tap en fila → modal editar (`role="button"`, `tabIndex={0}`)
- Históricos: clase `gasto-item--historico` (opacity 0.7)

### Agrupación
- Con filtro "Todos" y orden por tipo: secciones con `insights-section-title` + subtotal semanal
- Orden: fijo → variable → puntual

### Históricos
- Acordeón al pie del mismo card (`analytics-drill-accordion-btn`), cerrado por defecto
- Sin botón Eliminar en fila histórica

### Modal editar
- `btn-primary` Guardar · `btn-secondary` Duplicar (solo edición) · `btn-danger` Eliminar → overlay delete existente
- Eliminar **no** usa `confirm()` simple — mantiene modos solo-futuro / histórico

### Estados vacíos
| Caso | Icono | Mensaje |
|------|-------|---------|
| Sin gastos | 💸 | "No configuraste gastos todavía." + hint FAB |
| Filtro vacío | 🔍 | "Sin resultados" |

---

## Deuda visual
- `UI_PATTERNS.md` v1.1 no documentaba venta manual ni carrito; corregido en v1.2.
- Selector de combos: pendiente de implementación (patrón definido arriba).
