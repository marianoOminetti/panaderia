import { useRef, useState } from "react";
import FacturaFiscalPreview from "../shared/FacturaFiscalPreview";
import { buildFacturaFiscalData } from "../../lib/facturaFiscal";
import { generateTicketImage } from "../../lib/shareTicket";

const MOCK = buildFacturaFiscalData(
  {
    cliente_id: null,
    total: 17500,
    rawItems: [
      {
        fecha: "2026-06-04",
        receta_id: "r1",
        cantidad: 1,
        precio_unitario: 8500,
        total_final: 7500,
      },
      {
        fecha: "2026-06-04",
        receta_id: "r2",
        cantidad: 2,
        precio_unitario: 5000,
        total_final: 10000,
      },
    ],
  },
  {
    estado: "mock",
    cae: "70417054367476",
    cae_vencimiento: "2026-06-14",
    importe_total: 17500,
    punto_venta: 1,
    numero_comprobante: 150,
    emisor_cuit: "27385289958",
    tipo_comprobante: 11,
    receptor_razon_social: "Consumidor final",
    receptor_cuit: null,
  },
  [
    { id: "r1", nombre: "Tarta de chocolate", emoji: "🍫" },
    { id: "r2", nombre: "Medialunas x docena", emoji: "🥐" },
  ],
  [],
);

/** Solo desarrollo: http://localhost:3000/?preview=factura */
export default function FacturaFiscalPreviewDev() {
  const previewRef = useRef(null);
  const [status, setStatus] = useState("");

  const handleCapture = async () => {
    setStatus("Generando PNG…");
    try {
      const imgs = [...previewRef.current.querySelectorAll("img")];
      await Promise.all(
        imgs.map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete && img.naturalWidth > 0) resolve();
              else {
                img.onload = resolve;
                img.onerror = resolve;
              }
            }),
        ),
      );
      const blob = await generateTicketImage(previewRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "factura-preview-dev.png";
      a.click();
      URL.revokeObjectURL(url);
      setStatus("PNG descargado (revisá logo y Factura C)");
    } catch (e) {
      setStatus(`Error: ${e.message}`);
    }
  };

  return (
    <div style={{ padding: 24, background: "#f0f0f0", minHeight: "100vh" }}>
      <p style={{ marginBottom: 12, fontSize: 14 }}>
        <strong>Preview dev</strong> — comprobante fiscal de ejemplo.{" "}
        <a href="/">Volver a la app</a>
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        <FacturaFiscalPreview ref={previewRef} data={MOCK} />
        <div>
          <button type="button" className="btn-primary" onClick={handleCapture}>
            Descargar PNG de prueba
          </button>
          {status && <p className="form-hint" style={{ marginTop: 8 }}>{status}</p>}
          <ul className="form-hint" style={{ marginTop: 12, maxWidth: 280 }}>
            <li>Logo Sin T.A.C.C. al final de cada producto</li>
            <li>Factura C · 00001-00000150</li>
            <li>QR con emisor_cuit de ejemplo (como en prod tras backfill)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
