/**
 * Contenedor de Analytics: vista resumen o detalle (Hoy, Semana, Mes, Año).
 */
import { useState, useEffect, memo } from "react";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import AnalyticsResumen from "./AnalyticsResumen";
import AnalyticsDetalleHoy from "./AnalyticsDetalleHoy";
import AnalyticsDetalleSemana from "./AnalyticsDetalleSemana";
import AnalyticsDetalleMes from "./AnalyticsDetalleMes";
import AnalyticsDetalleAnio from "./AnalyticsDetalleAnio";
import AnalyticsDrilldown from "./AnalyticsDrilldown";

function Analytics({
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  gastosFijos,
  ventasSyncing = false,
  ventasHistoricasLoaded = true,
  onAbrirVentasPeriodo,
}) {
  const cargandoHistorico = ventasSyncing && !ventasHistoricasLoaded;
  const [vista, setVista] = useState("resumen");
  const [offsetDia, setOffsetDia] = useState(0);
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [offsetMes, setOffsetMes] = useState(0);
  const [offsetAnio, setOffsetAnio] = useState(0);
  const [drill, setDrill] = useState(null);

  useEffect(() => {
    setDrill(null);
  }, [vista, offsetSemana, offsetMes, offsetAnio]);

  const data = useAnalyticsData({
    ventas,
    recetas,
    clientes,
    recetaIngredientes,
    insumos,
    gastosFijos,
    offsetDias: vista === "detalle-hoy" ? offsetDia : 0,
    offsetSemanas: vista === "detalle-semana" ? offsetSemana : 0,
    offsetMeses: vista === "detalle-mes" ? offsetMes : 0,
    offsetAnios: vista === "detalle-anio" ? offsetAnio : 0,
  });

  const handleVerDetalle = (tipo) => {
    if (tipo === "hoy") {
      setOffsetDia(0);
      setVista("detalle-hoy");
    } else if (tipo === "semana") {
      setOffsetSemana(0);
      setVista("detalle-semana");
    } else if (tipo === "mes") {
      setOffsetMes(0);
      setVista("detalle-mes");
    } else if (tipo === "anio") {
      setOffsetAnio(0);
      setVista("detalle-anio");
    }
  };

  const handleVolver = () => {
    setVista("resumen");
  };

  const detailHeader = (
    <div
      className="analytics-detail-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
      }}
    >
      <button type="button" className="screen-back" onClick={handleVolver}>
        ← Volver
      </button>
      <span className="page-title" style={{ flex: 1, margin: 0 }}>
        Analytics
      </span>
    </div>
  );

  const historicoBanner = cargandoHistorico ? (
    <p className="page-subtitle" style={{ marginBottom: 12 }}>
      Hoy y Semana ya están listos. Mes y Año se completan en unos segundos al cargar
      ventas históricas.
    </p>
  ) : null;

  const historicoLoadingView = (periodoLabel) => (
    <div className="content">
      {detailHeader}
      <div className="loading">
        <div className="spinner" />
        <p>Cargando ventas de {periodoLabel}…</p>
      </div>
    </div>
  );

  if (vista === "resumen") {
    return (
      <div className="content">
        <p className="page-title">Analytics</p>
        <p className="page-subtitle">
          Hoy · Semana · Mes · Año · tocá para ver el detalle
        </p>
        {historicoBanner}
        <AnalyticsResumen
          data={data}
          onVerDetalle={handleVerDetalle}
          cargandoHistorico={cargandoHistorico}
        />
      </div>
    );
  }

  if (vista === "detalle-hoy") {
    return (
      <div className="content">
        {detailHeader}
        <AnalyticsDetalleHoy
          data={data}
          offsetDia={offsetDia}
          onPrev={() => setOffsetDia((o) => o - 1)}
          onNext={() => setOffsetDia((o) => (o < 0 ? o + 1 : o))}
          onIrActual={() => setOffsetDia(0)}
        />
      </div>
    );
  }

  if (vista === "detalle-semana") {
    if (drill?.tipo) {
      return (
        <AnalyticsDrilldown
          drill={drill}
          onBack={() => setDrill(null)}
          periodLabel={`Semana · ${data.semanaLabel || ""}`}
          ventasPeriodo={data.ventasPeriodoSemana || []}
          data={data}
          recetas={recetas}
          clientes={clientes}
          recetaIngredientes={recetaIngredientes}
          insumos={insumos}
          fechasVentasPeriodo={{
            desde: data.periodoSemanaDesdeStr,
            hasta: data.periodoSemanaHastaStr,
          }}
          onAbrirEnVentas={
            onAbrirVentasPeriodo
              ? () =>
                  onAbrirVentasPeriodo({
                    desde: data.periodoSemanaDesdeStr,
                    hasta: data.periodoSemanaHastaStr,
                    label: `Semana · ${data.semanaLabel || ""}`,
                  })
              : undefined
          }
        />
      );
    }
    return (
      <div className="content">
        {detailHeader}
        <AnalyticsDetalleSemana
          data={data}
          offsetSemana={offsetSemana}
          onPrev={() => setOffsetSemana((o) => o - 1)}
          onNext={() => setOffsetSemana((o) => (o < 0 ? o + 1 : o))}
          onIrActual={() => setOffsetSemana(0)}
          onDrill={setDrill}
          onAbrirVentasPeriodo={onAbrirVentasPeriodo}
        />
      </div>
    );
  }

  if (vista === "detalle-mes") {
    if (cargandoHistorico && offsetMes !== 0) {
      return historicoLoadingView(data.mesLabel || "ese mes");
    }
    if (drill?.tipo) {
      return (
        <AnalyticsDrilldown
          drill={drill}
          onBack={() => setDrill(null)}
          periodLabel={`Mes · ${data.mesLabel || ""}`}
          ventasPeriodo={data.ventasPeriodoMes || []}
          data={data}
          recetas={recetas}
          clientes={clientes}
          recetaIngredientes={recetaIngredientes}
          insumos={insumos}
          fechasVentasPeriodo={{
            desde: data.periodoMesDesdeStr,
            hasta: data.periodoMesHastaStr,
          }}
          onAbrirEnVentas={
            onAbrirVentasPeriodo
              ? () =>
                  onAbrirVentasPeriodo({
                    desde: data.periodoMesDesdeStr,
                    hasta: data.periodoMesHastaStr,
                    label: `Mes · ${data.mesLabel || ""}`,
                  })
              : undefined
          }
        />
      );
    }
    return (
      <div className="content">
        {detailHeader}
        <AnalyticsDetalleMes
          data={data}
          offsetMes={offsetMes}
          onPrev={() => setOffsetMes((o) => o - 1)}
          onNext={() => setOffsetMes((o) => (o < 0 ? o + 1 : o))}
          onIrActual={() => setOffsetMes(0)}
          onDrill={setDrill}
          onAbrirVentasPeriodo={onAbrirVentasPeriodo}
        />
      </div>
    );
  }

  if (vista === "detalle-anio") {
    if (cargandoHistorico) {
      return historicoLoadingView(data.anioLabel || "ese año");
    }
    if (drill?.tipo) {
      return (
        <AnalyticsDrilldown
          drill={drill}
          onBack={() => setDrill(null)}
          periodLabel={`Año · ${data.anioLabel || ""}`}
          ventasPeriodo={data.ventasPeriodoAnio || []}
          data={data}
          recetas={recetas}
          clientes={clientes}
          recetaIngredientes={recetaIngredientes}
          insumos={insumos}
          fechasVentasPeriodo={{
            desde: data.periodoAnioDesdeStr,
            hasta: data.periodoAnioHastaStr,
          }}
          onAbrirEnVentas={
            onAbrirVentasPeriodo
              ? () =>
                  onAbrirVentasPeriodo({
                    desde: data.periodoAnioDesdeStr,
                    hasta: data.periodoAnioHastaStr,
                    label: `Año · ${data.anioLabel || ""}`,
                  })
              : undefined
          }
        />
      );
    }
    return (
      <div className="content">
        {detailHeader}
        <AnalyticsDetalleAnio
          data={data}
          offsetAnio={offsetAnio}
          onPrev={() => setOffsetAnio((o) => o - 1)}
          onNext={() => setOffsetAnio((o) => (o < 0 ? o + 1 : o))}
          onIrActual={() => setOffsetAnio(0)}
          onDrill={setDrill}
          onAbrirVentasPeriodo={onAbrirVentasPeriodo}
        />
      </div>
    );
  }

  return null;
}

export default memo(Analytics);
