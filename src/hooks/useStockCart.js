import { useState, useCallback, useMemo } from "react";

/**
 * Estado y handlers del carrito de carga de stock (producción manual).
 * Usado por Stock.jsx. Solo maneja ítems y cantidades; el guardado (cargarStockCarrito)
 * y la lógica de ejecutarCargaStock siguen en Stock.
 * @returns {{ stockCart, setStockCart, addToStockCart, totalCartUnidades }}
 */
export function useStockCart() {
  const [stockCart, setStockCart] = useState([]);

  const addToStockCart = useCallback((receta, delta = 1) => {
    if (!receta) return;
    setStockCart((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        const nuevaCant = Math.max(0, (copy[idx].cantidad || 0) + delta);
        if (nuevaCant === 0) {
          copy.splice(idx, 1);
          return copy;
        }
        copy[idx] = { ...copy[idx], cantidad: nuevaCant };
        return copy;
      }
      if (delta <= 0) return prev;
      return [...prev, { receta, cantidad: delta }];
    });
  }, []);

  const totalCartUnidades = useMemo(
    () => stockCart.reduce((s, it) => s + (it.cantidad || 0), 0),
    [stockCart]
  );

  return {
    stockCart,
    setStockCart,
    addToStockCart,
    totalCartUnidades,
  };
}
