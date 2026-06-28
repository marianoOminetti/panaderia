import { fmt } from "../../lib/format";

function PlanSemanalActions({ insumosCompra, onShareCompra, waTextUrl }) {
  return (
    <div className="card">
      <div className="card-header plan-cart-header">
        <span className="card-title">Lista de compras</span>
        {insumosCompra.length > 0 && onShareCompra && (
          <button
            type="button"
            className="plan-icon-btn"
            onClick={onShareCompra}
            title="Compartir lista de compras como imagen"
          >
            <span className="plan-icon-btn__emoji" aria-hidden>📤</span>
            <span className="plan-icon-btn__label">Compartir</span>
          </button>
        )}
      </div>
      {insumosCompra.length === 0 ? (
        <p className="plan-compra-empty">No hay faltantes para esta semana con el plan actual.</p>
      ) : (
        <>
          {Object.entries(
            insumosCompra.reduce((acc, item) => {
              const proveedor = item.insumo?.proveedor || "Sin proveedor";
              if (!acc[proveedor]) acc[proveedor] = [];
              acc[proveedor].push(item);
              return acc;
            }, {}),
          ).map(([proveedor, items]) => (
            <div key={proveedor} className="plan-compra-block">
              <p className="plan-section-label">{proveedor}</p>
              {items.map(({ insumo_id, insumo, faltante, costo }) => (
                <div key={insumo_id} className="insumo-item plan-compra-item">
                  <div className="insumo-info">
                    <div className="insumo-nombre">{insumo?.nombre || "Insumo"}</div>
                    <div className="insumo-detalle">
                      Faltan {faltante.toFixed(2)} {insumo?.unidad || "u"}
                    </div>
                  </div>
                  {costo > 0 && (
                    <div className="insumo-precio">
                      <div className="insumo-precio-value">{fmt(costo)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          {waTextUrl && (
            <a
              href={waTextUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary plan-compra-text-share"
            >
              Enviar lista como texto
            </a>
          )}
        </>
      )}
    </div>
  );
}

export default PlanSemanalActions;
