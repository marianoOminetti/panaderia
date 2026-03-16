import { fmt } from "../../lib/format";
import { agruparVentas } from "../../lib/agrupadores";

function ClienteDetalleVentas({ ventasCliente, recetas }) {
  const grupos = agruparVentas(ventasCliente || []);
  if (grupos.length === 0) {
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
      {grupos.map((grupo) => {
        const raw = grupo.rawItems?.[0] || grupo.items?.[0];
        let fechaLabel = raw?.fecha;
        try {
          if (raw?.fecha) {
            fechaLabel = new Date(raw.fecha).toLocaleDateString("es-AR");
          }
        } catch {
          // ignore parse errors
        }
        return (
          <div key={grupo.key} className="venta-transaction">
            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 8,
              }}
            >
              {fechaLabel}
            </div>
            {(grupo.rawItems || []).map((item) => {
              const receta = recetas?.find((r) => r.id === item.receta_id);
              return (
                <div
                  key={item.id}
                  className="venta-item venta-item-simple"
                >
                  <span className="venta-emoji">{receta?.emoji || "🍞"}</span>
                  <span className="venta-nombre-simple">
                    {(receta?.nombre || "Producto").toLowerCase()} x{item.cantidad}
                  </span>
                </div>
              );
            })}
            <div className="venta-grupo-total">Total: {fmt(grupo.total)}</div>
          </div>
        );
      })}
    </div>
  );
}

export default ClienteDetalleVentas;
