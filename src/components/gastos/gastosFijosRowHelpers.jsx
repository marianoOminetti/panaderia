import { TIPO_LABEL } from "./gastosFijosConstants";
import { formatFecha, getTipo } from "./gastosFijosHelpers";

export const renderDetalleFila = (g) => {
  const tipo = getTipo(g);
  if (tipo === "fijo") {
    const freqLabel =
      g.frecuencia === "diario"
        ? "Diario"
        : g.frecuencia === "semanal"
          ? "Semanal"
          : "Mensual";
    const inicio = g.fecha_inicio_vigencia
      ? formatFecha(g.fecha_inicio_vigencia)
      : null;
    const fin = g.fecha_fin_vigencia ? formatFecha(g.fecha_fin_vigencia) : null;
    const partes = [
      <span key="tipo" className="chip">
        {TIPO_LABEL.fijo}
      </span>,
      freqLabel,
    ];
    if (inicio) partes.push(`Desde ${inicio}`);
    if (fin) partes.push(`Hasta ${fin}`);
    return partes.reduce((acc, part, i) => {
      if (i === 0) return [part];
      return [...acc, " · ", part];
    }, []);
  }
  return [
    <span key="tipo" className="chip">
      {TIPO_LABEL[tipo] || tipo}
    </span>,
    " · ",
    formatFecha(g.fecha),
  ];
};
