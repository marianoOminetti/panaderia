import { useMemo, useState } from "react";
import { fmt } from "../../lib/format";
import { formatFechaLocal, formatFechaRelativa } from "../../lib/dates";
import { agruparVentas } from "../../lib/agrupadores";
import { getTransaccionIdFromGrupo } from "../../lib/facturaFiscal";
import {
  grupoEstadoPago,
  motivoBloqueoUnificar,
  motivoBloqueoSeparar,
  buildResumenUnificacion,
} from "../../lib/unificarVentas";
import VentaAfipToolbar from "../ventas/VentaAfipToolbar";

const MEDIO_PAGO_LABEL = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
  debito: "Débito",
  credito: "Crédito",
};

function ClienteDetalleVentas({
  ventasCliente,
  recetas,
  cliente,
  clientes = [],
  promociones = [],
  facturasByTransaccion = {},
  notasCreditoByTransaccion = {},
  onRegistrarAfip,
  onEmitirNotaCredito,
  onRefacturarAfip,
  confirm,
  onUnificarRequest,
  unificarEnProgreso = false,
  unificacionesByTransaccion,
  onSepararRequest,
  separarEnProgreso = false,
  onAbrirVenta,
  title = "Historial de compras",
  emptyMessage = "No hay compras registradas para este cliente.",
  style,
}) {
  const grupos = agruparVentas(ventasCliente || []);
  const afipEnabled = Boolean(onRegistrarAfip);
  const [modoSeleccion, setModoSeleccion] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [estadoFiltro, setEstadoFiltro] = useState(null);

  const puedeActivarModo = grupos.length >= 2 && Boolean(onUnificarRequest);

  const gruposSeleccionados = useMemo(
    () => grupos.filter((g) => selectedKeys.has(g.key)),
    [grupos, selectedKeys],
  );

  const resumenSeleccion = useMemo(() => {
    if (gruposSeleccionados.length < 2) return null;
    return buildResumenUnificacion(gruposSeleccionados, recetas);
  }, [gruposSeleccionados, recetas]);

  const salirModoSeleccion = () => {
    setModoSeleccion(false);
    setSelectedKeys(new Set());
    setEstadoFiltro(null);
  };

  const toggleGrupo = (grupo) => {
    const estado = grupoEstadoPago(grupo);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(grupo.key)) {
        next.delete(grupo.key);
        if (next.size === 0) setEstadoFiltro(null);
        return next;
      }
      if (estadoFiltro && estado !== estadoFiltro) return prev;
      if (!estadoFiltro) setEstadoFiltro(estado);
      next.add(grupo.key);
      return next;
    });
  };

  const handleUnificar = () => {
    if (!onUnificarRequest || gruposSeleccionados.length < 2) return;
    onUnificarRequest(gruposSeleccionados, resumenSeleccion);
  };

  if (grupos.length === 0) {
    return (
      <div className="card" style={style}>
        <div className="card-header">
          <span className="card-title">{title}</span>
        </div>
        <p className="cliente-historial-empty">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="card cliente-historial-card" style={style}>
      <div className="card-header">
        <span className="card-title">{title}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="card-meta">
            {grupos.length} visita{grupos.length !== 1 ? "s" : ""}
          </span>
          {puedeActivarModo && !modoSeleccion && (
            <button
              type="button"
              className="edit-btn"
              onClick={() => setModoSeleccion(true)}
              disabled={unificarEnProgreso}
            >
              Unificar ventas
            </button>
          )}
          {modoSeleccion && (
            <button
              type="button"
              className="edit-btn"
              onClick={salirModoSeleccion}
              disabled={unificarEnProgreso}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {modoSeleccion && (
        <p className="form-hint cliente-historial-unificar-hint">
          Seleccioná 2 o más ventas del mismo estado (pagadas o en debe). No se
          pueden mezclar.
        </p>
      )}

      {grupos.map((grupo) => {
        const raw = grupo.rawItems?.[0] || grupo.items?.[0];
        const fechaRaw = raw?.fecha ? String(raw.fecha).slice(0, 10) : null;
        const fechasEnGrupo = new Set(
          (grupo.rawItems || [])
            .map((item) => (item.fecha ? String(item.fecha).slice(0, 10) : null))
            .filter(Boolean),
        );
        const variasFechasEnGrupo = fechasEnGrupo.size > 1;
        const fechaRelativa = fechaRaw ? formatFechaRelativa(fechaRaw) : "Sin fecha";
        const fechaCompleta = fechaRaw ? formatFechaLocal(fechaRaw, { weekday: true }) : null;
        const tieneDeuda = grupo.rawItems?.some((v) => v.estado_pago === "debe");
        const medioPago = raw?.medio_pago;
        const transaccionId = getTransaccionIdFromGrupo(grupo);
        const factura = transaccionId
          ? facturasByTransaccion[transaccionId]
          : null;
        const notaCredito = transaccionId
          ? notasCreditoByTransaccion[transaccionId]
          : null;
        const unificacionActiva = transaccionId
          ? unificacionesByTransaccion?.get?.(transaccionId)
          : null;
        const estadoGrupo = grupoEstadoPago(grupo);
        const bloqueo = motivoBloqueoUnificar(
          grupo,
          facturasByTransaccion,
          notasCreditoByTransaccion,
          unificacionesByTransaccion,
        );
        const bloqueoSeparar = transaccionId
          ? motivoBloqueoSeparar(
              transaccionId,
              facturasByTransaccion,
              notasCreditoByTransaccion,
            )
          : null;
        const puedeSeparar =
          Boolean(unificacionActiva && onSepararRequest && !bloqueoSeparar) &&
          !modoSeleccion;
        const seleccionado = selectedKeys.has(grupo.key);
        const incompatibleEstado =
          modoSeleccion &&
          estadoFiltro &&
          estadoGrupo !== estadoFiltro &&
          !seleccionado;

        const puedeEditar =
          Boolean(onAbrirVenta) && !modoSeleccion && !unificarEnProgreso;
        const mostrarAccionesAfip =
          afipEnabled && Boolean(transaccionId) && !modoSeleccion;

        return (
          <div
            key={grupo.key}
            className={`cliente-historial-item${
              seleccionado ? " cliente-historial-item--activo" : ""
            }`}
          >
            {modoSeleccion && (
              <label
                className="cliente-historial-check"
                title={
                  bloqueo ||
                  (incompatibleEstado
                    ? "Solo podés unificar ventas con el mismo estado de pago"
                    : "")
                }
              >
                <input
                  type="checkbox"
                  checked={seleccionado}
                  disabled={
                    unificarEnProgreso ||
                    Boolean(bloqueo) ||
                    incompatibleEstado
                  }
                  onChange={() => toggleGrupo(grupo)}
                />
              </label>
            )}
            <div className="cliente-historial-item-body">
              <div className="cliente-historial-fecha">
                <span className="cliente-historial-fecha-principal">
                  {fechaRelativa}
                </span>
                {fechaCompleta && fechaRelativa !== fechaCompleta && (
                  <span className="cliente-historial-fecha-sec">
                    {fechaCompleta}
                  </span>
                )}
                {tieneDeuda && (
                  <span className="cliente-historial-badge cliente-historial-badge--deuda">
                    Debe
                  </span>
                )}
                {variasFechasEnGrupo && (
                  <span className="cliente-historial-badge cliente-historial-badge--pendiente">
                    Varias fechas
                  </span>
                )}
                {puedeSeparar && (
                  <span className="cliente-historial-badge cliente-historial-badge--listo">
                    Unificada
                  </span>
                )}
              </div>
              <ul className="cliente-historial-productos">
                {(grupo.rawItems || []).map((item) => {
                  const receta = recetas?.find((r) => r.id === item.receta_id);
                  const linea =
                    item.total_final != null
                      ? item.total_final
                      : (item.precio_unitario || 0) * (item.cantidad || 0);
                  return (
                    <li key={item.id} className="cliente-historial-linea">
                      <span className="cliente-historial-emoji">
                        {receta?.emoji || "🍞"}
                      </span>
                      <span className="cliente-historial-nombre">
                        {receta?.nombre || "Producto"} × {item.cantidad || 0}
                      </span>
                      <span className="cliente-historial-precio">{fmt(linea)}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="cliente-historial-pie">
                <span>
                  {medioPago && MEDIO_PAGO_LABEL[medioPago]
                    ? MEDIO_PAGO_LABEL[medioPago]
                    : medioPago || ""}
                </span>
                <span>
                  <strong>Total {fmt(grupo.total)}</strong>
                  {afipEnabled && factura?.estado === "autorizada" && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        color: "var(--green)",
                        fontWeight: 600,
                      }}
                    >
                      AFIP
                    </span>
                  )}
                  {afipEnabled && factura?.estado === "mock" && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 10,
                        color: "var(--text-muted)",
                      }}
                    >
                      AFIP prueba
                    </span>
                  )}
                  {afipEnabled &&
                    (notaCredito?.estado === "autorizada" ||
                      notaCredito?.estado === "mock") && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          color: "var(--danger)",
                          fontWeight: 600,
                        }}
                      >
                        NC
                      </span>
                    )}
                </span>
              </div>
              {puedeSeparar && (
                <div className="cliente-historial-separar-row">
                  <button
                    type="button"
                    className="edit-btn"
                    onClick={() => onSepararRequest(transaccionId)}
                    disabled={separarEnProgreso || unificarEnProgreso}
                  >
                    Separar ventas
                  </button>
                </div>
              )}
              {bloqueoSeparar && unificacionActiva && !modoSeleccion && (
                <p className="form-hint cliente-historial-bloqueo">{bloqueoSeparar}</p>
              )}
              {bloqueo && modoSeleccion && (
                <p className="form-hint cliente-historial-bloqueo">{bloqueo}</p>
              )}
              {(mostrarAccionesAfip || puedeEditar) && (
                <div className="cliente-historial-afip-actions">
                  {mostrarAccionesAfip && (
                    <VentaAfipToolbar
                      inline
                      grupo={grupo}
                      transaccionId={transaccionId}
                      factura={factura}
                      notaCredito={notaCredito}
                      cliente={cliente}
                      clientes={clientes}
                      recetas={recetas}
                      promociones={promociones}
                      confirm={confirm}
                      onRegistrarAfip={onRegistrarAfip}
                      onEmitirNotaCredito={onEmitirNotaCredito}
                      onRefacturarAfip={onRefacturarAfip}
                    />
                  )}
                  {puedeEditar && (
                    <button
                      type="button"
                      className="btn-venta-action"
                      onClick={() => onAbrirVenta(grupo)}
                    >
                      Editar
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {modoSeleccion && selectedKeys.size >= 2 && resumenSeleccion && (
        <div className="cliente-historial-unificar-bar">
          <span>
            {selectedKeys.size} seleccionadas ·{" "}
            <strong>{fmt(resumenSeleccion.total)}</strong>
          </span>
          <button
            type="button"
            className="btn-primary"
            onClick={handleUnificar}
            disabled={unificarEnProgreso}
          >
            Unificar
          </button>
        </div>
      )}
    </div>
  );
}

export default ClienteDetalleVentas;
