import { useMemo } from "react";
import { fmt, fmtMonedaDecimal, fmtStock } from "../../lib/format";
import { prepararRecetasParaVenta } from "../../lib/recetasParaVenta";
import VentasCart from "../ventas/VentasCart";
import { SelectorCliente } from "../ventas/VentasSelectors";
import PromosEnVentaPanel from "../ventas/PromosEnVentaPanel";
import CombosEnVentaPanel from "../ventas/CombosEnVentaPanel";
import { DatePicker, ProductSearchInput, FormMoneyInput, FormInput, FormTextarea } from "../ui";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";

export default function PedidoEditScreen({
  open,
  onClose,
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
  editCartPromos,
  editPromosExcluidas = [],
  setEditPromosExcluidas,
  recetas,
  stock,
  ventas = [],
  promociones = [],
  addToCart,
}) {
  const recetasParaLista = useMemo(
    () => prepararRecetasParaVenta(recetas, ventas),
    [recetas, ventas],
  );

  const { search, setSearch, filteredItems: filteredRecetas } = useFilterBySearch(
    recetasParaLista,
    "nombre",
  );

  if (!open) return null;

  const descuentoPromo = editCartPromos?.descuentoTotal ?? 0;
  const totalConPromo =
    descuentoPromo > 0 ? editCartPromos.totalFinal : editCartTotal;
  const overrideNum =
    editTotalOverride !== "" &&
    !Number.isNaN(parseFloat(String(editTotalOverride).replace(",", ".")))
      ? parseFloat(String(editTotalOverride).replace(",", "."))
      : null;
  const total =
    overrideNum != null && overrideNum >= 0 ? overrideNum : totalConPromo;
  const hayPromosEnCarrito = (editCartPromos?.promosEnCobro?.length ?? 0) > 0;
  const hasItems = editCartItems?.length > 0;

  return (
    <div className="screen-overlay">
      <div className="screen-header" style={{ alignItems: "flex-start" }}>
        <button type="button" className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div className="screen-title">Editar pedido</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
            Cambiá productos, fecha, seña o promociones
          </div>
        </div>
      </div>
      <div className="screen-content" style={{ paddingBottom: 120 }}>
        <div className="card" style={{ marginBottom: 16 }}>
          <SelectorCliente
            value={editForm?.cliente_id ?? null}
            onChange={(v) => setEditForm?.((prev) => ({ ...prev, cliente_id: v }))}
            clientes={clientes ?? []}
            insertCliente={insertCliente}
            showToast={showToast}
            required
          />
          <DatePicker
            label="Fecha de entrega"
            value={editForm?.fecha_entrega ?? ""}
            onChange={(v) =>
              setEditForm?.((prev) => ({ ...prev, fecha_entrega: v }))
            }
          />
          <FormMoneyInput
            label="Seña / adelanto (opcional)"
            value={editForm?.senia ?? ""}
            onChange={(v) => setEditForm?.((prev) => ({ ...prev, senia: v }))}
            placeholder="0"
          />
          <FormInput
            label="Hora aproximada (opcional)"
            value={editForm?.hora_entrega ?? ""}
            onChange={(v) =>
              setEditForm?.((prev) => ({ ...prev, hora_entrega: v }))
            }
            placeholder="Ej. 10:30"
          />
          <FormTextarea
            label="Notas (opcional)"
            value={editForm?.notas ?? ""}
            onChange={(v) => setEditForm?.((prev) => ({ ...prev, notas: v }))}
            rows={2}
          />
          <FormMoneyInput
            label="Total final (editable)"
            value={editTotalOverride}
            onChange={(v) => setEditTotalOverride?.(v)}
            placeholder={fmtMonedaDecimal(totalConPromo).replace("$", "").trim()}
            style={{ marginTop: 12 }}
          />
          <p className="form-hint" style={{ marginTop: -8 }}>
            Dejalo vacío para usar el total con promos.
          </p>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Carrito</span>
          </div>
          <VentasCart
            cartItems={editCartItems}
            cartTotal={editCartTotal}
            updateCartQuantity={editUpdateQuantity}
            removeFromCart={editRemoveItem}
            updateCartPrice={editUpdatePrice}
            setCartQuantity={editSetQuantity}
            quantityIntegerOnly={false}
            priceEditable
          />
          {hayPromosEnCarrito && (
            <PromosEnVentaPanel
              cartPromos={editCartPromos}
              promosExcluidas={editPromosExcluidas}
              setPromosExcluidas={setEditPromosExcluidas}
            />
          )}
        </div>

        <CombosEnVentaPanel
          promociones={promociones}
          recetas={recetas}
          addToCart={addToCart}
          showToast={showToast}
        />

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
                  onClick={() => {
                    addToCart(r, 1);
                    setSearch("");
                  }}
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

      <div
        style={{
          position: "fixed",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: 430,
          padding: "12px 16px",
          paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))",
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          boxShadow: "0 -4px 18px rgba(123,91,168,0.12)",
          zIndex: 210,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{fmt(total)}</div>
          </div>
          <button
            type="button"
            className="btn-primary"
            disabled={!hasItems || editSaving}
            onClick={onGuardar}
            style={{ flex: 1, maxWidth: 220 }}
          >
            {editSaving ? "Guardando…" : "Guardar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}
