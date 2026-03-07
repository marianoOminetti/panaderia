import { useState, useRef, useEffect } from "react";

/** Normaliza texto para búsqueda (minúsculas, sin acentos). */
function normalizeForSearch(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Dropdown con búsqueda, estilos de la app. No es un <select> nativo.
 * options: [{ value, label }]
 * value: valor seleccionado (string o null)
 * onChange: (value) => void
 */
export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = "Buscar…",
  emptyMessage = "Sin resultados",
  style,
  id,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const selected = options.find((o) => o.value === value);
  const searchNorm = normalizeForSearch(search);
  const filtered =
    !searchNorm.trim()
      ? options
      : options.filter((o) => normalizeForSearch(o.label).includes(searchNorm));

  useEffect(() => {
    if (!open) return;
    setSearch("");
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
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

  return (
    <div ref={containerRef} style={{ position: "relative", ...style }}>
      <button
        type="button"
        id={id}
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
        {selected ? selected.label : placeholder}
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
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div
            style={{
              maxHeight: 220,
              overflowY: "auto",
              padding: "4px 0 8px",
            }}
          >
            {filtered.length === 0 ? (
              <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-muted)" }}>
                {emptyMessage}
              </div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="searchable-select-option"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 16px",
                    border: "none",
                    background: value === opt.value ? "var(--cream)" : "transparent",
                    fontFamily: "inherit",
                    fontSize: 14,
                    textAlign: "left",
                    cursor: "pointer",
                    color: "var(--text)",
                  }}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
