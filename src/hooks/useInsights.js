import { useMemo } from "react";
import { hoyLocalISO } from "../lib/dates";
import { buildInsights } from "../lib/insights";

export function useInsights({
  enabled = true,
  ventas,
  recetas,
  clientes,
  recetaIngredientes,
  insumos,
  stock,
  precioHistorial,
}) {
  const hoyStr = hoyLocalISO();

  return useMemo(
    () => {
      if (!enabled) {
        return { all: [], top: [], hasUrgent: false };
      }
      const [y, m, d] = hoyStr.split("-").map(Number);
      const hoy = new Date(y, m - 1, d);
      return buildInsights({
        ventas,
        recetas,
        clientes,
        recetaIngredientes,
        insumos,
        stock,
        precioHistorial,
        hoy,
      });
    },
    [
      enabled,
      ventas,
      recetas,
      clientes,
      recetaIngredientes,
      insumos,
      stock,
      precioHistorial,
      hoyStr,
    ],
  );
}
