/**
 * Pantalla Clientes: lista (ClientesList), detalle (ClienteDetalle) y modal ABM (ClienteFormModal).
 * useClientes para CRUD; useClienteMetrics para frecuencia, favoritos y radar.
 */
import { useState, useMemo, useRef } from "react";
import { useClientes } from "../../hooks/useClientes";
import { useClienteMetrics } from "../../hooks/useClienteMetrics";
import ClientesList from "./ClientesList";
import ClienteDetalle from "./ClienteDetalle";
import ClienteFormModal from "./ClienteFormModal";
import ClientesInsights from "./ClientesInsights";

const FILTROS = [
  { id: "todos", label: "Todos" },
  { id: "activos", label: "Esta semana" },
  { id: "nuevos", label: "Nuevos" },
  { id: "fieles", label: "Fieles" },
  { id: "inactivos", label: "Inactivos" },
  { id: "sin_compras", label: "Sin compras" },
];

export default function Clientes({
  ventas,
  clientes,
  recetas,
  pedidos,
  onRefresh,
  appendCliente,
  updateClienteInState,
  removeClienteFromState,
  reassignClienteIdInState,
  appendPedidos,
  updatePedidosEstado,
  removePedidosByPedidoIdInState,
  appendVentas,
  removeVentas,
  resolveOptimisticVentas,
  patchStock,
  showToast,
  actualizarStock,
  actualizarStockBatch,
  confirm,
  ventasHistoricasLoaded = true,
  ventasSyncing = false,
}) {
  useClientes({
    onRefresh,
    showToast,
    appendCliente,
    updateClienteInState,
    removeClienteFromState,
    reassignClienteIdInState,
    appendPedidos,
    updatePedidosEstado,
    removePedidosByPedidoIdInState,
  });

  const [modal, setModal] = useState(false);
  const [preloadForm, setPreloadForm] = useState({ nombre: "", telefono: "" });
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [detalleCliente, setDetalleCliente] = useState(null);
  const listaRef = useRef(null);

  const { enriquecidos, resumen, getPerfil } = useClienteMetrics({
    clientes,
    ventas,
    recetas,
  });

  const getAvatarColor = (name) => {
    if (!name) return "#ccc";
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const searchValue = search.trim().toLowerCase();

  const clientesFiltrados = useMemo(() => {
    let list = enriquecidos;
    if (filtro === "activos") list = list.filter((c) => c.activoReciente);
    else if (filtro === "nuevos") list = list.filter((c) => c.esNuevo);
    else if (filtro === "fieles") list = list.filter((c) => c.ventas >= 3);
    else if (filtro === "inactivos") list = list.filter((c) => c.inactivo);
    else if (filtro === "sin_compras") list = list.filter((c) => c.ventas === 0);

    if (!searchValue) return list;
    return list.filter((c) => {
      const nombre = (c.nombre || "").toLowerCase();
      const tel = (c.telefono || "").toLowerCase();
      return nombre.includes(searchValue) || tel.includes(searchValue);
    });
  }, [enriquecidos, filtro, searchValue]);

  const openNew = () => {
    setPreloadForm({ nombre: "", telefono: "" });
    setModal(true);
  };

  return (
    <div className="content">
      <p className="page-title">Clientes</p>
      <p className="page-subtitle">
        {resumen.conCompras} con compras
        {resumen.inactivos.length > 0
          ? ` · ${resumen.inactivos.length} sin venir hace +14 días`
          : ""}
      </p>

      {!ventasHistoricasLoaded && ventasSyncing ? (
        <p className="clientes-historico-aviso">
          Cargando historial de compras…
        </p>
      ) : (
        <ClientesInsights
          resumen={resumen}
          onSelectCliente={setDetalleCliente}
          showToast={showToast}
          onVerInactivos={() => {
            setFiltro("inactivos");
            listaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
        />
      )}

      <div ref={listaRef}>
      <ClientesList
        clientes={clientes}
        clientesConGasto={enriquecidos}
        clientesFiltrados={clientesFiltrados}
        search={search}
        setSearch={setSearch}
        filtro={filtro}
        setFiltro={setFiltro}
        filtros={FILTROS}
        onOpenNew={openNew}
        onSelectCliente={setDetalleCliente}
        getAvatarColor={getAvatarColor}
        showToast={showToast}
      />
      </div>

      {detalleCliente && (
        <ClienteDetalle
          cliente={detalleCliente}
          clientes={clientes}
          ventas={ventas}
          recetas={recetas}
          pedidos={pedidos}
          perfil={getPerfil(detalleCliente.id)}
          onClose={() => setDetalleCliente(null)}
          onClienteUpdated={setDetalleCliente}
          actualizarStock={actualizarStock}
          actualizarStockBatch={actualizarStockBatch}
          showToast={showToast}
          confirm={confirm}
          onRefresh={onRefresh}
          updateClienteInState={updateClienteInState}
          removeClienteFromState={removeClienteFromState}
          reassignClienteIdInState={reassignClienteIdInState}
          appendVentas={appendVentas}
          patchStock={patchStock}
          removeVentas={removeVentas}
          resolveOptimisticVentas={resolveOptimisticVentas}
          updatePedidosEstado={updatePedidosEstado}
        />
      )}

      <ClienteFormModal
        visible={modal}
        onClose={() => {
          setModal(false);
          setPreloadForm({ nombre: "", telefono: "" });
        }}
        clientes={clientes}
        onRefresh={onRefresh}
        appendCliente={appendCliente}
        updateClienteInState={updateClienteInState}
        showToast={showToast}
        initialNombre={preloadForm.nombre}
        initialTelefono={preloadForm.telefono}
        onExistingCliente={setDetalleCliente}
      />
    </div>
  );
}
