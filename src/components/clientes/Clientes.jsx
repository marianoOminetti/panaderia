/**
 * Pantalla Clientes: lista (ClientesList), detalle (ClienteDetalle) y modal ABM (ClienteFormModal).
 * useClientes para CRUD; estado local para búsqueda y cliente seleccionado.
 */
import { useState } from "react";
import { agruparVentas } from "../../lib/agrupadores";
import { useClientes } from "../../hooks/useClientes";
import ClientesList from "./ClientesList";
import ClienteDetalle from "./ClienteDetalle";
import ClienteFormModal from "./ClienteFormModal";

export default function Clientes({
  ventas,
  clientes,
  recetas,
  pedidos,
  onRefresh,
  showToast,
  actualizarStock,
  confirm,
}) {
  useClientes({
    onRefresh,
    showToast,
  });

  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState("");
  const [detalleCliente, setDetalleCliente] = useState(null);

  const getAvatarColor = (name) => {
    if (!name) return "#ccc";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const getVentasDeCliente = (clienteId) =>
    ventas.filter((v) => v.cliente_id === clienteId);

  const clientesConGasto = clientes
    .map((c) => {
      const vs = getVentasDeCliente(c.id);
      const grupos = agruparVentas(vs);
      const total = vs.reduce((s, v) => {
        const linea =
          v.total_final != null
            ? v.total_final
            : (v.precio_unitario || 0) * (v.cantidad || 0);
        return s + linea;
      }, 0);
      const unidades = vs.reduce((s, v) => s + v.cantidad, 0);
      return { ...c, total, unidades, ventas: grupos.length };
    })
    .sort((a, b) => b.total - a.total);

  const searchValue = search.trim().toLowerCase();

  const clientesFiltrados = clientesConGasto.filter((c) => {
    if (!searchValue) return true;
    const nombre = (c.nombre || "").toLowerCase();
    const tel = (c.telefono || "").toLowerCase();
    return nombre.includes(searchValue) || tel.includes(searchValue);
  });

  const openNew = () => {
    setModal(true);
  };

  return (
    <div className="content">
      <p className="page-title">Clientes</p>
      <p className="page-subtitle">Mejores clientes por gasto total</p>

      <div className="stats-stack">
        <div className="stat-card">
          <div className="stat-label">Clientes</div>
          <div className="stat-value">{clientes.length}</div>
          <div className="analytics-kpi-sub">Total registrados</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Con compras</div>
          <div className="stat-value accent">
            {clientesConGasto.filter((c) => c.total > 0).length}
          </div>
          <div className="analytics-kpi-sub">Clientes con al menos una venta</div>
        </div>
      </div>

      <ClientesList
        clientes={clientes}
        clientesConGasto={clientesConGasto}
        clientesFiltrados={clientesFiltrados}
        search={search}
        setSearch={setSearch}
        onOpenNew={openNew}
        onSelectCliente={setDetalleCliente}
        getAvatarColor={getAvatarColor}
      />

      {detalleCliente && (
        <ClienteDetalle
          cliente={detalleCliente}
          ventas={ventas}
          recetas={recetas}
          pedidos={pedidos}
          onClose={() => setDetalleCliente(null)}
          actualizarStock={actualizarStock}
          showToast={showToast}
          confirm={confirm}
          onRefresh={onRefresh}
        />
      )}

      <ClienteFormModal
        visible={modal}
        onClose={() => setModal(false)}
        clientes={clientes}
        onRefresh={onRefresh}
        showToast={showToast}
      />
    </div>
  );
}

