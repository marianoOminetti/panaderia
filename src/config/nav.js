/**
 * Navegación: pestañas de la barra inferior (NAV_TABS) e ítems del menú "Más" (MORE_MENU_ITEMS).
 * Usado por AppNav y App para rutas (tab/setTab).
 */
export const NAV_TABS = [
  { id: "dashboard", icon: "📊", label: "Inicio" },
  { id: "ventas", icon: "💰", label: "Ventas" },
  { id: "stock", icon: "📥", label: "Stock" },
  { id: "more", icon: "☰", label: "Más" },
];

export const MORE_MENU_ITEMS = [
  { id: "analytics", icon: "📈", label: "Analytics", sub: "Gráficos y proyecciones" },
  { id: "plan", icon: "📆", label: "Plan semanal", sub: "Producción y pedidos" },
  { id: "clientes", icon: "👥", label: "Clientes", sub: "Contactos y ventas" },
  { id: "insumos", icon: "📦", label: "Insumos", sub: "Materias primas y stock" },
  { id: "recetas", icon: "📋", label: "Recetas", sub: "Productos y costos" },
];
