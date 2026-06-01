import { useMemo } from "react";
import { calcularPromosEnCarrito, listarPromosParaCobro } from "../lib/promociones";

export function useCartConPromos(cartItems, promociones, promosExcluidasCobro = []) {
  const excludePromoIds = useMemo(
    () => (promosExcluidasCobro?.length ? [...promosExcluidasCobro] : []),
    [promosExcluidasCobro],
  );

  const resultado = useMemo(
    () => calcularPromosEnCarrito(cartItems, promociones, { excludePromoIds }),
    [cartItems, promociones, excludePromoIds],
  );

  const promosEnCobro = useMemo(
    () => listarPromosParaCobro(cartItems, promociones, excludePromoIds),
    [cartItems, promociones, excludePromoIds],
  );

  return { ...resultado, promosEnCobro };
}
