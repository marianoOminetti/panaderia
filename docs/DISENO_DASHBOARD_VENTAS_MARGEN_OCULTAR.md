# Diseño: Dashboard — Ventas Hoy, Margen Hoy y Ocultar datos (estilo MercadoLibre)

**Origen:** pedido del dueño.  
**Análisis:** estilo BA (Panadería SG).  
**Para revisión:** dev-lead.

---

## 1. Lo que se pide (en lenguaje del negocio)

En la pantalla principal (dashboard), hoy se muestra:

- **Ventas hoy:** monto + unidades (y a veces “por cobrar”).
- **Plan de producción semanal:** texto con “Esta semana producís X u, necesitás comprar $Y en insumos”.

El dueño quiere:

1. **Sacar** todo el bloque de “Plan de producción semanal” del dashboard.
2. **Dejar** solo dos métricas del día:
   - **Ventas hoy:** `${ventas}` con un **botón de “ocultar datos”** (como MercadoLibre).
   - **Margen hoy:** `${margen}` con un **botón de “ocultar datos”** (igual que arriba).

La idea del “ocultar datos” es de privacidad: cuando alguien mira la pantalla (cliente, empleado, cámara), poder tapar montos y margen con un toque y volver a mostrarlos con otro toque.

---

## 2. Impacto (resumen)

- **Pantalla:** Solo la del dashboard; no se toca flujo de ventas ni de plan semanal.
- **Tiempo:** Cero fricción extra en el día a día; opcional usar el botón.
- **Plata:** No cambia cálculo de ventas ni de costos; solo se agrega margen del día y se oculta/muestra a voluntad.
- **Experiencia:** Menos ruido (sin plan semanal en el inicio) y más control sobre quién ve los números.
- **Prioridad:** **Media** — mejora de claridad y privacidad, no desbloquea ventas ni cobros.

---

## 3. Comportamiento “ocultar datos” (referencia MercadoLibre)

- Un toque en un control (ícono de ojo / “Ocultar”) **oculta** el valor: en lugar del número se muestra algo neutro (ej. “••••••” o “—”) y el botón pasa a “Mostrar”.
- Otro toque **vuelve a mostrar** el valor real.
- El estado puede ser:
  - **Por métrica:** Ventas hoy y Margen hoy tienen cada una su propio “oculto / visible”.
  - **O global:** Un solo “Ocultar datos del día” que tape ventas + margen a la vez.

Recomendación de diseño: **un solo toggle global** “Ocultar datos” para la tarjeta, que tape ventas y margen juntos. Más simple y coherente con “no mostrar números cuando me miran”.

---

## 4. Definición de “Margen hoy”

- **Margen** = ganancia bruta del día sobre ventas de hoy.
- **Criterio de costo (mismo que Analytics):** costo unitario por receta = `costo_unitario` de la receta si está definido y ≥ 0; si no, el calculado con `costoReceta(recetaId, recetaIngredientes, insumos, recetas) / rinde`. No duplicar esta regla: reutilizar la misma lógica que Analytics (o una función compartida en `lib/costos.js`).
- **Fórmula:**
  - `ingresoHoy` = suma de `total_final` (o `precio_unitario * cantidad`) de todas las ventas del día.
  - `costoHoy` = por cada ítem de venta de hoy: costo unitario de la receta (según criterio anterior) × cantidad; suma total.
  - `gananciaBrutaHoy` = `ingresoHoy - costoHoy`.
  - **Margen hoy** se puede mostrar como:
    - **Opción A (recomendada):** monto en pesos: “Margen hoy: $X” (ganancia bruta).
    - **Opción B:** porcentaje: “Margen hoy: X%” = `gananciaBrutaHoy / ingresoHoy` (si `ingresoHoy > 0`).

Si el dueño no definió aún, proponer **Opción A** en la UI y dejar margen % para Analytics.

---

## 5. Propuesta de diseño para dev-lead

### 5.1 Alcance de componentes

- **Dashboard.jsx:** Sigue calculando `ingresoHoy`, `unidadesHoy`, `debeTotal`. Debe **declarar y usar** la prop `recetaIngredientes` (ya la pasa AppContent). **Agregar** cálculo de `margenHoy` (ganancia bruta y/o %) usando `ventasHoy`, `recetas`, `recetaIngredientes`, `insumos`: reutilizar la misma lógica de costo por línea que Analytics (mapa costo unitario por receta con `costoReceta` + `rinde` y fallback a `costo_unitario`; por cada ítem de ventas de hoy: costo = costo_unitario(receta) × cantidad). **Recomendación:** extraer en `lib/costos.js` una función que devuelva el mapa `recetaId → costoUnitario` (ej. `costoUnitarioPorRecetaMap(recetas, recetaIngredientes, insumos)`) y usarla tanto en Analytics como en Dashboard para no duplicar la regla de negocio.
- **DashboardMetrics.jsx:**
  - **Quitar:** bloque completo “Plan de producción semanal” y prop `resumenPlanSemanal`.
  - **Mantener:** “Ventas hoy” (monto + unidades; “por cobrar” si aplica).
  - **Agregar:** bloque “Margen hoy” con el valor elegido ($ o %).
  - **Agregar:** control “Ocultar datos” (toggle) que afecte la visibilidad de los valores de Ventas hoy y Margen hoy (si se elige toggle global).

### 5.2 Estado “ocultar datos”

- Estado local en el componente que renderiza la tarjeta (ej. `DashboardMetrics`): p. ej. `datosOcultos: boolean`.
- No es necesario persistir en backend; si se quiere recordar entre sesiones, usar `localStorage` con una key tipo `panaderia_dashboard_ocultar_datos` (opcional en v1). **Importante:** si se usa `localStorage`, inicializar el estado en el primer render (p. ej. `useState(() => leerLocalStorage(...))` o un `useEffect` que corra una vez) para evitar un flash de números visibles antes de aplicar la preferencia.

### 5.3 UI sugerida

- Tarjeta superior (la que hoy es “dashboard-metrics”):
  - Título/label: “Ventas hoy” → valor o “••••••” según `datosOcultos`.
  - Debajo: unidades (y “por cobrar” si aplica); también ocultables con el mismo toggle.
  - Segundo bloque: “Margen hoy” → valor o “••••••”.
  - En la esquina de la tarjeta (ej. arriba a la derecha): ícono de ojo / “Ocultar datos” que alterna entre “Ocultar” y “Mostrar” y cambia `datosOcultos`.

### 5.4 Qué no cambiar

- Flujo y pantallas de Ventas, Plan semanal, Analytics.
- Cálculo de ventas (ingreso, total_final, precio_unitario).
- Lógica de plan semanal (solo se deja de **mostrar** en el dashboard; el dato puede seguir existiendo para otra pantalla si se usa).

### 5.5 Limpieza

- Dejar de pasar `resumenPlanSemanal` a `Dashboard` y a `DashboardMetrics`; pueden seguir sin recibir esa prop. El hook `usePlanResumen` puede seguir en App por si otra pantalla usa el plan semanal más adelante; no es obligatorio quitarlo de App/AppContent.

---

## 6. Qué revisar después

- **QA:** Verificar que Ventas hoy y Margen hoy coinciden con un cálculo manual; que al “Ocultar” se ocultan ambos; que al “Mostrar” vuelven los números; que quitar el plan semanal no rompe ninguna otra pantalla.
- **DEV-LEAD:** Revisar este diseño (alcance de componentes, estado del toggle, reutilización de lógica de costos/margen) y proponer ajustes si hace falta.
- **SECURITY:** Bajo impacto; solo ocultación visual en cliente. Si más adelante se persiste la preferencia “ocultar” en backend, revisar que no se expongan datos sensibles por API.

---

## 7. Resumen para dev-lead

| Qué | Acción |
|-----|--------|
| Plan de producción semanal | Quitar del dashboard (bloque y prop en DashboardMetrics). |
| Ventas hoy | Mantener; agregar comportamiento “ocultar” (valor y secundarios). |
| Margen hoy | Agregar (ganancia bruta $ o %); mismo criterio de costo que Analytics. |
| Ocultar datos | Toggle (global para la tarjeta) que alterna entre valor real y “••••••”. |
| Estado | Local en DashboardMetrics (o componente de la tarjeta); opcional localStorage. |

Si dev-lead aprueba este diseño, el siguiente paso es implementar en `Dashboard.jsx` y `DashboardMetrics.jsx` y luego pasar por QA.
