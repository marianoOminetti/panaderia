import { useState, useCallback } from "react";
import { reportError } from "../utils/errorReport";
import { costoReceta } from "../lib/costos";

/**
 * Estado y lógica del flujo "Compra de stock" en Insumos: carrito, modales de precio y resultado.
 * Recibe dependencias del padre (insumos, recetas, mutaciones) y devuelve estado + handlers.
 */
export function useInsumosCompra({
  insumos,
  recetas,
  recetaIngredientes,
  registrarMovimientoInsumo,
  consumirComponentesDeInsumo,
  onRefresh,
  showToast,
  updateInsumo,
  insertPrecioHistorial,
  updateRecetaCostos,
}) {
  const [compraScreenOpen, setCompraScreenOpen] = useState(false);
  const [compraCart, setCompraCart] = useState([]);
  const [compraSaving, setCompraSaving] = useState(false);
  const [precioDecisionModal, setPrecioDecisionModal] = useState(null);
  const [compraResultado, setCompraResultado] = useState(null);

  const agregarAlCarritoCompra = useCallback((insumo) => {
    if (!insumo) return;
    setCompraCart((prev) => {
      const idx = prev.findIndex((it) => it.insumo.id === insumo.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          presentaciones: copy[idx].presentaciones + 1,
        };
        return copy;
      }
      return [
        ...prev,
        {
          insumo,
          presentaciones: 1,
          precioPresentacion:
            typeof insumo.precio === "number"
              ? insumo.precio
              : Number(insumo.precio) || 0,
          precioOriginal:
            typeof insumo.precio === "number"
              ? insumo.precio
              : Number(insumo.precio) || 0,
        },
      ];
    });
  }, []);

  const actualizarCantidadCarrito = useCallback((insumoId, delta) => {
    setCompraCart((prev) =>
      prev
        .map((item) =>
          item.insumo.id === insumoId
            ? {
                ...item,
                presentaciones: Math.max(
                  1,
                  (item.presentaciones || 1) + delta
                ),
              }
            : item
        )
        .filter((item) => (item.presentaciones || 0) > 0)
    );
  }, []);

  const eliminarDeCarritoCompra = useCallback((insumoId) => {
    setCompraCart((prev) =>
      prev.filter((item) => item.insumo.id !== insumoId)
    );
  }, []);

  const actualizarPrecioCarrito = useCallback((insumoId, value) => {
    const text = String(value).trim();
    if (text === "") {
      setCompraCart((prev) =>
        prev.map((item) =>
          item.insumo.id === insumoId
            ? { ...item, precioPresentacion: "" }
            : item
        )
      );
      return;
    }
    const num = parseFloat(text.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;
    setCompraCart((prev) =>
      prev.map((item) =>
        item.insumo.id === insumoId
          ? { ...item, precioPresentacion: num }
          : item
      )
    );
  }, []);

  const totalCompra = compraCart.reduce((s, item) => {
    const precio =
      typeof item.precioPresentacion === "number"
        ? item.precioPresentacion
        : Number(item.precioPresentacion) || 0;
    return s + precio * (item.presentaciones || 0);
  }, 0);

  const construirDecisionesPrecio = useCallback(() => {
    if (!compraCart.length) return null;
    const items = [];
    const originalPrices = {};
    for (const item of compraCart) {
      const ins = item.insumo;
      const anterior = Number(ins.precio) || 0;
      const nuevoValRaw =
        typeof item.precioPresentacion === "number"
          ? item.precioPresentacion
          : Number(item.precioPresentacion) || 0;
      originalPrices[ins.id] = anterior;
      if (!anterior || !nuevoValRaw) continue;
      const diffAbs = Math.abs(nuevoValRaw - anterior);
      if (diffAbs < 0.01) continue;
      const diffPct = anterior ? (nuevoValRaw - anterior) / anterior : null;
      items.push({
        insumoId: ins.id,
        nombre: ins.nombre,
        precioAnterior: anterior,
        precioNuevo: nuevoValRaw,
        diffPct,
        accion: "update",
      });
    }
    if (!items.length) return null;
    return {
      items,
      originalPrices,
      applyToAll: false,
    };
  }, [compraCart]);

  const registrarCompraSoloStock = useCallback(async () => {
    if (!compraCart.length) return;
    setCompraSaving(true);
    const totalItems = compraCart.filter(
      (item) => item.insumo?.id && (item.presentaciones || 0) > 0
    ).length;
    let okCount = 0;
    try {
      for (const item of compraCart) {
        const ins = item.insumo;
        const presentaciones = item.presentaciones || 0;
        if (!ins.id || presentaciones <= 0) continue;
        const unidadCantidad = Number(ins.cantidad_presentacion) || 1;
        const cantidadTotal = presentaciones * unidadCantidad;
        const precio =
          typeof item.precioPresentacion === "number"
            ? item.precioPresentacion
            : Number(item.precioPresentacion) || 0;
        const valorMovimiento =
          precio > 0 ? precio * presentaciones : null;
        await registrarMovimientoInsumo(
          ins.id,
          "ingreso",
          cantidadTotal,
          valorMovimiento
        );
        if (consumirComponentesDeInsumo) {
          await consumirComponentesDeInsumo(ins.id, cantidadTotal);
        }
        okCount += 1;
      }
      showToast("✅ Compra de stock registrada");
      setCompraCart([]);
      setCompraScreenOpen(false);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "registrarCompraStock" });
      if (okCount > 0) {
        showToast(`⚠️ Se registraron ${okCount} de ${totalItems}; error en el resto. Revisá el carrito.`);
      } else {
        showToast("⚠️ Error al registrar compra");
      }
    } finally {
      setCompraSaving(false);
    }
  }, [
    compraCart,
    registrarMovimientoInsumo,
    showToast,
    onRefresh,
    consumirComponentesDeInsumo,
  ]);

  const confirmarCompra = useCallback(async () => {
    if (!compraCart.length || compraSaving) return;
    const tienePrecioInvalido = compraCart.some((item) => {
      const precio =
        typeof item.precioPresentacion === "number"
          ? item.precioPresentacion
          : Number(item.precioPresentacion) || 0;
      return precio <= 0;
    });
    if (tienePrecioInvalido) {
      showToast(
        "⚠️ Completá el precio de todos los insumos (mayor a 0)"
      );
      return;
    }
    const decisiones = construirDecisionesPrecio();
    if (!decisiones) {
      await registrarCompraSoloStock();
      return;
    }
    setPrecioDecisionModal(decisiones);
  }, [compraCart, compraSaving, construirDecisionesPrecio, registrarCompraSoloStock, showToast]);

  const aplicarDecisionesPrecio = useCallback(async () => {
    if (!precioDecisionModal || !compraCart.length) return;
    const { items } = precioDecisionModal;
    const cambiosAplicar = items.filter((it) => it.accion === "update");
    if (!cambiosAplicar.length) {
      await registrarCompraSoloStock();
      setPrecioDecisionModal(null);
      return;
    }
    setCompraSaving(true);
    try {
      for (const item of compraCart) {
        const ins = item.insumo;
        const presentaciones = item.presentaciones || 0;
        if (!ins.id || presentaciones <= 0) continue;
        const unidadCantidad = Number(ins.cantidad_presentacion) || 1;
        const cantidadTotal = presentaciones * unidadCantidad;
        const precio =
          typeof item.precioPresentacion === "number"
            ? item.precioPresentacion
            : Number(item.precioPresentacion) || 0;
        const valorMovimiento =
          precio > 0 ? precio * presentaciones : null;
        await registrarMovimientoInsumo(
          ins.id,
          "ingreso",
          cantidadTotal,
          valorMovimiento
        );
        if (consumirComponentesDeInsumo) {
          await consumirComponentesDeInsumo(ins.id, cantidadTotal);
        }
      }

      const preciosOriginales = {};
      const preciosNuevos = {};
      const preciosErrores = [];
      for (const cambio of cambiosAplicar) {
        preciosOriginales[cambio.insumoId] = cambio.precioAnterior;
        preciosNuevos[cambio.insumoId] = cambio.precioNuevo;
        try {
          await updateInsumo(cambio.insumoId, { precio: cambio.precioNuevo });
          await insertPrecioHistorial({
            insumo_id: cambio.insumoId,
            precio_anterior: cambio.precioAnterior,
            precio_nuevo: cambio.precioNuevo,
            motivo: "compra_stock",
          });
        } catch (err) {
          reportError(err, { action: "aplicarDecisionesPrecioItem", insumoId: cambio.insumoId });
          preciosErrores.push(cambio.nombre || cambio.insumoId);
        }
      }
      if (preciosErrores.length > 0) {
        showToast(
          `⚠️ No se pudo actualizar precio de: ${preciosErrores.slice(0, 2).join(", ")}${preciosErrores.length > 2 ? "…" : ""}`
        );
      }

      const recetasPorId = Object.fromEntries(
        (recetas || []).map((r) => [r.id, r])
      );
      const recetasAfectadasIds = new Set();
      for (const cambio of cambiosAplicar) {
        const recsIds = (recetaIngredientes || [])
          .filter((ri) => ri.insumo_id === cambio.insumoId)
          .map((ri) => ri.receta_id);
        for (const id of recsIds) {
          if (id) recetasAfectadasIds.add(id);
        }
      }

      const insumosById = Object.fromEntries(
        (insumos || []).map((i) => [i.id, i])
      );
      const insumosBefore = Object.values(insumosById).map((i) => ({
        ...i,
        precio:
          preciosOriginales[i.id] != null
            ? preciosOriginales[i.id]
            : i.precio,
      }));
      const insumosAfter = Object.values(insumosById).map((i) => ({
        ...i,
        precio:
          preciosNuevos[i.id] != null ? preciosNuevos[i.id] : i.precio,
      }));

      const recetasAfectadas = [];
      const costosErrores = [];
      for (const recId of recetasAfectadasIds) {
        const receta = recetasPorId[recId];
        if (!receta) continue;
        const rindeNum = Number(receta.rinde) || 1;
        const costoAntes = costoReceta(
          recId,
          recetaIngredientes || [],
          insumosBefore,
          recetas || []
        );
        const costoDespues = costoReceta(
          recId,
          recetaIngredientes || [],
          insumosAfter,
          recetas || []
        );
        const costoUnitAntes =
          rindeNum > 0 ? costoAntes / rindeNum : 0;
        const costoUnitDespues =
          rindeNum > 0 ? costoDespues / rindeNum : 0;
        const precioVenta = Number(receta.precio_venta) || 0;
        const margenAntes =
          precioVenta > 0
            ? (precioVenta - costoUnitAntes) / precioVenta
            : null;
        const margenDespues =
          precioVenta > 0
            ? (precioVenta - costoUnitDespues) / precioVenta
            : null;

        try {
          await updateRecetaCostos(recId, {
            costo_lote: costoDespues,
            costo_unitario: costoUnitDespues,
          });
        } catch (err) {
          reportError(err, { action: "aplicarDecisionesPrecioReceta", recetaId: recId });
          costosErrores.push(receta.nombre || recId);
        }

        recetasAfectadas.push({
          id: recId,
          nombre: receta.nombre,
          emoji: receta.emoji || "🍞",
          margenAntes,
          margenDespues,
        });
      }
      if (costosErrores.length > 0) {
        showToast(
          `⚠️ No se pudo actualizar costo de receta(s): ${costosErrores.slice(0, 2).join(", ")}${costosErrores.length > 2 ? "…" : ""}`
        );
      }

      setCompraResultado({
        preciosActualizados: cambiosAplicar.length,
        recetasAfectadas,
      });
      showToast("✅ Compra registrada y costos actualizados");
      setPrecioDecisionModal(null);
      setCompraCart([]);
      onRefresh();
    } catch (err) {
      reportError(err, { action: "actualizarPreciosPorCompra" });
      showToast("⚠️ Error al actualizar precios y costos");
      setPrecioDecisionModal(null);
      setCompraCart([]);
    } finally {
      setCompraSaving(false);
    }
  }, [
    precioDecisionModal,
    compraCart,
    insumos,
    recetas,
    recetaIngredientes,
    registrarMovimientoInsumo,
    updateInsumo,
    insertPrecioHistorial,
    updateRecetaCostos,
    showToast,
    onRefresh,
    registrarCompraSoloStock,
    consumirComponentesDeInsumo,
  ]);

  return {
    compraScreenOpen,
    setCompraScreenOpen,
    compraCart,
    compraSaving,
    precioDecisionModal,
    setPrecioDecisionModal,
    compraResultado,
    setCompraResultado,
    agregarAlCarritoCompra,
    actualizarCantidadCarrito,
    eliminarDeCarritoCompra,
    actualizarPrecioCarrito,
    totalCompra,
    confirmarCompra,
    aplicarDecisionesPrecio,
  };
}
