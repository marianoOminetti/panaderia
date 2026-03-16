import { useState, useRef, useEffect } from "react";
import { CLIENTE_CONSUMIDOR_FINAL } from "../../config/appConfig";

function normalizeForSearch(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "");
}

/**
 * Selector de cliente con búsqueda. Si no está en la lista, aparece "Crear [nombre]" y al tocarlo se crea y selecciona.
 * value: cliente_id (string) o null/"" para Consumidor final
 * onChange: (cliente_id) => void
 */
export default function SearchableCliente({
  value,
  onChange,
  clientes = [],
  insertCliente,
  showToast,
  placeholder = "Buscar o escribir nombre…",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selectedCliente = clientes.find((c) => c.id === value);
  const displayLabel = value
    ? (selectedCliente ? selectedCliente.nombre + (selectedCliente.telefono ? ` · ${selectedCliente.telefono}` : "") : "…")
    : CLIENTE_CONSUMIDOR_FINAL;

  const searchNorm = normalizeForSearch(search);
  const filtered =
    !searchNorm.trim()
      ? clientes
      : clientes.filter((c) => normalizeForSearch(c.nombre).includes(searchNorm));

  const exactMatch = searchNorm.trim() && clientes.some((c) => normalizeForSearch(c.nombre) === searchNorm.trim());
  const showCrear = searchNorm.trim() && !exactMatch;

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (id) => {
    onChange(id || null);
    setOpen(false);
  };

  const handleCrear = async () => {
    const nombre = search.trim();
    if (!nombre || creating) return;
    setCreating(true);
    try {
      const data = await insertCliente(
        { nombre, telefono: null },
        { skipToast: true, skipRefresh: false },
      );
      if (data?.id) {
        onChange(data.id);
        showToast("✅ Cliente agregado");
        setOpen(false);
      }
    } catch {
      showToast("⚠️ Error al agregar cliente");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="form-input form-select"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          cursor: "pointer",
          appearance: "none",
          WebkitAppearance: "none",
        }}
      >
        {displayLabel || placeholder}
      </button>
      {open && (
        <div
          className="searchable-select-dropdown"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            zIndex: 150,
            overflow: "hidden",
          }}
        >
          <div className="search-bar" style={{ margin: 0, padding: 8 }}>
            <span className="search-icon">🔍</span>
            <input
              ref={inputRef}
              type="search"
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && showCrear) {
                  e.preventDefault();
                  handleCrear();
                }
              }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", padding: "4px 0 8px" }}>
            <button
              type="button"
              className="searchable-select-option"
              onClick={() => handleSelect("")}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 16px",
                border: "none",
                background: !value ? "var(--cream)" : "transparent",
                fontFamily: "inherit",
                fontSize: 14,
                textAlign: "left",
                cursor: "pointer",
                color: "var(--text)",
              }}
            >
              {CLIENTE_CONSUMIDOR_FINAL}
            </button>
            {filtered.map((c) => (
              <button
                key={c.id}
                type="button"
                className="searchable-select-option"
                onClick={() => handleSelect(c.id)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  background: value === c.id ? "var(--cream)" : "transparent",
                  fontFamily: "inherit",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                {c.nombre}
                {c.telefono ? ` · ${c.telefono}` : ""}
              </button>
            ))}
            {showCrear && (
              <button
                type="button"
                className="searchable-select-option"
                onClick={handleCrear}
                disabled={creating}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  borderTop: "1px solid var(--border)",
                  background: "var(--cream)",
                  fontFamily: "inherit",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--purple-dark)",
                  fontWeight: 500,
                }}
              >
                {creating ? "Creando…" : `+ Crear "${search.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
