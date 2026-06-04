import { forwardRef, useEffect, useState } from "react";
import QRCode from "qrcode";
import { fmt } from "../../lib/format";

const styles = {
  container: {
    width: "100%",
    maxWidth: 320,
    boxSizing: "border-box",
    backgroundColor: "#ffffff",
    fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  },
  header: {
    textAlign: "center",
    paddingBottom: 12,
    borderBottom: "2px dashed #e0e0e0",
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: 700, color: "#1a1a1a", margin: 0 },
  subtitle: { fontSize: 11, color: "#666", marginTop: 4 },
  fiscalBox: {
    backgroundColor: "#f4f6f8",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 11,
    color: "#333",
    lineHeight: 1.5,
  },
  item: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    fontSize: 13,
  },
  total: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 16,
    fontWeight: 700,
    marginTop: 8,
    paddingTop: 8,
    borderTop: "2px solid #1a1a1a",
  },
  mockBanner: {
    fontSize: 10,
    color: "#b45309",
    textAlign: "center",
    marginTop: 8,
    fontWeight: 600,
  },
};

const FacturaFiscalPreview = forwardRef(function FacturaFiscalPreview(
  { data },
  ref,
) {
  const formatFecha = (f) => {
    if (!f) return "";
    try {
      return new Date(f.length <= 10 ? `${f}T12:00:00` : f).toLocaleDateString(
        "es-AR",
        { day: "numeric", month: "short", year: "numeric" },
      );
    } catch {
      return f;
    }
  };

  const pv = data.punto_venta != null ? String(data.punto_venta).padStart(5, "0") : "—";
  const nro =
    data.numero != null ? String(data.numero).padStart(8, "0") : "—";

  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (!data.qrUrl) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(data.qrUrl, { width: 128, margin: 1, errorCorrectionLevel: "M" })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [data.qrUrl]);

  return (
    <div ref={ref} style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Gluten Free</h2>
        <div style={styles.subtitle}>
          {data.tipoLabel || "Comprobante fiscal"}
        </div>
      </div>

      <div style={styles.fiscalBox}>
        <div>
          <strong>Pto. Vta.:</strong> {pv} · <strong>Nº:</strong> {nro}
        </div>
        <div>
          <strong>CAE:</strong> {data.cae || "—"}
        </div>
        {data.cae_vencimiento && (
          <div>
            <strong>Vto. CAE:</strong> {formatFecha(data.cae_vencimiento)}
          </div>
        )}
        <div>
          <strong>Fecha:</strong> {formatFecha(data.fecha || data.created_at)}
        </div>
        <div>
          <strong>Receptor:</strong>{" "}
          {data.receptorRazon ?? data.cliente ?? "Consumidor final"}
        </div>
        {data.receptorCuit ? (
          <div>
            <strong>CUIT:</strong> {data.receptorCuit}
          </div>
        ) : null}
      </div>

      {(data.items || []).map((item, idx) => (
        <div key={item.receta_id || idx} style={styles.item}>
          <span>
            {item.receta?.emoji || "🍞"}{" "}
            {item.receta?.nombre || "Producto"} x{item.cantidad}
          </span>
          <span>{fmt(item._lineTotal)}</span>
        </div>
      ))}

      <div style={styles.total}>
        <span>TOTAL</span>
        <span>{fmt(data.total)}</span>
      </div>

      {qrDataUrl && (
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <img
            src={qrDataUrl}
            alt="Código QR AFIP"
            width={128}
            height={128}
            style={{ display: "block", margin: "0 auto" }}
          />
          <p style={{ fontSize: 9, color: "#666", marginTop: 4 }}>
            Verificación AFIP/ARCA
          </p>
        </div>
      )}

      {data.esMock && (
        <div style={styles.mockBanner}>COMPROBANTE DE PRUEBA — NO VÁLIDO FISCALMENTE</div>
      )}
    </div>
  );
});

export default FacturaFiscalPreview;
