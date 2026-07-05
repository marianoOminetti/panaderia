import { fmt } from "../../lib/format";

export default function VentasSepararModal({
  open,
  onClose,
  preview,
  onConfirm,
  confirming = false,
}) {
  if (!open || !preview) return null;

  const handleClose = () => {
    if (confirming) return;
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ventas-separar-title"
      >
        <p id="ventas-separar-title" className="modal-title">
          Separar ventas
        </p>
        <p className="form-hint" style={{ marginBottom: 12 }}>
          Se restaurarán{" "}
          <strong>
            {preview.cantidadVisitas} visita
            {preview.cantidadVisitas !== 1 ? "s" : ""}
          </strong>{" "}
          como estaban antes de unificar. Los montos y fechas no cambian.
        </p>

        <div className="ventas-unificar-secciones">
          {preview.visitas.map((visita) => (
            <div
              key={visita.transaccionId}
              className="ventas-unificar-seccion"
            >
              <div className="ventas-unificar-seccion-fecha">{visita.fechaLabel}</div>
              <ul className="cliente-historial-productos">
                {visita.items.map((item, idx) => (
                  <li
                    key={`${visita.transaccionId}-${idx}`}
                    className="cliente-historial-linea"
                  >
                    <span className="cliente-historial-emoji">
                      {item.receta?.emoji || "🍞"}
                    </span>
                    <span className="cliente-historial-nombre">
                      {item.nombre} × {item.cantidad || 0}
                    </span>
                    <span className="cliente-historial-precio">
                      {fmt(item.monto)}
                    </span>
                  </li>
                ))}
              </ul>
              <div
                style={{
                  textAlign: "right",
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                Total {fmt(visita.total)}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
            marginBottom: 16,
            fontSize: 16,
            fontWeight: 600,
          }}
        >
          <span>Total</span>
          <span>{fmt(preview.total)}</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            style={{ flex: 1 }}
            onClick={handleClose}
            disabled={confirming}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => void onConfirm()}
            disabled={confirming}
          >
            {confirming ? "Separando…" : "Separar ventas"}
          </button>
        </div>
      </div>
    </div>
  );
}
