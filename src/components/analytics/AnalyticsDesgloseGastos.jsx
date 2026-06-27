/**
 * Lista de gastos del negocio en un período (fijos prorrateados + variable/puntual).
 */
import { fmt } from "../../lib/format";

export default function AnalyticsDesgloseGastos({
  titulo = "Gastos del negocio",
  items = [],
  total,
  hint,
}) {
  const suma =
    total != null
      ? total
      : items.reduce((s, row) => s + (row.importe || 0), 0);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{titulo}</span>
      </div>
      {hint && (
        <p
          className="analytics-kpi-sub"
          style={{ margin: "0 0 12px", lineHeight: 1.4 }}
        >
          {hint}
        </p>
      )}
      {items.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">💸</div>
          <p>No hay gastos en este período.</p>
        </div>
      ) : (
        <>
          <div className="analytics-list">
            {items.map((row) => (
              <div
                key={row.id ?? `${row.nombre}-${row.detalle}`}
                className="analytics-item"
              >
                <div className="analytics-item-main">
                  <div className="analytics-item-title">
                    {row.nombre}
                    <span
                      style={{
                        marginLeft: 6,
                        fontWeight: 400,
                        opacity: 0.85,
                      }}
                    >
                      ({row.tipoLabel || row.tipo})
                    </span>
                  </div>
                  {row.detalle && (
                    <div className="analytics-item-sub">{row.detalle}</div>
                  )}
                </div>
                <span
                  className="stat-value"
                  style={{ fontSize: 15, color: "var(--danger)" }}
                >
                  {fmt(row.importe)}
                </span>
              </div>
            ))}
          </div>
          <div
            className="analytics-resultado-line analytics-resultado-line--total"
            style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}
          >
            <span className="analytics-resultado-line-label">Total gastos</span>
            <span
              className="analytics-resultado-line-value"
              style={{ color: "var(--danger)" }}
            >
              {fmt(suma)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
