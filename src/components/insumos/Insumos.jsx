/**
 * Pantalla Insumos: orquesta lista (useInsumosLista + InsumosList), compra (useInsumosCompra + InsumosCompra)
 * y composición (useInsumosComposicion + InsumosComposicion). CRUD vía useInsumos.
 */
import { fmt } from "../../lib/format";
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
  recetas,
  recetaIngredientes,
  onRefresh,
  showToast,
  confirm,
  onVerRecetasAfectadas,
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
    updateInsumo,
    insertInsumo,
    insertPrecioHistorial,
    registrarMovimientoInsumo,
    deleteInsumo,
    onRefresh,
    showToast,
    confirm,
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
    compraListening,
    compraTranscript,
    agregarAlCarritoCompra,
    actualizarCantidadCarrito,
    eliminarDeCarritoCompra,
    actualizarPrecioCarrito,
    totalCompra,
    confirmarCompra,
    aplicarDecisionesPrecio,
    iniciarRecCompra,
    detenerRecCompra,
  } = useInsumosCompra({
    insumos,
    recetas,
    recetaIngredientes,
    registrarMovimientoInsumo,
    onRefresh,
    showToast,
    updateInsumo,
    insertPrecioHistorial,
    updateRecetaCostos,
  });

  const precioPorU = (i) => {
    const den = i.cantidad_presentacion > 0 ? i.cantidad_presentacion : 1;
    const p = (i.precio || 0) / den;
    return i.unidad === "u" ? `${fmt(p)}/u` : `${fmt(p)}/${i.unidad || "g"}`;
  };

  const insumosMap = Object.fromEntries(insumos.map((i) => [i.id, i]));

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
          compraListening={compraListening}
          compraTranscript={compraTranscript}
          insumos={insumos}
          insumoStock={insumoStock}
          totalCompra={totalCompra}
          precioPorU={precioPorU}
          onBack={() => {
            if (compraSaving) return;
            setCompraScreenOpen(false);
          }}
          onHablar={iniciarRecCompra}
          onDetener={detenerRecCompra}
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

