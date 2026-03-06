/**
 * Modal "Cargar producción": búsqueda de recetas, carrito (stockCart/addToStockCart), acciones Volver/Voz/Cargar.
 * Estado del carrito y ejecutarCarga en Stock.jsx; este componente es presentacional + handlers pasados por props.
 */
import { fmtStock } from "../../lib/format";
import ProductSearchInput from "../ui/ProductSearchInput";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";

function StockProductionModal({
  recetasOrdenadasPorStock,
  stock,
  stockCart,
  addToStockCart,
  totalCartUnidades,
  manualSaving,
  onBack,
  onVoz,
  onCargar,
  onVaciarCarrito,
}) {
  const { search, setSearch, filteredItems: filteredRecetas } = useFilterBySearch(
    recetasOrdenadasPorStock,
    "nombre"
  );

  return (
    <div className="screen-overlay">
      <div
        className="screen-header"
        style={{ alignItems: "flex-start" }}
      >
        <button className="screen-back" onClick={onBack}>
          ← Volver
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div className="screen-title">Cargar producción</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Carrito de producción
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
            Total
          </div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20,
              color: "var(--purple-dark)",
            }}
          >
            +{totalCartUnidades} u
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onVoz}
            >
              🎙️ Voz
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onCargar}
              disabled={stockCart.length === 0 || manualSaving}
            >
              {manualSaving ? "Cargando…" : "✓ Cargar"}
            </button>
          </div>
        </div>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Carrito de stock</span>
          </div>
          {stockCart.length === 0 ? (
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                padding: "8px 0 4px",
              }}
            >
              Tocá un producto para agregarlo
            </p>
          ) : (
            <>
              {stockCart.map((item) => (
                <div
                  key={item.receta.id}
                  className="insumo-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 0",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{item.receta.emoji}</span>
                  <div className="insumo-info" style={{ flex: 1 }}>
                    <div className="insumo-nombre">{item.receta.nombre}</div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => addToStockCart(item.receta, -1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        background: "var(--cream)",
                        cursor: "pointer",
                        fontSize: 16,
                      }}
                      disabled={manualSaving}
                    >
                      −
                    </button>
                    <span
                      style={{
                        minWidth: 20,
                        textAlign: "center",
                        fontSize: 14,
                      }}
                    >
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToStockCart(item.receta, 1)}
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        background: "var(--cream)",
                        cursor: "pointer",
                        fontSize: 16,
                      }}
                      disabled={manualSaving}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => addToStockCart(item.receta, -item.cantidad)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      fontSize: 18,
                      cursor: "pointer",
                    }}
                    disabled={manualSaving}
                  >
                    ×
                  </button>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                  }}
                >
                  Total a cargar: <strong>{totalCartUnidades}</strong> u
                </span>
                <button
                  type="button"
                  className="card-link"
                  onClick={onVaciarCarrito}
                  disabled={manualSaving}
                >
                  Vaciar carrito
                </button>
              </div>
            </>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Productos</span>
          </div>
          <ProductSearchInput value={search} onChange={setSearch} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {filteredRecetas.map((r) => {
              const st = (stock || {})[r.id] ?? 0;
              const sinStock = st <= 0;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addToStockCart(r, 1)}
                  className="producto-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: sinStock
                      ? "rgba(200, 80, 80, 0.06)"
                      : "var(--surface)",
                    cursor: "pointer",
                    transition:
                      "transform 0.08s ease, box-shadow 0.08s ease",
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "scale(0.97)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0,0,0,0.06)";
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span style={{ fontSize: 26, marginBottom: 4 }}>
                    {r.emoji}
                  </span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      marginBottom: 2,
                      textAlign: "left",
                    }}
                  >
                    {r.nombre}
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      color: sinStock ? "var(--danger)" : "var(--text-muted)",
                    }}
                  >
                    Stock actual: {fmtStock(st)} u
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockProductionModal;
