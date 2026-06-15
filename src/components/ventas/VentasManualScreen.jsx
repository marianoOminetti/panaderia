import { useMemo } from "react";
import { fmt, fmtMonedaDecimal, fmtStock } from "../../lib/format";
import { prepararRecetasParaVenta } from "../../lib/recetasParaVenta";
import VentasCart from "./VentasCart";
import { SelectorCliente, SelectoresPago } from "./VentasSelectors";
import { DatePicker, ProductSearchInput, FormMoneyInput } from "../ui";
import { useFilterBySearch } from "../../hooks/useFilterBySearch";
import PromosEnVentaPanel from "./PromosEnVentaPanel";
import AfipReceptorFields from "./AfipReceptorFields";

export default function VentasManualScreen({
  open,
  onClose,
  mode = "new",
  isPedidoFlow = false,
  // Nueva venta
  cartItems,
  cartTotal,
  updateCartQuantity,
  removeFromCart,
  updateCartPrice,
  setCartQuantity,
  recetas,
  ventas = [],
  stock,
  addToCart,
  onCobrar,
  onRegistrarRapida,
  savingVenta = false,
  cartPromos,
  promosExcluidas = [],
  setPromosExcluidas,
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
  editCartPromos,
  editPromosExcluidas = [],
  setEditPromosExcluidas,
  showAfip = false,
  editRegistrarEnAfip = false,
  setEditRegistrarEnAfip,
  editDatosFiscalesAfip,
  setEditDatosFiscalesAfip,
  editFacturaEstado = null,
  editPuedeRegistrarAfip = true,
  onEditClienteChange,
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

  const isEdit = mode === "edit";
  const items = isEdit ? editCartItems : cartItems;
  const totalLista = isEdit ? editCartTotal : cartTotal;
  const promosActivas = isEdit ? editCartPromos : isPedidoFlow ? null : cartPromos;
  const promosExcluidasActuales = isEdit ? editPromosExcluidas : promosExcluidas;
  const setPromosExcluidasActuales = isEdit ? setEditPromosExcluidas : setPromosExcluidas;
  const descuentoPromo = promosActivas?.descuentoTotal ?? 0;
  const totalConPromo =
    descuentoPromo > 0 ? promosActivas.totalFinal : totalLista;
  const overrideNum =
    isEdit &&
    editTotalOverride !== "" &&
    !Number.isNaN(parseFloat(String(editTotalOverride).replace(",", ".")))
      ? parseFloat(String(editTotalOverride).replace(",", "."))
      : null;
  const totalBase = totalConPromo;
  const total =
    isEdit && overrideNum != null && overrideNum >= 0 ? overrideNum : totalBase;
  const hasItems = (isEdit ? editCartItems : cartItems)?.length > 0;
  const hayPromosEnCarrito =
    !isPedidoFlow && (promosActivas?.promosEnCobro?.length ?? 0) > 0;

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
            {isEdit ? "Editar venta" : isPedidoFlow ? "Nuevo pedido" : "Nueva venta"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            {isEdit
              ? "Ajustá cantidades o agregá productos"
              : isPedidoFlow
                ? "Calculadora de pedido"
                : "Calculadora de venta"}
          </div>
        </div>
      </div>
      <div className="screen-content" style={{ paddingBottom: 120 }}>
        {isEdit && (
          <div className="card" style={{ marginBottom: 16 }}>
            <SelectorCliente
              value={editForm?.cliente_id ?? null}
              onChange={
                onEditClienteChange ||
                ((v) => setEditForm?.((prev) => ({ ...prev, cliente_id: v })))
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
              placeholder={fmtMonedaDecimal(totalConPromo).replace("$", "").trim()}
              style={{ marginTop: 12 }}
            />
            <p className="form-hint" style={{ marginTop: -8 }}>
              Dejalo vacío para usar el total con promos. Usalo para descuentos extra o redondeos.
            </p>
            <AfipReceptorFields
              showAfip={showAfip}
              registrarEnAfip={editRegistrarEnAfip}
              setRegistrarEnAfip={setEditRegistrarEnAfip}
              datosFiscalesAfip={editDatosFiscalesAfip}
              setDatosFiscalesAfip={setEditDatosFiscalesAfip}
              clienteId={editForm?.cliente_id}
              facturaEstado={editFacturaEstado}
              puedeRegistrar={editPuedeRegistrarAfip}
              disabled={editSaving}
            />
          </div>
        )}
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Carrito</span>
          </div>
          <VentasCart
            cartItems={items}
            cartTotal={totalLista}
            updateCartQuantity={isEdit ? editUpdateQuantity : updateCartQuantity}
            removeFromCart={isEdit ? editRemoveItem : removeFromCart}
            updateCartPrice={isEdit ? editUpdatePrice : updateCartPrice}
            setCartQuantity={isEdit ? editSetQuantity : setCartQuantity}
            quantityIntegerOnly={false}
            priceEditable
          />
          {hayPromosEnCarrito && (
            <PromosEnVentaPanel
              cartPromos={promosActivas}
              promosExcluidas={promosExcluidasActuales}
              setPromosExcluidas={setPromosExcluidasActuales}
            />
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
            {descuentoPromo > 0 && !isEdit && !isPedidoFlow && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginBottom: 2,
                  textDecoration: "line-through",
                }}
              >
                {fmtMonedaDecimal(totalLista)}
              </div>
            )}
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginBottom: 4,
              }}
            >
              {descuentoPromo > 0 && !isEdit && !isPedidoFlow
                ? `Total con promo (−${fmtMonedaDecimal(descuentoPromo)})`
                : "Total carrito"}
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
          </div>
          {isEdit ? (
            <button
              type="button"
              className="btn-primary"
              onClick={onGuardar}
              disabled={editSaving || !hasItems}
              style={{ width: 180 }}
            >
              {editSaving ? "Guardando…" : "Guardar"}
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                flex: 1,
                minWidth: 0,
                maxWidth: 220,
              }}
            >
              <button
                type="button"
                className="btn-primary"
                onClick={onRegistrarRapida}
                disabled={!hasItems || savingVenta || isPedidoFlow}
                title={
                  isPedidoFlow
                    ? "Para pedidos usá Ir a cobro"
                    : "Efectivo, consumidor final, pagado, hoy"
                }
                style={{ width: "100%", marginTop: 0, padding: "12px 10px", fontSize: 14 }}
              >
                {savingVenta ? "Registrando…" : "Registrar venta"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={onCobrar}
                disabled={!hasItems || savingVenta}
                style={{ width: "100%", marginTop: 0, padding: "10px", fontSize: 13 }}
              >
                Ir a cobro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
