import { SearchableSelect } from "../ui";

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
  onActualizarPrecioPremezcla,
  confirm,
  showToast,
}) {
  if (!detalleInsumo) return null;

  const componentes = (insumoComposicion || []).filter(
    (c) => c.insumo_id === detalleInsumo.id
  );

  const costoUnitarioSugerido = componentes.reduce((acc, c) => {
    const hijo = insumos.find((i) => i.id === c.insumo_id_componente);
    if (!hijo) return acc;
    const precioPresentacion = Number(hijo.precio) || 0;
    const cantidad = Number(hijo.cantidad_presentacion) || 1;
    if (!precioPresentacion || !cantidad) return acc;
    const precioUnitHijo = precioPresentacion / cantidad;
    // En base de datos el factor se guarda como fracción (0–1),
    // tanto para composiciones viejas como nuevas. Lo usamos tal cual.
    const factor = Number(c.factor) || 0;
    if (factor <= 0) return acc;
    return acc + factor * precioUnitHijo;
  }, 0);

  const cantidadPremezcla = Number(detalleInsumo.cantidad_presentacion) || 1;
  const precioSugeridoPremezcla =
    costoUnitarioSugerido && cantidadPremezcla > 0
      ? costoUnitarioSugerido * cantidadPremezcla
      : null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-header">
        <span className="card-title">Composición / premezcla</span>
      </div>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
        Si este insumo es una mezcla de otros (ej. premezcla = harina + almidón), definí los componentes. Al cargar stock de productos que lo usan, se descontarán automáticamente.
      </p>
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
        Hoy el costo de esta premezcla no se recalcula solo cuando cambian los precios de sus componentes: es buena práctica revisar su precio periódicamente.
      </p>
      {precioSugeridoPremezcla != null && (
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <span>
            Costo sugerido según componentes:{" "}
            <strong>${precioSugeridoPremezcla.toFixed(2)}</strong>
          </span>
          {onActualizarPrecioPremezcla && (
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "4px 8px", fontSize: 12 }}
              onClick={() => onActualizarPrecioPremezcla(precioSugeridoPremezcla)}
            >
              Usar este costo
            </button>
          )}
        </div>
      )}
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
              {hijo?.nombre || "?"} · {(Number(c.factor) * 100).toFixed(0)}%
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr) auto",
          gap: 8,
          marginTop: 12,
          alignItems: "center",
        }}
      >
        <SearchableSelect
          options={insumos
            .filter((i) => i.id !== detalleInsumo.id)
            .map((i) => ({ value: i.id, label: i.nombre }))}
          value={compInsumoSel}
          onChange={(v) => setCompInsumoSel(v)}
          placeholder="— Agregar componente"
        />
        <input
          type="number"
          min="1"
          max="100"
          step="1"
          placeholder="% del total"
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
            Number(compFactor) <= 0 ||
            Number(compFactor) > 100
          }
          onClick={async () => {
            const porcentaje = Number(compFactor);
            if (!porcentaje || porcentaje <= 0 || porcentaje > 100) return;
            setCompSaving(true);
            try {
              await onUpsertComposicion({
                insumo_id: detalleInsumo.id,
                insumo_id_componente: compInsumoSel,
                factor: porcentaje / 100,
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
