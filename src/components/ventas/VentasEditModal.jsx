import { fmt } from "../../lib/format";
import { SelectorCliente, SelectoresPago } from "./VentasSelectors";

const btnStyle = {
  width: 40,
  height: 40,
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--cream)",
  fontSize: 20,
  cursor: "pointer",
};
const btnStyleSmall = {
  width: 32,
  height: 32,
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "var(--cream)",
  fontSize: 16,
  cursor: "pointer",
};

export default function VentasEditModal({
  open,
  editGrupo,
  editForm,
  setEditForm,
  editCantidades,
  setEditCantidades,
  editItemsToAdd,
  editRecetaToAdd,
  setEditRecetaToAdd,
  editCantidadToAdd,
  setEditCantidadToAdd,
  recetas,
  clientes,
  insertCliente,
  showToast,
  editSaving,
  onGuardar,
  onAgregarProducto,
  onQuitarProducto,
  onClose,
}) {
  if (!open || !editGrupo) return null;

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <span className="screen-title">Editar venta</span>
      </div>
      <div className="screen-content">
        <SelectorCliente
          value={editForm.cliente_id}
          onChange={(v) => setEditForm((prev) => ({ ...prev, cliente_id: v }))}
          clientes={clientes}
          insertCliente={insertCliente}
          showToast={showToast}
        />
        <SelectoresPago
          medioPago={editForm.medio_pago}
          setMedioPago={(v) =>
            setEditForm((prev) => ({ ...prev, medio_pago: v }))
          }
          estadoPago={editForm.estado_pago}
          setEstadoPago={(v) =>
            setEditForm((prev) => ({ ...prev, estado_pago: v }))
          }
        />
        {editGrupo.rawItems.length === 1 ? (
          <div className="form-group">
            <label className="form-label">Cantidad</label>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <button
                onClick={() => {
                  const id = editGrupo.rawItems[0].id;
                  const fallback = editGrupo.rawItems[0].cantidad;
                  setEditCantidades((prev) => ({
                    ...prev,
                    [id]: Math.max(1, (prev[id] ?? fallback) - 1),
                  }));
                }}
                style={btnStyle}
              >
                −
              </button>
              <span
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: 24,
                  minWidth: 40,
                  textAlign: "center",
                }}
              >
                {editCantidades[editGrupo.rawItems[0].id] ??
                  editGrupo.rawItems[0].cantidad}
              </span>
              <button
                onClick={() => {
                  const id = editGrupo.rawItems[0].id;
                  const fallback = editGrupo.rawItems[0].cantidad;
                  setEditCantidades((prev) => ({
                    ...prev,
                    [id]: (prev[id] ?? fallback) + 1,
                  }));
                }}
                style={btnStyle}
              >
                +
              </button>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label">Cantidades</label>
            {editGrupo.rawItems.map((v) => {
              const r = recetas.find((r2) => r2.id === v.receta_id);
              return (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {r?.emoji} {r?.nombre}
                  </span>
                  <button
                    onClick={() =>
                      setEditCantidades((prev) => ({
                        ...prev,
                        [v.id]: Math.max(1, (prev[v.id] ?? v.cantidad) - 1),
                      }))
                    }
                    style={btnStyleSmall}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: "center" }}>
                    {editCantidades[v.id] ?? v.cantidad}
                  </span>
                  <button
                    onClick={() =>
                      setEditCantidades((prev) => ({
                        ...prev,
                        [v.id]: (prev[v.id] ?? v.cantidad) + 1,
                      }))
                    }
                    style={btnStyleSmall}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <div
          className="form-group"
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px dashed var(--border)",
          }}
        >
          <label className="form-label">Agregar producto</label>
          <select
            className="form-input"
            value={editRecetaToAdd}
            onChange={(e) => setEditRecetaToAdd(e.target.value)}
            style={{ marginBottom: 8 }}
          >
            <option value="">— Seleccionar</option>
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.emoji} {r.nombre} · {fmt(r.precio_venta || 0)}
              </option>
            ))}
          </select>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <label
              className="form-label"
              style={{ marginBottom: 0, flex: "0 0 auto" }}
            >
              Cantidad
            </label>
            <button
              onClick={() =>
                setEditCantidadToAdd(Math.max(1, editCantidadToAdd - 1))
              }
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--cream)",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              −
            </button>
            <span
              style={{
                minWidth: 28,
                textAlign: "center",
                fontWeight: 500,
              }}
            >
              {editCantidadToAdd}
            </span>
            <button
              onClick={() => setEditCantidadToAdd(editCantidadToAdd + 1)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--cream)",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              +
            </button>
            <button
              className="btn-primary"
              onClick={onAgregarProducto}
              disabled={!editRecetaToAdd}
              style={{ padding: "8px 16px", marginLeft: "auto" }}
            >
              Agregar
            </button>
          </div>
          {editItemsToAdd.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {editItemsToAdd.map((it, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span style={{ flex: 1 }}>
                    {it.receta?.emoji} {it.receta?.nombre} x{it.cantidad}
                  </span>
                  <span
                    style={{
                      color: "var(--green)",
                      fontWeight: 500,
                    }}
                  >
                    {fmt((it.receta?.precio_venta || 0) * it.cantidad)}
                  </span>
                  <button
                    onClick={() => onQuitarProducto(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      cursor: "pointer",
                      fontSize: 18,
                    }}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          className="btn-primary"
          onClick={onGuardar}
          disabled={editSaving}
        >
          {editSaving ? "Guardando…" : "Guardar"}
        </button>
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
