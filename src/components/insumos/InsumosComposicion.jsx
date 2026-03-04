function InsumosComposicion({
  detalleInsumo,
  insumos,
  insumoComposicion,
  compInsumoSel,
  setCompInsumoSel,
  compFactor,
  setCompFactor,
  compSaving,
  setCompSaving,
  onDeleteComposicion,
  onUpsertComposicion,
  confirm,
  showToast,
}) {
  if (!detalleInsumo) return null;

  const componentes = (insumoComposicion || []).filter(
    (c) => c.insumo_id === detalleInsumo.id
  );

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Composición</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Si este insumo es una mezcla de otros (ej. premezcla = harina + almidón), definí los componentes. Al cargar stock de productos que lo usan, se descontarán automáticamente.
      </p>
      {componentes.map((c) => {
        const hijo = insumos.find((i) => i.id === c.insumo_id_componente);
        return (
          <div
            key={c.insumo_id_componente}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span>
              {hijo?.nombre || "?"} · {(parseFloat(c.factor) * 100).toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={async () => {
                if (!(await confirm(`¿Quitar ${hijo?.nombre} de la composición?`))) return;
                try {
                  await onDeleteComposicion(detalleInsumo.id, c.insumo_id_componente);
                } catch {
                  showToast("⚠️ Error al quitar");
                }
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--danger)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <select
          className="form-input"
          value={compInsumoSel}
          onChange={(e) => setCompInsumoSel(e.target.value)}
          style={{ flex: "1 1 120px", minWidth: 0 }}
        >
          <option value="">— Agregar componente</option>
          {insumos
            .filter((i) => i.id !== detalleInsumo.id)
            .map((i) => (
              <option key={i.id} value={i.id}>
                {i.nombre}
              </option>
            ))}
        </select>
        <input
          type="number"
          min="0.01"
          max="1"
          step="0.01"
          placeholder="Factor (0.5 = 50%)"
          value={compFactor}
          onChange={(e) => setCompFactor(e.target.value)}
          className="form-input"
          style={{ width: 100 }}
        />
        <button
          type="button"
          className="btn-primary"
          disabled={
            compSaving ||
            !compInsumoSel ||
            !compFactor ||
            parseFloat(compFactor) <= 0 ||
            parseFloat(compFactor) > 1
          }
          onClick={async () => {
            const factor = parseFloat(compFactor);
            if (!factor || factor <= 0 || factor > 1) return;
            setCompSaving(true);
            try {
              await onUpsertComposicion({
                insumo_id: detalleInsumo.id,
                insumo_id_componente: compInsumoSel,
                factor,
              });
              setCompInsumoSel("");
              setCompFactor("");
            } catch {
              showToast("⚠️ Error al guardar");
            } finally {
              setCompSaving(false);
            }
          }}
        >
          {compSaving ? "…" : "Agregar"}
        </button>
      </div>
    </div>
  );
}

export default InsumosComposicion;
