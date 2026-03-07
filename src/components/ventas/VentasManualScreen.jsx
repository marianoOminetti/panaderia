import { fmt, fmtMonedaDecimal, fmtStock } from "../../lib/format";
import VentasCart from "./VentasCart";
import { SelectorCliente, SelectoresPago } from "./VentasSelectors";
import { DatePicker, ProductSearchInput, FormMoneyInput } from "../ui";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";

export default function VentasManualScreen({
  open,
  onClose,
  mode = "new",
  // Nueva venta
  cartItems,
  cartTotal,
  updateCartQuantity,
  removeFromCart,
  updateCartPrice,
  setCartQuantity,
  recetas,
  stock,
  addToCart,
  onVoz,
  onCobrar,
  // Editar venta
  editCartItems,
  editCartTotal,
  editUpdateQuantity,
  editRemoveItem,
  editSetQuantity,
  editUpdatePrice,
  editForm,
  setEditForm,
  clientes,
  insertCliente,
  showToast,
  onGuardar,
  editSaving,
  editTotalOverride = "",
  setEditTotalOverride,
}) {
  const { search, setSearch, filteredItems: filteredRecetas } = useFilterBySearch(
    recetas ?? [],
    "nombre"
  );

  if (!open) return null;

  const isEdit = mode === "edit";
  const items = isEdit ? editCartItems : cartItems;
  const totalBase = isEdit ? editCartTotal : cartTotal;
  const overrideNum =
    isEdit &&
    editTotalOverride !== "" &&
    !Number.isNaN(parseFloat(String(editTotalOverride).replace(",", ".")))
      ? parseFloat(String(editTotalOverride).replace(",", "."))
      : null;
  const total =
    isEdit && overrideNum != null && overrideNum >= 0 ? overrideNum : totalBase;
  const hasItems = (isEdit ? editCartItems : cartItems)?.length > 0;

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
          <div className="screen-title">
            {isEdit ? "Editar venta" : "Nueva venta"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            {isEdit ? "Ajustá cantidades o agregá productos" : "Calculadora de venta"}
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
            {fmtMonedaDecimal(total)}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {!isEdit && (
              <button type="button" className="btn-secondary" onClick={onVoz}>
                🎙️ Voz
              </button>
            )}
            {isEdit ? (
              <button
                type="button"
                className="btn-primary"
                onClick={onGuardar}
                disabled={editSaving || !hasItems}
              >
                {editSaving ? "Guardando…" : "Guardar"}
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={onCobrar}
                disabled={!hasItems}
              >
                ✓ Cobrar
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="screen-content">
        {isEdit && (
          <div className="card" style={{ marginBottom: 16 }}>
            <SelectorCliente
              value={editForm?.cliente_id ?? null}
              onChange={(v) =>
                setEditForm?.((prev) => ({ ...prev, cliente_id: v }))
              }
              clientes={clientes ?? []}
              insertCliente={insertCliente}
              showToast={showToast}
            />
            <SelectoresPago
              medioPago={editForm?.medio_pago ?? "efectivo"}
              setMedioPago={(v) =>
                setEditForm?.((prev) => ({ ...prev, medio_pago: v }))
              }
              estadoPago={editForm?.estado_pago ?? "pagado"}
              setEstadoPago={(v) =>
                setEditForm?.((prev) => ({ ...prev, estado_pago: v }))
              }
            />
            <DatePicker
              label="Fecha"
              value={editForm?.fecha ?? ""}
              onChange={(v) =>
                setEditForm?.((prev) => ({ ...prev, fecha: v }))
              }
            />
            <FormMoneyInput
              label="Total final (editable)"
              value={editTotalOverride}
              onChange={(v) => setEditTotalOverride?.(v)}
              placeholder={fmtMonedaDecimal(editCartTotal).replace("$", "").trim()}
              style={{ marginTop: 12 }}
            />
            <p className="form-hint" style={{ marginTop: -8 }}>
              Dejalo vacío para usar el total del carrito. Usalo para descuentos o redondeos.
            </p>
          </div>
        )}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Carrito</span>
          </div>
          <VentasCart
            cartItems={items}
            cartTotal={total}
            updateCartQuantity={isEdit ? editUpdateQuantity : updateCartQuantity}
            removeFromCart={isEdit ? editRemoveItem : removeFromCart}
            updateCartPrice={isEdit ? editUpdatePrice : updateCartPrice}
            setCartQuantity={isEdit ? editSetQuantity : setCartQuantity}
            quantityIntegerOnly={false}
            priceEditable
          />
        </div>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Productos</span>
          </div>
          <ProductSearchInput value={search} onChange={setSearch} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {filteredRecetas.map((r) => {
              const st = (stock || {})[r.id] ?? 0;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => addToCart(r, 1)}
                  className="producto-row"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
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
                      fontSize: 13,
                      color: "var(--text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    {fmt(r.precio_venta || 0)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
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
