import { forwardRef } from "react";
import { fmt } from "../../lib/format";

const ticketStyles = {
  container: {
    width: 320,
    backgroundColor: "#ffffff",
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  header: {
    textAlign: "center",
    paddingBottom: 16,
    borderBottom: "2px dashed #e0e0e0",
    marginBottom: 16,
  },
  logo: {
    fontSize: 32,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a1a",
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  section: {
    paddingBottom: 12,
    borderBottom: "1px dashed #e0e0e0",
    marginBottom: 12,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    fontSize: 14,
  },
  itemLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  emoji: {
    fontSize: 18,
  },
  itemName: {
    color: "#333",
  },
  itemQty: {
    color: "#666",
    fontSize: 12,
    marginLeft: 4,
  },
  itemPrice: {
    fontWeight: 500,
    color: "#1a1a1a",
    textAlign: "right",
    minWidth: 70,
  },
  totals: {
    marginTop: 8,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  totalFinal: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 18,
    fontWeight: 700,
    color: "#1a1a1a",
    marginTop: 8,
    paddingTop: 8,
    borderTop: "2px solid #1a1a1a",
  },
  footer: {
    marginTop: 16,
    paddingTop: 12,
    borderTop: "1px dashed #e0e0e0",
  },
  footerRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  badge: {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
  },
  badgePagado: {
    backgroundColor: "rgba(74,124,89,0.15)",
    color: "#4a7c59",
  },
  badgeDebe: {
    backgroundColor: "rgba(214,69,69,0.15)",
    color: "#d64545",
  },
  pedidoInfo: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pedidoLabel: {
    fontSize: 11,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    marginBottom: 2,
  },
  pedidoValue: {
    fontSize: 14,
    fontWeight: 500,
    color: "#1a1a1a",
  },
  notes: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
    marginTop: 8,
    padding: "8px 12px",
    backgroundColor: "#fffbeb",
    borderRadius: 6,
    borderLeft: "3px solid #f59e0b",
  },
};

const TicketPreview = forwardRef(function TicketPreview({ type, data }, ref) {
  const isVenta = type === "venta";
  const isPedido = type === "pedido";

  const formatFecha = (fecha) => {
    if (!fecha) return "";
    try {
      const d = new Date(fecha);
      return d.toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return fecha;
    }
  };

  const formatHora = (fecha) => {
    if (!fecha) return "";
    try {
      const d = new Date(fecha);
      return d.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  };

  const medioLabel = (medio) => {
    if (medio === "transferencia") return "Transferencia";
    if (medio === "debito") return "Débito";
    if (medio === "credito") return "Crédito";
    return "Efectivo";
  };

  const estadoLabel = (estado) => {
    if (estado === "en_preparacion") return "En preparación";
    if (estado === "listo") return "Listo";
    if (estado === "entregado") return "Entregado";
    return "Pendiente";
  };

  return (
    <div ref={ref} style={ticketStyles.container}>
      <div style={ticketStyles.header}>
        <div style={ticketStyles.logo}>🥐</div>
        <h2 style={ticketStyles.title}>PANADERÍA SG</h2>
        <div style={ticketStyles.subtitle}>
          {isVenta && (
            <>
              {formatFecha(data.fecha || data.created_at)}
              {data.created_at && ` · ${formatHora(data.created_at)}`}
            </>
          )}
          {isPedido && <>Pedido confirmado</>}
        </div>
      </div>

      {isPedido && (
        <div style={ticketStyles.pedidoInfo}>
          <div style={{ marginBottom: 8 }}>
            <div style={ticketStyles.pedidoLabel}>Fecha de entrega</div>
            <div style={ticketStyles.pedidoValue}>
              {formatFecha(data.fecha_entrega)}
              {data.hora_entrega && ` · ${data.hora_entrega}`}
            </div>
          </div>
          <div>
            <div style={ticketStyles.pedidoLabel}>Estado</div>
            <div style={ticketStyles.pedidoValue}>
              {estadoLabel(data.estado)}
            </div>
          </div>
        </div>
      )}

      <div style={ticketStyles.section}>
        {(data.items || []).map((item, idx) => (
          <div key={item.receta_id || idx} style={ticketStyles.item}>
            <div style={ticketStyles.itemLeft}>
              <span style={ticketStyles.emoji}>
                {item.receta?.emoji || "🍞"}
              </span>
              <span style={ticketStyles.itemName}>
                {item.receta?.nombre || item.nombre || "Producto"}
                <span style={ticketStyles.itemQty}> x{item.cantidad}</span>
              </span>
            </div>
            <span style={ticketStyles.itemPrice}>
              {fmt((item.precio_unitario || 0) * (item.cantidad || 0))}
            </span>
          </div>
        ))}
      </div>

      <div style={ticketStyles.totals}>
        {data.subtotal != null && data.subtotal !== data.total && (
          <div style={ticketStyles.totalRow}>
            <span>Subtotal</span>
            <span>{fmt(data.subtotal)}</span>
          </div>
        )}
        {data.descuento > 0 && (
          <div style={ticketStyles.totalRow}>
            <span>Descuento</span>
            <span style={{ color: "#4a7c59" }}>-{fmt(data.descuento)}</span>
          </div>
        )}
        {isPedido && data.senia > 0 && (
          <>
            <div style={ticketStyles.totalRow}>
              <span>Seña</span>
              <span style={{ color: "#4a7c59" }}>-{fmt(data.senia)}</span>
            </div>
            <div style={ticketStyles.totalRow}>
              <span>Saldo a pagar</span>
              <span>{fmt((data.total || 0) - (data.senia || 0))}</span>
            </div>
          </>
        )}
        <div style={ticketStyles.totalFinal}>
          <span>TOTAL</span>
          <span>{fmt(data.total)}</span>
        </div>
      </div>

      {isPedido && data.notas && (
        <div style={ticketStyles.notes}>📝 {data.notas}</div>
      )}

      <div style={ticketStyles.footer}>
        {data.cliente && (
          <div style={ticketStyles.footerRow}>
            <span>Cliente</span>
            <span style={{ fontWeight: 500 }}>{data.cliente}</span>
          </div>
        )}
        {isVenta && (
          <>
            <div style={ticketStyles.footerRow}>
              <span>Medio de pago</span>
              <span>{medioLabel(data.medio_pago)}</span>
            </div>
            <div
              style={{
                ...ticketStyles.footerRow,
                marginTop: 8,
                justifyContent: "flex-end",
              }}
            >
              <span
                style={{
                  ...ticketStyles.badge,
                  ...(data.estado_pago === "debe"
                    ? ticketStyles.badgeDebe
                    : ticketStyles.badgePagado),
                }}
              >
                {data.estado_pago === "debe" ? "DEBE" : "PAGADO"}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
});

export default TicketPreview;
