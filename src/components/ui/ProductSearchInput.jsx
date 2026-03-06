/**
 * Input de búsqueda para listados de productos.
 * Mismo aspecto y placeholder en Cargar producción y Nueva venta.
 */
export default function ProductSearchInput({ value, onChange, placeholder = "Buscar producto…" }) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="form-input"
      style={{
        marginBottom: 12,
        padding: "8px 12px",
        fontSize: 14,
      }}
    />
  );
}
