/**
 * Lista de ventas agrupadas por transacción/deuda: filtros, apertura de grupo, edición y cobro.
 * Recibe ventas, callbacks de edición/cobro y estado desde Ventas.jsx (no persiste por sí mismo).
 */
import { useState, useMemo, useEffect } from "react";
import { fmt } from "../../lib/format";
import { agruparVentas, totalDebeEnGrupo } from "../../lib/agrupadores";
import { useFilterVentasGrupos } from "../../hooks/useFilterVentasGrupos";
import { VENTA_LIST_MAX_GROUPS } from "../../config/permissions";
import VentasListFilters from "./VentasListFilters";
import ShareTicketModal from "../shared/ShareTicketModal";
import FacturaFiscalModal from "../shared/FacturaFiscalModal";
import {
  getTransaccionIdFromGrupo,
  facturaListaParaPdf,
  facturaPuedeReintentarAfip,
  facturaNecesitaConfirmarAfip,
  facturaPuedeEmitirNotaCredito,
  facturaPuedeRefacturarAfip,
  facturaFueRefacturada,
  notaCreditoListaParaPdf,
  notaCreditoPuedeReintentar,
  notaCreditoNecesitaConfirmar,
  buildFacturaFiscalData,
  buildNotaCreditoFiscalData,
  buildGrupoLineasLista,
  buildGrupoTotalesConPromo,
} from "../../lib/facturaFiscal";

const ADMIN_GROUPS_PAGE_SIZE = 20;

function formatRelDia(d, hoyDate) {
  if (!d || Number.isNaN(d.getTime())) return "";
  const diffMs = hoyDate.getTime() - d.getTime();
  const dias = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias <= 7) return `hace ${dias} días`;
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
  });
}

/** Calcula clientes con deuda a partir de ventas con estado_pago === "debe" */
export { computeClientesDeuda } from "../../lib/clienteDeuda";

export default function VentasList({
  ventas,
  hoy,
  recetas,
  promociones = [],
  clientes,
  gruposConDeuda = [],
  totalDeuda,
  eliminarVenta,
  abrirEditar,
  deletingId,
  isVentaRole = false,
  facturasByTransaccion = {},
  notasCreditoByTransaccion = {},
  onRegistrarAfip,
  onEmitirNotaCredito,
  onRefacturarAfip,
  confirm,
}) {
  const hoyDate = new Date(hoy);
  const gruposAll = useMemo(() => agruparVentas(ventas || []), [ventas]);
  const grupos = isVentaRole
    ? gruposAll.slice(0, VENTA_LIST_MAX_GROUPS)
    : gruposAll;
  const [search, setSearch] = useState("");
  const [shareGrupo, setShareGrupo] = useState(null);
  const [facturaFiscalData, setFacturaFiscalData] = useState(null);
  const [afipLoadingTx, setAfipLoadingTx] = useState(null);
  const [ncLoadingTx, setNcLoadingTx] = useState(null);
  const [refacturarLoadingTx, setRefacturarLoadingTx] = useState(null);
  const filteredGrupos = useFilterVentasGrupos(grupos, recetas, clientes, search);
  const [listPage, setListPage] = useState(0);

  useEffect(() => {
    setListPage(0);
  }, [search, ventas]);

  const paginatedGrupos = useMemo(() => {
    if (isVentaRole) return filteredGrupos;
    const start = listPage * ADMIN_GROUPS_PAGE_SIZE;
    return filteredGrupos.slice(start, start + ADMIN_GROUPS_PAGE_SIZE);
  }, [filteredGrupos, isVentaRole, listPage]);

  const totalPages = isVentaRole
    ? 1
    : Math.max(1, Math.ceil(filteredGrupos.length / ADMIN_GROUPS_PAGE_SIZE));

  const buildShareData = (grupo) => {
    const ejemplo = grupo.rawItems?.[0] || grupo.items[0];
    const cliente = (clientes || []).find((c) => c.id === grupo.cliente_id);
    const items = buildGrupoLineasLista(grupo, recetas);
    const { subtotal, descuento, descuentoLabel, total } = buildGrupoTotalesConPromo(
      grupo,
      items,
      promociones,
      grupo.total,
    );
    return {
      fecha: ejemplo?.fecha,
      created_at: ejemplo?.created_at,
      cliente: cliente?.nombre || "Consumidor final",
      medio_pago: ejemplo?.medio_pago || "efectivo",
      estado_pago: ejemplo?.estado_pago || "pagado",
      subtotal,
      descuento,
      descuentoLabel,
      total,
      items,
    };
  };

  return (
    <>
      {!isVentaRole && gruposConDeuda.length > 0 && (
        <div className="card dashboard-alert" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-title">⚠️ Clientes con deuda</span>
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 8,
            }}
          >
            {gruposConDeuda.length} venta
            {gruposConDeuda.length > 1 ? "s" : ""} ·{" "}
            <strong style={{ color: "var(--accent)" }}>
              {fmt(totalDeuda)}
            </strong>{" "}
            por cobrar
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {gruposConDeuda.map((grupo) => {
              const cli =
                (clientes || []).find((c) => c.id === grupo.cliente_id) || null;
              const nombre = cli?.nombre || "Consumidor final";
              const refFecha = grupo.rawItems?.[0]?.fecha || grupo.rawItems?.[0]?.created_at;
              const fechaDate = refFecha ? new Date(refFecha) : null;
              const rel = formatRelDia(fechaDate, hoyDate);
              const monto = totalDebeEnGrupo(grupo);
              return (
                <button
                  key={grupo.key}
                  type="button"
                  onClick={() => abrirEditar(grupo)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 13,
                    width: "100%",
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{nombre}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                      }}
                    >
                      Venta {rel || ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--accent)",
                        fontFamily: "'Outfit', sans-serif",
                      }}
                    >
                      {fmt(monto)}
                    </div>
                    <span
                      style={{
                        display: "inline-block",
                        marginTop: 2,
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        background: "rgba(214,69,69,0.08)",
                        color: "var(--danger)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      DEBE
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {ventas.length > 0 && (
        <>
          <div className="card-header" style={{ marginBottom: 8 }}>
            <span className="card-title">
              {isVentaRole ? "Últimas ventas" : "Ventas recientes"}
            </span>
          </div>
          <VentasListFilters search={search} onSearchChange={setSearch} />
          {filteredGrupos.length === 0 && search.trim() ? (
            <div className="empty">
              <div className="empty-icon">🔍</div>
              <p>Sin resultados</p>
            </div>
          ) : (
          paginatedGrupos.map((grupo) => {
            const cliente = (clientes || []).find(
              (c) => c.id === grupo.cliente_id,
            );
            const ejemplo =
              (grupo.rawItems && grupo.rawItems[0]) || grupo.items[0];
            let fechaHoraTxt = "";
            let horaTxt = "";
            if (ejemplo) {
              const fechaSolo = ejemplo.fecha && String(ejemplo.fecha).slice(0, 10);
              const createdFull = ejemplo.created_at && String(ejemplo.created_at).length > 10;
              // Día: usar fecha (date-only) para coincidir con edición; T12 evita desfase por timezone
              const dParaDia = fechaSolo ? new Date(`${fechaSolo}T12:00:00`) : (ejemplo.created_at ? new Date(ejemplo.created_at) : null);
              // Hora: usar created_at (timestamp real) cuando existe; sino fecha+T12
              const dParaHoraRaw = createdFull ? new Date(ejemplo.created_at) : dParaDia;
              const dParaHora = (dParaHoraRaw && !Number.isNaN(dParaHoraRaw.getTime())) ? dParaHoraRaw : dParaDia;
              if (dParaDia && !Number.isNaN(dParaDia.getTime())) {
                const esHoy = fechaSolo === hoy;
                const hora = dParaHora.toLocaleTimeString("es-AR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                horaTxt = `${hora} hs`;
                const diaTxt = esHoy
                  ? "Hoy"
                  : dParaDia.toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    });
                fechaHoraTxt = `${diaTxt} · ${horaTxt}`;
              }
            }
            const transaccionId = getTransaccionIdFromGrupo(grupo);
            const factura = transaccionId
              ? facturasByTransaccion[transaccionId]
              : null;
            const notaCredito = transaccionId
              ? notasCreditoByTransaccion[transaccionId]
              : null;
            const puedePdf = factura && facturaListaParaPdf(factura);
            const puedeNcPdf = notaCredito && notaCreditoListaParaPdf(notaCredito);
            const puedeEmitirNc =
              facturaPuedeEmitirNotaCredito(factura, notaCredito) ||
              notaCreditoPuedeReintentar(notaCredito) ||
              notaCreditoNecesitaConfirmar(notaCredito);
            const puedeRefacturar =
              facturaPuedeRefacturarAfip(factura, notaCredito);
            const medio = ejemplo?.medio_pago || "efectivo";
            const estado = ejemplo?.estado_pago || "pagado";
            const medioTxt =
              medio === "transferencia"
                ? "Transferencia"
                : medio === "debito"
                  ? "Débito"
                  : medio === "credito"
                    ? "Crédito"
                    : "Efectivo";

            return (
              <div
                key={grupo.key}
                className="card venta-card"
                onClick={() => abrirEditar(grupo)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    abrirEditar(grupo);
                  }
                }}
              >
                <div className="venta-grupo-cliente">
                  Cliente: {cliente?.nombre || "Consumidor final"}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 4,
                  }}
                >
                  <span>{fechaHoraTxt || horaTxt}</span>
                  <span>
                    <span style={{ marginRight: 8 }}>{medioTxt}</span>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        background:
                          estado === "debe"
                            ? "rgba(214,69,69,0.08)"
                            : "rgba(74,124,89,0.08)",
                        color:
                          estado === "debe"
                            ? "var(--danger)"
                            : "var(--green)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                      }}
                    >
                      {estado === "debe" ? "DEBE" : "Pagado"}
                    </span>
                  </span>
                </div>
                {grupo.items.map((v, vi) => {
                  const r = (recetas || []).find((r2) => r2.id === v.receta_id);
                  return (
                    <div
                      key={v.id || `${grupo.key}-${v.receta_id}-${vi}`}
                      className="venta-item venta-item-simple"
                    >
                      <span className="venta-emoji">{r?.emoji || "🍞"}</span>
                      <span className="venta-nombre-simple">
                        {(r?.nombre || "—").toLowerCase()} x{v.cantidad}
                      </span>
                    </div>
                  );
                })}
                <div className="venta-grupo-total">
                  Total: {fmt(grupo.total)}
                  {!isVentaRole && factura?.estado === "autorizada" && (
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
                  {!isVentaRole && factura?.estado === "mock" && (
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
                  {!isVentaRole &&
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
                </div>
                <div className="venta-grupo-actions">
                  {!isVentaRole && (
                    <button
                      type="button"
                      className="btn-venta-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setShareGrupo(grupo);
                      }}
                      title="Compartir comprobante"
                    >
                      📤
                    </button>
                  )}
                  {!isVentaRole && transaccionId && puedeNcPdf && (
                    <button
                      type="button"
                      className="btn-venta-action"
                      title="Nota de crédito AFIP"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFacturaFiscalData(
                          buildNotaCreditoFiscalData(
                            grupo,
                            factura,
                            notaCredito,
                            recetas,
                            clientes,
                            promociones,
                          ),
                        );
                      }}
                    >
                      🧾
                    </button>
                  )}
                  {!isVentaRole &&
                    transaccionId &&
                    onEmitirNotaCredito &&
                    puedeEmitirNc && (
                      <button
                        type="button"
                        className="btn-venta-action"
                        title={
                          notaCreditoNecesitaConfirmar(notaCredito)
                            ? "Confirmar nota de crédito AFIP"
                            : "Emitir nota de crédito en AFIP"
                        }
                        disabled={ncLoadingTx === transaccionId}
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!confirm) return;
                          const msg = notaCreditoNecesitaConfirmar(notaCredito)
                            ? `¿Confirmar en el sistema la nota de crédito AFIP (CAE ${notaCredito.cae})?`
                            : [
                                `¿Emitir nota de crédito en AFIP por ${fmt(grupo.total)}?`,
                                "La venta queda igual en la app; solo se anula la factura en AFIP.",
                                factura?.numero_comprobante
                                  ? `Factura: ${String(factura.punto_venta || "").padStart(5, "0")}-${String(factura.numero_comprobante).padStart(8, "0")}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join("\n");
                          const ok = await confirm(msg);
                          if (!ok) return;
                          setNcLoadingTx(transaccionId);
                          try {
                            await onEmitirNotaCredito(transaccionId);
                          } finally {
                            setNcLoadingTx(null);
                          }
                        }}
                      >
                        {ncLoadingTx === transaccionId
                          ? "…"
                          : notaCreditoNecesitaConfirmar(notaCredito)
                            ? "NC ✓"
                            : "NC"}
                      </button>
                    )}
                  {!isVentaRole &&
                    transaccionId &&
                    onRefacturarAfip &&
                    puedeRefacturar && (
                      <button
                        type="button"
                        className="btn-venta-action"
                        title="Refacturar en AFIP (nueva factura)"
                        disabled={refacturarLoadingTx === transaccionId}
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!confirm) return;
                          const msg = [
                            `¿Emitir una nueva factura en AFIP por ${fmt(grupo.total)}?`,
                            "La nota de crédito ya anuló la factura anterior.",
                          ].join("\n");
                          const ok = await confirm(msg);
                          if (!ok) return;
                          setRefacturarLoadingTx(transaccionId);
                          try {
                            await onRefacturarAfip(transaccionId);
                          } finally {
                            setRefacturarLoadingTx(null);
                          }
                        }}
                      >
                        {refacturarLoadingTx === transaccionId ? "…" : "AFIP"}
                      </button>
                    )}
                  {!isVentaRole && transaccionId && puedePdf && (
                    <button
                      type="button"
                      className="btn-venta-action"
                      title={
                        facturaFueRefacturada(factura, notaCredito)
                          ? "Factura vigente AFIP"
                          : "Factura AFIP"
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setFacturaFiscalData(
                          buildFacturaFiscalData(
                            grupo,
                            factura,
                            recetas,
                            clientes,
                            promociones,
                            notaCredito,
                          ),
                        );
                      }}
                    >
                      📄
                    </button>
                  )}
                  {!isVentaRole &&
                    transaccionId &&
                    onRegistrarAfip &&
                    facturaPuedeReintentarAfip(factura, notaCredito) && (
                      <button
                        type="button"
                        className="btn-venta-action"
                        title={
                          facturaNecesitaConfirmarAfip(factura)
                            ? "Confirmar comprobante AFIP"
                            : "Registrar en AFIP"
                        }
                        disabled={afipLoadingTx === transaccionId}
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          if (!confirm) return;
                          const receptorAfip = factura?.receptor_razon_social?.trim();
                          const msg = facturaNecesitaConfirmarAfip(factura)
                            ? `¿Confirmar en el sistema el comprobante AFIP (CAE ${factura.cae}) por ${fmt(grupo.total)}?`
                            : [
                                `¿Registrar en AFIP esta venta por ${fmt(grupo.total)}?`,
                                `Cliente: ${cliente?.nombre || "Consumidor final"}`,
                                receptorAfip ? `Factura a: ${receptorAfip}` : null,
                              ]
                                .filter(Boolean)
                                .join("\n");
                          const ok = await confirm(msg);
                          if (!ok) return;
                          setAfipLoadingTx(transaccionId);
                          try {
                            await onRegistrarAfip(transaccionId);
                          } finally {
                            setAfipLoadingTx(null);
                          }
                        }}
                      >
                        {afipLoadingTx === transaccionId ? "…" : "AFIP"}
                      </button>
                    )}
                  <button
                    className="btn-venta-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirEditar(grupo);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                      }
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-venta-action btn-venta-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      eliminarVenta(grupo);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                      }
                    }}
                    disabled={
                      deletingId === (grupo.key || grupo.rawItems?.[0]?.id)
                    }
                  >
                    {deletingId ===
                    (grupo.key || grupo.rawItems?.[0]?.id)
                      ? "…"
                      : "Eliminar"}
                  </button>
                </div>
              </div>
            );
          })
          )}
          {!isVentaRole && filteredGrupos.length > ADMIN_GROUPS_PAGE_SIZE && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 12,
                gap: 8,
              }}
            >
              <button
                type="button"
                className="btn-secondary"
                disabled={listPage <= 0}
                onClick={() => setListPage((p) => Math.max(0, p - 1))}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Página {listPage + 1} / {totalPages}
              </span>
              <button
                type="button"
                className="btn-secondary"
                disabled={listPage >= totalPages - 1}
                onClick={() => setListPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}

      {shareGrupo && (
        <ShareTicketModal
          type="venta"
          data={buildShareData(shareGrupo)}
          onClose={() => setShareGrupo(null)}
        />
      )}

      {facturaFiscalData && (
        <FacturaFiscalModal
          data={facturaFiscalData}
          onClose={() => setFacturaFiscalData(null)}
        />
      )}
    </>
  );
}
