import { useMemo } from "react";
import { calcularPromosEnCarrito, listarPromosParaCobro } from "../lib/promociones";

export function useCartConPromos(
  cartItems,
  promociones,
  promosExcluidasCobro = [],
  clienteId = null,
) {
  const excludePromoIds = useMemo(
    () => (promosExcluidasCobro?.length ? [...promosExcluidasCobro] : []),
    [promosExcluidasCobro],
  );

  const resultado = useMemo(
    () =>
      calcularPromosEnCarrito(cartItems, promociones, {
        excludePromoIds,
        clienteId,
      }),
    [cartItems, promociones, excludePromoIds, clienteId],
  );

  const promosEnCobro = useMemo(
    () => listarPromosParaCobro(cartItems, promociones, excludePromoIds, clienteId),
    [cartItems, promociones, excludePromoIds, clienteId],
  );

  return { ...resultado, promosEnCobro };
}
