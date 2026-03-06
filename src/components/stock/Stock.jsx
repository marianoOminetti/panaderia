/**
 * Pantalla Stock: orquesta lista, carrito de producción (useStockCart) y flujo de voz (useStockVoz).
 * Mantiene ejecutarCargaVoz aquí para compartir entre carrito y voz; métricas y prioridades se calculan en el componente.
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
import { useStockVoz } from "../../hooks/useStockVoz";
import StockList from "./StockList";
import StockVoiceModal from "./StockVoiceModal";
import StockProductionModal from "./StockProductionModal";

function Stock({
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
  stockProductionPreloadReceta,
  onConsumedPreloadReceta,
  stockOpenManual,
  onConsumedStockOpenManual,
}) {
  const [manualSaving, setManualSaving] = useState(false);
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const preloadConsumedRef = useRef(null);

  const { stockCart, setStockCart, addToStockCart, totalCartUnidades } =
    useStockCart();

  const ejecutarCargaVoz = useCallback(
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

  const voz = useStockVoz({
    recetas,
    recetaIngredientes,
    insumos,
    insumoComposicion,
    insumoStock,
    ejecutarCargaVoz,
    showToast,
  });

  useEffect(() => {
    if (!stockProductionPreloadReceta) {
      preloadConsumedRef.current = null;
      return;
    }
    const id = stockProductionPreloadReceta.id;
    if (preloadConsumedRef.current === id) return;
    preloadConsumedRef.current = id;
    addToStockCart(stockProductionPreloadReceta, 1);
    setManualScreenOpen(true);
    onConsumedPreloadReceta?.();
  }, [stockProductionPreloadReceta, addToStockCart, onConsumedPreloadReceta]);

  useEffect(() => {
    if (!stockOpenManual) return;
    setManualScreenOpen(true);
    voz.setVoiceModal(false);
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
      await ejecutarCargaVoz(items);
      setStockCart([]);
      if (insumosEnCero.length > 0) {
        showToast(
          "Stock cargado. Algunos insumos están en 0; registralos en Insumos → Registrar compra si los compraste."
        );
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

      <StockList
        prioridadesProduccion={prioridadesProduccion}
        recetasOrdenadasPorStock={recetasOrdenadasPorStock}
        stock={stock}
        metricasStock={metricasStock}
        pedidosPendientesSemana={pedidosPendientesSemana}
      />

      {voz.voiceModal && (
        <StockVoiceModal
          transcript={voz.transcript}
          parsedStock={voz.parsedStock}
          listening={voz.listening}
          savingVoice={voz.savingVoice}
          onBack={voz.onBack}
          onDetener={voz.detenerRecStock}
          onHablar={() => voz.iniciarRecStock(false)}
          onAgregarMas={() => voz.iniciarRecStock(true)}
          onCargar={voz.cargarStockVoz}
          onCancelar={voz.onCancelar}
        />
      )}

      {manualScreenOpen && !voz.voiceModal && (
        <StockProductionModal
          recetasOrdenadasPorStock={recetasOrdenadasPorStock}
          stock={stock}
          stockCart={stockCart}
          addToStockCart={addToStockCart}
          totalCartUnidades={totalCartUnidades}
          manualSaving={manualSaving}
          onBack={() => setManualScreenOpen(false)}
          onVoz={voz.iniciarVozStock}
          onCargar={cargarStockCarrito}
          onVaciarCarrito={() => setStockCart([])}
        />
      )}

      {!manualScreenOpen && !voz.voiceModal && (
        <button
          className="fab fab-receta"
          onClick={() => setManualScreenOpen(true)}
          title="Cargar stock"
        >
          <span>+</span>
          <span>Cargar stock</span>
        </button>
      )}
    </div>
  );
}

export default Stock;
