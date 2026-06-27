import { fmt } from "../../lib/format";
import ClienteWhatsAppButton from "./ClienteWhatsAppButton";

function ClienteSpotlightRow({
  rank,
  cliente,
  meta,
  value,
  valueTone,
  onSelect,
  whatsApp,
  showToast,
}) {
  return (
    <div className="clientes-spotlight-row-wrap">
      <button
        type="button"
        className="clientes-spotlight-row"
        onClick={() => onSelect?.(cliente)}
      >
        {rank != null && (
          <span className="clientes-spotlight-rank">{rank}</span>
        )}
        <div className="clientes-spotlight-info">
          <div className="clientes-spotlight-name">{cliente.nombre}</div>
          {meta && <div className="clientes-spotlight-meta">{meta}</div>}
          {cliente.deuda > 0 && (
            <div className="clientes-spotlight-deuda">Debe {fmt(cliente.deuda)}</div>
          )}
        </div>
        {value != null && (
          <div className={`clientes-spotlight-value${valueTone ? ` clientes-spotlight-value--${valueTone}` : ""}`}>
            {value}
          </div>
        )}
      </button>
      {whatsApp && (
        <ClienteWhatsAppButton
          cliente={cliente}
          diasDesdeUltima={cliente.diasDesdeUltima}
          favoritoNombre={cliente.favorito?.nombre}
          compact
          showToast={showToast}
        />
      )}
    </div>
  );
}

export default function ClientesInsights({
  resumen,
  onSelectCliente,
  onVerInactivos,
  showToast,
}) {
  const top = (resumen?.topGasto || [])
    .filter((c) => c.total > 0 && !c.inactivo)
    .slice(0, 5);
  const inactivos = [...(resumen?.inactivos || [])].sort(
    (a, b) => (b.diasDesdeUltima ?? 0) - (a.diasDesdeUltima ?? 0),
  );

  if (!top.length && !inactivos.length) return null;

  return (
    <div className="clientes-spotlight">
      {top.length > 0 && (
        <div className="card clientes-spotlight-card">
          <div className="card-header">
            <span className="card-title">Top clientes</span>
          </div>
          {top.map((c, i) => (
            <ClienteSpotlightRow
              key={c.id}
              rank={`#${i + 1}`}
              cliente={c}
              meta={[
                `${c.ventas} compra${c.ventas !== 1 ? "s" : ""}`,
                c.frecuenciaLabel && c.ventas >= 2 ? c.frecuenciaLabel : null,
                c.favorito ? `${c.favorito.emoji || "🥐"} ${c.favorito.nombre}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              value={fmt(c.total)}
              valueTone="green"
              onSelect={onSelectCliente}
            />
          ))}
        </div>
      )}

      {inactivos.length > 0 && (
        <div className="card clientes-spotlight-card clientes-spotlight-card--alert">
          <div className="card-header">
            <span className="card-title">Dejaron de venir</span>
            {inactivos.length > 5 && onVerInactivos && (
              <button type="button" className="card-link" onClick={onVerInactivos}>
                Ver todos ({inactivos.length})
              </button>
            )}
          </div>
          {inactivos.slice(0, 5).map((c) => (
            <ClienteSpotlightRow
              key={c.id}
              cliente={c}
              meta={`Última compra ${c.ultimaCompraLabel} · ${c.ventas} compras antes${
                c.favorito ? ` · le gustaba ${c.favorito.nombre}` : ""
              }`}
              value={`${c.diasDesdeUltima}d`}
              valueTone="muted"
              onSelect={onSelectCliente}
              whatsApp={!!c.telefono?.trim()}
              showToast={showToast}
            />
          ))}
        </div>
      )}
    </div>
  );
}
