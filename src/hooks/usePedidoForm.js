import { useState, useCallback } from "react";
import { reportError } from "../utils/errorReport";

/**
 * Hook para manejar el formulario de nuevo pedido.
 * Usado tanto desde ClienteDetalle como desde PedidoFormModal (Dashboard).
 */
export function usePedidoForm({
  recetas,
  clienteId,
  insertPedidos,
  showToast,
  onSuccess,
}) {
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [recetaSel, setRecetaSel] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState("");
  const [items, setItems] = useState([]);
  const [senia, setSenia] = useState("");
  const [estado, setEstado] = useState("pendiente");
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setFechaEntrega("");
    setRecetaSel("");
    setCantidad(1);
    setPrecio("");
    setItems([]);
    setSenia("");
    setEstado("pendiente");
  }, []);

  const addItem = useCallback(() => {
    if (!recetaSel) return;
    const receta = recetas.find((r) => String(r.id) === String(recetaSel));
    if (!receta) return;
    const cantidadNum = Number(cantidad) || 0;
    if (cantidadNum <= 0) return;
    const precioNum =
      precio !== ""
        ? Number(String(precio).replace(",", "."))
        : Number(receta.precio_venta || 0);
    if (Number.isNaN(precioNum) || precioNum < 0) return;
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          cantidad: copy[idx].cantidad + cantidadNum,
          precio_unitario: precioNum,
        };
        return copy;
      }
      return [
        ...prev,
        { receta, cantidad: cantidadNum, precio_unitario: precioNum },
      ];
    });
    setRecetaSel("");
    setCantidad(1);
    setPrecio("");
  }, [recetaSel, recetas, cantidad, precio]);

  const quitarItem = useCallback((recetaId) => {
    setItems((prev) => prev.filter((it) => it.receta.id !== recetaId));
  }, []);

  const guardar = useCallback(
    async (clienteIdOverride) => {
      const finalClienteId = clienteIdOverride ?? clienteId;
      if (!fechaEntrega) {
        showToast?.("Elegí una fecha de entrega");
        return false;
      }
      if (items.length === 0) {
        showToast?.("Agregá al menos un producto");
        return false;
      }
      if (!finalClienteId) {
        showToast?.("Elegí un cliente");
        return false;
      }
      setSaving(true);
      try {
        const pedidoId = crypto.randomUUID?.() || `p-${Date.now()}`;
        const seniaNum =
          parseFloat(String(senia || "").replace(",", ".")) || 0;
        const rows = items.map((item, index) => {
          const precioVal =
            parseFloat(String(item.precio_unitario).replace(",", ".")) || 0;
          const cantidadVal = Number(item.cantidad) || 0;
          return {
            pedido_id: pedidoId,
            cliente_id: finalClienteId,
            receta_id: item.receta.id,
            cantidad: cantidadVal,
            precio_unitario: precioVal,
            senia: index === 0 ? seniaNum : 0,
            estado,
            fecha_entrega: fechaEntrega,
          };
        });
        await insertPedidos(rows);
        reset();
        onSuccess?.();
        return true;
      } catch (err) {
        reportError(err, {
          action: "guardarPedido",
          cliente_id: finalClienteId,
        });
        showToast?.("⚠️ Error al guardar pedido");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      clienteId,
      fechaEntrega,
      items,
      senia,
      estado,
      insertPedidos,
      reset,
      onSuccess,
      showToast,
    ]
  );

  return {
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
    estado,
    setEstado,
    saving,
    addItem,
    quitarItem,
    guardar,
    reset,
  };
}
