import { useCallback } from "react";
import { reportError } from "../utils/errorReport";
import { registrarEnAfip as invokeRegistrarEnAfip } from "../lib/registrarEnAfip";
import { emitirNotaCreditoAfip } from "../lib/notaCreditoAfip";
import { buildAfipReceptorForRetry, shouldPersistClienteFiscal } from "../lib/afipReceptor";
import { useFacturasElectronicas } from "./useFacturasElectronicas";
import { useNotasCreditoAfip } from "./useNotasCreditoAfip";

/**
 * Facturas/NC AFIP + handlers para listas (ventas, historial de cliente).
 */
export function useAfipComprobanteActions({
  ventas,
  clientes,
  showToast,
  updateClienteDatosFiscales,
}) {
  const {
    facturasByTransaccion,
    refreshFacturas,
    hydrateFacturas,
    patchFactura,
  } = useFacturasElectronicas();
  const {
    notasCreditoByTransaccion,
    hydrateNotasCredito,
    refreshNotaCredito,
  } = useNotasCreditoAfip();

  const persistirDatosFiscalesCliente = useCallback(
    async (clienteId, receptor) => {
      if (!clienteId || !shouldPersistClienteFiscal(receptor)) return;
      try {
        await updateClienteDatosFiscales(clienteId, {
          ...(receptor.cuit ? { cuit: receptor.cuit } : {}),
          ...(receptor.dni ? { dni: receptor.dni } : {}),
          razon_social: receptor.razon_social,
        });
      } catch (err) {
        reportError(err, { action: "persistirDatosFiscalesCliente", clienteId });
      }
    },
    [updateClienteDatosFiscales],
  );

  const hydrateAfipForTransacciones = useCallback(
    (transaccionIds) => {
      const ids = [...new Set((transaccionIds || []).filter(Boolean))];
      if (!ids.length) return;
      hydrateFacturas(ids);
      hydrateNotasCredito(ids);
    },
    [hydrateFacturas, hydrateNotasCredito],
  );

  const registrarAfipDesdeVenta = useCallback(
    async (transaccionId) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        showToast("Necesitás conexión para registrar en AFIP");
        return;
      }
      const factura = await refreshFacturas(transaccionId);
      const facturasMap = factura
        ? { ...facturasByTransaccion, [transaccionId]: factura }
        : facturasByTransaccion;
      const receptor = buildAfipReceptorForRetry(
        transaccionId,
        facturasMap,
        ventas,
        clientes,
      );
      const afip = await invokeRegistrarEnAfip(transaccionId, receptor);
      await refreshFacturas(transaccionId, afip.ok ? { retries: 4 } : {});
      if (afip.ok) {
        const venta = (ventas || []).find(
          (v) => v.transaccion_id === transaccionId && v.cliente_id,
        );
        if (venta?.cliente_id) {
          await persistirDatosFiscalesCliente(venta.cliente_id, receptor);
        }
        showToast(
          afip.mock ? "✅ Registrado en AFIP (prueba)" : "✅ Registrado en AFIP",
        );
      } else {
        showToast(`⚠️ AFIP: ${(afip.error || "error").slice(0, 80)}`);
      }
    },
    [
      ventas,
      clientes,
      facturasByTransaccion,
      refreshFacturas,
      showToast,
      persistirDatosFiscalesCliente,
    ],
  );

  const emitirNotaCreditoDesdeVenta = useCallback(
    async (transaccionId) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        showToast("Necesitás conexión para emitir nota de crédito");
        return;
      }
      const nc = await emitirNotaCreditoAfip(transaccionId);
      await refreshNotaCredito(transaccionId, nc.ok ? { retries: 4 } : {});
      if (nc.ok) {
        showToast(
          nc.mock
            ? "✅ Nota de crédito (prueba)"
            : "✅ Nota de crédito emitida en AFIP",
        );
      } else {
        showToast(`⚠️ NC AFIP: ${(nc.error || "error").slice(0, 80)}`);
      }
    },
    [refreshNotaCredito, showToast],
  );

  const refacturarAfipDesdeVenta = useCallback(
    async (transaccionId) => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        showToast("Necesitás conexión para refacturar en AFIP");
        return;
      }
      const factura = await refreshFacturas(transaccionId);
      const facturasMap = factura
        ? { ...facturasByTransaccion, [transaccionId]: factura }
        : facturasByTransaccion;
      const receptor = buildAfipReceptorForRetry(
        transaccionId,
        facturasMap,
        ventas,
        clientes,
      );
      const afip = await invokeRegistrarEnAfip(transaccionId, receptor, {
        refacturar: true,
      });
      if (afip.ok && afip.cae) {
        patchFactura(transaccionId, {
          cae: afip.cae,
          numero_comprobante: afip.numero_comprobante,
          punto_venta: afip.punto_venta,
          estado: afip.estado || (afip.mock ? "mock" : "autorizada"),
          tipo_comprobante: 11,
          updated_at: new Date().toISOString(),
        });
      }
      await refreshFacturas(transaccionId, afip.ok ? {
        retries: 6,
        delayMs: 400,
        expectNumero: afip.numero_comprobante ?? null,
      } : {});
      if (afip.ok) {
        showToast(
          afip.mock
            ? "✅ Refacturado en AFIP (prueba)"
            : "✅ Nueva factura emitida en AFIP",
        );
      } else {
        showToast(`⚠️ AFIP: ${(afip.error || "error").slice(0, 80)}`);
      }
    },
    [
      ventas,
      clientes,
      facturasByTransaccion,
      patchFactura,
      refreshFacturas,
      showToast,
    ],
  );

  return {
    facturasByTransaccion,
    notasCreditoByTransaccion,
    hydrateAfipForTransacciones,
    registrarAfipDesdeVenta,
    emitirNotaCreditoDesdeVenta,
    refacturarAfipDesdeVenta,
    refreshFacturas,
    refreshNotaCredito,
    persistirDatosFiscalesCliente,
  };
}
