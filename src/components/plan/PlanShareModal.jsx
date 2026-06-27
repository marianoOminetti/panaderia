import { useRef, useState, useMemo } from "react";
import PlanSharePreview from "./PlanSharePreview";
import { generateTicketImage, shareViaWhatsApp } from "../../lib/shareTicket";
import {
  planDaysForWeek,
  planDayLabel,
  planItemsForDay,
  compraGroupsForShare,
  totalCompraFromItems,
} from "../../lib/planShare";

export default function PlanShareModal({
  mode,
  diaIdx,
  weekStart,
  cartPlanItems,
  insumosCompra,
  semanaTitulo,
  onClose,
  hasCambiosSinGuardar,
}) {
  const previewRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState(null);

  const days = useMemo(
    () => (mode === "week" ? planDaysForWeek(cartPlanItems, weekStart) : []),
    [mode, cartPlanItems, weekStart],
  );

  const dayInfo = useMemo(
    () => (mode === "day" && diaIdx != null ? planDayLabel(weekStart, diaIdx) : null),
    [mode, diaIdx, weekStart],
  );

  const items = useMemo(
    () => (mode === "day" && diaIdx != null ? planItemsForDay(cartPlanItems, diaIdx) : []),
    [mode, diaIdx, cartPlanItems],
  );

  const compraGroups = useMemo(
    () => (mode === "compra" ? compraGroupsForShare(insumosCompra) : []),
    [mode, insumosCompra],
  );

  const totalCompra = useMemo(
    () => (mode === "compra" ? totalCompraFromItems(insumosCompra) : 0),
    [mode, insumosCompra],
  );

  const titulo =
    mode === "week"
      ? "Compartir plan semanal"
      : mode === "compra"
        ? "Compartir lista de compras"
        : `Compartir ${dayInfo?.dia || "día"}`;

  const shareMessage =
    mode === "compra" ? "Lista de compras" : "Plan de producción";

  const handleShare = async () => {
    if (!previewRef.current) return;
    setSharing(true);
    setResult(null);
    try {
      setCapturing(true);
      await new Promise((r) => setTimeout(r, 80));
      const blob = await generateTicketImage(previewRef.current);
      setCapturing(false);
      const slug =
        mode === "week"
          ? "semana"
          : mode === "compra"
            ? "compras"
            : (dayInfo?.dia || "dia").toLowerCase().replace(/\s+/g, "-");
      const filename = `plan-${slug}-${weekStart}.png`;
      const shareResult = await shareViaWhatsApp(blob, filename, shareMessage, {
        appendTransfer: false,
      });
      if (shareResult.method === "download") {
        setResult({
          type: "info",
          message: "Imagen descargada. Compartila desde tu galería.",
        });
      } else if (shareResult.method === "cancelled") {
        setResult(null);
      }
    } catch (err) {
      console.error("[PlanShareModal]", err);
      setResult({ type: "error", message: "No se pudo generar la imagen" });
    } finally {
      setCapturing(false);
      setSharing(false);
    }
  };

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button type="button" className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <span className="screen-title">{titulo}</span>
      </div>
      <div className="screen-content">
        <p className="plan-share-hint">
          Vista previa de la imagen. Podés compartirla por WhatsApp o guardarla.
        </p>
        {hasCambiosSinGuardar && mode !== "compra" && (
          <p className="plan-notice plan-notice--warn plan-share-notice">
            Hay cambios sin guardar: la imagen muestra lo que ves ahora, no necesariamente lo guardado.
          </p>
        )}
        {hasCambiosSinGuardar && mode === "compra" && (
          <p className="plan-notice plan-notice--warn plan-share-notice">
            Hay cambios sin guardar en el plan: la lista refleja el plan actual, no necesariamente lo guardado.
          </p>
        )}
        <div className={`share-preview-wrap${capturing ? " share-preview-wrap--capture" : ""}`}>
          <PlanSharePreview
            ref={previewRef}
            mode={mode}
            semanaTitulo={semanaTitulo}
            dayInfo={dayInfo}
            days={days}
            items={items}
            compraGroups={compraGroups}
            totalCompra={totalCompra}
          />
        </div>

        {result && (
          <p
            className={`plan-share-feedback${
              result.type === "error" ? " plan-share-feedback--error" : ""
            }`}
          >
            {result.message}
          </p>
        )}

        <button
          type="button"
          className="btn-primary plan-share-submit"
          onClick={handleShare}
          disabled={sharing}
        >
          {sharing ? "Generando imagen…" : (
            <>
              <span className="plan-icon-btn__emoji" aria-hidden>📤</span>
              Compartir imagen
            </>
          )}
        </button>
      </div>
    </div>
  );
}
