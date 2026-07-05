import { useRef, useState, useMemo, useEffect } from "react";
import TicketPreview from "./TicketPreview";
import { generateTicketImage, shareViaWhatsApp } from "../../lib/shareTicket";

export default function ShareTicketModal({ type, data, onClose }) {
  const ticketRef = useRef(null);
  const [sharing, setSharing] = useState(false);
  const [result, setResult] = useState(null);

  const [cliente, setCliente] = useState(data?.cliente ?? "");
  const [lineTotals, setLineTotals] = useState({});

  useEffect(() => {
    setCliente(data?.cliente ?? "");
    setLineTotals({});
  }, [data]);

  const editedData = useMemo(() => {
    const items = (data?.items || []).map((it, i) => {
      const computed = (it.precio_unitario || 0) * (it.cantidad || 0);
      const lineTotal = lineTotals[i] ?? it._lineTotal ?? computed;
      return { ...it, _lineTotal: lineTotal };
    });
    const itemsSubtotal = items.reduce((s, it) => s + (it._lineTotal || 0), 0);
    const hasManualLineEdits = Object.keys(lineTotals).length > 0;
    let total;
    if (hasManualLineEdits) {
      total = itemsSubtotal;
    } else if ((data.descuento || 0) > 0) {
      total = itemsSubtotal - data.descuento;
    } else {
      total = data.total ?? itemsSubtotal;
    }
    return {
      ...data,
      items,
      total,
      subtotal: hasManualLineEdits ? undefined : data.subtotal,
      descuento: hasManualLineEdits ? 0 : data.descuento,
      descuentoLabel: hasManualLineEdits ? undefined : data.descuentoLabel,
      cliente: cliente.trim() || data?.cliente,
    };
  }, [data, cliente, lineTotals]);

  const handleLineTotalChange = (index, value) => {
    const num = parseFloat(String(value).replace(",", ".")) || 0;
    setLineTotals((prev) => ({ ...prev, [index]: num }));
  };

  const [capturing, setCapturing] = useState(false);
  const allowPriceEdit = !data?.seccionesPorFecha?.length;

  const handleShare = async () => {
    if (!ticketRef.current) return;

    setSharing(true);
    setResult(null);

    try {
      setCapturing(true);
      await new Promise((r) => setTimeout(r, 100));
      const blob = await generateTicketImage(ticketRef.current);
      setCapturing(false);
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
      setCapturing(false);
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
          <TicketPreview
            ref={ticketRef}
            type={type}
            data={editedData}
            editableCliente
            clienteValue={cliente}
            onClienteChange={setCliente}
            editablePrices={allowPriceEdit}
            onLineTotalChange={allowPriceEdit ? handleLineTotalChange : undefined}
            capturing={capturing}
          />
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
