import { useState } from "react";
import { FormInput, FormTextarea } from "../ui";

function getCopy(type) {
  if (type === "insumo") {
    return {
      title: "Ajuste de stock de insumo",
      subtitle:
        "Cuando el stock de insumos no coincide con lo que tenés físicamente, hacé un ajuste a la baja. No registra compras ni consumo en producción.",
      warning:
        "Este ajuste solo corrige el stock físico de insumos. No se registra como compra ni producción.",
      itemLabel: "Insumo",
    };
  }
  return {
    title: "Ajuste de stock de producto",
    subtitle:
      "Cuando el stock cargado es mayor al real, hacé un ajuste a la baja. No registra ventas ni movimientos de dinero.",
    warning:
      "Este ajuste solo corrige el stock físico. No se registra como venta ni afecta tus ingresos.",
    itemLabel: "Producto",
  };
}

export default function StockAdjustModal({
  open,
  type = "producto",
  item,
  currentStock,
  unidad,
  onClose,
  onConfirm,
  saving,
}) {
  const [cantidad, setCantidad] = useState("");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  if (!open || !item) return null;

  const copy = getCopy(type);

  const handleChangeCantidad = (value) => {
    setCantidad(value);
    if (!value) {
      setError("Ingresá una cantidad a restar.");
      return;
    }
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) {
      setError("La cantidad a restar tiene que ser mayor a 0.");
      return;
    }
    if (currentStock != null && num > currentStock) {
      setError(`No podés restar más de ${currentStock} unidades.`);
      return;
    }
    setError("");
  };

  const handleConfirm = async () => {
    if (!cantidad) {
      setError("Ingresá una cantidad a restar.");
      return;
    }
    const num = parseFloat(cantidad);
    if (!Number.isFinite(num) || num <= 0) {
      setError("La cantidad a restar tiene que ser mayor a 0.");
      return;
    }
    if (currentStock != null && num > currentStock) {
      setError(`No podés restar más de ${currentStock} unidades.`);
      return;
    }
    try {
      await onConfirm({
        amount: num,
        reason: motivo || undefined,
      });
    } catch (e) {
      setError("No se pudo guardar el ajuste. Probá de nuevo.");
    }
  };

  const disabled =
    saving ||
    !cantidad ||
    !!error ||
    !Number.isFinite(parseFloat(cantidad)) ||
    parseFloat(cantidad) <= 0;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div className="screen-title">{copy.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {copy.subtitle}
          </div>
        </div>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Detalle del ajuste</span>
          </div>
          <FormInput
            label={copy.itemLabel}
            value={item.nombre || ""}
            onChange={() => {}}
            disabled
          />
          <FormInput
            label="Stock actual"
            value={
              currentStock != null
                ? `${currentStock} ${unidad || "u"}`
                : `0 ${unidad || "u"}`
            }
            onChange={() => {}}
            disabled
          />
          <FormInput
            label={`Cantidad a restar (${unidad || "u"})`}
            type="number"
            min={0}
            value={cantidad}
            onChange={handleChangeCantidad}
            placeholder="Ej: 3"
            autoFocus
          />
          <FormTextarea
            label="Motivo (opcional)"
            value={motivo}
            onChange={setMotivo}
            placeholder="Ej: carga duplicada, producto fallado, pérdida, etc."
            rows={3}
          />
          {error && (
            <p
              style={{
                fontSize: 13,
                color: "var(--danger)",
                marginTop: 4,
              }}
            >
              {error}
            </p>
          )}
          <div
            style={{
              marginTop: 12,
              padding: "8px 10px",
              borderRadius: 8,
              background: "rgba(120, 120, 120, 0.06)",
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {copy.warning}
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={handleConfirm}
          disabled={disabled}
        >
          {saving ? "Guardando..." : "Confirmar ajuste"}
        </button>
        <button
          className="btn-secondary"
          onClick={onClose}
          disabled={saving}
          style={{ marginTop: 8 }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

