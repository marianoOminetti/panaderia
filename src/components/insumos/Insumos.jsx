/**
 * Pantalla Insumos: orquesta lista (useInsumosLista + InsumosList), compra (useInsumosCompra + InsumosCompra)
 * y composición (useInsumosComposicion + InsumosComposicion). CRUD vía useInsumos.
 */
import { fmt, pctFmt, fmtStock } from "../../lib/format";
import { useInsumos } from "../../hooks/useInsumos";
import { useInsumosCompra } from "../../hooks/useInsumosCompra";
import { useInsumosLista } from "../../hooks/useInsumosLista";
import { useInsumosComposicion } from "../../hooks/useInsumosComposicion";
import { CATEGORIAS } from "../../config/appConfig";
import InsumosList from "./InsumosList";
import InsumosCompra from "./InsumosCompra";
import InsumosComposicion from "./InsumosComposicion";

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
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => lista.setMovModal(false)}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {lista.movTipo === "ingreso" ? "📥 Ingreso" : "📤 Egreso"} ·{" "}
              {lista.movInsumo.nombre}
            </span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">
                Cantidad ({lista.movInsumo.unidad || "g"})
              </label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="any"
                value={lista.movCantidad}
                onChange={(e) => lista.setMovCantidad(e.target.value)}
                placeholder="Ej: 500"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Valor $ (opcional)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                value={lista.movValor}
                onChange={(e) => lista.setMovValor(e.target.value)}
                placeholder="Costo o valor del movimiento"
              />
            </div>
            <button
              className="btn-primary"
              onClick={lista.guardarMovimiento}
              disabled={
                lista.movSaving ||
                !lista.movCantidad ||
                parseFloat(lista.movCantidad) <= 0
              }
            >
              {lista.movSaving
                ? "Guardando..."
                : lista.movTipo === "ingreso"
                ? "Registrar ingreso"
                : "Registrar egreso"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => lista.setMovModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {lista.modal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => lista.setModal(false)}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {lista.editando ? "Editar insumo" : "Nuevo insumo"}
            </span>
          </div>
          <div className="screen-content">
            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input
                className="form-input"
                value={lista.form.nombre}
                onChange={(e) =>
                  lista.setForm({ ...lista.form, nombre: e.target.value })
                }
                placeholder="Ej: Harina de almendras"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="form-select"
                value={lista.form.categoria}
                onChange={(e) =>
                  lista.setForm({ ...lista.form, categoria: e.target.value })
                }
              >
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Precio ($)</label>
                <input
                  className="form-input"
                  type="number"
                  value={lista.form.precio}
                  onChange={(e) =>
                    lista.setForm({ ...lista.form, precio: e.target.value })
                  }
                  placeholder="4500"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Presentación</label>
                <input
                  className="form-input"
                  value={lista.form.presentacion}
                  onChange={(e) =>
                    lista.setForm({
                      ...lista.form,
                      presentacion: e.target.value,
                    })
                  }
                  placeholder="x 30 u"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Cantidad</label>
                <input
                  className="form-input"
                  type="number"
                  value={lista.form.cantidad_presentacion}
                  onChange={(e) =>
                    lista.setForm({
                      ...lista.form,
                      cantidad_presentacion: e.target.value,
                    })
                  }
                  placeholder="30"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Unidad</label>
                <select
                  className="form-select"
                  value={lista.form.unidad}
                  onChange={(e) =>
                    lista.setForm({ ...lista.form, unidad: e.target.value })
                  }
                >
                  {["g", "ml", "u", "kg", "l"].map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={lista.save}
              disabled={lista.saving || !lista.form.nombre || !lista.form.precio}
            >
              {lista.saving
                ? "Guardando..."
                : lista.editando
                ? "Guardar cambios"
                : "Agregar insumo"}
            </button>
            <button
              className="btn-secondary"
              onClick={() => lista.setModal(false)}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {lista.detalleInsumo && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => lista.setDetalleInsumo(null)}
            >
              ← Volver
            </button>
            <span className="screen-title">
              {lista.detalleInsumo.nombre}
            </span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Detalle</span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                <strong>Categoría:</strong> {lista.detalleInsumo.categoria}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                <strong>Presentación:</strong>{" "}
                {lista.detalleInsumo.presentacion || "—"}
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                <strong>Precio:</strong>{" "}
                {fmt(lista.detalleInsumo.precio || 0)} (
                {precioPorU(lista.detalleInsumo)})
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                <strong>Stock:</strong>{" "}
                {fmtStock((insumoStock || {})[lista.detalleInsumo.id] ?? 0)}{" "}
                {lista.detalleInsumo.unidad || "g"}
              </p>
            </div>

            <InsumosComposicion
              detalleInsumo={lista.detalleInsumo}
              insumos={insumos}
              insumoComposicion={insumoComposicion}
              compInsumoSel={composicion.compInsumoSel}
              setCompInsumoSel={composicion.setCompInsumoSel}
              compFactor={composicion.compFactor}
              setCompFactor={composicion.setCompFactor}
              compSaving={composicion.compSaving}
              setCompSaving={composicion.setCompSaving}
              onDeleteComposicion={deleteInsumoComposicion}
              onUpsertComposicion={upsertInsumoComposicion}
              confirm={confirm}
              showToast={showToast}
            />

            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
              Para registrar compras (ingresos), usá &quot;Registrar compra de stock&quot; arriba.
            </p>

            <button
              className="btn-secondary"
              onClick={() => {
                lista.setDetalleInsumo(null);
                lista.openEdit(lista.detalleInsumo);
              }}
              style={{ marginBottom: 8 }}
            >
              ✏️ Editar insumo
            </button>
            <button
              className="btn-danger"
              onClick={async () => {
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
            >
              Eliminar insumo
            </button>
          </div>
        </div>
      )}

      {precioDecisionModal && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setPrecioDecisionModal(null)}
              disabled={compraSaving}
            >
              ← Volver
            </button>
            <span className="screen-title">Precios actualizados</span>
          </div>
          <div className="screen-content">
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Algunos insumos tienen un precio distinto al registrado.
              Elegí qué hacer con cada uno:
            </p>
            <div className="card" style={{ marginBottom: 16 }}>
              {(precioDecisionModal.items || []).map((item) => {
                const insumoId = item.insumoId;
                const accion = item.accion || "update";
                return (
                  <div
                    key={insumoId}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <div
                      style={{ fontWeight: 600, marginBottom: 4 }}
                    >
                      {item.nombre}
                    </div>
                    <div
                      style={{
                        color: "var(--text-muted)",
                        marginBottom: 4,
                      }}
                    >
                      Precio anterior:{" "}
                      <strong>{fmt(item.precioAnterior)}</strong>
                      <br />
                      Precio nuevo:{" "}
                      <strong>{fmt(item.precioNuevo)}</strong>
                      {item.diffPct != null && (
                        <>
                          <br />
                          Diferencia:{" "}
                          <strong
                            style={{
                              color:
                                item.diffPct > 0
                                  ? "var(--danger)"
                                  : "var(--green)",
                            }}
                          >
                            {pctFmt(item.diffPct)}
                          </strong>
                        </>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 4,
                      }}
                    >
                      <button
                        type="button"
                        className={accion === "update" ? "btn-primary" : "btn-secondary"}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          fontSize: 12,
                          borderRadius: 10,
                        }}
                        onClick={() =>
                          setPrecioDecisionModal((prev) => ({
                            ...prev,
                            items: (prev.items || []).map((it) =>
                              it.insumoId === insumoId
                                ? { ...it, accion: "update" }
                                : it
                            ),
                          }))
                        }
                        disabled={compraSaving}
                      >
                        ✅ Actualizar precio
                      </button>
                      <button
                        type="button"
                        className={accion === "keep" ? "btn-primary" : "btn-secondary"}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          fontSize: 12,
                          borderRadius: 10,
                        }}
                        onClick={() =>
                          setPrecioDecisionModal((prev) => ({
                            ...prev,
                            items: (prev.items || []).map((it) =>
                              it.insumoId === insumoId
                                ? { ...it, accion: "keep" }
                                : it
                            ),
                          }))
                        }
                        disabled={compraSaving}
                      >
                        🕓 Mantener precio anterior
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Si no querés cambiar ningún precio, elegí &quot;Mantener precio anterior&quot; en cada uno.
            </p>
            <button
              className="btn-primary"
              onClick={aplicarDecisionesPrecio}
              disabled={compraSaving}
            >
              {compraSaving
                ? "Guardando…"
                : "Registrar compra"}
            </button>
          </div>
        </div>
      )}

      {compraResultado && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setCompraResultado(null)}
            >
              ← Cerrar
            </button>
            <span className="screen-title">
              Resumen de actualización
            </span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">
                  Se actualizaron{" "}
                  {compraResultado.preciosActualizados} precios
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                Estos cambios impactaron en las recetas y sus márgenes:
              </p>
            </div>
            {compraResultado.recetasAfectadas &&
              compraResultado.recetasAfectadas.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header">
                    <span className="card-title">
                      Recetas afectadas
                    </span>
                  </div>
                  {compraResultado.recetasAfectadas.map((r) => {
                    const margenAntesTxt =
                      r.margenAntes != null
                        ? pctFmt(r.margenAntes)
                        : "—";
                    const margenDespuesTxt =
                      r.margenDespues != null
                        ? pctFmt(r.margenDespues)
                        : "—";
                    const empeoro =
                      r.margenAntes != null &&
                      r.margenDespues != null &&
                      r.margenDespues < r.margenAntes;
                    return (
                      <div
                        key={r.id}
                        className="insumo-item"
                        style={{ padding: "8px 0" }}
                      >
                        <div
                          className="insumo-info"
                          style={{ flex: 1 }}
                        >
                          <div className="insumo-nombre">
                            {r.emoji} {r.nombre}
                          </div>
                          <div className="insumo-detalle">
                            Margen:{" "}
                            <strong>{margenAntesTxt}</strong> →{" "}
                            <strong
                              style={{
                                color: empeoro
                                  ? "var(--danger)"
                                  : "var(--green)",
                              }}
                            >
                              {margenDespuesTxt}
                            </strong>{" "}
                            {empeoro ? "↓" : "↑"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 12,
              }}
            >
              Revisá si necesitás ajustar precios de venta.
            </p>
            {compraResultado.recetasAfectadas &&
              compraResultado.recetasAfectadas.length > 0 &&
              onVerRecetasAfectadas && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    const ids = compraResultado.recetasAfectadas.map(
                      (r) => r.id
                    );
                    onVerRecetasAfectadas(ids);
                    setCompraResultado(null);
                  }}
                  style={{ marginBottom: 8 }}
                >
                  Ver recetas afectadas
                </button>
              )}
            <button
              className="btn-secondary"
              onClick={() => setCompraResultado(null)}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Insumos;

