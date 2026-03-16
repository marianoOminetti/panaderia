import { useState, useCallback, useMemo } from "react";
import { toCantidadNumber } from "../lib/format";

/**
 * Estado y handlers del carrito para una nueva venta (no edición).
 * Recibe nada; devuelve cartItems, setCartItems, addToCart, updateCartQuantity,
 * setCartQuantity, removeFromCart, updateCartPrice, cartTotal.
 */
export function useVentasCart() {
  const [cartItems, setCartItems] = useState([]);

  const addToCart = useCallback((receta, cantidad = 1) => {
    if (!receta) return;
    setCartItems((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], cantidad: copy[idx].cantidad + cantidad };
        return copy;
      }
      return [...prev, { receta, cantidad, precio_unitario: receta.precio_venta || 0 }];
    });
  }, []);

  const updateCartQuantity = useCallback((recetaId, delta) => {
    if (!delta) return;
    const sign = delta > 0 ? 1 : -1;
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.receta.id !== recetaId) return item;
        const actual = toCantidadNumber(item.cantidad) || 0;
        let step;
        if (sign > 0) {
          step = actual >= 1 ? 1 : 0.1;
        } else {
          step = actual >= 2 ? 1 : 0.1;
        }
        let next = actual + sign * step;
        if (next < 0.1) next = 0.1;
        return {
          ...item,
          cantidad: Number(next.toFixed(2)),
        };
      }),
    );
  }, []);

  const setCartQuantity = useCallback((recetaId, value) => {
    const text = String(value ?? "").trim().replace(",", ".");
    setCartItems((prev) =>
      prev.map((item) =>
        item.receta.id === recetaId
          ? { ...item, cantidad: text }
          : item,
      ),
    );
  }, []);

  const removeFromCart = useCallback((recetaId) => {
    setCartItems((prev) => prev.filter((item) => item.receta.id !== recetaId));
  }, []);

  const updateCartPrice = useCallback((recetaId, value) => {
    const text = String(value).trim();
    if (text === "") {
      setCartItems((prev) =>
        prev.map((item) =>
          item.receta.id === recetaId ? { ...item, precio_unitario: "" } : item,
        ),
      );
      return;
    }
    const num = parseFloat(text.replace(",", "."));
    if (Number.isNaN(num) || num < 0) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.receta.id === recetaId ? { ...item, precio_unitario: num } : item,
      ),
    );
  }, []);

  const cartTotal = useMemo(
    () =>
      cartItems.reduce((s, item) => {
        const cant = toCantidadNumber(item.cantidad) || 0;
        return s + (item.precio_unitario || 0) * cant;
      }, 0),
    [cartItems],
  );

  return {
    cartItems,
    setCartItems,
    addToCart,
    updateCartQuantity,
    setCartQuantity,
    removeFromCart,
    updateCartPrice,
    cartTotal,
  };
}
