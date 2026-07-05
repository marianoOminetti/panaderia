import { useRef, useState } from "react";
import FacturaFiscalPreview from "./FacturaFiscalPreview";
import { generateTicketImage, shareViaWhatsApp } from "../../lib/shareTicket";

function waitForImagesInElement(root) {
  const imgs = [...(root?.querySelectorAll("img") || [])];
  if (imgs.length === 0) return Promise.resolve();
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

/**
 * Vista previa de factura fiscal (CAE ya registrado) para compartir como imagen.
 */
export default function FacturaFiscalModal({ data, onClose }) {
  const previewRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [result, setResult] = useState(null);

  const handleShare = async () => {
    if (!previewRef.current) return;
    setSharing(true);
    setResult(null);
    try {
      setCapturing(true);
      await waitForImagesInElement(previewRef.current);
      await new Promise((r) => setTimeout(r, 50));
      const blob = await generateTicketImage(previewRef.current);
      setCapturing(false);
      const filename = `factura-${data.numero || Date.now()}.png`;
      const shareResult = await shareViaWhatsApp(blob, filename, "Comprobante fiscal", {
        appendTransfer: false,
      });
      if (shareResult.method === "download") {
        setResult({
          type: "info",
          message: "Imagen descargada. Compartila desde tu galería.",
        });
      }
    } catch (err) {
      console.error("[FacturaFiscalModal]", err);
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
        <span className="screen-title">{data.modalTitle || "Factura AFIP"}</span>
      </div>
      <div className="screen-content">
        <div className="factura-fiscal-layout">
          <div className="factura-fiscal-preview-wrap">
            <FacturaFiscalPreview ref={previewRef} data={data} />
          </div>

          {result && (
            <p
              className={`form-hint factura-fiscal-feedback${
                result.type === "error" ? " factura-fiscal-feedback--error" : ""
              }`}
            >
              {result.message}
            </p>
          )}

          <div className="factura-fiscal-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={handleShare}
              disabled={sharing || capturing}
            >
              {sharing ? "Generando…" : "Compartir"}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
