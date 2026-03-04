import { fmt } from "../../lib/format";
import VentasCart from "./VentasCart";

export default function VentasManualScreen({
  open,
  onClose,
  cartItems,
  cartTotal,
  updateCartQuantity,
  removeFromCart,
  updateCartPrice,
  recetas,
  stock,
  addToCart,
  onVoz,
  onCobrar,
}) {
  if (!open) return null;

  return (
    <div className="screen-overlay">
      <div
        className="screen-header"
        style={{ alignItems: "flex-start" }}
      >
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div className="screen-title">Nueva venta</div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            Calculadora de venta
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
          <div
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            Total
          </div>
          <div
            style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 20,
              color: "var(--purple-dark)",
            }}
          >
            {fmt(cartTotal)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn-secondary" onClick={onVoz}>
              🎙️ Voz
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={onCobrar}
              disabled={cartItems.length === 0}
            >
              ✓ Cobrar
            </button>
          </div>
        </div>
      </div>
      <div className="screen-content">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Carrito</span>
          </div>
          <VentasCart
            cartItems={cartItems}
            cartTotal={cartTotal}
            updateCartQuantity={updateCartQuantity}
            removeFromCart={removeFromCart}
            updateCartPrice={updateCartPrice}
          />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Productos</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {recetas.map((r) => {
              const st = (stock || {})[r.id] ?? 0;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addToCart(r, 1)}
                  className="producto-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: 10,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
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
                      color: "var(--text-muted)",
                    }}
                  >
                    {fmt(r.precio_venta || 0)}/
                    {(r.unidad_rinde || "u").replace("porción", "porc.")}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 2,
                    }}
                  >
                    Stock: {st}
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
