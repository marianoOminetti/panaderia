# Plan de refactor por fases (Dev Lead)

**Proyecto:** Panadería  
**Referencia:** [REPORTE_TECNICO_MEJORAS.md](./REPORTE_TECNICO_MEJORAS.md) + [.cursor/agents/dev-lead.md](../.cursor/agents/dev-lead.md)

---

## Reglas que rigen este plan

1. **Solo mover código** — no cambiar lógica de negocio, no cambiar UI, no agregar features.
2. **Etapas de máximo 30 minutos** — cada una con objetivo único y verificable.
3. **Verificar después de cada etapa** — compilación y humo en browser; si falla, rollback y reportar.
4. **Regla de parada:** Si en alguna etapa hace falta **cambiar lógica** (no solo cortar/pegar), **DETENERSE** y anotar en "DEUDA TÉCNICA DETECTADA" para no tocar ahora.

---

## Bloque A — Preparación (bajo riesgo)

### ETAPA 1: Smoke test en App.test.js

**Objetivo:** Que el test existente refleje la app y pase (o que falle por algo controlado, no por "learn react").

**Archivos a crear:** ninguno.

**Archivos a modificar:** `src/App.test.js`

**Lógica a mover:** Ninguna. Reemplazar el test actual por un smoke test que:
- Haga mock de `./hooks/useAuth` (session: null, authLoading: false) y de `./lib/supabaseClient` (SUPABASE_CONFIG_OK: true) para no tocar Supabase ni auth real.
- Renderice `<App />` y compruebe que no lanza (p. ej. que existe un elemento con rol o texto que exista en la app, como "Inicio" del nav o el botón de login).
- No cambiar ningún otro archivo ni lógica de App.

**Verificar:**
```bash
npm test -- --watchAll=false
```
Abrir app en browser y comprobar que inicia igual que antes.

**Rollback:** `git checkout src/App.test.js`

---

### ETAPA 2: Documentar límites de datos en useAppData

**Objetivo:** Dejar documentados los límites de queries para mantenimiento futuro.

**Archivos a crear:** ninguno.

**Archivos a modificar:** `src/hooks/useAppData.js` (solo comentarios en la cabecera de `loadData`) o `src/config/appConfig.js` (objeto opcional `DATA_LIMITS` con comentario).

**Lógica a mover:** Ninguna. Agregar un comentario tipo:
```js
// Límites de carga: ventas 1000, pedidos 1000, insumo_movimientos 100, precio_historial 5000.
```
junto a las constantes o a la función loadData. No extraer números a variables si eso obliga a tocar la lógica de las queries.

**Verificar:**
```bash
npm run build
```

**Rollback:** Quitar el comentario agregado.

---

### ETAPA 3: Estandarizar log de errores Supabase (hooks 1/2)

**Objetivo:** Donde ya exista `if (error) throw error`, agregar antes `console.error('[dominio/accion]', error)` si no está. Solo hooks que ya hacen throw; no cambiar flujo.

**Archivos a modificar:** `src/hooks/useVentas.js`, `src/hooks/useClientes.js`, `src/hooks/useRecetas.js`, `src/hooks/usePlanSemanal.js`, `src/hooks/useGastosFijos.js`

**Lógica a mover:** Ninguna. En cada `if (error)` que termina en `throw error`, agregar una línea `console.error('[ventas/insertVentas]', error)` (o el tag que corresponda) inmediatamente antes del `throw`. No cambiar condiciones ni mensajes al usuario.

**Verificar:**
```bash
npm run build
```
Abrir Ventas, Clientes, Recetas, Plan semanal, Gastos y hacer una acción mínima en cada uno (sin exigir que falle la red).

**Rollback:** Quitar las líneas `console.error` agregadas.

---

### ETAPA 4: Estandarizar log de errores Supabase (hooks 2/2)

**Objetivo:** Mismo patrón que Etapa 3 en el resto de hooks que llaman a Supabase.

**Archivos a modificar:** `src/hooks/useInsumos.js`, `src/hooks/useAppData.js` (loadData y seed), `src/hooks/useSyncVentasPendientes.js`, `src/hooks/usePushSubscription.js`, `src/hooks/useAuth.js`, `src/lib/pushNotifications.js`

**Lógica a mover:** Ninguna. Agregar `console.error('[modulo/accion]', error)` antes de cada `throw error` o antes de usar `reportError` donde aplique, sin cambiar el flujo.

**Verificar:**
```bash
npm run build
```
Humo rápido: Insumos, abrir app con login, Más (si hay ítem que use push).

**Rollback:** Quitar las líneas `console.error` agregadas.

---

## Bloque B — Insumos.jsx (reducir god object)

**Regla de parada:** Si al extraer estado/handlers aparece comportamiento distinto o hay que reescribir lógica, DETENERSE y reportar. Solo cortar/pegar y reemplazar por llamadas al hook.

### ETAPA 5: Extraer hook useInsumosCompra

**Objetivo:** Mover de Insumos.jsx a un hook todo el estado y handlers del flujo “compra” (carrito, guardado, voz, modales de precio/resultado). Insumos.jsx usa el hook y delega; la UI de compra sigue en Insumos.jsx o en InsumosCompra según esté hoy.

**Archivos a crear:** `src/hooks/useInsumosCompra.js`

**Archivos a modificar:** `src/components/insumos/Insumos.jsx`

**Lógica a mover (solo mover, no reescribir):**
- Estado: compraScreenOpen, compraCart, compraSaving, compraListening, compraTranscript, precioDecisionModal, compraResultado; refs compraRecRef, compraTranscriptRef.
- Handlers: agregarAlCarritoCompra, quitarDelCarritoCompra, guardarCompra, los que abren/cierran modales de precio y resultado, y los que manejan voz en compra (start/stop listening, transcript).
- El hook recibe por parámetro lo que necesite del padre (insumos, showToast, onRefresh, registrarMovimientoInsumo, etc.) y devuelve estado + handlers. Insumos.jsx deja de declarar ese estado y llama al hook, pasando las props necesarias a InsumosCompra o al JSX de compra.

**Verificar:**
```bash
npm run build
```
Browser: Más → Insumos → ir a la vista/pestaña de Compra → agregar ítem al carrito → guardar compra. Comprobar que el flujo es idéntico (mismo toast, mismos modales, mismo resultado).

**Rollback:** Borrar `src/hooks/useInsumosCompra.js` y restaurar en Insumos.jsx el estado y handlers movidos (git checkout de Insumos.jsx si hace falta).

---

### ETAPA 6: Extraer hook useInsumosLista (filtros, modal ABM, movimientos)

**Objetivo:** Reducir más Insumos.jsx moviendo estado y lógica de “lista principal” a un hook.

**Archivos a crear:** `src/hooks/useInsumosLista.js`

**Archivos a modificar:** `src/components/insumos/Insumos.jsx`

**Lógica a mover (solo mover):**
- Estado: search, catActiva, modal, editando, form (objeto del formulario), saving, movModal, movInsumo, movTipo, movCantidad, movValor, movSaving, detalleInsumo, compInsumoSel, compFactor, compSaving (los que correspondan a lista/ABM/movimientos/detalle/composición en lista).
- Handlers: openNew, openEdit, openMov, los que cierran/abren modales de movimiento y detalle, los que actualizan form y guardan (saveInsumo, handleMovSubmit, etc.), filtrados/filtradosOrdenados si son derivados solo de este estado.
- El hook recibe insumos, insumoStock, y callbacks que ya existen (updateInsumo, insertInsumo, showToast, confirm, etc.) y devuelve estado + handlers. Insumos.jsx solo orquesta y renderiza usando el hook.

**Verificar:**
```bash
npm run build
```
Browser: Más → Insumos → lista: filtrar por categoría, buscar, abrir edición de un insumo, guardar; abrir ingreso/egreso si existe. Todo debe comportarse igual.

**Rollback:** Borrar `src/hooks/useInsumosLista.js` y restaurar en Insumos.jsx el código movido.

---

### ETAPA 7: Revisar Insumos.jsx y dejar solo orquestación

**Objetivo:** Tras etapas 5 y 6, Insumos.jsx debe tener claramente solo: imports, llamadas a useInsumos, useInsumosCompra, useInsumosLista, y el JSX que compone vistas (lista, compra, composición). Si quedó estado suelto que sea obviamente de “composición” (compInsumoSel, compFactor, etc.) y no está en ningún hook, en esta etapa se puede mover a un tercer hook `useInsumosComposicion` **solo si es movimiento literal**; si no, dejarlo y anotar como deuda.

**Archivos a crear:** Opcionalmente `src/hooks/useInsumosComposicion.js` si el bloque de composición es grande y separable sin cambiar lógica.

**Archivos a modificar:** `src/components/insumos/Insumos.jsx`

**Lógica a mover:** Solo lo que quede claramente duplicado o que por error quedó en Insumos y corresponde a composición. No reescribir.

**Verificar:**
```bash
npm run build
wc -l src/components/insumos/Insumos.jsx
```
Objetivo: Insumos.jsx < 500 líneas. Browser: recorrer Insumos (lista, compra, composición) y confirmar que todo funciona igual.

**Rollback:** Revertir cambios de esta etapa; si se creó useInsumosComposicion, borrarlo y volver el estado a Insumos.jsx.

---

## Bloque C — ClienteDetalle.jsx

### ETAPA 8: Extraer subcomponente ClienteDetallePedidos

**Objetivo:** Sacar del archivo ClienteDetalle.jsx la sección de pedidos a un componente hijo que reciba cliente, pedidos y callbacks por props. Solo mover JSX y, si aplica, el estado local que sea exclusivo de esa sección.

**Archivos a crear:** `src/components/clientes/ClienteDetallePedidos.jsx`

**Archivos a modificar:** `src/components/clientes/ClienteDetalle.jsx`

**Lógica a mover:** El bloque de JSX (y estado local si lo hay) que renderiza la lista de pedidos del cliente. ClienteDetalle importa ClienteDetallePedidos y le pasa las props que hoy usa esa sección (cliente, pedidos, onGuardarPedido, onEntregar, etc.). No cambiar la lógica de guardado/entrega.

**Verificar:**
```bash
npm run build
```
Browser: Clientes → elegir un cliente → comprobar que la sección de pedidos se ve y funciona igual (agregar/entregar si aplica).

**Rollback:** Borrar ClienteDetallePedidos.jsx y restaurar el bloque en ClienteDetalle.jsx.

---

### ETAPA 9: Extraer subcomponente ClienteDetalleVentas

**Objetivo:** Igual que Etapa 8 pero para la sección de ventas del cliente.

**Archivos a crear:** `src/components/clientes/ClienteDetalleVentas.jsx`

**Archivos a modificar:** `src/components/clientes/ClienteDetalle.jsx`

**Lógica a mover:** El bloque de JSX (y estado local) de la sección “ventas” del detalle. ClienteDetalle lo reemplaza por `<ClienteDetalleVentas ... />` con las props necesarias.

**Verificar:**
```bash
npm run build
```
Browser: Clientes → un cliente → comprobar sección ventas igual que antes.

**Rollback:** Borrar ClienteDetalleVentas.jsx y restaurar el bloque en ClienteDetalle.jsx.

---

### ETAPA 10: Reducir ClienteDetalle a orquestación

**Objetivo:** Tras 8 y 9, ClienteDetalle.jsx debe contener solo header/info del cliente, los dos subcomponentes (Pedidos y Ventas) y el estado/callbacks que siguen siendo del contenedor. Si hay más bloques grandes (ej. formulario de edición), extraer solo si es movimiento literal en una etapa adicional.

**Archivos a modificar:** `src/components/clientes/ClienteDetalle.jsx`

**Verificar:**
```bash
npm run build
wc -l src/components/clientes/ClienteDetalle.jsx
```
Objetivo: ClienteDetalle.jsx < 400 líneas. Browser: flujo completo en Clientes → detalle.

**Rollback:** Revertir cambios de esta etapa.

---

## Bloque D — DashboardAlerts.jsx

### ETAPA 11: Extraer lógica de alertas a useDashboardAlerts

**Objetivo:** Mover el cálculo de las alertas (qué mostrar, con qué datos) a un hook; el componente solo recibe datos y los muestra. Solo mover código, misma lógica.

**Archivos a crear:** `src/hooks/useDashboardAlerts.js`

**Archivos a modificar:** `src/components/dashboard/DashboardAlerts.jsx`

**Lógica a mover:** Toda la lógica que a partir de insumos, recetas, stock, ventas, etc. calcula el array (o estructura) de alertas. Esa lógica va al hook; el hook recibe los mismos datos que hoy recibe el componente y devuelve `{ alerts }` (o la estructura actual). DashboardAlerts.jsx queda como componente presentacional: recibe datos + alerts y renderiza. No cambiar fórmulas ni textos.

**Verificar:**
```bash
npm run build
```
Browser: Inicio (dashboard) → comprobar que las mismas alertas aparecen en el mismo orden y con los mismos estilos/acciones.

**Rollback:** Borrar useDashboardAlerts.js y restaurar la lógica dentro de DashboardAlerts.jsx.

---

## Bloque E — Ventas.jsx, Recetas.jsx, otros (opcional / después)

Cada uno sigue el mismo patrón: una etapa = un solo objetivo (un hook o un subcomponente), solo mover código, verificar y rollback definido. No detallamos aquí para no alargar; al abordar Ventas o Recetas se puede copiar el formato de las etapas 5–7 (hooks por flujo) o 8–9 (subcomponentes por sección).

**Ejemplo de próxima etapa (Ventas):** Crear `useVentasManual` o mover estado/handlers del flujo “venta manual” a un hook y que Ventas.jsx los use. Verificar en Ventas → venta manual. Rollback: borrar hook y restaurar en Ventas.jsx.

---

## FASE 4 — Plantilla de reporte de estado

Al terminar cada bloque (o al interrumpirse), rellenar y guardar en `docs/ESTADO_REFACTOR.md` o al final de este documento:

```markdown
ESTADO DEL REFACTOR
===================
✅ Completado: [lista de etapas hechas, ej. Etapa 1, 2, 3]
⏸️  En progreso: [etapa actual y punto exacto, ej. Etapa 5, creado useInsumosCompra, falta conectar en Insumos.jsx]
⏳ Pendiente: [etapas que faltan]

DEUDA TÉCNICA DETECTADA (no tocar ahora):
- [ej. En Etapa 6 había que cambiar la forma de filtrar; se dejó como estaba y se anotó]
- [ej. useInsumosComposicion requiere reescribir cómo se calcula factor; pospuesto]

ARCHIVOS MODIFICADOS:
- [lista de archivos tocados en las etapas hechas]

PARA CONTINUAR: [instrucción exacta, ej. "Ejecutar Etapa 5: en Insumos.jsx reemplazar el bloque de estado compraCart... por const { ... } = useInsumosCompra(...)"]
```

---

## Orden sugerido de ejecución

1. **Bloque A completo** (Etapas 1–4): tests, documentación y logs. Bajo riesgo.
2. **Bloque B** (Etapas 5–7): Insumos.jsx. El god object más grande.
3. **Bloque C** (Etapas 8–10): ClienteDetalle.jsx.
4. **Bloque D** (Etapa 11): DashboardAlerts.
5. **Bloque E** (opcional): Ventas, Recetas, etc., con el mismo formato de etapas.

Nunca ejecutar más de una etapa sin confirmar que la anterior compila y que la app se comporta igual en los flujos verificados.
