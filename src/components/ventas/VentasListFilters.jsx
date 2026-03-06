/**
 * Filtro para la lista de ventas recientes. Busca en producto y cliente.
 * Usa el patrón search-bar (como InsumosCompra).
 */
export default function VentasListFilters({ search, onSearchChange }) {
  return (
    <div className="search-bar" style={{ marginBottom: 12 }}>
      <span className="search-icon">🔍</span>
      <input
        aria-label="Buscar por producto o cliente"
        placeholder="Buscar producto o cliente…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}
