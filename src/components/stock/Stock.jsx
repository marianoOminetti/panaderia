import { useState, useRef, useEffect } from "react";
import {
  METRICAS_VENTANA_DIAS,
  DIAS_ALERTA_ROJA,
} from "../../config/appConfig";
import { calcularMetricasVentasYStock } from "../../lib/metrics";
import {
  computePedidosPendientesSemana,
  computePrioridadesProduccion,
} from "../../lib/stockMetrics";
import {
  SpeechRecognitionAPI,
  parsearVozAVentas,
} from "../../lib/voice";
import { getInsumosEnCeroParaRecetas, getItemsExplotados } from "../../lib/stockPlan";
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
  registrarMovimientoInsumo,
  onRefresh,
  showToast,
  ventas,
  pedidos,
  stockProductionPreloadReceta,
  onConsumedPreloadReceta,
}) {
  const [manualSaving, setManualSaving] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);
  const [manualScreenOpen, setManualScreenOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedStock, setParsedStock] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const recRef = useRef(null);
  const transcriptRef = useRef("");
  const preloadConsumedRef = useRef(null);
  const [stockCart, setStockCart] = useState([]);

  const metricasStock = calcularMetricasVentasYStock(
    recetas,
    ventas || [],
    stock,
    METRICAS_VENTANA_DIAS,
  );
  const pedidosPendientesSemana = computePedidosPendientesSemana(pedidos);
  const recetasOrdenadasPorStock = [...recetas].slice().sort((a, b) => {
    const sa = (stock || {})[a.id] ?? 0;
    const sb = (stock || {})[b.id] ?? 0;
    if (sa !== sb) return sa - sb;
    return (a.nombre || "").localeCompare(b.nombre || "", "es", { sensitivity: "base" });
  });
  const prioridadesProduccion = computePrioridadesProduccion(
    recetas,
    stock,
    metricasStock,
    pedidosPendientesSemana,
  );

  const sinStockCount = recetas.filter((r) => ((stock || {})[r.id] ?? 0) <= 0).length;
  const bajo2Count = recetas.filter((r) => {
    const m = metricasStock[r.id];
    return m && m.diasRestantes != null && m.diasRestantes < DIAS_ALERTA_ROJA;
  }).length;

  const addToStockCart = (receta, delta = 1) => {
    if (!receta) return;
    setStockCart((prev) => {
      const idx = prev.findIndex((it) => it.receta.id === receta.id);
      if (idx >= 0) {
        const copy = [...prev];
        const nuevaCant = Math.max(0, (copy[idx].cantidad || 0) + delta);
        if (nuevaCant === 0) {
          copy.splice(idx, 1);
          return copy;
        }
        copy[idx] = { ...copy[idx], cantidad: nuevaCant };
        return copy;
      }
      if (delta <= 0) return prev;
      return [...prev, { receta, cantidad: delta }];
    });
  };

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
  }, [stockProductionPreloadReceta]); // eslint-disable-line react-hooks/exhaustive-deps -- callback estable desde App

  const totalCartUnidades = stockCart.reduce((s, it) => s + (it.cantidad || 0), 0);

  const ejecutarCargaVoz = async (items) => {
    if (!items.length) return;
    const total = items.reduce((s, v) => s + v.cantidad, 0);
    const deltas = items.map((it) => ({ receta_id: it.receta.id, delta: it.cantidad || 0 }));
    if (actualizarStockBatch) {
      await actualizarStockBatch(deltas);
    } else {
      for (const { receta, cantidad: cant } of items) {
        await actualizarStock(receta.id, cant);
      }
    }
    const consumoErrors = [];
    if (consumirInsumosPorStock) {
      // Explotar precursoras para consumir insumos de todas las recetas involucradas
      const explodedByReceta = {};
      for (const { receta, cantidad } of items) {
        const exploded = (recetas?.length && recetaIngredientes?.length)
          ? getItemsExplotados(receta.id, cantidad, recetaIngredientes, recetas)
          : [{ receta, cantidad }];
        for (const { receta: r, cantidad: c } of exploded) {
          if (r?.id && c > 0) explodedByReceta[r.id] = (explodedByReceta[r.id] || 0) + c;
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
      // Rollback stock para mantener consistencia (igual que Plan "Producir")
      const undoDeltas = items.map((it) => ({ receta_id: it.receta.id, delta: -(it.cantidad || 0) }));
      if (actualizarStockBatch) {
        await actualizarStockBatch(undoDeltas);
      } else {
        for (const { receta, cantidad: cant } of items) {
          await actualizarStock(receta.id, -(cant || 0));
        }
      }
      if (onRefresh) onRefresh();
      const names = consumoErrors.slice(0, 3).join(", ") + (consumoErrors.length > 3 ? "…" : "");
      throw new Error(`No se pudo descontar insumos para: ${names}. Stock no se modificó.`);
    }
    if (onRefresh) onRefresh();
    showToast(`✅ Stock cargado: +${total} unidades`);
    setVoiceModal(false);
  };

  const iniciarVozStock = () => {
    if (!SpeechRecognitionAPI) {
      showToast("⚠️ Tu navegador no soporta reconocimiento de voz");
      return;
    }
    setTranscript("");
    setParsedStock([]);
    transcriptRef.current = "";
    setVoiceModal(true);
  };

  const detenerRecStock = () => {
    try { recRef.current?.abort?.(); } catch { /* ignore */ }
    try { recRef.current?.stop?.(); } catch { /* ignore */ }
    recRef.current = null;
    setListening(false);
  };

  const iniciarRecStock = (append) => {
    if (!append) {
      setTranscript("");
      setParsedStock([]);
      transcriptRef.current = "";
    }
    const rec = new SpeechRecognitionAPI();
    recRef.current = rec;
    rec.lang = "es-AR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) {
          transcriptRef.current += (transcriptRef.current ? " " : "") + res[0].transcript;
          setTranscript(transcriptRef.current);
        }
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
      const items = parsearVozAVentas(transcriptRef.current, recetas);
      if (append) {
        setParsedStock((prev) => {
          const merged = [...prev];
          for (const it of items) {
            const idx = merged.findIndex((m) => m.receta.id === it.receta.id);
            if (idx >= 0) merged[idx] = { ...merged[idx], cantidad: merged[idx].cantidad + it.cantidad };
            else merged.push(it);
          }
          return merged;
        });
      } else {
        setParsedStock(items);
      }
    };
    rec.start();
    setListening(true);
  };

  const cargarStockVoz = async () => {
    if (parsedStock.length === 0) {
      showToast("No se detectaron productos. Probá de nuevo.");
      return;
    }
    const insumosEnCero = getInsumosEnCeroParaRecetas(
      parsedStock,
      recetaIngredientes,
      insumos,
      insumoComposicion,
      insumoStock,
      recetas,
    );
    setSavingVoice(true);
    try {
      await ejecutarCargaVoz(parsedStock);
      if (insumosEnCero.length > 0) {
        showToast(
          "Stock cargado. Algunos insumos están en 0; registralos en Insumos → Registrar compra si los compraste."
        );
      }
    } catch (err) {
      const msg = err?.message ? String(err.message).slice(0, 80) : "";
      showToast(msg ? `⚠️ Error al cargar stock: ${msg}` : "⚠️ Error al cargar stock. Probá de nuevo.");
    } finally {
      setSavingVoice(false);
    }
  };

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
      recetas,
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
      showToast(msg ? `⚠️ Error al cargar stock: ${msg}` : "⚠️ Error al cargar stock. Probá de nuevo.");
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
          <div className="analytics-kpi-label">Críticos (&lt; {DIAS_ALERTA_ROJA} días)</div>
          <div className="analytics-kpi-value" style={{ color: "var(--danger)" }}>{bajo2Count}</div>
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

      {voiceModal && (
        <StockVoiceModal
          transcript={transcript}
          parsedStock={parsedStock}
          listening={listening}
          savingVoice={savingVoice}
          onBack={() => { detenerRecStock(); setVoiceModal(false); }}
          onDetener={detenerRecStock}
          onHablar={() => iniciarRecStock(false)}
          onAgregarMas={() => iniciarRecStock(true)}
          onCargar={cargarStockVoz}
          onCancelar={() => { detenerRecStock(); setVoiceModal(false); }}
        />
      )}

      {manualScreenOpen && !voiceModal && (
        <StockProductionModal
          recetasOrdenadasPorStock={recetasOrdenadasPorStock}
          stock={stock}
          stockCart={stockCart}
          addToStockCart={addToStockCart}
          totalCartUnidades={totalCartUnidades}
          manualSaving={manualSaving}
          onBack={() => setManualScreenOpen(false)}
          onVoz={iniciarVozStock}
          onCargar={cargarStockCarrito}
          onVaciarCarrito={() => setStockCart([])}
        />
      )}

      {!manualScreenOpen && !voiceModal && (
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
