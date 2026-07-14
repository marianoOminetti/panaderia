import { toCantidadNumber } from "./format";
import { calcularPromosEnCarrito, aplicarDescuentoPromoARows } from "./promociones";

/**
 * Arma filas de pedido desde el carrito y aplica promos (misma lógica que ventas).
 */
export function buildPedidoRowsConPromos({
  cartItems,
  promociones,
  excludePromoIds = [],
  chargeTotalOverride = "",
  pedidoId,
  clienteId,
  fechaEntrega,
  senia = 0,
  horaEntrega = null,
  notas = null,
  estado = "pendiente",
}) {
  const promoResult = calcularPromosEnCarrito(cartItems, promociones, {
    excludePromoIds,
    clienteId,
  });
  const subtotalLista = promoResult.subtotalLista;
  const descuentoPromo = promoResult.descuentoTotal;
  const totalConPromo = promoResult.totalFinal;

  let rows = (cartItems || []).map(({ receta, cantidad, precio_unitario }) => {
    const cantNum = toCantidadNumber(cantidad) || 0;
    const precio = precio_unitario || 0;
    const subtotal = precio * cantNum;
    return {
      pedido_id: pedidoId,
      cliente_id: clienteId || null,
      receta_id: receta.id,
      cantidad: cantNum,
      precio_unitario: precio,
      descuento: 0,
      promocion_id: null,
      senia: 0,
      hora_entrega: null,
      notas: null,
      estado,
      fecha_entrega: fechaEntrega,
      _subtotal: subtotal,
    };
  });

  const override = parseFloat(String(chargeTotalOverride || "").replace(",", "."));
  const totalBase = descuentoPromo > 0 ? totalConPromo : subtotalLista;
  const usarOverride =
    !Number.isNaN(override) &&
    override >= 0 &&
    override !== totalBase &&
    subtotalLista > 0;

  if (usarOverride) {
    const factor = override / subtotalLista;
    let acumulado = 0;
    for (let i = 0; i < rows.length; i++) {
      const sub = rows[i]._subtotal;
      const nuevoSubtotal =
        i === rows.length - 1
          ? override - acumulado
          : Math.round(sub * factor);
      rows[i].precio_unitario =
        rows[i].cantidad > 0 ? nuevoSubtotal / rows[i].cantidad : rows[i].precio_unitario;
      rows[i].descuento = 0;
      rows[i].promocion_id = null;
      rows[i]._subtotal = nuevoSubtotal;
      acumulado += nuevoSubtotal;
    }
  } else if (descuentoPromo > 0) {
    const ventaLike = rows.map((r) => ({
      ...r,
      subtotal: r._subtotal,
      total_final: r._subtotal,
    }));
    const conPromo = aplicarDescuentoPromoARows(
      ventaLike,
      descuentoPromo,
      promoResult.promocionId,
    );
    rows = rows.map((r, i) => ({
      ...r,
      descuento: conPromo[i].descuento || 0,
      promocion_id: conPromo[i].promocion_id || null,
      _subtotal: conPromo[i].subtotal,
    }));
  }

  const seniaNum = Number(senia) || 0;
  rows = rows.map((r, index) => {
    const { _subtotal, ...rest } = r;
    return {
      ...rest,
      senia: index === 0 ? seniaNum : 0,
      hora_entrega: index === 0 ? horaEntrega || null : null,
      notas: index === 0 ? notas || null : null,
    };
  });

  const totalCobrado = usarOverride
    ? override
    : descuentoPromo > 0
      ? totalConPromo
      : subtotalLista;

  return {
    rows,
    promoResult,
    subtotalLista,
    totalCobrado,
    usarOverride,
  };
}
