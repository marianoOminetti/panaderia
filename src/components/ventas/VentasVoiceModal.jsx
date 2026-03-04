import { fmt } from "../../lib/format";

export default function VentasVoiceModal({
  open,
  onClose,
  transcript,
  parsedVentas,
  listening,
  savingVoice,
  onDetener,
  onIniciarRec,
  onAgregarMasVoz,
  onAgregarAlCarrito,
}) {
  if (!open) return null;

  const totalVoz = parsedVentas.reduce(
    (s, v) => s + (v.receta?.precio_venta || 0) * v.cantidad,
    0,
  );

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button
          className="screen-back"
          onClick={() => {
            onDetener();
            onClose();
          }}
        >
          ← Volver
        </button>
        <span className="screen-title">🎤 Agregar por voz</span>
      </div>
      <div className="screen-content">
        <p className="voice-text" style={{ marginBottom: 12 }}>
          Decí por ejemplo: &quot;2 brownies y 1 pan lactal&quot;.
          <br />
          Vamos a agregar los productos al carrito.
        </p>
        {listening && (
          <button
            className="voice-btn listening"
            onClick={onDetener}
            style={{ marginBottom: 16 }}
          >
            Detener
          </button>
        )}
        {listening && (
          <p
            className="voice-transcript"
            style={{ color: "var(--purple-light)" }}
          >
            Escuchando…
          </p>
        )}
        {transcript && (
          <p className="voice-transcript">&quot;{transcript}&quot;</p>
        )}
        {parsedVentas.length > 0 && (
          <div className="voice-parsed-list">
            {parsedVentas.map((v, i) => (
              <div key={i} className="voice-parsed-item">
                <span style={{ fontSize: 22 }}>{v.receta?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{v.receta?.nombre}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    x{v.cantidad} ·{" "}
                    {fmt((v.receta?.precio_venta || 0) * v.cantidad)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!listening && parsedVentas.length === 0 && transcript && (
          <>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted)",
                marginTop: 12,
              }}
            >
              No se encontraron productos. Probá con nombres más específicos.
            </p>
            <button
              className="voice-btn"
              onClick={() => onIniciarRec(false)}
              style={{ marginTop: 12 }}
            >
              🎤 Hablar de nuevo
            </button>
          </>
        )}
        {!listening && parsedVentas.length === 0 && !transcript && (
          <button
            className="voice-btn"
            onClick={() => onIniciarRec(false)}
            style={{ marginTop: 12 }}
          >
            🎤 Hablar
          </button>
        )}
        {!listening && parsedVentas.length > 0 && (
          <button
            className="voice-btn"
            onClick={onAgregarMasVoz}
            style={{ marginBottom: 12 }}
          >
            🎤 Agregar más
          </button>
        )}
        <button
          className="btn-primary"
          onClick={onAgregarAlCarrito}
          disabled={savingVoice || parsedVentas.length === 0}
        >
          {savingVoice
            ? "Agregando…"
            : `Agregar al carrito · ${fmt(totalVoz)}`}
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            onDetener();
            onClose();
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
