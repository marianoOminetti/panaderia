import { useState } from "react";
import { fmt } from "../lib/format";
import { reportError } from "../utils/errorReport";
import { registrarEnAfip as invokeRegistrarEnAfip } from "../lib/registrarEnAfip";
import {
  afipReceptorFromCliente,
  buildAfipReceptorForRetry,
  documentoFromFactura,
  shouldPersistClienteFiscal,
} from "../lib/afipReceptor";
import {
  getTransaccionIdFromGrupo,
  facturaPuedeReintentarAfip,
} from "../lib/facturaFiscal";

const EMPTY_DATOS_FISCALES = { documento: "", razon_social: "" };

/**
 * Estado y orquestación de facturación electrónica (AFIP) para la pantalla Ventas.
 * Concentra los datos fiscales de la venta nueva y de la edición, más los handlers
 * que registran/reintentan en AFIP y persisten los datos fiscales del cliente.
 * El guardado de la venta (registrarVentaCarrito / guardarEdicionConAfip) sigue en
 * Ventas y consume `runAfipAfterVenta` y `persistirDatosFiscalesCliente` desde acá.
 *
 * @param {object} deps
 * @param {Array} deps.clientes
 * @param {Array} deps.ventas
 * @param {string|null} deps.clienteSel  Cliente seleccionado en el cobro de venta nueva.
 * @param {object} deps.editForm  Form de edición (para prefills al cambiar cliente).
 * @param {Function} deps.showToast
 * @param {object} deps.facturasByTransaccion
 * @param {Function} deps.refreshFacturas
 * @param {Function} deps.updateClienteDatosFiscales
 */
export function useVentasAfip({
  clientes,
  ventas,
  clienteSel,
  editForm,
  showToast,
  facturasByTransaccion,
  refreshFacturas,
  updateClienteDatosFiscales,
}) {
  const [registrarEnAfip, setRegistrarEnAfip] = useState(false);
  const [datosFiscalesAfip, setDatosFiscalesAfip] = useState(EMPTY_DATOS_FISCALES);
  const [editRegistrarEnAfip, setEditRegistrarEnAfip] = useState(false);
  const [editDatosFiscalesAfip, setEditDatosFiscalesAfip] =
    useState(EMPTY_DATOS_FISCALES);
  const [editFacturaEstado, setEditFacturaEstado] = useState(null);
  const [editPuedeRegistrarAfip, setEditPuedeRegistrarAfip] = useState(true);

  const persistirDatosFiscalesCliente = async (clienteId, receptor) => {
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
  };

  const runAfipAfterVenta = (
    transaccionId,
    afipReceptor,
    totalCobrado,
    afipActivo,
    clienteEff,
  ) => {
    if (!afipActivo) return;
    if (clienteEff && afipReceptor) {
      persistirDatosFiscalesCliente(clienteEff, afipReceptor).catch(() => {});
    }
    invokeRegistrarEnAfip(transaccionId, afipReceptor)
      .then(async (afip) => {
        await refreshFacturas(transaccionId, afip.ok ? { retries: 4 } : {});
        if (afip.ok) {
          showToast(
            afip.mock
              ? `✅ AFIP (prueba) · ${fmt(totalCobrado)}`
              : `✅ Registrado en AFIP · ${fmt(totalCobrado)}`,
          );
        } else {
          const detalle = afip.error
            ? String(afip.error).slice(0, 120)
            : "no se pudo registrar";
          showToast(`⚠️ AFIP: ${detalle} (la venta sí quedó guardada)`);
        }
      })
      .catch((afipErr) => {
        reportError(afipErr, { action: "registrarEnAfip", transaccionId });
        showToast("⚠️ AFIP: error de conexión (la venta sí quedó guardada)");
      });
  };

  const registrarAfipDesdeVenta = async (transaccionId) => {
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
  };

  const prefillDatosFiscalesAfip = (clienteId, { force = false } = {}) => {
    setDatosFiscalesAfip((prev) => {
      const tieneDatos =
        (prev.documento ?? prev.cuit ?? "").length > 0 ||
        (prev.razon_social || "").trim().length > 0;
      if (!force && tieneDatos) return prev;
      const cliente = (clientes || []).find((c) => c.id === clienteId);
      return afipReceptorFromCliente(cliente);
    });
  };

  const handleRegistrarEnAfipChange = (checked) => {
    setRegistrarEnAfip(checked);
    if (checked) {
      prefillDatosFiscalesAfip(clienteSel, { force: true });
    } else {
      setDatosFiscalesAfip(EMPTY_DATOS_FISCALES);
    }
  };

  const initAfipEdicion = (grupo, facturaOverride) => {
    const transaccionId = getTransaccionIdFromGrupo(grupo);
    const factura =
      facturaOverride ??
      (transaccionId ? facturasByTransaccion[transaccionId] : null);
    setEditFacturaEstado(factura?.estado ?? null);
    setEditPuedeRegistrarAfip(facturaPuedeReintentarAfip(factura));
    setEditRegistrarEnAfip(false);
    const cliente = (clientes || []).find((c) => c.id === grupo?.cliente_id);
    const docFactura = documentoFromFactura(factura);
    const razonFactura = factura?.receptor_razon_social || "";
    if (docFactura || razonFactura) {
      setEditDatosFiscalesAfip({
        documento: docFactura,
        razon_social: razonFactura.trim(),
      });
    } else {
      setEditDatosFiscalesAfip(afipReceptorFromCliente(cliente));
    }
  };

  const handleEditRegistrarEnAfipChange = (checked) => {
    setEditRegistrarEnAfip(checked);
    if (checked && editForm?.cliente_id) {
      setEditDatosFiscalesAfip((prev) => {
        const tieneDatos =
          (prev.documento ?? prev.cuit ?? "").length > 0 ||
          (prev.razon_social || "").trim().length > 0;
        if (tieneDatos) return prev;
        const cliente = (clientes || []).find(
          (c) => c.id === editForm.cliente_id,
        );
        return afipReceptorFromCliente(cliente);
      });
    } else if (!checked) {
      setEditDatosFiscalesAfip(EMPTY_DATOS_FISCALES);
    }
  };

  const resetAfipNueva = () => {
    setRegistrarEnAfip(false);
    setDatosFiscalesAfip(EMPTY_DATOS_FISCALES);
  };

  const resetAfipEdicion = () => {
    setEditRegistrarEnAfip(false);
    setEditDatosFiscalesAfip(EMPTY_DATOS_FISCALES);
    setEditFacturaEstado(null);
    setEditPuedeRegistrarAfip(true);
  };

  return {
    registrarEnAfip,
    datosFiscalesAfip,
    setDatosFiscalesAfip,
    editRegistrarEnAfip,
    editDatosFiscalesAfip,
    setEditDatosFiscalesAfip,
    editFacturaEstado,
    editPuedeRegistrarAfip,
    persistirDatosFiscalesCliente,
    runAfipAfterVenta,
    registrarAfipDesdeVenta,
    prefillDatosFiscalesAfip,
    handleRegistrarEnAfipChange,
    initAfipEdicion,
    handleEditRegistrarEnAfipChange,
    resetAfipNueva,
    resetAfipEdicion,
  };
}
