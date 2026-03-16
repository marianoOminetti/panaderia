import { fmtMonedaDecimal, fmtDecimal, toCantidadNumber } from "../../lib/format";
import { QuantityControl } from "../ui";

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
                    flexWrap: "wrap",
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
                      <QuantityControl
                        value={displayQty}
                        onChange={(v) => {
                          if (setCartQuantity) {
                            setCartQuantity(itemKey, v);
                          } else {
                            updateCartQuantity(itemKey, v - cantNum);
                          }
                        }}
                        onChangeRaw={setCartQuantity ? (v) => setCartQuantity(itemKey, v) : undefined}
                        min={quantityIntegerOnly ? 1 : 0.1}
                        step={quantityIntegerOnly ? 1 : "auto"}
                        size="sm"
                        showInput={true}
                        allowDecimals={!quantityIntegerOnly}
                      />
                      <div className="cart-price-row">
                        {priceReadOnly ? (
                          <span className="cart-price-label">
                            {fmtMonedaDecimal(item.precio_unitario || 0)} c/u
                          </span>
                        ) : (
                          <div className="form-money-wrapper" style={{ maxWidth: 120 }}>
                            <span className="form-money-symbol">$</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className="form-input form-money-input"
                              aria-label="Precio unitario"
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
                              style={{ padding: "5px 7px 5px 22px", fontSize: 13 }}
                            />
                          </div>
                        )}
                        <div className="cart-subtotal">
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
                            className="btn-remove"
                            onClick={() => removeFromCart(itemKey)}
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
