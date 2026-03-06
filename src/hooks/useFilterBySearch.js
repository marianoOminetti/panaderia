import { useState, useMemo } from "react";

/**
 * Filtra una lista por un campo de texto (ej. nombre).
 * Reutilizable en Cargar producción y Nueva venta / Editar venta.
 * @param {Array} items - Lista de objetos a filtrar
 * @param {string} textField - Clave del campo por el que filtrar (ej. 'nombre')
 * @returns {{ search: string, setSearch: (v: string) => void, filteredItems: Array }}
 */
export function useFilterBySearch(items = [], textField = "nombre") {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const list = Array.isArray(items) ? items : [];
    const q = (search || "").trim().toLowerCase();
    if (!q) return list;
    return list.filter((item) =>
      item != null && (String(item[textField] ?? "")).toLowerCase().includes(q)
    );
  }, [items, search, textField]);

  return { search, setSearch, filteredItems };
}
