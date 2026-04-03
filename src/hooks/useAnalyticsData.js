import { useMemo } from "react";
import { pctFmt } from "../lib/format";
import { costoUnitarioPorRecetaMap } from "../lib/costos";
import { calcularGastosTotales } from "../lib/gastosFijos";
import { CATEGORIAS, CAT_COLORS } from "../config/appConfig";

/**
 * Calcula todos los datos derivados para Analytics: semanas, métricas actual vs anterior,
 * tops (más vendidos/rentables por semana seleccionada o por mes), picos día/hora, proyecciones mes, gráficos.
 * Usado por Analytics.jsx. No modifica datos; solo transforma ventas/recetas/etc. en estructuras para las vistas.
 * @param {{ ventas: Array, recetas: Array, clientes: Array, recetaIngredientes: Array, insumos: Array, gastosFijos: Array }}
 * @returns {Object} Objeto con todas las props que AnalyticsSemana, AnalyticsProductos y AnalyticsGraficos necesitan
 */
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function useAnalyticsData({
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  gastosFijos,
  offsetSemanas = 0,
  offsetMeses = 0,
  offsetDias = 0,
}) {
  return useMemo(() => {
    const hoy = new Date();

    const parseISODate = (d) => {
      if (!d) return null;
      const parts = String(d).split("-");
      if (parts.length === 3) {
        const [y, m, day] = parts.map((x) => parseInt(x, 10));
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(day)) {
          return new Date(y, m - 1, day);
        }
      }
      const dt = new Date(d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    };

    // Lunes como inicio de semana para alinear con plan semanal y reportes
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

    const baseWeekStart = startOfWeek(hoy);
    const thisWeekStart = new Date(
      baseWeekStart.getTime() + offsetSemanas * 7 * 24 * 60 * 60 * 1000
    );
    const thisWeekEnd = endOfWeek(thisWeekStart);
    const prevWeekEnd = new Date(thisWeekStart.getTime() - 1);
    const prevWeekStart = startOfWeek(prevWeekEnd);

    const ymd = (d) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const periodoSemanaDesdeStr = ymd(thisWeekStart);
    const periodoSemanaHastaStr = ymd(thisWeekEnd);

    const fmtDiaMes = (d) => `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}`;
    const semanaLabel =
      offsetSemanas === 0
        ? `${fmtDiaMes(thisWeekStart)}–${fmtDiaMes(thisWeekEnd)}`
        : `${fmtDiaMes(thisWeekStart)} – ${fmtDiaMes(thisWeekEnd)}`;

    const isBetween = (date, from, to) =>
      date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();

    const trendInfo = (actual, anterior, isPercent = false) => {
      if (anterior === 0 && actual === 0) {
        return { dir: "flat", label: "—" };
      }
      if (anterior === 0) {
        return { dir: "up", label: "nuevo" };
      }
      if (anterior == null || Number.isNaN(anterior)) {
        return { dir: "flat", label: "—" };
      }
      if (actual == null || Number.isNaN(actual)) {
        return { dir: "flat", label: "—" };
      }
      const diff = actual - anterior;
      const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";

      // Cuando el valor anterior es negativo (ej. ganancia pasó de pérdida a ganancia),
      // (actual - anterior) / anterior da un % negativo engañoso. Tratamos esos casos.
      if (anterior < 0 && actual >= 0) {
        return { dir: "up", label: actual > 0 ? "de pérdida a ganancia" : "a cero" };
      }
      if (anterior > 0 && actual < 0) {
        return { dir: "down", label: "a pérdida" };
      }
      if (anterior < 0 && actual < 0) {
        // Ambos negativos: % sobre el valor absoluto del anterior
        const pct = diff / Math.abs(anterior);
        return { dir, label: pctFmt(pct) };
      }

      const pct = anterior !== 0 ? diff / anterior : 0;
      return { dir, label: pctFmt(pct) };
    };

    const montoVenta = (v) =>
      v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0);

    const costoUnitarioPorReceta = costoUnitarioPorRecetaMap(
      recetas || [],
      recetaIngredientes || [],
      insumos || []
    );

    const getCostoLinea = (v) => {
      const cu = costoUnitarioPorReceta[v.receta_id];
      if (cu == null) return 0;
      const cant = Number(v.cantidad) || 0;
      return cu * cant;
    };

    const ventasConFecha = (ventas || []).map((v) => {
      const fecha = parseISODate(v.fecha || v.created_at);
      const created = v.created_at ? new Date(v.created_at) : fecha;
      return { ...v, _fecha: fecha, _created: created };
    });

    const startOfDay = (d) => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
      return x;
    };
    const endOfDay = (d) => {
      const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      return x;
    };

    const diaSeleccionado = new Date(hoy);
    diaSeleccionado.setDate(diaSeleccionado.getDate() + offsetDias);
    const diaInicio = startOfDay(diaSeleccionado);
    const diaFin = endOfDay(diaSeleccionado);
    const diaAnterior = new Date(diaSeleccionado);
    diaAnterior.setDate(diaAnterior.getDate() - 1);
    const diaAnteriorInicio = startOfDay(diaAnterior);
    const diaAnteriorFin = endOfDay(diaAnterior);

    const ventasHoy = ventasConFecha.filter((v) =>
      isBetween(v._fecha, diaInicio, diaFin)
    );
    const ventasAyer = ventasConFecha.filter((v) =>
      isBetween(v._fecha, diaAnteriorInicio, diaAnteriorFin)
    );

    const sumMetric = (arr, fn) =>
      arr.reduce((s, v) => s + (fn ? fn(v) : montoVenta(v)), 0);

    const ingresoHoy = sumMetric(ventasHoy);
    const ingresoAyer = sumMetric(ventasAyer);
    const costoHoy = sumMetric(ventasHoy, getCostoLinea);
    const costoAyer = sumMetric(ventasAyer, getCostoLinea);
    const { dia: gastosDia } = calcularGastosTotales(gastosFijos, diaSeleccionado);
    const { dia: gastosDiaAyer } = calcularGastosTotales(gastosFijos, diaAnterior);
    const gananciaHoy = ingresoHoy - costoHoy - (gastosDia || 0);
    const gananciaAyer = ingresoAyer - costoAyer - (gastosDiaAyer || 0);

    const trendHoyVsAyer = trendInfo(ingresoHoy, ingresoAyer);
    const margenHoy = ingresoHoy > 0 ? (ingresoHoy - costoHoy) / ingresoHoy : null;
    const margenAyer = ingresoAyer > 0 ? (ingresoAyer - costoAyer) / ingresoAyer : null;

    const diaLabel =
      offsetDias === 0
        ? "Hoy"
        : offsetDias === -1
          ? "Ayer"
          : offsetDias === -2
            ? "Anteayer"
            : diaSeleccionado.toLocaleDateString("es-AR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              });

    const ingresoPorHoraHoy = Array(24).fill(0);
    for (const v of ventasHoy) {
      const h = v._created ? v._created.getHours() : 0;
      ingresoPorHoraHoy[h] += montoVenta(v);
    }

    const topBy = (ventasLista) => {
      const porReceta = new Map();
      for (const v of ventasLista) {
        if (v.receta_id == null) continue;
        const prev = porReceta.get(v.receta_id) || {
          receta_id: v.receta_id,
          unidades: 0,
          ingreso: 0,
          costo: 0,
        };
        prev.unidades += Number(v.cantidad) || 0;
        prev.ingreso += montoVenta(v);
        prev.costo += getCostoLinea(v);
        porReceta.set(v.receta_id, prev);
      }
      return Array.from(porReceta.values());
    };

    const hoyPorReceta = topBy(ventasHoy);
    const topProductosHoy = hoyPorReceta
      .filter((r) => (r.unidades || 0) > 0)
      .slice()
      .sort((a, b) => b.unidades - a.unidades)
      .map((row, idx) => {
        const rec = recetas.find((r) => r.id === row.receta_id) || {};
        return { ...row, receta: rec, rank: idx + 1 };
      });

    const topRentablesHoy = hoyPorReceta
      .map((row) => ({ ...row, ganancia: row.ingreso - row.costo }))
      .filter((row) => row.ganancia > 0)
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 5)
      .map((row, idx) => {
        const rec = recetas.find((r) => r.id === row.receta_id) || {};
        const margen = row.ingreso > 0 ? row.ganancia / row.ingreso : 0;
        return { ...row, receta: rec, margen, rank: idx + 1 };
      });

    const clienteGastoHoy = new Map();
    for (const v of ventasHoy) {
      const cid = v.cliente_id ?? "_sin_cliente";
      const monto = montoVenta(v);
      clienteGastoHoy.set(cid, (clienteGastoHoy.get(cid) || 0) + monto);
    }
    const clientesDelDia = Array.from(clienteGastoHoy.entries())
      .map(([cliente_id, total]) => {
        const cliente =
          cliente_id === "_sin_cliente"
            ? { nombre: "Consumidor final" }
            : clientes.find((c) => c.id === cliente_id) || {
                nombre: "Cliente desconocido",
              };
        return { cliente_id, total, cliente };
      })
      .sort((a, b) => b.total - a.total);

    const ventasSemanaActual = ventasConFecha.filter((v) =>
      isBetween(v._fecha, thisWeekStart, thisWeekEnd)
    );
    const ventasSemanaAnterior = ventasConFecha.filter((v) =>
      isBetween(v._fecha, prevWeekStart, prevWeekEnd)
    );

    const ingresoPorDiaSemana = Array(7).fill(0);
    for (const v of ventasSemanaActual) {
      const f = v._fecha;
      if (!f) continue;
      const dow = f.getDay();
      const idx = dow === 0 ? 6 : dow - 1;
      ingresoPorDiaSemana[idx] += montoVenta(v);
    }
    const maxIngresoSemana = ingresoPorDiaSemana.reduce(
      (m, v) => (v > m ? v : m),
      0
    );

    const ventasSemanaPorReceta = topBy(ventasSemanaActual);
    const totalIngresosSemana = ventasSemanaPorReceta.reduce(
      (s, r) => s + r.ingreso,
      0
    );
    const slicesSemana = ventasSemanaPorReceta
      .slice()
      .sort((a, b) => b.ingreso - a.ingreso);
    const topSlicesSemana = slicesSemana.slice(0, 5);
    const otherSlicesSemana = slicesSemana.slice(5);
    const otrosIngresoSemana = otherSlicesSemana.reduce(
      (s, r) => s + r.ingreso,
      0
    );
    const pieDataSemana = [];
    for (const s of topSlicesSemana) {
      const rec = recetas.find((r) => r.id === s.receta_id) || {};
      const pct =
        totalIngresosSemana > 0 ? s.ingreso / totalIngresosSemana : 0;
      pieDataSemana.push({ ...s, receta: rec, pct });
    }
    if (otrosIngresoSemana > 0 && totalIngresosSemana > 0) {
      pieDataSemana.push({
        receta: { nombre: "Otros" },
        ingreso: otrosIngresoSemana,
        pct: otrosIngresoSemana / totalIngresosSemana,
        receta_id: "otros",
      });
    }

    const ingresoSemanaActual = sumMetric(ventasSemanaActual);
    const ingresoSemanaAnterior = sumMetric(ventasSemanaAnterior);
    const costoSemanaActual = sumMetric(ventasSemanaActual, getCostoLinea);
    const costoSemanaAnterior = sumMetric(ventasSemanaAnterior, getCostoLinea);
    const gananciaSemanaBrutaActual = ingresoSemanaActual - costoSemanaActual;
    const gananciaSemanaBrutaAnterior = ingresoSemanaAnterior - costoSemanaAnterior;

    const { semana: gastosSemanaActual } = calcularGastosTotales(
      gastosFijos,
      thisWeekStart
    );
    const { semana: gastosSemanaAnterior } = calcularGastosTotales(
      gastosFijos,
      prevWeekStart
    );
    const gananciaSemanaNetaActual =
      gananciaSemanaBrutaActual - (gastosSemanaActual || 0);
    const gananciaSemanaNetaAnterior =
      gananciaSemanaBrutaAnterior - (gastosSemanaAnterior || 0);
    const gananciaSemanaActual = gananciaSemanaNetaActual;
    const gananciaSemanaAnterior = gananciaSemanaNetaAnterior;
    const margenSemanaActual =
      ingresoSemanaActual > 0
        ? gananciaSemanaBrutaActual / ingresoSemanaActual
        : null;
    const margenSemanaAnterior =
      ingresoSemanaAnterior > 0
        ? gananciaSemanaBrutaAnterior / ingresoSemanaAnterior
        : null;

    const trendIngreso = trendInfo(ingresoSemanaActual, ingresoSemanaAnterior);
    const trendCosto = trendInfo(costoSemanaActual, costoSemanaAnterior);
    const trendGanancia = trendInfo(
      gananciaSemanaNetaActual,
      gananciaSemanaNetaAnterior
    );
    const trendMargen = trendInfo(
      margenSemanaActual ?? 0,
      margenSemanaAnterior ?? 0,
      true
    );

    const semActPorReceta = topBy(ventasSemanaActual);
    const semAntPorReceta = topBy(ventasSemanaAnterior);
    const mapSemAnt = new Map(semAntPorReceta.map((r) => [r.receta_id, r]));
    const totalUnidadesSemana = semActPorReceta.reduce((s, r) => s + (r.unidades || 0), 0);

    const topMasVendidos = semActPorReceta
      .slice()
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5)
      .map((row) => {
        const rec = recetas.find((r) => r.id === row.receta_id) || {};
        const prev = mapSemAnt.get(row.receta_id) || { unidades: 0, ingreso: 0 };
        const t = trendInfo(row.unidades, prev.unidades);
        return { ...row, receta: rec, trend: t };
      });

    // Misma ventana que ventasSemanaActual (lunes–domingo, con offsetSemanas)
    const topMasRentables = semActPorReceta
      .map((row) => ({ ...row, ganancia: row.ingreso - row.costo }))
      .filter((row) => row.ganancia > 0)
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 5)
      .map((row) => {
        const rec = recetas.find((r) => r.id === row.receta_id) || {};
        return { ...row, receta: rec };
      });

    const ahora = new Date();
    const hace7dias = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate() - 6
    );
    hace7dias.setHours(0, 0, 0, 0);
    const ventas7dias = ventasConFecha.filter(
      (v) => v._fecha && v._fecha.getTime() >= hace7dias.getTime()
    );

    const recetasConVenta7 = new Set(
      ventas7dias.map((v) => v.receta_id).filter((id) => id != null)
    );
    const recetasSinVenta7 = (recetas || []).filter(
      (r) => !recetasConVenta7.has(r.id)
    );

    const diasSemana = [
      "domingo",
      "lunes",
      "martes",
      "miércoles",
      "jueves",
      "viernes",
      "sábado",
    ];
    const diasSemanaCorto = ["D", "L", "M", "X", "J", "V", "S"];

    const year = hoy.getFullYear();
    const month = hoy.getMonth();
    const targetMonth = new Date(year, month + offsetMeses, 1);
    const startOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      1,
      0,
      0,
      0,
      0
    );
    const endOfMonth = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );
    const mesLabel = `${MESES[targetMonth.getMonth()]} ${targetMonth.getFullYear()}`;
    const periodoMesDesdeStr = ymd(startOfMonth);
    const periodoMesHastaStr = ymd(endOfMonth);
    const proyeccionAplicable = offsetMeses === 0;
    const ventasMes = ventasConFecha.filter(
      (v) => v._fecha && isBetween(v._fecha, startOfMonth, endOfMonth)
    );

    const ingresoPorDiaMes = Array(7).fill(0);
    const ingresoPorHoraMes = Array(24).fill(0);
    const ingresoPorSemanaMes = Array(6).fill(0);
    for (const v of ventasMes) {
      const f = v._fecha;
      if (!f) continue;
      const monto = montoVenta(v);
      ingresoPorDiaMes[f.getDay()] += monto;
      const h = v._created ? v._created.getHours() : 0;
      ingresoPorHoraMes[h] += monto;
      const weekNum = Math.ceil(f.getDate() / 7);
      ingresoPorSemanaMes[weekNum - 1] += monto;
    }
    const diaPicoIdx = ingresoPorDiaMes.reduce(
      (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
      0
    );
    const horaPicoIdx = ingresoPorHoraMes.reduce(
      (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
      0
    );
    const semanaPicoIdx = ingresoPorSemanaMes.reduce(
      (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
      0
    );
    const semanasOrdinal = ["1ra", "2da", "3ra", "4ta", "5ta", "6ta"];
    const semanaPicoLabel =
      ingresoPorSemanaMes[semanaPicoIdx] > 0
        ? `${semanasOrdinal[semanaPicoIdx]} semana`
        : "—";
    const diaPicoLabel =
      ingresoPorDiaMes[diaPicoIdx] > 0 ? diasSemana[diaPicoIdx] : "—";
    const horaPicoLabel =
      ingresoPorHoraMes[horaPicoIdx] > 0
        ? `${horaPicoIdx.toString().padStart(2, "0")}:00`
        : "—";

    const diasLunADomEtiquetas = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];
    const jsDowDesdeLunes = [1, 2, 3, 4, 5, 6, 0];
    const ingresoPorDiaMesLunDom = jsDowDesdeLunes.map((dow, i) => ({
      label: diasLunADomEtiquetas[i],
      ingreso: ingresoPorDiaMes[dow] || 0,
    }));

    const ingresoMes = sumMetric(ventasMes);
    const costoMes = sumMetric(ventasMes, getCostoLinea);
    const gananciaMesBruta = ingresoMes - costoMes;

    const recetasConVentaMes = new Set(
      ventasMes.map((v) => v.receta_id).filter((id) => id != null)
    );
    const recetasSinVentaMes = (recetas || []).filter(
      (r) => !recetasConVentaMes.has(r.id)
    );

    const totalDiasMes = endOfMonth.getDate();
    const { mes: gastosMes } = calcularGastosTotales(gastosFijos, startOfMonth);
    const diasTranscurridos =
      offsetMeses === 0 ? hoy.getDate() : totalDiasMes;
    // Gastos prorrateados al período transcurrido para que acumulado y proyección sean coherentes
    const gastosProrrateados =
      proyeccionAplicable && diasTranscurridos > 0
        ? (gastosMes || 0) * (diasTranscurridos / totalDiasMes)
        : (gastosMes || 0);
    const gananciaMesNeta = gananciaMesBruta - gastosProrrateados;

    const factorProy =
      proyeccionAplicable && diasTranscurridos > 0
        ? totalDiasMes / diasTranscurridos
        : 1;
    const proyIngresoMes = ingresoMes * factorProy;
    const proyGananciaMesNeta = gananciaMesNeta * factorProy;

    const gastoPorClienteMes = new Map();
    for (const v of ventasMes) {
      if (v.cliente_id == null) continue;
      const prev = gastoPorClienteMes.get(v.cliente_id) || 0;
      gastoPorClienteMes.set(v.cliente_id, prev + montoVenta(v));
    }
    let mejorCliente = null;
    let mejorClienteTotal = 0;
    for (const [id, total] of gastoPorClienteMes.entries()) {
      if (total > mejorClienteTotal) {
        mejorClienteTotal = total;
        mejorCliente = clientes.find((c) => c.id === id) || null;
      }
    }

    const mesPorReceta = topBy(ventasMes);
    const prevMonthStart = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth() - 1,
      1,
      0,
      0,
      0,
      0
    );
    const prevMonthEnd = new Date(
      targetMonth.getFullYear(),
      targetMonth.getMonth(),
      0,
      23,
      59,
      59,
      999
    );
    const ventasMesAnterior = ventasConFecha.filter(
      (v) => v._fecha && isBetween(v._fecha, prevMonthStart, prevMonthEnd)
    );
    const mesAntPorReceta = topBy(ventasMesAnterior);
    const mapMesAnt = new Map(mesAntPorReceta.map((r) => [r.receta_id, r]));

    const topMasVendidosMes = mesPorReceta
      .slice()
      .sort((a, b) => b.unidades - a.unidades)
      .slice(0, 5)
      .map((row) => {
        const rec = recetas.find((r) => r.id === row.receta_id) || {};
        const prev = mapMesAnt.get(row.receta_id) || { unidades: 0, ingreso: 0 };
        const t = trendInfo(row.unidades, prev.unidades);
        return { ...row, receta: rec, trend: t };
      });

    const topMasRentablesMes = mesPorReceta
      .map((row) => ({ ...row, ganancia: row.ingreso - row.costo }))
      .filter((row) => row.ganancia > 0)
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 5)
      .map((row) => {
        const rec = recetas.find((r) => r.id === row.receta_id) || {};
        return { ...row, receta: rec };
      });

    const ultimo7diasFechas = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(
        ahora.getFullYear(),
        ahora.getMonth(),
        ahora.getDate() - i
      );
      d.setHours(0, 0, 0, 0);
      ultimo7diasFechas.push(d);
    }

    const ingresoPorDia7 = ultimo7diasFechas.map((dia) => {
      const next = new Date(dia);
      next.setDate(next.getDate() + 1);
      const total = ventasConFecha
        .filter(
          (v) =>
            v._fecha &&
            v._fecha.getTime() >= dia.getTime() &&
            v._fecha.getTime() < next.getTime()
        )
        .reduce((s, v) => s + montoVenta(v), 0);
      return total;
    });
    const maxIngreso7 = ingresoPorDia7.reduce((m, v) => (v > m ? v : m), 0);

    const ventas7PorReceta = topBy(ventas7dias);
    const totalIngresos7 = ventas7PorReceta.reduce((s, r) => s + r.ingreso, 0);
    const slices = ventas7PorReceta.slice().sort((a, b) => b.ingreso - a.ingreso);
    const maxSlices = 5;
    const topSlices = slices.slice(0, maxSlices);
    const otherSlices = slices.slice(maxSlices);
    const otrosIngreso = otherSlices.reduce((s, r) => s + r.ingreso, 0);
    const pieData = [];
    for (const s of topSlices) {
      const rec = recetas.find((r) => r.id === s.receta_id) || {};
      const pct = totalIngresos7 > 0 ? s.ingreso / totalIngresos7 : 0;
      pieData.push({ ...s, receta: rec, pct });
    }
    if (otrosIngreso > 0 && totalIngresos7 > 0) {
      pieData.push({
        receta: { nombre: "Otros" },
        ingreso: otrosIngreso,
        pct: otrosIngreso / totalIngresos7,
        receta_id: "otros",
      });
    }

    let acum = 0;
    const pieDataWithColor = pieData.map((s, idx) => {
      const rec = s.receta || {};
      const color =
        CATEGORIAS.includes(rec.categoria) && CAT_COLORS[rec.categoria]
          ? CAT_COLORS[rec.categoria]
          : ["#A98ED2", "#4A7C59", "#D64545", "#D4A843", "#8B6040"][idx % 5];
      const start = acum * 360;
      const end = (acum + s.pct) * 360;
      acum += s.pct;
      return { ...s, color, start, end };
    });

    const pieGradient = pieDataWithColor
      .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
      .join(", ");

    let acumSemana = 0;
    const pieDataWithColorSemana = pieDataSemana.map((s, idx) => {
      const rec = s.receta || {};
      const color =
        CATEGORIAS.includes(rec.categoria) && CAT_COLORS[rec.categoria]
          ? CAT_COLORS[rec.categoria]
          : ["#A98ED2", "#4A7C59", "#D64545", "#D4A843", "#8B6040"][idx % 5];
      const start = acumSemana * 360;
      const end = (acumSemana + s.pct) * 360;
      acumSemana += s.pct;
      return { ...s, color, start, end };
    });
    const pieGradientSemana = pieDataWithColorSemana
      .map((s) => `${s.color} ${s.start}deg ${s.end}deg`)
      .join(", ");

    return {
      ingresoHoy,
      gananciaHoy,
      costoHoy,
      costoAyer,
      margenHoy,
      margenAyer,
      diaLabel,
      ventasHoy: ventasHoy.length,
      ingresoAyer,
      gananciaAyer,
      trendHoyVsAyer,
      ingresoPorHoraHoy,
      topProductosHoy,
      topRentablesHoy,
      clientesDelDia,
      ingresoSemanaActual,
      ingresoSemanaAnterior,
      costoSemanaActual,
      costoSemanaAnterior,
      gananciaSemanaActual,
      gananciaSemanaAnterior,
      margenSemanaActual,
      margenSemanaAnterior,
      trendIngreso,
      trendCosto,
      trendGanancia,
      trendMargen,
      topMasVendidos,
      topMasRentables,
      maxIngreso7,
      ultimo7diasFechas,
      ingresoPorDia7,
      diasSemanaCorto,
      totalIngresos7,
      pieDataWithColor,
      pieGradient,
      semanaPicoLabel,
      diaPicoLabel,
      horaPicoLabel,
      mejorCliente,
      mejorClienteTotal,
      proyIngresoMes,
      ingresoMes,
      diasTranscurridos,
      proyGananciaMesNeta,
      gananciaMesNeta,
      costoMes,
      topMasVendidosMes,
      topMasRentablesMes,
      recetasSinVenta7,
      recetasSinVentaMes,
      semanaLabel,
      mesLabel,
      ingresoPorDiaSemana,
      proyeccionAplicable,
      maxIngresoSemana,
      totalIngresosSemana,
      totalUnidadesSemana,
      pieDataWithColorSemana,
      pieGradientSemana,
      ventasPeriodoSemana: ventasSemanaActual,
      ventasPeriodoMes: ventasMes,
      ingresoPorDiaMesLunDom,
      periodoSemanaDesdeStr,
      periodoSemanaHastaStr,
      periodoMesDesdeStr,
      periodoMesHastaStr,
    };
  }, [
    ventas,
    recetas,
    clientes,
    recetaIngredientes,
    insumos,
    gastosFijos,
    offsetSemanas,
    offsetMeses,
    offsetDias,
  ]);
}
