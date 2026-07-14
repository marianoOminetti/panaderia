import { useState } from "react";
import ShareTicketModal from "../shared/ShareTicketModal";
import PedidosListItem from "./PedidosListItem";
import { usePedidosListFilter } from "../../hooks/usePedidosListFilter";

function Section({ title, count, children }) {
  if (!count) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        className="card-header"
        style={{ padding: "4px 0 8px", marginBottom: 4 }}
      >
        <span className="card-title" style={{ fontSize: 14 }}>
          {title}
        </span>
        <span className="card-meta">{count}</span>
      </div>
      {children}
    </div>
  );
}

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

  const pendientes = filtered.filter((g) => (g.estado || "pendiente") !== "entregado");
  const entregados = filtered.filter((g) => (g.estado || "pendiente") === "entregado");

  const buildShareData = (g) => {
    const cliente =
      (clientes || []).find((c) => c?.id != null && String(c.id) === String(g.cliente_id)) ||
      null;
    return {
      fecha_entrega: g.fecha_entrega,
      hora_entrega: g.hora_entrega,
      estado: g.estado,
      cliente: cliente?.nombre || g.cliente_nombre || "Cliente",
      senia: g.senia || 0,
      total: g.total || 0,
      notas: g.notas,
      items: (g.items || []).map((it) => {
        const r =
          (recetas || []).find(
            (rec) => rec?.id != null && String(rec.id) === String(it.receta_id),
          ) || null;
        return {
          receta_id: it.receta_id,
          receta: r
            ? { nombre: r.nombre, emoji: r.emoji }
            : it.receta_nombre
              ? { nombre: it.receta_nombre, emoji: it.receta_emoji }
              : null,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
        };
      }),
    };
  };

  const renderItem = (g) => {
    const cliente =
      (clientes || []).find((c) => c?.id != null && String(c.id) === String(g.cliente_id)) ||
      null;
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
      <Section title="Pendientes" count={pendientes.length}>
        {pendientes.map(renderItem)}
      </Section>
      <Section title="Entregados (historial)" count={entregados.length}>
        {entregados.map(renderItem)}
      </Section>

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
