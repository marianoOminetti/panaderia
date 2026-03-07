# Plan de implementación: Nuevo modelo de gastos

**Objetivo:** Extender el modelo de gastos para soportar 3 tipos (fijo, variable, puntual) e integrarlos en Analytics.

**Regla para el agente ejecutor:** Auditoría antes de proponer, etapas incrementales ~30 min, verificar después de cada etapa, no cambiar lógica innecesaria.

---

## FASE 0 — Auditoría (obligatoria antes de implementar)

Ejecutar estos comandos y documentar el resultado:

```bash
# Tamaño de archivos clave
wc -l src/components/gastos/*.jsx src/hooks/useGastos*.js src/lib/gastosFijos.js src/hooks/useAnalyticsData.js 2>/dev/null | sort -rn

# Dependencias de gastos
grep -rn "gastosFijos\|gastos_fijos\|calcularGastosFijosNormalizados" src/ --include="*.js" --include="*.jsx"

# Estructura actual de migraciones
ls -la supabase/migrations/*.sql | tail -5
```

**Checklist de auditoría:**
- [ ] Archivos que usan gastos: `GastosFijos.jsx`, `useGastosFijos.js`, `useGastosFijosForm.js`, `useAnalyticsData.js`, `useAppData.js`, `App.js`, `AppContent.jsx`
- [ ] Tabla actual: `gastos_fijos` con `id, nombre, monto, frecuencia, activo`
- [ ] Función actual: `calcularGastosFijosNormalizados(gastos)` retorna `{ dia, semana }` solo para tipo fijo implícito

---

## Resumen de cambios por tipo de gasto

| Tipo     | Descripción                    | Campos clave              | Cómo impacta en período                    |
|----------|--------------------------------|---------------------------|--------------------------------------------|
| **fijo** | Recurrente (alquiler, sueldos) | frecuencia, monto         | Prorrateado por frecuencia                 |
| **variable** | Historial facturas (luz, gas) | monto, fecha              | Monto completo en el mes/semana de la fecha |
| **puntual**  | Una sola vez (arreglo, multa) | monto, fecha              | Monto completo en el mes/semana de la fecha |

**Regla de negocio:** Todos impactan en ganancia neta. La fecha de egreso = período que impacta (flujo de caja).

---

## ETAPA 1: Migración de base de datos (~15 min)

**Objetivo:** Extender la tabla `gastos_fijos` sin romper datos existentes.

**Archivo a crear:** `supabase/migrations/YYYYMMDDHHMMSS_gastos_tipo_fecha.sql`  
(Ejemplo: `20260306120000_gastos_tipo_fecha.sql` — usar timestamp posterior a la última migración existente)

**Contenido exacto de la migración:**

```sql
-- Extender gastos_fijos para soportar tipo (fijo/variable/puntual) y fecha
-- Los gastos existentes se consideran tipo 'fijo' (comportamiento actual)

-- 1. Agregar columna tipo con default 'fijo' (retrocompatibilidad)
ALTER TABLE gastos_fijos
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'fijo';
ALTER TABLE gastos_fijos
  ADD CONSTRAINT gastos_fijos_tipo_check
  CHECK (tipo IN ('fijo', 'variable', 'puntual'));

-- 2. Agregar columna fecha (nullable, solo para variable y puntual)
ALTER TABLE gastos_fijos
  ADD COLUMN IF NOT EXISTS fecha date;

-- 3. Hacer frecuencia nullable para variable/puntual
-- Primero modificar el CHECK existente para permitir NULL
ALTER TABLE gastos_fijos
  DROP CONSTRAINT IF EXISTS gastos_fijos_frecuencia_check;
ALTER TABLE gastos_fijos
  ADD CONSTRAINT gastos_fijos_frecuencia_check
  CHECK (frecuencia IS NULL OR frecuencia IN ('diario','semanal','mensual'));
ALTER TABLE gastos_fijos
  ALTER COLUMN frecuencia DROP NOT NULL;
```

**Nota:** Si `gastos_fijos_frecuencia_check` no existe (nombre distinto en tu Postgres), buscar con:
```sql
SELECT conname FROM pg_constraint WHERE conrelid = 'gastos_fijos'::regclass AND contype = 'c';
```
y reemplazar en el DROP CONSTRAINT.

**Verificación:**
```bash
# Aplicar migración (local o remoto según tu setup)
npx supabase db push
# O: npx supabase migration up

# Verificar schema
npx supabase db diff  # no debería mostrar cambios pendientes
```

**Rollback:** Crear migración down que revierta las columnas (o restaurar backup). Para desarrollo local, `supabase db reset` si es aceptable.

---

## ETAPA 2: Actualizar lib/gastosFijos.js (~20 min)

**Objetivo:** Nueva función que considere los 3 tipos y retorne valores para semana y mes.

**Archivo a modificar:** `src/lib/gastosFijos.js`

**Lógica exacta:**

1. **Mantener** `calcularGastosFijosNormalizados(gastos)` para retrocompatibilidad, pero que solo procese `tipo === 'fijo'` (o sin tipo, para datos viejos). No cambiar firma.

2. **Crear** `calcularGastosTotales(gastos, fechaRef)`:
   - `fechaRef`: Date, default `new Date()` (hoy).
   - Retorna: `{ dia, semana, mes }`
   - **Fijo:** igual que hoy. Si `!g.tipo || g.tipo === 'fijo'`, prorratear por frecuencia. Sumar a `dia` (para prorrateo mensual) y a `semana` (prorrateo semanal).
   - **Variable y puntual:** filtrar por `g.activo !== false`, `g.tipo === 'variable' || g.tipo === 'puntual'`, y `g.fecha` definida.
     - Para **semana:** sumar `g.monto` si `g.fecha` cae dentro de la semana de `fechaRef` (lunes a domingo, mismo criterio que `startOfWeek`/`endOfWeek` en useAnalyticsData).
     - Para **mes:** sumar `g.monto` si `g.fecha` cae dentro del mes de `fechaRef`.
   - **dia:** solo fijos (igual que hoy).
   - **semana:** fijos prorrateados a semana + suma variable/puntual de la semana.
   - **mes:** fijos prorrateados a mes (dia * días del mes) + suma variable/puntual del mes.

**Código de referencia para helpers de fecha (alineado con useAnalyticsData):**

```javascript
const startOfWeek = (date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};
const endOfWeek = (start) => {
  const d = new Date(start);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
};
const isBetween = (date, from, to) =>
  date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();
```

**Parsear fecha:** Si `g.fecha` es string ISO (YYYY-MM-DD), convertir a Date para comparar.

**Verificación:**
```bash
npm run build
# O: npm start y navegar a Gastos - no debe romper
```

**Rollback:** Revertir cambios en `gastosFijos.js` con git.

---

## ETAPA 3: Integrar nueva función en useAnalyticsData (~15 min)

**Objetivo:** Usar `calcularGastosTotales` en lugar de `calcularGastosFijosNormalizados` para ganancia neta.

**Archivo a modificar:** `src/hooks/useAnalyticsData.js`

**Cambios exactos:**

1. Importar `calcularGastosTotales` (además o en lugar de `calcularGastosFijosNormalizados` para las métricas de gastos).

2. **Semana (líneas ~102-106):**
   - Reemplazar:
     ```javascript
     const { semana: gastosFijosSemana } = calcularGastosFijosNormalizados(gastosFijos);
     ```
   - Por:
     ```javascript
     const { semana: gastosSemana } = calcularGastosTotales(gastosFijos, thisWeekStart);
     ```
   - Usar `gastosSemana` en lugar de `gastosFijosSemana` para `gananciaSemanaNetaActual` y `gananciaSemanaNetaAnterior`.

3. **Mes (líneas ~273-279):**
   - Reemplazar:
     ```javascript
     const { dia: gastosFijosDia } = calcularGastosFijosNormalizados(gastosFijos);
     const gastosFijosMes = (gastosFijosDia || 0) * totalDiasMes;
     ```
   - Por:
     ```javascript
     const { mes: gastosMes } = calcularGastosTotales(gastosFijos, startOfMonth);
     ```
   - Usar `gastosMes` en lugar de `gastosFijosMes` para `gananciaMesNeta`.

**Verificación:**
- Abrir Analytics en el browser.
- Verificar que ganancia neta semana y mes se calculen (con o sin gastos variable/puntual).
- No debe haber errores en consola.

**Rollback:** Revertir cambios en `useAnalyticsData.js`.

---

## ETAPA 4: Actualizar useGastosFijosForm (~20 min)

**Objetivo:** Formulario que permita elegir tipo y mostrar campos condicionales (frecuencia vs fecha).

**Archivo a modificar:** `src/hooks/useGastosFijosForm.js`

**Cambios exactos:**

1. **INITIAL_FORM:** agregar `tipo: "fijo"` y `fecha: ""`.

2. **openEdit:** al cargar gasto, setear `tipo: g.tipo || "fijo"` y `fecha: g.fecha ? String(g.fecha).slice(0, 10) : ""` (formato YYYY-MM-DD para input date).

3. **save:** construir `payload` según tipo:
   - **fijo:** `{ nombre, monto, frecuencia, activo, tipo: "fijo" }` — no enviar `fecha` o enviar `null`.
   - **variable:** `{ nombre, monto, fecha (ISO), activo, tipo: "variable" }` — no enviar `frecuencia` o enviar `null`.
   - **puntual:** `{ nombre, monto, fecha (ISO), activo, tipo: "puntual" }` — igual que variable.

4. **Validación en save:**
   - Si tipo fijo: validar `frecuencia` (diario/semanal/mensual).
   - Si variable o puntual: validar `fecha` (obligatorio, fecha válida).

**Verificación:**
- Crear gasto fijo (debe guardar igual que antes).
- Crear gasto variable con fecha (debe guardar).
- Crear gasto puntual con fecha (debe guardar).
- Editar cada uno y verificar que los datos se carguen bien.

**Rollback:** Revertir cambios en `useGastosFijosForm.js`.

---

## ETAPA 5: Actualizar UI de GastosFijos.jsx (~25 min)

**Objetivo:** Formulario modal con selector de tipo y campos condicionales; lista que muestre tipo y fecha cuando aplique.

**Archivo a modificar:** `src/components/gastos/GastosFijos.jsx`

**Cambios exactos:**

1. **Modal del formulario:**
   - Agregar select "Tipo" antes de Nombre: opciones `Fijo`, `Variable`, `Puntual` (value: fijo, variable, puntual).
   - Si tipo === "fijo": mostrar campo Frecuencia (select diario/semanal/mensual). Ocultar Fecha.
   - Si tipo === "variable" o "puntual": mostrar campo Fecha (input type="date"). Ocultar Frecuencia.
   - Conectar con `formState.form.tipo` y `formState.form.fecha`.

2. **Lista de gastos:**
   - En `insumo-detalle`, mostrar según tipo:
     - Fijo: `{fmt(monto)} · {freqLabel} · {activo}`
     - Variable: `{fmt(monto)} · {fecha formateada} · {activo}`
     - Puntual: `{fmt(monto)} · {fecha formateada} · {activo}`
   - Ordenar: primero por tipo (fijo, variable, puntual), luego por nombre. Variable/puntual por fecha descendente si mismo nombre.

3. **Stats cards (opcional según preferencia):**
   - Mantener "Gasto recurrente diario" y "Gasto recurrente semanal" (solo fijos).
   - Agregar tercera card: "Variable + puntual este mes" usando `calcularGastosTotales(gastos, new Date()).mes` menos la parte fija, o una función auxiliar que sume solo variable/puntual del mes.
   - Alternativa simple: no agregar tercera card en esta etapa; solo mostrar el total integrado en Analytics. Decisión: **agregar card "Gasto variable/puntual este mes"** para dar visibilidad.

**Formatear fecha:** usar `new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })` o similar.

**Verificación:**
- Pantalla Gastos: ver lista con tipos mezclados.
- Agregar/editar cada tipo y confirmar que se guarda y muestra correctamente.
- Stats: ver que diario/semanal siguen siendo fijos y la nueva card muestre variable+puntual del mes.

**Rollback:** Revertir cambios en `GastosFijos.jsx`.

---

## ETAPA 6: Ajuste de useGastosFijos (payload) (~5 min)

**Objetivo:** Asegurar que el hook envíe `tipo` y `fecha` correctamente a Supabase.

**Archivo a modificar:** `src/hooks/useGastosFijos.js`

**Cambios:** Ninguno si `saveGastoFijo` ya recibe el payload completo del form. Verificar que el payload de useGastosFijosForm incluya `tipo` y `fecha` (o null) y que Supabase acepte las nuevas columnas. Si hay error al insertar, revisar que no se envíen strings vacíos para `fecha` — usar `fecha: form.fecha || null` para variable/puntual.

**Verificación:** Crear gasto variable y puntual, revisar en Supabase que las filas tengan `tipo` y `fecha` correctos.

---

## ETAPA 7: GastosFijos usa calcularGastosTotales para stats (~10 min)

**Objetivo:** Las cards de GastosFijos usen la nueva función para mostrar totales correctos.

**Archivo a modificar:** `src/components/gastos/GastosFijos.jsx`

**Cambios:**
- Reemplazar `calcularGastosFijosNormalizados(gastos)` por `calcularGastosTotales(gastos, new Date())`.
- Usar `dia`, `semana`, `mes` del resultado.
- Card 1: "Gasto recurrente diario" = valor prorrateado de fijos (el `dia` ya lo es).
- Card 2: "Gasto recurrente semanal" = puede seguir siendo `semana` si la función retorna fijos+var+punt en semana. Según diseño de Etapa 2: `semana` incluye todo. Para mostrar "solo fijos" en card 2, la función debería retornar también `semanaFijos` o similar. **Decisión:** Para simplificar, las dos primeras cards muestran `dia` y `semana` (que ahora incluyen variable+puntual en su período). La tercera card "Variable + puntual este mes" = `mes - (dia * 30)` aproximadamente, o la función retorna `mesVariablePuntual` explícitamente.

**Revisión de diseño:** La función `calcularGastosTotales` retorna:
- `dia`: solo fijos (para prorrateo)
- `semana`: fijos prorrateados + variable/puntual de la semana
- `mes`: fijos prorrateados al mes + variable/puntual del mes

Para las cards en GastosFijos:
- "Gasto diario" = dia (solo fijos, prorrateado)
- "Gasto semanal" = semana (fijos + var/punt de la semana)
- "Gasto mensual" = mes (fijos + var/punt del mes)

O tres cards: Diario (fijos), Semanal (total), Mensual (total). Eso da buena visibilidad.

**Verificación:** Confirmar que las cards muestren valores coherentes con los datos.

---

## Orden de ejecución

| # | Etapa                         | Duración aprox. |
|---|-------------------------------|------------------|
| 0 | Auditoría                     | 5 min            |
| 1 | Migración DB                  | 15 min           |
| 2 | lib/gastosFijos.js            | 20 min           |
| 3 | useAnalyticsData.js           | 15 min           |
| 4 | useGastosFijosForm.js         | 20 min           |
| 5 | GastosFijos.jsx (UI)          | 25 min           |
| 6 | useGastosFijos (verificación) | 5 min            |
| 7 | GastosFijos stats             | 10 min           |

**Total estimado:** ~2 h.

---

## Deuda técnica (no tocar en este refactor)

- Renombrar tabla `gastos_fijos` a `gastos` en el futuro (requiere migración de datos y actualizar todos los usos).
- Considerar tabla separada `gastos_variable_pagos` si un concepto "Luz" tuviera muchos pagos y se quisiera agrupar por nombre (por ahora cada pago = una fila).
- Dashboard no usa gastos actualmente; si se agrega ganancia neta al Dashboard, usar `calcularGastosTotales`.

---

## Checklist final

- [ ] Migración aplicada sin errores
- [ ] Gastos fijos existentes siguen funcionando (tipo fijo por default)
- [ ] Crear/editar gasto variable con fecha
- [ ] Crear/editar gasto puntual con fecha
- [ ] Analytics: ganancia neta semana incluye variable/puntual de la semana
- [ ] Analytics: ganancia neta mes incluye variable/puntual del mes
- [ ] Stats en GastosFijos muestran valores correctos
- [ ] Sin errores de build ni en consola

---

## Archivos modificados (resumen)

| Archivo                    | Acción   |
|---------------------------|----------|
| supabase/migrations/...   | Crear    |
| src/lib/gastosFijos.js    | Modificar |
| src/hooks/useAnalyticsData.js | Modificar |
| src/hooks/useGastosFijosForm.js | Modificar |
| src/components/gastos/GastosFijos.jsx | Modificar |
| src/hooks/useGastosFijos.js | Verificar (posible ajuste payload) |
