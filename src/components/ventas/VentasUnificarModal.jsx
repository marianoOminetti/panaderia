import { useState } from "react";
import { fmt } from "../../lib/format";
import { SearchableSelect } from "../ui";
import { buildShareDataUnificado } from "../../lib/unificarVentas";

const MEDIOS_PAGO = [
  { value: "efectivo", label: "💵 Efectivo" },
  { value: "transferencia", label: "📱 Transferencia" },
  { value: "debito", label: "💳 Débito" },
  { value: "credito", label: "💳 Crédito" },
];

function ResumenItems({ resumen }) {
  if (resumen.seccionesPorFecha?.length) {
    return (
      <div className="ventas-unificar-secciones">
        {resumen.seccionesPorFecha.map((sec) => (
          <div key={sec.fechaDia} className="ventas-unificar-seccion">
            <div className="ventas-unificar-seccion-fecha">{sec.fechaLabel}</div>
            <ul className="cliente-historial-productos">
              {sec.items.map((item, idx) => (
                <li
                  key={`${sec.fechaDia}-${item.receta_id}-${idx}`}
                  className="cliente-historial-linea"
                >
                  <span className="cliente-historial-emoji">
                    {item.receta?.emoji || "🍞"}
                  </span>
                  <span className="cliente-historial-nombre">
                    {item.nombre} × {item.cantidad || 0}
                  </span>
                  <span className="cliente-historial-precio">
                    {fmt(item._lineTotal)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className="cliente-historial-productos">
      {resumen.items.map((item, idx) => (
        <li key={`${item.receta_id}-${idx}`} className="cliente-historial-linea">
          <span className="cliente-historial-emoji">{item.receta?.emoji || "🍞"}</span>
          <span className="cliente-historial-nombre">
            {item.nombre} × {item.cantidad || 0}
          </span>
          <span className="cliente-historial-precio">{fmt(item._lineTotal)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function VentasUnificarModal({
  open,
  onClose,
  clienteNombre,
  resumen,
  onConfirm,
  confirming = false,
}) {
  const [marcarPagado, setMarcarPagado] = useState(false);
  const [medioPago, setMedioPago] = useState("efectivo");

  if (!open || !resumen) return null;

  const esDebe = resumen.estadoPago === "debe";

  const handleClose = () => {
    if (confirming) return;
    setMarcarPagado(false);
    setMedioPago("efectivo");
    onClose();
  };

  const handleConfirm = async () => {
    await onConfirm({
      marcarPagado: esDebe && marcarPagado,
      medioPago,
    });
  };

  const sharePreview = buildShareDataUnificado({ clienteNombre, resumen });

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ventas-unificar-title"
      >
        <p id="ventas-unificar-title" className="modal-title">
          Unificar ventas
        </p>
        <p className="form-hint" style={{ marginBottom: 12 }}>
          {clienteNombre} ·{" "}
          <span
            className={
              esDebe
                ? "cliente-historial-badge cliente-historial-badge--deuda"
                : "cliente-historial-badge cliente-historial-badge--entregado"
            }
            style={{ display: "inline-block" }}
          >
            {esDebe ? "Debe" : "Pagado"}
          </span>
        </p>

        <ResumenItems resumen={resumen} />

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
          <span>{fmt(resumen.total)}</span>
        </div>

        {esDebe && (
          <div className="form-group">
            <label
              className="form-label"
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <input
                type="checkbox"
                checked={marcarPagado}
                onChange={(e) => setMarcarPagado(e.target.checked)}
                disabled={confirming}
              />
              Marcar como pagado al unificar
            </label>
            {marcarPagado && (
              <div style={{ marginTop: 8 }}>
                <label className="form-label">Medio de pago</label>
                <SearchableSelect
                  options={MEDIOS_PAGO}
                  value={medioPago}
                  onChange={setMedioPago}
                  placeholder="Seleccionar medio"
                />
              </div>
            )}
          </div>
        )}

        <p className="form-hint" style={{ marginBottom: 16 }}>
          Los montos y promos de cada venta se mantienen.{" "}
          {sharePreview.multipleFechas
            ? "El ticket mostrará cada día por separado."
            : ""}
        </p>

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
            onClick={() => void handleConfirm()}
            disabled={confirming}
          >
            {confirming ? "Unificando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
