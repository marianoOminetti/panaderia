import { useRef, useState } from "react";
import FacturaFiscalPreview from "./FacturaFiscalPreview";
import { generateTicketImage, shareViaWhatsApp } from "../../lib/shareTicket";

/**
 * Vista previa de factura fiscal (CAE ya registrado) para compartir como imagen/PDF informal.
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
      await new Promise((r) => setTimeout(r, 100));
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
        <span className="screen-title">Factura AFIP</span>
      </div>
      <div className="screen-content" style={{ alignItems: "center" }}>
        <FacturaFiscalPreview ref={previewRef} data={data} />
        {result && (
          <p
            className="form-hint"
            style={{
              marginTop: 12,
              color: result.type === "error" ? "var(--danger)" : undefined,
            }}
          >
            {result.message}
          </p>
        )}
        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: 16, width: "100%", maxWidth: 320 }}
          onClick={handleShare}
          disabled={sharing || capturing}
        >
          {sharing ? "Generando…" : "Compartir / descargar"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ marginTop: 8, width: "100%", maxWidth: 320 }}
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
