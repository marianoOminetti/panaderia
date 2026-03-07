import { FormInput, FormMoneyInput } from "../ui";

/**
 * Modal para registrar ingreso o egreso de un insumo.
 */
export default function InsumosMovModal({
  movInsumo,
  movTipo,
  movCantidad,
  setMovCantidad,
  movValor,
  setMovValor,
  movSaving,
  guardarMovimiento,
  onClose,
}) {
  if (!movInsumo) return null;
  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <span className="screen-title">
          {movTipo === "ingreso" ? "📥 Ingreso" : "📤 Egreso"} · {movInsumo.nombre}
        </span>
      </div>
      <div className="screen-content">
        <FormInput
          label={`Cantidad (${movInsumo.unidad || "g"})`}
          type="number"
          min={0}
          value={movCantidad}
          onChange={setMovCantidad}
          placeholder="Ej: 500"
          autoFocus
        />
        <FormMoneyInput
          label="Valor (opcional)"
          value={movValor}
          onChange={setMovValor}
          placeholder="Costo del movimiento"
        />
        <button
          className="btn-primary"
          onClick={guardarMovimiento}
          disabled={
            movSaving ||
            !movCantidad ||
            parseFloat(movCantidad) <= 0
          }
        >
          {movSaving
            ? "Guardando..."
            : movTipo === "ingreso"
              ? "Registrar ingreso"
              : "Registrar egreso"}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
