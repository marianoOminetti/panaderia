/**
 * Deuda por cliente a partir de ventas con estado_pago === "debe".
 */
import { montoVentaLinea } from "./analyticsDrillHelpers";

export function computeDeudaPorClienteId(ventas) {
  const map = new Map();
  for (const v of (ventas || []).filter((x) => x.estado_pago === "debe" && x.cliente_id)) {
    const cid = v.cliente_id;
    map.set(cid, (map.get(cid) || 0) + montoVentaLinea(v));
  }
  return map;
}

export function deudaCliente(ventas, clienteId) {
  if (!clienteId) return 0;
  return computeDeudaPorClienteId(ventas).get(clienteId) || 0;
}

/** @returns {{ clientesDeuda: Array, totalDeuda: number }} */
export function computeClientesDeuda(ventas) {
  const deudaPorCliente = new Map();
  for (const v of (ventas || []).filter((x) => x.estado_pago === "debe")) {
    const clienteId = v.cliente_id || "__sin_cliente__";
    const prev =
      deudaPorCliente.get(clienteId) || {
        cliente_id: v.cliente_id,
        total: 0,
        ultimaFecha: null,
      };
    prev.total += montoVentaLinea(v);
    const refFecha = v.fecha || v.created_at;
    if (refFecha) {
      const fechaNorm =
        String(refFecha).length <= 10
          ? `${String(refFecha).slice(0, 10)}T12:00:00`
          : refFecha;
      const d = new Date(fechaNorm);
      if (!Number.isNaN(d.getTime()) && (!prev.ultimaFecha || d > prev.ultimaFecha)) {
        prev.ultimaFecha = d;
      }
    }
    deudaPorCliente.set(clienteId, prev);
  }
  const clientesDeuda = Array.from(deudaPorCliente.values())
    .filter((c) => c.total > 0.01)
    .sort((a, b) => b.total - a.total);
  const totalDeuda = clientesDeuda.reduce((s, c) => s + c.total, 0);
  return { clientesDeuda, totalDeuda };
}
