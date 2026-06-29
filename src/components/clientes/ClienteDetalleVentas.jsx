import { fmt } from "../../lib/format";
import { formatFechaLocal, formatFechaRelativa } from "../../lib/dates";
import { agruparVentas } from "../../lib/agrupadores";

const MEDIO_PAGO_LABEL = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
};

function ClienteDetalleVentas({
  ventasCliente,
  recetas,
  title = "Historial de compras",
  emptyMessage = "No hay compras registradas para este cliente.",
  style,
}) {
  const grupos = agruparVentas(ventasCliente || []);

  if (grupos.length === 0) {
    return (
      <div className="card" style={style}>
        <div className="card-header">
          <span className="card-title">{title}</span>
        </div>
        <p className="cliente-historial-empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card" style={style}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        <span className="card-meta">
          {grupos.length} visita{grupos.length !== 1 ? "s" : ""}
        </span>
      </div>
      {grupos.map((grupo) => {
        const raw = grupo.rawItems?.[0] || grupo.items?.[0];
        const fechaRaw = raw?.fecha ? String(raw.fecha).slice(0, 10) : null;
        const fechaRelativa = fechaRaw ? formatFechaRelativa(fechaRaw) : "Sin fecha";
        const fechaCompleta = fechaRaw ? formatFechaLocal(fechaRaw, { weekday: true }) : null;
        const tieneDeuda = grupo.rawItems?.some((v) => v.estado_pago === "debe");
        const medioPago = raw?.medio_pago;

        return (
          <div key={grupo.key} className="cliente-historial-item">
            <div className="cliente-historial-fecha">
              <span className="cliente-historial-fecha-principal">
                {fechaRelativa}
              </span>
              {fechaCompleta && fechaRelativa !== fechaCompleta && (
                <span className="cliente-historial-fecha-sec">
                  {fechaCompleta}
                </span>
              )}
              {tieneDeuda && (
                <span className="cliente-historial-badge cliente-historial-badge--deuda">
                  Debe
                </span>
              )}
            </div>
            <ul className="cliente-historial-productos">
              {(grupo.rawItems || []).map((item) => {
                const receta = recetas?.find((r) => r.id === item.receta_id);
                const linea =
                  item.total_final != null
                    ? item.total_final
                    : (item.precio_unitario || 0) * (item.cantidad || 0);
                return (
                  <li key={item.id} className="cliente-historial-linea">
                    <span className="cliente-historial-emoji">
                      {receta?.emoji || "🍞"}
                    </span>
                    <span className="cliente-historial-nombre">
                      {receta?.nombre || "Producto"} × {item.cantidad || 0}
                    </span>
                    <span className="cliente-historial-precio">{fmt(linea)}</span>
                  </li>
                );
              })}
            </ul>
            <div className="cliente-historial-pie">
              <span>
                {medioPago && MEDIO_PAGO_LABEL[medioPago]
                  ? MEDIO_PAGO_LABEL[medioPago]
                  : medioPago || ""}
              </span>
              <strong>Total {fmt(grupo.total)}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ClienteDetalleVentas;
