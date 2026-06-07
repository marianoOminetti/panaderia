# UI Patterns — Panadería SG
Última actualización: 2026-06-06
Versión: 1.1

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

## Deuda visual
_(Ninguna registrada.)_
