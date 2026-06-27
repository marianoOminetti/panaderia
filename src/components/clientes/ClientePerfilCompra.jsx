import { fmt } from "../../lib/format";

/**
 * Perfil de compra en detalle de cliente: frecuencia, favoritos, ticket.
 */
export default function ClientePerfilCompra({ perfil }) {
  if (!perfil || perfil.compras === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Perfil de compra</span>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", padding: "0 0 8px" }}>
          Todavía no registramos compras de este cliente.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Perfil de compra</span>
        {perfil.esNuevo && <span className="clientes-badge clientes-badge--nuevo">Nuevo</span>}
        {perfil.inactivo && (
          <span className="clientes-badge clientes-badge--inactivo">Inactivo</span>
        )}
      </div>

      <div className="cliente-perfil-grid">
        <div className="cliente-perfil-stat">
          <div className="cliente-perfil-label">Última compra</div>
          <div className="cliente-perfil-value">{perfil.ultimaCompraLabel}</div>
        </div>
        <div className="cliente-perfil-stat">
          <div className="cliente-perfil-label">Frecuencia</div>
          <div className="cliente-perfil-value">{perfil.frecuenciaLabel}</div>
        </div>
        <div className="cliente-perfil-stat">
          <div className="cliente-perfil-label">Ticket promedio</div>
          <div className="cliente-perfil-value">{fmt(perfil.ticketPromedio)}</div>
        </div>
        <div className="cliente-perfil-stat">
          <div className="cliente-perfil-label">Total histórico</div>
          <div className="cliente-perfil-value accent">{fmt(perfil.total)}</div>
        </div>
      </div>

      {perfil.favoritos?.length > 0 && (
        <div className="cliente-favoritos">
          <div className="cliente-perfil-label" style={{ marginBottom: 8 }}>
            Le gusta
          </div>
          <div className="cliente-favoritos-list">
            {perfil.favoritos.map((f) => (
              <div key={f.receta_id} className="cliente-favorito-row">
                <span className="cliente-favorito-emoji">{f.receta?.emoji || "🥐"}</span>
                <span className="cliente-favorito-nombre">{f.receta?.nombre}</span>
                <span className="cliente-favorito-unidades">{f.unidades} u</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
