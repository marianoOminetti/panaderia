import { fmt } from "../../lib/format";

/**
 * Lista del carrito con total.
 * readOnly: true para solo mostrar (ej. en modal de cobro).
 */
export default function VentasCart({
  cartItems,
  cartTotal,
  updateCartQuantity,
  removeFromCart,
  updateCartPrice,
  readOnly = false,
}) {
  if (cartItems.length === 0) {
    return (
      <p
        style={{
          padding: "12px 4px",
          fontSize: 14,
          color: "var(--text-muted)",
        }}
      >
        {readOnly ? "No hay productos en el carrito." : "Agregá productos"}
      </p>
    );
  }

  return (
    <>
      <div>
        {cartItems.map((item) => (
          <div
            key={item.receta.id}
            className={readOnly ? "venta-item venta-item-simple" : "insumo-item"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span className={readOnly ? "venta-emoji" : ""} style={{ fontSize: readOnly ? undefined : 22 }}>
              {item.receta.emoji}
            </span>
            <div className="insumo-info" style={{ flex: 1 }}>
              <div className="insumo-nombre">{item.receta.nombre}</div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: readOnly ? 0 : 4,
                }}
              >
                {readOnly ? (
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    x{item.cantidad} · {fmt(item.precio_unitario || 0)} c/u
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.receta.id, -1)
                        }
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--cream)",
                          fontSize: 18,
                          cursor: "pointer",
                        }}
                      >
                        −
                      </button>
                      <span style={{ minWidth: 24, textAlign: "center" }}>
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCartQuantity(item.receta.id, 1)
                        }
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          border: "1px solid var(--border)",
                          background: "var(--cream)",
                          fontSize: 18,
                          cursor: "pointer",
                        }}
                      >
                        +
                      </button>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        $
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-input"
                        value={
                          item.precio_unitario === ""
                            ? ""
                            : item.precio_unitario
                        }
                        onChange={(e) =>
                          updateCartPrice(item.receta.id, e.target.value)
                        }
                        style={{
                          maxWidth: 90,
                          padding: "6px 8px",
                          fontSize: 14,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        minWidth: 80,
                        textAlign: "right",
                        fontWeight: 500,
                      }}
                    >
                      {fmt(
                        (item.precio_unitario || 0) * (item.cantidad || 0),
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.receta.id)}
                      style={{
                        marginLeft: 4,
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        fontSize: 18,
                      }}
                      title="Quitar"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
            {readOnly && (
              <div style={{ fontWeight: 500 }}>
                {fmt(
                  (item.precio_unitario || 0) * (item.cantidad || 0),
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px dashed var(--border)",
        }}
      >
        <span style={{ fontWeight: 500 }}>
          {readOnly ? "Total carrito" : "Total"}
        </span>
        <span
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: 18,
            color: readOnly ? undefined : "#4A7C59",
          }}
        >
          {fmt(cartTotal)}
        </span>
      </div>
    </>
  );
}
