import { useMemo } from "react";
import { hoyLocalISO } from "../lib/dates";
import { agruparPedidos } from "../lib/pedidos";

function matchesPedidoSearch(g, search, clientes, recetas) {
  if (!search.trim()) return true;
  const lower = search.toLowerCase();
  const cliente = (clientes || []).find((c) => c.id === g.cliente_id);
  const clienteMatch =
    cliente &&
    `${cliente.nombre || ""} ${cliente.telefono || ""}`.toLowerCase().includes(lower);
  const productosMatch = (g.items || []).some((it) => {
    const receta = (recetas || []).find((r) => r.id === it.receta_id);
    return (
      receta &&
      `${receta.nombre || ""} ${receta.emoji || ""}`.toLowerCase().includes(lower)
    );
  });
  return clienteMatch || productosMatch;
}

function sortPedidoGrupos(grupos, hoy) {
  const pendientesFuturo = [];
  const pendientesPasado = [];
  const otrosFuturo = [];
  const otrosPasado = [];

  for (const g of grupos || []) {
    const estado = g.estado || "pendiente";
    const fecha = g.fecha_entrega || "";
    const esPendiente = estado !== "entregado";
    const esFuturoOHoy = fecha && fecha >= hoy;

    if (esPendiente && esFuturoOHoy) pendientesFuturo.push(g);
    else if (esPendiente) pendientesPasado.push(g);
    else if (esFuturoOHoy) otrosFuturo.push(g);
    else otrosPasado.push(g);
  }

  pendientesFuturo.sort((a, b) => (a.fecha_entrega || "").localeCompare(b.fecha_entrega || ""));
  pendientesPasado.sort((a, b) => (b.fecha_entrega || "").localeCompare(a.fecha_entrega || ""));
  otrosFuturo.sort((a, b) => (a.fecha_entrega || "").localeCompare(b.fecha_entrega || ""));
  otrosPasado.sort((a, b) => (b.fecha_entrega || "").localeCompare(a.fecha_entrega || ""));

  return [...pendientesFuturo, ...pendientesPasado, ...otrosFuturo, ...otrosPasado];
}

export function usePedidosListFilter(pedidos, { search, clientes, recetas }) {
  const hoyStr = hoyLocalISO();
  const grupos = useMemo(() => agruparPedidos(pedidos || []), [pedidos]);

  return useMemo(() => {
    const matched = (grupos || []).filter((g) =>
      matchesPedidoSearch(g, search, clientes, recetas),
    );
    return sortPedidoGrupos(matched, hoyStr);
  }, [grupos, hoyStr, search, clientes, recetas]);
}
