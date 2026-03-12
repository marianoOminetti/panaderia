import { agruparPedidos as agruparPedidosBase } from "./agrupadores";

// Estados simplificados: solo pendiente y entregado (cancelado = se borra el pedido)
export const PEDIDO_ESTADOS = ["pendiente", "entregado"];

export function getPedidoEstadoLabel(estado) {
  if (estado === "entregado") return "Entregado";
  return "Pendiente";
}

// Editable solo mientras está pendiente
export function isPedidoEditable(estado) {
  return estado === "pendiente";
}

// Cancelar (borrar) solo si está pendiente
export function canDeletePedido(estado) {
  return estado === "pendiente";
}

export function agruparPedidos(pedidos) {
  return agruparPedidosBase(pedidos);
}

