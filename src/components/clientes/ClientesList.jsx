import { fmt } from "../../lib/format";
import ClienteWhatsAppButton from "./ClienteWhatsAppButton";

function ClientesList({
  clientes,
  clientesConGasto,
  clientesFiltrados,
  search,
  setSearch,
  filtro,
  setFiltro,
  filtros,
  onOpenNew,
  onSelectCliente,
  getAvatarColor,
  showToast,
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

      <div className="clientes-filtros">
        {(filtros || []).map((f) => (
          <button
            key={f.id}
            type="button"
            className={`clientes-filtro-btn${filtro === f.id ? " clientes-filtro-btn--active" : ""}`}
            onClick={() => setFiltro(f.id)}
          >
            {f.label}
          </button>
        ))}
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
          <p>No se encontraron clientes para esa búsqueda o filtro.</p>
        </div>
      ) : (
        clientesFiltrados.map((c) => {
          const rank = conCompras.findIndex((x) => x.id === c.id) + 1;
          const initial = ((c.nombre || "").trim()[0] || "?").toUpperCase();
          const total = c.total || 0;
          const detalleParts = [
            c.telefono || "—",
            `${c.ventas} compra${c.ventas !== 1 ? "s" : ""}`,
          ];
          if (c.ventas > 0 && c.ultimaCompraLabel) {
            detalleParts.push(`última: ${c.ultimaCompraLabel}`);
          }
          if (c.frecuenciaLabel && c.ventas >= 2) {
            detalleParts.push(c.frecuenciaLabel);
          }

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
              <div className="insumo-info" style={{ flex: 1, minWidth: 0 }}>
                <div className="insumo-nombre" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {c.nombre}
                  {c.esNuevo && (
                    <span className="clientes-badge clientes-badge--nuevo">Nuevo</span>
                  )}
                  {c.inactivo && (
                    <span className="clientes-badge clientes-badge--inactivo">💤</span>
                  )}
                </div>
                <div className="insumo-detalle">{detalleParts.join(" · ")}</div>
                {c.favorito && (
                  <div className="cliente-list-favorito">
                    {c.favorito.emoji || "🥐"} {c.favorito.nombre}
                  </div>
                )}
              </div>
              <div className="insumo-precio">
                <div
                  className="insumo-precio-value"
                  style={{
                    color: total > 0 ? "var(--green)" : "var(--text-muted)",
                  }}
                >
                  {total > 0 ? fmt(total) : "—"}
                </div>
                {(c.deuda || 0) > 0 && (
                  <div className="clientes-deuda-badge">Debe {fmt(c.deuda)}</div>
                )}
              </div>
              {c.inactivo && c.telefono?.trim() && (
                <ClienteWhatsAppButton
                  cliente={c}
                  diasDesdeUltima={c.diasDesdeUltima}
                  favoritoNombre={c.favorito?.nombre}
                  variant="retencion"
                  compact
                  showToast={showToast}
                />
              )}
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
