/**
 * Pantalla Stock: orquesta lista, carrito de producción (useStockCart) y carga de stock.
 * Mantiene ejecutarCargaStock aquí; métricas y prioridades se calculan en el componente.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  METRICAS_VENTANA_DIAS,
  DIAS_ALERTA_ROJA,
} from "../../config/appConfig";
import { calcularMetricasVentasYStock } from "../../lib/metrics";
import {
  computePedidosPendientesSemana,
  computePrioridadesProduccion,
} from "../../lib/stockMetrics";
import { getItemsExplotados, getInsumosEnCeroParaRecetas } from "../../lib/stockPlan";
import { useStockCart } from "../../hooks/useStockCart";
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
}) {
  const [manualSaving, setManualSaving] = useState(false);
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [insumosEnCeroAviso, setInsumosEnCeroAviso] = useState(null);
  const [ajusteProductoSel, setAjusteProductoSel] = useState(null);
  const [ajusteSaving, setAjusteSaving] = useState(false);
  const preloadConsumedRef = useRef(null);

  const { stockCart, setStockCart, addToStockCart, totalCartUnidades } =
    useStockCart();

  const ejecutarCargaStock = useCallback(
    async (items) => {
      if (!items.length) return;
      const total = items.reduce((s, v) => s + v.cantidad, 0);
      const deltas = items.map((it) => ({
        receta_id: it.receta.id,
        delta: it.cantidad || 0,
      }));
      if (actualizarStockBatch) {
        await actualizarStockBatch(deltas);
      } else {
        for (const { receta, cantidad: cant } of items) {
          await actualizarStock(receta.id, cant);
        }
      }
      const consumoErrors = [];
      if (consumirInsumosPorStock) {
        const explodedByReceta = {};
        for (const { receta, cantidad } of items) {
          const exploded =
            recetas?.length && recetaIngredientes?.length
              ? getItemsExplotados(
                  receta.id,
                  cantidad,
                  recetaIngredientes,
                  recetas
                )
              : [{ receta, cantidad }];
          for (const { receta: r, cantidad: c } of exploded) {
            if (r?.id && c > 0)
              explodedByReceta[r.id] =
                (explodedByReceta[r.id] || 0) + c;
          }
        }
        for (const [recetaId, cant] of Object.entries(explodedByReceta)) {
          const receta = recetas?.find((r) => r.id === recetaId);
          try {
            await consumirInsumosPorStock(recetaId, cant);
          } catch (e) {
            consumoErrors.push(receta?.nombre || recetaId);
          }
        }
      }
      if (consumoErrors.length > 0) {
        const undoDeltas = items.map((it) => ({
          receta_id: it.receta.id,
          delta: -(it.cantidad || 0),
        }));
        if (actualizarStockBatch) {
          await actualizarStockBatch(undoDeltas);
        } else {
          for (const { receta, cantidad: cant } of items) {
            await actualizarStock(receta.id, -(cant || 0));
          }
        }
        if (onRefresh) onRefresh();
        const names =
          consumoErrors.slice(0, 3).join(", ") +
          (consumoErrors.length > 3 ? "…" : "");
        throw new Error(
          `No se pudo descontar insumos para: ${names}. Stock no se modificó.`
        );
      }
      if (onRefresh) onRefresh();
      showToast(`✅ Stock cargado: +${total} unidades`);
    },
    [
      actualizarStockBatch,
      actualizarStock,
      consumirInsumosPorStock,
      recetas,
      recetaIngredientes,
      onRefresh,
      showToast,
    ]
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

  const metricasStock = calcularMetricasVentasYStock(
    recetas,
    ventas || [],
    stock,
    METRICAS_VENTANA_DIAS
  );
  const pedidosPendientesSemana = computePedidosPendientesSemana(pedidos);
  const recetasOrdenadasPorStock = [...recetas].slice().sort((a, b) => {
    const sa = (stock || {})[a.id] ?? 0;
    const sb = (stock || {})[b.id] ?? 0;
    if (sa !== sb) return sa - sb;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", {
      sensitivity: "base",
    });
  });
  const prioridadesProduccion = computePrioridadesProduccion(
    recetas,
    stock,
    metricasStock,
    pedidosPendientesSemana
  );

  const sinStockCount = recetas.filter(
    (r) => ((stock || {})[r.id] ?? 0) <= 0
  ).length;
  const bajo2Count = recetas.filter((r) => {
    const m = metricasStock[r.id];
    return m && m.diasRestantes != null && m.diasRestantes < DIAS_ALERTA_ROJA;
  }).length;

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
      await ejecutarCargaStock(items);
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

      {sinStockCount > 0 && (
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
                Al cargar esta producción, algunos insumos quedaron en 0. Si los
                compraste, registralos en{" "}
                <strong>Insumos → Registrar compra de stock</strong> para que
                el stock y los costos queden al día.
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
              <button
                className="btn-primary"
                onClick={() => {
                  setInsumosEnCeroAviso(null);
                  onOpenInsumosCompra?.(insumosEnCeroAviso);
                }}
              >
                Cargar insumos
              </button>
              <button
                className="btn-secondary"
                onClick={() => setInsumosEnCeroAviso(null)}
              >
                Lo veo después
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
              if (onRefresh) onRefresh();
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
