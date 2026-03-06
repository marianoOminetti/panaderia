import { useMemo } from "react";

/**
 * Filtra grupos de ventas por un término que busca en producto (receta) y cliente.
 * @param {Array} grupos - Salida de agruparVentas(ventas)
 * @param {Array} recetas - Para resolver receta_id → nombre
 * @param {Array} clientes - Para resolver cliente_id → nombre
 * @param {string} search - Término de búsqueda (busca en producto y cliente)
 * @returns {Array} grupos filtrados
 */
export function useFilterVentasGrupos(grupos, recetas, clientes, search) {
  return useMemo(() => {
    const list = Array.isArray(grupos) ? grupos : [];
    const q = (search || "").trim().toLowerCase();
    if (!q) return list;

    const recetasById = new Map((recetas || []).map((r) => [r.id, r]));
    const clientesById = new Map((clientes || []).map((c) => [c.id, c]));

    return list.filter((grupo) => {
      const cliente = clientesById.get(grupo.cliente_id);
      const nombreCliente = cliente?.nombre || "Consumidor final";
      if (nombreCliente.toLowerCase().includes(q)) return true;

      const items = grupo.items || grupo.rawItems || [];
      const tieneProducto = items.some((item) => {
        const receta = recetasById.get(item.receta_id);
        const nombreReceta = receta?.nombre || "";
        return nombreReceta.toLowerCase().includes(q);
      });
      return tieneProducto;
    });
  }, [grupos, recetas, clientes, search]);
}
