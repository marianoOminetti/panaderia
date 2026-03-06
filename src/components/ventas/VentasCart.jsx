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

  return (
    <>
      <div>
        {cartItems.map((item) => {
          const itemKey = getItemKey(item);
          const priceReadOnly = readOnly || !priceEditable;
          const canRemove = !readOnly;
          const cantNum = toCantidadNumber(item.cantidad) || 0;
          const displayQty = quantityIntegerOnly
            ? Math.round(cantNum) || 1
            : item.cantidad;

          return (
            <div
              key={itemKey}
              className={readOnly ? "venta-item venta-item-simple" : "insumo-item"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                className={readOnly ? "venta-emoji" : ""}
                style={{
                  fontSize: readOnly ? undefined : 20,
                  alignSelf: "flex-start",
                  marginTop: 2,
                }}
              >
                {item.receta?.emoji}
              </span>
              <div className="insumo-info" style={{ flex: 1 }}>
                <div className="insumo-nombre">{item.receta?.nombre}</div>
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
                      x{fmtDecimal(
                        typeof item.cantidad === "number"
                          ? item.cantidad
                          : toCantidadNumber(item.cantidad) || 0,
                        2
                      )}{" "}
                      · {fmtMonedaDecimal(item.precio_unitario || 0)} c/u
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
                            updateCartQuantity(itemKey, -1)
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
                            minWidth: 36,
                            maxWidth: 60,
                            textAlign: "center",
                            padding: "3px 4px",
                            fontSize: 13,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCartQuantity(itemKey, 1)
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
                        {priceReadOnly ? (
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                            }}
                          >
                            {fmtMonedaDecimal(item.precio_unitario || 0)} c/u
                          </span>
                        ) : (
                          <>
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
                                  : typeof item.precio_unitario === "number"
                                    ? String(item.precio_unitario)
                                    : item.precio_unitario
                              }
                              onChange={(e) =>
                                updateCartPrice(itemKey, e.target.value)
                              }
                              style={{
                                maxWidth: 110,
                                padding: "5px 7px",
                                fontSize: 14,
                              }}
                            />
                          </>
                        )}
                        <div
                          style={{
                            minWidth: 80,
                            textAlign: "right",
                            fontWeight: 500,
                          }}
                        >
                          {fmtMonedaDecimal(
                            (item.precio_unitario || 0) *
                              (typeof item.cantidad === "number"
                                ? item.cantidad
                                : toCantidadNumber(item.cantidad) || 0)
                          )}
                        </div>
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() => removeFromCart(itemKey)}
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
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {readOnly && (
                <div style={{ fontWeight: 500 }}>
                  {fmtMonedaDecimal(
                    (item.precio_unitario || 0) *
                      (typeof item.cantidad === "number"
                        ? item.cantidad
                        : toCantidadNumber(item.cantidad) || 0)
                  )}
                </div>
              )}
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
