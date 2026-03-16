# Cálculo: ganancia semanal vs mensual (8 de marzo)

## Tus números

- **Vista mes:** Ingreso proyectado 3.445.000, Ganancia proyectada 960.000 (a 8 de marzo).
- **Vista semana:** 890.000 ingresos, 55.200 ganancia (solo esa semana).

## Fórmulas en el código

### Semana (lun–dom)
- **Rango:** Lunes 2 mar – Domingo 8 mar = **7 días**.
- `gananciaSemana = (ingresoSemana - costoSemana) - gastosSemana`
- `gastosSemana` = fijos prorrateados a 1 semana + variables/puntuales con fecha en esa semana.

### Mes (acumulado + proyección)
- **Rango:** 1 mar – 31 mar; a día 8 usamos **8 días** (1–8 mar).
- `ingresoMes` = suma ventas 1–8 mar.
- `gananciaMesBruta` = ingresoMes - costoMes (solo 8 días).
- `gastosMes` = **gastos del mes completo**: fijos × 31 días + variables/puntuales del mes.
- `gananciaMesNeta` = gananciaMesBruta - **gastosMes** (no se prorratean por días).
- Proyección: `proyGananciaMesNeta = gananciaMesNeta × (31 / 8)`.

## Por qué no cuadran

1. **Días distintos**  
   Semana = 7 días (2–8 mar). Mes = 8 días (1–8 mar). El **1 de marzo solo entra en el mes**. Si el 1 tuvo mucha ganancia, el acumulado del mes puede ser mucho mayor que el de la semana.

2. **Gastos no prorrateados en el mes**  
   Para el acumulado del mes se hace:
   - Ganancia bruta de **8 días**.
   - Menos **gastos del mes completo** (31 días de fijos + variables del mes).  
   No se usa algo del estilo “gastos × (8/31)”.  
   Por tanto, el “acumulado” del mes no es “ganancia de 8 días menos la parte de gastos que corresponden a 8 días”, sino “ganancia de 8 días menos todo el gasto del mes”. Eso hace que el número del mes no sea directamente comparable con el de la semana.

## Cuentas con tus cifras

- Proyección ganancia 960.000 con factor 31/8 ⇒ **acumulado mes** ≈ 960.000 × 8/31 ≈ **247.700**.
- Semana: **55.200** en 7 días.

Si los 890.000 de ingresos fueran los mismos 7 días en ambas vistas:
- Semana: 890.000 − costo − gastosSemana = 55.200  ⇒  costo + gastosSemana = 834.800.
- Mes (8 días): si ingreso ≈ 890.000 (o un poco más si suma el 1 mar), y acumulado neto ≈ 247.700, entonces  
  (ingreso − costo) − gastosMes = 247.700.  
  Para que dé 247.700 con el mismo ingreso/costo que la semana, tendría que restarse **menos** gasto en el mes que en la semana (p. ej. si en el mes se restan gastosMes y en la semana gastosSemana, y gastosSemana > gastosMes por algún motivo).  
  O bien el mes incluye **el 1 de marzo**: un día extra con mucha ganancia (≈ 247.700 − 55.200 ≈ 192.500) explicaría la diferencia solo por días distintos.

## Conclusión

- La **fórmula** de ganancia mensual es: **ganancia bruta (8 días) − gastos del mes completo**; la proyección es ese neto × (31/8).
- La diferencia con la semana viene de:
  1. **Rango de fechas:** 8 días (1–8) vs 7 días (2–8).
  2. **Gastos:** en el mes se restan los gastos del mes completo, no prorrateados a 8 días; en la semana solo los de esa semana.

**Cambio aplicado:** En el mes actual se prorratean los gastos al período transcurrido:
`gastosProrrateados = gastosMes × (díasTranscurridos / 31)`. Así el acumulado = ganancia bruta (8 días) − gastos de esos 8 días, y la proyección = acumulado × (31/8) tiene sentido: mismo ritmo de ganancia neta por día hasta fin de mes.
