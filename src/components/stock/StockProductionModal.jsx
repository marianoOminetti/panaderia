/**
 * Modal "Cargar producción": búsqueda de recetas, carrito (stockCart/addToStockCart), acciones Volver/Cargar.
 * Estado del carrito y ejecutarCarga en Stock.jsx; este componente es presentacional + handlers pasados por props.
 */
import { fmtStock } from "../../lib/format";
import { ProductSearchInput, QuantityControl } from "../ui";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";

function StockProductionModal({
  recetasOrdenadasPorStock,
  stock,
  stockCart,
  addToStockCart,
  totalCartUnidades,
  manualSaving,
  onBack,
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
                  <QuantityControl
                    value={item.cantidad}
                    onChange={(v) => addToStockCart(item.receta, v - item.cantidad)}
                    min={1}
                    disabled={manualSaving}
                    size="sm"
                    showInput
                    allowDecimals={false}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => addToStockCart(item.receta, -item.cantidad)}
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
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredRecetas.map((r) => {
              const st = (stock || {})[r.id] ?? 0;
              const sinStock = st <= 0;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    addToStockCart(r, 1);
                    setSearch("");
                  }}
                  className="producto-row"
                  data-sin-stock={sinStock || undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: sinStock
                      ? "rgba(200, 80, 80, 0.06)"
                      : "var(--surface)",
                    cursor: "pointer",
                    transition: "background 0.1s ease",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{r.emoji}</span>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.nombre}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: sinStock ? "var(--danger)" : "var(--text-muted)",
                      flexShrink: 0,
                      minWidth: 50,
                      textAlign: "right",
                    }}
                  >
                    {fmtStock(st)}
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
