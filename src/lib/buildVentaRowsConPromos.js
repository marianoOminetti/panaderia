import { toCantidadNumber } from "./format";
import { calcularPromosEnCarrito, aplicarDescuentoPromoARows } from "./promociones";

/**
 * Arma filas de venta desde ítems de carrito y aplica promos u override manual.
 */
export function buildVentaRowsConPromos({
  cartItems,
  promociones,
  excludePromoIds = [],
  chargeTotalOverride = "",
  fecha,
  transaccionId,
  clienteId,
  medioPago,
  estadoPago,
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
      receta_id: receta.id,
      cantidad: cantNum,
      precio_unitario: precio,
      subtotal,
      descuento: 0,
      total_final: subtotal,
      fecha,
      transaccion_id: transaccionId,
      cliente_id: clienteId || null,
      medio_pago: medioPago,
      estado_pago: estadoPago,
    };
  });

  const override = parseFloat(String(chargeTotalOverride || "").replace(",", "."));
  const totalBase = descuentoPromo > 0 ? totalConPromo : subtotalLista;
  const usarOverride =
    !Number.isNaN(override) && override >= 0 && override !== totalBase && subtotalLista > 0;

  if (usarOverride) {
    const factor = override / subtotalLista;
    let acumulado = 0;
    for (let i = 0; i < rows.length; i++) {
      const nuevoSubtotal =
        i === rows.length - 1 ? override - acumulado : Math.round(rows[i].subtotal * factor);
      rows[i].precio_unitario =
        rows[i].cantidad > 0 ? nuevoSubtotal / rows[i].cantidad : rows[i].precio_unitario;
      rows[i].subtotal = nuevoSubtotal;
      rows[i].total_final = nuevoSubtotal;
      rows[i].descuento = 0;
      rows[i].promocion_id = null;
      acumulado += nuevoSubtotal;
    }
  } else if (descuentoPromo > 0) {
    rows = aplicarDescuentoPromoARows(
      rows,
      descuentoPromo,
      promoResult.promocionId,
    );
  }

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
