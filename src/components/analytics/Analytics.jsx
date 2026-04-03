/**
 * Contenedor de Analytics: vista resumen o detalle (Hoy, Semana, Mes).
 * Navegación entre períodos en detalle Semana y Mes.
 */
import { useState, useEffect } from "react";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import AnalyticsResumen from "./AnalyticsResumen";
import AnalyticsDetalleHoy from "./AnalyticsDetalleHoy";
import AnalyticsDetalleSemana from "./AnalyticsDetalleSemana";
import AnalyticsDetalleMes from "./AnalyticsDetalleMes";
import AnalyticsDrilldown from "./AnalyticsDrilldown";

export default function Analytics({
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  gastosFijos,
  onAbrirVentasPeriodo,
}) {
  const [vista, setVista] = useState("resumen");
  const [offsetDia, setOffsetDia] = useState(0);
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [offsetMes, setOffsetMes] = useState(0);
  /** Detalle ampliado mismo período: { tipo: string } */
  const [drill, setDrill] = useState(null);

  useEffect(() => {
    setDrill(null);
  }, [vista, offsetSemana, offsetMes]);

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
    }
  };

  const handleVolver = () => {
    setVista("resumen");
  };

  if (vista === "resumen") {
    return (
      <div className="content">
        <p className="page-title">Analytics</p>
        <p className="page-subtitle">
          Hoy · Semana · Mes · tocá para ver el detalle
        </p>
        <AnalyticsResumen data={data} onVerDetalle={handleVerDetalle} />
      </div>
    );
  }

  if (vista === "detalle-hoy") {
    return (
      <div className="content">
        <div
          className="analytics-detail-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className="screen-back"
            onClick={handleVolver}
          >
            ← Volver
          </button>
          <span className="page-title" style={{ flex: 1, margin: 0 }}>
            Analytics
          </span>
        </div>
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
        <div
          className="analytics-detail-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className="screen-back"
            onClick={handleVolver}
          >
            ← Volver
          </button>
          <span className="page-title" style={{ flex: 1, margin: 0 }}>
            Analytics
          </span>
        </div>
        <AnalyticsDetalleSemana
          data={data}
          offsetSemana={offsetSemana}
          onPrev={() => setOffsetSemana((o) => o - 1)}
          onNext={() =>
            setOffsetSemana((o) => (o < 0 ? o + 1 : o))
          }
          onIrActual={() => setOffsetSemana(0)}
          onDrill={setDrill}
          onAbrirVentasPeriodo={onAbrirVentasPeriodo}
        />
      </div>
    );
  }

  if (vista === "detalle-mes") {
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
        <div
          className="analytics-detail-header"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className="screen-back"
            onClick={handleVolver}
          >
            ← Volver
          </button>
          <span className="page-title" style={{ flex: 1, margin: 0 }}>
            Analytics
          </span>
        </div>
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

  return null;
}
