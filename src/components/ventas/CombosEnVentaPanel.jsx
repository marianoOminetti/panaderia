import { useMemo } from "react";
import { fmt, fmtMonedaDecimal } from "../../lib/format";
import {
  calcularPrecioListaComboDesdeItems,
  comboEsVendible,
  comboItemsResolubles,
  filtrarCombosVendibles,
} from "../../lib/promociones";

function itemsDeCombo(promo) {
  if (promo.combo_items?.length) return promo.combo_items;
  return (promo.receta_ids || []).map((receta_id) => ({ receta_id, cantidad: 1 }));
}

function etiquetaProductoCombo(receta, cantidad) {
  return `${receta.nombre} ×${cantidad}`;
}

/**
 * Selector rápido de combos (solo combo_precio_fijo activos).
 * Un tap agrega todos los productos al carrito; el descuento lo confirma PromosEnVentaPanel.
 */
export default function CombosEnVentaPanel({
  promociones,
  recetas,
  addToCart,
  showToast,
}) {
  const combos = useMemo(
    () => filtrarCombosVendibles(promociones, recetas),
    [promociones, recetas],
  );

  if (combos.length === 0) return null;

  const agregarCombo = (promo) => {
    const comboItems = itemsDeCombo(promo);
    if (!comboEsVendible(recetas, comboItems)) {
      showToast?.("⚠️ Combo no disponible");
      return;
    }

    const resueltos = comboItemsResolubles(recetas, comboItems);
    for (const { receta, cantidad } of resueltos) {
      addToCart?.(receta, cantidad);
    }
    showToast?.(`✅ ${promo.nombre || "Combo"} agregado`);
  };

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Combos</span>
      </div>
      <p className="form-hint" style={{ marginBottom: 10 }}>
        Tocá un combo para agregar todos sus productos al carrito.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {combos.map((promo) => {
          const comboItems = itemsDeCombo(promo);
          const resueltos = comboItemsResolubles(recetas, comboItems);
          const precioLista = calcularPrecioListaComboDesdeItems(recetas, comboItems);
          const precioCombo = Number(promo.precio_combo) || 0;
          const ahorro = precioLista > precioCombo ? precioLista - precioCombo : 0;

          return (
            <button
              key={promo.id}
              type="button"
              className="producto-row"
              onClick={() => agregarCombo(promo)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 4,
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                cursor: "pointer",
                transition: "background 0.1s ease",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {promo.nombre}
                </span>
                <span
                  style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--purple-dark)",
                    flexShrink: 0,
                  }}
                >
                  {fmt(precioCombo)}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  marginTop: 2,
                }}
              >
                {resueltos.map(({ receta, cantidad }) => (
                  <span
                    key={receta.id}
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.35,
                    }}
                  >
                    {etiquetaProductoCombo(receta, cantidad)}
                  </span>
                ))}
              </div>
              {ahorro > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 6,
                    marginTop: 4,
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  <span style={{ textDecoration: "line-through" }}>{fmt(precioLista)}</span>
                  <span style={{ color: "#4a7c59", fontWeight: 600 }}>
                    −{fmtMonedaDecimal(ahorro).replace("$", "").trim()}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
