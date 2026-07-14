/**
 * Detalle de un cliente: pedidos (ClienteDetallePedidos) y ventas (ClienteDetalleVentas), alta de pedido y acciones.
 * Usa useClientes para operaciones de estado.
 */
import { useRef, useState, useEffect, useMemo } from "react";
import ClienteFormModal from "./ClienteFormModal";
import ClienteUnificarModal from "./ClienteUnificarModal";
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { agruparPedidos, agruparVentas } from "../../lib/agrupadores";
import { getTransaccionIdFromGrupo, facturaListaParaPdf } from "../../lib/facturaFiscal";
import { reportError } from "../../utils/errorReport";
import {
  buildVentaRowsFromPedido,
  buildStockDeltasFromPedidoItems,
  getPedidoVentaTransaccionId,
  resolveVentasParaDesentregar,
  withPendingVentaIds,
} from "../../lib/pedidoEntrega";
import { canDesentregarPedido } from "../../lib/pedidos";
import { supabase } from "../../lib/supabaseClient";
import { useClientes } from "../../hooks/useClientes";
import { useAfipComprobanteActions } from "../../hooks/useAfipComprobanteActions";
import { useVentas, releaseVentaTransaccionClaim } from "../../hooks/useVentas";
import { enqueueVentaWrite } from "../../lib/ventaWriteQueue";
import ClienteDetallePedidos from "./ClienteDetallePedidos";
import ClienteDetalleVentas from "./ClienteDetalleVentas";
import ClientePerfilCompra from "./ClientePerfilCompra";
import ClienteWhatsAppButton from "./ClienteWhatsAppButton";
import VentasUnificarModal from "../ventas/VentasUnificarModal";
import VentasSepararModal from "../ventas/VentasSepararModal";
import ShareTicketModal from "../shared/ShareTicketModal";
import { useVentasUnificaciones } from "../../hooks/useVentasUnificaciones";
import { copiarTelefonoCliente } from "../../lib/whatsappCliente";
import { deudaCliente } from "../../lib/clienteDeuda";
import {
  buildLineasAuditoria,
  buildPreviewSeparar,
  buildShareDataUnificado,
  elegirTransaccionDestino,
  indexUnificacionesActivas,
  validarUnificacion,
  motivoBloqueoSeparar,
} from "../../lib/unificarVentas";

function ClienteDetalle({
  cliente,
  ventas,
  recetas,
  pedidos,
  perfil,
  onClose,
  actualizarStock,
  actualizarStockBatch,
  showToast,
  confirm,
  onRefresh,
  updateClienteInState,
  appendVentas,
  patchStock,
  removeVentas,
  resolveOptimisticVentas,
  updatePedidosEstado,
  patchPedidosByPedidoId,
  onClienteUpdated,
  clientes,
  removeClienteFromState,
  reassignClienteIdInState,
  replaceVentas,
  promociones = [],
  onAbrirVenta,
}) {
  const [editModal, setEditModal] = useState(false);
  const [unificarModal, setUnificarModal] = useState(false);
  const [unificarVentasModal, setUnificarVentasModal] = useState(false);
  const [unificarResumen, setUnificarResumen] = useState(null);
  const [unificarGrupos, setUnificarGrupos] = useState([]);
  const [unificandoVentas, setUnificandoVentas] = useState(false);
  const unificarInFlightRef = useRef(false);
  const [shareTicketData, setShareTicketData] = useState(null);
  const [historialKey, setHistorialKey] = useState(0);
  const [separarModal, setSepararModal] = useState(false);
  const [separarPreview, setSepararPreview] = useState(null);
  const [separarUnificacionId, setSepararUnificacionId] = useState(null);
  const [separandoVentas, setSeparandoVentas] = useState(false);
  const separarInFlightRef = useRef(false);
  const entregaInFlightRef = useRef(new Set());
  const desentregaInFlightRef = useRef(new Set());
  const clienteId = cliente?.id ?? null;
  const ventasCliente = useMemo(
    () => (clienteId ? ventas.filter((v) => v.cliente_id === clienteId) : []),
    [ventas, clienteId],
  );
  const ventasTransaccionIds = useMemo(() => {
    const grupos = agruparVentas(ventasCliente);
    return [...new Set(grupos.map(getTransaccionIdFromGrupo).filter(Boolean))];
  }, [ventasCliente]);
  const {
    updatePedidoEstado,
    updatePedidoEntregado,
    desentregarPedido,
    deleteVentasByIds,
    softDeleteCliente,
    updateClienteDatosFiscales,
  } = useClientes({
    onRefresh,
    showToast,
    updateClienteInState,
    updatePedidosEstado,
    patchPedidosByPedidoId,
  });
  const {
    facturasByTransaccion,
    notasCreditoByTransaccion,
    hydrateAfipForTransacciones,
    registrarAfipDesdeVenta,
    emitirNotaCreditoDesdeVenta,
    refacturarAfipDesdeVenta,
  } = useAfipComprobanteActions({
    ventas,
    clientes,
    showToast,
    updateClienteDatosFiscales,
  });
  const { insertVentas, deleteVentas } = useVentas();
  const {
    unificacionesActivas,
    unificarConAuditoria,
    deshacerUnificacion,
    refreshUnificaciones,
  } = useVentasUnificaciones(clienteId);

  const unificacionesByTransaccion = useMemo(
    () => indexUnificacionesActivas(unificacionesActivas),
    [unificacionesActivas],
  );

  useEffect(() => {
    if (!clienteId) return;
    hydrateAfipForTransacciones(ventasTransaccionIds);
  }, [clienteId, ventasTransaccionIds, hydrateAfipForTransacciones]);

  if (!cliente) return null;

  const deuda = deudaCliente(ventas, cliente.id);

  const getVentasDeCliente = (id) => ventas.filter((v) => v.cliente_id === id);

  const actualizarEstadoPedido = async (grupo, nuevoEstado) => {
    if (!grupo || !nuevoEstado || grupo.estado === nuevoEstado) return;
    try {
      await updatePedidoEstado(grupo.key, nuevoEstado);
    } catch (err) {
      reportError(err, {
        action: "actualizarEstadoPedido",
        pedido_id: grupo?.key,
      });
      showToast("⚠️ Error al actualizar estado del pedido");
    }
  };

  const marcarPedidoEntregado = async (grupo) => {
    if (!grupo || !grupo.rawItems?.length) return;
    if (entregaInFlightRef.current.has(grupo.key)) {
      showToast("Registrando entrega anterior…");
      return;
    }
    const ok = await confirm(
      "¿Marcar este pedido como entregado? Se registrará la venta y se descontará el stock.",
      { destructive: false },
    );
    if (!ok) return;

    entregaInFlightRef.current.add(grupo.key);
    const hoy = hoyLocalISO();
    const transaccionId = grupo.key;
    const rows = buildVentaRowsFromPedido(grupo, { fecha: hoy, transaccionId });
    const pendingRows = withPendingVentaIds(rows, transaccionId);
    const pendingIds = pendingRows.map((r) => r.id);
    const stockDeltas = buildStockDeltasFromPedidoItems(grupo.rawItems, -1);
    const estadoAnterior = grupo.estado || "pendiente";

    appendVentas?.(pendingRows);
    patchStock?.(stockDeltas);
    updatePedidosEstado?.(grupo.key, "entregado");
    patchPedidosByPedidoId?.(grupo.key, {
      estado: "entregado",
      venta_transaccion_id: transaccionId,
    });
    showToast("Registrando entrega…");

    try {
      await enqueueVentaWrite(async () => {
        let inserted = [];
        let insertedIds = [];
        try {
          inserted = await insertVentas(rows, { source: "pedido_entrega" });
          insertedIds = (inserted || []).map((r) => r.id).filter(Boolean);
          await updatePedidoEntregado(grupo.key, {
            venta_transaccion_id: transaccionId,
          });
        } catch (ventaErr) {
          if (insertedIds.length > 0) {
            try {
              await deleteVentasByIds(insertedIds);
            } catch (rollbackErr) {
              reportError(rollbackErr, { action: "rollbackVentasAfterPedidoEntregadoFail" });
            }
          }
          if (transaccionId) {
            await releaseVentaTransaccionClaim(transaccionId);
          }
          throw ventaErr;
        }
        if (actualizarStockBatch && stockDeltas.length) {
          await actualizarStockBatch(stockDeltas, { useLocalBase: true });
        }
        if (resolveOptimisticVentas) {
          resolveOptimisticVentas(transaccionId, inserted || [], pendingIds);
        } else {
          removeVentas?.(pendingIds);
          appendVentas?.(inserted || []);
        }
      });
    } catch (err) {
      removeVentas?.(pendingIds);
      patchStock?.(stockDeltas.map((d) => ({ ...d, delta: -d.delta })));
      updatePedidosEstado?.(grupo.key, estadoAnterior);
      patchPedidosByPedidoId?.(grupo.key, {
        estado: estadoAnterior,
        venta_transaccion_id: null,
      });
      await onRefresh?.();
      reportError(err, {
        action: "marcarPedidoEntregado",
        pedido_id: grupo?.key,
      });
      showToast("⚠️ No se pudo marcar el pedido como entregado");
    } finally {
      entregaInFlightRef.current.delete(grupo.key);
    }
  };

  const desentregarPedidoGrupo = async (grupo) => {
    if (!grupo?.key) return;
    if (desentregaInFlightRef.current.has(grupo.key)) {
      showToast("Revirtiendo entrega anterior…");
      return;
    }

    const ventaSelect =
      "id, receta_id, cantidad, transaccion_id, cliente_id, fecha, created_at, precio_unitario";
    const fetchByTransaccionId = async (tx) => {
      const { data, error } = await supabase
        .from("ventas")
        .select(ventaSelect)
        .eq("transaccion_id", tx);
      if (error) throw error;
      return data || [];
    };
    const fetchByClienteId = async (clienteId) => {
      const { data, error } = await supabase
        .from("ventas")
        .select(ventaSelect)
        .eq("cliente_id", clienteId)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data || [];
    };

    let resolved;
    try {
      resolved = await resolveVentasParaDesentregar({
        grupo,
        ventasLocales: ventas,
        fetchByTransaccionId,
        fetchByClienteId,
      });
    } catch (err) {
      reportError(err, {
        action: "resolveVentasParaDesentregarCliente",
        pedido_id: grupo.key,
      });
      showToast("⚠️ No se pudo buscar la venta del pedido");
      return;
    }

    if (!resolved.ventas.length) {
      showToast(
        "No se encontró una venta con los mismos productos de este pedido para desentregar.",
      );
      return;
    }

    const transaccionId = resolved.transaccionId;
    const factura = facturasByTransaccion?.[transaccionId];
    if (facturaListaParaPdf(factura)) {
      showToast(
        "Este pedido tiene factura AFIP. Emití una nota de crédito antes de desentregar.",
      );
      return;
    }
    if (!factura && transaccionId) {
      const { data: facturaDb } = await supabase
        .from("facturas_electronicas")
        .select("estado, cae")
        .eq("transaccion_id", transaccionId)
        .maybeSingle();
      if (facturaListaParaPdf(facturaDb)) {
        showToast(
          "Este pedido tiene factura AFIP. Emití una nota de crédito antes de desentregar.",
        );
        return;
      }
    }

    const ok = await confirm(
      "¿Desentregar este pedido?\nSe borrará la venta asociada y se devolverá el stock. El pedido quedará pendiente.",
    );
    if (!ok) return;

    desentregaInFlightRef.current.add(grupo.key);
    const ventasAsociadas = resolved.ventas;
    const ventaIds = ventasAsociadas.map((v) => v.id).filter(Boolean);
    const stockDeltas = buildStockDeltasFromPedidoItems(ventasAsociadas, 1);

    removeVentas?.(ventaIds);
    patchStock?.(stockDeltas);
    updatePedidosEstado?.(grupo.key, "pendiente");
    patchPedidosByPedidoId?.(grupo.key, {
      estado: "pendiente",
      venta_transaccion_id: null,
    });
    showToast("Desentregando…");

    try {
      await enqueueVentaWrite(async () => {
        if (ventaIds.length) {
          await deleteVentas(ventaIds);
        }
        if (transaccionId) {
          await releaseVentaTransaccionClaim(transaccionId);
        }
        await desentregarPedido(grupo.key);
        if (actualizarStockBatch && stockDeltas.length) {
          await actualizarStockBatch(stockDeltas, { useLocalBase: true });
        }
      });
      showToast("✅ Pedido desentregado");
    } catch (err) {
      await onRefresh?.();
      reportError(err, {
        action: "desentregarPedidoDesdeCliente",
        pedido_id: grupo?.key,
      });
      showToast("⚠️ No se pudo desentregar el pedido");
    } finally {
      desentregaInFlightRef.current.delete(grupo.key);
    }
  };

  const pedidosClienteAgrupados = agruparPedidos(
    (pedidos || []).filter((p) => p.cliente_id === cliente.id),
  );

  const findVentaKeyParaPedido = (grupo) => {
    const linked = getPedidoVentaTransaccionId(grupo);
    if (
      linked &&
      (ventas || []).some((v) => v.transaccion_id && v.transaccion_id === linked)
    ) {
      return linked;
    }
    if (
      grupo?.key &&
      (ventas || []).some(
        (v) => v.transaccion_id && v.transaccion_id === grupo.key,
      )
    ) {
      return grupo.key;
    }
    return null;
  };

  const abrirVentaGrupo = (grupo) => {
    if (!grupo?.key || !onAbrirVenta) return;
    onAbrirVenta(grupo);
  };

  const abrirPedidoAsociado = (grupo) => {
    if (!onAbrirVenta) return;
    const transaccionId = findVentaKeyParaPedido(grupo);
    if (!transaccionId) {
      showToast?.("No se encontró la venta de este pedido");
      return;
    }
    onAbrirVenta({ key: transaccionId });
  };

  const puedeAbrirPedido = (grupo) =>
    canDesentregarPedido(grupo.estado) && Boolean(findVentaKeyParaPedido(grupo));

  const handleUnificarRequest = (grupos, resumen) => {
    const validacion = validarUnificacion({
      grupos,
      facturasByTransaccion,
      notasCreditoByTransaccion,
      unificacionesActivasByTransaccion: unificacionesByTransaccion,
    });
    if (!validacion.ok) {
      showToast?.(`⚠️ ${validacion.reason}`);
      return;
    }
    setUnificarGrupos(grupos);
    setUnificarResumen(resumen);
    setUnificarVentasModal(true);
  };

  const handleConfirmarUnificacion = async ({ marcarPagado, medioPago }) => {
    if (unificarInFlightRef.current || unificandoVentas || !unificarResumen) return;
    const validacion = validarUnificacion({
      grupos: unificarGrupos,
      facturasByTransaccion,
      notasCreditoByTransaccion,
      unificacionesActivasByTransaccion: unificacionesByTransaccion,
    });
    if (!validacion.ok) {
      showToast?.(`⚠️ ${validacion.reason}`);
      return;
    }

    const transaccionDestino = elegirTransaccionDestino(unificarGrupos);
    const lineas = buildLineasAuditoria(unificarResumen.ventaIds, ventasCliente);
    unificarInFlightRef.current = true;
    setUnificandoVentas(true);
    try {
      const { ventas: updated, sinAuditoria } = await unificarConAuditoria({
        clienteId: cliente.id,
        transaccionIdDestino: transaccionDestino,
        marcarPagado,
        medioPago,
        lineas,
      });
      if (replaceVentas && updated.length) {
        replaceVentas(updated);
      }
      const shareData = buildShareDataUnificado({
        clienteNombre: cliente.nombre,
        resumen: {
          ...unificarResumen,
          estadoPago: marcarPagado ? "pagado" : unificarResumen.estadoPago,
        },
      });
      if (marcarPagado) {
        shareData.estado_pago = "pagado";
        shareData.medio_pago = medioPago;
      }
      setUnificarVentasModal(false);
      setUnificarGrupos([]);
      setUnificarResumen(null);
      setHistorialKey((k) => k + 1);
      showToast?.(
        sinAuditoria
          ? "✓ Ventas unificadas (sin deshacer: falta migración en Supabase)"
          : "✓ Ventas unificadas",
      );
      setShareTicketData(shareData);
    } catch (err) {
      reportError(err, {
        action: "unificarVentas",
        clienteId: cliente.id,
      });
      const detalle = err?.message ? `: ${err.message}` : "";
      showToast?.(`⚠️ No se pudieron unificar las ventas${detalle}`);
      await onRefresh?.();
    } finally {
      unificarInFlightRef.current = false;
      setUnificandoVentas(false);
    }
  };

  const handleSepararRequest = (transaccionId) => {
    const bloqueo = motivoBloqueoSeparar(
      transaccionId,
      facturasByTransaccion,
      notasCreditoByTransaccion,
    );
    if (bloqueo) {
      showToast?.(`⚠️ ${bloqueo}`);
      return;
    }
    const unificacion = unificacionesByTransaccion.get(transaccionId);
    if (!unificacion?.lineas?.length) return;
    const preview = buildPreviewSeparar(unificacion.lineas, ventas, recetas);
    setSepararUnificacionId(unificacion.id);
    setSepararPreview(preview);
    setSepararModal(true);
  };

  const handleConfirmarSeparar = async () => {
    if (
      separarInFlightRef.current ||
      separandoVentas ||
      !separarUnificacionId
    ) {
      return;
    }
    separarInFlightRef.current = true;
    setSeparandoVentas(true);
    try {
      const updated = await deshacerUnificacion(separarUnificacionId);
      if (replaceVentas && updated.length) {
        replaceVentas(updated);
      }
      setSepararModal(false);
      setSepararPreview(null);
      setSepararUnificacionId(null);
      setHistorialKey((k) => k + 1);
      showToast?.("✓ Ventas separadas");
      await refreshUnificaciones();
    } catch (err) {
      reportError(err, {
        action: "deshacerUnificacion",
        unificacionId: separarUnificacionId,
        clienteId: cliente.id,
      });
      const msg =
        err?.message?.includes("migración")
          ? err.message
          : "⚠️ No se pudieron separar las ventas";
      showToast?.(msg);
      await onRefresh?.();
    } finally {
      separarInFlightRef.current = false;
      setSeparandoVentas(false);
    }
  };

  const handleEliminarCliente = async () => {
    const ok = await confirm(
      "¿Dar de baja este cliente? No se borran ventas ni pedidos; solo dejará de aparecer en la lista.",
      { destructive: true },
    );
    if (!ok) return;
    try {
      await softDeleteCliente(cliente.id);
      onClose();
    } catch (err) {
      reportError(err, { action: "softDeleteCliente", clienteId: cliente.id });
      const msg =
        err?.message && /eliminado|column/i.test(String(err.message))
          ? "No se pudo dar de baja. Verificá que la migración de clientes esté aplicada."
          : "⚠️ No se pudo dar de baja el cliente";
      showToast(msg);
    }
  };

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button
          className="screen-back"
          onClick={() => {
            onClose();
          }}
        >
          ← Volver
        </button>
        <span className="screen-title">{cliente.nombre}</span>
      </div>
      <div className="screen-content">
        <div className="card cliente-resumen-card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Resumen</span>
            <div className="cliente-resumen-acciones">
              {cliente.telefono?.trim() && (
                <ClienteWhatsAppButton
                  cliente={cliente}
                  diasDesdeUltima={perfil?.diasDesdeUltima}
                  favoritoNombre={perfil?.favoritos?.[0]?.receta?.nombre}
                  variant={perfil?.inactivo ? "retencion" : "generico"}
                  showToast={showToast}
                />
              )}
              <button
                type="button"
                className="edit-btn"
                onClick={() => setEditModal(true)}
                aria-label="Editar cliente"
              >
                Editar
              </button>
              <button
                type="button"
                className="edit-btn"
                onClick={() => setUnificarModal(true)}
                aria-label="Unificar con otro cliente"
              >
                Unificar
              </button>
              <button
                type="button"
                className="edit-btn"
                onClick={handleEliminarCliente}
                style={{ fontSize: 13, fontWeight: 500, color: "var(--danger)" }}
                aria-label="Dar de baja cliente"
              >
                Dar de baja
              </button>
            </div>
          </div>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              marginBottom: 6,
            }}
          >
            <strong>Teléfono:</strong> {cliente.telefono || "—"}
            {cliente.telefono?.trim() && (
              <button
                type="button"
                className="edit-btn"
                style={{ marginLeft: 8, fontSize: 12 }}
                onClick={async () => {
                  const ok = await copiarTelefonoCliente(cliente.telefono);
                  showToast?.(ok ? "Número copiado" : "No se pudo copiar");
                }}
              >
                Copiar
              </button>
            )}
          </p>
          {(cliente.razon_social || cliente.cuit || cliente.dni) && (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginBottom: 6,
              }}
            >
              <strong>Facturación:</strong>{" "}
              {cliente.razon_social || "—"}
              {(cliente.cuit || cliente.dni) &&
                ` · ${cliente.cuit || cliente.dni}`}
            </p>
          )}
          {deuda > 0 && (
            <p className="clientes-deuda-resumen">
              <strong>Deuda pendiente:</strong> {fmt(deuda)}
            </p>
          )}
          <p
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            <strong>Total gastado:</strong>{" "}
            {fmt(
              getVentasDeCliente(cliente.id).reduce((s, v) => {
                const linea =
                  v.total_final != null
                    ? v.total_final
                    : (v.precio_unitario || 0) * (v.cantidad || 0);
                return s + linea;
              }, 0),
            )}
          </p>
        </div>

        <ClienteDetallePedidos
          pedidosClienteAgrupados={pedidosClienteAgrupados}
          recetas={recetas}
          savingEntrega={false}
          actualizarEstadoPedido={actualizarEstadoPedido}
          marcarPedidoEntregado={marcarPedidoEntregado}
          desentregarPedido={desentregarPedidoGrupo}
          clienteNombre={cliente.nombre}
          onAbrirPedido={onAbrirVenta ? abrirPedidoAsociado : undefined}
          puedeAbrirPedido={onAbrirVenta ? puedeAbrirPedido : undefined}
        />

        <ClienteDetalleVentas
          key={historialKey}
          ventasCliente={ventasCliente}
          recetas={recetas}
          cliente={cliente}
          clientes={clientes}
          promociones={promociones}
          facturasByTransaccion={facturasByTransaccion}
          notasCreditoByTransaccion={notasCreditoByTransaccion}
          onRegistrarAfip={registrarAfipDesdeVenta}
          onEmitirNotaCredito={emitirNotaCreditoDesdeVenta}
          onRefacturarAfip={refacturarAfipDesdeVenta}
          confirm={confirm}
          onUnificarRequest={handleUnificarRequest}
          unificarEnProgreso={unificandoVentas}
          unificacionesByTransaccion={unificacionesByTransaccion}
          onSepararRequest={handleSepararRequest}
          separarEnProgreso={separandoVentas}
          onAbrirVenta={onAbrirVenta ? abrirVentaGrupo : undefined}
        />

        <ClientePerfilCompra perfil={perfil} />
      </div>

      {editModal && (
        <ClienteFormModal
          visible={editModal}
          onClose={() => setEditModal(false)}
          clientes={clientes}
          onRefresh={onRefresh}
          updateClienteInState={updateClienteInState}
          showToast={showToast}
          editando={cliente}
          onSaved={(updated) => onClienteUpdated?.(updated)}
          confirm={confirm}
        />
      )}

      {separarModal && separarPreview && (
        <VentasSepararModal
          open={separarModal}
          onClose={() => {
            if (separandoVentas) return;
            setSepararModal(false);
            setSepararPreview(null);
            setSepararUnificacionId(null);
          }}
          preview={separarPreview}
          onConfirm={handleConfirmarSeparar}
          confirming={separandoVentas}
        />
      )}

      {unificarVentasModal && unificarResumen && (
        <VentasUnificarModal
          open={unificarVentasModal}
          onClose={() => {
            if (unificandoVentas) return;
            setUnificarVentasModal(false);
            setUnificarGrupos([]);
            setUnificarResumen(null);
          }}
          clienteNombre={cliente.nombre}
          resumen={unificarResumen}
          onConfirm={handleConfirmarUnificacion}
          confirming={unificandoVentas}
        />
      )}

      {shareTicketData && (
        <ShareTicketModal
          type="venta"
          data={shareTicketData}
          onClose={() => setShareTicketData(null)}
        />
      )}

      {unificarModal && (
        <ClienteUnificarModal
          visible={unificarModal}
          onClose={() => setUnificarModal(false)}
          cliente={cliente}
          clientes={clientes}
          ventas={ventas}
          pedidos={pedidos}
          recetas={recetas}
          onRefresh={onRefresh}
          showToast={showToast}
          confirm={confirm}
          reassignClienteIdInState={reassignClienteIdInState}
          removeClienteFromState={removeClienteFromState}
          onMerged={onRefresh}
        />
      )}
    </div>
  );
}

export default ClienteDetalle;
