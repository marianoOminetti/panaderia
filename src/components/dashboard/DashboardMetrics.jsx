import { useState, useCallback } from "react";
import { fmt } from "../../lib/format";

const STORAGE_KEY = "panaderia_dashboard_ocultar_datos";

function readOcultarDatos() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function IconOjo({ oculto, className }) {
  return (
    <span className={className} aria-hidden>
      {oculto ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </span>
  );
}

function DashboardMetrics({
  ingresoHoy,
  debeTotal,
  margenHoy,
}) {
  const [datosOcultos, setDatosOcultos] = useState(() => readOcultarDatos());

  const toggleOcultar = useCallback(() => {
    setDatosOcultos((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const mask = datosOcultos ? "••••••" : null;
  const ventasVal = mask ?? fmt(ingresoHoy);
  const debeVal = mask ?? fmt(debeTotal);
  const margenVal = mask ?? fmt(margenHoy);

  return (
    <>
      <p className="page-title">Hola 👋</p>
      <p className="page-subtitle">{fechaHoy}</p>

      <div className="dashboard-metrics">
        <div className="dashboard-metric-main">
          <div className="dashboard-metric-label">Ventas hoy</div>
          <div className="dashboard-metric-value-row">
            <div className="dashboard-metric-value">{ventasVal}</div>
            <button
              type="button"
              className="dashboard-metrics-toggle"
              onClick={toggleOcultar}
              title={datosOcultos ? "Mostrar datos" : "Ocultar datos"}
              aria-label={datosOcultos ? "Mostrar datos" : "Ocultar datos"}
            >
              <IconOjo oculto={datosOcultos} className="dashboard-metrics-toggle-icon" />
            </button>
          </div>
        </div>
        {debeTotal > 0 && (
          <div className="dashboard-metric-row">
            <div className="dashboard-metric-mini" style={{ color: "var(--accent)" }}>
              <span className="dashboard-metric-mini-val">{debeVal}</span>
              <span className="dashboard-metric-mini-lbl">por cobrar</span>
            </div>
          </div>
        )}

        <div className="dashboard-metric-margen">
          <div className="dashboard-metric-label">Margen hoy</div>
          <div className="dashboard-metric-value dashboard-metric-value-sm">
            {margenVal}
          </div>
        </div>
      </div>
    </>
  );
}

export default DashboardMetrics;
