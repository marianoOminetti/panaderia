import { useState, useRef, useEffect } from "react";

function normalizeForSearch(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Selector de categoría con búsqueda y opción de crear.
 * - `categorias`: array de strings existentes (p.ej. CATEGORIAS).
 * - `value`: string categoría seleccionada.
 * - `onChange`: (categoria: string) => void
 */
export default function SearchableCategoria({
  categorias = [],
  value,
  onChange,
  placeholder = "Seleccionar categoría",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const uniqueCategorias = Array.from(new Set(categorias.filter(Boolean)));

  const searchNorm = normalizeForSearch(search);
  const filtered =
    !searchNorm.trim()
      ? uniqueCategorias
      : uniqueCategorias.filter((c) =>
          normalizeForSearch(c).includes(searchNorm),
        );

  const exactMatch =
    searchNorm.trim() &&
    uniqueCategorias.some(
      (c) => normalizeForSearch(c) === searchNorm.trim(),
    );
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
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
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

  const handleSelect = (categoria) => {
    onChange(categoria);
    setOpen(false);
  };

  const handleCrear = () => {
    const nombre = search.trim();
    if (!nombre) return;
    onChange(nombre);
    setOpen(false);
  };

  const displayLabel = value || placeholder;

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
        {displayLabel}
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
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              padding: "4px 0 8px",
            }}
          >
            {filtered.map((c) => (
              <button
                key={c}
                type="button"
                className="searchable-select-option"
                onClick={() => handleSelect(c)}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  background: value === c ? "var(--cream)" : "transparent",
                  fontFamily: "inherit",
                  fontSize: 14,
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--text)",
                }}
              >
                {c}
              </button>
            ))}
            {!filtered.length && !showCrear && (
              <div
                style={{
                  padding: "12px 16px",
                  fontSize: 13,
                  color: "var(--text-muted)",
                }}
              >
                Sin resultados
              </div>
            )}
            {showCrear && (
              <button
                type="button"
                className="searchable-select-option"
                onClick={handleCrear}
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
                {`+ Crear "${search.trim()}"`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

