import { useMemo } from "react";
import { fmt } from "../../lib/format";
import { hoyLocalISO } from "../../lib/dates";
import { buildPerfilFromVentas } from "../../lib/clienteMetrics";
import { deudaCliente } from "../../lib/clienteDeuda";

/**
 * Mini-perfil al elegir cliente en cobro: favoritos, frecuencia, deuda.
 */
export default function VentasClienteMiniPerfil({ clienteId, clientes, ventas, recetas }) {
  const data = useMemo(() => {
    if (!clienteId) return null;
    const cliente = (clientes || []).find((c) => c.id === clienteId);
    if (!cliente) return null;
    const [y, m, d] = hoyLocalISO().split("-").map(Number);
    const hoy = new Date(y, m - 1, d);
    const vs = (ventas || []).filter((v) => v.cliente_id === clienteId);
    const perfil = buildPerfilFromVentas(vs, recetas, cliente, hoy);
    const deuda = deudaCliente(ventas, clienteId);
    return { cliente, perfil, deuda };
  }, [clienteId, clientes, ventas, recetas]);

  if (!data || data.perfil.compras === 0) {
    if (data?.deuda > 0) {
      return (
        <div className="venta-cliente-mini venta-cliente-mini--deuda">
          <span className="venta-cliente-mini-label">⚠️ Debe</span>
          <span className="venta-cliente-mini-deuda">{fmt(data.deuda)}</span>
        </div>
      );
    }
    return null;
  }

  const { perfil, deuda } = data;
  const topFavoritos = (perfil.favoritos || []).slice(0, 3);

  return (
    <div className="venta-cliente-mini">
      {deuda > 0 && (
        <div className="venta-cliente-mini-deuda-row">
          <span>⚠️ Debe {fmt(deuda)}</span>
        </div>
      )}
      {topFavoritos.length > 0 && (
        <div className="venta-cliente-mini-favoritos">
          <span className="venta-cliente-mini-favoritos-label">Suele llevar</span>
          <ul className="venta-cliente-mini-favoritos-list">
            {topFavoritos.map((f) => (
              <li key={f.receta_id}>
                <span>{f.receta?.emoji || "🥐"}</span>
                <strong>{f.receta?.nombre}</strong>
                <span className="venta-cliente-mini-u">{f.unidades} u</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="venta-cliente-mini-lines">
        {perfil.compras >= 2 && (
          <span>
            {perfil.frecuenciaLabel} · última {perfil.ultimaCompraLabel}
          </span>
        )}
        {perfil.compras === 1 && (
          <span>Primera compra · {perfil.ultimaCompraLabel}</span>
        )}
      </div>
    </div>
  );
}
