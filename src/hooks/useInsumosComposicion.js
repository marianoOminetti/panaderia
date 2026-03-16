import { useState } from "react";

/**
 * Estado del formulario de composición de un insumo (selector de componente y factor).
 * Usado por Insumos.jsx; se pasa a InsumosComposicion. La persistencia (upsert/delete) la hace el padre con useInsumos.
 * @returns {{ compInsumoSel, setCompInsumoSel, compFactor, setCompFactor, compSaving, setCompSaving }}
 */
export function useInsumosComposicion() {
  const [compInsumoSel, setCompInsumoSel] = useState("");
  const [compFactor, setCompFactor] = useState("");
  const [compSaving, setCompSaving] = useState(false);

  return {
    compInsumoSel,
    setCompInsumoSel,
    compFactor,
    setCompFactor,
    compSaving,
    setCompSaving,
  };
}
