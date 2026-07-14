import { useState } from "react";
import ShareTicketModal from "../shared/ShareTicketModal";
import PedidosListItem from "./PedidosListItem";
import { usePedidosListFilter } from "../../hooks/usePedidosListFilter";

export default function PedidosList({
  pedidos,
  recetas,
  clientes,
  search,
  onMarcarEntregado,
  onDesentregar,
  onEditar,
  onCancelar,
}) {
  const [sharePedido, setSharePedido] = useState(null);
  const filtered = usePedidosListFilter(pedidos, { search, clientes, recetas });

  const buildShareData = (g) => {
    const cliente = (clientes || []).find((c) => c.id === g.cliente_id);
    return {
      fecha_entrega: g.fecha_entrega,
      hora_entrega: g.hora_entrega,
      estado: g.estado,
      cliente: cliente?.nombre || "Cliente",
      senia: g.senia || 0,
      total: g.total || 0,
      notas: g.notas,
      items: (g.items || []).map((it) => {
        const r = recetas.find((rec) => rec.id === it.receta_id);
        return {
          receta_id: it.receta_id,
          receta: r ? { nombre: r.nombre, emoji: r.emoji } : null,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        };
      }),
    };
  };

  if (!filtered.length) {
    return (
      <div className="empty">
        <div className="empty-icon">📦</div>
        <p>Sin pedidos para los filtros seleccionados</p>
      </div>
    );
  }

  return (
    <>
      {filtered.map((g) => {
        const cliente = (clientes || []).find((c) => c.id === g.cliente_id);
        return (
          <PedidosListItem
            key={g.key}
            grupo={g}
            cliente={cliente}
            recetas={recetas}
            onMarcarEntregado={onMarcarEntregado}
            onDesentregar={onDesentregar}
            onEditar={onEditar}
            onCancelar={onCancelar}
            onShare={setSharePedido}
          />
        );
      })}

      {sharePedido && (
        <ShareTicketModal
          type="pedido"
          data={buildShareData(sharePedido)}
          onClose={() => setSharePedido(null)}
        />
      )}
    </>
  );
}
