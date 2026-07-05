import { useState } from "react";
import { fmt } from "../../lib/format";
import FacturaFiscalModal from "../shared/FacturaFiscalModal";
import {
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
} from "../../lib/facturaFiscal";

/**
 * Botones AFIP (emitir, NC, refacturar, ver comprobantes) para una venta agrupada.
 */
export default function VentaAfipToolbar({
  grupo,
  transaccionId,
  factura,
  notaCredito,
  cliente,
  clientes = [],
  recetas,
  promociones = [],
  confirm,
  onRegistrarAfip,
  onEmitirNotaCredito,
  onRefacturarAfip,
  className = "venta-grupo-actions",
  showAfipBadges = false,
  inline = false,
}) {
  const [afipLoadingTx, setAfipLoadingTx] = useState(null);
  const [ncLoadingTx, setNcLoadingTx] = useState(null);
  const [refacturarLoadingTx, setRefacturarLoadingTx] = useState(null);
  const [facturaFiscalData, setFacturaFiscalData] = useState(null);

  if (!transaccionId) return null;

  const puedePdf = factura && facturaListaParaPdf(factura);
  const puedeNcPdf = notaCredito && notaCreditoListaParaPdf(notaCredito);
  const puedeEmitirNc =
    facturaPuedeEmitirNotaCredito(factura, notaCredito) ||
    notaCreditoPuedeReintentar(notaCredito) ||
    notaCreditoNecesitaConfirmar(notaCredito);
  const puedeRefacturar = facturaPuedeRefacturarAfip(factura, notaCredito);

  const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  return (
    <>
      {showAfipBadges && (
        <span style={{ marginLeft: 8, fontSize: 10 }}>
          {factura?.estado === "autorizada" && (
            <span style={{ color: "var(--green)", fontWeight: 600 }}>AFIP</span>
          )}
          {factura?.estado === "mock" && (
            <span style={{ color: "var(--text-muted)" }}>AFIP prueba</span>
          )}
          {(notaCredito?.estado === "autorizada" ||
            notaCredito?.estado === "mock") && (
            <span
              style={{
                marginLeft: 6,
                color: "var(--danger)",
                fontWeight: 600,
              }}
            >
              NC
            </span>
          )}
        </span>
      )}

      <div
        className={
          inline ? "venta-afip-toolbar-inline" : className
        }
      >
        {puedeNcPdf && (
          <button
            type="button"
            className="btn-venta-action"
            title="Nota de crédito AFIP"
            onClick={(e) => {
              stop(e);
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
        {onEmitirNotaCredito && puedeEmitirNc && (
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
              stop(e);
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
        {onRefacturarAfip && puedeRefacturar && (
          <button
            type="button"
            className="btn-venta-action"
            title="Refacturar en AFIP (nueva factura)"
            disabled={refacturarLoadingTx === transaccionId}
            onClick={async (e) => {
              stop(e);
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
        {puedePdf && (
          <button
            type="button"
            className="btn-venta-action"
            title={
              facturaFueRefacturada(factura, notaCredito)
                ? "Factura vigente AFIP"
                : "Factura AFIP"
            }
            onClick={(e) => {
              stop(e);
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
        {onRegistrarAfip &&
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
                stop(e);
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
      </div>

      {facturaFiscalData && (
        <FacturaFiscalModal
          data={facturaFiscalData}
          onClose={() => setFacturaFiscalData(null)}
        />
      )}
    </>
  );
}
