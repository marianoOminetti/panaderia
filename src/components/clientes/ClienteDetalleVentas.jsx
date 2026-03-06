import { fmt } from "../../lib/format";

function ClienteDetalleVentas({ ventasCliente, recetas }) {
  const vs = [...(ventasCliente || [])].sort((a, b) =>
    (a.fecha || "") > (b.fecha || "")
      ? -1
      : (a.fecha || "") < (b.fecha || "")
      ? 1
      : 0,
  );
  if (vs.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <span className="card-title">Historial de compras</span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
            padding: "12px 16px",
          }}
        >
          No hay compras registradas para este cliente.
        </p>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Historial de compras</span>
      </div>
      {vs.map((v) => {
        const receta = recetas.find((r) => r.id === v.receta_id);
        const totalLinea =
          v.total_final != null
            ? v.total_final
            : (v.precio_unitario || 0) * (v.cantidad || 0);
        let fechaLabel = v.fecha;
        try {
          if (v.fecha) {
            fechaLabel = new Date(v.fecha).toLocaleDateString("es-AR");
          }
        } catch {
          // ignore parse errors
        }
        return (
          <div key={v.id} className="venta-item">
            <div className="insumo-info" style={{ flex: 1 }}>
              <div className="insumo-nombre">
                {receta?.nombre || "Producto"}
              </div>
              <div className="insumo-detalle">
                {fechaLabel} · {v.cantidad} u
              </div>
            </div>
            <div className="insumo-precio">
              <div className="insumo-precio-value">
                {fmt(totalLinea)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ClienteDetalleVentas;
