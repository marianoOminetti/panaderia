import { useMemo } from "react";
import { calcularPromosEnCarrito } from "../lib/promociones";

export function useCartConPromos(cartItems, promociones) {
  return useMemo(
    () => calcularPromosEnCarrito(cartItems, promociones),
    [cartItems, promociones],
  );
}
