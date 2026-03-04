import { fmt } from "../../lib/format";
import { agruparVentas, totalDebeEnGrupo } from "../../lib/agrupadores";

function formatRelDia(d, hoyDate) {
  if (!d || Number.isNaN(d.getTime())) return "";
  const diffMs = hoyDate.getTime() - d.getTime();
  const dias = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias <= 7) return `hace ${dias} días`;
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

/** Calcula clientes con deuda a partir de ventas con estado_pago === "debe" */
export function computeClientesDeuda(ventas) {
  const deudaPorCliente = new Map();
  for (const v of (ventas || []).filter((x) => x.estado_pago === "debe")) {
    const clienteId = v.cliente_id || "__sin_cliente__";
    const prev =
      deudaPorCliente.get(clienteId) || {
        cliente_id: v.cliente_id,
        total: 0,
        ultimaFecha: null,
      };
    const monto =
      v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0);
    prev.total += monto;
    const refFecha = v.fecha || v.created_at;
    if (refFecha) {
      const d = new Date(refFecha);
      if (!Number.isNaN(d.getTime()) && (!prev.ultimaFecha || d > prev.ultimaFecha))
        prev.ultimaFecha = d;
    }
    deudaPorCliente.set(clienteId, prev);
  }
  const clientesDeuda = Array.from(deudaPorCliente.values())
    .filter((c) => c.total > 0.01)
    .sort((a, b) => b.total - a.total);
  const totalDeuda = clientesDeuda.reduce((s, c) => s + c.total, 0);
  return { clientesDeuda, totalDeuda };
}

export default function VentasList({
  ventas,
  hoy,
  recetas,
  clientes,
  gruposConDeuda = [],
  totalDeuda,
  eliminarVenta,
  abrirEditar,
  deletingId,
}) {
  const hoyDate = new Date(hoy);
  const grupos = agruparVentas(ventas || []);

  return (
    <>
      {gruposConDeuda.length > 0 && (
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
            <strong style={{ color: "var(--accent)" }}>
              {fmt(totalDeuda)}
            </strong>{" "}
            por cobrar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {gruposConDeuda.map((grupo) => {
              const cli =
                (clientes || []).find((c) => c.id === grupo.cliente_id) || null;
              const nombre = cli?.nombre || "Consumidor final";
              const refFecha = grupo.rawItems?.[0]?.fecha || grupo.rawItems?.[0]?.created_at;
              const fechaDate = refFecha ? new Date(refFecha) : null;
              const rel = formatRelDia(fechaDate, hoyDate);
              const monto = totalDebeEnGrupo(grupo);
              return (
                <button
                  key={grupo.key}
                  type="button"
                  onClick={() => abrirEditar(grupo)}
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
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
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

      {ventas.length > 0 && (
        <>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title">Ventas recientes</span>
          </div>
          {grupos.map((grupo) => {
            const cliente = (clientes || []).find(
              (c) => c.id === grupo.cliente_id,
            );
            const ejemplo =
              (grupo.rawItems && grupo.rawItems[0]) || grupo.items[0];
            let fechaHoraTxt = "";
            let horaTxt = "";
            if (ejemplo) {
              const fechaBase =
                ejemplo.created_at ||
                (ejemplo.fecha && `${ejemplo.fecha}T00:00:00`);
              if (fechaBase) {
                const d = new Date(fechaBase);
                if (!Number.isNaN(d.getTime())) {
                  const esHoy = ejemplo.fecha === hoy;
                  const hora = d.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  horaTxt = `${hora} hs`;
                  const diaTxt = esHoy
                    ? "Hoy"
                    : d.toLocaleDateString("es-AR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      });
                  fechaHoraTxt = `${diaTxt} · ${horaTxt}`;
                }
              }
            }
            const medio = ejemplo?.medio_pago || "efectivo";
            const estado = ejemplo?.estado_pago || "pagado";
            const medioTxt =
              medio === "transferencia"
                ? "Transferencia"
                : medio === "debito"
                  ? "Débito"
                  : medio === "credito"
                    ? "Crédito"
                    : "Efectivo";

            return (
              <div
                key={grupo.key}
                className="card venta-card"
                onClick={() => abrirEditar(grupo)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrirEditar(grupo);
                  }
                }}
              >
                <div className="venta-grupo-cliente">
                  Cliente: {cliente?.nombre || "Consumidor final"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span>{fechaHoraTxt || horaTxt}</span>
                  <span>
                    <span style={{ marginRight: 8 }}>{medioTxt}</span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        background:
                          estado === "debe"
                            ? "rgba(214,69,69,0.08)"
                            : "rgba(74,124,89,0.08)",
                        color:
                          estado === "debe"
                            ? "var(--danger)"
                            : "var(--green)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {estado === "debe" ? "DEBE" : "Pagado"}
                    </span>
                  </span>
                </div>
                {grupo.items.map((v, vi) => {
                  const r = recetas.find((r2) => r2.id === v.receta_id);
                  return (
                    <div
                      key={v.id || `${grupo.key}-${v.receta_id}-${vi}`}
                      className="venta-item venta-item-simple"
                    >
                      <span className="venta-emoji">{r?.emoji || "🍞"}</span>
                      <span className="venta-nombre-simple">
                        {(r?.nombre || "—").toLowerCase()} x{v.cantidad}
                      </span>
                    </div>
                  );
                })}
                <div className="venta-grupo-total">
                  Total: {fmt(grupo.total)}
                </div>
                <div className="venta-grupo-actions">
                  <button
                    className="btn-venta-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirEditar(grupo);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                      }
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-venta-action btn-venta-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarVenta(grupo);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                      }
                    }}
                    disabled={
                      deletingId === (grupo.key || grupo.rawItems?.[0]?.id)
                    }
                  >
                    {deletingId ===
                    (grupo.key || grupo.rawItems?.[0]?.id)
                      ? "…"
                      : "Eliminar"}
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </>
  );
}
