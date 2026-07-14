import { useState } from "react";
import { fmt } from "../../lib/format";
import { formatFechaLocal, formatFechaRelativa, hoyLocalISO } from "../../lib/dates";
import ShareTicketModal from "../shared/ShareTicketModal";
import {
  getPedidoEstadoLabel,
  isPedidoEditable,
  canDesentregarPedido,
} from "../../lib/pedidos";

function PedidoRow({
  grupo,
  recetas,
  savingEntrega,
  actualizarEstadoPedido,
  marcarPedidoEntregado,
  desentregarPedido,
  onShare,
  onEditar,
  puedeEditar = false,
  activo = false,
}) {
  const unidades = (grupo.items || []).reduce(
    (s, it) => s + (it.cantidad || 0),
    0,
  );
  const fechaRaw = grupo.fecha_entrega
    ? String(grupo.fecha_entrega).slice(0, 10)
    : null;
  const editable = isPedidoEditable(grupo.estado);
  const desentregable = canDesentregarPedido(grupo.estado);
  const mostrarAcciones = activo || desentregable || puedeEditar;

  return (
    <div
      className={`cliente-historial-item cliente-historial-item--pedido${
        activo ? " cliente-historial-item--activo" : ""
      }`}
    >
      <div className="cliente-historial-fecha">
        <span className="cliente-historial-fecha-principal">
          {fechaRaw ? formatFechaRelativa(fechaRaw) : "Sin fecha"}
        </span>
        {fechaRaw && (
          <span className="cliente-historial-fecha-sec">
            {formatFechaLocal(fechaRaw, { weekday: true })}
          </span>
        )}
        <span
          className={`cliente-historial-badge cliente-historial-badge--${grupo.estado || "pendiente"}`}
        >
          {getPedidoEstadoLabel(grupo.estado)}
        </span>
      </div>
      <ul className="cliente-historial-productos">
        {(grupo.items || []).map((it, idx) => {
          const receta = recetas.find((r) => r.id === it.receta_id);
          const bruto = (it.precio_unitario || 0) * (it.cantidad || 0);
          const descuento = Number(it.descuento) || 0;
          const linea = Math.max(0, bruto - descuento);
          return (
            <li
              key={`${grupo.key}-${it.receta_id}-${idx}`}
              className="cliente-historial-linea"
            >
              <span className="cliente-historial-emoji">
                {receta?.emoji || "🥐"}
              </span>
              <span className="cliente-historial-nombre">
                {receta?.nombre || "Producto"} × {it.cantidad || 0}
              </span>
              <span className="cliente-historial-precio">{fmt(linea)}</span>
            </li>
          );
        })}
      </ul>
      <div className="cliente-historial-pie">
        <span>
          {unidades} unidad{unidades !== 1 ? "es" : ""}
        </span>
        <strong>
          {fmt(grupo.total)}
          {grupo.senia > 0 ? ` · Seña ${fmt(grupo.senia)}` : ""}
        </strong>
      </div>
      {mostrarAcciones && (
        <div className="cliente-pedido-acciones">
          {activo && editable && (
            <select
              className="form-input"
              value={grupo.estado || "pendiente"}
              onChange={(e) => actualizarEstadoPedido(grupo, e.target.value)}
              aria-label="Estado del pedido"
            >
              <option value="pendiente">
                {getPedidoEstadoLabel("pendiente")}
              </option>
              <option value="entregado">
                {getPedidoEstadoLabel("entregado")}
              </option>
            </select>
          )}
          <div className="cliente-pedido-acciones-btns">
            {puedeEditar && (
              <button
                type="button"
                className="btn-venta-action"
                onClick={() => onEditar?.(grupo)}
              >
                Editar
              </button>
            )}
            {activo && editable && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => marcarPedidoEntregado(grupo)}
                disabled={savingEntrega}
              >
                Marcar entregado
              </button>
            )}
            {desentregable && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => desentregarPedido?.(grupo)}
                disabled={savingEntrega}
              >
                Desentregar
              </button>
            )}
            {activo && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onShare?.(grupo)}
                title="Compartir"
                aria-label="Compartir pedido"
              >
                📤
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClienteDetallePedidos({
  pedidosClienteAgrupados,
  recetas,
  savingEntrega,
  actualizarEstadoPedido,
  marcarPedidoEntregado,
  desentregarPedido,
  clienteNombre,
  onAbrirPedido,
  puedeAbrirPedido,
}) {
  const [sharePedido, setSharePedido] = useState(null);
  const hoyStr = hoyLocalISO();

  const esActivo = (g) => {
    if (g.estado === "entregado") return false;
    if (!g.fecha_entrega) return true;
    return String(g.fecha_entrega).slice(0, 10) >= hoyStr;
  };

  const activos = pedidosClienteAgrupados.filter(esActivo);
  const historial = pedidosClienteAgrupados
    .filter((g) => !esActivo(g))
    .sort((a, b) => {
      const aDate = a.fecha_entrega || "";
      const bDate = b.fecha_entrega || "";
      return bDate.localeCompare(aDate);
    });

  const buildShareData = (g) => ({
    fecha_entrega: g.fecha_entrega,
    hora_entrega: g.hora_entrega,
    estado: g.estado,
    cliente: clienteNombre || "Cliente",
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
  });

  const puedeEditar = (g) => {
    if (!onAbrirPedido) return false;
    if (typeof puedeAbrirPedido === "function") return puedeAbrirPedido(g);
    return canDesentregarPedido(g.estado);
  };

  if (activos.length === 0 && historial.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <span className="card-title">Pedidos</span>
        </div>
        <p className="cliente-historial-empty">
          No hay pedidos registrados para este cliente.
        </p>
      </div>
    );
  }

  return (
    <>
      {activos.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Pedidos activos</span>
            <span className="card-meta">{activos.length}</span>
          </div>
          {activos.map((g) => (
            <PedidoRow
              key={g.key}
              grupo={g}
              recetas={recetas}
              savingEntrega={savingEntrega}
              actualizarEstadoPedido={actualizarEstadoPedido}
              marcarPedidoEntregado={marcarPedidoEntregado}
              desentregarPedido={desentregarPedido}
              onShare={setSharePedido}
              onEditar={onAbrirPedido}
              puedeEditar={puedeEditar(g)}
              activo
            />
          ))}
        </div>
      )}

      {historial.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-header">
            <span className="card-title">Historial de pedidos</span>
            <span className="card-meta">{historial.length}</span>
          </div>
          {historial.map((g) => (
            <PedidoRow
              key={g.key}
              grupo={g}
              recetas={recetas}
              desentregarPedido={desentregarPedido}
              onEditar={onAbrirPedido}
              puedeEditar={puedeEditar(g)}
            />
          ))}
        </div>
      )}

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

export default ClienteDetallePedidos;
