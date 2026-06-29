import { useMemo, useState, useRef, useEffect } from "react";
import { fmt } from "../../lib/format";
import { detalleHoverIngrediente } from "../../lib/costoIngredienteDetalle";

export default function CostoIngredienteHint({ ing, insumos, recetas, recetaIngredientes }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  const detalle = useMemo(
    () => detalleHoverIngrediente(ing, { insumos, recetas, recetaIngredientes }),
    [ing, insumos, recetas, recetaIngredientes],
  );

  const costo = detalle?.costoLinea;
  const tieneDetalle =
    detalle &&
    (detalle.presentacion || detalle.lineas?.length > 0 || detalle.tipo === "fijo");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("click", onDoc, true);
    return () => document.removeEventListener("click", onDoc, true);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={`costo-ing-hint-wrap${open ? " costo-ing-hint-wrap--open" : ""}`}
      onMouseEnter={() => tieneDetalle && setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="costo-ing-hint-bar"
        onClick={() => tieneDetalle && setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={
          tieneDetalle
            ? "Ver detalle del costo del ingrediente"
            : undefined
        }
      >
        <span>
          Costo ingrediente: {costo != null ? fmt(costo) : "—"}
        </span>
        {tieneDetalle && <span className="costo-ing-hint-icon" aria-hidden="true">ⓘ</span>}
      </button>

      {open && tieneDetalle && (
        <div className="costo-ing-popover" role="tooltip">
          {detalle.tipo === "precursora" && (
            <p className="costo-ing-popover-title">{detalle.titulo}</p>
          )}
          {detalle.tipo === "insumo" && (
            <>
              <p className="costo-ing-popover-title">{detalle.titulo}</p>
              {detalle.presentacion && (
                <p className="costo-ing-popover-meta">
                  En Insumos: <strong>{detalle.presentacion}</strong>
                </p>
              )}
              {detalle.cantidadUsada && (
                <p className="costo-ing-popover-meta">Usás: {detalle.cantidadUsada}</p>
              )}
            </>
          )}
          {detalle.tipo === "fijo" && (
            <p className="costo-ing-popover-meta">{detalle.presentacion}</p>
          )}
          {detalle.tipo === "precursora" && (
            <>
              {detalle.cantidadUsada && (
                <p className="costo-ing-popover-meta">{detalle.cantidadUsada}</p>
              )}
              {detalle.rinde && (
                <p className="costo-ing-popover-meta">
                  Rinde la masa: {detalle.rinde}
                </p>
              )}
              {detalle.lineas.length > 0 && (
                <>
                  <p className="costo-ing-popover-sub">Desglose (precios de Insumos):</p>
                  <ul className="costo-ing-popover-list">
                    {detalle.lineas.map((l, idx) => (
                      <li key={`${l.nombre}-${idx}`}>
                        <span className="costo-ing-popover-name">{l.nombre}</span>
                        {l.cantidad && (
                          <span className="costo-ing-popover-qty">{l.cantidad}</span>
                        )}
                        {l.presentacion && !l.esSubPrecursora && (
                          <span className="costo-ing-popover-pres">{l.presentacion}</span>
                        )}
                        {l.costo != null && (
                          <span className="costo-ing-popover-costo">{fmt(l.costo)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
