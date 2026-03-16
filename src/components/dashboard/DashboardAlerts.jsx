/**
 * Panel de alertas del Dashboard: grupos con deuda, alertas stock por ventas, pedidos próximos.
 * Stock bajo y margen bajo se muestran en Stock y Recetas respectivamente.
 * Datos derivados vienen de useDashboardAlerts (Dashboard.jsx); este componente solo presenta y navega.
 */
import { fmt, fmtStock } from "../../lib/format";
import { totalDebeEnGrupo } from "../../lib/agrupadores";

function formatRelDia(d, hoyDate) {
  if (!d || Number.isNaN(d.getTime())) return "";
  const diffMs = hoyDate.getTime() - d.getTime();
  const dias = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias <= 7) return `hace ${dias} días`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function DashboardAlerts({
  pedidosHoyCount,
  pedidosManianaCountResumen,
  gruposConDeuda = [],
  totalDeuda = 0,
  pedidosAgrupadosProximos,
  pedidosPasadoCount,
  pedidosList,
  alertasPedidosManiana,
  pedidosManianaPorReceta,
  clientes,
  stock,
  onNavigate,
  onOpenCargarProduccion,
  onOpenGrupoDeuda,
}) {
  const hoyDate = new Date();

  return (
    <>
      {(gruposConDeuda?.length || 0) > 0 && (
        <div className="card dashboard-alert" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-title">⚠️ Clientes con deuda</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            {gruposConDeuda.length} venta
            {gruposConDeuda.length > 1 ? "s" : ""} ·{" "}
            <strong style={{ color: "var(--accent)" }}>{fmt(totalDeuda)}</strong> por cobrar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {gruposConDeuda.map((grupo) => {
              const cli = (clientes || []).find((c) => c.id === grupo.cliente_id) || null;
              const nombre = cli?.nombre || "Consumidor final";
              const refFecha = grupo.rawItems?.[0]?.fecha || grupo.rawItems?.[0]?.created_at;
              const fechaDate = refFecha ? new Date(refFecha) : null;
              const rel = formatRelDia(fechaDate, hoyDate);
              const monto = totalDebeEnGrupo(grupo);
              return (
                <button
                  key={grupo.key}
                  type="button"
                  onClick={() => onOpenGrupoDeuda?.(grupo)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    width: "100%",
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{nombre}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Venta {rel || ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--accent)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {fmt(monto)}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 2,
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        background: "rgba(214,69,69,0.08)",
                        color: "var(--danger)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      DEBE
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pedidosAgrupadosProximos.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">
              Pedidos próximos 3 días
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              padding: "0 16px 8px",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>Hoy</div>
              <div>{pedidosHoyCount} pedido(s)</div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Mañana</div>
              <div>{pedidosManianaCountResumen} pedido(s)</div>
            </div>
            <div>
              <div style={{ fontWeight: 600 }}>Pasado</div>
              <div>{pedidosPasadoCount} pedido(s)</div>
            </div>
          </div>
          <div>
            {pedidosAgrupadosProximos.slice(0, 5).map((grupo) => {
              const cliente = (clientes || []).find(
                (c) => c.id === grupo.cliente_id,
              );
              let fechaLabel = grupo.fecha_entrega || "";
              try {
                if (grupo.fecha_entrega) {
                  fechaLabel = new Date(
                    grupo.fecha_entrega,
                  ).toLocaleDateString("es-AR");
                }
              } catch {
                // ignore
              }
              const unidades = (grupo.items || []).reduce(
                (s, it) => s + (it.cantidad || 0),
                0,
              );
              const estado = grupo.estado || "pendiente";
              const estadoLabel =
                estado === "en_preparacion"
                  ? "En preparación"
                  : estado === "listo"
                  ? "Listo"
                  : estado === "entregado"
                  ? "Entregado"
                  : "Pendiente";
              return (
                <div
                  key={grupo.key}
                  className="venta-item venta-item-simple"
                  style={{ padding: "10px 16px" }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>
                      {fechaLabel} ·{" "}
                      {cliente?.nombre || "Consumidor final"}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {unidades} u · {estadoLabel}
                    </div>
                  </div>
                </div>
              );
            })}
            {pedidosAgrupadosProximos.length > 5 && (
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  padding: "0 16px 8px",
                }}
              >
                +{pedidosAgrupadosProximos.length - 5} pedido(s) más
              </p>
            )}
          </div>
        </div>
      )}

      {pedidosAgrupadosProximos.length === 0 &&
        pedidosList.length > 0 && (
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                Pedidos próximos 3 días
              </span>
            </div>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                padding: "12px 16px",
              }}
            >
              No hay pedidos para los próximos 3 días.
            </p>
          </div>
        )}

      {alertasPedidosManiana.length > 0 && (
        <div
          className="card dashboard-alert"
          onClick={() => onNavigate?.("stock")}
        >
          <div className="card-header">
            <span className="card-title">
              ⚠️ Pedidos de mañana sin stock
            </span>
            <span
              className="card-link"
              style={{ cursor: "pointer" }}
            >
              Ver en Stock →
            </span>
          </div>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
          >
            {alertasPedidosManiana.slice(0, 6).map((r) => {
              const pedidosCant =
                pedidosManianaPorReceta[r.id] || 0;
              const stockActual = (stock || {})[r.id] ?? 0;
              return (
                <span
                  key={r.id}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    background: "var(--surface)",
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                  }}
                >
                  {(r.emoji || "🥐")} {r.nombre} · pedidos{" "}
                  {pedidosCant} · stock {fmtStock(stockActual)}
                </span>
              );
            })}
            {alertasPedidosManiana.length > 6 && (
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                }}
              >
                +{alertasPedidosManiana.length - 6} más
              </span>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardAlerts;

