import { useState, useRef, useCallback } from "react";
import { SpeechRecognitionAPI, parsearVozAVentas } from "../lib/voice";
import { getInsumosEnCeroParaRecetas } from "../lib/stockPlan";

/**
 * Estado y handlers del flujo de carga de stock por voz (modal, reconocimiento, parsed items, guardado).
 * Usado por Stock.jsx. Recibe ejecutarCargaVoz desde Stock para no duplicar lógica de batch/consumo.
 * @param {{ recetas: Array, recetaIngredientes: Array, insumos: Array, insumoComposicion: Array, insumoStock: Object, ejecutarCargaVoz: Function, showToast: Function }}
 * @returns {{ voiceModal, setVoiceModal, listening, transcript, parsedStock, savingVoice, iniciarVozStock, detenerRecStock, iniciarRecStock, cargarStockVoz, onBack, onCancelar }}
 */
export function useStockVoz({
  recetas,
  recetaIngredientes,
  insumos,
  insumoComposicion,
  insumoStock,
  ejecutarCargaVoz,
  showToast,
}) {
  const [voiceModal, setVoiceModal] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedStock, setParsedStock] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const recRef = useRef(null);
  const transcriptRef = useRef("");

  const detenerRecStock = useCallback(() => {
    try {
      recRef.current?.abort?.();
    } catch {
      /* ignore */
    }
    try {
      recRef.current?.stop?.();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setListening(false);
  }, []);

  const iniciarVozStock = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      showToast("⚠️ Tu navegador no soporta reconocimiento de voz");
      return;
    }
    setTranscript("");
    setParsedStock([]);
    transcriptRef.current = "";
    setVoiceModal(true);
  }, [showToast]);

  const iniciarRecStock = useCallback(
    (append) => {
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
            transcriptRef.current +=
              (transcriptRef.current ? " " : "") + res[0].transcript;
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
              if (idx >= 0)
                merged[idx] = {
                  ...merged[idx],
                  cantidad: merged[idx].cantidad + it.cantidad,
                };
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
    },
    [recetas]
  );

  const cargarStockVoz = useCallback(async () => {
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
      recetas
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
      showToast(
        msg
          ? `⚠️ Error al cargar stock: ${msg}`
          : "⚠️ Error al cargar stock. Probá de nuevo."
      );
    } finally {
      setSavingVoice(false);
    }
  }, [
    parsedStock,
    recetaIngredientes,
    insumos,
    insumoComposicion,
    insumoStock,
    recetas,
    ejecutarCargaVoz,
    showToast,
  ]);

  const onBack = useCallback(() => {
    detenerRecStock();
    setVoiceModal(false);
  }, [detenerRecStock]);

  const onCancelar = useCallback(() => {
    detenerRecStock();
    setVoiceModal(false);
  }, [detenerRecStock]);

  return {
    voiceModal,
    setVoiceModal,
    listening,
    transcript,
    parsedStock,
    savingVoice,
    iniciarVozStock,
    detenerRecStock,
    iniciarRecStock,
    cargarStockVoz,
    onBack,
    onCancelar,
  };
}
