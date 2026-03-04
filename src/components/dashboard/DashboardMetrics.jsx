import { fmt } from "../../lib/format";

function DashboardMetrics({
  ingresoHoy,
  unidadesHoy,
  debeTotal,
  resumenPlanSemanal,
}) {
  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <>
      <p className="page-title">Hola 👋</p>
      <p className="page-subtitle">{fechaHoy}</p>

      <div className="dashboard-metrics">
        <div className="dashboard-metric-main">
          <div className="dashboard-metric-label">Ventas hoy</div>
          <div className="dashboard-metric-value">
            {fmt(ingresoHoy)}
          </div>
        </div>
        <div className="dashboard-metric-row">
          <div className="dashboard-metric-mini">
            <span className="dashboard-metric-mini-val">
              {unidadesHoy}
            </span>
            <span className="dashboard-metric-mini-lbl">unidades</span>
          </div>
          {debeTotal > 0 && (
            <div
              className="dashboard-metric-mini"
              style={{ color: "var(--accent)" }}
            >
              <span className="dashboard-metric-mini-val">
                {fmt(debeTotal)}
              </span>
              <span className="dashboard-metric-mini-lbl">
                por cobrar
              </span>
            </div>
          )}
        </div>
        {resumenPlanSemanal && (
          <div
            className="dashboard-metric-plan"
            style={{ marginTop: 12, fontSize: 13 }}
          >
            <div
              className="dashboard-metric-label"
              style={{ marginBottom: 4 }}
            >
              Plan de producción semanal
            </div>
            <div>
              {resumenPlanSemanal.totalUnidades > 0 ? (
                <>
                  Esta semana producís{" "}
                  <strong>
                    {resumenPlanSemanal.totalUnidades}
                  </strong>{" "}
                  u, necesitás comprar{" "}
                  <strong>
                    {fmt(resumenPlanSemanal.totalCompra || 0)}
                  </strong>{" "}
                  en insumos.
                </>
              ) : (
                "Todavía no cargaste un plan de producción para esta semana."
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default DashboardMetrics;

