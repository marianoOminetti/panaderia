import { useMemo } from "react";
import { pctFmt } from "../lib/format";
import { costoUnitarioPorRecetaMap } from "../lib/costos";
import { calcularGastosFijosNormalizados } from "../components/gastos/GastosFijos";
import { CATEGORIAS, CAT_COLORS } from "../config/appConfig";

/**
 * Calcula todos los datos derivados para Analytics: semanas, métricas actual vs anterior,
 * tops (más vendidos, más rentables), picos día/hora, proyecciones mes, datos para gráficos (pie, barras).
 * Usado por Analytics.jsx. No modifica datos; solo transforma ventas/recetas/etc. en estructuras para las vistas.
 * @param {{ ventas: Array, recetas: Array, clientes: Array, recetaIngredientes: Array, insumos: Array, gastosFijos: Array }}
 * @returns {Object} Objeto con todas las props que AnalyticsSemana, AnalyticsProductos y AnalyticsGraficos necesitan
 */
export function useAnalyticsData({
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  gastosFijos,
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

    const thisWeekStart = startOfWeek(hoy);
    const thisWeekEnd = endOfWeek(thisWeekStart);
    const prevWeekEnd = new Date(thisWeekStart.getTime() - 1);
    const prevWeekStart = startOfWeek(prevWeekEnd);

    const isBetween = (date, from, to) =>
      date && date.getTime() >= from.getTime() && date.getTime() <= to.getTime();

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

    const ventasSemanaActual = ventasConFecha.filter((v) =>
      isBetween(v._fecha, thisWeekStart, thisWeekEnd)
    );
    const ventasSemanaAnterior = ventasConFecha.filter((v) =>
      isBetween(v._fecha, prevWeekStart, prevWeekEnd)
    );

    const sumMetric = (arr, fn) =>
      arr.reduce((s, v) => s + (fn ? fn(v) : montoVenta(v)), 0);

    const ingresoSemanaActual = sumMetric(ventasSemanaActual);
    const ingresoSemanaAnterior = sumMetric(ventasSemanaAnterior);
    const costoSemanaActual = sumMetric(ventasSemanaActual, getCostoLinea);
    const costoSemanaAnterior = sumMetric(ventasSemanaAnterior, getCostoLinea);
    const gananciaSemanaBrutaActual = ingresoSemanaActual - costoSemanaActual;
    const gananciaSemanaBrutaAnterior = ingresoSemanaAnterior - costoSemanaAnterior;

    const { semana: gastosFijosSemana } = calcularGastosFijosNormalizados(gastosFijos);
    const gananciaSemanaNetaActual = gananciaSemanaBrutaActual - (gastosFijosSemana || 0);
    const gananciaSemanaNetaAnterior = gananciaSemanaBrutaAnterior - (gastosFijosSemana || 0);
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
      const diff = actual - anterior;
      const pct = anterior !== 0 ? diff / anterior : 0;
      const dir = diff > 0 ? "up" : diff < 0 ? "down" : "flat";
      if (isPercent) {
        return { dir, label: pctFmt(pct) };
      }
      return { dir, label: pctFmt(pct) };
    };

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
        const ingreso = montoVenta(v);
        prev.ingreso += ingreso;
        prev.costo += getCostoLinea(v);
        porReceta.set(v.receta_id, prev);
      }
      return Array.from(porReceta.values());
    };

    const semActPorReceta = topBy(ventasSemanaActual);
    const semAntPorReceta = topBy(ventasSemanaAnterior);
    const mapSemAnt = new Map(semAntPorReceta.map((r) => [r.receta_id, r]));

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

    const ahora = new Date();
    const hace30dias = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate() - 30
    );
    const ventas30dias = ventasConFecha.filter(
      (v) => v._fecha && v._fecha.getTime() >= hace30dias.getTime()
    );

    const porReceta30 = topBy(ventas30dias);
    const topMasRentables = porReceta30
      .map((row) => ({ ...row, ganancia: row.ingreso - row.costo }))
      .filter((row) => row.ganancia > 0)
      .sort((a, b) => b.ganancia - a.ganancia)
      .slice(0, 5)
      .map((row) => {
        const rec = recetas.find((r) => r.id === row.receta_id) || {};
        return { ...row, receta: rec };
      });

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

    const ventas30diasForPeak = ventasConFecha.filter(
      (v) => v._fecha && v._fecha.getTime() >= hace30dias.getTime()
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

    const ingresoPorDia = Array(7).fill(0);
    const ingresoPorHora = Array(24).fill(0);
    for (const v of ventas30diasForPeak) {
      const f = v._fecha;
      if (!f) continue;
      const monto = montoVenta(v);
      const dow = f.getDay();
      ingresoPorDia[dow] += monto;
      const h = v._created ? v._created.getHours() : 0;
      ingresoPorHora[h] += monto;
    }

    const diaPicoIdx = ingresoPorDia.reduce(
      (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
      0
    );
    const horaPicoIdx = ingresoPorHora.reduce(
      (bestIdx, val, idx, arr) => (val > arr[bestIdx] ? idx : bestIdx),
      0
    );

    const diaPicoLabel =
      ingresoPorDia[diaPicoIdx] > 0 ? diasSemana[diaPicoIdx] : "—";
    const horaPicoLabel =
      ingresoPorHora[horaPicoIdx] > 0
        ? `${horaPicoIdx.toString().padStart(2, "0")}:00`
        : "—";

    const year = hoy.getFullYear();
    const month = hoy.getMonth();
    const startOfMonth = new Date(year, month, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);
    const ventasMes = ventasConFecha.filter(
      (v) => v._fecha && isBetween(v._fecha, startOfMonth, endOfMonth)
    );

    const ingresoMes = sumMetric(ventasMes);
    const costoMes = sumMetric(ventasMes, getCostoLinea);
    const gananciaMesBruta = ingresoMes - costoMes;

    const totalDiasMes = endOfMonth.getDate();
    const { dia: gastosFijosDia } = calcularGastosFijosNormalizados(gastosFijos);
    const gastosFijosMes = (gastosFijosDia || 0) * totalDiasMes;
    const gananciaMesNeta = gananciaMesBruta - gastosFijosMes;

    const diasTranscurridos = hoy.getDate();
    const factorProy =
      diasTranscurridos > 0 ? totalDiasMes / diasTranscurridos : 0;
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

    return {
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
      diaPicoLabel,
      horaPicoLabel,
      mejorCliente,
      mejorClienteTotal,
      proyIngresoMes,
      ingresoMes,
      diasTranscurridos,
      proyGananciaMesNeta,
      gananciaMesNeta,
      recetasSinVenta7,
    };
  }, [
    ventas,
    recetas,
    clientes,
    recetaIngredientes,
    insumos,
    gastosFijos,
  ]);
}
