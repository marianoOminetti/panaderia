function PlanSemanalTable({
  recetas,
  planRows,
  weekStart,
  cartPlanItems,
  loading,
  saving,
  addToPlanCart,
  updatePlanCartQuantity,
  removeFromPlanCart,
  handleProducir,
  guardarPlan,
}) {
  if (loading) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="loading">
          <div className="spinner" />
          <span>Cargando plan...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Agregar al plan</span>
        </div>
        {recetas.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📋</div>
            <p>No hay recetas todavía.</p>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {recetas.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => addToPlanCart(r, 1)}
                className="producto-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  padding: 10,
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  cursor: "pointer",
                  transition:
                    "transform 0.08s ease, box-shadow 0.08s ease",
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = "scale(0.97)";
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <span style={{ fontSize: 26, marginBottom: 4 }}>
                  {r.emoji}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    textAlign: "left",
                  }}
                >
                  {r.nombre}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  Tocá para sumar
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Tu plan esta semana</span>
        </div>
        {cartPlanItems.length === 0 ? (
          <p
            style={{
              padding: "12px 4px",
              fontSize: 14,
              color: "var(--text-muted)",
            }}
          >
            Agregá productos arriba. Después guardá el plan.
          </p>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {cartPlanItems.map((item) => {
              const existente = (planRows || []).find(
                (pr) =>
                  pr.receta_id === item.receta.id &&
                  pr.semana_inicio === weekStart,
              );
              const realizado = Number(
                existente?.cantidad_realizada || 0,
              );
              const pendiente = Math.max(
                (item.cantidad || 0) - realizado,
                0,
              );
              const unidad = item.receta.unidad_rinde || "u";
              return (
                <div
                  key={item.receta.id}
                  className="insumo-item"
                  style={{
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontSize: 22 }}>
                    {item.receta.emoji}
                  </span>
                  <div
                    className="insumo-info"
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <div className="insumo-nombre">
                      {item.receta.nombre}
                    </div>
                    <div
                      className="insumo-detalle"
                      style={{ fontSize: 12 }}
                    >
                      Plan: {item.cantidad} {unidad}
                      {realizado > 0 && (
                        <span
                          style={{
                            marginLeft: 8,
                            color: "var(--green)",
                          }}
                        >
                          · Realizado: {realizado} {unidad}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updatePlanCartQuantity(
                          item.receta.id,
                          -1,
                        )
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--cream)",
                        fontSize: 16,
                        cursor: "pointer",
                        lineHeight: 1,
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        minWidth: 28,
                        textAlign: "center",
                        fontWeight: 500,
                      }}
                    >
                      {item.cantidad}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updatePlanCartQuantity(
                          item.receta.id,
                          1,
                        )
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--cream)",
                        fontSize: 16,
                        cursor: "pointer",
                        lineHeight: 1,
                      }}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        removeFromPlanCart(item.receta.id)
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--danger)",
                        cursor: "pointer",
                        padding: 4,
                        fontSize: 18,
                      }}
                      title="Quitar"
                    >
                      ✕
                    </button>
                    {pendiente > 0 && (
                      <button
                        type="button"
                        className="btn-primary"
                        style={{
                          width: "auto",
                          padding: "6px 10px",
                          fontSize: 12,
                        }}
                        onClick={() => handleProducir(item)}
                        disabled={saving}
                      >
                        Producir ahora
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button
          className="btn-primary"
          onClick={guardarPlan}
          disabled={
            saving || loading || cartPlanItems.length === 0
          }
          style={{ marginTop: 12 }}
        >
          {saving ? "Guardando..." : "Guardar plan semanal"}
        </button>
      </div>
    </>
  );
}

export default PlanSemanalTable;

