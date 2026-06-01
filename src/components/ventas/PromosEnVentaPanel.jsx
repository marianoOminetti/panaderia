import { fmtMonedaDecimal } from "../../lib/format";
import { FormCheckbox } from "../ui";

/**
 * Lista de promos aplicables con toggle por venta (cobro o edición).
 */
export default function PromosEnVentaPanel({
  cartPromos,
  promosExcluidas,
  setPromosExcluidas,
  showTotales = true,
}) {
  const subtotalLista = cartPromos?.subtotalLista ?? 0;
  const descuentoPromo = cartPromos?.descuentoTotal ?? 0;
  const totalConPromo = cartPromos?.totalFinal ?? subtotalLista;
  const promosEnCobro = cartPromos?.promosEnCobro ?? [];

  if (promosEnCobro.length === 0) return null;

  const togglePromo = (promocionId, aplicar) => {
    setPromosExcluidas?.((prev) => {
      const set = new Set(prev);
      if (aplicar) set.delete(promocionId);
      else set.add(promocionId);
      return [...set];
    });
  };

  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "1px dashed var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-muted)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        Promociones en esta venta
      </div>
      {promosEnCobro.map((p) => {
        const aplicada = !p.excluida;
        return (
          <div
            key={p.promocion_id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 0",
              borderBottom: "1px solid var(--border)",
              opacity: aplicada ? 1 : 0.55,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <FormCheckbox
                label={p.nombre}
                checked={aplicada}
                onChange={(checked) => togglePromo(p.promocion_id, checked)}
              />
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: -4,
                  marginLeft: 28,
                }}
              >
                {p.etiqueta}
              </div>
            </div>
            <span
              style={{
                fontSize: 13,
                color: aplicada ? "#4a7c59" : "var(--text-muted)",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {aplicada ? `-${fmtMonedaDecimal(p.descuento)}` : "No aplica"}
            </span>
          </div>
        );
      })}
      {showTotales && (
        <div style={{ marginTop: 8 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            <span>Subtotal</span>
            <span>{fmtMonedaDecimal(subtotalLista)}</span>
          </div>
          {(cartPromos?.aplicadas || []).map((p) => (
            <div
              key={p.promocion_id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "#4a7c59",
                marginBottom: 4,
              }}
            >
              <span>{p.nombre}</span>
              <span>-{fmtMonedaDecimal(p.descuento)}</span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 600,
              fontSize: 16,
              marginTop: 8,
            }}
          >
            <span>Total</span>
            <span>{fmtMonedaDecimal(totalConPromo)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
