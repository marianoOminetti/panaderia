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
    const rawQuery = (search || "").trim();
    if (!rawQuery) return list;

    const normalize = (text) =>
      String(text ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const q = normalize(rawQuery);

    return list.filter((item) => {
      if (!item) return false;
      const value = normalize(item[textField]);
      return value.includes(q);
    });
  }, [items, search, textField]);

  return { search, setSearch, filteredItems };
}
