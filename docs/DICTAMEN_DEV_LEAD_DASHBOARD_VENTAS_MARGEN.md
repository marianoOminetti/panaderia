# Dictamen dev-lead: Diseño Dashboard Ventas / Margen / Ocultar datos

**Documento revisado:** `docs/DISENO_DASHBOARD_VENTAS_MARGEN_OCULTAR.md`  
**Revisión:** coherencia con arquitectura existente, reutilización de lógica de costos/margen.

---

## Veredicto: **OK con ajustes menores**

El diseño es coherente con la arquitectura actual. Abajo se detallan los puntos revisados y los cambios sugeridos para el doc.

---

## 1. Componentes (Dashboard.jsx, DashboardMetrics.jsx)

- **Dashboard.jsx:** Hoy ya recibe `insumos`, `recetas`, `ventas`; **no** declara en props `recetaIngredientes` ni `gastosFijos`, pero **AppContent ya se los pasa** (líneas 67 y 72). Para el margen del día solo hace falta usar `recetaIngredientes` (y opcionalmente seguir recibiendo `gastosFijos` si más adelante se muestra margen neto).  
  **Sugerencia para el doc (sección 5.1):** Indicar explícitamente que Dashboard debe **declarar y usar** `recetaIngredientes` en sus props (ya viene de AppContent). No hace falta cambiar App ni AppContent para pasar datos nuevos.

- **DashboardMetrics.jsx:** Quitar el bloque “Plan de producción semanal” y la prop `resumenPlanSemanal`, y agregar “Margen hoy” + toggle “Ocultar datos” está alineado con el resto del diseño. Nada que objetar.

---

## 2. Estado del toggle “ocultar datos”

- Estado local en el componente de la tarjeta (p. ej. `datosOcultos` en `DashboardMetrics`) es coherente con el stack actual (sin Redux, estado local donde alcanza).
- Opcional `localStorage` con key `panaderia_dashboard_ocultar_datos` es razonable para v1.  
  **Sugerencia para el doc (sección 5.2):** Dejar como está; solo aclarar que si se usa `localStorage`, leer el valor inicial en el primer render (por ejemplo `useState(() => ...)` o `useEffect` una vez) para evitar flash de datos visibles antes de aplicar la preferencia.

---

## 3. Cálculo de “Margen hoy” y reutilización de lógica

- En el codebase **ya existe** la lógica a reutilizar:
  - **`src/lib/costos.js`:** `costoReceta(recetaId, recetaIngredientes, insumos, recetas)` para costo por lote.
  - **`src/components/analytics/Analytics.jsx`:** Construye un mapa `costoUnitarioPorReceta` (costo por unidad por receta) usando `costoReceta`, `rinde` y fallback a `r.costo_unitario`; luego por cada venta usa `getCostoLinea(v) = costoUnitarioPorReceta[v.receta_id] * cantidad` (líneas 52–76). El margen del período es `ingreso - costo` (ganancia bruta).

- **Recomendación:** No duplicar ese criterio en Dashboard. Tener una única fuente de verdad para “costo unitario por receta” usado tanto en Analytics como en Dashboard.

**Sugerencias para el doc:**

- **Sección 4 (Definición de “Margen hoy”):** Dejar la fórmula como está; añadir una frase: “Usar el mismo criterio que en Analytics: costo unitario = `costo_unitario` de la receta si está definido, si no el calculado con `costoReceta(…) / rinde`.”

- **Sección 5.1:** En el párrafo de Dashboard, añadir:
  - “Reutilizar la lógica de costo por línea de venta que ya usa Analytics: mapa de costo unitario por receta (con `costoReceta` + `rinde` y fallback a `costo_unitario`) y por cada ítem de ventas de hoy: costo = costo_unitario(receta) × cantidad.”
  - Opción de implementación: “Extraer en `lib/costos.js` una función que devuelva el mapa `recetaId → costoUnitario` (por ejemplo `costoUnitarioPorRecetaMap(recetas, recetaIngredientes, insumos)`), y usarla tanto en Analytics como en Dashboard para calcular costo del día. Así se evita duplicar la regla de negocio.”

---

## 4. Plan semanal y limpieza de props

- **usePlanResumen** se usa solo en `App.js` y el resultado se pasa a `AppContent` → **Dashboard** → **DashboardMetrics**. No hay otras vistas que consuman `resumenPlanSemanal` en el código actual.
- **Sugerencia para el doc (sección 5.5):** Mantener como está; al implementar, se puede dejar de pasar `resumenPlanSemanal` solo a Dashboard (y a DashboardMetrics). Opcional: dejar de pasarlo también desde AppContent/App si no se usa en ninguna otra ruta; si el plan semanal se muestra en otra pantalla en el futuro, ese flujo puede volver a inyectar el hook donde corresponda.

---

## 5. Resumen de cambios sugeridos al documento

| Sección | Ajuste |
|--------|--------|
| **4** | Añadir que el criterio de costo sea explícitamente el mismo que Analytics: `costo_unitario` si existe, si no `costoReceta(…) / rinde`. |
| **5.1** | Indicar que Dashboard debe declarar y usar la prop `recetaIngredientes` (ya recibida desde AppContent). Recomendar extraer en `lib/costos.js` una función que devuelva el mapa costo unitario por receta y usarla en Analytics y Dashboard. |
| **5.2** | Opcional: aclarar que si se usa `localStorage`, inicializar el estado de “oculto” en el primer render para evitar flash de números antes de aplicar la preferencia. |
| **5.5** | Dejar explícito que `resumenPlanSemanal` puede dejar de pasarse a Dashboard/DashboardMetrics; el hook puede seguir en App si otra pantalla lo usa más adelante. |

---

## 6. Conclusión

- El diseño es **aprobable**: alcance de componentes, estado del toggle y definición de margen son coherentes con la arquitectura.
- Ajustes recomendados: **reutilizar** la lógica de costo por receta (idealmente vía una función en `lib/costos.js` compartida con Analytics), declarar `recetaIngredientes` en Dashboard y documentar la inicialización del toggle si se usa `localStorage`. Con esas precisiones en el doc, se puede implementar y luego pasar por QA como indica la sección 6 del diseño.
