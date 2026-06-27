/**
 * Pantalla Stock: orquesta lista, carrito de producción (useStockCart) y carga de stock.
 * Mantiene ejecutarCargaStock aquí; métricas y prioridades se calculan en el componente.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { DIAS_ALERTA_ROJA } from "../../config/appConfig";
import { getInsumosEnCeroParaRecetas } from "../../lib/stockPlan";
import { ejecutarCargaStock } from "../../lib/ejecutarCargaStock";
import { useStockCart } from "../../hooks/useStockCart";
import { useStockScreenMetrics } from "../../hooks/useStockScreenMetrics";
import { useStockInsights } from "../../hooks/useStockInsights";
import InsightsList from "../insights/InsightsList";
import StockList from "./StockList";
import StockProductionModal from "./StockProductionModal";
import StockAdjustModal from "./StockAdjustModal";

function Stock({
  onOpenInsumosCompra,
  recetas,
  stock,
  actualizarStock,
  actualizarStockBatch,
  consumirInsumosPorStock,
  insumos,
  recetaIngredientes,
  insumoComposicion,
  insumoStock,
  onRefresh,
  showToast,
  ventas,
  pedidos,
  stockProductionPreloadRecetas,
  onConsumedPreloadReceta,
  stockOpenManual,
  onConsumedStockOpenManual,
  showStockInsights = false,
  onStockQuickEdit,
  allowInsumosCompraNav = true,
}) {
  const [manualSaving, setManualSaving] = useState(false);
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [insumosEnCeroAviso, setInsumosEnCeroAviso] = useState(null);
  const [ajusteProductoSel, setAjusteProductoSel] = useState(null);
  const [ajusteSaving, setAjusteSaving] = useState(false);
  const preloadConsumedRef = useRef(null);

  const { stockCart, setStockCart, addToStockCart, totalCartUnidades } =
    useStockCart();

  const ejecutarCargaStockLocal = useCallback(
    async (items) => {
      await ejecutarCargaStock({
        items,
        recetas,
        recetaIngredientes,
        actualizarStock,
        actualizarStockBatch,
        consumirInsumosPorStock,
        onRefresh,
        showToast,
      });
    },
    [
      actualizarStockBatch,
      actualizarStock,
      consumirInsumosPorStock,
      recetas,
      recetaIngredientes,
      onRefresh,
      showToast,
    ],
  );

  useEffect(() => {
    if (!stockProductionPreloadRecetas || stockProductionPreloadRecetas.length === 0) {
      preloadConsumedRef.current = null;
      return;
    }
    const idsKey = stockProductionPreloadRecetas.map((r) => r?.id).filter(Boolean).join(",");
    if (preloadConsumedRef.current === idsKey) return;
    preloadConsumedRef.current = idsKey;
    for (const r of stockProductionPreloadRecetas) {
      if (r?.id) addToStockCart(r, 1);
    }
    setManualScreenOpen(true);
    onConsumedPreloadReceta?.();
  }, [stockProductionPreloadRecetas, addToStockCart, onConsumedPreloadReceta]);

  useEffect(() => {
    if (!stockOpenManual) return;
    setManualScreenOpen(true);
    onConsumedStockOpenManual?.();
  }, [stockOpenManual]); // eslint-disable-line react-hooks/exhaustive-deps -- onConsumedStockOpenManual estable desde App

  const {
    metricasStock,
    pedidosPendientesSemana,
    recetasOrdenadasPorStock,
    prioridadesProduccion,
    sinStockCount,
    bajo2Count,
  } = useStockScreenMetrics({ recetas, stock, ventas, pedidos });

  const stockInsights = useStockInsights({
    enabled: showStockInsights,
    ventas,
    recetas,
    stock,
  });

  const handleInsightStockAction = useCallback(
    (recetaId, { cantidad = 1 } = {}) => {
      if (onStockQuickEdit) {
        onStockQuickEdit(recetaId, { cantidad });
        return;
      }
      const r = (recetas || []).find((x) => x.id === recetaId);
      if (!r?.id) return;
      addToStockCart(r, cantidad);
      setManualScreenOpen(true);
    },
    [recetas, addToStockCart, onStockQuickEdit],
  );

  const cargarStockCarrito = async () => {
    if (!stockCart.length) {
      showToast("Agregá productos al carrito para cargar stock.");
      return;
    }
    const items = stockCart
      .map((it) => ({ receta: it.receta, cantidad: it.cantidad || 0 }))
      .filter((it) => it.receta && it.cantidad > 0);
    if (!items.length) {
      showToast("No hay cantidades válidas en el carrito.");
      return;
    }
    const insumosEnCero = getInsumosEnCeroParaRecetas(
      items,
      recetaIngredientes,
      insumos,
      insumoComposicion,
      insumoStock,
      recetas
    );
    setManualSaving(true);
    try {
      await ejecutarCargaStockLocal(items);
      setStockCart([]);
      if (insumosEnCero.length > 0) {
        setInsumosEnCeroAviso(insumosEnCero);
      }
    } catch (err) {
      const msg = err?.message ? String(err.message).slice(0, 80) : "";
      showToast(
        msg
          ? `⚠️ Error al cargar stock: ${msg}`
          : "⚠️ Error al cargar stock. Probá de nuevo."
      );
    } finally {
      setManualSaving(false);
    }
  };

  return (
    <div className="content">
      <p className="page-title">Stock</p>
      <p className="page-subtitle">
        Stock actual por producto · se descarga con cada venta
      </p>

      <div className="analytics-kpi-grid" style={{ marginBottom: 12 }}>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-label">Sin stock</div>
          <div className="analytics-kpi-value accent">{sinStockCount}</div>
          <div className="analytics-kpi-sub">productos en 0</div>
        </div>
        <div className="analytics-kpi-card">
          <div className="analytics-kpi-label">
            Críticos (&lt; {DIAS_ALERTA_ROJA} días)
          </div>
          <div
            className="analytics-kpi-value"
            style={{ color: "var(--danger)" }}
          >
            {bajo2Count}
          </div>
          <div className="analytics-kpi-sub">según ritmo de ventas</div>
        </div>
      </div>

      {showStockInsights && stockInsights.all.length > 0 && (
        <div className="insights-panel" style={{ marginBottom: 12 }}>
          <p className="page-subtitle" style={{ margin: "0 0 10px" }}>
            Insights de stock · {stockInsights.all.length}{" "}
            {stockInsights.all.length === 1 ? "alerta" : "alertas"}
          </p>
          <InsightsList
            items={stockInsights.all}
            onStockQuickEdit={handleInsightStockAction}
            grouped
          />
        </div>
      )}

      {!showStockInsights && sinStockCount > 0 && (
        <div className="card dashboard-alert" style={{ marginBottom: 12 }}>
          <div className="card-header">
            <span className="card-title">⚠️ Stock bajo</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {recetas
              .filter((r) => ((stock || {})[r.id] ?? 0) <= 0)
              .slice(0, 6)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    addToStockCart(r, 1);
                    setManualScreenOpen(true);
                  }}
                  style={{
                    fontSize: 12,
                    padding: "4px 10px",
                    background: "var(--surface)",
                    borderRadius: 20,
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                    font: "inherit",
                    color: "inherit",
                  }}
                >
                  {r.emoji || "🍞"} {r.nombre}
                </button>
              ))}
            {sinStockCount > 6 && (
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                +{sinStockCount - 6} más
              </span>
            )}
          </div>
        </div>
      )}

      <StockList
        prioridadesProduccion={prioridadesProduccion}
        recetasOrdenadasPorStock={recetasOrdenadasPorStock}
        stock={stock}
        metricasStock={metricasStock}
        pedidosPendientesSemana={pedidosPendientesSemana}
        onAjustarStock={(receta) => {
          const actual = (stock || {})[receta.id] ?? 0;
          if (actual <= 0) {
            showToast("No hay stock para ajustar a la baja.");
            return;
          }
          setAjusteProductoSel(receta);
        }}
      />

      {manualScreenOpen && (
        <StockProductionModal
          recetasOrdenadasPorStock={recetasOrdenadasPorStock}
          stock={stock}
          stockCart={stockCart}
          addToStockCart={addToStockCart}
          totalCartUnidades={totalCartUnidades}
          manualSaving={manualSaving}
          onBack={() => setManualScreenOpen(false)}
          onCargar={cargarStockCarrito}
          onVaciarCarrito={() => setStockCart([])}
        />
      )}

      {insumosEnCeroAviso && (
        <div className="screen-overlay">
          <div className="screen-header">
            <button
              className="screen-back"
              onClick={() => setInsumosEnCeroAviso(null)}
            >
              ← Volver
            </button>
            <span className="screen-title">Insumos en 0</span>
          </div>
          <div className="screen-content">
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-header">
                <span className="card-title">
                  ¿Querés revisar estos insumos?
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Al cargar esta producción, algunos insumos quedaron en 0.
                {allowInsumosCompraNav ? (
                  <>
                    {" "}
                    Si los compraste, registralos en{" "}
                    <strong>Insumos → Registrar compra de stock</strong> para que
                    el stock y los costos queden al día.
                  </>
                ) : (
                  " Avisá a quien administra insumos para que los registre."
                )}
              </p>
            </div>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title">Insumos detectados en 0</span>
              </div>
              {insumosEnCeroAviso.map(({ insumo_id, insumo }) => (
                <div
                  key={insumo_id}
                  className="insumo-item"
                  style={{
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div className="insumo-info" style={{ flex: 1 }}>
                    <div className="insumo-nombre">
                      {insumo?.nombre || "Insumo"}
                    </div>
                    <div className="insumo-detalle">
                      {insumo?.categoria
                        ? `${insumo.categoria} · `
                        : ""}
                      Unidad: {insumo?.unidad || "g"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allowInsumosCompraNav && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setInsumosEnCeroAviso(null);
                    onOpenInsumosCompra?.(insumosEnCeroAviso);
                  }}
                >
                  Cargar insumos
                </button>
              )}
              <button
                className={allowInsumosCompraNav ? "btn-secondary" : "btn-primary"}
                onClick={() => setInsumosEnCeroAviso(null)}
              >
                {allowInsumosCompraNav ? "Lo veo después" : "Entendido"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!manualScreenOpen && (
        <button
          className="fab fab-receta"
          onClick={() => setManualScreenOpen(true)}
          title="Cargar stock"
        >
          <span>+</span>
          <span>Cargar stock</span>
        </button>
      )}

      {ajusteProductoSel && (
        <StockAdjustModal
          open={Boolean(ajusteProductoSel)}
          type="producto"
          item={ajusteProductoSel}
          currentStock={(stock || {})[ajusteProductoSel.id] ?? 0}
          unidad="u"
          saving={ajusteSaving}
          onClose={() => setAjusteProductoSel(null)}
          onConfirm={async ({ amount }) => {
            const receta = ajusteProductoSel;
            if (!receta || !amount) return;
            setAjusteSaving(true);
            try {
              await actualizarStock(receta.id, -amount);
              showToast(
                `Stock de producto actualizado. Este ajuste no se registró como venta.`
              );
              setAjusteProductoSel(null);
            } catch (err) {
              const msg = err?.message
                ? String(err.message).slice(0, 80)
                : "";
              showToast(
                msg
                  ? `⚠️ No se pudo guardar el ajuste: ${msg}`
                  : "⚠️ No se pudo guardar el ajuste. Probá de nuevo."
              );
            } finally {
              setAjusteSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}

export default Stock;
