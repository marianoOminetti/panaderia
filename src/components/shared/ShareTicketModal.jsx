import { useRef, useState } from "react";
import TicketPreview from "./TicketPreview";
import { generateTicketImage, shareViaWhatsApp } from "../../lib/shareTicket";

export default function ShareTicketModal({ type, data, onClose }) {
  const ticketRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [result, setResult] = useState(null);

  const handleShare = async () => {
    if (!ticketRef.current) return;

    setSharing(true);
    setResult(null);

    try {
      const blob = await generateTicketImage(ticketRef.current);
      const filename =
        type === "venta"
          ? `ticket-venta-${Date.now()}.png`
          : `ticket-pedido-${Date.now()}.png`;

      const shareResult = await shareViaWhatsApp(blob, filename);

      if (shareResult.method === "download") {
        setResult({
          type: "info",
          message: "Imagen descargada. Compartila desde tu galería.",
        });
      } else if (shareResult.method === "cancelled") {
        setResult(null);
      }
    } catch (err) {
      console.error("Error sharing:", err);
      setResult({
        type: "error",
        message: "Error al generar la imagen",
      });
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onClose}>
          ← Volver
        </button>
        <span className="screen-title">
          Compartir {type === "venta" ? "venta" : "pedido"}
        </span>
      </div>
      <div className="screen-content">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "16px 0",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: 8,
            marginBottom: 16,
            overflow: "auto",
          }}
        >
          <TicketPreview ref={ticketRef} type={type} data={data} />
        </div>

        {result && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              marginBottom: 12,
              fontSize: 13,
              backgroundColor:
                result.type === "error"
                  ? "rgba(214,69,69,0.1)"
                  : "rgba(59,130,246,0.1)",
              color: result.type === "error" ? "var(--danger)" : "#3b82f6",
            }}
          >
            {result.message}
          </div>
        )}

        <button
          type="button"
          className="btn-primary"
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {sharing ? (
            "Generando imagen…"
          ) : (
            <>
              <span style={{ fontSize: 18 }}>📤</span>
              Compartir por WhatsApp
            </>
          )}
        </button>
      </div>
    </div>
  );
}
