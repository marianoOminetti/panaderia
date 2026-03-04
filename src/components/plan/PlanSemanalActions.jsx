import { fmt } from "../../lib/format";

function PlanSemanalActions({ insumosCompra, waUrl }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Lista de compras</span>
      </div>
      {insumosCompra.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          No hay faltantes para esta semana con el plan actual.
        </p>
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
            <div key={proveedor} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Proveedor: {proveedor}
              </div>
              {items.map(({ insumo_id, insumo, faltante, costo }) => (
                <div
                  key={insumo_id}
                  className="insumo-item"
                  style={{ padding: "6px 0" }}
                >
                  <div
                    className="insumo-info"
                    style={{ flex: 1 }}
                  >
                    <div className="insumo-nombre">
                      {insumo?.nombre || "Insumo"}
                    </div>
                    <div className="insumo-detalle">
                      Faltan {faltante.toFixed(2)}{" "}
                      {insumo?.unidad || "u"}
                    </div>
                  </div>
                  {costo > 0 && (
                    <div className="insumo-precio">
                      <div className="insumo-precio-value">
                        {fmt(costo)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              display: "inline-block",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Compartir por WhatsApp
          </a>
        </>
      )}
    </div>
  );
}

export default PlanSemanalActions;

