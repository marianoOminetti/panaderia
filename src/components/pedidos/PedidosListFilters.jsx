export default function PedidosListFilters({
  search,
  onSearchChange,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          aria-label="Buscar por cliente o producto"
          placeholder="Buscar cliente o producto…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
          fontSize: 12,
        }}
      />
    </div>
  );
}

