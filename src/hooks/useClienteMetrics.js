import { useMemo } from "react";
import { hoyLocalISO } from "../lib/dates";
import {
  indexVentasPorCliente,
  enrichClientesConMetricas,
  buildClientesResumen,
  buildPerfilFromVentas,
} from "../lib/clienteMetrics";
import { computeDeudaPorClienteId } from "../lib/clienteDeuda";

export function useClienteMetrics({ clientes, ventas, recetas }) {
  const hoyStr = hoyLocalISO();

  return useMemo(() => {
    const [y, m, d] = hoyStr.split("-").map(Number);
    const hoy = new Date(y, m - 1, d);
    const ventasPorCliente = indexVentasPorCliente(ventas);
    const deudaPorCliente = computeDeudaPorClienteId(ventas);

    const perfiles = new Map();
    for (const c of clientes || []) {
      const vs = ventasPorCliente.get(c.id) ?? [];
      perfiles.set(c.id, buildPerfilFromVentas(vs, recetas, c, hoy));
    }

    const enriquecidos = enrichClientesConMetricas(
      clientes,
      ventasPorCliente,
      recetas,
      hoy,
    )
      .map((c) => ({
        ...c,
        deuda: deudaPorCliente.get(c.id) || 0,
      }))
      .sort((a, b) => b.total - a.total);

    const resumen = buildClientesResumen(enriquecidos);

    const getPerfil = (clienteId) => perfiles.get(clienteId) ?? null;

    return { enriquecidos, resumen, getPerfil, hoy };
  }, [clientes, ventas, recetas, hoyStr]);
}
