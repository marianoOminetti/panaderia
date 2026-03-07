/**
 * Contenedor de Analytics: vista resumen o detalle (Hoy, Semana, Mes).
 * Navegación entre períodos en detalle Semana y Mes.
 */
import { useState } from "react";
import { useAnalyticsData } from "../../hooks/useAnalyticsData";
import AnalyticsResumen from "./AnalyticsResumen";
import AnalyticsDetalleHoy from "./AnalyticsDetalleHoy";
import AnalyticsDetalleSemana from "./AnalyticsDetalleSemana";
import AnalyticsDetalleMes from "./AnalyticsDetalleMes";

export default function Analytics({
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  gastosFijos,
}) {
  const [vista, setVista] = useState("resumen");
  const [offsetDia, setOffsetDia] = useState(0);
  const [offsetSemana, setOffsetSemana] = useState(0);
  const [offsetMes, setOffsetMes] = useState(0);

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
        />
      </div>
    );
  }

  if (vista === "detalle-mes") {
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
        />
      </div>
    );
  }

  return null;
}
