import { useState, useRef, useCallback } from "react";
import { parsearVozAVentas } from "../lib/voice";
import { fmt } from "../lib/format";

const SpeechRecognitionAPI =
  typeof window !== "undefined" &&
  (window.SpeechRecognition || window.webkitSpeechRecognition);

/**
 * Estado y handlers del flujo de venta por voz (modal, reconocimiento, parseo a ítems, inyección al carrito).
 * Usado por Ventas.jsx. setCartItems viene de useVentasCart; no registra la venta (eso lo hace el usuario desde el carrito).
 * @param {{ recetas: Array, setCartItems: Function, showToast: Function }}
 * @returns {{ voiceModal, setVoiceModal, listening, transcript, parsedVentas, savingVoice, iniciarVoz, ... }}
 */
export function useVentasVoz({ recetas, setCartItems, showToast }) {
  const [voiceModal, setVoiceModal] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedVentas, setParsedVentas] = useState([]);
  const [savingVoice, setSavingVoice] = useState(false);
  const recRef = useRef(null);
  const transcriptRef = useRef("");
  const appendModeRef = useRef(false);

  const detenerVoz = useCallback(() => {
    try {
      recRef.current?.abort?.();
    } catch {}
    try {
      recRef.current?.stop?.();
    } catch {}
    recRef.current = null;
    setListening(false);
  }, []);

  const iniciarRec = useCallback(
    (append) => {
      appendModeRef.current = append;
      if (!append) {
        setTranscript("");
        setParsedVentas([]);
        transcriptRef.current = "";
      } else {
        setTranscript("");
        transcriptRef.current = "";
      }
      if (!SpeechRecognitionAPI) return;
      const rec = new SpeechRecognitionAPI();
      recRef.current = rec;
      rec.lang = "es-AR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) {
            transcriptRef.current +=
              (transcriptRef.current ? " " : "") + e.results[i][0].transcript;
            setTranscript(transcriptRef.current);
          }
        }
      };
      rec.onend = () => {
        setListening(false);
        recRef.current = null;
        const items = parsearVozAVentas(transcriptRef.current, recetas);
        if (appendModeRef.current) {
          setParsedVentas((prev) => {
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
          setParsedVentas(items);
        }
      };
      rec.start();
      setListening(true);
    },
    [recetas],
  );

  const registrarVentasVoz = useCallback(async () => {
    if (parsedVentas.length === 0) {
      showToast("No se detectaron productos. Probá de nuevo.");
      return;
    }
    setSavingVoice(true);
    try {
      setCartItems((prev) => {
        const merged = [...prev];
        for (const { receta, cantidad: cant } of parsedVentas) {
          if (!receta) continue;
          const idx = merged.findIndex((m) => m.receta.id === receta.id);
          if (idx >= 0)
            merged[idx] = {
              ...merged[idx],
              cantidad: merged[idx].cantidad + cant,
            };
          else
            merged.push({
              receta,
              cantidad: cant,
              precio_unitario: receta.precio_venta || 0,
            });
        }
        return merged;
      });
      const total = parsedVentas.reduce(
        (s, v) => s + (v.receta.precio_venta || 0) * v.cantidad,
        0,
      );
      showToast(`✅ Productos agregados al carrito (${fmt(total)})`);
      setVoiceModal(false);
      setTranscript("");
      setParsedVentas([]);
    } finally {
      setSavingVoice(false);
    }
  }, [parsedVentas, setCartItems, showToast]);

  const abrirVoz = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      showToast("⚠️ Tu navegador no soporta reconocimiento de voz");
      return;
    }
    setTranscript("");
    setParsedVentas([]);
    transcriptRef.current = "";
    setVoiceModal(true);
  }, [showToast]);

  return {
    voiceModal,
    setVoiceModal,
    transcript,
    parsedVentas,
    listening,
    savingVoice,
    iniciarRec,
    detenerVoz,
    registrarVentasVoz,
    abrirVoz,
    SpeechRecognitionAPI,
  };
}
