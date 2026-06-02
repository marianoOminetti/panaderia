/**
 * Pantalla Insumos: orquesta lista (useInsumosLista + InsumosList), compra (useInsumosCompra + InsumosCompra)
 * y composición (useInsumosComposicion + InsumosComposicion). CRUD vía useInsumos.
 */
import { useEffect } from "react";
import { fmt, fmtDecimal, parseDecimal } from "../../lib/format";
import { costoReceta } from "../../lib/costos";
import { useInsumos } from "../../hooks/useInsumos";
import { useInsumosCompra } from "../../hooks/useInsumosCompra";
import { useInsumosLista } from "../../hooks/useInsumosLista";
import { useInsumosComposicion } from "../../hooks/useInsumosComposicion";
import InsumosList from "./InsumosList";
import InsumosCompra from "./InsumosCompra";
import InsumosMovModal from "./InsumosMovModal";
import InsumosFormModal from "./InsumosFormModal";
import InsumosDetalleModal from "./InsumosDetalleModal";
import InsumosPrecioDecisionModal from "./InsumosPrecioDecisionModal";
import InsumosCompraResultadoModal from "./InsumosCompraResultadoModal";

function Insumos({
  insumos,
  insumoStock,
  insumoMovimientos,
  insumoComposicion,
  registrarMovimientoInsumo,
  consumirComponentesDeInsumo,
  recetas,
  recetaIngredientes,
  onRefresh,
  showToast,
  confirm,
  onVerRecetasAfectadas,
  compraPreloadInsumos,
  onConsumedCompraPreload,
}) {
  const {
    updateInsumo,
    insertInsumo,
    insertPrecioHistorial,
    updateRecetaCostos,
    deleteInsumoComposicion,
    upsertInsumoComposicion,
    deleteInsumo,
  } = useInsumos({ onRefresh, showToast });

  const lista = useInsumosLista({
    insumos,
    insumoStock,
    recetas,
    recetaIngredientes,
    updateInsumo,
    insertInsumo,
    insertPrecioHistorial,
    registrarMovimientoInsumo,
    deleteInsumo,
    onRefresh,
    showToast,
    confirm,
    updateRecetaCostos,
  });

  const composicion = useInsumosComposicion();

  const {
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
  } = useInsumosCompra({
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
  });

  const precioPorU = (i) => {
    const precio = Number(i.precio) || 0;
    const cantidad = Number(i.cantidad_presentacion) || 0;
    const unidad = i.unidad || "g";

    if (precio > 0 && cantidad > 0) {
      return `${fmt(precio)} / ${fmtDecimal(cantidad)} ${unidad}`;
    }

    if (precio > 0) return fmt(precio);
    if (cantidad > 0) return `${fmtDecimal(cantidad)} ${unidad}`;
    return "-";
  };

  const insumosMap = Object.fromEntries(insumos.map((i) => [i.id, i]));

  useEffect(() => {
    if (!compraPreloadInsumos || !compraPreloadInsumos.length) return;
    for (const { insumo_id } of compraPreloadInsumos) {
      const ins = insumosMap[insumo_id];
      if (ins) agregarAlCarritoCompra(ins);
    }
    setCompraScreenOpen(true);
    onConsumedCompraPreload?.();
  }, [
    compraPreloadInsumos,
    agregarAlCarritoCompra,
    setCompraScreenOpen,
    onConsumedCompraPreload,
    insumosMap,
  ]);

  return (
    <div className="content">
      <p className="page-title">Insumos</p>
      <p className="page-subtitle">
        {insumos.length} materias primas · ingresos y egresos para calcular
        ganancia
      </p>

      <InsumosList
        search={lista.search}
        setSearch={lista.setSearch}
        catActiva={lista.catActiva}
        setCatActiva={lista.setCatActiva}
        filtradosOrdenados={lista.filtradosOrdenados}
        insumoStock={insumoStock}
        insumosMap={insumosMap}
        insumoMovimientos={insumoMovimientos}
        precioPorU={precioPorU}
        onDetalle={lista.setDetalleInsumo}
        onAbrirCompra={() => setCompraScreenOpen(true)}
        onNuevoInsumo={lista.openNew}
        fmt={fmt}
      />

      {compraScreenOpen && (
        <InsumosCompra
          compraCart={compraCart}
          compraSaving={compraSaving}
          insumos={insumos}
          insumoStock={insumoStock}
          totalCompra={totalCompra}
          precioPorU={precioPorU}
          onBack={() => {
            if (compraSaving) return;
            setCompraScreenOpen(false);
          }}
          agregarAlCarrito={agregarAlCarritoCompra}
          actualizarCantidadCarrito={actualizarCantidadCarrito}
          actualizarPrecioCarrito={actualizarPrecioCarrito}
          eliminarDeCarrito={eliminarDeCarritoCompra}
          confirmarCompra={confirmarCompra}
          showToast={showToast}
        />
      )}


      {lista.movModal && lista.movInsumo && (
        <InsumosMovModal
          movInsumo={lista.movInsumo}
          movTipo={lista.movTipo}
          movCantidad={lista.movCantidad}
          setMovCantidad={lista.setMovCantidad}
          movValor={lista.movValor}
          setMovValor={lista.setMovValor}
          movSaving={lista.movSaving}
          guardarMovimiento={lista.guardarMovimiento}
          onClose={() => lista.setMovModal(false)}
        />
      )}

      {lista.modal && (
        <InsumosFormModal
          form={lista.form}
          setForm={lista.setForm}
          editando={lista.editando}
          saving={lista.saving}
          save={lista.save}
          onClose={() => lista.setModal(false)}
        />
      )}

      {lista.detalleInsumo && (
        <InsumosDetalleModal
          detalleInsumo={lista.detalleInsumo}
          insumos={insumos}
          insumoStock={insumoStock}
          insumoComposicion={insumoComposicion}
          composicion={composicion}
          deleteInsumoComposicion={deleteInsumoComposicion}
          upsertInsumoComposicion={upsertInsumoComposicion}
          precioPorU={precioPorU}
          onAjustarStock={(insumo) => {
            const actual = (insumoStock || {})[insumo.id] ?? 0;
            if (actual <= 0) {
              showToast("No hay stock para ajustar a la baja.");
              return;
            }
            lista.openMov(insumo, "ajuste_baja");
          }}
          onActualizarPrecioPremezcla={async (nuevoPrecio) => {
            const ins = lista.detalleInsumo;
            if (!ins || !ins.id) return;
            const precioAnterior = parseDecimal(ins.precio) ?? 0;
            const precioNuevo = parseDecimal(nuevoPrecio) ?? 0;
            if (precioNuevo <= 0) return;
            if (Math.abs(precioNuevo - precioAnterior) < 0.01) return;
            try {
              await updateInsumo(ins.id, { precio: precioNuevo });
              try {
                await insertPrecioHistorial({
                  insumo_id: ins.id,
                  precio_anterior: precioAnterior,
                  precio_nuevo: precioNuevo,
                  motivo: "premezcla_componentes",
                });
              } catch (err) {
                console.error("[insumos/premezclaPrecioHistorial]", err);
              }
              // Recalcular costos de recetas que usan esta premezcla
              try {
                const recetasPorId = Object.fromEntries(
                  (recetas || []).map((r) => [r.id, r]),
                );
                // Recetas directas (insumo aparece como ingrediente)
                const directRecetasAfectadas = (recetaIngredientes || [])
                  .filter((ri) => String(ri.insumo_id) === String(ins.id))
                  .map((ri) => ri.receta_id)
                  .filter(Boolean);

                // BFS transitive: agregar recetas padre que dependen vía `receta_id_precursora`
                const padresPorPrecursora = new Map();
                for (const ri of recetaIngredientes || []) {
                  if (!ri.receta_id_precursora) continue;
                  const precKey = String(ri.receta_id_precursora);
                  if (!padresPorPrecursora.has(precKey)) {
                    padresPorPrecursora.set(precKey, []);
                  }
                  padresPorPrecursora.get(precKey).push(ri.receta_id);
                }

                const recetasAfectadasIds = new Set(directRecetasAfectadas.map((id) => String(id)));
                const queue = [...directRecetasAfectadas];
                while (queue.length) {
                  const current = queue.shift();
                  const padres = padresPorPrecursora.get(String(current)) || [];
                  for (const p of padres) {
                    if (!p) continue;
                    if (!recetasAfectadasIds.has(String(p))) {
                      recetasAfectadasIds.add(String(p));
                      queue.push(p);
                    }
                  }
                }

                const insumosById = Object.fromEntries(
                  (insumos || []).map((i) => [i.id, i]),
                );
                const insumosAfter = Object.values(insumosById).map((i) => ({
                  ...i,
                  precio: String(i.id) === String(ins.id) ? precioNuevo : i.precio,
                }));

                let recetasOk = 0;
                const erroresRecetas = [];
                for (const recIdKey of recetasAfectadasIds) {
                  const receta = recetasPorId[recIdKey];
                  if (!receta) continue;
                  const recId = receta?.id ?? recIdKey;
                  const rindeNum = parseDecimal(receta.rinde) ?? 1;
                  const costoDespues = costoReceta(
                    recId,
                    recetaIngredientes || [],
                    insumosAfter,
                    recetas || [],
                  );
                  const costoUnitDespues = rindeNum > 0 ? costoDespues / rindeNum : 0;
                  try {
                    await updateRecetaCostos(recId, {
                      costo_lote: costoDespues,
                      costo_unitario: costoUnitDespues,
                    });
                    recetasOk += 1;
                  } catch (err) {
                    console.error("[insumos/premezclaUpdateRecetaCostos]", err);
                    erroresRecetas.push(receta.nombre || recIdKey);
                  }
                }

                if (recetasOk > 0) {
                  showToast(
                    `✅ Precio de premezcla actualizado y costos actualizados en ${recetasOk} receta(s)`,
                  );
                } else {
                  showToast("✅ Precio de premezcla actualizado");
                }
                if (erroresRecetas.length > 0) {
                  showToast(
                    `⚠️ No se pudo actualizar costo de: ${erroresRecetas
                      .slice(0, 2)
                      .join(", ")}${
                      erroresRecetas.length > 2 ? "…" : ""
                    }`,
                  );
                }
              } catch (err) {
                console.error("[insumos/premezclaRecalculoRecetas]", err);
                showToast(
                  "✅ Precio de premezcla actualizado (no se pudieron recalcular algunas recetas)",
                );
              }
              onRefresh();
            } catch (err) {
              console.error("[insumos/actualizarPrecioPremezcla]", err);
              showToast("⚠️ No se pudo actualizar el precio de la premezcla");
            }
          }}
          onClose={() => lista.setDetalleInsumo(null)}
          onEdit={(ins) => {
            lista.setDetalleInsumo(null);
            lista.openEdit(ins);
          }}
          onDelete={async () => {
            if (
              !(await lista.confirm(
                `¿Eliminar el insumo "${lista.detalleInsumo.nombre}"?`,
                { destructive: true }
              ))
            )
              return;
            try {
              await lista.deleteInsumo(lista.detalleInsumo.id);
              lista.setDetalleInsumo(null);
            } catch {
              showToast(
                "⚠️ No se pudo eliminar (en uso en recetas o movimientos)"
              );
            }
          }}
          confirm={confirm}
          showToast={showToast}
        />
      )}

      {precioDecisionModal && (
        <InsumosPrecioDecisionModal
          precioDecisionModal={precioDecisionModal}
          setPrecioDecisionModal={setPrecioDecisionModal}
          compraSaving={compraSaving}
          aplicarDecisiones={aplicarDecisionesPrecio}
          onClose={() => setPrecioDecisionModal(null)}
        />
      )}

      {compraResultado && (
        <InsumosCompraResultadoModal
          compraResultado={compraResultado}
          onVerRecetasAfectadas={onVerRecetasAfectadas}
          onClose={() => setCompraResultado(null)}
        />
      )}
    </div>
  );
}

export default Insumos;

