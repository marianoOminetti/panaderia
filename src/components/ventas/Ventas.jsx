import { useState, useEffect } from "react";
import { fmt } from "../../lib/format";
import { useVentas } from "../../hooks/useVentas";
import { useClientes } from "../../hooks/useClientes";
import { useVentasVoz } from "../../hooks/useVentasVoz";
import { hoyLocalISO } from "../../lib/dates";
import { saveVentaPendiente } from "../../lib/offlineVentas";
import { reportError } from "../../utils/errorReport";
import { agruparVentas, gruposConDeuda as getGruposConDeuda, totalDebeEnGrupo } from "../../lib/agrupadores";
import VentasList from "./VentasList";
import VentasEditModal from "./VentasEditModal";
import VentasChargeModal from "./VentasChargeModal";
import VentasVoiceModal from "./VentasVoiceModal";
import VentasManualScreen from "./VentasManualScreen";

function generateTransaccionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 compatible
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function Ventas({
  recetas,
  ventas,
  clientes,
  stock,
  actualizarStock,
  actualizarStockBatch,
  onRefresh,
  showToast,
  confirm,
  ventasPreloadGrupoKey,
  onConsumedVentasPreload,
}) {
  const { insertVentas, deleteVentas, updateVenta } = useVentas();
  const { insertCliente } = useClientes({ onRefresh, showToast });

  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [clienteSel, setClienteSel] = useState(null);
  const [medioPago, setMedioPago] = useState("efectivo");
  const [estadoPago, setEstadoPago] = useState("pagado");
  const [saving, setSaving] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [chargeTotalOverride, setChargeTotalOverride] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editGrupo, setEditGrupo] = useState(null);
  const [editForm, setEditForm] = useState({
    cliente_id: null,
    medio_pago: "efectivo",
    estado_pago: "pagado",
  });
  const [editCantidades, setEditCantidades] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [editItemsToAdd, setEditItemsToAdd] = useState([]);
  const [editRecetaToAdd, setEditRecetaToAdd] = useState("");
  const [editCantidadToAdd, setEditCantidadToAdd] = useState(1);

  const {
    voiceModal,
    setVoiceModal,
    transcript,
    parsedVentas,
    listening,
    savingVoice,
    iniciarRec,
    detenerVoz,
    registrarVentasVoz,
    abrirVoz,
    SpeechRecognitionAPI,
  } = useVentasVoz({ recetas, setCartItems, showToast });

  const hoy = hoyLocalISO();
  const ventasHoy = (ventas || []).filter((v) => v.fecha === hoy);
  const ingresoHoy = ventasHoy.reduce(
    (s, v) =>
      s +
      (v.total_final != null
        ? v.total_final
        : (v.precio_unitario || 0) * (v.cantidad || 0)),
    0,
  );
  const cartTotal = cartItems.reduce(
    (s, item) => s + (item.precio_unitario || 0) * (item.cantidad || 0),
    0,
  );

  const gruposConDeuda = getGruposConDeuda(ventas);
  const totalDeuda = gruposConDeuda.reduce((s, g) => s + totalDebeEnGrupo(g), 0);

  const addToCart = (receta, cantidad = 1) => {
    if (!receta) return;
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + cantidad };
        return copy;
      }
      return [...prev, { receta, cantidad, precio_unitario: receta.precio_venta || 0 }];
    });
  };
  const updateCartQuantity = (recetaId, delta) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.receta.id === recetaId
          ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
          : item,
      ),
    );
  };
  const removeFromCart = (recetaId) => {
    setCartItems((prev) => prev.filter((item) => item.receta.id !== recetaId));
  };
  const updateCartPrice = (recetaId, value) => {
    const text = String(value).trim();
    if (text === "") {
      setCartItems((prev) =>
        prev.map((item) =>
          item.receta.id === recetaId ? { ...item, precio_unitario: "" } : item,
        ),
      );
      return;
    }
    const num = parseFloat(text.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.receta.id === recetaId ? { ...item, precio_unitario: num } : item,
      ),
    );
  };

  const registrarVentaEnSupabase = async (rows) => {
    const inserted = await insertVentas(rows);
    if (!actualizarStock) return;
    try {
      for (const v of rows) {
        const cant = v.cantidad || 0;
        if (v.receta_id && cant > 0) await actualizarStock(v.receta_id, -cant);
      }
    } catch (err) {
      const ids = (inserted || []).map((r) => r.id).filter(Boolean);
      if (ids.length > 0) {
        try {
          await deleteVentas(ids);
        } catch (rollbackErr) {
          reportError(rollbackErr, { action: "rollbackVentasAfterStockFail", ids });
        }
      }
      throw err;
    }
  };

  const resetNuevaVenta = () => {
    setManualScreenOpen(false);
    setCartItems([]);
    setClienteSel(null);
    setMedioPago("efectivo");
    setEstadoPago("pagado");
    setChargeTotalOverride("");
    setChargeModalOpen(false);
  };

  const eliminarVenta = async (grupo) => {
    if (!(await confirm("¿Eliminar esta venta?", { destructive: true }))) return;
    const ids = grupo.rawItems.map((i) => i.id).filter(Boolean);
    if (ids.length === 0) {
      showToast("⚠️ No hay ventas para eliminar");
      return;
    }
    setDeletingId(grupo.key || ids[0]);
    try {
      if (actualizarStock) {
        for (const v of grupo.rawItems) {
          const cant = v.cantidad || 0;
          if (v.receta_id && cant > 0) await actualizarStock(v.receta_id, cant);
        }
      }
      await deleteVentas(ids);
      showToast("✅ Venta eliminada");
      onRefresh();
    } catch (err) {
      if (actualizarStock) {
        try {
          for (const v of grupo.rawItems) {
            const cant = v.cantidad || 0;
            if (v.receta_id && cant > 0) await actualizarStock(v.receta_id, -cant);
          }
        } catch (rollbackErr) {
          reportError(rollbackErr, { action: "rollbackStockAfterDeleteVentaFail", ids });
        }
      }
      reportError(err, { action: "eliminarVenta", ids });
      showToast(`⚠️ No se puede eliminar: ${(err?.message || err?.code || "Error").slice(0, 80)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const abrirEditar = (grupo) => {
    setEditGrupo(grupo);
    setEditForm({
      cliente_id: grupo.cliente_id || null,
      medio_pago: grupo.rawItems[0]?.medio_pago || "efectivo",
      estado_pago: grupo.rawItems[0]?.estado_pago || "pagado",
    });
    const cant = {};
    for (const v of grupo.rawItems) cant[v.id] = v.cantidad;
    setEditCantidades(cant);
    setEditItemsToAdd([]);
    setEditRecetaToAdd("");
    setEditCantidadToAdd(1);
    setEditModalOpen(true);
  };

  useEffect(() => {
    if (!ventasPreloadGrupoKey) return;
    const grupos = agruparVentas(ventas || []);
    const grupo = grupos.find((g) => g.key === ventasPreloadGrupoKey);
    if (grupo) abrirEditar(grupo);
    onConsumedVentasPreload?.();
  }, [ventasPreloadGrupoKey, ventas]); // eslint-disable-line react-hooks/exhaustive-deps -- callback estable desde App

  const agregarProductoEnEdicion = () => {
    if (!editRecetaToAdd) return;
    const receta = recetas.find((r) => r.id === editRecetaToAdd);
    if (!receta) return;
    setEditItemsToAdd((prev) => [
      ...prev,
      { receta_id: receta.id, cantidad: editCantidadToAdd, receta },
    ]);
    setEditRecetaToAdd("");
    setEditCantidadToAdd(1);
  };

  const guardarEdicion = async () => {
    if (!editGrupo) return;
    setEditSaving(true);
    const hoyEdit = hoyLocalISO();
    let transaccionId = editGrupo.rawItems[0]?.transaccion_id;
    if (editItemsToAdd.length > 0 && !transaccionId)
      transaccionId = generateTransaccionId();
    const deltasMap = {};
    for (const v of editGrupo.rawItems) {
      const nuevaCant = editCantidades[v.id] ?? v.cantidad;
      const deltaCant = nuevaCant - v.cantidad;
      if (deltaCant !== 0 && v.receta_id) {
        deltasMap[v.receta_id] = (deltasMap[v.receta_id] || 0) - deltaCant;
      }
    }
    for (const { receta_id, cantidad } of editItemsToAdd) {
      if (receta_id && cantidad) {
        deltasMap[receta_id] = (deltasMap[receta_id] || 0) - cantidad;
      }
    }
    const stockDeltas = Object.entries(deltasMap)
      .filter(([, d]) => d !== 0)
      .map(([receta_id, delta]) => ({ receta_id, delta }));

    try {
      if (stockDeltas.length > 0 && actualizarStockBatch) {
        await actualizarStockBatch(stockDeltas);
      } else if (stockDeltas.length > 0 && actualizarStock) {
        for (const { receta_id, delta } of stockDeltas) {
          await actualizarStock(receta_id, delta);
        }
      }
      try {
        for (const v of editGrupo.rawItems) {
          const payload = {
            cliente_id: editForm.cliente_id || null,
            medio_pago: editForm.medio_pago,
            estado_pago: editForm.estado_pago,
          };
          const nuevaCant = editCantidades[v.id] ?? v.cantidad;
          if (editCantidades[v.id] != null) {
            payload.cantidad = nuevaCant;
            const precio = v.precio_unitario || 0;
            payload.subtotal = precio * nuevaCant;
            payload.total_final = payload.subtotal - (v.descuento ?? 0);
          }
          if (editItemsToAdd.length > 0) payload.transaccion_id = transaccionId;
          await updateVenta(v.id, payload);
        }
        if (editItemsToAdd.length > 0) {
          const rows = editItemsToAdd.map(({ receta_id, cantidad, receta }) => ({
            receta_id,
            cantidad,
            precio_unitario: receta.precio_venta || 0,
            subtotal: (receta.precio_venta || 0) * cantidad,
            descuento: 0,
            total_final: (receta.precio_venta || 0) * cantidad,
            fecha: hoyEdit,
            transaccion_id: transaccionId,
            cliente_id: editForm.cliente_id || null,
            medio_pago: editForm.medio_pago,
            estado_pago: editForm.estado_pago,
          }));
          await insertVentas(rows);
        }
      } catch (ventaErr) {
        if (stockDeltas.length > 0) {
          const undo = stockDeltas.map(({ receta_id, delta }) => ({ receta_id, delta: -delta }));
          try {
            if (actualizarStockBatch) await actualizarStockBatch(undo);
            else for (const { receta_id, delta } of undo) await actualizarStock(receta_id, delta);
          } catch (rollbackErr) {
            reportError(rollbackErr, { action: "rollbackStockAfterGuardarEdicionFail" });
          }
        }
        throw ventaErr;
      }
      showToast("✅ Venta actualizada");
      setEditModalOpen(false);
      setEditGrupo(null);
      setEditItemsToAdd([]);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "guardarEdicion", grupo: editGrupo?.key });
      showToast("⚠️ Error al actualizar venta");
    } finally {
      setEditSaving(false);
    }
  };

  const registrarVentaCarrito = async () => {
    if (cartItems.length === 0) {
      showToast("Agregá productos al carrito primero.");
      return;
    }
    const sinStock = cartItems.filter(
      ({ receta, cantidad }) => ((stock || {})[receta.id] ?? 0) < cantidad,
    );
    if (sinStock.length > 0 && !(await confirm(`Stock insuficiente en ${sinStock.map((s) => s.receta.nombre).join(", ")}. ¿Registrar venta igual?`)))
      return;
    setSaving(true);
    try {
      const hoyVenta = hoyLocalISO();
      const totalCarrito = cartItems.reduce((s, it) => s + (it.precio_unitario || 0) * (it.cantidad || 0), 0);
      const override = parseFloat(String(chargeTotalOverride || "").replace(",", "."));
      const usarOverride = !Number.isNaN(override) && override >= 0 && override !== totalCarrito && totalCarrito > 0;
      if (totalCarrito === 0 && !Number.isNaN(override) && override > 0) {
        showToast("Para usar un total final distinto, asigná precios mayores a 0 en el carrito.");
        setSaving(false);
        return;
      }
      let transaccionId = generateTransaccionId();
      const rows = cartItems.map(({ receta, cantidad, precio_unitario }) => {
        const precio = precio_unitario || 0;
        const subtotal = precio * (cantidad || 0);
        return {
          receta_id: receta.id,
          cantidad,
          precio_unitario: precio,
          subtotal,
          descuento: 0,
          total_final: subtotal,
          fecha: hoyVenta,
          transaccion_id: transaccionId,
          cliente_id: clienteSel || null,
          medio_pago: medioPago,
          estado_pago: estadoPago,
        };
      });
      if (usarOverride) {
        const factor = override / totalCarrito;
        let acumulado = 0;
        for (let i = 0; i < rows.length; i++) {
          const nuevoSubtotal = i === rows.length - 1 ? override - acumulado : Math.round(rows[i].subtotal * factor);
          rows[i].precio_unitario = rows[i].cantidad > 0 ? nuevoSubtotal / rows[i].cantidad : rows[i].precio_unitario;
          rows[i].subtotal = nuevoSubtotal;
          rows[i].total_final = nuevoSubtotal;
          acumulado += nuevoSubtotal;
        }
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await saveVentaPendiente(rows);
        showToast(`✅ Venta guardada offline: ${fmt(usarOverride ? override : totalCarrito)}. Se sincronizará cuando vuelva la conexión.`);
      } else {
        await registrarVentaEnSupabase(rows);
        showToast(`✅ Venta registrada: ${fmt(usarOverride ? override : totalCarrito)}`);
      }
      resetNuevaVenta();
      onRefresh();
    } catch (err) {
      reportError(err, { action: "registrarVentaCarrito" });
      showToast("⚠️ Error al registrar venta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content">
      <p className="page-title">Ventas</p>
      <p className="page-subtitle">Hoy: {fmt(ingresoHoy)}</p>

      <VentasList
        ventas={ventas}
        hoy={hoy}
        recetas={recetas}
        clientes={clientes}
        gruposConDeuda={gruposConDeuda}
        totalDeuda={totalDeuda}
        eliminarVenta={eliminarVenta}
        abrirEditar={abrirEditar}
        deletingId={deletingId}
      />

      <VentasEditModal
        open={editModalOpen}
        editGrupo={editGrupo}
        editForm={editForm}
        setEditForm={setEditForm}
        editCantidades={editCantidades}
        setEditCantidades={setEditCantidades}
        editItemsToAdd={editItemsToAdd}
        editRecetaToAdd={editRecetaToAdd}
        setEditRecetaToAdd={setEditRecetaToAdd}
        editCantidadToAdd={editCantidadToAdd}
        setEditCantidadToAdd={setEditCantidadToAdd}
        recetas={recetas}
        clientes={clientes}
        insertCliente={insertCliente}
        showToast={showToast}
        editSaving={editSaving}
        onGuardar={guardarEdicion}
        onAgregarProducto={agregarProductoEnEdicion}
        onQuitarProducto={(idx) => setEditItemsToAdd((prev) => prev.filter((_, i) => i !== idx))}
        onClose={() => setEditModalOpen(false)}
      />

      <VentasVoiceModal
        open={voiceModal}
        onClose={() => setVoiceModal(false)}
        transcript={transcript}
        parsedVentas={parsedVentas}
        listening={listening}
        savingVoice={savingVoice}
        onDetener={detenerVoz}
        onIniciarRec={iniciarRec}
        onAgregarMasVoz={() => SpeechRecognitionAPI && iniciarRec(true)}
        onAgregarAlCarrito={registrarVentasVoz}
      />

      {!manualScreenOpen && !voiceModal && (
        <button
          className="fab fab-receta"
          onClick={() => setManualScreenOpen(true)}
          title="Nueva venta"
        >
          <span>+</span>
          <span>Nueva venta</span>
        </button>
      )}

      <VentasManualScreen
        open={manualScreenOpen}
        onClose={resetNuevaVenta}
        cartItems={cartItems}
        cartTotal={cartTotal}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        updateCartPrice={updateCartPrice}
        recetas={recetas}
        stock={stock}
        addToCart={addToCart}
        onVoz={abrirVoz}
        onCobrar={() => {
          if (cartItems.length === 0) return;
          setChargeTotalOverride("");
          setChargeModalOpen(true);
        }}
      />

      <VentasChargeModal
        open={chargeModalOpen}
        onClose={() => setChargeModalOpen(false)}
        cartItems={cartItems}
        cartTotal={cartTotal}
        clienteSel={clienteSel}
        setClienteSel={setClienteSel}
        medioPago={medioPago}
        setMedioPago={setMedioPago}
        estadoPago={estadoPago}
        setEstadoPago={setEstadoPago}
        chargeTotalOverride={chargeTotalOverride}
        setChargeTotalOverride={setChargeTotalOverride}
        onRegistrar={registrarVentaCarrito}
        saving={saving}
        clientes={clientes}
        insertCliente={insertCliente}
        showToast={showToast}
      />
    </div>
  );
}

export default Ventas;
