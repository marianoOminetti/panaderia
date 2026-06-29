import { useMemo, useState } from "react";
import { reportError } from "../../utils/errorReport";
import { useClientes } from "../../hooks/useClientes";
import { SearchableSelect } from "../ui";
import ClienteDetalleVentas from "./ClienteDetalleVentas";

function ClienteUnificarModal({
  visible,
  onClose,
  cliente,
  clientes = [],
  ventas = [],
  pedidos = [],
  recetas = [],
  onRefresh,
  showToast,
  confirm,
  reassignClienteIdInState,
  removeClienteFromState,
  onMerged,
}) {
  const { mergeClientes } = useClientes({
    onRefresh,
    showToast,
    reassignClienteIdInState,
    removeClienteFromState,
  });

  const [duplicadoId, setDuplicadoId] = useState(null);
  const [merging, setMerging] = useState(false);

  const opciones = useMemo(
    () =>
      (clientes || [])
        .filter((c) => c.id !== cliente?.id && c.eliminado !== true)
        .map((c) => ({
          value: c.id,
          label: `${c.nombre}${c.telefono ? ` · ${c.telefono}` : ""}`,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    [clientes, cliente?.id],
  );

  const duplicado = opciones.find((o) => o.value === duplicadoId);
  const duplicadoNombre = duplicado?.label?.split(" · ")[0] || "";
  const ventasDuplicado = useMemo(
    () =>
      duplicadoId
        ? ventas.filter((v) => v.cliente_id === duplicadoId)
        : [],
    [ventas, duplicadoId],
  );
  const ventasCount = ventasDuplicado.length;
  const pedidosCount = duplicadoId
    ? pedidos.filter((p) => p.cliente_id === duplicadoId).length
    : 0;

  if (!visible || !cliente) return null;

  const handleClose = () => {
    if (merging) return;
    setDuplicadoId(null);
    onClose();
  };

  const handleMerge = async () => {
    if (!duplicadoId || merging) return;
    const dupLabel = duplicado?.label?.split(" · ")[0] || "el otro cliente";
    const ok = await confirm(
      `¿Unificar "${dupLabel}" en "${cliente.nombre}"? Se moverán ${ventasCount} venta(s) y ${pedidosCount} pedido(s). "${dupLabel}" se dará de baja.`,
      { destructive: true },
    );
    if (!ok) return;

    setMerging(true);
    try {
      await mergeClientes(duplicadoId, cliente.id);
      setDuplicadoId(null);
      onMerged?.();
      onClose();
    } catch (err) {
      reportError(err, {
        action: "mergeClientes",
        fromClienteId: duplicadoId,
        toClienteId: cliente.id,
      });
      showToast("⚠️ No se pudieron unificar los clientes");
      await onRefresh?.();
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button
          className="screen-back"
          onClick={handleClose}
          disabled={merging}
        >
          ← Volver
        </button>
        <span className="screen-title">Unificar clientes</span>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>
            <strong>Cliente que queda:</strong> {cliente.nombre}
            {cliente.telefono ? ` · ${cliente.telefono}` : ""}
          </p>
          <p className="form-hint" style={{ margin: 0 }}>
            Elegí el duplicado cuyas ventas y pedidos se moverán acá. El
            duplicado se dará de baja.
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Duplicado a unificar</label>
          <SearchableSelect
            options={opciones}
            value={duplicadoId}
            onChange={setDuplicadoId}
            placeholder="Buscar cliente duplicado…"
            emptyMessage="No hay otros clientes"
          />
        </div>

        {duplicadoId && (
          <>
            <div
              className="card"
              style={{ marginBottom: 16, background: "var(--cream)" }}
            >
              <p style={{ fontSize: 13, margin: 0, padding: "12px 16px" }}>
                Se moverán <strong>{ventasCount}</strong> venta(s) y{" "}
                <strong>{pedidosCount}</strong> pedido(s) de{" "}
                <strong>{duplicadoNombre}</strong> a{" "}
                <strong>{cliente.nombre}</strong>.
              </p>
            </div>
            <ClienteDetalleVentas
              ventasCliente={ventasDuplicado}
              recetas={recetas}
              title={`Ventas de ${duplicadoNombre}`}
              emptyMessage="Este cliente no tiene compras registradas."
              style={{ marginBottom: 16 }}
            />
          </>
        )}

        <button
          className="btn-primary"
          onClick={handleMerge}
          disabled={merging || !duplicadoId}
          style={
            duplicadoId
              ? { background: "var(--danger)", borderColor: "var(--danger)" }
              : undefined
          }
        >
          {merging ? "Unificando…" : "Unificar clientes"}
        </button>
      </div>
    </div>
  );
}

export default ClienteUnificarModal;
