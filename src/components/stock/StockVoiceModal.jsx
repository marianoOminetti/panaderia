import { fmtStock } from "../../lib/format";

function StockVoiceModal({
  transcript,
  parsedStock,
  listening,
  savingVoice,
  onBack,
  onDetener,
  onHablar,
  onAgregarMas,
  onCargar,
  onCancelar,
}) {
  const totalUnidades = parsedStock.reduce((s, v) => s + v.cantidad, 0);

  return (
    <div className="screen-overlay">
      <div className="screen-header">
        <button className="screen-back" onClick={onBack}>
          ← Volver
        </button>
        <span className="screen-title">🎤 Cargar stock por voz</span>
      </div>
      <div className="screen-content">
        <p className="voice-text" style={{ marginBottom: 12 }}>
          Decí por ejemplo: &quot;10 brownies, 5 panes lactales&quot;
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
        {parsedStock.length > 0 && (
          <div
            className="voice-parsed-list"
            style={{ marginTop: 12 }}
          >
            {parsedStock.map((v, i) => (
              <div key={i} className="voice-parsed-item">
                <span style={{ fontSize: 22 }}>{v.receta.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{v.receta.nombre}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    +{fmtStock(v.cantidad)} unidades
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!listening &&
          parsedStock.length === 0 &&
          transcript && (
            <>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  marginTop: 12,
                }}
              >
                No se encontraron productos. Probá con nombres más
                específicos.
              </p>
              <button
                className="voice-btn"
                onClick={onHablar}
                style={{ marginTop: 12 }}
              >
                🎤 Hablar de nuevo
              </button>
            </>
          )}
        {!listening && parsedStock.length === 0 && !transcript && (
          <button
            className="voice-btn"
            onClick={onHablar}
            style={{ marginTop: 12 }}
          >
            🎤 Hablar
          </button>
        )}
        {!listening && parsedStock.length > 0 && (
          <button
            className="voice-btn"
            onClick={onAgregarMas}
            style={{ marginBottom: 12 }}
          >
            🎤 Agregar más
          </button>
        )}
        <button
          className="btn-primary"
          onClick={onCargar}
          disabled={savingVoice || parsedStock.length === 0}
          style={{ marginTop: 16 }}
        >
          {savingVoice
            ? "Cargando…"
            : `Cargar +${fmtStock(totalUnidades)} unidades`}
        </button>
        <button className="btn-secondary" onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default StockVoiceModal;
