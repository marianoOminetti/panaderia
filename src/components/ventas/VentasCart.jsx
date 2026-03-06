import { fmtMonedaDecimal, fmtDecimal, toCantidadNumber } from "../../lib/format";

/** Key estable por ítem: en modo edición permite varias líneas de la misma receta. */
function getItemKey(item) {
  return item.id ?? item.ventaId ?? item.receta?.id;
}

/**
 * Lista del carrito con total.
 * readOnly: true para solo mostrar (ej. en modal de cobro).
 * quantityIntegerOnly: solo cantidades enteras (+/- de 1, input entero).
 */
export default function VentasCart({
  cartItems,
  cartTotal,
  updateCartQuantity,
  removeFromCart,
  updateCartPrice,
  readOnly = false,
  setCartQuantity,
  quantityIntegerOnly = false,
  /** false = siempre mostrar precio como texto (ej. modo editar venta) */
  priceEditable = true,
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

  const itemSubtotal = (it) =>
    (it.precio_unitario || 0) *
    (typeof it.cantidad === "number" ? it.cantidad : toCantidadNumber(it.cantidad) || 0);

  return (
    <>
      <div>
        {cartItems.map((item, index) => {
          const itemKey = getItemKey(item);
          const priceReadOnly = readOnly || !priceEditable;
          const canRemove = !readOnly;
          const cantNum = toCantidadNumber(item.cantidad) || 0;
          const displayQty = quantityIntegerOnly
            ? Math.round(cantNum) || 1
            : item.cantidad;
          const subtotal = itemSubtotal(item);
          const isLast = index === cartItems.length - 1;

          return (
            <div
              key={itemKey}
              className={readOnly ? "venta-item venta-item-simple" : "insumo-item"}
              style={{
                paddingBottom: isLast ? 0 : 10,
                marginBottom: isLast ? 0 : 10,
                borderBottom: isLast ? "none" : "1px solid var(--border)",
              }}
            >
              {/* Línea 1: emoji + nombre (puede wrappear) + X a la derecha */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <span
                  className={readOnly ? "venta-emoji" : ""}
                  style={{
                    fontSize: 24,
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  {item.receta?.emoji}
                </span>
                <div
                  className="insumo-nombre"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontWeight: 600,
                    fontSize: 14,
                    wordWrap: "break-word",
                  }}
                >
                  {item.receta?.nombre}
                </div>
                {canRemove && (
                  <button
                    type="button"
                    onClick={() => removeFromCart(itemKey)}
                    style={{
                      flexShrink: 0,
                      background: "none",
                      border: "none",
                      color: "var(--danger)",
                      cursor: "pointer",
                      fontSize: 18,
                      padding: 0,
                      lineHeight: 1,
                    }}
                    title="Quitar"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Línea 2: indentada; controles cantidad + precio (90px fijo) + subtotal derecha */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginLeft: 32,
                }}
              >
                {readOnly ? (
                  <>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      x{fmtDecimal(
                        typeof item.cantidad === "number"
                          ? item.cantidad
                          : toCantidadNumber(item.cantidad) || 0,
                        2
                      )}{" "}
                      · {fmtMonedaDecimal(item.precio_unitario || 0)} c/u
                    </div>
                    <div
                      style={{
                        marginLeft: "auto",
                        fontWeight: 600,
                        color: "var(--purple-dark)",
                        fontSize: 14,
                      }}
                    >
                      {fmtMonedaDecimal(subtotal)}
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(itemKey, -1)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--cream)",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode={quantityIntegerOnly ? "numeric" : "decimal"}
                      className="form-input"
                      value={displayQty}
                      onChange={(e) => {
                        if (!setCartQuantity) return;
                        const raw = e.target.value.trim();
                        if (quantityIntegerOnly) {
                          const n = parseInt(raw, 10);
                          setCartQuantity(
                            itemKey,
                            Number.isNaN(n) || n < 1 ? 1 : n
                          );
                        } else {
                          setCartQuantity(itemKey, raw === "" ? "" : raw);
                        }
                      }}
                      style={{
                        width: 36,
                        minWidth: 36,
                        textAlign: "center",
                        padding: "2px 4px",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(itemKey, 1)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: "1px solid var(--border)",
                        background: "var(--cream)",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                        marginLeft: 4,
                      }}
                    >
                      $
                    </span>
                    {priceReadOnly ? (
                      <span
                        style={{
                          width: 90,
                          fontSize: 14,
                          color: "var(--text-muted)",
                          textAlign: "center",
                        }}
                      >
                        {fmtMonedaDecimal(item.precio_unitario || 0)}
                      </span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        className="form-input"
                        value={
                          item.precio_unitario === ""
                            ? ""
                            : typeof item.precio_unitario === "number"
                              ? String(item.precio_unitario)
                              : item.precio_unitario
                        }
                        onChange={(e) =>
                          updateCartPrice(itemKey, e.target.value)
                        }
                        style={{
                          width: 90,
                          minWidth: 90,
                          maxWidth: 90,
                          padding: "4px 6px",
                          fontSize: 14,
                          textAlign: "center",
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                    <div
                      style={{
                        marginLeft: "auto",
                        fontWeight: 600,
                        color: "var(--purple-dark)",
                        fontSize: 14,
                        flexShrink: 0,
                      }}
                    >
                      {fmtMonedaDecimal(subtotal)}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
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
          {fmtMonedaDecimal(cartTotal)}
        </span>
      </div>
    </>
  );
}
