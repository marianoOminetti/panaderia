import { useState } from "react";
import { fmt } from "../../lib/format";
import { usePedidoForm } from "../../hooks/usePedidoForm";
import { useClientes } from "../../hooks/useClientes";
import {
  FormInput,
  FormMoneyInput,
  SearchableSelect,
  DatePicker,
} from "../ui";

function PedidoFormModal({
  open,
  onClose,
  recetas,
  clientes,
  onRefresh,
  showToast,
}) {
  const { insertPedidos, insertCliente } = useClientes({
    onRefresh,
    showToast,
  });

  const [clienteSel, setClienteSel] = useState("");
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState("");
  const [nuevoClienteTel, setNuevoClienteTel] = useState("");
  const [creandoCliente, setCreandoCliente] = useState(false);
  const [modoNuevoCliente, setModoNuevoCliente] = useState(false);

  const {
    fechaEntrega,
    setFechaEntrega,
    recetaSel,
    setRecetaSel,
    cantidad,
    setCantidad,
    precio,
    setPrecio,
    items,
    senia,
    setSenia,
    saving,
    addItem,
    quitarItem,
    guardar,
    reset,
  } = usePedidoForm({
    recetas,
    clienteId: clienteSel || null,
    insertPedidos,
    showToast,
    onSuccess: () => {
      setClienteSel("");
      setModoNuevoCliente(false);
      setNuevoClienteNombre("");
      setNuevoClienteTel("");
      onClose();
    },
  });

  if (!open) return null;

  const handleGuardar = async () => {
    let finalClienteId = clienteSel;

    if (modoNuevoCliente) {
      if (!nuevoClienteNombre.trim()) {
        showToast?.("Ingresá el nombre del cliente");
        return;
      }
      setCreandoCliente(true);
      try {
        const created = await insertCliente(
          { nombre: nuevoClienteNombre.trim(), telefono: nuevoClienteTel },
          { skipToast: true, skipRefresh: true }
        );
        finalClienteId = created.id;
      } catch (err) {
        showToast?.("⚠️ Error al crear cliente");
        onRefresh?.();
        setCreandoCliente(false);
        return;
      }
      setCreandoCliente(false);
    }

    if (!finalClienteId) {
      showToast?.("Elegí o creá un cliente");
      return;
    }

    await guardar(finalClienteId);
  };

  const handleClose = () => {
    reset();
    setClienteSel("");
    setModoNuevoCliente(false);
    setNuevoClienteNombre("");
    setNuevoClienteTel("");
    onClose();
  };

  const clienteOptions = [
    { value: "", label: "Elegí un cliente" },
    ...clientes.map((c) => ({
      value: c.id,
      label: c.nombre + (c.telefono ? ` (${c.telefono})` : ""),
    })),
  ];

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={handleClose}>
          ← Volver
        </button>
        <span className="screen-title">Nuevo pedido</span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Cliente</span>
            <button
              type="button"
              className="card-link"
              onClick={() => {
                setModoNuevoCliente(!modoNuevoCliente);
                if (!modoNuevoCliente) setClienteSel("");
              }}
            >
              {modoNuevoCliente ? "Elegir existente" : "+ Nuevo cliente"}
            </button>
          </div>
          <div style={{ padding: "12px 16px" }}>
            {modoNuevoCliente ? (
              <>
                <FormInput
                  label="Nombre del cliente"
                  value={nuevoClienteNombre}
                  onChange={setNuevoClienteNombre}
                  placeholder="Ej: Juan Pérez"
                />
                <FormInput
                  label="Teléfono (opcional)"
                  value={nuevoClienteTel}
                  onChange={setNuevoClienteTel}
                  placeholder="Ej: 11-1234-5678"
                />
              </>
            ) : (
              <SearchableSelect
                options={clienteOptions}
                value={clienteSel}
                onChange={setClienteSel}
                placeholder="Buscar cliente..."
              />
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Datos del pedido</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            <DatePicker
              label="Fecha de entrega"
              value={fechaEntrega}
              onChange={setFechaEntrega}
            />
            <div className="form-row">
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Producto</label>
                <SearchableSelect
                  options={[
                    { value: "", label: "Elegí un producto" },
                    ...recetas.map((r) => ({
                      value: r.id,
                      label: `${r.emoji || ""} ${r.nombre}`.trim(),
                    })),
                  ]}
                  value={recetaSel}
                  onChange={setRecetaSel}
                  placeholder="Buscar producto..."
                />
              </div>
              <FormInput
                label="Cantidad"
                type="number"
                min={1}
                value={cantidad}
                onChange={(v) => setCantidad(Number(v) || 1)}
                style={{ flex: 1 }}
              />
            </div>
            <FormMoneyInput
              label="Precio acordado por unidad (opcional)"
              value={precio}
              onChange={setPrecio}
              placeholder="Precio de lista"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={addItem}
              style={{ marginBottom: 8 }}
            >
              Agregar ítem
            </button>

            {items.length > 0 && (
              <div className="pedido-items-preview">
                {items.map((it) => (
                  <div key={it.receta.id} className="pedido-item-row">
                    <span>
                      {it.cantidad}x {it.receta.nombre}
                    </span>
                    <span>
                      {fmt((it.precio_unitario || 0) * (it.cantidad || 0))}
                    </span>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => quitarItem(it.receta.id)}
                      style={{ color: "var(--text-muted)" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: "1px solid var(--border)",
                    fontWeight: 600,
                    textAlign: "right",
                  }}
                >
                  Total:{" "}
                  {fmt(
                    items.reduce(
                      (s, it) =>
                        s + (it.precio_unitario || 0) * (it.cantidad || 0),
                      0
                    )
                  )}
                </div>
              </div>
            )}

            <FormMoneyInput
              label="Seña / adelanto (opcional)"
              value={senia}
              onChange={setSenia}
              placeholder="0"
            />
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleGuardar}
          disabled={
            saving ||
            creandoCliente ||
            items.length === 0 ||
            !fechaEntrega ||
            (!clienteSel && !modoNuevoCliente) ||
            (modoNuevoCliente && !nuevoClienteNombre.trim())
          }
          style={{ width: "100%", marginBottom: 24 }}
        >
          {saving || creandoCliente ? "Guardando…" : "Guardar pedido"}
        </button>
      </div>
    </div>
  );
}

export default PedidoFormModal;
