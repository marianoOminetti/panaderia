import { fmt } from "../../lib/format";

function ClientesList({
  clientes,
  clientesConGasto,
  clientesFiltrados,
  search,
  setSearch,
  onOpenNew,
  onSelectCliente,
  getAvatarColor,
}) {
  const conCompras = clientesConGasto.filter((c) => c.total > 0);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Todos los clientes</span>
        <button className="edit-btn" onClick={onOpenNew}>
          + Cliente
        </button>
      </div>
      <div style={{ margin: "8px 16px 12px" }}>
        <input
          className="form-input"
          placeholder="Buscar por nombre o teléfono"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {clientesConGasto.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">👥</div>
          <p>
            No hay clientes registrados.
            <br />
            Agregá uno con el botón + Cliente.
          </p>
        </div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🔍</div>
          <p>No se encontraron clientes para esa búsqueda.</p>
        </div>
      ) : (
        clientesFiltrados.map((c) => {
          const rank = conCompras.findIndex((x) => x.id === c.id) + 1;
          const initial = ((c.nombre || "").trim()[0] || "?").toUpperCase();
          const total = c.total || 0;
          return (
            <div
              key={c.id}
              className="venta-item"
              onClick={() => onSelectCliente(c)}
              style={{ cursor: "pointer" }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  minWidth: 24,
                }}
              >
                {rank > 0 ? `#${rank}` : "—"}
              </span>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: getAvatarColor(c.nombre),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontWeight: 600,
                  marginRight: 12,
                  flexShrink: 0,
                }}
              >
                {initial}
              </div>
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{c.nombre}</div>
                <div className="insumo-detalle">
                  {c.telefono || "—"} · {c.ventas} compra(s)
                </div>
              </div>
              <div className="insumo-precio">
                <div
                  className="insumo-precio-value"
                  style={{
                    color:
                      total > 0 ? "var(--green)" : "var(--text-muted)",
                  }}
                >
                  {total > 0 ? fmt(total) : "—"}
                </div>
              </div>
            </div>
          );
        })
      )}
      <button className="fab" onClick={onOpenNew}>
        +
      </button>
    </div>
  );
}

export default ClientesList;

