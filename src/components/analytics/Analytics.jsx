/**
 * Contenedor de Analytics: solo orquesta tabs y paso de datos.
 * Toda la lógica derivada (semanas, métricas, tops, gráficos) vive en useAnalyticsData.
 * Delega a AnalyticsSemana, AnalyticsProductos y AnalyticsGraficos.
 */
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import AnalyticsSemana from "./AnalyticsSemana";
import AnalyticsProductos from "./AnalyticsProductos";
import AnalyticsGraficos from "./AnalyticsGraficos";

export default function Analytics({
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  gastosFijos,
}) {
  const data = useAnalyticsData({
    ventas,
    recetas,
    clientes,
    recetaIngredientes,
    insumos,
    gastosFijos,
  });

  return (
    <div className="content">
      <p className="page-title">Analytics</p>
      <p className="page-subtitle">
        Semana vs semana anterior · picos de venta y rentabilidad
      </p>

      <AnalyticsSemana
        ingresoSemanaActual={data.ingresoSemanaActual}
        ingresoSemanaAnterior={data.ingresoSemanaAnterior}
        costoSemanaActual={data.costoSemanaActual}
        costoSemanaAnterior={data.costoSemanaAnterior}
        gananciaSemanaActual={data.gananciaSemanaActual}
        gananciaSemanaAnterior={data.gananciaSemanaAnterior}
        margenSemanaActual={data.margenSemanaActual}
        trendIngreso={data.trendIngreso}
        trendCosto={data.trendCosto}
        trendGanancia={data.trendGanancia}
        trendMargen={data.trendMargen}
        topMasVendidos={data.topMasVendidos}
        topMasRentables={data.topMasRentables}
        maxIngreso7={data.maxIngreso7}
        ultimo7diasFechas={data.ultimo7diasFechas}
        ingresoPorDia7={data.ingresoPorDia7}
        diasSemanaCorto={data.diasSemanaCorto}
        totalIngresos7={data.totalIngresos7}
        pieData={data.pieDataWithColor}
        pieGradient={data.pieGradient}
      />

      <AnalyticsProductos
        diaPicoLabel={data.diaPicoLabel}
        horaPicoLabel={data.horaPicoLabel}
        mejorCliente={data.mejorCliente}
        mejorClienteTotal={data.mejorClienteTotal}
        proyIngresoMes={data.proyIngresoMes}
        ingresoMes={data.ingresoMes}
        diasTranscurridos={data.diasTranscurridos}
        proyGananciaMesNeta={data.proyGananciaMesNeta}
        gananciaMesNeta={data.gananciaMesNeta}
        recetasSinVenta7={data.recetasSinVenta7}
      />

      <AnalyticsGraficos
        ultimo7diasFechas={data.ultimo7diasFechas}
        ingresoPorDia7={data.ingresoPorDia7}
        maxIngreso7={data.maxIngreso7}
        diasSemanaCorto={data.diasSemanaCorto}
        pieData={data.pieDataWithColor}
        totalIngresos7={data.totalIngresos7}
        diaPicoLabel={data.diaPicoLabel}
        horaPicoLabel={data.horaPicoLabel}
        mejorCliente={data.mejorCliente}
        mejorClienteTotal={data.mejorClienteTotal}
        proyIngresoMes={data.proyIngresoMes}
        ingresoMes={data.ingresoMes}
        diasTranscurridos={data.diasTranscurridos}
        proyGananciaMesNeta={data.proyGananciaMesNeta}
        gananciaMesNeta={data.gananciaMesNeta}
        recetasSinVenta7={data.recetasSinVenta7}
      />
    </div>
  );
}
